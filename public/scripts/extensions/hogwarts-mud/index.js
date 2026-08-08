import {
    doNewChat,
    eventSource,
    event_types,
    extension_prompt_roles,
    extension_prompt_types,
    getCharacters,
    getRequestHeaders,
    saveSettingsDebounced,
    selectCharacterById,
    setExtensionPrompt,
    updateMessageBlock,
} from '/script.js';
import {
    extension_settings,
    getContext,
    renderExtensionTemplateAsync,
    saveMetadataDebounced,
} from '/scripts/extensions.js';
import { ConnectionManagerRequestService } from '/scripts/extensions/shared.js';
import { getPresetManager } from '/scripts/preset-manager.js';
import {
    deleteSecret,
    SECRET_KEYS,
    writeSecret,
} from '/scripts/secrets.js';
import {
    allowPresetScripts,
    getCurrentPresetAPI,
    getCurrentPresetName,
    getScriptsByType,
    RegexProvider,
    saveScriptsByType,
    SCRIPT_TYPES,
} from '/scripts/extensions/regex/engine.js';
import { uuidv4 } from '/scripts/utils.js';
import {
    analyzeMemoryConsolidation,
    analyzePacingSignals,
    admitCurrentLocationResidents,
    admitMentionedKnownActors,
    applyPresenceWitnessTransaction,
    applyTranslationGlossaryTargets,
    applyGeneratedInteriorMap,
    applyDirectorFoundation,
    applySocialDirectorResult,
    applyOpeningWorldPackage,
    applyMapProposal,
    applyPacingAssessment,
    applyPlayerMovement,
    applySceneTransition,
    applyTurnTransaction,
    assertImportSize,
    buildLocalMapModel,
    buildMapAuthorityContext,
    buildMapModel,
    buildActorTranslationTerms,
    buildActorContinuityCapsules,
    buildActorAppearanceView,
    buildActorSelectionPolicy,
    buildCampaignContext,
    buildCharacterContext,
    buildActorKnowledgeCapsules,
    buildBehavioralEnvironment,
    buildCurrentMaterialState,
    buildMandatorySceneState,
    buildSceneCastRotationPolicy,
    buildSocialAudienceProjection,
    buildSpatialContext,
    buildStructuredPlayerTurnSequence,
    buildSystemPrompt,
    buildTemporaryActorPromotionPolicy,
    CANON_CAST_IDENTITY_CONTRACT,
    CANON_WIT_TONE_CONTRACT,
    CONTEXT_SIZE_PRESETS,
    createContextBudgetPlan,
    createLegacyTurnRollbackCheckpoint,
    createTranslationBatches,
    createTurnPerformanceBudget,
    createTurnRetryCheckpoint,
    CAMPAIGN_PRESETS,
    createDefaultCampaign,
    createDefaultCharacterDraft,
    createDeterministicPerceptionFallback,
    createFallbackNextSceneIntent,
    createInitialWorldState,
    createSpellDirective,
    consumePacingBeat,
    DEFAULT_MODEL_SLOTS,
    DEFAULT_WORLD_PROMPT,
    detectPresetApi,
    DIFFICULTY_PRESETS,
    extractStreamingSceneSegments,
    filterKnowledgeForAudience,
    findSceneDestination,
    findLocalRoomPath,
    findUnsettledTurn,
    enterBoundInteriorMap,
    getAvailableTurnRollbackCheckpoint,
    getFailedPlayerTurn,
    getInteriorMapRequest,
    getLocalMapDefinition,
    getSceneDestinationAuthority,
    getSpellDefinition,
    getSpellProficiency,
    getWorldDate,
    isDailyDirectorPlanCurrent,
    limitMessagesToContext,
    migrateActorKnowledgeBoundaries,
    migrateActorMovementHistory,
    migrateActorPresentationState,
    migrateLoadedSocialGraph,
    migrateObservedInventoryState,
    migrateRelationshipMemoryState,
    migrateSpellbookState,
    normalizeActorMemoryProfile,
    normalizeCausalCollapseState,
    normalizeGeneratedInteriorMapLabels,
    normalizeModelSlots,
    normalizeMemoryConsolidationPayload,
    normalizeSocialGraph,
    normalizePacingAssessmentPayload,
    normalizeRegexScripts,
    normalizeCampaign,
    normalizeLocalTranslationText,
    normalizeEventKnowledge,
    normalizeSceneTransitionPackage,
    normalizeTranslationProvider,
    parseCompleteJsonObject,
    parseExplicitMovementDirective,
    parseSpellCastDirectives,
    protectTranslationTerms,
    projectActorSocialRelationships,
    projectSceneArchivePresence,
    projectObservedInventoryUpdates,
    reconcileCanonActorDisplayNames,
    reconcileSpatialState,
    reconcileTurnActorPresenceWithSpatialState,
    reconcileVisibleActorPresenceState,
    reduceLocalPresence,
    recoverScenePerformancePayload,
    resolveActionCheck,
    resolveEventWitnesses,
    resolveLocalMapId,
    resolvePlayerAddressing,
    removeExplicitAddressDirective,
    removeSpellCastDirectives,
    RESPONSE_HEADROOM_VERSION,
    reconcileTemporaryActorDisplayNames,
    resolveTemporaryActorRevealedName,
    restoreTurnRetryCheckpoint,
    restoreTranslationTerms,
    sanitizePresetData,
    selectSharedMemoriesForContext,
    settleNarrativeTurnPerformance,
    shouldTranslateToChinese,
    validatePerceptionContract,
    splitTranslationChunks,
    SPELL_CATALOG,
    SPELL_LEARNING_SOURCE_LABELS,
    SOCIAL_GRAPH_EXTRACTOR_VERSION,
    stripExplicitAddressTargets,
    stripSyntheticSceneOpeningActorSegments,
    TRANSLATION_TERM_GLOSSARY,
    validateCharacterDraft,
    validateDirectorFoundation,
    validateGeneratedInteriorMap,
    validateNextSceneIntent,
    validateOpeningWorldPackage,
    validatePacingAssessment,
    validateMapProposal,
    validateMemoryConsolidation,
    validateSocialDirectorResult,
    validateScenePerformance,
    validateSceneTransitionPackage,
    validateTurnTransaction,
} from './helpers.js';
import {
    MAP_DIRECTOR_TRIGGERS,
    PRESET_WORLD_MAP,
} from './world-data.js';
import {
    getPresetLocalMap,
    LOCAL_MAP_CATALOG,
} from './map-pack.js';
import {
    formatRetrievedKnowledge,
    retrieveKnowledge,
    syncKnowledgeBase,
} from './knowledge.js';
import {
    createRelationshipGraphController,
} from './relationship-graph.js';
import {
    projectPeoplePanel,
} from './people-projection.js';

const MODULE_NAME = 'hogwarts-mud';
const PROMPT_KEY = 'hogwarts_mud_system';
const MAX_RENDERED_MESSAGES = 100;
const CURRENT_SCENE_PAGE_SIZE = 20;
const ARCHIVE_LIST_PAGE_SIZE = 6;
const ARCHIVE_TRANSCRIPT_PAGE_SIZE = 8;
const TRANSLATION_FORMAT_VERSION = 12;

const DEFAULT_SETTINGS = Object.freeze({
    promptVersion: 2,
    enabled: true,
    uiEnabled: true,
    translationEnabled: true,
    translationProvider: 'local',
    targetLanguage: 'zh-CN',
    worldPrompt: DEFAULT_WORLD_PROMPT,
    setupDraft: createDefaultCharacterDraft(),
    modelSlots: DEFAULT_MODEL_SLOTS,
    campaignDraft: createDefaultCampaign(),
});

let root;
let storyElement;
let inspectorElement;
let composerInput;
let settingsDialog;
let profileEditorDialog;
let sceneTransitionDialog;
let sceneArchiveDialog;
let launcher;
let renderTimer;
let homeElement;
let setupElement;
let workspaceElement;
let setupForm;
let activeSetupStep = 'identity';
let activeScreen = 'home';
let activeCampaign = createDefaultCampaign();
let setupMapScope = 'world';
let setupMapLevel = '';
let inspectorMapScope = 'auto';
let inspectorMapLevel = '';
let saveListRequest = 0;
let profileEditorTargetRole = '';
let profileEditorTempSecret = null;
let rolePresetImportTarget = '';
let roleRegexImportTarget = '';
let openingInitializationPromise = null;
let directorFoundationPromise = null;
let dailyDirectorPromise = null;
let pacingDirectorPromise = null;
let memoryDirectorPromise = null;
let sceneTransitionPromise = null;
let interiorMapPromise = null;
let selectedActorId = '';
let turnSettlementActive = false;
let sceneTransitionActive = false;
let liveSceneStream = null;
let renderedSceneId = '';
let currentSceneMessageLimit = CURRENT_SCENE_PAGE_SIZE;
let archiveListLimit = ARCHIVE_LIST_PAGE_SIZE;
let archiveTranscriptLimit = ARCHIVE_TRANSCRIPT_PAGE_SIZE;
let spellPickerShowAll = false;
let relationshipGraphController = null;
let automaticModelWorkSuppressed =
    false;
const translationJobs = new Map();
const turnSettlementJobs = new Map();
const socialDirectorCatchupAttempts =
    new Set();

function getSettings() {
    if (!extension_settings.hogwartsMud || typeof extension_settings.hogwartsMud !== 'object') {
        extension_settings.hogwartsMud = structuredClone(DEFAULT_SETTINGS);
    }
    const legacyTranslationEnabled =
        extension_settings.hogwartsMud
            .translationEnabled;
    if (
        extension_settings.hogwartsMud
            .translationProvider ===
        undefined
    ) {
        extension_settings.hogwartsMud
            .translationProvider =
            legacyTranslationEnabled === false
                ? 'off'
                : 'local';
    }
    if (!extension_settings.hogwartsMud.promptVersion) {
        extension_settings.hogwartsMud.worldPrompt = DEFAULT_WORLD_PROMPT;
        extension_settings.hogwartsMud.promptVersion = DEFAULT_SETTINGS.promptVersion;
    }
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (extension_settings.hogwartsMud[key] === undefined) {
            extension_settings.hogwartsMud[key] = value;
        }
    }
    extension_settings.hogwartsMud.modelSlots = normalizeModelSlots(extension_settings.hogwartsMud.modelSlots);
    extension_settings.hogwartsMud
        .translationProvider =
        normalizeTranslationProvider(
            extension_settings.hogwartsMud
                .translationProvider,
        );
    extension_settings.hogwartsMud
        .translationEnabled =
        extension_settings.hogwartsMud
            .translationProvider !==
        'off';
    return extension_settings.hogwartsMud;
}

function resolveRoleSlots(slots) {
    const resolved = normalizeModelSlots(slots);
    resolved.medium.profileId ||= resolved.low.profileId;
    resolved.high.profileId ||= resolved.medium.profileId;
    return resolved;
}

function getMudState() {
    return getContext().chatMetadata?.hogwartsMud ?? null;
}

function ensureSceneLifecycleState(state = getMudState()) {
    if (!state) return false;
    let changed = false;
    const normalizedModelSlots =
        normalizeModelSlots(
            state.modelSlots,
        );
    if (
        JSON.stringify(
            state.modelSlots || {},
        ) !==
        JSON.stringify(
            normalizedModelSlots,
        )
    ) {
        state.modelSlots =
            normalizedModelSlots;
        changed = true;
    }
    const relationshipMigration =
        migrateRelationshipMemoryState(
            state,
            getContext().chat,
        );
    if (relationshipMigration.changed) {
        Object.assign(state, relationshipMigration.state);
        saveMetadataDebounced();
        changed = true;
    }
    const knowledgeMigration =
        migrateActorKnowledgeBoundaries(
            state,
        );
    if (knowledgeMigration.changed) {
        Object.assign(
            state,
            knowledgeMigration.state,
        );
        saveMetadataDebounced();
        changed = true;
    }
    const presentationMigration =
        migrateActorPresentationState(
            state,
        );
    if (
        presentationMigration.changed
    ) {
        Object.assign(
            state,
            presentationMigration.state,
        );
        saveMetadataDebounced();
        changed = true;
    }
    const actorMovementMigration =
        migrateActorMovementHistory(
            state,
            getContext().chat,
        );
    if (
        actorMovementMigration.changed
    ) {
        Object.assign(
            state,
            actorMovementMigration.state,
        );
        saveMetadataDebounced();
        changed = true;
    }
    const inventoryMigration =
        migrateObservedInventoryState(
            state,
            getContext().chat,
        );
    if (
        inventoryMigration.changed
    ) {
        Object.assign(
            state,
            inventoryMigration.state,
        );
        saveMetadataDebounced();
        changed = true;
    }
    const spellbookMigration =
        migrateSpellbookState(
            state,
            getContext().chat,
        );
    if (
        spellbookMigration.changed
    ) {
        Object.assign(
            state,
            spellbookMigration.state,
        );
        saveMetadataDebounced();
        changed = true;
    }
    const canonNameMigration =
        reconcileCanonActorDisplayNames(
            state,
        );
    if (canonNameMigration.changed) {
        Object.assign(
            state,
            canonNameMigration.state,
        );
        saveMetadataDebounced();
        changed = true;
    }
    const temporaryNameMigration =
        reconcileTemporaryActorDisplayNames(
            state,
            getContext().chat,
        );
    if (temporaryNameMigration.changed) {
        Object.assign(
            state,
            temporaryNameMigration.state,
        );
        changed = true;
    }
    const normalizedCausalCollapse =
        normalizeCausalCollapseState(
            state.causalCollapse,
        );
    if (
        JSON.stringify(
            state.causalCollapse ||
            {},
        ) !==
        JSON.stringify(
            normalizedCausalCollapse,
        )
    ) {
        state.causalCollapse =
            normalizedCausalCollapse;
        changed = true;
    }
    const socialGraphMigration =
        migrateLoadedSocialGraph(
            state.socialGraph,
            {
                chatLength:
                    getContext().chat
                        .length,
                sceneId:
                    state.scene?.id ||
                    '',
            },
        );
    if (socialGraphMigration.changed) {
        state.socialGraph =
            socialGraphMigration
                .graph;
        changed = true;
    }
    const projectedActorLibrary =
        projectActorSocialRelationships(
            state.actorLibrary,
            state.socialGraph,
        );
    if (
        JSON.stringify(
            state.actorLibrary || [],
        ) !==
        JSON.stringify(
            projectedActorLibrary,
        )
    ) {
        state.actorLibrary =
            projectedActorLibrary;
        changed = true;
    }
    if (!Array.isArray(state.sceneArchive)) {
        state.sceneArchive = [];
        changed = true;
    }
    if (!Array.isArray(state.checks)) {
        state.checks = [];
        changed = true;
    }
    const timeline = Array.isArray(state.timeline)
        ? state.timeline
        : [];
    state.sceneArchive.forEach(scene => {
        if (Array.isArray(scene.timelineEntries)) {
            return;
        }
        scene.timelineEntries = timeline.filter(entry =>
            (!scene.startedClock || entry.clock >= scene.startedClock) &&
            (!scene.endedClock || entry.clock <= scene.endedClock),
        );
        if (!scene.timelineEntries.length) {
            scene.timelineEntries = [{
                clock: scene.endedClock || scene.startedClock || state.clock,
                label: scene.closureSummary || scene.summary || '场景已封存',
            }];
        }
        changed = true;
    });
    if (!state.sceneTransition || typeof state.sceneTransition !== 'object') {
        state.sceneTransition = {
            status: 'idle',
            tier: 'medium',
            error: '',
            requestedAt: null,
            settledAt: null,
        };
        changed = true;
    } else if (state.sceneTransition.status === 'resolving' &&
        !sceneTransitionActive &&
        !sceneTransitionPromise) {
        state.sceneTransition = {
            ...state.sceneTransition,
            status: 'failed',
            error: '上一次场景切换在提交前中断，请重新发起。',
        };
        changed = true;
    }
    if (!state.pacingDirector ||
        typeof state.pacingDirector !== 'object') {
        state.pacingDirector = {
            status: 'idle',
            error: '',
            lastAssessedTurn: null,
            lastAssessedSceneId: '',
            reassessAfterTurns: 3,
            assessment: null,
            pendingBeat: null,
        };
        changed = true;
    } else if (state.pacingDirector.status === 'assessing' &&
        !pacingDirectorPromise) {
        state.pacingDirector = {
            ...state.pacingDirector,
            status: 'failed',
            error: '上一次节奏评估在提交前中断，将在冷却后重试。',
            lastAssessedTurn: Number(state.turn?.count || 0),
            lastAssessedSceneId: state.scene?.id || '',
            reassessAfterTurns: 2,
        };
        changed = true;
    }
    if (!state.memoryDirector ||
        typeof state.memoryDirector !== 'object') {
        state.memoryDirector = {
            status: 'idle',
            error: '',
            lastReviewedTurn: 0,
            reviewAfterTurns: 10,
            reviewedActorIds: [],
            reviewedAt: null,
        };
        changed = true;
    } else if (
        state.memoryDirector.status === 'consolidating' &&
        !memoryDirectorPromise
    ) {
        state.memoryDirector = {
            ...state.memoryDirector,
            status: 'failed',
            error:
                '上一次共同记忆整理在提交前中断，将在冷却后重试。',
            lastReviewedTurn:
                Number(state.turn?.count || 0),
            reviewAfterTurns: 10,
        };
        changed = true;
    }
    if (state.memoryDirector &&
        (
            Number(
                state.memoryDirector.reviewAfterTurns ||
                0,
            ) < 10 ||
            Number(
                state.memoryDirector.reviewAfterTurns ||
                0,
            ) > 20
        )) {
        state.memoryDirector.reviewAfterTurns = 10;
        if (!Number(
            state.memoryDirector.lastReviewedTurn || 0,
        )) {
            state.memoryDirector.lastReviewedTurn =
                Number(state.turn?.count || 0);
        }
        saveMetadataDebounced();
        changed = true;
    }
    if (state.sceneTransition?.status === 'failed' &&
        !state.sceneTransition.destinationHint) {
        const match = String(state.sceneTransition.error || '').match(
            /地图\s+([a-z0-9_.-]+)[\s\S]*?房间\s+([a-z0-9_.-]+)/i,
        );
        if (match) {
            state.sceneTransition.destinationHint =
                `前往${getRoomName(state, match[1], match[2])}`;
            state.sceneTransition.expectedDestination = {
                mapId: match[1],
                roomId: match[2],
            };
            changed = true;
        }
    }
    if (state.scene) {
        if (
            state.scene.id ===
                'settling_in_gryffindor_dormitory' &&
            /Gryffindor Common Room|格兰芬多公共休息室/iu
                .test(
                    `${state.scene.nameEn || ''} ${state.scene.name || ''}`,
                )
        ) {
            state.scene.nameEn =
                'Gryffindor Girls\' Dormitory — Settling In';
            state.scene.name =
                '格兰芬多女生宿舍 — 安顿下来';
            changed = true;
        }
        if (!state.scene.startedClock) {
            state.scene.startedClock = state.opening?.package?.clock ||
                state.timeline?.[0]?.clock ||
                state.clock;
            changed = true;
        }
        if (!Number.isInteger(state.scene.startedMessageId)) {
            const messageId = getContext().chat.findIndex(message =>
                message.extra?.hogwartsMud?.sceneId === state.scene.id,
            );
            state.scene.startedMessageId = Math.max(0, messageId);
            changed = true;
        }
        if (!Array.isArray(state.scene.timelineEntries)) {
            state.scene.timelineEntries = timeline.filter(entry =>
                !state.scene.startedClock ||
                entry.clock >= state.scene.startedClock,
            );
            if (!state.scene.timelineEntries.length) {
                state.scene.timelineEntries = [{
                    clock: state.scene.startedClock || state.clock,
                    label: state.scene.summary || state.chapter || '当前场景',
                }];
            }
            changed = true;
        }
        if (!state.sceneArchive.length &&
            state.scene.startedMessageId !== 0) {
            state.scene.startedMessageId = 0;
            changed = true;
        }
        if (!state.scene.mapId && state.map?.activeMapId) {
            state.scene.mapId = state.map.activeMapId;
            changed = true;
        }
        if (!state.scene.roomId && state.map?.currentLocalNodeId) {
            state.scene.roomId = state.map.currentLocalNodeId;
            changed = true;
        }
        if (!validateNextSceneIntent(
            state.scene.nextSceneIntent,
            state,
        ).valid) {
            state.scene.nextSceneIntent =
                createFallbackNextSceneIntent(state);
            changed = true;
        }
    }
    return changed;
}

async function syncLocalKnowledge() {
    const context = getContext();
    const state = getMudState();
    if (!state?.character?.confirmed) return;
    try {
        await syncKnowledgeBase(context, state);
        state.knowledgeBase.lastError = '';
        await context.saveMetadata();
    } catch (error) {
        state.knowledgeBase ??= {};
        state.knowledgeBase.lastError = String(error?.message || error);
        console.error('[Hogwarts MUD] Local knowledge sync failed', error);
        await context.saveMetadata();
    }
}

async function retrieveLocalKnowledge(query, entityIds = [], options = {}) {
    const context = getContext();
    const state = getMudState();
    if (!state?.character?.confirmed) return [];
    try {
        const {
            limit = 6,
            ...retrieveOptions
        } = options;
        return await retrieveKnowledge(
            context,
            state,
            query,
            entityIds,
            Math.max(1, Number(limit) || 6),
            retrieveOptions,
        );
    } catch (error) {
        console.warn('[Hogwarts MUD] Local knowledge retrieval failed', error);
        return [];
    }
}

function isGameStarted() {
    const state = getMudState();
    return [
        'initializing',
        'opening_narration',
        'initialization_failed',
        'playing',
    ].includes(state?.phase) && state?.character?.confirmed === true;
}

function setAppScreen(
    screen,
    {
        allowAutomaticModelWork =
        true,
    } = {},
) {
    activeScreen = screen;
    const showHome = screen === 'home';
    const showSetup = screen === 'setup';
    const showGame = screen === 'game';
    homeElement.hidden = !showHome;
    setupElement.hidden = !showSetup;
    workspaceElement.hidden = !showGame;
    root.classList.toggle('home-mode', showHome);
    root.classList.toggle('setup-mode', showSetup);
    root.querySelector('#hpmud_focus').hidden = !showGame;
    root.querySelector('#hpmud_reopen_setup').hidden = !showGame;
    if (showHome) {
        root.querySelector('#hpmud_location').textContent = '档案大厅';
        root.querySelector('#hpmud_chapter').textContent = 'Hogwarts MUD';
        root.querySelector('#hpmud_clock').textContent = '选择一条时间线';
        root.querySelector('#hpmud_character').textContent = 'HP';
        syncCampaignUi();
        void renderSaveLibrary();
    } else if (showSetup) {
        loadSetupDraft();
        showSetupStep(activeSetupStep);
    } else if (showGame) {
        renderAll();
        const state = getMudState();
        const canResumeOpening = state?.character?.confirmed &&
            state.phase !== 'initialization_failed' &&
            state.opening?.status !== 'ready' &&
            !hasOpeningNarrative();
        if (
            allowAutomaticModelWork &&
            canResumeOpening
        ) {
            void initializeOpeningWorld().catch(error => {
                console.error('[Hogwarts MUD] Opening initialization failed', error);
                toastr.error(String(error?.cause?.message || error?.message || error));
            });
        } else if (
            allowAutomaticModelWork &&
            state?.phase === 'playing'
        ) {
            void preparePlayableState();
        }
    }
}

function syncCampaignUi() {
    const settings = getSettings();
    activeCampaign = normalizeCampaign(settings.campaignDraft || activeCampaign);
    const preset = CAMPAIGN_PRESETS[activeCampaign.presetId];
    root.querySelectorAll('[data-campaign]').forEach(button => {
        const selected = button.dataset.campaign === activeCampaign.presetId;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-checked', String(selected));
    });
    const year = root.querySelector('#hpmud_campaign_year');
    const grade = root.querySelector('#hpmud_campaign_grade');
    year.value = String(activeCampaign.startYear);
    year.disabled = preset.lockedYear;
    grade.value = String(activeCampaign.grade);
    grade.disabled = preset.lockedGrade;
    root.querySelectorAll('[data-difficulty]').forEach(button => {
        const selected = button.dataset.difficulty === activeCampaign.difficulty;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-checked', String(selected));
    });
    root.querySelector('#hpmud_campaign_summary').textContent =
        `${activeCampaign.startYear} · ${activeCampaign.grade} 年级 · ${activeCampaign.difficultyName}难度`;
}

function updateCampaign(patch = {}) {
    const current = normalizeCampaign({ ...activeCampaign, ...patch });
    activeCampaign = current;
    getSettings().campaignDraft = {
        presetId: current.presetId,
        startYear: current.startYear,
        grade: current.grade,
        difficulty: current.difficulty,
    };
    saveSettingsDebounced();
    syncCampaignUi();
}

function selectCampaign(presetId) {
    const preset = CAMPAIGN_PRESETS[presetId] || CAMPAIGN_PRESETS.canon_1991;
    updateCampaign({
        presetId: preset.id,
        startYear: preset.startYear,
        grade: preset.grade,
    });
}

function populateNarratorCharacterForm(formData, character = null) {
    formData.set('ch_name', 'Hogwarts World Director');
    formData.set('file_name', 'Hogwarts_World_Director');
    formData.set('description', 'Private save container for Hogwarts MUD persistent worlds.');
    formData.set('personality', 'Neutral infrastructure container.');
    formData.set('scenario', 'Hogwarts MUD persistent world storage.');
    formData.set('first_mes', '');
    formData.set('mes_example', '');
    formData.set('creator_notes', '');
    formData.set('system_prompt', '');
    formData.set('post_history_instructions', '');
    formData.set('creator', 'Hogwarts MUD');
    formData.set('character_version', '1.0');
    formData.set('tags', '');
    formData.set('talkativeness', '0.5');
    formData.set('fav', 'false');
    formData.set('world', '');
    formData.set('depth_prompt_prompt', '');
    formData.set('depth_prompt_depth', '4');
    formData.set('depth_prompt_role', 'system');
    formData.set('extensions', JSON.stringify({ hogwartsMudNarrator: true }));
    if (character) {
        formData.set('avatar_url', character.avatar);
        formData.set('chat', String(character.chat || '').replace(/\.jsonl$/i, ''));
        formData.set('create_date', character.create_date || new Date().toISOString());
        formData.set('json_data', JSON.stringify(character));
    }
}

async function repairNarratorCharacter(storageCharacterId) {
    let context = getContext();
    const character = context.characters?.[storageCharacterId];
    if (!character || (
        character?.data?.extensions?.hogwartsMudNarrator !== true &&
        character?.name !== 'Hogwarts World Director'
    )) {
        return storageCharacterId;
    }
    const scalarFields = [
        character.first_mes,
        character.mes_example,
        character.personality,
        character.scenario,
        character.data?.first_mes,
        character.data?.mes_example,
        character.data?.system_prompt,
        character.data?.post_history_instructions,
        character.data?.creator_notes,
        character.data?.extensions?.depth_prompt?.prompt,
    ];
    if (scalarFields.every(value => typeof value === 'string')) {
        return storageCharacterId;
    }
    const avatar = character.avatar;
    const chat = String(character.chat || '').replace(/\.jsonl$/i, '');
    const response = await fetch('/api/characters/merge-attributes', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
            avatar,
            first_mes: '',
            mes_example: '',
            personality: 'Neutral infrastructure container.',
            scenario: 'Hogwarts MUD persistent world storage.',
            creatorcomment: '',
            chat,
            talkativeness: 0.5,
            tags: [],
            data: {
                first_mes: '',
                mes_example: '',
                personality: 'Neutral infrastructure container.',
                scenario: 'Hogwarts MUD persistent world storage.',
                creator_notes: '',
                system_prompt: '',
                post_history_instructions: '',
                tags: [],
                creator: 'Hogwarts MUD',
                character_version: '1.0',
                extensions: {
                    talkativeness: 0.5,
                    fav: false,
                    world: '',
                    depth_prompt: {
                        prompt: '',
                        depth: 4,
                        role: 'system',
                    },
                    hogwartsMudNarrator: true,
                },
            },
        }),
    });
    if (!response.ok) {
        throw new Error(`无法修复 Hogwarts 存档容器：${response.status}`);
    }
    await getCharacters();
    context = getContext();
    const repairedIndex = context.characters.findIndex(item => item.avatar === avatar);
    if (repairedIndex < 0) {
        throw new Error('Hogwarts 存档容器修复后未能重新载入。');
    }
    return repairedIndex;
}

async function ensureNarratorCharacter() {
    let context = getContext();
    const existingIndex = context.characters.findIndex(character =>
        character?.data?.extensions?.hogwartsMudNarrator === true ||
        character?.name === 'Hogwarts World Director',
    );
    if (existingIndex >= 0) {
        const healthyIndex = await repairNarratorCharacter(existingIndex);
        await selectCharacterById(healthyIndex, { switchMenu: false });
        return;
    }

    const formData = new FormData();
    populateNarratorCharacterForm(formData);
    const response = await fetch('/api/characters/create', {
        method: 'POST',
        headers: getRequestHeaders({ omitContentType: true }),
        body: formData,
    });
    if (!response.ok) {
        throw new Error(`无法创建 Hogwarts 世界叙事者：${response.status}`);
    }
    const avatarId = await response.text();
    await getCharacters();
    context = getContext();
    const createdIndex = context.characters.findIndex(character => character?.avatar === avatarId);
    if (createdIndex < 0) {
        throw new Error('世界叙事者已创建，但酒馆没有返回角色索引。');
    }
    const healthyIndex = await repairNarratorCharacter(createdIndex);
    await selectCharacterById(healthyIndex, { switchMenu: false });
}

async function getHogwartsSaves() {
    const context = getContext();
    const collections = await Promise.all(context.characters.map(async (character, storageCharacterId) => {
        if (!character?.avatar) {
            return [];
        }
        const response = await fetch('/api/characters/chats', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                avatar_url: character.avatar,
                metadata: true,
            }),
        });
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        return Array.isArray(data)
            ? data.map(entry => ({ ...entry, storageCharacterId }))
            : [];
    }));
    return collections
        .flat()
        .filter(entry => entry?.chat_metadata?.hogwartsMud?.character?.confirmed)
        .sort((left, right) => new Date(right.last_mes).getTime() - new Date(left.last_mes).getTime())
        .map(entry => {
            const state = entry.chat_metadata.hogwartsMud;
            const campaign = normalizeCampaign(state.campaign);
            return {
                fileName: entry.file_name,
                storageCharacterId: entry.storageCharacterId,
                characterName: state.character.identity?.name || '未命名角色',
                campaignName: campaign.presetName,
                difficultyName: campaign.difficultyName,
                chapter: state.chapter || '未知章节',
                clock: state.clock || '时间未知',
                location: state.location || '地点未知',
                messageCount: Number(entry.chat_items || 0),
                preview: String(entry.mes || '').trim(),
                updatedAt: entry.last_mes,
            };
        });
}

function createSaveCard(save, isCurrent) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `hpmud-save-card${isCurrent ? ' current' : ''}`;
    button.innerHTML = `
        <span class="hpmud-save-monogram"></span>
        <span class="hpmud-save-copy">
            <small></small>
            <strong></strong>
            <span></span>
            <em></em>
        </span>
        <span class="hpmud-save-arrow">→</span>
    `;
    button.querySelector('.hpmud-save-monogram').textContent = initials(save.characterName);
    button.querySelector('small').textContent = isCurrent ? '当前时间线' : new Date(save.updatedAt).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
    button.querySelector('strong').textContent = save.characterName;
    button.querySelector('.hpmud-save-copy > span').textContent =
        `${save.campaignName} · ${save.difficultyName} · ${save.chapter} · ${save.location}`;
    button.querySelector('em').textContent = `${save.messageCount} 条记录${save.preview ? ` · ${save.preview}` : ''}`;
    button.addEventListener('click', () => void loadHogwartsSave(save));
    return button;
}

export function canOpenCurrentV2SaveReadOnly(
    save,
    {
        currentChatId = '',
        characterId = '',
        chatLength = 0,
        state = null,
    } = {},
) {
    const saveChatId =
        String(save?.fileName || '')
            .replace(/\.jsonl$/i, '');
    const normalizedCurrentChatId =
        String(currentChatId || '')
            .replace(/\.jsonl$/i, '');
    const graph = state?.socialGraph;
    return Boolean(
        saveChatId &&
        saveChatId ===
            normalizedCurrentChatId &&
        String(save?.storageCharacterId) ===
            String(characterId) &&
        Number(graph?.version) === 2 &&
        Number(graph?.extractorVersion) >=
            SOCIAL_GRAPH_EXTRACTOR_VERSION &&
        Number(graph?.lastProcessedMessageId) >=
            Math.max(
                -1,
                Number(chatLength) - 1,
            ),
    );
}

export function shouldTranslateRenderedMessage(
    messageId,
    state,
) {
    const normalizedMessageId =
        Number(messageId);
    const graph =
        state?.socialGraph;
    if (
        !Number.isInteger(
            normalizedMessageId,
        ) ||
        normalizedMessageId < 0
    ) {
        return false;
    }
    if (
        Number(graph?.version) !== 2 ||
        Number(
            graph?.extractorVersion,
        ) <
            SOCIAL_GRAPH_EXTRACTOR_VERSION
    ) {
        return true;
    }
    const cursor =
        Number(
            graph
                ?.lastProcessedMessageId,
        );
    return (
        !Number.isInteger(cursor) ||
        normalizedMessageId > cursor
    );
}

async function renderSaveLibrary() {
    const requestId = ++saveListRequest;
    const list = root.querySelector('#hpmud_save_list');
    list.innerHTML = '<div class="hpmud-save-empty">正在检索魔法档案…</div>';
    try {
        const saves = await getHogwartsSaves();
        if (requestId !== saveListRequest || activeScreen !== 'home') {
            return;
        }
        list.replaceChildren();
        const currentChatId = String(getContext().chatId || '');
        if (!saves.length) {
            list.innerHTML = '<div class="hpmud-save-empty"><strong>还没有旧档案</strong><span>建立第一个角色后，时间线会出现在这里。</span></div>';
        } else {
            saves.forEach(save => {
                const normalized = save.fileName.replace(/\.jsonl$/i, '');
                list.append(createSaveCard(save, normalized === currentChatId || save.fileName === currentChatId));
            });
        }
        root.querySelector('#hpmud_save_count').textContent = `${saves.length} 个档案`;
    } catch (error) {
        console.error('[Hogwarts MUD] Failed to list saves', error);
        list.innerHTML = '<div class="hpmud-save-empty"><strong>无法读取档案</strong><span>请检查酒馆连接后刷新。</span></div>';
        root.querySelector('#hpmud_save_count').textContent = '读取失败';
    }
}

async function beginNewGame() {
    const button = root.querySelector('#hpmud_new_game');
    button.disabled = true;
    try {
        await ensureNarratorCharacter();
        const context = getContext();
        if (!context.characters?.[context.characterId]) {
            throw new Error('没有可用于保存世界的酒馆角色。');
        }
        await doNewChat();
        await repairNarratorCharacter(getContext().characterId);
        const settings = getSettings();
        const characterDraft = createDefaultCharacterDraft();
        characterDraft.identity.age = 10 + activeCampaign.grade;
        settings.setupDraft = characterDraft;
        settings.campaignDraft = {
            presetId: activeCampaign.presetId,
            startYear: activeCampaign.startYear,
            grade: activeCampaign.grade,
            difficulty: activeCampaign.difficulty,
        };
        saveSettingsDebounced();
        activeSetupStep = 'identity';
        setAppScreen('setup');
    } catch (error) {
        console.error('[Hogwarts MUD] Failed to create save', error);
        toastr.error(String(error?.message || error));
    } finally {
        button.disabled = false;
    }
}

async function openExistingHogwartsSave(
    save,
    characterIndex,
) {
    const chatId =
        String(save?.fileName || '')
            .replace(/\.jsonl$/i, '');
    let context =
        getContext();
    const character =
        context.characters?.[
            characterIndex
        ];
    if (
        !character?.avatar ||
        !chatId
    ) {
        throw new Error(
            '存档容器或文件名无效。',
        );
    }
    character.chat =
        chatId;
    if (
        String(context.characterId) ===
        String(characterIndex)
    ) {
        await context.openCharacterChat(
            chatId,
        );
    } else {
        await selectCharacterById(
            characterIndex,
            {
                switchMenu: false,
            },
        );
    }
    context = getContext();
    const loadedChatId =
        String(
            context
                .getCurrentChatId?.() ||
            context.chatId ||
            '',
        ).replace(/\.jsonl$/i, '');
    if (
        String(context.characterId) !==
            String(characterIndex) ||
        loadedChatId !== chatId
    ) {
        throw new Error(
            '存档容器切换失败，未载入目标聊天。',
        );
    }
    return context;
}

async function loadHogwartsSave(save) {
    const list = root.querySelector('#hpmud_save_list');
    const previousSuppression =
        automaticModelWorkSuppressed;
    list.classList.add('loading');
    try {
        const currentContext =
            getContext();
        if (
            canOpenCurrentV2SaveReadOnly(
                save,
                {
                    currentChatId:
                        currentContext
                            .getCurrentChatId?.() ||
                        currentContext.chatId,
                    characterId:
                        currentContext
                            .characterId,
                    chatLength:
                        currentContext.chat
                            .length,
                    state: getMudState(),
                },
            )
        ) {
            applySystemPrompt();
            setAppScreen(
                'game',
                {
                    allowAutomaticModelWork:
                        false,
                },
            );
            toastr.success(
                `已读取 ${save.characterName} 的时间线。`,
            );
            return;
        }
        const healthyIndex =
            await repairNarratorCharacter(
                save.storageCharacterId,
            );
        const loadedContext =
            await openExistingHogwartsSave(
                save,
                healthyIndex,
            );
        const loadedState =
            loadedContext
                .chatMetadata
                ?.hogwartsMud;
        if (
            loadedState
                ?.character
                ?.confirmed !== true ||
            ![
                'initializing',
                'opening_narration',
                'initialization_failed',
                'playing',
            ].includes(
                loadedState?.phase,
            )
        ) {
            throw new Error(
                '该聊天不包含有效的 Hogwarts MUD 世界状态。',
            );
        }
        const socialGraphMigration =
            migrateLoadedSocialGraph(
                loadedState.socialGraph,
                {
                    chatLength:
                        loadedContext.chat
                            .length,
                    sceneId:
                        loadedState.scene
                            ?.id ||
                        '',
                },
            );
        const projectedActorLibrary =
            projectActorSocialRelationships(
                loadedState.actorLibrary,
                socialGraphMigration
                    .graph,
            );
        const actorProjectionChanged =
            JSON.stringify(
                loadedState.actorLibrary ||
                [],
            ) !==
            JSON.stringify(
                projectedActorLibrary,
            );
        if (
            socialGraphMigration.changed ||
            actorProjectionChanged
        ) {
            loadedState.socialGraph =
                socialGraphMigration
                    .graph;
            loadedState.actorLibrary =
                projectedActorLibrary;
            await loadedContext
                .saveMetadata();
        }
        automaticModelWorkSuppressed =
            !socialGraphMigration
                .allowAutomaticModelWork;
        if (!isGameStarted()) {
            throw new Error('该聊天不包含有效的 Hogwarts MUD 世界状态。');
        }
        const state = getMudState();
        const lowSlot = normalizeModelSlots(state?.modelSlots).low;
        const profileId = lowSlot.profileId;
        if (
            !automaticModelWorkSuppressed &&
            profileId &&
            getConnectionProfiles().some(profile => profile.id === profileId)
        ) {
            await applyNativeRoleSettings(lowSlot);
        }
        applySystemPrompt();
        setAppScreen(
            'game',
            {
                allowAutomaticModelWork:
                    !automaticModelWorkSuppressed,
            },
        );
        toastr.success(`已读取 ${save.characterName} 的时间线。`);
    } catch (error) {
        console.error('[Hogwarts MUD] Failed to load save', error);
        toastr.error(String(error?.message || error));
    } finally {
        automaticModelWorkSuppressed =
            previousSuppression;
        list.classList.remove('loading');
    }
}

function getSetupControl(name) {
    return setupForm.elements.namedItem(name);
}

function setControlValue(name, value) {
    const control = getSetupControl(name);
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) {
        control.value = String(value ?? '');
    }
}

function collectCharacterDraft() {
    return {
        identity: {
            name: String(getSetupControl('character_name')?.value || '').trim(),
            pronouns: String(getSetupControl('character_pronouns')?.value || '').trim(),
            age: Number(getSetupControl('character_age')?.value || 11),
            appearance: String(getSetupControl('character_appearance')?.value || '').trim(),
        },
        background: {
            bloodStatus: String(getSetupControl('blood_status')?.value || '').trim(),
            guardian: String(getSetupControl('guardian')?.value || '').trim(),
            home: String(getSetupControl('home')?.value || '').trim(),
            economy: String(getSetupControl('economy')?.value || '').trim(),
            desire: String(getSetupControl('desire')?.value || '').trim(),
            fear: String(getSetupControl('fear')?.value || '').trim(),
            habit: String(getSetupControl('habit')?.value || '').trim(),
            formativeEvent: String(getSetupControl('formative_event')?.value || '').trim(),
        },
        aptitudes: {
            learning: String(getSetupControl('learning')?.value || '').trim(),
            physical: String(getSetupControl('physical')?.value || '').trim(),
            observation: String(getSetupControl('observation')?.value || '').trim(),
            social: String(getSetupControl('social')?.value || '').trim(),
            pressure: String(getSetupControl('pressure')?.value || '').trim(),
            magicalPotential: String(getSetupControl('magical_potential')?.value || 'balanced'),
            strongDomain: String(getSetupControl('strong_domain')?.value || '').trim(),
            weakDomain: String(getSetupControl('weak_domain')?.value || '').trim(),
            rareTalent: String(getSetupControl('rare_talent')?.value || 'none'),
        },
        attributes: {
            physique: Number(getSetupControl('attr_physique')?.value),
            agility: Number(getSetupControl('attr_agility')?.value),
            perception: Number(getSetupControl('attr_perception')?.value),
            intellect: Number(getSetupControl('attr_intellect')?.value),
            willpower: Number(getSetupControl('attr_willpower')?.value),
            charisma: Number(getSetupControl('attr_charisma')?.value),
        },
        polishedBackground: root.querySelector('#hpmud_polished_background').value.trim(),
        confirmed: false,
    };
}

function loadSetupDraft() {
    const settings = getSettings();
    const draft = isGameStarted()
        ? structuredClone(getMudState().character)
        : structuredClone(settings.setupDraft || createDefaultCharacterDraft());
    const values = {
        character_name: draft.identity?.name,
        character_pronouns: draft.identity?.pronouns,
        character_age: draft.identity?.age ?? 11,
        character_appearance: draft.identity?.appearance,
        blood_status: draft.background?.bloodStatus,
        guardian: draft.background?.guardian,
        home: draft.background?.home,
        economy: draft.background?.economy,
        desire: draft.background?.desire,
        fear: draft.background?.fear,
        habit: draft.background?.habit,
        formative_event: draft.background?.formativeEvent,
        learning: draft.aptitudes?.learning,
        physical: draft.aptitudes?.physical,
        observation: draft.aptitudes?.observation,
        social: draft.aptitudes?.social,
        pressure: draft.aptitudes?.pressure,
        magical_potential: draft.aptitudes?.magicalPotential,
        strong_domain: draft.aptitudes?.strongDomain,
        weak_domain: draft.aptitudes?.weakDomain,
        rare_talent: draft.aptitudes?.rareTalent,
        attr_physique: draft.attributes?.physique,
        attr_agility: draft.attributes?.agility,
        attr_perception: draft.attributes?.perception,
        attr_intellect: draft.attributes?.intellect,
        attr_willpower: draft.attributes?.willpower,
        attr_charisma: draft.attributes?.charisma,
    };
    Object.entries(values).forEach(([name, value]) => setControlValue(name, value));
    root.querySelector('#hpmud_polished_background').value = draft.polishedBackground || '';
    const campaign = normalizeCampaign(isGameStarted()
        ? getMudState().campaign
        : settings.campaignDraft);
    root.querySelector('#hpmud_setup_campaign_note').textContent =
        `${campaign.presetName} · ${campaign.startYear} 年 · ${campaign.grade} 年级 · ${campaign.difficultyName}难度。分院结果仍在故事中产生。`;
    syncModelSlotControls();
    updateAttributeTotal();
}

function saveSetupDraft() {
    if (isGameStarted()) {
        return;
    }
    getSettings().setupDraft = collectCharacterDraft();
    saveSettingsDebounced();
}

function collectModelSlots() {
    const slots = {};
    for (const role of ['low', 'medium', 'high']) {
        slots[role] = {
            profileId: String(getSetupControl(`profile_${role}`)?.value || ''),
            presetName: String(getSetupControl(`preset_${role}`)?.value || ''),
            regexPresetId: String(getSetupControl(`regex_${role}`)?.value || ''),
            contextSize: Number(getSetupControl(`context_${role}`)?.value),
            maxResponseLength: Number(getSetupControl(`response_${role}`)?.value),
            responseHeadroomVersion:
                RESPONSE_HEADROOM_VERSION,
        };
    }
    return normalizeModelSlots(slots);
}

function getConnectionProfiles() {
    const manager = getContext().extensionSettings?.connectionManager;
    return Array.isArray(manager?.profiles) ? manager.profiles : [];
}

const PROFILE_SECRET_KEYS = Object.freeze({
    openai: SECRET_KEYS.OPENAI,
    custom: SECRET_KEYS.CUSTOM,
    openrouter: SECRET_KEYS.OPENROUTER,
    makersuite: SECRET_KEYS.MAKERSUITE,
    claude: SECRET_KEYS.CLAUDE,
    deepseek: SECRET_KEYS.DEEPSEEK,
    mistralai: SECRET_KEYS.MISTRALAI,
    groq: SECRET_KEYS.GROQ,
    xai: SECRET_KEYS.XAI,
    chutes: SECRET_KEYS.CHUTES,
    siliconflow: SECRET_KEYS.SILICONFLOW,
    zai: SECRET_KEYS.ZAI,
});
const MANUAL_MODEL_VALUE = '__manual__';

function getProfileEditorModel() {
    const select = root.querySelector('#hpmud_profile_model');
    return select.value === MANUAL_MODEL_VALUE
        ? root.querySelector('#hpmud_profile_manual_model').value.trim()
        : select.value.trim();
}

function syncManualModelVisibility() {
    const select = root.querySelector('#hpmud_profile_model');
    const row = root.querySelector('#hpmud_profile_manual_model_row');
    const input = root.querySelector('#hpmud_profile_manual_model');
    const isManual = select.value === MANUAL_MODEL_VALUE;
    row.hidden = !isManual;
    input.required = isManual;
}

function populateProfileModels(models = [], selectedModel = '') {
    const select = root.querySelector('#hpmud_profile_model');
    const normalized = Array.from(new Set(models.map(model => String(model).trim()).filter(Boolean)))
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    select.replaceChildren();
    if (selectedModel && !normalized.includes(selectedModel)) {
        select.add(new Option(`当前 · ${selectedModel}`, selectedModel));
    }
    normalized.forEach(model => select.add(new Option(model, model)));
    select.add(new Option('手动输入其他 Model ID…', MANUAL_MODEL_VALUE));
    if (selectedModel) {
        select.value = selectedModel;
    } else if (normalized.length) {
        select.value = normalized[0];
    } else {
        select.value = MANUAL_MODEL_VALUE;
    }
    syncManualModelVisibility();
}

function populateProfilePresetOptions(selectedPreset = '') {
    const select = root.querySelector('#hpmud_profile_preset');
    select.replaceChildren(new Option('使用当前/默认 Preset', ''));
    const manager = getPresetManager('openai');
    const nativeSelect = manager?.select?.[0] || manager?.select;
    if (nativeSelect instanceof HTMLSelectElement) {
        const names = new Set();
        Array.from(nativeSelect.options).forEach(option => {
            const name = String(option.textContent || '').trim();
            if (name && !names.has(name)) {
                names.add(name);
                select.add(new Option(name, name));
            }
        });
    }
    select.value = selectedPreset;
}

function syncProfileEndpointVisibility() {
    const source = root.querySelector('#hpmud_profile_source').value;
    const row = root.querySelector('#hpmud_profile_endpoint_row');
    const endpoint = root.querySelector('#hpmud_profile_endpoint');
    const requiresEndpoint = source === 'custom';
    row.hidden = !requiresEndpoint;
    endpoint.required = requiresEndpoint;
}

async function clearTemporaryProfileSecret() {
    if (!profileEditorTempSecret) {
        return;
    }
    await deleteSecret(profileEditorTempSecret.key, profileEditorTempSecret.id);
    profileEditorTempSecret = null;
}

function getSelectedProfileForEditing() {
    for (const role of ['low', 'medium', 'high']) {
        const profileId = String(getSetupControl(`profile_${role}`)?.value || '');
        const profile = getConnectionProfiles().find(item => item.id === profileId);
        if (profile) {
            return { profile, role };
        }
    }
    return { profile: null, role: '' };
}

function openProfileEditor(profile = null, targetRole = '') {
    profileEditorTargetRole = targetRole;
    profileEditorTempSecret = null;
    root.querySelector('#hpmud_profile_editor_title').textContent = profile
        ? '编辑 Connection Profile'
        : '新建 Connection Profile';
    root.querySelector('#hpmud_profile_id').value = profile?.id || '';
    root.querySelector('#hpmud_profile_name').value = profile?.name || '';
    root.querySelector('#hpmud_profile_api_type').value = 'openai';
    root.querySelector('#hpmud_profile_source').value = profile?.api || 'custom';
    root.querySelector('#hpmud_profile_endpoint').value = profile?.['api-url'] || '';
    root.querySelector('#hpmud_profile_api_key').value = '';
    root.querySelector('#hpmud_profile_manual_model').value = profile?.model || '';
    populateProfileModels([], profile?.model || '');
    root.querySelector('#hpmud_profile_post_processing').value = profile?.['prompt-post-processing'] || '';
    root.querySelector('#hpmud_profile_test_status').textContent = profile?.['secret-id']
        ? '已关联酒馆密钥；留空 API Key 可继续使用'
        : '保存前可以测试连接并获取模型列表';
    root.querySelector('#hpmud_profile_delete').hidden = !profile;
    populateProfilePresetOptions(profile?.preset || '');
    syncProfileEndpointVisibility();
    profileEditorDialog.showModal();
    root.querySelector('#hpmud_profile_name').focus();
    if (profile?.['secret-id']) {
        void testProfileConnection().catch(error => {
            console.warn('[Hogwarts MUD] Could not preload profile models', error);
            root.querySelector('#hpmud_profile_test_status').textContent =
                '模型列表自动加载失败，可点击右侧按钮重试';
        });
    }
}

function ensureNativeProfileOption(profile) {
    const select = document.querySelector('#connection_profiles');
    if (!(select instanceof HTMLSelectElement)) {
        return;
    }
    let option = Array.from(select.options).find(item => item.value === profile.id);
    if (!option) {
        option = new Option(profile.name, profile.id);
        select.add(option);
    } else {
        option.textContent = profile.name;
    }
}

async function writeProfileSecretIfNeeded(existingProfile) {
    if (profileEditorTempSecret) {
        const id = profileEditorTempSecret.id;
        profileEditorTempSecret = null;
        return id;
    }
    const value = root.querySelector('#hpmud_profile_api_key').value.trim();
    if (!value) {
        return existingProfile?.['secret-id'] || '';
    }
    const source = root.querySelector('#hpmud_profile_source').value;
    const key = PROFILE_SECRET_KEYS[source];
    if (!key) {
        throw new Error(`当前 Source “${source}” 没有对应的酒馆密钥类型。`);
    }
    const label = `${root.querySelector('#hpmud_profile_name').value.trim()} · Hogwarts MUD`;
    const id = await writeSecret(key, value, label);
    if (!id) {
        throw new Error('API Key 写入 SillyTavern Secret Storage 失败。');
    }
    return id;
}

function bindSavedProfile(profile) {
    const targetRole = profileEditorTargetRole ||
        (getSetupControl('profile_low')?.value ? '' : 'low');
    if (targetRole) {
        getSettings().modelSlots[targetRole].profileId = profile.id;
    }
    syncModelSlotControls();
    if (targetRole) {
        setControlValue(`profile_${targetRole}`, profile.id);
        renderProfileDetail(targetRole, profile.id, getConnectionProfiles());
    }
    saveSettingsDebounced();
}

async function saveProfileEditor() {
    const settings = getContext().extensionSettings;
    settings.connectionManager ??= { profiles: [], selectedProfile: null };
    settings.connectionManager.profiles ??= [];
    const profiles = settings.connectionManager.profiles;
    const id = root.querySelector('#hpmud_profile_id').value;
    const index = profiles.findIndex(item => item.id === id);
    const existing = index >= 0 ? profiles[index] : null;
    const name = root.querySelector('#hpmud_profile_name').value.trim();
    const source = root.querySelector('#hpmud_profile_source').value;
    const endpoint = root.querySelector('#hpmud_profile_endpoint').value.trim();
    const model = getProfileEditorModel();
    if (!name || !model) {
        throw new Error('Profile 名称和 Model ID 必填。');
    }
    if (source === 'custom' && !endpoint) {
        throw new Error('Custom Source 必须填写 Base URL。');
    }
    const duplicate = profiles.some(item => item.name === name && item.id !== id);
    if (duplicate) {
        throw new Error('已经存在同名 Connection Profile。');
    }
    const secretId = await writeProfileSecretIfNeeded(existing);
    const profile = {
        ...(existing || {}),
        id: existing?.id || uuidv4(),
        mode: 'cc',
        name,
        api: source,
        model,
        preset: root.querySelector('#hpmud_profile_preset').value,
        'api-url': source === 'custom' ? endpoint : '',
        'secret-id': secretId,
        'prompt-post-processing': root.querySelector('#hpmud_profile_post_processing').value,
        exclude: [],
    };
    if (index >= 0) {
        const oldProfile = structuredClone(profiles[index]);
        profiles[index] = profile;
        await eventSource.emit(event_types.CONNECTION_PROFILE_UPDATED, oldProfile, profile);
    } else {
        profiles.push(profile);
        await eventSource.emit(event_types.CONNECTION_PROFILE_CREATED, profile);
    }
    ensureNativeProfileOption(profile);
    bindSavedProfile(profile);
    saveSettingsDebounced();
    profileEditorDialog.close();
    toastr.success(`Connection Profile “${profile.name}” 已保存。`);
}

async function getOrCreateEditorSecretId() {
    const existing = getConnectionProfiles().find(item => item.id === root.querySelector('#hpmud_profile_id').value);
    const value = root.querySelector('#hpmud_profile_api_key').value.trim();
    if (!value) {
        return existing?.['secret-id'] || '';
    }
    await clearTemporaryProfileSecret();
    const source = root.querySelector('#hpmud_profile_source').value;
    const key = PROFILE_SECRET_KEYS[source];
    if (!key) {
        throw new Error('当前 Source 不支持保存密钥。');
    }
    const id = await writeSecret(key, value, 'Hogwarts MUD · 连接测试');
    if (!id) {
        throw new Error('测试密钥写入失败。');
    }
    profileEditorTempSecret = { key, id };
    return id;
}

async function testProfileConnection() {
    const status = root.querySelector('#hpmud_profile_test_status');
    const button = root.querySelector('#hpmud_profile_test');
    const source = root.querySelector('#hpmud_profile_source').value;
    const endpoint = root.querySelector('#hpmud_profile_endpoint').value.trim();
    if (source === 'custom' && !endpoint) {
        throw new Error('请先填写 Custom Endpoint。');
    }
    button.disabled = true;
    status.textContent = '正在连接并获取模型…';
    try {
        const secretId = await getOrCreateEditorSecretId();
        const response = await fetch('/api/backends/chat-completions/status', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                chat_completion_source: source,
                custom_url: source === 'custom' ? endpoint : undefined,
                secret_id: secretId || undefined,
            }),
        });
        const data = await response.json();
        if (!response.ok || data.error) {
            throw new Error(data.error?.message || data.error || response.statusText);
        }
        const models = Array.isArray(data.data)
            ? data.data.map(item => typeof item === 'string' ? item : item.id).filter(Boolean)
            : [];
        const currentModel = getProfileEditorModel();
        populateProfileModels(models, currentModel || models[0] || '');
        status.textContent = models.length
            ? `连接成功，获取到 ${models.length} 个模型`
            : '连接成功；服务没有返回模型列表，请手工输入 Model ID';
    } finally {
        button.disabled = false;
    }
}

async function deleteProfileEditor() {
    const id = root.querySelector('#hpmud_profile_id').value;
    const settings = getContext().extensionSettings.connectionManager;
    const index = settings?.profiles?.findIndex(item => item.id === id) ?? -1;
    if (index < 0) {
        return;
    }
    const target = settings.profiles[index];
    if (!window.confirm(`确定删除 Connection Profile “${target.name}” 吗？`)) {
        return;
    }
    const [profile] = settings.profiles.splice(index, 1);
    for (const role of ['low', 'medium', 'high']) {
        if (getSettings().modelSlots[role].profileId === id) {
            getSettings().modelSlots[role].profileId = '';
        }
    }
    document.querySelector(`#connection_profiles option[value="${CSS.escape(id)}"]`)?.remove();
    await eventSource.emit(event_types.CONNECTION_PROFILE_DELETED, profile);
    saveSettingsDebounced();
    syncModelSlotControls();
    profileEditorDialog.close();
    toastr.success(`Connection Profile “${profile.name}” 已删除。`);
}

function renderProfileDetail(role, profileId, profiles) {
    const detail = root.querySelector(`#hpmud_profile_detail_${role}`);
    const profile = profiles.find(item => item.id === profileId);
    if (!profile) {
        const fallback = role === 'low'
            ? '尚未选择 Connection Profile'
            : role === 'medium'
                ? '留空时复用低档连接；仍执行中档职责与参数'
                : '留空时复用场景与规则导演';
        detail.textContent = fallback;
        detail.classList.remove('configured');
        return;
    }
    const values = [
        profile.api && `API · ${profile.api}`,
        profile.model && `模型 · ${profile.model}`,
        profile.preset && `Preset · ${profile.preset}`,
        profile.instruct && `Instruct · ${profile.instruct}`,
    ].filter(Boolean);
    detail.textContent = values.join('　') || 'Profile 已配置';
    detail.classList.add('configured');
}

function getChatCompletionPresetNames() {
    const manager = getPresetManager('openai');
    return Array.from(new Set(manager?.getAllPresets?.() || []))
        .map(name => String(name).trim())
        .filter(Boolean);
}

function populateRolePresetControl(role, slot, profile) {
    const presetSelect = getSetupControl(`preset_${role}`);
    presetSelect.replaceChildren(new Option(
        profile?.preset ? `使用 Profile Preset · ${profile.preset}` : '使用 Profile/默认 Preset',
        '',
    ));
    getChatCompletionPresetNames().forEach(name => presetSelect.add(new Option(name, name)));
    presetSelect.value = slot.presetName;

    const regexSelect = getSetupControl(`regex_${role}`);
    regexSelect.replaceChildren(new Option('不覆盖 Regex Preset', ''));
    const regexPresets = Array.isArray(extension_settings.regex_presets)
        ? extension_settings.regex_presets
        : [];
    regexPresets.forEach(preset => regexSelect.add(new Option(preset.name, preset.id)));
    regexSelect.value = slot.regexPresetId;
}

function syncModelSlotControls() {
    const settings = getSettings();
    const slots = normalizeModelSlots(isGameStarted() ? getMudState().modelSlots : settings.modelSlots);
    const profiles = getConnectionProfiles();
    root.querySelector('#hpmud_profile_count').textContent = profiles.length
        ? `已读取 ${profiles.length} 个酒馆 Connection Profile`
        : '酒馆中还没有 Connection Profile，请先新建';
    root.querySelectorAll('[data-hpmud-profile-slot]').forEach(select => {
        const role = select.dataset.hpmudProfileSlot;
        const selected = slots?.[role]?.profileId || '';
        const emptyLabel = role === 'low'
            ? '请选择 Profile'
            : role === 'medium'
                ? '复用低档 Profile'
                : '复用中档 Profile';
        select.replaceChildren(new Option(emptyLabel, ''));
        profiles.forEach(profile => {
            const detail = [profile.name, profile.model].filter(Boolean).join(' · ');
            select.add(new Option(detail, profile.id));
        });
        select.value = selected;
        const profile = profiles.find(item => item.id === selected);
        populateRolePresetControl(role, slots[role], profile);
        setControlValue(`context_${role}`, slots[role].contextSize);
        setControlValue(`response_${role}`, slots[role].maxResponseLength);
        renderProfileDetail(role, selected, profiles);
    });
    syncContextPolicyUi(slots);
}

function formatTokenCount(value) {
    const amount = Math.max(0, Number(value) || 0);
    return amount >= 1000
        ? `${Number((amount / 1000).toFixed(1))}K`
        : String(amount);
}

function syncContextPolicyUi(slots = collectModelSlots()) {
    for (const role of ['low', 'medium', 'high']) {
        const plan = createContextBudgetPlan(
            slots[role].contextSize,
            slots[role].maxResponseLength,
        );
        const summary = root.querySelector(
            `#hpmud_context_summary_${role}`,
        );
        if (summary) {
            summary.textContent = [
                `${plan.label}模式`,
                `输入 ${formatTokenCount(plan.inputBudget)}`,
                `输出余量 ${formatTokenCount(plan.maxResponseLength)}`,
                `系统预留 ${formatTokenCount(plan.mandatoryReserveTokens)}`,
                `RAG ${plan.ragLimit}`,
                `记忆 ${plan.memoryLimits.core}/${plan.memoryLimits.recent}/${plan.memoryLimits.everyday}`,
            ].join(' · ');
        }
    }
    root.querySelectorAll(
        '[data-hpmud-context-preset]',
    ).forEach(button => {
        const target =
            CONTEXT_SIZE_PRESETS[
                button.dataset.hpmudContextPreset
            ];
        button.classList.toggle(
            'active',
            Boolean(target) &&
            ['low', 'medium', 'high'].every(role =>
                slots[role].contextSize === target),
        );
    });
}

function applyContextSizePreset(presetId) {
    const contextSize =
        CONTEXT_SIZE_PRESETS[presetId];
    if (!contextSize) return;
    const slots = collectModelSlots();
    for (const role of ['low', 'medium', 'high']) {
        slots[role].contextSize = contextSize;
    }
    const normalized = persistModelSlots(slots);
    syncModelSlotControls();
    toastr.success(
        `三档上下文已切换为 ${formatTokenCount(contextSize)}。`,
    );
    return normalized;
}

async function saveInGameModelConfigAndReturn() {
    const slots = persistModelSlots(
        collectModelSlots(),
    );
    if (!slots.low.profileId) {
        toastr.warning(
            '低档现场表演者必须绑定 Connection Profile。',
        );
        return;
    }
    await applyNativeRoleSettings(slots.low);
    await getContext().saveMetadata();
    applySystemPrompt();
    setAppScreen('game');
    toastr.success(
        '三档 AI 与上下文策略已保存到当前时间线。',
    );
}

function updateAttributeTotal() {
    const names = ['attr_physique', 'attr_agility', 'attr_perception', 'attr_intellect', 'attr_willpower', 'attr_charisma'];
    const total = names.reduce((sum, name) => sum + Number(getSetupControl(name)?.value || 0), 0);
    const output = root.querySelector('#hpmud_attribute_total');
    output.textContent = String(total);
    output.closest('b').classList.toggle('invalid', total !== 63);
}

function showSetupStep(step) {
    const steps = ['identity', 'background', 'aptitudes', 'models', 'review'];
    const index = Math.max(0, steps.indexOf(step));
    activeSetupStep = steps[index];
    const copy = {
        identity: ['第一卷 · 身份记录', '先决定谁将收到那封信'],
        background: ['第二卷 · 家庭与欲望', '让世界知道你从哪里来'],
        aptitudes: ['第三卷 · 能力倾向', '长处必须与短板一起成立'],
        models: ['第四卷 · 生成配置', '把三种职责交给合适的模型'],
        review: ['第五卷 · 事实确认', '人物卡确认后，世界才开始转动'],
    };
    root.querySelectorAll('[data-hpmud-step]').forEach(button => button.classList.toggle('active', button.dataset.hpmudStep === activeSetupStep));
    root.querySelectorAll('[data-hpmud-page]').forEach(page => {
        const visible = page.dataset.hpmudPage === activeSetupStep;
        page.hidden = !visible;
        page.classList.toggle('active', visible);
    });
    root.querySelector('#hpmud_setup_kicker').textContent = copy[activeSetupStep][0];
    root.querySelector('#hpmud_setup_title').textContent = copy[activeSetupStep][1];
    root.querySelector('#hpmud_setup_progress').textContent = `${index + 1} / ${steps.length}`;
    root.querySelector('#hpmud_setup_previous').disabled = index === 0;
    root.querySelector('#hpmud_setup_next').hidden = index === steps.length - 1;
    root.querySelector('#hpmud_start_game').hidden = index !== steps.length - 1;
    root.querySelector('#hpmud_start_game').textContent = isGameStarted() ? '保存并返回游戏' : '确认人物卡并开始';
    root.querySelector(
        '#hpmud_setup_return_game',
    ).hidden = !isGameStarted();
    if (activeSetupStep === 'review') {
        renderSetupReview();
    }
}

function buildLocalBackground(character) {
    const identity = character.identity;
    const background = character.background;
    const aptitude = character.aptitudes;
    return `${identity.name || '这名新生'}在${background.home || '英国'}长大，由${background.guardian || '家人'}照料。${identity.appearance || ''}\n\n${identity.name || '这个孩子'}最想得到的是${background.desire || '尚未说出口的东西'}，却害怕${background.fear || '某种尚未命名的失去'}。${background.formativeEvent || ''}\n\n魔法能力呈现“${aptitude.magicalPotential || '均衡'}”倾向，优势可能在${aptitude.strongDomain || '尚待发现的领域'}，短板则是${aptitude.weakDomain || '尚待课堂验证的领域'}。`;
}

function createSvgElement(name, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
}

function renderWorldMap(container, mapState = null, options = {}) {
    container.replaceChildren();
    const compact = Boolean(options.compact);
    const model = buildMapModel(mapState || {}, options.currentLocation, Boolean(options.revealAll));
    container.classList.toggle('compact', compact);
    const svg = createSvgElement('svg', {
        viewBox: '0 0 100 100',
        role: 'img',
        'aria-label': '英国魔法世界地点与路线图',
        preserveAspectRatio: 'xMidYMid meet',
    });
    svg.innerHTML = `
        <defs>
            <filter id="hpmud-map-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="1.4" result="blur"></feGaussianBlur>
                <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
            </filter>
            <pattern id="hpmud-map-grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="currentColor" stroke-width=".12"></path>
            </pattern>
        </defs>
        <rect class="hpmud-map-grid" x="0" y="0" width="100" height="100" fill="url(#hpmud-map-grid)"></rect>
        <path class="hpmud-map-coast" d="M21 57 C15 48 18 35 26 27 C33 20 43 18 50 22 C56 13 68 8 78 12 C89 17 90 28 84 38 C91 46 88 57 81 62 C86 72 80 87 68 90 C56 93 48 85 45 78 C35 82 22 75 21 57 Z"></path>
    `;
    const regionsLayer = createSvgElement('g', { class: 'hpmud-map-regions' });
    model.regions.forEach(region => {
        const group = createSvgElement('g', { class: `hpmud-map-region region-${region.id}` });
        group.append(
            createSvgElement('ellipse', {
                cx: region.x,
                cy: region.y,
                rx: compact ? 17 : 20,
                ry: compact ? 13 : 16,
            }),
        );
        if (!compact) {
            const label = createSvgElement('text', {
                x: region.x,
                y: region.y - 11,
                class: 'hpmud-map-region-label',
                'text-anchor': 'middle',
            });
            label.textContent = region.name;
            group.append(label);
        }
        regionsLayer.append(group);
    });
    svg.append(regionsLayer);

    const edgesLayer = createSvgElement('g', { class: 'hpmud-map-edges' });
    model.edges.forEach(edge => {
        edgesLayer.append(createSvgElement('line', {
            x1: edge.source.mapX,
            y1: edge.source.mapY,
            x2: edge.target.mapX,
            y2: edge.target.mapY,
            class: `${edge.visibility} mode-${edge.mode}`,
        }));
    });
    svg.append(edgesLayer);

    const nodesLayer = createSvgElement('g', { class: 'hpmud-map-nodes' });
    model.nodes.forEach(node => {
        const group = createSvgElement('g', {
            class: `hpmud-map-node ${node.visibility}${node.locked === false ? ' generated' : ''}`,
            transform: `translate(${node.mapX} ${node.mapY})`,
            'data-node-id': node.id,
        });
        const title = createSvgElement('title');
        title.textContent = `${node.name} · ${node.summary}`;
        group.append(title);
        if (node.visibility === 'current') {
            group.append(createSvgElement('circle', { class: 'pulse', r: compact ? 4.2 : 4.8 }));
        }
        group.append(createSvgElement('circle', { class: 'dot', r: compact ? 1.8 : 2.1 }));
        if (!compact) {
            const label = createSvgElement('text', {
                x: 0,
                y: -3.8,
                'text-anchor': 'middle',
            });
            label.textContent = node.name;
            group.append(label);
        }
        nodesLayer.append(group);
    });
    svg.append(nodesLayer);
    container.append(svg);

    if (!compact) {
        const legend = document.createElement('div');
        legend.className = 'hpmud-map-legend';
        legend.innerHTML = '<span class="current">当前位置</span><span class="discovered">已发现</span><span class="known">地图已知</span><span class="generated">世界生成</span>';
        container.append(legend);
    }
}

function getMapPositionMarkers(state, mapId) {
    const markers = [];
    if (state.map?.activeMapId === mapId &&
        state.map?.currentLocalNodeId) {
        markers.push({
            id: 'player',
            type: 'player',
            name: state.character?.identity?.name || '玩家',
            roomId: state.map.currentLocalNodeId,
        });
    }
    (state.actors || [])
        .filter(actor =>
            actor.present !== false &&
            (actor.mapId || state.map?.activeMapId) === mapId &&
            actor.roomId)
        .forEach(actor => {
            const profile = state.actorLibrary?.find(item =>
                item.id === actor.id);
            markers.push({
                id: actor.id,
                type: 'actor',
                name: profile?.name || actor.name ||
                    profile?.nameEn || actor.nameEn || actor.id,
                roomId: actor.roomId,
            });
        });
    return markers;
}

function renderLocalMap(container, mapId, mapState = {}, options = {}) {
    container.replaceChildren();
    const compact = Boolean(options.compact);
    const model = buildLocalMapModel(mapId, mapState || {}, options.levelId || '');
    if (!model) {
        renderWorldMap(container, mapState, options);
        return null;
    }
    container.classList.toggle('compact', compact);
    const svg = createSvgElement('svg', {
        viewBox: '0 0 100 100',
        role: 'img',
        'aria-label': `${model.name} · ${model.levels.find(level => level.id === model.levelId)?.name || ''} MUD 地图`,
        preserveAspectRatio: 'xMidYMid meet',
    });
    svg.innerHTML = `
        <defs>
            <filter id="hpmud-local-map-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="1.2" result="blur"></feGaussianBlur>
                <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
            </filter>
            <pattern id="hpmud-local-map-grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="currentColor" stroke-width=".12"></path>
            </pattern>
        </defs>
        <rect class="hpmud-map-grid" x="0" y="0" width="100" height="100" fill="url(#hpmud-local-map-grid)"></rect>
        <rect class="hpmud-local-map-frame" x="4" y="4" width="92" height="92" rx="4"></rect>
    `;
    const edgeLayer = createSvgElement('g', { class: 'hpmud-map-edges hpmud-local-edges' });
    const nodeById = new Map(model.nodes.map(room => [room.id, room]));
    model.exits.forEach(route => {
        const source = nodeById.get(route.from);
        const target = nodeById.get(route.to);
        if (!source || !target) {
            return;
        }
        edgeLayer.append(createSvgElement('line', {
            x1: source.x,
            y1: source.y,
            x2: target.x,
            y2: target.y,
            class: `${route.generated ? 'generated' : 'discovered'}${route.runtime?.blocked ? ' blocked' : ''} mode-${route.kind}`,
        }));
    });
    svg.append(edgeLayer);

    const nodeLayer = createSvgElement('g', { class: 'hpmud-map-nodes hpmud-local-nodes' });
    model.nodes.forEach(room => {
        const runtimeStatus = room.runtime?.status ? ` state-${room.runtime.status}` : '';
        const group = createSvgElement('g', {
            class: `hpmud-map-node ${room.visibility}${room.generated ? ' generated' : ''}${runtimeStatus}`,
            transform: `translate(${room.x} ${room.y})`,
            'data-node-id': room.id,
        });
        const title = createSvgElement('title');
        title.textContent = `${room.name} · ${room.description || room.kind}`;
        group.append(title);
        if (room.visibility === 'current') {
            group.append(createSvgElement('circle', { class: 'pulse', r: compact ? 4 : 4.8 }));
        }
        group.append(createSvgElement('circle', { class: 'dot', r: compact ? 1.8 : 2.2 }));
        if (!compact) {
            const label = createSvgElement('text', {
                x: 0,
                y: -3.8,
                'text-anchor': 'middle',
            });
            label.textContent = room.name;
            group.append(label);
        }
        nodeLayer.append(group);
    });
    svg.append(nodeLayer);

    const positions = Array.isArray(options.positions)
        ? options.positions
        : [];
    const positionLayer = createSvgElement('g', {
        class: 'hpmud-map-positions',
    });
    const byRoom = new Map();
    positions.forEach(position => {
        if (!byRoom.has(position.roomId)) byRoom.set(position.roomId, []);
        byRoom.get(position.roomId).push(position);
    });
    const offsets = [
        [0, -7],
        [6, -4],
        [7, 3],
        [0, 7],
        [-7, 3],
        [-6, -4],
    ];
    byRoom.forEach((roomPositions, roomId) => {
        const room = nodeById.get(roomId);
        if (!room) return;
        roomPositions.slice(0, offsets.length).forEach((position, index) => {
            const [offsetX, offsetY] = offsets[index];
            const marker = createSvgElement('g', {
                class: `hpmud-map-position ${position.type}`,
                transform: `translate(${room.x + offsetX} ${room.y + offsetY})`,
                'data-position-id': position.id,
            });
            const title = createSvgElement('title');
            title.textContent = `${position.name} · ${room.name}`;
            marker.append(title);
            if (position.type === 'player') {
                marker.append(createSvgElement('path', {
                    class: 'badge',
                    d: compact
                        ? 'M 0 -3 L 3 0 L 0 3 L -3 0 Z'
                        : 'M 0 -3.5 L 3.5 0 L 0 3.5 L -3.5 0 Z',
                }));
            } else {
                marker.append(createSvgElement('circle', {
                    class: 'badge',
                    r: compact ? 3 : 3.5,
                }));
                const label = createSvgElement('text', {
                    x: 0,
                    y: .8,
                    'text-anchor': 'middle',
                });
                label.textContent = initials(position.name).slice(0, 2);
                marker.append(label);
            }
            positionLayer.append(marker);
        });
    });
    svg.append(positionLayer);
    container.append(svg);

    if (!compact) {
        const legend = document.createElement('div');
        legend.className = 'hpmud-map-legend';
        legend.innerHTML = '<span class="player">玩家</span><span class="actor">人物</span><span class="discovered">固定房间</span><span class="known">未发现秘密</span>';
        container.append(legend);
    }
    return model;
}

function populateMapScopeSelect(select, selectedValue, includeAuto = false, mapState = {}) {
    select.replaceChildren();
    if (includeAuto) {
        select.add(new Option('跟随当前位置', 'auto'));
    }
    select.add(new Option('英国魔法世界总览', 'world'));
    LOCAL_MAP_CATALOG.forEach(item => {
        select.add(new Option(`${item.name} · ${item.nodeCount} 节点`, item.id));
    });
    (mapState.customLocalMaps || []).forEach(map => {
        select.add(new Option(`${map.name} · ${map.nodes.length} 个固化房间`, map.id));
    });
    select.value = selectedValue;
    if (!select.value) {
        select.value = includeAuto ? 'auto' : 'world';
    }
}

function populateLevelSelect(select, mapId, selectedValue, mapState = {}) {
    const map = getLocalMapDefinition(mapId, mapState);
    select.replaceChildren();
    if (!map) {
        select.hidden = true;
        return '';
    }
    map.levels.forEach(level => select.add(new Option(level.name, level.id)));
    select.value = map.levels.some(level => level.id === selectedValue)
        ? selectedValue
        : map.defaultLevelId;
    select.hidden = map.levels.length <= 1;
    return select.value;
}

function renderSetupMap() {
    const scopeSelect = root.querySelector('#hpmud_setup_map_scope');
    const levelSelect = root.querySelector('#hpmud_setup_map_level');
    populateMapScopeSelect(scopeSelect, setupMapScope);
    setupMapScope = scopeSelect.value;
    const container = root.querySelector('#hpmud_setup_map');
    const stats = root.querySelector('#hpmud_review_map_stats');
    if (setupMapScope === 'world') {
        levelSelect.hidden = true;
        renderWorldMap(container, null, { revealAll: true });
        stats.textContent = `${LOCAL_MAP_CATALOG.length} 个小地图 · ${LOCAL_MAP_CATALOG.reduce((sum, item) => sum + item.nodeCount, 0)} 个固定节点`;
        return;
    }
    setupMapLevel = populateLevelSelect(levelSelect, setupMapScope, setupMapLevel);
    const model = renderLocalMap(container, setupMapScope, {}, {
        levelId: setupMapLevel,
        revealAll: true,
    });
    stats.textContent = `${model?.levels.length || 0} 层 · ${getPresetLocalMap(setupMapScope)?.nodes.length || 0} 个固定节点`;
}

function renderSetupReview() {
    const character = collectCharacterDraft();
    const campaign = normalizeCampaign(isGameStarted()
        ? getMudState().campaign
        : getSettings().campaignDraft);
    root.querySelector('#hpmud_review_name').textContent = character.identity.name || '未命名';
    root.querySelector('#hpmud_review_world_title').textContent =
        `${campaign.startYear} · ${campaign.presetName}`;
    const background = root.querySelector('#hpmud_polished_background');
    if (!background.value.trim()) {
        background.value = buildLocalBackground(character);
    }
    const facts = root.querySelector('#hpmud_review_facts');
    facts.replaceChildren();
    [
        `${campaign.grade} 年级`,
        `${campaign.difficultyName}难度`,
        character.background.bloodStatus || '血统待定',
        character.aptitudes.strongDomain ? `优势：${character.aptitudes.strongDomain}` : '优势待发现',
        character.aptitudes.rareTalent === 'none' ? '无已知罕见天赋' : character.aptitudes.rareTalent,
    ].forEach(value => {
        const item = document.createElement('span');
        item.textContent = value;
        facts.append(item);
    });
    renderSetupMap();
}

async function applySelectedConnectionProfile(profileId) {
    if (!profileId) {
        return;
    }
    const nativeSelect = document.querySelector('#connection_profiles');
    if (!(nativeSelect instanceof HTMLSelectElement)) {
        throw new Error('Connection Profiles 扩展尚未加载。');
    }
    if (!Array.from(nativeSelect.options).some(option => option.value === profileId)) {
        throw new Error('选择的 Connection Profile 已不存在。');
    }
    await new Promise((resolve, reject) => {
        let settled = false;
        eventSource.once(event_types.CONNECTION_PROFILE_LOADED, () => {
            settled = true;
            resolve();
        });
        nativeSelect.value = profileId;
        nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(() => {
            if (!settled) {
                reject(new Error('Connection Profile 应用超时。'));
            }
        }, 15000);
    });
}

function selectChatCompletionPreset(presetName) {
    if (!presetName) {
        return;
    }
    const manager = getPresetManager('openai');
    const value = manager?.findPreset(presetName);
    if (value !== undefined && value !== null) {
        manager.selectPreset(value);
    }
}

async function applyRegexPresetById(presetId) {
    if (!presetId) {
        return;
    }
    const preset = extension_settings.regex_presets?.find(item => item.id === presetId);
    if (!preset) {
        return;
    }
    const presetLists = {
        [SCRIPT_TYPES.GLOBAL]: preset.global || [],
        [SCRIPT_TYPES.SCOPED]: preset.scoped || [],
        [SCRIPT_TYPES.PRESET]: preset.preset || [],
    };
    for (const scriptType of Object.values(SCRIPT_TYPES)) {
        const scripts = getScriptsByType(scriptType);
        const enabledIds = new Set(presetLists[scriptType].map(item => item.id));
        scripts.forEach(script => {
            script.disabled = !enabledIds.has(script.id);
        });
        scripts.sort((left, right) => {
            const leftIndex = presetLists[scriptType].findIndex(item => item.id === left.id);
            const rightIndex = presetLists[scriptType].findIndex(item => item.id === right.id);
            return leftIndex - rightIndex;
        });
        await saveScriptsByType(scripts, scriptType);
    }
    extension_settings.regex_presets.forEach(item => {
        item.isSelected = item.id === presetId;
    });
    RegexProvider.instance.clear();
    saveSettingsDebounced();
}

function applyNativeRoleLengths(slot) {
    const contextSize = Number(slot.contextSize);
    const responseLength = Number(slot.maxResponseLength);
    const unlocked = document.querySelector('#oai_max_context_unlocked');
    if (unlocked instanceof HTMLInputElement) {
        unlocked.checked = contextSize > Number(document.querySelector('#openai_max_context')?.getAttribute('max') || 0);
        unlocked.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const context = document.querySelector('#openai_max_context');
    const contextCounter = document.querySelector('#openai_max_context_counter');
    if (context instanceof HTMLInputElement) {
        context.max = String(Math.max(contextSize, Number(context.max || 0)));
        context.value = String(contextSize);
        context.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (contextCounter instanceof HTMLInputElement) {
        contextCounter.max = String(Math.max(contextSize, Number(contextCounter.max || 0)));
        contextCounter.value = String(contextSize);
        contextCounter.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const response = document.querySelector('#openai_max_tokens');
    if (response instanceof HTMLInputElement) {
        response.max = String(
            Math.max(
                responseLength,
                Number(response.max || 0),
            ),
        );
        response.value = String(responseLength);
        response.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

async function applyNativeRoleSettings(slot) {
    await applySelectedConnectionProfile(slot.profileId);
    selectChatCompletionPreset(slot.presetName);
    applyNativeRoleLengths(slot);
    await applyRegexPresetById(slot.regexPresetId);
}

async function sendRoleRequest(
    slot,
    prompt,
    {
        json = false,
        jsonSchema = null,
        stream = false,
        onProgress = null,
    } = {},
) {
    const profiles = getConnectionProfiles();
    const baseProfile = profiles.find(item => item.id === slot.profileId);
    if (!baseProfile) {
        throw new Error('职责绑定的 Connection Profile 不存在。');
    }
    const regexPresetId = slot.regexPresetId || baseProfile['regex-preset'];
    await applyRegexPresetById(regexPresetId);
    const effectiveProfile = {
        ...structuredClone(baseProfile),
        id: `hpmud-runtime-${uuidv4()}`,
        preset: slot.presetName || baseProfile.preset,
        'regex-preset': regexPresetId,
    };
    profiles.push(effectiveProfile);
    const requestPrompt = limitMessagesToContext(
        prompt,
        slot.contextSize,
        slot.maxResponseLength,
    );
    const overridePayload = {
        max_tokens: slot.maxResponseLength,
        ...(json ? {
            ...(
                jsonSchema
                    ? {
                        json_schema:
                            jsonSchema,
                    }
                    : {
                        // Keep raw fenced JSON for legacy
                        // director responses.
                        response_format: {
                            type:
                                'json_object',
                        },
                    }
            ),
        } : {}),
    };
    const execute = requestStream =>
        ConnectionManagerRequestService.sendRequest(
            effectiveProfile.id,
            requestPrompt,
            slot.maxResponseLength,
            {
                extractData: true,
                includePreset: true,
                stream: requestStream,
            },
            overridePayload,
        );
    try {
        if (stream) {
            try {
                const response = await execute(true);
                if (typeof response === 'function') {
                    let content = '';
                    let reasoning = '';
                    for await (const chunk of response()) {
                        content = chunk.text || content;
                        reasoning =
                            chunk.state?.reasoning || reasoning;
                        onProgress?.(
                            content,
                            chunk.state || {},
                        );
                    }
                    return { content, reasoning };
                }
                onProgress?.(
                    response?.content || '',
                    {},
                );
                return response;
            } catch (error) {
                console.warn(
                    '[Hogwarts MUD] Streaming unavailable; falling back to one-shot request',
                    error,
                );
            }
        }
        return await execute(false);
    } finally {
        const index = profiles.findIndex(item => item.id === effectiveProfile.id);
        if (index >= 0) {
            profiles.splice(index, 1);
        }
    }
}

async function polishCharacterBackground() {
    const button = root.querySelector('#hpmud_polish_background');
    const character = collectCharacterDraft();
    const slots = resolveRoleSlots(collectModelSlots());
    const profileId = slots.medium.profileId;
    if (!profileId) {
        toastr.warning('请先选择中档或高档 Connection Profile。');
        return;
    }
    button.disabled = true;
    button.textContent = '润色中…';
    try {
        const campaign = normalizeCampaign(
            isGameStarted() ? getMudState().campaign : getSettings().campaignDraft,
        );
        const roleSlot = {
            ...slots.medium,
            profileId,
        };
        const response = await sendRoleRequest(roleSlot, [
            {
                role: 'system',
                content: `You polish a structured player character background for a Hogwarts role-playing game beginning in ${campaign.startYear}, school grade ${campaign.grade}. Preserve every supplied fact, add no secret lineage or ability, write 180-260 English words, and output prose only.`,
            },
            { role: 'user', content: JSON.stringify(character) },
        ]);
        const content = String(response?.content || '').trim();
        if (!content) {
            throw new Error('模型没有返回背景文本。');
        }
        root.querySelector('#hpmud_polished_background').value = content;
    } catch (error) {
        console.error('[Hogwarts MUD] Character polish failed', error);
        toastr.error(String(error?.cause?.message || error?.message || error));
    } finally {
        button.disabled = false;
        button.textContent = '用中档 AI 润色';
    }
}

function getTranslationGlossary() {
    const state = getMudState();
    const dynamicTerms = [];
    const addTerm = (source, target) => {
        const normalizedSource = String(source || '').trim();
        const normalizedTarget = String(target || '').trim();
        if (normalizedSource && normalizedTarget && normalizedSource !== normalizedTarget) {
            dynamicTerms.push({
                source: normalizedSource,
                target: normalizedTarget,
            });
        }
    };
    dynamicTerms.push(
        ...buildActorTranslationTerms([
            ...(state?.actorLibrary || []),
            ...(state?.actors || []),
        ]),
    );
    addTerm(state?.scene?.nameEn, state?.scene?.name);
    (state?.map?.customLocalMaps || []).forEach(map =>
        addTerm(map.nameEn, map.name),
    );
    return [
        ...TRANSLATION_TERM_GLOSSARY,
        ...dynamicTerms,
    ];
}

function selectLocalTranslationGlossary(
    text,
    glossary,
) {
    const source =
        String(
            text || '',
        ).toLocaleLowerCase();
    return (
        glossary ||
        []
    )
        .filter(entry =>
            String(
                entry?.source ||
                '',
            ).trim() &&
            String(
                entry?.target ||
                '',
            ).trim() &&
            source.includes(
                String(
                    entry.source,
                ).toLocaleLowerCase(),
            ))
        .slice(0, 96)
        .map(entry => ({
            source:
                String(
                    entry.source,
                ),
            target:
                String(
                    entry.target,
                ),
        }));
}

function getLocalTranslationNameGlossary() {
    const state =
        getMudState();
    const actorTerms =
        buildActorTranslationTerms([
            ...(state?.actorLibrary || []),
            ...(state?.actors || []),
        ]);
    return [
        ...actorTerms,
        ...TRANSLATION_TERM_GLOSSARY
            .filter(entry =>
                [
                    'tina',
                    'tina zhang',
                ].includes(
                    entry.source
                        .toLocaleLowerCase(),
                )),
    ];
}

async function translateOpeningValues(values) {
    const output = values.slice();
    const glossary = getTranslationGlossary();
    const nameGlossary =
        getLocalTranslationNameGlossary();
    const provider =
        getSettings().translationProvider;
    if (provider === 'local') {
        const translatedParts =
            values.map(() => []);
        const tasks = values.flatMap(
            (value, valueIndex) =>
                splitTranslationChunks(
                    String(value || ''),
                    3600,
                ).map(
                    (text, partIndex) => ({
                        valueIndex,
                        partIndex,
                        text,
                    }),
                ),
        );
        for (
            let taskIndex = 0;
            taskIndex < tasks.length;
            taskIndex++
        ) {
            const task =
                tasks[taskIndex];
            const taskGlossary =
                selectLocalTranslationGlossary(
                    task.text,
                    glossary,
                );
            const prelocalizedGlossary =
                selectLocalTranslationGlossary(
                    task.text,
                    nameGlossary,
                );
            translatedParts[
                task.valueIndex
            ][
                task.partIndex
            ] =
                await requestTranslation(
                    applyTranslationGlossaryTargets(
                        task.text,
                        prelocalizedGlossary,
                    ),
                    provider,
                    {
                        unload:
                            taskIndex ===
                            tasks.length -
                                1,
                        glossary:
                            taskGlossary,
                    },
                );
        }
        translatedParts.forEach(
            (parts, index) => {
                const translated =
                    parts
                        .filter(Boolean)
                        .join('\n\n')
                        .trim();
                if (translated) {
                    output[index] =
                        normalizeLocalTranslationText(
                            values[index],
                            translated,
                        );
                }
            },
        );
        return output;
    }
    const batchLength =
        provider === 'bing'
            ? 900
            : 4700;
    const protectedValues =
        values.map(value =>
            protectTranslationTerms(
                value,
                glossary,
            ));
    const translatedParts = values.map(() => []);
    const batches =
        createTranslationBatches(
            protectedValues,
            batchLength,
        );
    for (
        let batchIndex = 0;
        batchIndex <
            batches.length;
        batchIndex++
    ) {
        const translated =
            await requestTranslation(
                batches[
                    batchIndex
                ],
                provider,
                {
                    unload:
                        batchIndex ===
                        batches.length -
                            1,
                },
            );
        const pattern = /\[\[\s*HPMUD_(\d+)_(\d+)\s*]]\s*([\s\S]*?)(?=\[\[\s*HPMUD_\d+_\d+\s*]]|$)/g;
        for (const match of translated.matchAll(pattern)) {
            const valueIndex = Number(match[1]);
            const partIndex = Number(match[2]);
            const value = match[3].trim();
            if (valueIndex >= 0 && valueIndex < output.length && value) {
                translatedParts[valueIndex][partIndex] = value;
            }
        }
    }
    translatedParts.forEach((parts, index) => {
        const translated = parts.filter(Boolean).join('\n\n').trim();
        if (translated) {
            output[index] =
                restoreTranslationTerms(
                    translated,
                    glossary,
                );
        }
    });
    return output;
}

async function localizeOpeningPackage(opening) {
    if (!getSettings().translationEnabled) {
        return opening;
    }
    const fields = [
        opening.chapterEn,
        opening.scene.nameEn,
        opening.scene.summaryEn,
        opening.scene.map.nameEn,
        ...opening.scene.map.levels.map(level => level.nameEn),
        ...opening.scene.map.rooms.map(room => room.nameEn),
        ...opening.actors.flatMap(actor => [
            actor.roleEn,
            actor.relationshipToPlayerEn,
            actor.impressionOfPlayerEn ||
                actor.relationshipToPlayerEn,
            actor.currentActivityEn,
            actor.currentIntentEn,
        ]),
        opening.conflict.titleEn,
        opening.conflict.premiseEn,
        opening.conflict.immediatePressureEn,
        opening.conflict.stakesEn,
        opening.conflict.incitingEventEn,
        ...opening.agenda.flatMap(item => [item.timeLabelEn, item.labelEn]),
        ...(opening.clues || []).flatMap(item => [item.labelEn, item.detailEn]),
        ...(opening.items || []).flatMap(item => [item.labelEn, item.detailEn]),
        ...(opening.nextSceneIntent ? [
            opening.nextSceneIntent.titleEn,
            opening.nextSceneIntent.summaryEn,
            opening.nextSceneIntent.triggerEn,
        ] : []),
    ];
    const translated = await translateOpeningValues(fields);
    let cursor = 0;
    const display = {
        chapter: translated[cursor++],
        sceneName: translated[cursor++],
        sceneSummary: translated[cursor++],
        mapName: translated[cursor++],
        levelNames: opening.scene.map.levels.map(() => translated[cursor++]),
        roomNames: opening.scene.map.rooms.map(() => translated[cursor++]),
        actorRoles: [],
        actorRelationships: [],
        actorImpressions: [],
        actorActivities: [],
        actorIntents: [],
    };
    opening.actors.forEach(() => {
        display.actorRoles.push(translated[cursor++]);
        display.actorRelationships.push(translated[cursor++]);
        display.actorImpressions.push(translated[cursor++]);
        display.actorActivities.push(translated[cursor++]);
        display.actorIntents.push(translated[cursor++]);
    });
    display.conflictTitle = translated[cursor++];
    display.conflictPremise = translated[cursor++];
    display.conflictPressure = translated[cursor++];
    display.conflictStakes = translated[cursor++];
    display.incitingEvent = translated[cursor++];
    display.agendaTimes = [];
    display.agendaLabels = [];
    opening.agenda.forEach(() => {
        display.agendaTimes.push(translated[cursor++]);
        display.agendaLabels.push(translated[cursor++]);
    });
    display.clueLabels = [];
    display.clueDetails = [];
    (opening.clues || []).forEach(() => {
        display.clueLabels.push(translated[cursor++]);
        display.clueDetails.push(translated[cursor++]);
    });
    display.itemLabels = [];
    display.itemDetails = [];
    (opening.items || []).forEach(() => {
        display.itemLabels.push(translated[cursor++]);
        display.itemDetails.push(translated[cursor++]);
    });
    const nextSceneIntent = opening.nextSceneIntent ? {
        ...opening.nextSceneIntent,
        title: translated[cursor++],
        summary: translated[cursor++],
        trigger: translated[cursor++],
    } : undefined;
    return {
        ...opening,
        ...(nextSceneIntent ? { nextSceneIntent } : {}),
        display,
    };
}

async function localizeDirectorFoundation(foundation) {
    if (!getSettings().translationEnabled) {
        return foundation;
    }
    const values = foundation.actorLibrary.flatMap(actor => [
        actor.roleEn,
        actor.relationshipToPlayerEn,
        actor.impressionOfPlayerEn ||
            actor.relationshipToPlayerEn,
        actor.publicDescriptionEn,
        actor.publicBackgroundEn,
        actor.personalityEn,
        actor.speechStyleEn,
    ]);
    const translated = await translateOpeningValues(values);
    let cursor = 0;
    return {
        ...foundation,
        actorLibrary: foundation.actorLibrary.map(actor => ({
            ...actor,
            display: {
                name: actor.nameEn,
                role: translated[cursor++],
                relationshipToPlayer: translated[cursor++],
                impressionOfPlayer: translated[cursor++],
                publicDescription: translated[cursor++],
                publicBackground: translated[cursor++],
                personality: translated[cursor++],
                speechStyle: translated[cursor++],
            },
        })),
    };
}

function createDirectorFoundationPrompt(state) {
    return [
        {
            role: 'system',
            content: `You are the highest-level World Director for a persistent Harry Potter RPG. Build the durable private cast library and one fully prewritten hidden exploration arc. Return exactly one JSON object with no Markdown.

The cast library must contain every currently present NPC plus future clue-bearing characters who can enter later. Canon characters must remain canon-consistent. Each character needs a stable public identity, voice, private goal, fear, secret, and bounded knowledge. The on-scene narrator will use these profiles to roleplay each person separately.

publicDescriptionEn is the actor's stable physical description only: body, face, complexion, natural hair, and other durable features. Never include clothing, accessories, held objects, nearby possessions, furniture, current pose, current activity, or scene position. Those belong to current activity and the material presentation state.

impressionOfPlayerEn is an actual starting opinion, not a relationship label. Parents, guardians, relatives, established friends, and other pre-existing contacts must begin with a specific impression grounded in the player's confirmed background and their shared history. Only a genuinely unmet character may use a not-yet-met state; never describe a parent or old friend as a stranger.

The hidden exploration arc is binding private world truth, not a public quest summary. Predetermine the actual answer, stakes, involved people, and 3-8 discoverable clue nodes. Spread clues across at least three distinct people, places, or items. A clue may become player-visible only after its unlock condition is satisfied. Do not use the storage narrator as a character.

Keep the output compact and machine-safe:
- Create 5-7 actors total, including every current actor ID exactly once.
- Create exactly 4 clue nodes.
- Every string value must be at most 35 English words.
- Every knowledgeEn array must contain 1-3 short facts.
- Do not restate the prompt, explain decisions, or emit analysis.
- Close every string, array, and object.

Schema:
{
  "actorLibrary": [{
    "id": "snake_case",
    "nameEn": "string",
    "roleEn": "string",
    "relationshipToPlayerEn": "string",
    "impressionOfPlayerEn": "specific initial opinion of the player",
    "publicDescriptionEn": "stable physical traits only; no clothing, props, activity, or location",
    "publicBackgroundEn": "what the player currently knows",
    "personalityEn": "stable temperament",
    "speechStyleEn": "voice, diction, habits",
    "privateGoalEn": "hidden current goal",
    "fearEn": "private fear",
    "secretEn": "private secret",
    "knowledgeEn": ["facts this character actually knows"]
  }],
  "storyArc": {
    "id": "snake_case",
    "titleEn": "private director title",
    "hookEn": "the surface mystery",
    "hiddenTruthEn": "the predetermined actual answer",
    "stakesEn": "what changes if discovered or suppressed",
    "involvedActorIds": ["actor_id"],
    "cluePlan": [{
      "id": "snake_case",
      "labelEn": "private clue label",
      "hiddenFactEn": "which part of the truth this proves",
      "playerFacingDiscoveryEn": "what may be shown after discovery",
      "unlockConditionEn": "specific action or earned disclosure",
      "sourceActorIds": ["actor_id"],
      "sourceLocationIds": ["optional_location_id"],
      "sourceItemId": "optional_item_id"
    }]
  }
}`,
        },
        {
            role: 'user',
            content: JSON.stringify({
                playerCharacter: state.character,
                campaign: state.campaign,
                currentScene: state.scene,
                currentActors: state.actors,
                internalConflict: state.conflict,
                candidateHiddenClues: state.clues,
                committedOpening: state.opening?.package,
            }),
        },
    ];
}

async function generateDirectorFoundation(roleSlot, state) {
    let response = await sendRoleRequest(
        roleSlot,
        createDirectorFoundationPrompt(state),
        { json: true },
    );
    let raw = extractRoleResponseText(response);
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const foundation = parseJsonObject(raw);
            const validation = validateDirectorFoundation(foundation, state.actors);
            if (!validation.valid) {
                throw new Error(validation.errors.join('；'));
            }
            return foundation;
        } catch (error) {
            lastError = error;
            if (attempt > 0) break;
            response = await sendRoleRequest(roleSlot, [
                {
                    role: 'system',
                    content: 'Repair the director-foundation JSON. Return exactly one compact complete JSON object matching the supplied schema. Keep every present actor ID, use 5-7 actors total, exactly 4 clue nodes, at most 35 words per string, and ensure all references resolve. Output no analysis.',
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        validationError: String(error?.message || error),
                        invalidOutput: typeof raw === 'string' ? raw : JSON.stringify(raw),
                        requiredSchema: createDirectorFoundationPrompt(state)[0].content,
                    }),
                },
            ], { json: true });
            raw = extractRoleResponseText(response);
        }
    }
    throw new Error(`世界导演未能建立出场角色库：${String(lastError?.message || lastError)}`);
}

async function ensureDirectorFoundation() {
    const current = getMudState();
    const foundationReady = current?.directorFoundation?.status === 'ready' &&
        Array.isArray(current.actorLibrary) &&
        current.actorLibrary.length >= 3 &&
        Array.isArray(current.storyArcs) &&
        current.storyArcs.some(arc => Array.isArray(arc.cluePlan) && arc.cluePlan.length >= 3);
    if (foundationReady || current?.phase !== 'playing') {
        return;
    }
    if (directorFoundationPromise) {
        return directorFoundationPromise;
    }

    directorFoundationPromise = (async () => {
        const context = getContext();
        let state = getMudState();
        const slots = resolveRoleSlots(state.modelSlots);
        const roleSlot = slots.high;
        if (!roleSlot.profileId) {
            throw new Error('出场角色库没有可用的高档或中档 Connection Profile。');
        }
        state.directorFoundation = {
            status: 'building',
            error: '',
            committedAt: state.directorFoundation?.committedAt || null,
        };
        await context.saveMetadata();
        renderAll();
        try {
            let foundation = await generateDirectorFoundation(roleSlot, state);
            try {
                foundation = await localizeDirectorFoundation(foundation);
            } catch (translationError) {
                console.warn('[Hogwarts MUD] Cast library translation failed; using English labels', translationError);
            }
            context.chatMetadata.hogwartsMud = applyDirectorFoundation(state, foundation);
            state = getMudState();
            await context.saveMetadata();
            await syncLocalKnowledge();
            applySystemPrompt();
            renderAll();
        } catch (error) {
            state = getMudState();
            state.directorFoundation = {
                status: 'failed',
                error: String(error?.cause?.message || error?.message || error),
                committedAt: null,
            };
            await context.saveMetadata();
            renderAll();
            throw error;
        }
    })().finally(() => {
        directorFoundationPromise = null;
    });
    return directorFoundationPromise;
}

function createOpeningDirectorPrompt(state) {
    const isFirstYear = state.campaign.grade === 1;
    return [
        {
            role: 'system',
            content: `You are the World Director. Build the committed opening state for a persistent Harry Potter RPG. Output exactly one JSON object and no prose.

The opening must already be in motion before the player gets control. Establish an exact time, a concrete current room, 1-8 present NPCs with independent activity and intent, and one strong dramatic conflict with immediate pressure and long-term stakes.

Every present actor and actor-library profile needs impressionOfPlayerEn. For family, guardians, relatives, established friends, and other pre-existing contacts, write a specific initial opinion grounded in the confirmed player background and their shared life before this scene. Do not use "stranger", "unknown", or a bare relationship label for them.

publicDescriptionEn is stable physical appearance only. Exclude clothes, accessories, held objects, nearby possessions, furniture, pose, activity, and location. Put current behavior in currentActivityEn; subsequent clothing and object state is maintained separately.

For a first-year pre-Hogwarts start, use the player's actual home background when available. Create a compact, internally consistent local MUD map for that home and begin with the admission-letter situation already affecting the household. For an older student, choose the most causally appropriate pre-term or school setting. Never list the storage narrator as an NPC. Never decide the player's response, dialogue, thoughts, or action.

Also create a durable private actor library with every present NPC plus future clue-bearing roles. Prewrite one hidden exploration arc with a fixed actual truth and 3-8 clue nodes spread across at least three distinct sources. These private facts guide later play and must not be exposed in the opening prose.

Prewrite one player-facing nextSceneIntent at the same time. It is the default next dramatic beat, not a spoiler or forced outcome. For the opening package, it must use scene.map.id and one existing roomId from that generated map. Choose medium for an ordinary transition and high only for a planned permanent or complex causal turn.

Use English only. IDs must be snake_case. Coordinates must be numbers from 5 to 95. The local map needs 2-16 rooms and valid exits. Every present NPC must have a roomId from that local map.

Schema:
{
  "version": 1,
  "chapterEn": "string",
  "clock": "YYYY-MM-DD · HH:MM",
  "scene": {
    "id": "snake_case",
    "nameEn": "string",
    "summaryEn": "string",
    "worldAnchorId": "optional preset world node id or empty string",
    "map": {
      "id": "snake_case",
      "nameEn": "string",
      "currentLevelId": "snake_case",
      "levels": [{"id":"snake_case","nameEn":"string","z":0}],
      "rooms": [{"id":"snake_case","nameEn":"string","levelId":"snake_case","kind":"room","descriptionEn":"string","x":50,"y":50,"access":"private"}],
      "exits": [{"from":"room_id","to":"room_id","direction":"north","kind":"door","minutes":1}],
      "currentRoomId": "room_id"
    }
  },
  "actors": [{"id":"snake_case","nameEn":"string","roleEn":"string","relationshipToPlayerEn":"string","impressionOfPlayerEn":"specific initial opinion of the player","publicDescriptionEn":"stable physical traits only","currentActivityEn":"string","currentIntentEn":"string","roomId":"existing_room_id","present":true}],
  "actorLibrary": [{
    "id":"snake_case",
    "nameEn":"string",
    "roleEn":"string",
    "relationshipToPlayerEn":"string",
    "impressionOfPlayerEn":"specific initial opinion or not-yet-met state",
    "publicDescriptionEn":"stable physical traits only",
    "publicBackgroundEn":"string",
    "personalityEn":"string",
    "speechStyleEn":"string",
    "privateGoalEn":"string",
    "fearEn":"string",
    "secretEn":"string",
    "knowledgeEn":["string"]
  }],
  "storyArc": {
    "id":"snake_case",
    "titleEn":"private title",
    "hookEn":"surface mystery",
    "hiddenTruthEn":"predetermined actual answer",
    "stakesEn":"string",
    "involvedActorIds":["actor_id"],
    "cluePlan":[{
      "id":"snake_case",
      "labelEn":"string",
      "hiddenFactEn":"string",
      "playerFacingDiscoveryEn":"string",
      "unlockConditionEn":"string",
      "sourceActorIds":["actor_id"],
      "sourceLocationIds":["optional_location_id"],
      "sourceItemId":"optional_item_id"
    }]
  },
  "conflict": {"titleEn":"string","premiseEn":"string","immediatePressureEn":"string","stakesEn":"string","incitingEventEn":"string"},
  "agenda": [{"timeLabelEn":"string","labelEn":"string"}],
  "clues": [{"id":"snake_case","labelEn":"string","detailEn":"string"}],
  "items": [{"id":"snake_case","labelEn":"string","detailEn":"string"}],
  "nextSceneIntent": {
    "titleEn": "player-facing next beat title",
    "summaryEn": "non-spoiler default direction",
    "triggerEn": "observable condition for ending the current scene",
    "mapId": "same_id_as_scene_map",
    "roomId": "existing_room_id",
    "tier": "medium|high"
  },
  "openingBriefEn": "A detailed brief for the narrator describing the active scene beats, NPC behavior, sensory anchors, and the exact point where player control begins."
}`,
        },
        {
            role: 'user',
            content: JSON.stringify({
                campaign: state.campaign,
                firstYearAdmissionOpening: isFirstYear,
                playerCharacter: state.character,
                canonicalWorldCatalog: PRESET_WORLD_MAP.nodes.map(node => ({
                    id: node.id,
                    name: node.name,
                    regionId: node.regionId,
                    summary: node.summary,
                })),
            }),
        },
    ];
}

function validateOpeningScenePlan(plan, state) {
    const errors = [];
    const actorIds = new Set((state.actorLibrary || []).map(actor => actor.id));
    const sequence = Array.isArray(plan?.sequence) ? plan.sequence : [];
    const dialogueBeats = Array.isArray(plan?.dialogueBeats) ? plan.dialogueBeats : [];
    if (!sequence.length || sequence.length > 24) {
        errors.push('首幕必须包含 1–24 个顺序分段。');
    }
    const beats = new Map();
    dialogueBeats.forEach(beat => {
        if (!String(beat.id || '').trim() || beats.has(beat.id) ||
            !actorIds.has(beat.actorId) || !String(beat.intentEn || '').trim()) {
            errors.push('首幕对白任务无效。');
        }
        beats.set(beat.id, beat);
    });
    sequence.forEach(segment => {
        if (segment.type === 'narration' && !String(segment.textEn || '').trim()) {
            errors.push('首幕旁白不能为空。');
        } else if (segment.type === 'dialogue' &&
            (!beats.has(segment.beatId) ||
                beats.get(segment.beatId)?.actorId !== segment.actorId)) {
            errors.push('首幕对白分段引用了无效任务。');
        } else if (!['narration', 'dialogue'].includes(segment.type)) {
            errors.push('首幕分段类型无效。');
        }
    });
    return { valid: errors.length === 0, errors };
}

async function generatePlannedDialogueLines(lowSlot, state, dialogueBeats) {
    if (!dialogueBeats.length) return [];
    const actorIds = new Set(dialogueBeats.map(beat => beat.actorId));
    const response = await sendRoleRequest(lowSlot, [
        {
            role: 'system',
            content: `You are the low-tier Dialogue Performer. Write only the requested NPC spoken lines. Do not narrate setting, actions, consequences, time, clues, or state. Return exactly:
{"lines":[{"beatId":"beat_1","actorId":"actor_id","textEn":"spoken words only"}]}

${CANON_WIT_TONE_CONTRACT}`,
        },
        {
            role: 'user',
            content: JSON.stringify({
                actorProfiles: state.actorLibrary.filter(actor => actorIds.has(actor.id)),
                dialogueBeats,
            }),
        },
    ], { json: true });
    const payload = parseJsonObject(extractRoleResponseText(response));
    const lines = Array.isArray(payload.lines) ? payload.lines : [];
    const beats = new Map(dialogueBeats.map(beat => [beat.id, beat]));
    if (lines.length !== dialogueBeats.length) {
        throw new Error('低档对白模型没有完成全部首幕对白任务。');
    }
    lines.forEach(line => {
        const beat = beats.get(line.beatId);
        if (!beat || beat.actorId !== line.actorId || !String(line.textEn || '').trim()) {
            throw new Error('低档对白模型返回了无效的首幕对白。');
        }
    });
    return lines;
}

function mergeOpeningScenePlan(plan, lines) {
    const lineMap = new Map(lines.map(line => [line.beatId, line]));
    return plan.sequence.map(segment => segment.type === 'narration'
        ? { type: 'narration', textEn: segment.textEn }
        : {
            type: 'dialogue',
            actorId: segment.actorId,
            textEn: lineMap.get(segment.beatId)?.textEn || '',
        });
}

function createOpeningScenePlanPrompt(state) {
    return [
        {
            role: 'system',
            content: `You are the mid-tier Opening Scene Director for a persistent Harry Potter RPG. Plan the first playable scene using the committed world package and actor profiles exactly. Return exactly one JSON object with no Markdown wrapper.

Requirements:
- Begin inside the current room with the listed NPCs already doing their current activities.
- You own setting, physical continuity, event sequencing, and narration.
- Do not write NPC dialogue. Emit dialogue tasks for the low-tier Dialogue Performer.
- Use 500-900 words total with literary scene continuity.
- Preserve all committed facts and do not introduce a different location, time, NPC, item, or outcome.
- Never narrate the player character's unspoken thoughts, dialogue, decision, or action.
- End at the first consequential moment that demands the player's response.
- Do not reveal any private goal, secret, hidden truth, or locked clue.

Schema:
{
  "elapsedMinutes": 0,
  "publicEventEn": "the inciting event begins",
  "sequence": [
    {"type":"narration","textEn":"scene prose"},
    {"type":"dialogue","beatId":"beat_1","actorId":"actor_id"}
  ],
  "dialogueBeats": [
    {
      "id":"beat_1",
      "actorId":"actor_id",
      "intentEn":"what the speaker needs from the player",
      "mustConveyEn":["facts the line may communicate"],
      "emotionalSubtextEn":"private delivery subtext",
      "maxWords":80
    }
  ]
}

${CANON_WIT_TONE_CONTRACT}`,
        },
        {
            role: 'user',
            content: JSON.stringify({
                character: state.character,
                campaign: state.campaign,
                committedOpeningPackage: state.opening.package,
                currentScene: state.scene,
                presentActors: state.actors,
                actorProfiles: state.actorLibrary,
                conflict: state.conflict,
            }),
        },
    ];
}

function composeSceneSegments(segments, actorLibrary, language = 'en') {
    const actors = new Map((actorLibrary || []).map(actor => [actor.id, actor]));
    return (segments || []).map(segment => {
        const text = language === 'zh' && segment.textZh ? segment.textZh : segment.textEn;
        if (segment.type !== 'dialogue') {
            return text;
        }
        const actor = actors.get(segment.actorId);
        const name = language === 'zh'
            ? actor?.name || actor?.display?.name || actor?.nameEn || segment.actorId
            : actor?.nameEn || actor?.name || segment.actorId;
        return `${name}: “${text}”`;
    }).join('\n\n');
}

async function localizeSceneSegments(segments) {
    if (!getSettings().translationEnabled) {
        return segments;
    }
    const translated = await translateOpeningValues(segments.map(segment => segment.textEn));
    return segments.map((segment, index) => ({
        ...segment,
        textZh: translated[index],
    }));
}

async function appendOpeningNarrative(segments, state) {
    const context = getContext();
    const sourceEn = composeSceneSegments(segments, state.actorLibrary, 'en');
    const translatedZh = composeSceneSegments(segments, state.actorLibrary, 'zh');
    const message = {
        name: 'Scene',
        is_user: false,
        is_system: false,
        send_date: new Date().toISOString(),
        mes: sourceEn,
        extra: {
            hogwartsMud: {
                sourceEn,
                role: 'opening_narrative',
                sceneId: state.scene?.id,
                segments,
                ...(translatedZh !== sourceEn ? {
                    translatedZh,
                    provider:
                        getSettings()
                            .translationProvider,
                    translatedAt: Date.now(),
                    translationVersion: TRANSLATION_FORMAT_VERSION,
                } : {}),
            },
            ...(translatedZh !== sourceEn ? { display_text: translatedZh } : {}),
        },
    };
    context.chat.push(message);
    await context.saveChat();
    scheduleRender();
}

function hasOpeningNarrative() {
    return getContext().chat.some(message =>
        message.extra?.hogwartsMud?.role === 'opening_narrative',
    );
}

function extractRoleResponseText(response) {
    if (response?.content && typeof response.content === 'object') {
        return response.content;
    }
    const candidates = [
        String(response?.content || '').trim(),
        String(response?.reasoning || '').trim(),
    ].filter(Boolean);
    for (const candidate of [
        ...candidates,
        candidates.join('\n'),
    ]) {
        try {
            return parseCompleteJsonObject(
                candidate,
            );
        } catch {
            // Continue until a complete JSON object is found.
        }
    }
    return candidates[0] || '';
}

async function generateOpeningPackage(highSlot, state) {
    let response = await sendRoleRequest(
        highSlot,
        createOpeningDirectorPrompt(state),
        { json: true },
    );
    let raw = extractRoleResponseText(response);
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const opening = parseJsonObject(raw);
            const validation = validateOpeningWorldPackage(opening, state.character, state.campaign);
            if (!validation.valid) {
                throw new Error(validation.errors.join('；'));
            }
            return opening;
        } catch (error) {
            lastError = error;
            if (attempt > 0) {
                break;
            }
            response = await sendRoleRequest(highSlot, [
                {
                    role: 'system',
                    content: 'Repair an invalid opening-world JSON package. Return exactly one complete JSON object with no Markdown and no commentary. Preserve usable facts, fill missing required fields, close all arrays and objects, keep the campaign year unchanged, and ensure every map exit references an existing room.',
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        validationError: String(error?.message || error),
                        invalidOutput: typeof raw === 'string' ? raw : JSON.stringify(raw),
                        requiredSchema: createOpeningDirectorPrompt(state)[0].content,
                    }),
                },
            ], { json: true });
            raw = extractRoleResponseText(response);
        }
    }
    const preview = String(typeof raw === 'string' ? raw : JSON.stringify(raw) || '')
        .replace(/\s+/g, ' ')
        .slice(0, 280);
    throw new Error(
        `世界导演连续两次未返回合法开场包：${String(lastError?.message || lastError)}。` +
        `响应摘要：${preview || '[空响应]'}`,
    );
}

async function initializeOpeningWorld() {
    if (openingInitializationPromise) {
        return openingInitializationPromise;
    }
    openingInitializationPromise = (async () => {
        const context = getContext();
        let state = getMudState();
        if (!state?.character?.confirmed) {
            return;
        }
        const slots = resolveRoleSlots(state.modelSlots);
        const highSlot = slots.high;
        if (!highSlot.profileId) {
            throw new Error('世界导演没有可用的 Connection Profile。');
        }
        state.opening ??= { status: 'pending', attempt: 0, error: '', package: null, committedAt: null };
        state.phase = state.opening.package ? 'opening_narration' : 'initializing';
        state.opening.status = state.opening.package ? 'narrating' : 'directing';
        state.opening.attempt = Number(state.opening.attempt || 0) + 1;
        state.opening.error = '';
        if (!state.opening.package) {
            state.chapter = '正在编排首幕';
            state.clock = `${state.campaign.startYear} · 时间待定`;
            state.location = '世界建档中';
        }
        await context.saveMetadata();
        renderAll();

        try {
            if (!state.opening.package) {
                const opening = await generateOpeningPackage(highSlot, state);
                let localized = opening;
                try {
                    localized = await localizeOpeningPackage(opening);
                    const localizedFoundation = await localizeDirectorFoundation({
                        actorLibrary: opening.actorLibrary,
                        storyArc: opening.storyArc,
                    });
                    localized.actorLibrary = localizedFoundation.actorLibrary;
                    localized.storyArc = localizedFoundation.storyArc;
                } catch (translationError) {
                    console.warn('[Hogwarts MUD] Opening state translation failed; using English labels', translationError);
                }
                context.chatMetadata.hogwartsMud = applyOpeningWorldPackage(state, localized);
                state = getMudState();
                await context.saveMetadata();
                applySystemPrompt();
                renderAll();
            }

            if (!hasOpeningNarrative()) {
                const sceneSlot = slots.medium;
                if (!sceneSlot?.profileId) {
                    throw new Error('首幕场景编排至少需要中档 Connection Profile。');
                }
                const response = await sendRoleRequest(
                    sceneSlot,
                    createOpeningScenePlanPrompt(state),
                    { json: true },
                );
                const plan = parseJsonObject(extractRoleResponseText(response));
                const validation = validateOpeningScenePlan(plan, state);
                if (!validation.valid) {
                    throw new Error(`首幕场景计划无效：${validation.errors.join('；')}`);
                }
                const lines = await generatePlannedDialogueLines(
                    slots.low,
                    state,
                    plan.dialogueBeats || [],
                );
                const segments = mergeOpeningScenePlan(plan, lines);
                const localizedSegments = await localizeSceneSegments(segments);
                await appendOpeningNarrative(localizedSegments, state);
            }

            state = getMudState();
            state.phase = 'playing';
            state.opening.status = 'ready';
            state.opening.error = '';
            state.opening.narratedAt = new Date().toISOString();
            await context.saveMetadata();
            await applyNativeRoleSettings(slots.low);
            await syncLocalKnowledge();
            applySystemPrompt();
            renderAll();
            toastr.success('首幕已经编排完成。现在轮到你行动。');
        } catch (error) {
            state = getMudState();
            state.phase = 'initialization_failed';
            state.opening ??= {};
            state.opening.status = 'failed';
            state.opening.error = String(error?.cause?.message || error?.message || error);
            await context.saveMetadata();
            renderAll();
            throw error;
        }
    })().finally(() => {
        openingInitializationPromise = null;
    });
    return openingInitializationPromise;
}

async function startGameFromSetup() {
    const wasStarted = isGameStarted();
    const character = collectCharacterDraft();
    const slots = collectModelSlots();
    const errors = validateCharacterDraft(character);
    if (!slots.low.profileId) {
        errors.push('请选择低档“现场表演者”Connection Profile。');
    }
    if (!root.querySelector('#hpmud_confirm_facts').checked) {
        errors.push('请确认人物卡事实。');
    }
    const errorElement = root.querySelector('#hpmud_setup_errors');
    errorElement.replaceChildren(...errors.map(error => Object.assign(document.createElement('p'), { textContent: error })));
    if (errors.length) {
        showSetupStep('review');
        return;
    }

    const settings = getSettings();
    const campaign = normalizeCampaign(wasStarted
        ? getMudState().campaign
        : settings.campaignDraft);
    settings.setupDraft = structuredClone(character);
    settings.modelSlots = structuredClone(slots);
    await applyNativeRoleSettings(slots.low);

    const context = getContext();
    if (wasStarted) {
        context.chatMetadata.hogwartsMud.character = {
            ...structuredClone(character),
            confirmed: true,
        };
        context.chatMetadata.hogwartsMud.modelSlots = structuredClone(slots);
    } else {
        context.chatMetadata.hogwartsMud = createInitialWorldState(character, slots, campaign);
    }
    saveSettingsDebounced();
    await context.saveMetadata();
    applySystemPrompt();
    setAppScreen('game');
    if (wasStarted && getMudState().opening?.status === 'ready') {
        toastr.success('人物卡与模型配置已保存。');
        return;
    }
    toastr.info('人物卡已确认。世界导演正在编排你的首幕。');
    await initializeOpeningWorld();
}

function applySystemPrompt() {
    const settings = getSettings();
    if (!settings.enabled) {
        setExtensionPrompt(PROMPT_KEY, '', extension_prompt_types.NONE, 0);
        return;
    }
    const state = getContext().chatMetadata?.hogwartsMud;
    const characterContext = buildCharacterContext(state?.character);
    const campaignContext = characterContext ? buildCampaignContext(state?.campaign) : '';
    const mandatorySceneState = state?.scene
        ? buildMandatorySceneState(state)
        : null;
    const mapContext = mandatorySceneState
        ? `\n\nCURRENT AUTHORITATIVE POSITION:
${JSON.stringify(mandatorySceneState.playerPosition)}

Detailed topology is supplied only to role requests that need it. Never invent or rename a map or room.`
        : '';
    const sceneContext = state?.scene ? `CURRENT COMMITTED SCENE (binding JSON):
${JSON.stringify(mandatorySceneState)}

Continue from this exact state. Perform present NPCs using the supplied personality, speech style, private goal, fear, and knowledge boundary. behavioralEnvironment is binding current context: embody materially relevant time, daylight, fatigue, curfew, weather, clothing, shelter, and activity effects without reciting it as a checklist. Current scene, location, and environment override stale daily directives. Detailed memories, map topology, hidden arcs, and locked clues are supplied only to role requests authorized to use them. Never invent or disclose absent private state. The SillyTavern storage character is infrastructure and never exists inside the story.` : '';
    setExtensionPrompt(
        PROMPT_KEY,
        `${buildSystemPrompt(settings.worldPrompt)}${campaignContext ? `\n\n${campaignContext}` : ''}${characterContext ? `\n\n${characterContext}` : ''}${mapContext}${sceneContext ? `\n\n${sceneContext}` : ''}`,
        extension_prompt_types.IN_PROMPT,
        0,
        false,
        extension_prompt_roles.SYSTEM,
    );
}

function setUiVisible(visible) {
    getSettings().uiEnabled = visible;
    root.hidden = !visible;
    if (launcher) {
        launcher.hidden = visible;
    }
    document.body.classList.toggle('hpmud-mode', visible);
    saveSettingsDebounced();
    if (visible) {
        setAppScreen('home');
    }
}

function addLauncherButton() {
    launcher = document.querySelector('#hpmud_launcher');
    if (launcher) {
        return;
    }
    launcher = document.createElement('button');
    launcher.id = 'hpmud_launcher';
    launcher.type = 'button';
    launcher.className = 'hpmud-launcher';
    launcher.setAttribute('aria-label', '打开 Hogwarts MUD');
    launcher.innerHTML = '<i class="fa-solid fa-hat-wizard"></i><span>Hogwarts MUD</span>';
    launcher.addEventListener('click', () => setUiVisible(true));
    document.body.append(launcher);
}

function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderAll, 40);
}

const LIVE_STREAM_PHASE_LABELS = Object.freeze({
    connecting: '正在铺开羊皮纸',
    receiving: '英文原稿实时书写',
    repairing: '结构校对后重新落笔',
    translating: '原稿完成，正在译入中文',
    committing: '正在装订现场记录',
});

function beginLiveSceneStream(checkResolution = null) {
    liveSceneStream = {
        phase: 'connecting',
        rawLength: 0,
        segments: [],
        checkResolution: checkResolution
            ? structuredClone(checkResolution)
            : null,
        startedAt: Date.now(),
    };
    scheduleRender();
}

function updateLiveSceneStream(
    rawText,
    phase = 'receiving',
) {
    liveSceneStream ??= {
        phase,
        rawLength: 0,
        segments: [],
        startedAt: Date.now(),
    };
    liveSceneStream.phase = phase;
    liveSceneStream.rawLength = String(rawText || '').length;
    liveSceneStream.segments =
        extractStreamingSceneSegments(rawText);
    scheduleRender();
}

function setLiveSceneStreamPhase(phase, segments = null) {
    if (!liveSceneStream) {
        beginLiveSceneStream();
    }
    liveSceneStream.phase = phase;
    if (Array.isArray(segments)) {
        liveSceneStream.segments = structuredClone(segments);
    }
    scheduleRender();
}

function initials(name) {
    return String(name || '?')
        .split(/\s+/)
        .map(part => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function getWorldState() {
    const context = getContext();
    const state = context.chatMetadata?.hogwartsMud ?? {};
    return {
        phase: state.phase || 'initializing',
        location: state.location || '世界建档中',
        chapter: state.chapter || '正在编排首幕',
        clock: state.clock || `${state.campaign?.startYear || 1991} · 时间待定`,
        character: state.character || null,
        campaign: state.campaign || null,
        modelSlots: state.modelSlots || getSettings().modelSlots,
        map: state.map || {},
        scene: state.scene || null,
        actors: Array.isArray(state.actors) ? state.actors : [],
        actorLibrary: Array.isArray(state.actorLibrary) ? state.actorLibrary : [],
        ...(
            Object.prototype
                .hasOwnProperty.call(
                    state,
                    'activeInteractionActorIds',
                )
                ? {
                    activeInteractionActorIds:
                        state
                            .activeInteractionActorIds,
                }
                : {}
        ),
        localPresence:
            state.localPresence || null,
        cohorts: Array.isArray(state.cohorts)
            ? state.cohorts
            : [],
        actorPresentations:
            state.actorPresentations &&
            typeof state.actorPresentations ===
                'object'
                ? state.actorPresentations
                : {},
        storyArcs: Array.isArray(state.storyArcs) ? state.storyArcs : [],
        conflict: state.conflict || null,
        agenda: Array.isArray(state.agenda) ? state.agenda : [],
        timeline: Array.isArray(state.timeline) ? state.timeline : [],
        turn: state.turn || null,
        dailyDirector: state.dailyDirector || null,
        pacingDirector: state.pacingDirector || null,
        causalCollapse:
            state.causalCollapse ||
            null,
        memoryDirector: state.memoryDirector || null,
        socialGraph:
            normalizeSocialGraph(
                state.socialGraph,
            ),
        sceneArchive: Array.isArray(state.sceneArchive) ? state.sceneArchive : [],
        sceneTransition: state.sceneTransition || null,
        spatial: state.spatial || null,
        knowledgeBase: state.knowledgeBase || null,
        directorFoundation: state.directorFoundation || null,
        opening: state.opening || null,
        clues: Array.isArray(state.clues) ? state.clues : [],
        items: Array.isArray(state.items) ? state.items : [],
        spellbook:
            state.spellbook ||
            {
                known: [],
            },
        status: Array.isArray(state.status) ? state.status : [],
    };
}

function getRoomName(state, mapId, roomId) {
    const map = getLocalMapDefinition(mapId, state.map);
    const room = [
        ...(map?.nodes || []),
        ...(state.map?.generatedLocalNodes || [])
            .filter(item => item.mapId === mapId),
    ].find(item => item.id === roomId);
    return room?.name || room?.nameEn || roomId || '位置未知';
}

function getPeopleDisplay(state, person) {
    const { actor, profile } = person;
    const displayName =
        profile?.name ||
        actor?.name ||
        profile?.nameEn ||
        actor?.nameEn ||
        person.id;
    const roomName = getRoomName(
        state,
        actor?.mapId ||
            state.map.activeMapId,
        actor?.roomId ||
            state.map
                .currentLocalNodeId,
    );
    return {
        displayName,
        detail: [
            roomName,
            actor?.currentActivity ||
                actor?.role ||
                profile?.role,
        ].filter(Boolean).join(' · '),
        intent: actor?.currentIntent || '',
    };
}

function renderHeaderAndScene() {
    const context = getContext();
    const state = getWorldState();
    const playerName = state.character?.identity?.name || context.name1 || 'Player';

    root.querySelector('#hpmud_location').textContent = state.location;
    root.querySelector('#hpmud_chapter').textContent = state.chapter;
    root.querySelector('#hpmud_clock').textContent = state.clock;
    root.querySelector('#hpmud_character').textContent = initials(playerName);

    const people = root.querySelector('#hpmud_people');
    people.replaceChildren();
    const peopleProjection =
        projectPeoplePanel(state);
    if (!peopleProjection.activePeople.length) {
        const status = document.createElement('div');
        status.className = 'hpmud-people-pending';
        status.textContent =
            state.phase ===
                'initialization_failed'
                ? '首幕编排失败'
                : state.phase === 'playing'
                    ? '当前没有互动人物'
                    : '世界导演正在确认人物…';
        people.append(status);
    } else {
        peopleProjection
            .activePeople
            .forEach(personData => {
                const {
                    displayName,
                    detail,
                    intent,
                } = getPeopleDisplay(
                    state,
                    personData,
                );
                const person =
                    document.createElement(
                        'button',
                    );
                person.type = 'button';
                person.className =
                    `hpmud-person${
                        selectedActorId ===
                        personData.id
                            ? ' active'
                            : ''
                    }`;
                person.dataset.actorId =
                    personData.id;
                person.setAttribute(
                    'aria-pressed',
                    String(
                        selectedActorId ===
                        personData.id,
                    ),
                );
                person.innerHTML = `
                    <span class="hpmud-person-avatar">${initials(displayName)}</span>
                    <span><strong></strong><small></small></span>
                `;
                person.querySelector(
                    'strong',
                ).textContent =
                    displayName;
                person.querySelector(
                    'small',
                ).textContent = detail;
                person.title = intent;
                person.addEventListener(
                    'click',
                    () => {
                        selectedActorId =
                            personData.id;
                        renderHeaderAndScene();
                        renderInspector(
                            'actor',
                        );
                    },
                );
                people.append(person);
            });
    }
    root.querySelector(
        '#hpmud_people_count',
    ).textContent = String(
        peopleProjection
            .activePeople.length,
    );
    const localPeople = root.querySelector(
        '#hpmud_local_people',
    );
    const localCohorts = root.querySelector(
        '#hpmud_local_cohorts',
    );
    localPeople.replaceChildren();
    localCohorts.replaceChildren();
    peopleProjection.localPeople.forEach(
        personData => {
            const {
                displayName,
                detail,
            } = getPeopleDisplay(
                state,
                personData,
            );
            const person =
                document.createElement(
                    'div',
                );
            person.className =
                'hpmud-local-person';
            person.innerHTML = `
                <span class="hpmud-local-person-mark" aria-hidden="true"></span>
                <span><strong></strong><small></small></span>
            `;
            person.querySelector(
                'strong',
            ).textContent = displayName;
            person.querySelector(
                'small',
            ).textContent = detail;
            localPeople.append(person);
        },
    );
    peopleProjection.cohorts.forEach(
        cohort => {
            const summary =
                document.createElement('p');
            summary.textContent =
                `另有 ${cohort.label} 成员若干`;
            localCohorts.append(summary);
        },
    );
    if (
        !peopleProjection.localPeople
            .length &&
        !peopleProjection.cohorts.length
    ) {
        const empty =
            document.createElement('p');
        empty.className =
            'hpmud-local-people-empty';
        empty.textContent =
            peopleProjection
                .localPresenceValid
                ? '暂无其他已确认人物'
                : '地点人物尚未确认';
        localCohorts.append(empty);
    }
    root.querySelector(
        '#hpmud_local_people_count',
    ).textContent = String(
        peopleProjection
            .localPeople.length,
    );
    if (composerInput) {
        renderComposerAddressing();
    }
    const agenda = root.querySelector('#hpmud_agenda');
    agenda.replaceChildren();
    const entries = state.scene?.timelineEntries?.length
        ? state.scene.timelineEntries.slice(-4)
        : [{
            clock: state.clock,
            label: state.phase === 'playing' ? state.scene?.summary || '当前场景' : '世界导演编排首幕',
        }];
    agenda.setAttribute(
        'aria-label',
        `当前场景现场记录：${entries
            .map(entry => `${entry.clock || ''} ${entry.label || ''}`)
            .join('；')}`,
    );
    entries.forEach(entry => {
        const row = document.createElement('span');
        const time = document.createElement('time');
        time.textContent = entry.timeLabel || String(entry.clock || '').split(' · ').at(-1) || '现在';
        row.append(time, document.createTextNode(` ${entry.label || ''}`));
        agenda.append(row);
    });
    renderSceneArchiveList(state);
    renderMiniMap(state);
}

function renderSceneArchiveList(state) {
    const list = root.querySelector('#hpmud_scene_archive_list');
    const archive = state.sceneArchive || [];
    const current = root.querySelector('#hpmud_current_scene_card');
    root.querySelector('#hpmud_scene_archive_count').textContent = String(archive.length);
    current.replaceChildren();
    const currentLabel = document.createElement('small');
    const currentTitle = document.createElement('strong');
    const currentMeta = document.createElement('span');
    currentLabel.textContent = 'CURRENT SCENE';
    currentTitle.textContent = state.scene?.name ||
        state.scene?.nameEn ||
        '当前场景';
    currentMeta.textContent = [
        String(state.scene?.startedClock || state.clock || '')
            .split(' · ')
            .at(-1),
        state.location,
    ].filter(Boolean).join(' · ');
    current.append(currentLabel, currentTitle, currentMeta);
    list.replaceChildren();
    if (!archive.length) {
        const empty = document.createElement('div');
        empty.className = 'hpmud-scene-archive-empty';
        empty.textContent = '首个场景结束后会在这里生成只读档案。';
        list.append(empty);
        return;
    }
    const visibleArchive = [...archive]
        .reverse()
        .slice(0, archiveListLimit);
    visibleArchive.forEach(scene => {
        const button = document.createElement('button');
        button.type = 'button';
        const marker = document.createElement('i');
        const content = document.createElement('span');
        const title = document.createElement('strong');
        const meta = document.createElement('small');
        title.textContent = scene.name || scene.nameEn || '未命名场景';
        meta.textContent = [
            String(scene.endedClock || '').split(' · ').at(-1),
            scene.location,
        ].filter(Boolean).join(' · ');
        content.append(title, meta);
        button.append(marker, content);
        button.addEventListener('click', () => openSceneArchive(scene.id));
        list.append(button);
    });
    if (visibleArchive.length < archive.length) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'hpmud-archive-more';
        more.textContent = `加载更早场景 · 还剩 ${archive.length - visibleArchive.length}`;
        more.addEventListener('click', () => {
            archiveListLimit += ARCHIVE_LIST_PAGE_SIZE;
            renderSceneArchiveList(state);
        });
        list.append(more);
    }
}

function renderSceneArchiveTranscript(scene, preserveScrollAnchor = false) {
    const transcript = root.querySelector('#hpmud_archive_transcript');
    const scroll = transcript.closest('.hpmud-dialog-scroll');
    const previousHeight = scroll?.scrollHeight || 0;
    transcript.replaceChildren();
    const context = getContext();
    const messageIds = scene.messageIds || [];
    const visibleIds = messageIds.slice(-archiveTranscriptLimit);
    if (visibleIds.length < messageIds.length) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'hpmud-load-earlier';
        more.textContent =
            `↑ 向上加载更早记录 · 还剩 ${messageIds.length - visibleIds.length}`;
        more.addEventListener('click', () => {
            archiveTranscriptLimit += ARCHIVE_TRANSCRIPT_PAGE_SIZE;
            renderSceneArchiveTranscript(scene, true);
        });
        transcript.append(more);
    }
    visibleIds.forEach(messageId => {
        const message = context.chat[messageId];
        if (message) {
            transcript.append(renderMessage(message, messageId));
        }
    });
    const quillCard = renderAuthorQuillCard(
        {
            authorQuill: scene.authorQuill,
            authorQuillEn: scene.authorQuillEn,
        },
        {
            mes:
                scene.authorQuillEn ||
                scene.authorQuill ||
                '',
        },
    );
    if (quillCard) {
        quillCard.classList.add('is-archive');
        transcript.append(quillCard);
    }
    if (!transcript.childElementCount) {
        const empty = document.createElement('div');
        empty.className = 'hpmud-scene-archive-empty';
        empty.textContent = scene.closureSummary || scene.summary ||
            '该场景没有可显示的现场转录。';
        transcript.append(empty);
    }
    if (preserveScrollAnchor && scroll) {
        scroll.scrollTop += scroll.scrollHeight - previousHeight;
    }
}

function openSceneArchive(sceneId) {
    const state = getWorldState();
    const scene = state.sceneArchive.find(item => item.id === sceneId);
    if (!scene) {
        toastr.warning('该场景档案不存在或尚未完成封存。');
        return;
    }
    archiveTranscriptLimit = ARCHIVE_TRANSCRIPT_PAGE_SIZE;
    root.querySelector('#hpmud_archive_title').textContent =
        scene.name || scene.nameEn || '场景档案';
    const meta = root.querySelector('#hpmud_archive_meta');
    meta.replaceChildren();
    [
        ['时间', `${scene.startedClock || '未知'} → ${scene.endedClock || '未知'}`],
        ['地点', scene.location || scene.roomId || '未知地点'],
        ['结算', scene.tier === 'high' ? '高档重大转折' : '中档普通切场'],
    ].forEach(([label, detail]) => {
        const card = document.createElement('div');
        const strong = document.createElement('strong');
        const small = document.createElement('small');
        strong.textContent = label;
        small.textContent = detail;
        card.append(strong, small);
        meta.append(card);
    });
    const timeline = root.querySelector('#hpmud_archive_timeline');
    timeline.replaceChildren();
    const timelineEntries = scene.timelineEntries || [];
    timeline.setAttribute(
        'aria-label',
        `已封存现场记录：${timelineEntries
            .map(entry => `${entry.clock || ''} ${entry.label || ''}`)
            .join('；')}`,
    );
    timelineEntries.forEach(entry => {
        const row = document.createElement('span');
        const time = document.createElement('time');
        time.textContent = entry.timeLabel ||
            String(entry.clock || '').split(' · ').at(-1) ||
            '未知';
        row.append(
            time,
            document.createTextNode(` ${entry.label || ''}`),
        );
        timeline.append(row);
    });
    renderSceneArchiveTranscript(scene);
    sceneArchiveDialog.showModal();
}

function updateSceneDestinationStatus() {
    const state = getMudState();
    const input = root.querySelector('#hpmud_transition_destination');
    const status = root.querySelector('#hpmud_transition_destination_status');
    const intent = state?.scene?.nextSceneIntent;
    const usesDefault = input.value.trim() ===
        String(input.dataset.defaultValue || '').trim();
    const destination = usesDefault && intent
        ? {
            mapId: intent.mapId,
            roomId: intent.roomId,
            roomName: getRoomName(
                state,
                intent.mapId,
                intent.roomId,
            ),
        }
        : findSceneDestination(input.value, state);
    status.textContent = destination
        ? `${usesDefault ? '导演预排' : '用户覆盖'} · ${destination.roomName || destination.roomId} (${destination.roomId})`
        : '用户覆盖未匹配固定房间；结算时导演会在现有地图中选择最合适的位置。';
}

function formatNextSceneIntent(intent) {
    return [
        intent?.title || intent?.titleEn,
        intent?.summary || intent?.summaryEn,
    ].filter(Boolean).join('：');
}

function openSceneTransitionDialog() {
    const state = getWorldState();
    if (state.phase !== 'playing' || !state.scene) {
        toastr.warning('当前没有可以封存的活动场景。');
        return;
    }
    if (sceneTransitionActive || turnSettlementActive) {
        toastr.warning('世界状态仍在结算，请稍候。');
        return;
    }
    const intent = validateNextSceneIntent(
        state.scene.nextSceneIntent,
        state,
    ).valid
        ? state.scene.nextSceneIntent
        : createFallbackNextSceneIntent(state);
    root.querySelector('#hpmud_transition_scene_name').textContent =
        state.scene.name || state.scene.nameEn || '当前场景';
    root.querySelector('#hpmud_transition_scene_meta').textContent =
        `${state.clock} · ${state.location}`;
    const input = root.querySelector('#hpmud_transition_destination');
    input.dataset.defaultValue = formatNextSceneIntent(intent);
    input.value = state.sceneTransition?.status === 'failed' &&
        state.sceneTransition.destinationHint
        ? state.sceneTransition.destinationHint
        : input.dataset.defaultValue;
    const selectedTier = state.sceneTransition?.status === 'failed'
        ? state.sceneTransition.tier
        : intent.tier;
    root.querySelector(
        `input[name="scene_transition_tier"][value="${selectedTier}"]`,
    ).checked = true;
    updateSceneDestinationStatus();
    sceneTransitionDialog.showModal();
}

function renderMiniMap(state) {
    const container = root.querySelector('#hpmud_map_mini');
    const localMapId = resolveLocalMapId(state.map, state.location);
    if (!localMapId && state.phase !== 'playing') {
        container.replaceChildren();
        const pending = document.createElement('div');
        pending.className = 'hpmud-map-pending';
        pending.innerHTML = '<span>⌁</span><strong>家庭场景生成中</strong><small>房间与出口将在规则校验后固化</small>';
        container.append(pending);
        return;
    }
    if (localMapId) {
        renderLocalMap(container, localMapId, state.map, {
            compact: true,
            levelId: state.map?.currentLevelId,
            positions: getMapPositionMarkers(state, localMapId),
        });
    } else {
        renderWorldMap(container, state.map, {
            compact: true,
            currentLocation: state.location,
        });
    }
    const caption = document.createElement('span');
    caption.className = 'hpmud-map-caption';
    const localMap = getLocalMapDefinition(localMapId, state.map);
    const localLevel = localMap?.levels.find(level => level.id === state.map?.currentLevelId);
    caption.textContent = localMap
        ? `${localMap.name}${localLevel ? ` · ${localLevel.name}` : ''}`
        : state.location;
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', '展开世界地图');
    button.textContent = '↗';
    button.addEventListener('click', () => renderInspector('map'));
    container.append(caption, button);
}

function formatMessageText(message, text) {
    const context = getContext();
    return context.messageFormatting(
        String(text ?? ''),
        message.name || '',
        Boolean(message.is_system),
        Boolean(message.is_user),
        -1,
        {},
        false,
    );
}

function renderCheckCard(check, { live = false } = {}) {
    const card = document.createElement('section');
    card.className =
        `hpmud-check-card outcome-${check.outcome}` +
        (live ? ' is-live' : '');
    const modifier = Number(check.modifiers?.total || 0);
    const modifierText = modifier >= 0
        ? `+${modifier}`
        : String(modifier);
    const rolls = (check.rolls || []).join(' / ');
    const targetText = check.target?.name
        ? `对抗 ${check.target.name} · 难度隐藏`
        : '环境难度隐藏';
    const spellText =
        check.spell
            ? [
                check.spell
                    .incantation,
                check.spell
                    .known
                    ? `熟练修正 ${
                        Number(
                            check
                                .modifiers
                                ?.proficiency ||
                            0,
                        ) >=
                            0
                            ? '+'
                            : ''
                    }${Number(
                        check
                            .modifiers
                            ?.proficiency ||
                        0,
                    )}`
                    : '未学咒语 · 实验难度',
            ].join(' · ')
            : '';
    card.innerHTML = `
        <div class="hpmud-check-die">
            <small>D20</small>
            <strong></strong>
        </div>
        <div class="hpmud-check-copy">
            <small></small>
            <strong></strong>
            <span></span>
        </div>
        <div class="hpmud-check-total">
            <small></small>
            <strong></strong>
        </div>
    `;
    card.querySelector('.hpmud-check-die strong')
        .textContent = String(check.keptRoll);
    card.querySelector('.hpmud-check-copy small')
        .textContent = [
            live ? 'RULES RESOLVED · 续写中' : 'D20 CHECK · 本地判定',
            check.rollMode === 'advantage'
                ? '优势'
                : check.rollMode === 'disadvantage'
                    ? '劣势'
                    : '',
        ].filter(Boolean).join(' · ');
    card.querySelector('.hpmud-check-copy strong')
        .textContent = `${check.label} · ${check.outcomeLabel}`;
    card.querySelector('.hpmud-check-copy span')
        .textContent = [
            spellText,
            `${check.attributeLabel} ${rolls} ${modifierText} = ${check.total}`,
            targetText,
        ].filter(Boolean).join(' · ');
    card.querySelector('.hpmud-check-total small')
        .textContent = '总值';
    card.querySelector('.hpmud-check-total strong')
        .textContent = String(check.total);
    return card;
}

function renderAuthorQuillCard(
    {
        authorQuill,
        authorQuillEn,
    },
    message = {},
) {
    const english = String(authorQuillEn || '').trim();
    const translated = String(
        authorQuill || english,
    ).trim();
    if (!english && !translated) return null;

    const card = document.createElement('section');
    card.className = 'hpmud-author-quill';
    card.innerHTML = `
        <header>
            <span class="hpmud-quill-mark"><i></i></span>
            <span>
                <small>OUT OF CHARACTER · CHAPTER NOTES</small>
                <strong>作者的羽毛笔</strong>
            </span>
            <b>本章批注</b>
        </header>
        <p class="hpmud-quill-disclaimer">不计入角色认知 · 不含剧透 · 编辑部拒绝承担玩家策略造成的家具损失</p>
        <div class="hpmud-quill-copy"></div>
    `;
    const copy = card.querySelector(
        '.hpmud-quill-copy',
    );
    const localized = document.createElement('div');
    localized.className = 'hpmud-translation';
    localized.innerHTML = formatMessageText(
        message,
        translated,
    );
    copy.append(localized);
    if (english && translated !== english) {
        const original = document.createElement('div');
        original.className = 'hpmud-original';
        original.innerHTML = formatMessageText(
            message,
            english,
        );
        copy.append(original);
    }
    return card;
}

function getTranslationProviderLabel(
    provider,
) {
    return {
        local: '本地 4B',
        google: 'Google',
        bing: 'Bing',
        off: '不开',
    }[
        normalizeTranslationProvider(
            provider,
        )
    ];
}

function createMessageTranslationControl(
    article,
    message,
    messageId,
) {
    const translation =
        message.extra
            ?.hogwartsMud ||
        {};
    const details =
        document.createElement(
            'details',
        );
    details.className =
        'hpmud-message-translation hpmud-scene-language';
    const summary =
        document.createElement(
            'summary',
        );
    summary.textContent = 'EN';
    summary.title =
        '切换语言或重新翻译';

    const menu =
        document.createElement(
            'div',
        );
    menu.className =
        'hpmud-message-translation-menu';
    const status =
        document.createElement(
            'div',
        );
    status.className =
        'hpmud-message-translation-status';
    status.textContent =
        `当前：${getTranslationProviderLabel(
            translation.provider ||
            getSettings()
                .translationProvider,
        )}` +
        (
            translation
                .translationVersion
                ? ` · v${translation.translationVersion}`
                : ''
        );

    const chinese =
        document.createElement(
            'button',
        );
    chinese.type = 'button';
    chinese.textContent =
        '显示中文译文';
    chinese.setAttribute(
        'aria-checked',
        'true',
    );
    const english =
        document.createElement(
            'button',
        );
    english.type = 'button';
    english.textContent =
        '显示英文原文';
    english.setAttribute(
        'aria-checked',
        'false',
    );
    const setOriginal =
        showOriginal => {
            article.classList.toggle(
                'show-original',
                showOriginal,
            );
            chinese.setAttribute(
                'aria-checked',
                String(
                    !showOriginal,
                ),
            );
            english.setAttribute(
                'aria-checked',
                String(
                    showOriginal,
                ),
            );
            summary.textContent =
                showOriginal
                    ? '中'
                    : 'EN';
            details.open = false;
        };
    chinese.addEventListener(
        'click',
        () => setOriginal(false),
    );
    english.addEventListener(
        'click',
        () => setOriginal(true),
    );

    const retranslate =
        document.createElement(
            'button',
        );
    retranslate.type = 'button';
    retranslate.textContent =
        `重新翻译 · ${getTranslationProviderLabel(
            getSettings()
                .translationProvider,
        )}`;
    retranslate.disabled =
        Number(messageId) < 0;
    retranslate.addEventListener(
        'click',
        async () => {
            retranslate.disabled =
                true;
            status.textContent =
                '正在重新翻译…';
            await translateMessage(
                Number(messageId),
                {
                    force: true,
                },
            );
            if (
                status
                    .isConnected
            ) {
                status.textContent =
                    '已重新翻译';
                retranslate.disabled =
                    false;
                setOriginal(false);
            }
        },
    );
    menu.append(
        status,
        chinese,
        english,
        retranslate,
    );
    details.append(
        summary,
        menu,
    );
    return details;
}

function renderSegmentedMessage(message, messageId, segments) {
    const state = getWorldState();
    const actorLibrary = new Map([
        ...(state.actorLibrary || []),
        ...(state.actors || []),
    ].map(actor => [
        actor.id,
        actor,
    ]));
    const article = document.createElement('article');
    article.className = 'hpmud-scene-turn';
    article.dataset.messageId = String(messageId);
    const authorQuill =
        message.extra?.hogwartsMud?.authorQuill;
    const authorQuillEn =
        message.extra?.hogwartsMud?.authorQuillEn;
    const hasTranslation =
        segments.some(segment => segment.textZh) ||
        Boolean(
            authorQuill &&
            authorQuillEn &&
            authorQuill !== authorQuillEn,
        );
    const check = message.extra?.hogwartsMud
        ?.turnTransaction?.checkResolution;
    if (check) {
        article.append(renderCheckCard(check));
    }

    if (hasTranslation) {
        article.append(
            createMessageTranslationControl(
                article,
                message,
                messageId,
            ),
        );
    }

    const quillCard = renderAuthorQuillCard(
        {
            authorQuill,
            authorQuillEn,
        },
        message,
    );
    if (quillCard) {
        article.append(quillCard);
    }

    segments.forEach(segment => {
        const block = document.createElement(segment.type === 'dialogue' ? 'section' : 'div');
        block.className = `hpmud-scene-segment ${segment.type}`;
        if (segment.type === 'dialogue') {
            const actor = actorLibrary.get(segment.actorId);
            const displayName =
                actor?.name ||
                actor?.display?.name ||
                actor?.nameEn ||
                segment.actorId;
            const header = document.createElement('header');
            header.innerHTML = `
                <span class="hpmud-turn-avatar">${initials(displayName)}</span>
                <span class="hpmud-turn-name"><strong></strong><small></small></span>
            `;
            header.querySelector('strong').textContent = displayName;
            header.querySelector('small').textContent = actor?.role || actor?.roleEn || '在场人物';
            block.append(header);
        }
        const body = document.createElement('div');
        body.className = 'hpmud-scene-segment-body';
        const translated = document.createElement('div');
        translated.className = 'hpmud-translation';
        translated.innerHTML = formatMessageText(message, segment.textZh || segment.textEn);
        body.append(translated);
        if (segment.textZh) {
            const original = document.createElement('div');
            original.className = 'hpmud-original';
            original.innerHTML = formatMessageText(message, segment.textEn);
            body.append(original);
        }
        block.append(body);
        article.append(block);
    });
    return article;
}

function createGenerationStatusCard({
    tier = 'low',
    eyebrow = 'LIVE GENERATION',
    title,
    detail,
    steps = [],
    activeStep = 0,
}) {
    const article = document.createElement('article');
    article.className =
        `hpmud-generation-card tier-${tier}`;
    article.setAttribute('role', 'status');
    article.setAttribute('aria-live', 'polite');

    const seal = document.createElement('div');
    seal.className = 'hpmud-generation-seal';
    seal.innerHTML =
        '<i></i><i></i><span>H</span>';

    const copy = document.createElement('div');
    copy.className = 'hpmud-generation-copy';
    const small = document.createElement('small');
    const strong = document.createElement('strong');
    const paragraph = document.createElement('p');
    small.textContent = eyebrow;
    strong.textContent = title;
    paragraph.textContent = detail;
    copy.append(small, strong, paragraph);

    const rail = document.createElement('div');
    rail.className = 'hpmud-generation-rail';
    rail.append(document.createElement('span'));

    const stepList = document.createElement('div');
    stepList.className = 'hpmud-generation-steps';
    steps.forEach((step, index) => {
        const item = document.createElement('span');
        item.textContent = step;
        item.classList.toggle('done', index < activeStep);
        item.classList.toggle('active', index === activeStep);
        stepList.append(item);
    });
    article.append(seal, copy, rail, stepList);
    return article;
}

function renderLiveSceneStream() {
    const phase = liveSceneStream?.phase || 'connecting';
    const segments = liveSceneStream?.segments || [];
    if (!segments.length) {
        const generation = createGenerationStatusCard({
            tier: 'low',
            eyebrow: 'ON-SCENE PERFORMER · LIVE',
            title: LIVE_STREAM_PHASE_LABELS[phase],
            detail: '正在建立分段结构；第一段完成后会立即出现在这里。',
            steps: [
                '读取行动',
                '书写现场',
                '译入中文',
                '提交状态',
            ],
            activeStep: phase === 'connecting'
                ? 0
                : phase === 'receiving' ||
                    phase === 'repairing'
                    ? 1
                    : phase === 'translating'
                        ? 2
                        : 3,
        });
        if (!liveSceneStream?.checkResolution) {
            return generation;
        }
        const stack = document.createElement('div');
        stack.className = 'hpmud-live-stack';
        stack.append(
            renderCheckCard(
                liveSceneStream.checkResolution,
                { live: true },
            ),
            generation,
        );
        return stack;
    }
    const message = {
        name: 'Scene',
        mes: '',
        is_user: false,
        is_system: false,
        extra: {
            hogwartsMud: {
                turnTransaction: {
                    checkResolution:
                        liveSceneStream?.checkResolution,
                },
            },
        },
    };
    const article = renderSegmentedMessage(
        message,
        -1,
        segments,
    );
    article.classList.add('hpmud-streaming-turn');
    article.setAttribute('aria-live', 'polite');

    const status = document.createElement('div');
    status.className = 'hpmud-streaming-status';
    const mark = document.createElement('span');
    const label = document.createElement('strong');
    const count = document.createElement('small');
    mark.className = 'hpmud-streaming-mark';
    label.textContent = LIVE_STREAM_PHASE_LABELS[phase];
    count.textContent =
        `${segments.filter(segment => !segment.partial).length} 段已落笔`;
    status.append(mark, label, count);
    article.prepend(status);

    const lastBlock = article.querySelector(
        '.hpmud-scene-segment:last-child',
    );
    const lastSegment = segments.at(-1);
    if (lastBlock &&
        lastSegment?.partial &&
        ['receiving', 'repairing'].includes(phase)) {
        lastBlock.classList.add('is-streaming');
    }
    return article;
}

function renderMessage(message, messageId) {
    if (message.is_system) {
        const system = document.createElement('article');
        system.className = 'hpmud-system-turn';
        system.innerHTML = formatMessageText(message, message.mes);
        return system;
    }

    const segments = message.extra?.hogwartsMud?.segments;
    if (!message.is_user && Array.isArray(segments) && segments.length) {
        return renderSegmentedMessage(message, messageId, segments);
    }

    const translationEnabled = getSettings().translationEnabled;
    const translation = translationEnabled ? message.extra?.hogwartsMud : null;
    const article = document.createElement('article');
    article.className = `hpmud-turn ${message.is_user ? 'user' : 'assistant'}`;
    article.dataset.messageId = String(messageId);

    let header = null;
    if (message.is_user) {
        header = document.createElement('header');
        header.className = 'hpmud-turn-header';
        header.innerHTML = `
            <span class="hpmud-turn-avatar">${initials(message.name)}</span>
            <span class="hpmud-turn-name"><strong></strong><small></small></span>
        `;
        header.querySelector('strong').textContent = message.name || 'You';
        header.querySelector('small').textContent = '你的回合';
    } else if (translation?.translatedZh) {
        article.classList.add('hpmud-manuscript');
        article.append(
            createMessageTranslationControl(
                article,
                message,
                messageId,
            ),
        );
    }

    const body = document.createElement('div');
    body.className = 'hpmud-turn-body';
    if (message.is_user) {
        body.textContent = message.mes;
    } else {
        const translated = document.createElement('div');
        translated.className = 'hpmud-translation';
        translated.innerHTML = formatMessageText(message, translation?.translatedZh || message.mes);
        body.append(translated);

        if (translation?.translatedZh) {
            const original = document.createElement('div');
            original.className = 'hpmud-original';
            original.innerHTML = formatMessageText(message, translation.sourceEn || message.mes);
            body.append(original);
        }
    }

    if (header) article.append(header);
    article.append(body);
    return article;
}

function getCurrentSceneMessageEntries(context, state) {
    if (!state.scene?.id) {
        const offset = Math.max(
            0,
            context.chat.length - MAX_RENDERED_MESSAGES,
        );
        return context.chat.slice(offset).map((message, index) => ({
            message,
            messageId: offset + index,
        }));
    }
    const archivedMessageIds = new Set(
        (state.sceneArchive || [])
            .flatMap(scene => scene.messageIds || []),
    );
    const start = Math.max(
        0,
        Number(state.scene.startedMessageId || 0),
    );
    const entries = context.chat
        .map((message, messageId) => ({ message, messageId }))
        .filter(({ message, messageId }) =>
            messageId >= start &&
            !archivedMessageIds.has(messageId) &&
            (!message.extra?.hogwartsMud?.sceneId ||
                message.extra.hogwartsMud.sceneId === state.scene.id),
        );
    if (entries.length) {
        return entries;
    }
    return context.chat
        .map((message, messageId) => ({ message, messageId }))
        .filter(({ message }) =>
            message.extra?.hogwartsMud?.sceneId === state.scene.id,
        );
}

function renderStory(preserveScrollAnchor = false) {
    const context = getContext();
    const state = getWorldState();
    const sceneId = state.scene?.id || '';
    if (renderedSceneId !== sceneId) {
        renderedSceneId = sceneId;
        currentSceneMessageLimit = CURRENT_SCENE_PAGE_SIZE;
        archiveListLimit = ARCHIVE_LIST_PAGE_SIZE;
    }
    const entries = getCurrentSceneMessageEntries(context, state);
    const visibleEntries = entries.slice(-currentSceneMessageLimit);
    const previousHeight = storyElement.scrollHeight;
    const wasNearBottom = storyElement.scrollHeight - storyElement.scrollTop - storyElement.clientHeight < 100;
    storyElement.replaceChildren();

    if (state.phase === 'playing' && state.scene) {
        const heading = document.createElement('section');
        heading.className = 'hpmud-current-scene-heading';
        const eyebrow = document.createElement('small');
        const title = document.createElement('h2');
        const summary = document.createElement('p');
        const meta = document.createElement('span');
        eyebrow.textContent = 'CURRENT SCENE · 当前场景';
        title.textContent = state.scene.name ||
            state.scene.nameEn ||
            '未命名场景';
        summary.textContent = state.scene.summary ||
            state.scene.summaryEn ||
            '场景已经建立，等待下一步行动。';
        meta.textContent = [
            state.scene.startedClock || state.clock,
            state.location,
        ].filter(Boolean).join(' · ');
        heading.append(eyebrow, title, summary, meta);
        storyElement.append(heading);
    }

    if (visibleEntries.length < entries.length) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'hpmud-load-earlier';
        more.textContent =
            `↑ 向上加载当前场景更早记录 · 还剩 ${entries.length - visibleEntries.length}`;
        more.addEventListener('click', () => {
            currentSceneMessageLimit += CURRENT_SCENE_PAGE_SIZE;
            renderStory(true);
        });
        storyElement.append(more);
    }

    if (!visibleEntries.length) {
        const empty = document.createElement('div');
        if (state.phase === 'playing') {
            empty.className = 'hpmud-empty hpmud-current-scene-empty';
            empty.textContent = '当前场景尚无现场记录。';
        } else {
            empty.className = `hpmud-empty hpmud-opening-state phase-${state.phase}`;
        }
        if (state.phase === 'playing') {
            // The current-scene heading already provides the scene context.
        } else if (state.phase === 'initialization_failed') {
            empty.innerHTML = `
                <small>OPENING TRANSACTION PAUSED</small>
                <strong>首幕编排没有提交</strong>
                <span></span>
                <button id="hpmud_retry_opening" type="button">重新编排首幕</button>
            `;
            empty.querySelector('span').textContent = state.opening?.error || '世界导演调用失败。';
            empty.querySelector('#hpmud_retry_opening').addEventListener('click', () => {
                void initializeOpeningWorld().catch(error => {
                    console.error('[Hogwarts MUD] Opening retry failed', error);
                    toastr.error(String(error?.cause?.message || error?.message || error));
                });
            });
        } else {
            const hasCommittedWorld = Boolean(state.opening?.package);
            empty.innerHTML = `
                <small>WORLD OPENING TRANSACTION</small>
                <strong>${hasCommittedWorld ? '场景已固化，正在书写第一幕' : '世界导演正在编排你的开场'}</strong>
                <span>${hasCommittedWorld
        ? '时间、地点、地图、人物与隐藏故事线已经提交。中档编排场景、低档生成对白可能需要数分钟，请保持页面开启。'
        : '正在根据人物背景确定时间、家庭场景、在场人物与戏剧冲突。导演接口可能需要数分钟，请保持页面开启。'}</span>
                <ol>
                    <li class="${hasCommittedWorld ? 'done' : 'active'}">世界导演建立场景</li>
                    <li class="${hasCommittedWorld ? 'active' : ''}">中档编排场景 · 低档生成对白</li>
                    <li>等待你的第一个行动</li>
                </ol>
            `;
        }
        storyElement.append(empty);
    } else {
        visibleEntries.forEach(({ message, messageId }) =>
            storyElement.append(renderMessage(message, messageId)));
    }

    const failedPlayerTurn =
        getFailedPlayerTurn(
            context.chat,
            state.turn,
        );
    if (
        failedPlayerTurn &&
        !turnSettlementActive
    ) {
        const failure =
            document.createElement(
                'div',
            );
        failure.className =
            'hpmud-system-turn hpmud-turn-failure';
        const title =
            document.createElement(
                'strong',
            );
        const detail =
            document.createElement(
                'span',
            );
        const retry =
            document.createElement(
                'button',
            );
        title.textContent =
            '回复生成失败，玩家消息已保存';
        detail.textContent =
            failedPlayerTurn.error ||
            '低档没有提交有效的场景回复。';
        retry.type = 'button';
        retry.className =
            'hpmud-retry-turn';
        retry.textContent =
            '重试本回合';
        retry.addEventListener(
            'click',
            () => {
                retry.disabled = true;
                retry.classList.add(
                    'is-loading',
                );
                retry.textContent =
                    '正在重试';
                void retryFailedPlayerTurn();
            },
        );
        failure.append(
            title,
            detail,
            retry,
        );
        storyElement.append(failure);
    }

    if (sceneTransitionActive && state.phase === 'playing') {
        const highTier =
            state.sceneTransition?.tier === 'high';
        storyElement.append(createGenerationStatusCard({
            tier: highTier ? 'high' : 'medium',
            eyebrow: highTier
                ? 'WORLD DIRECTOR · ATOMIC'
                : 'SCENE DIRECTOR · ATOMIC',
            title: highTier
                ? '高档正在结算重大转折'
                : '中档正在封存场景并建立下一幕',
            detail: '结构化状态将在完整校验后一次提交；旧场景在此之前保持可玩。',
            steps: [
                '收束旧场景',
                '确认人物与地点',
                '预写下一幕',
                '原子提交',
            ],
            activeStep: 1,
        }));
    } else if (turnSettlementActive && state.phase === 'playing') {
        if (state.directorFoundation?.status === 'building') {
            storyElement.append(createGenerationStatusCard({
                tier: 'high',
                eyebrow: 'WORLD DIRECTOR · PRIVATE',
                title: '正在建立人物库与隐藏故事线',
                detail: '角色秘密、知识边界和线索图只在完整校验后写入存档。',
                steps: [
                    '读取角色背景',
                    '建立人物关系',
                    '预写隐藏线索',
                    '提交世界状态',
                ],
                activeStep: 2,
            }));
        } else if (state.dailyDirector?.status === 'building') {
            storyElement.append(createGenerationStatusCard({
                tier: 'medium',
                eyebrow: 'DAILY DIRECTOR · ONCE PER DAY',
                title: '中档正在编排今日人物计划',
                detail: '正在整理人物动机、线索机会与本日时间策略。',
                steps: [
                    '回顾昨日事件',
                    '更新人物目标',
                    '安排线索机会',
                    '提交日计划',
                ],
                activeStep: 1,
            }));
        } else if (
            state.memoryDirector?.status ===
                'consolidating'
        ) {
            storyElement.append(createGenerationStatusCard({
                tier: 'medium',
                eyebrow: 'MEMORY DIRECTOR · PERIODIC',
                title: '中档正在整理共同记忆',
                detail: '合并重复小事、提炼近期大事，并判断哪些经历真正留下长期印记。',
                steps: [
                    '回看共同经历',
                    '合并日常碎片',
                    '提炼重要事件',
                    '更新人物印象',
                ],
                activeStep: 1,
            }));
        } else if (
            state.pacingDirector?.status === 'assessing'
        ) {
            storyElement.append(createGenerationStatusCard({
                tier: 'medium',
                eyebrow: 'PACING DIRECTOR · LIVE CHECK',
                title: '中档正在检查场景节奏',
                detail: '判断是否需要新人物、公开危机或主线转机。',
                steps: [
                    '检查重复阵容',
                    '衡量场景压力',
                    '选择介入方式',
                    '提交公开转机',
                ],
                activeStep: 1,
            }));
        } else if (liveSceneStream) {
            storyElement.append(renderLiveSceneStream());
        } else {
            storyElement.append(createGenerationStatusCard({
                tier: 'low',
                eyebrow: 'ON-SCENE PERFORMER · CONNECTING',
                title: '低档正在接管现场',
                detail: '正在读取玩家行动、空间关系与导演指令。',
                steps: [
                    '读取行动',
                    '书写现场',
                    '译入中文',
                    '提交状态',
                ],
                activeStep: 0,
            }));
        }
    }
    if (!sceneTransitionActive &&
        state.sceneTransition?.status === 'failed') {
        const failure = document.createElement('div');
        failure.className = 'hpmud-system-turn hpmud-transition-failure';
        const title = document.createElement('strong');
        const detail = document.createElement('span');
        const retry = document.createElement('button');
        title.textContent = '场景封存失败';
        detail.textContent = state.sceneTransition.error ||
            '结算包未通过规则校验。';
        retry.type = 'button';
        retry.textContent = '重新打开结算';
        retry.addEventListener('click', openSceneTransitionDialog);
        failure.append(title, detail, retry);
        storyElement.append(failure);
    }

    if (preserveScrollAnchor) {
        storyElement.scrollTop += storyElement.scrollHeight - previousHeight;
    } else if (wasNearBottom || turnSettlementActive || sceneTransitionActive) {
        storyElement.scrollTop = storyElement.scrollHeight;
    }
}

function syncComposerState(state) {
    const foundationBuilding = state.directorFoundation?.status === 'building';
    const dailyDirectorBuilding = state.dailyDirector?.status === 'building';
    const pacingDirectorBuilding =
        state.pacingDirector?.status === 'assessing';
    const memoryDirectorBuilding =
        state.memoryDirector?.status ===
            'consolidating';
    const sceneTransitionBuilding = sceneTransitionActive ||
        state.sceneTransition?.status === 'resolving';
    const failedPlayerTurn =
        getFailedPlayerTurn(
            getContext().chat,
            state.turn,
        );
    const ready = state.phase === 'playing' &&
        !foundationBuilding &&
        !dailyDirectorBuilding &&
        !pacingDirectorBuilding &&
        !memoryDirectorBuilding &&
        !sceneTransitionBuilding &&
        !failedPlayerTurn &&
        !turnSettlementActive;
    const composer = root.querySelector('#hpmud_composer');
    composer.classList.toggle('locked', !ready);
    composer.querySelectorAll('textarea, input, button').forEach(control => {
        control.disabled = !ready;
    });
    const rollbackButton =
        root.querySelector(
            '#hpmud_rollback_turn',
        );
    const rollbackCheckpoint =
        getAvailableTurnRollbackCheckpoint(
            state,
            getContext().chat,
        );
    rollbackButton.disabled =
        !ready;
    rollbackButton.title =
        rollbackCheckpoint
            ? '删除上一组玩家/场景消息，并恢复该回合提交前的世界状态'
            : '回滚上一轮；旧存档会从已提交事务重建回合前状态';
    if (!ready) {
        closeMovementPicker();
        closeSpellPicker();
    }
    composerInput.placeholder = ready
        ? '写下你的行动、台词或想法……'
        : failedPlayerTurn
            ? '上一条玩家消息已保存，请先在上方重试本回合'
            : foundationBuilding
                ? '世界导演正在建立出场角色库与隐藏故事线，请稍候'
                : dailyDirectorBuilding
                    ? '中档正在执行本日唯一一次日结，请稍候'
                    : memoryDirectorBuilding
                        ? '中档正在整理人物印象与共同记忆，请稍候'
                        : pacingDirectorBuilding
                            ? '中档正在检查场景节奏与人物变化，请稍候'
                            : sceneTransitionBuilding
                                ? '正在封存当前场景并建立下一幕，请稍候'
                                : turnSettlementActive
                                    ? '低档正在表演本轮动作、场景与对白，请稍候'
                                    : state.phase === 'initialization_failed'
                                        ? '首幕编排失败，请先在上方重试'
                                        : '世界正在建立，首幕完成后即可行动';
}

function createInspectorCard(title, content) {
    const card = document.createElement('section');
    card.className = 'hpmud-inspector-card';
    if (title) {
        const heading = document.createElement('h3');
        heading.textContent = title;
        card.append(heading);
    }
    card.append(content);
    return card;
}

function createList(entries, emptyText = '暂无') {
    const list = document.createElement('ul');
    list.className = 'hpmud-inspector-list';
    if (!entries.length) {
        const item = document.createElement('li');
        item.textContent = emptyText;
        list.append(item);
        return list;
    }
    for (const entry of entries) {
        const item = document.createElement('li');
        if (typeof entry === 'string') {
            item.textContent = entry;
        } else {
            item.textContent = entry.label || entry.name || '';
            if (entry.detail) {
                const detail = document.createElement('small');
                detail.textContent = entry.detail;
                item.append(detail);
            }
        }
        list.append(item);
    }
    return list;
}

function renderActorImpression(profile, actor) {
    const dynamic = normalizeActorMemoryProfile(
        profile || {},
        actor || {},
    );
    const panel = document.createElement('div');
    panel.className = 'hpmud-impression';
    const quote = document.createElement('p');
    quote.textContent =
        dynamic.impressionOfPlayer ||
        dynamic.impressionOfPlayerEn ||
        '对方还没有形成清晰看法。';
    const meta = document.createElement('small');
    const updatedClock =
        dynamic.impressionUpdatedClock ||
        '等待新的共同经历';
    meta.textContent =
        dynamic.impressionUpdatedTurn
            ? `TURN ${dynamic.impressionUpdatedTurn} · ${updatedClock}`
            : updatedClock;
    panel.append(quote, meta);
    return panel;
}

function renderSharedMemoryLedger(profile, actor) {
    const dynamic = normalizeActorMemoryProfile(
        profile || {},
        actor || {},
    );
    const ledger = document.createElement('div');
    ledger.className = 'hpmud-memory-ledger';
    const tiers = [
        {
            id: 'core',
            label: '最深刻的',
            hint: '长期留存',
        },
        {
            id: 'recent',
            label: '近期大事',
            hint: '仍在影响当下',
        },
        {
            id: 'everyday',
            label: '日常小事',
            hint: '相处留下的细节',
        },
    ];
    tiers.forEach(tier => {
        const memories =
            dynamic.sharedMemories[tier.id] || [];
        const section = document.createElement('section');
        section.className =
            `hpmud-memory-tier tier-${tier.id}`;
        const header = document.createElement('header');
        const title = document.createElement('strong');
        const count = document.createElement('span');
        const hint = document.createElement('small');
        title.textContent = tier.label;
        count.textContent = String(memories.length);
        hint.textContent = tier.hint;
        header.append(title, count, hint);
        const entries = document.createElement('div');
        entries.className = 'hpmud-memory-entries';
        if (!memories.length) {
            const empty = document.createElement('p');
            empty.className = 'hpmud-memory-empty';
            empty.textContent =
                tier.id === 'core'
                    ? '还没有足以长久留下的共同经历。'
                    : '这一层暂时没有记录。';
            entries.append(empty);
        } else {
            [...memories].reverse().forEach(memory => {
                const entry = document.createElement('article');
                const summary = document.createElement('p');
                const time = document.createElement('time');
                summary.textContent =
                    memory.summary ||
                    memory.summaryEn;
                time.textContent =
                    memory.lastClock ||
                    memory.firstClock ||
                    '时间未记';
                entry.append(summary, time);
                entries.append(entry);
            });
        }
        section.append(header, entries);
        ledger.append(section);
    });
    return ledger;
}

function getSocialActorName(
    state,
    actorId,
) {
    if (actorId === 'player') {
        return '你';
    }
    const actor = [
        ...(state.actorLibrary || []),
        ...(state.actors || []),
    ].find(entry =>
        entry.id === actorId);
    return actor?.name ||
        actor?.nameEn ||
        actorId;
}

function renderActorSocialStatements(
    state,
    actorId,
) {
    const categoryLabels = {
        family: '家庭',
        origin: '出身',
        education: '教育',
        wealth: '经济',
        occupation: '职业',
        identity: '身份',
        history: '经历',
        preference: '偏好',
        other: '公开说法',
    };
    const statements =
        buildSocialAudienceProjection(
            state,
            'player',
        )
            .statements
            .filter(statement =>
                statement.subjectId ===
                    actorId)
            .map(statement => ({
                label: [
                    categoryLabels[
                        statement.category
                    ] ||
                    '公开说法',
                    statement.speakerId !==
                        actorId
                        ? `由 ${getSocialActorName(
                            state,
                            statement.speakerId,
                        )} 提及`
                        : '',
                ].filter(Boolean)
                    .join(' · '),
                detail:
                    statement.text ||
                    statement.textEn,
            }));
    return createList(
        statements,
        '你还没有亲耳得知此人的家庭或背景声明。',
    );
}

function renderActorSocialRelationships(
    state,
    actorId,
) {
    const projection =
        buildSocialAudienceProjection(
            state,
            'player',
        );
    const edgeByDirection =
        new Map(
            projection.relationships
                .map(edge => [
                    `${edge.sourceActorId}->${edge.targetActorId}`,
                    edge,
                ]),
        );
    const dimensions = [
        ['familiarity', '熟悉'],
        ['closeness', '亲近'],
        ['warmth', '温暖'],
        ['trust', '信任'],
        ['respect', '尊重'],
        ['influence', '影响'],
        ['tension', '张力'],
        ['resentment', '积怨'],
        ['fear', '恐惧'],
        ['protectiveness', '保护'],
    ];
    const formatEdge = edge => {
        const sourceName =
            getSocialActorName(
                state,
                edge.sourceActorId,
            );
        const targetName =
            getSocialActorName(
                state,
                edge.targetActorId,
            );
        const labels =
            (edge.labels || [])
                .join(' / ');
        const activeEmotions =
            (edge.activeEmotions || [])
                .map(emotion =>
                    `${emotion.emotion} ${emotion.intensity}`)
                .join('、');
        const latestEvidence =
            edge.latestEvidence
                ?.summary ||
            edge.latestEvidence
                ?.summaryEn ||
            '';
        return {
            label: [
                `${sourceName} → ${targetName}`,
                labels,
            ].filter(Boolean).join(' · '),
            detail: [
                dimensions
                    .map(([key, label]) =>
                        `${label} ${Math.round(
                            Number(
                                edge[key] ||
                                0,
                            ),
                        )}`)
                    .join(' · '),
                activeEmotions &&
                    `短期情绪：${activeEmotions}`,
                latestEvidence &&
                    `最新 evidence：${latestEvidence}`,
            ].filter(Boolean).join(' · '),
        };
    };
    const directDirections = [
        [actorId, 'player'],
        ['player', actorId],
    ];
    const relationships =
        directDirections.map(
            ([sourceActorId, targetActorId]) => {
                const edge =
                    edgeByDirection.get(
                        `${sourceActorId}->${targetActorId}`,
                    );
                if (edge) {
                    return formatEdge(edge);
                }
                return {
                    label:
                        `${getSocialActorName(
                            state,
                            sourceActorId,
                        )} → ${getSocialActorName(
                            state,
                            targetActorId,
                        )}`,
                    detail:
                        '尚无玩家可知记录。',
                };
            },
        );
    projection.relationships
        .filter(edge =>
            (
                edge.sourceActorId ===
                    actorId ||
                edge.targetActorId ===
                    actorId
            ) &&
            !directDirections.some(
                ([sourceActorId, targetActorId]) =>
                    edge.sourceActorId ===
                        sourceActorId &&
                    edge.targetActorId ===
                        targetActorId,
            ))
        .map(formatEdge)
        .forEach(entry =>
            relationships.push(entry));
    return createList(
        relationships,
        '还没有形成你可知的人际关系记录。',
    );
}

function parseJsonObject(text) {
    if (text && typeof text === 'object' && !Array.isArray(text)) {
        return text;
    }
    const source = String(text || '').trim();
    const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) {
        return JSON.parse(fenced);
    }
    try {
        return JSON.parse(source);
    } catch (directError) {
        const candidates = [];
        for (let start = 0; start < source.length; start++) {
            if (source[start] !== '{') continue;
            let depth = 0;
            let inString = false;
            let escaped = false;
            for (let index = start; index < source.length; index++) {
                const character = source[index];
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
                        candidates.push(source.slice(start, index + 1));
                        break;
                    }
                }
            }
        }
        candidates.sort((left, right) => right.length - left.length);
        for (const candidate of candidates) {
            try {
                const parsed = JSON.parse(candidate);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed;
                }
            } catch {
                // Try the next balanced object.
            }
        }
        throw directError;
    }
}

async function localizeGeneratedInteriorMapPackage(
    generatedMap,
) {
    if (!getSettings().translationEnabled) {
        return generatedMap;
    }
    const values = [
        generatedMap.nameEn,
        ...generatedMap.levels
            .map(level =>
                level.nameEn),
        ...generatedMap.rooms
            .flatMap(room => [
                room.nameEn,
                room.descriptionEn,
            ]),
    ];
    const translated =
        await translateOpeningValues(
            values,
        );
    let cursor = 0;
    return {
        ...generatedMap,
        display: {
            mapName:
                translated[cursor++],
            levelNames:
                generatedMap.levels
                    .map(() =>
                        translated[
                            cursor++
                        ]),
            roomNames:
                generatedMap.rooms
                    .map(() => {
                        const name =
                            translated[
                                cursor++
                            ];
                        cursor += 1;
                        return name;
                    }),
        },
    };
}

function createInteriorMapPrompt(
    state,
    request,
) {
    return [
        {
            role: 'system',
            content: `You are the medium-tier Interior Cartographer for a persistent Harry Potter RPG. Create one stable local topology for the supplied container and return exactly one JSON object with no Markdown.

Rules:
- Use exactly the requested map ID. This map is generated once and then persisted.
- Model only the physical interior of the supplied container, not the surrounding castle, station, street, or world.
- Preserve the committed scene facts and visible furnishings. Do not create characters, items, clues, secrets, plot events, schedules, relationships, or state changes.
- Use 1–4 levels and 2–16 connected rooms. Every room must be reachable from currentRoomId.
- Room IDs and level IDs must be lowercase snake_case.
- Coordinates must be between 5 and 95.
- Choose currentRoomId as the room where the committed scene is currently taking place.
- For a dormitory, beds are furnishings within a dorm room rather than separate map rooms. Include only useful stable spaces such as the stair landing, the relevant year dormitory, a washroom, or a shared storage alcove when supported.

Schema:
{
  "version":1,
  "id":"exact_requested_map_id",
  "nameEn":"English interior map name",
  "currentLevelId":"level_id",
  "currentRoomId":"room_id",
  "levels":[
    {"id":"level_id","nameEn":"English level name","z":0}
  ],
  "rooms":[
    {
      "id":"room_id",
      "nameEn":"English room name",
      "levelId":"level_id",
      "kind":"room|landing|dormitory|washroom|storage|corridor",
      "descriptionEn":"concrete stable physical description",
      "x":50,
      "y":50,
      "access":"public|student|house_gryffindor|staff",
      "aliases":["optional alias"]
    }
  ],
  "exits":[
    {
      "from":"room_id",
      "to":"room_id",
      "direction":"up|down|north|south|east|west|passage",
      "kind":"stairs|door|corridor|passage",
      "minutes":1
    }
  ]
}`,
        },
        {
            role: 'user',
            content: JSON.stringify({
                requestedMapId:
                    request
                        .suggestedMapId,
                container: request,
                currentScene: {
                    id:
                        state.scene?.id,
                    nameEn:
                        state.scene
                            ?.nameEn,
                    summaryEn:
                        state.scene
                            ?.summaryEn,
                    openingFactsEn:
                        getContext().chat
                            .slice(-4)
                            .filter(message =>
                                !message
                                    .is_user)
                            .flatMap(message =>
                                (
                                    message.extra
                                        ?.hogwartsMud
                                        ?.segments ||
                                    []
                                ).filter(
                                    segment =>
                                        segment.type ===
                                        'narration',
                                ).map(
                                    segment =>
                                        segment
                                            .textEn,
                                ))
                            .slice(-4),
                },
            }),
        },
    ];
}

async function generateInteriorMapPackage(
    roleSlot,
    state,
    request,
) {
    const prompt =
        createInteriorMapPrompt(
            state,
            request,
        );
    let response =
        await sendRoleRequest(
            roleSlot,
            prompt,
            { json: true },
        );
    let raw =
        extractRoleResponseText(
            response,
        );
    let lastError = null;
    for (
        let attempt = 0;
        attempt < 2;
        attempt++
    ) {
        try {
            let payload =
                parseJsonObject(raw);
            const validation =
                validateGeneratedInteriorMap(
                    payload,
                    state,
                    request,
                );
            if (!validation.valid) {
                throw new Error(
                    validation.errors
                        .join('；'),
                );
            }
            try {
                payload =
                    await localizeGeneratedInteriorMapPackage(
                        payload,
                    );
            } catch (
                translationError
            ) {
                console.warn(
                    '[Hogwarts MUD] Interior map translation failed; using English labels',
                    translationError,
                );
            }
            return payload;
        } catch (error) {
            lastError = error;
            if (attempt > 0) {
                break;
            }
            response =
                await sendRoleRequest(
                    roleSlot,
                    [
                        {
                            role:
                                'system',
                            content:
                                'Repair the interior map JSON. Use the exact requested map ID, 1–4 levels, 2–16 fully connected rooms, valid snake_case IDs, and coordinates from 5 to 95. Do not add characters, items, events, or facts. Return JSON only.',
                        },
                        {
                            role: 'user',
                            content:
                                JSON.stringify({
                                    validationError:
                                        String(
                                            error
                                                ?.message ||
                                            error,
                                        ),
                                    invalidOutput:
                                        raw,
                                    originalRequest:
                                        JSON.parse(
                                            prompt[1]
                                                .content,
                                        ),
                                    requiredSchema:
                                        prompt[0]
                                            .content,
                                }),
                        },
                    ],
                    { json: true },
                );
            raw =
                extractRoleResponseText(
                    response,
                );
        }
    }
    throw new Error(
        `中档室内制图连续两次无效：${String(lastError?.message || lastError)}`,
    );
}

async function ensureCurrentInteriorMap() {
    if (interiorMapPromise) {
        return interiorMapPromise;
    }
    const context = getContext();
    let state = getMudState();
    const activeMap =
        getLocalMapDefinition(
            state.map?.activeMapId,
            state.map,
        );
    let inspectorScopeChanged =
        false;
    if (
        activeMap
            ?.sourceContainerKey &&
        inspectorMapScope ===
            activeMap.parentMapId
    ) {
        inspectorMapScope = 'auto';
        inspectorMapLevel = '';
        inspectorScopeChanged =
            true;
    }
    const request =
        getInteriorMapRequest(state);
    if (!request) {
        if (inspectorScopeChanged) {
            renderAll();
        }
        return state;
    }
    if (
        request.status ===
            'ready'
    ) {
        let next =
            enterBoundInteriorMap(
                state,
                request,
            );
        const normalized =
            normalizeGeneratedInteriorMapLabels(
                next,
            );
        next = normalized.state;
        next.map.interiorMapGeneration = {
            status: 'ready',
            error: '',
            bindingKey:
                request.bindingKey,
            mapId:
                request.boundMapId,
            settledAt:
                new Date()
                    .toISOString(),
        };
        context.chatMetadata
            .hogwartsMud = next;
        inspectorMapScope = 'auto';
        inspectorMapLevel = '';
        await context.saveMetadata();
        applySystemPrompt();
        renderAll();
        return next;
    }
    const previousGeneration =
        state.map
            ?.interiorMapGeneration;
    if (
        previousGeneration
            ?.status === 'failed' &&
        previousGeneration
            ?.bindingKey ===
            request.bindingKey
    ) {
        return null;
    }
    const slots =
        resolveRoleSlots(
            state.modelSlots,
        );
    if (!slots.medium.profileId) {
        state.map
            .interiorMapGeneration = {
                status:
                'waiting_for_profile',
                error:
                '未配置中档 Connection Profile。',
                bindingKey:
                request.bindingKey,
                mapId: '',
                settledAt: null,
            };
        await context.saveMetadata();
        renderAll();
        return null;
    }
    interiorMapPromise =
        (async () => {
            state = getMudState();
            state.map
                .interiorMapGeneration = {
                    status: 'generating',
                    error: '',
                    bindingKey:
                    request.bindingKey,
                    mapId: '',
                    requestedAt:
                    new Date()
                        .toISOString(),
                    settledAt: null,
                };
            await context.saveMetadata();
            renderAll();
            try {
                const generatedMap =
                    await generateInteriorMapPackage(
                        slots.medium,
                        state,
                        request,
                    );
                let next =
                    applyGeneratedInteriorMap(
                        state,
                        generatedMap,
                        request,
                    );
                const normalized =
                    normalizeGeneratedInteriorMapLabels(
                        next,
                    );
                next = normalized.state;
                next.map
                    .interiorMapGeneration = {
                        status: 'ready',
                        error: '',
                        bindingKey:
                        request.bindingKey,
                        mapId:
                        generatedMap.id,
                        settledAt:
                        new Date()
                            .toISOString(),
                    };
                context.chatMetadata
                    .hogwartsMud = next;
                inspectorMapScope = 'auto';
                inspectorMapLevel = '';
                await context
                    .saveMetadata();
                applySystemPrompt();
                renderAll();
                return next;
            } catch (error) {
                state = getMudState();
                state.map
                    .interiorMapGeneration = {
                        status: 'failed',
                        error:
                        String(
                            error?.cause
                                ?.message ||
                            error?.message ||
                            error,
                        ),
                        bindingKey:
                        request.bindingKey,
                        mapId: '',
                        settledAt:
                        new Date()
                            .toISOString(),
                    };
                await context
                    .saveMetadata();
                renderAll();
                console.warn(
                    '[Hogwarts MUD] Interior cartographer failed; keeping the committed parent room',
                    error,
                );
                return null;
            }
        })().finally(() => {
            interiorMapPromise =
                null;
            renderAll();
        });
    return interiorMapPromise;
}

async function requestMapExpansion(trigger = 'exploration') {
    const state = getMudState();
    const slots = resolveRoleSlots(state?.modelSlots);
    const roleSlot = slots.high;
    const profileId = roleSlot.profileId;
    if (!MAP_DIRECTOR_TRIGGERS.includes(trigger)) {
        throw new Error('无效的地图演算触发条件。');
    }
    if (!profileId) {
        toastr.warning('未配置高档“世界导演”Connection Profile。');
        return;
    }

    const button = inspectorElement.querySelector('#hpmud_expand_map');
    if (button) {
        button.disabled = true;
        button.textContent = '世界演算中…';
    }
    try {
        const response = await sendRoleRequest(roleSlot, [
            {
                role: 'system',
                content: `You are the World Director for a persistent Harry Potter RPG. First search the supplied preset world and local-map catalog. Propose a new top-level location only when no preset room or location can represent the physical place created by the event. Output one JSON object and no prose:
{"id":"string","reason":"string","changes":[{"operation":"add|update","node":{"id":"snake_case","regionId":"existing region id","name":"Chinese display name","kind":"string","summary":"Chinese summary","access":"public|student|restricted|dangerous|forbidden","x":0,"y":0}}]}
Never delete or rename a preset location. Ordinary movement and scene description require no proposal.`,
            },
            {
                role: 'user',
                content: JSON.stringify({
                    trigger,
                    currentLocation: state.location,
                    character: state.character,
                    mapAuthority: buildMapAuthorityContext(state),
                    currentMapState: state.map,
                }),
            },
        ], { json: true });
        const proposal = parseJsonObject(response?.content);
        const validation = validateMapProposal(proposal, {
            trigger,
            baseMap: PRESET_WORLD_MAP,
            generatedNodes: state.map?.generatedNodes,
        });
        if (!validation.valid) {
            throw new Error(`地图提案被规则层拒绝：${validation.errors.join('；')}`);
        }
        state.map = applyMapProposal(state.map, proposal);
        saveMetadataDebounced();
        renderInspector('map');
        renderMiniMap(getWorldState());
        toastr.success('世界导演的地图提案已通过校验并提交。');
    } catch (error) {
        console.error('[Hogwarts MUD] Map expansion failed', error);
        toastr.error(String(error?.cause?.message || error?.message || error));
        if (button) {
            button.disabled = false;
            button.textContent = '申请结构影响演算';
        }
    }
}

function renderInspectorMap(state) {
    const controls = document.createElement('div');
    controls.className = 'hpmud-map-selectors';
    const scopeSelect = document.createElement('select');
    scopeSelect.setAttribute('aria-label', '地图地点');
    populateMapScopeSelect(scopeSelect, inspectorMapScope, true, state.map);
    inspectorMapScope = scopeSelect.value;
    const levelSelect = document.createElement('select');
    levelSelect.setAttribute('aria-label', '地图楼层');
    const resolvedMapId = resolveLocalMapId(state.map, state.location);
    const effectiveScope = inspectorMapScope === 'auto'
        ? resolvedMapId || 'world'
        : inspectorMapScope;
    inspectorMapLevel = effectiveScope === 'world'
        ? ''
        : populateLevelSelect(levelSelect, effectiveScope, inspectorMapLevel || state.map?.currentLevelId, state.map);
    if (effectiveScope === 'world') {
        levelSelect.hidden = true;
    }
    controls.append(scopeSelect, levelSelect);
    inspectorElement.append(createInspectorCard('', controls));

    const map = document.createElement('div');
    map.className = 'hpmud-inspector-map';
    let title = `${getMudState()?.campaign?.startYear || 1991} · 英国魔法世界`;
    let fixedCount = PRESET_WORLD_MAP.nodes.length;
    if (effectiveScope === 'world') {
        renderWorldMap(map, state.map, { currentLocation: state.location });
    } else {
        const model = renderLocalMap(map, effectiveScope, state.map, {
            levelId: inspectorMapLevel,
            positions: getMapPositionMarkers(state, effectiveScope),
        });
        title = `${model?.name || '地点'} · ${model?.levels.find(level => level.id === model.levelId)?.name || ''}`;
        fixedCount = getLocalMapDefinition(effectiveScope, state.map)?.nodes.length || 0;
    }
    inspectorElement.append(createInspectorCard(title, map));

    scopeSelect.addEventListener('change', () => {
        inspectorMapScope = scopeSelect.value;
        inspectorMapLevel = '';
        renderInspector('map');
    });
    levelSelect.addEventListener('change', () => {
        inspectorMapLevel = levelSelect.value;
        renderInspector('map');
    });

    const director = document.createElement('div');
    director.className = 'hpmud-map-director';
    const count = document.createElement('small');
    count.textContent = `固定拓扑 ${fixedCount} 节点 · 运行时只保存结构差异`;
    const recalculate = document.createElement('button');
    recalculate.id = 'hpmud_expand_map';
    recalculate.type = 'button';
    recalculate.textContent = '申请结构影响演算';
    recalculate.addEventListener('click', () => void requestMapExpansion('world_event'));
    director.append(count, recalculate);
    inspectorElement.append(createInspectorCard('世界导演', director));
}

function renderInspector(tab = 'character') {
    const state = getWorldState();
    const character = state.character;
    inspectorElement.replaceChildren();
    root.querySelectorAll('[data-hpmud-tab]').forEach(button => {
        button.classList.toggle('active', button.dataset.hpmudTab === tab);
    });

    if (tab === 'actor') {
        const actor = state.actors.find(item => item.id === selectedActorId);
        const profile = state.actorLibrary.find(item => item.id === selectedActorId);
        if (!actor && !profile) {
            selectedActorId = '';
            renderInspector('character');
            return;
        }
        const name =
            profile?.name ||
            actor?.name ||
            profile?.nameEn ||
            actor?.nameEn ||
            '未知人物';
        const identity = document.createElement('div');
        identity.className = 'hpmud-profile hpmud-actor-profile';
        identity.innerHTML = `
            <span class="hpmud-profile-avatar">${initials(name)}</span>
            <span><h2></h2><p></p></span>
        `;
        identity.querySelector('h2').textContent = name;
        identity.querySelector('p').textContent = [
            profile?.role || actor?.role || profile?.roleEn,
            profile?.relationshipToPlayer || actor?.relationshipToPlayer,
        ].filter(Boolean).join(' · ');
        inspectorElement.append(createInspectorCard('', identity));
        if (
            projectPeoplePanel(state)
                .activePeople
                .some(person =>
                    person.id ===
                    selectedActorId)
        ) {
            const addressAction =
                document.createElement(
                    'button',
                );
            addressAction.type = 'button';
            addressAction.className =
                'hpmud-tool-button';
            addressAction.textContent =
                '插入对话块';
            addressAction.addEventListener(
                'click',
                () => {
                    setComposerAddressTarget(
                        profile?.name ||
                        actor?.name ||
                        profile?.nameEn ||
                        actor?.nameEn ||
                        actor.id,
                    );
                    toastr.success(
                        '已插入定向台词。',
                    );
                },
            );
            inspectorElement.append(
                createInspectorCard(
                    '',
                    addressAction,
                ),
            );
        }
        inspectorElement.append(createInspectorCard(
            '对你的印象',
            renderActorImpression(profile, actor),
        ));
        inspectorElement.append(createInspectorCard(
            '共同记忆',
            renderSharedMemoryLedger(profile, actor),
        ));
        inspectorElement.append(createInspectorCard(
            '家庭与背景声明',
            renderActorSocialStatements(
                state,
                selectedActorId,
            ),
        ));
        inspectorElement.append(createInspectorCard(
            '已知人物关系',
            renderActorSocialRelationships(
                state,
                selectedActorId,
            ),
        ));
        const graphAction =
            document.createElement('button');
        graphAction.type = 'button';
        graphAction.className =
            'hpmud-tool-button';
        graphAction.textContent =
            '在关系星图中查看';
        graphAction.addEventListener(
            'click',
            () => void relationshipGraphController
                ?.open({
                    actorId:
                        selectedActorId,
                }),
        );
        inspectorElement.append(
            createInspectorCard(
                '',
                graphAction,
            ),
        );
        inspectorElement.append(createInspectorCard('当前状态', createList([
            {
                label: '所在位置',
                detail: getRoomName(
                    state,
                    actor?.mapId || state.map.activeMapId,
                    actor?.roomId,
                ),
            },
            {
                label: '正在做',
                detail:
                    actor?.currentActivity ||
                    actor?.currentActivityEn ||
                    '不在当前场景。',
            },
            {
                label: '身份关系',
                detail:
                    profile?.relationshipToPlayer ||
                    actor?.relationshipToPlayer ||
                    '尚未建立关系。',
            },
        ])));
        const appearance =
            buildActorAppearanceView(
                state,
                selectedActorId,
            );
        const currentPresentation = [
            appearance.presentation
                .outfit
                ? {
                    label: '服装',
                    detail:
                        appearance
                            .presentation
                            .outfit,
                }
                : null,
            appearance.presentation
                .accessories.length
                ? {
                    label: '饰品',
                    detail:
                        appearance
                            .presentation
                            .accessories
                            .join(' · '),
                }
                : null,
            appearance.presentation
                .hair
                ? {
                    label: '当前发型',
                    detail:
                        appearance
                            .presentation
                            .hair,
                }
                : null,
            appearance.presentation
                .visibleConditions
                .length
                ? {
                    label: '可见状态',
                    detail:
                        appearance
                            .presentation
                            .visibleConditions
                            .join(' · '),
                }
                : null,
            ...appearance.presentation
                .heldItems.map(
                    entry => ({
                        label:
                            entry.hand ===
                                'left'
                                ? '左手'
                                : entry
                                    .hand ===
                                    'right'
                                    ? '右手'
                                    : entry
                                        .hand ===
                                        'both'
                                        ? '双手'
                                        : '手持物',
                        detail:
                            entry.item,
                    }),
                ),
        ].filter(Boolean);
        inspectorElement.append(
            createInspectorCard(
                '当前呈现',
                createList(
                    currentPresentation,
                    '没有记录到动态服装、发型或手持物。',
                ),
            ),
        );
        inspectorElement.append(createInspectorCard('公开档案', createList([
            {
                label: '固定外貌',
                detail:
                    appearance
                        .physicalDescription,
            },
            {
                label: '已知背景',
                detail: profile?.publicBackground || '你还不了解此人的过去。',
            },
            {
                label: '性格',
                detail: profile?.personality || '仍需通过交往了解。',
            },
            {
                label: '说话方式',
                detail: profile?.speechStyle || '仍需通过交谈了解。',
            },
        ])));
        return;
    }

    if (tab === 'character') {
        const profile = document.createElement('div');
        profile.className = 'hpmud-profile';
        profile.innerHTML = `
            <span class="hpmud-profile-avatar">${initials(character?.identity?.name)}</span>
            <span><h2></h2><p></p></span>
        `;
        profile.querySelector('h2').textContent = character?.identity?.name || '未命名角色';
        profile.querySelector('p').textContent = [
            character?.background?.bloodStatus,
            character?.aptitudes?.strongDomain && `优势：${character.aptitudes.strongDomain}`,
        ].filter(Boolean).join(' · ') || '一年级新生';
        inspectorElement.append(createInspectorCard('', profile));

        const tags = document.createElement('div');
        tags.className = 'hpmud-tags';
        Object.entries(character?.attributes || {}).forEach(([key, value]) => {
            const tag = document.createElement('span');
            const names = {
                physique: '体魄',
                agility: '灵巧',
                perception: '感知',
                intellect: '智识',
                willpower: '意志',
                charisma: '魅力',
            };
            tag.textContent = `${names[key] || key} ${value}`;
            tags.append(tag);
        });
        inspectorElement.append(createInspectorCard('基础属性', tags));
        inspectorElement.append(createInspectorCard('人物背景', createList([
            { label: '欲望', detail: character?.background?.desire || '未记录' },
            { label: '恐惧', detail: character?.background?.fear || '未记录' },
        ])));
        return;
    }

    if (tab === 'map') {
        renderInspectorMap(state);
        return;
    }

    if (tab === 'spells') {
        const knownById =
            getKnownSpellMap(
                state,
            );
        const ledger =
            document.createElement(
                'div',
            );
        ledger.className =
            'hpmud-spellbook-ledger';
        if (!knownById.size) {
            const empty =
                document.createElement(
                    'p',
                );
            empty.className =
                'hpmud-memory-empty';
            empty.textContent =
                '还没有已学咒语。课堂、自学和实验都会写入这里。';
            ledger.append(empty);
        } else {
            [
                ...knownById
                    .values(),
            ]
                .sort((left, right) =>
                    right
                        .proficiencyXp -
                    left
                        .proficiencyXp)
                .forEach(entry => {
                    const spell =
                        getSpellDefinition(
                            entry.spellId,
                        );
                    if (!spell) {
                        return;
                    }
                    const rank =
                        getSpellProficiency(
                            entry
                                .proficiencyXp,
                        );
                    const card =
                        document.createElement(
                            'article',
                        );
                    const heading =
                        document.createElement(
                            'header',
                        );
                    const title =
                        document.createElement(
                            'strong',
                        );
                    const use =
                        document.createElement(
                            'button',
                        );
                    const detail =
                        document.createElement(
                            'p',
                        );
                    const meta =
                        document.createElement(
                            'small',
                        );
                    title.textContent =
                        spell.incantation;
                    use.type =
                        'button';
                    use.textContent =
                        '插入';
                    use.addEventListener(
                        'click',
                        () =>
                            setComposerSpell(
                                spell.id,
                            ),
                    );
                    detail.textContent =
                        `${spell.name} · ${spell.effect}`;
                    meta.textContent = [
                        rank.label,
                        `${
                            entry
                                .proficiencyXp
                        } XP`,
                        SPELL_LEARNING_SOURCE_LABELS[
                            entry
                                .learnedSource
                        ] ||
                        entry
                            .learnedSource,
                        `尝试 ${
                            entry.attempts
                        } 次`,
                    ].join(' · ');
                    heading.append(
                        title,
                        use,
                    );
                    card.append(
                        heading,
                        detail,
                        meta,
                    );
                    ledger.append(card);
                });
        }
        inspectorElement.append(
            createInspectorCard(
                '已学咒语',
                ledger,
            ),
        );
        inspectorElement.append(
            createInspectorCard(
                '学习规则',
                createList([
                    {
                        label:
                            '课程年级仅供参考',
                        detail:
                            '不会阻断自学、私授或自行实验。',
                    },
                    {
                        label:
                            '所有结构化施法必定骰点',
                        detail:
                            '成功、失败和重大成功都会改变熟练度。',
                    },
                ]),
            ),
        );
        return;
    }

    const map = {
        clues: ['线索', state.clues.filter(clue => clue.discovered === true)],
        status: ['状态', state.status],
        items: ['物品', state.items],
    };
    const [title, entries] = map[tab] ?? map.clues;
    inspectorElement.append(createInspectorCard(title, createList(entries)));
    if (tab === 'status') {
        const knowledge = state.knowledgeBase || {};
        const counts = knowledge.categories || {};
        inspectorElement.append(createInspectorCard('本地世界档案', createList([
            {
                label: knowledge.vectorStatus === 'ready' ? 'RAG 索引就绪' : 'RAG 索引待同步',
                detail: `人物 ${counts.actors || 0} · 场景 ${counts.scenes || 0} · 事件 ${counts.events || 0} · 线索 ${counts.clues || 0}`,
            },
            {
                label: '本地目录',
                detail: knowledge.rootPath || '首次同步后生成',
            },
        ])));
    }
}

function renderAll() {
    if (!root || root.hidden) {
        return;
    }
    if (activeScreen === 'home' || activeScreen === 'setup') {
        return;
    }
    if (!isGameStarted()) {
        setAppScreen('home');
        return;
    }
    renderHeaderAndScene();
    renderStory();
    syncComposerState(getWorldState());
    renderComposerSpellPreview();
    const activeTab = selectedActorId
        ? 'actor'
        : root.querySelector('[data-hpmud-tab].active')?.dataset.hpmudTab || 'character';
    renderInspector(activeTab);
    void relationshipGraphController?.refresh();
}

async function requestTranslation(
    text,
    provider = getSettings().translationProvider,
    {
        unload = true,
        glossary = [],
    } = {},
) {
    const resolvedProvider =
        normalizeTranslationProvider(provider);
    if (resolvedProvider === 'off') {
        return String(text || '');
    }
    const endpoint =
        resolvedProvider ===
            'local'
            ? '/api/hogwarts-mud/local/translate'
            : `/api/translate/${resolvedProvider}`;
    const response = await fetch(
        endpoint,
        {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                text,
                lang: getSettings().targetLanguage,
                source: 'en',
                unload,
                glossary,
            }),
        },
    );
    if (!response.ok) {
        throw new Error(
            `${resolvedProvider} translation returned ${response.status}`,
        );
    }
    return response.text();
}

async function translateWithProvider(
    text,
    provider = getSettings().translationProvider,
) {
    const resolvedProvider =
        normalizeTranslationProvider(provider);
    const glossary = getTranslationGlossary();
    const nameGlossary =
        getLocalTranslationNameGlossary();
    const protectedText =
        resolvedProvider ===
            'local'
            ? String(text || '')
            : protectTranslationTerms(
                text,
                glossary,
            );
    const chunks = splitTranslationChunks(
        protectedText,
        resolvedProvider === 'bing'
            ? 900
            : resolvedProvider ===
                'local'
                ? 3600
                : 4700,
    );
    const translated = [];
    for (
        let index = 0;
        index < chunks.length;
        index++
    ) {
        const chunkGlossary =
            resolvedProvider ===
                'local'
                ? selectLocalTranslationGlossary(
                    chunks[index],
                    glossary,
                )
                : [];
        const prelocalizedGlossary =
            resolvedProvider ===
                'local'
                ? selectLocalTranslationGlossary(
                    chunks[index],
                    nameGlossary,
                )
                : [];
        translated.push(
            await requestTranslation(
                resolvedProvider ===
                    'local'
                    ? applyTranslationGlossaryTargets(
                        chunks[index],
                        prelocalizedGlossary,
                    )
                    : chunks[index],
                resolvedProvider,
                {
                    unload:
                        index ===
                        chunks.length -
                            1,
                    glossary:
                        chunkGlossary,
                },
            ),
        );
    }
    const joined =
        translated.join('\n\n');
    return resolvedProvider ===
        'local'
        ? joined
        : restoreTranslationTerms(
            joined,
            glossary,
        );
}

function updateNativeMessageBlock(messageId, message) {
    if (document.querySelector(`#chat .mes[mesid="${Number(messageId)}"]`)) {
        updateMessageBlock(messageId, message);
    }
}

async function translateMessage(
    messageId,
    {
        force = false,
    } = {},
) {
    if (automaticModelWorkSuppressed) {
        return;
    }
    const settings = getSettings();
    if (!settings.translationEnabled) {
        return;
    }
    const provider =
        settings.translationProvider;
    const context = getContext();
    const message = context.chat[messageId];
    if (!message || message.is_user || message.is_system || !message.mes) {
        return;
    }

    message.extra = message.extra && typeof message.extra === 'object' ? message.extra : {};
    if (!shouldTranslateToChinese(message.mes)) {
        if (message.extra.hogwartsMud?.sourceEn !== message.mes) {
            delete message.extra.hogwartsMud;
            delete message.extra.display_text;
            await context.saveChat();
            updateNativeMessageBlock(messageId, message);
            scheduleRender();
        }
        return;
    }
    const existing = message.extra.hogwartsMud;
    if (!force &&
        existing?.sourceEn === message.mes &&
        existing?.translatedZh &&
        existing?.provider === provider &&
        existing?.translationVersion === TRANSLATION_FORMAT_VERSION) {
        if (message.extra.display_text !== existing.translatedZh) {
            message.extra.display_text = existing.translatedZh;
            await context.saveChat();
            updateNativeMessageBlock(messageId, message);
            scheduleRender();
        }
        return;
    }
    if (translationJobs.has(messageId)) {
        return translationJobs.get(messageId);
    }

    const job = (async () => {
        try {
            const segments = message.extra.hogwartsMud?.segments;
            let translatedZh;
            if (Array.isArray(segments) && segments.length) {
                const transaction = message.extra.hogwartsMud?.turnTransaction;
                const localizedTransaction = transaction &&
                    !force
                    ? await localizeTurnTransaction(transaction)
                    : null;
                const localizedSegments = localizedTransaction?.segments ||
                    (await translateOpeningValues(
                        segments.map(segment => segment.textEn),
                    )).map((textZh, index) => ({
                        ...segments[index],
                        textZh,
                    }));
                translatedZh = composeSceneSegments(
                    localizedSegments,
                    [
                        ...(
                            getMudState()
                                ?.actorLibrary ||
                            []
                        ),
                        ...(
                            getMudState()
                                ?.actors ||
                            []
                        ),
                    ],
                    'zh',
                );
                message.extra.hogwartsMud = {
                    ...message.extra.hogwartsMud,
                    sourceEn: message.mes,
                    translatedZh,
                    provider,
                    translatedAt: Date.now(),
                    translationVersion: TRANSLATION_FORMAT_VERSION,
                    segments: localizedSegments,
                    ...(localizedTransaction
                        ? { turnTransaction: localizedTransaction }
                        : {}),
                };
            } else {
                translatedZh =
                    await translateWithProvider(
                        message.mes,
                        provider,
                    );
                message.extra.hogwartsMud = {
                    ...message.extra.hogwartsMud,
                    sourceEn: message.mes,
                    translatedZh,
                    provider,
                    translatedAt: Date.now(),
                    translationVersion: TRANSLATION_FORMAT_VERSION,
                };
            }
            message.extra.display_text = translatedZh;
            const swipeId = Number(message.swipe_id || 0);
            const activeSwipe = message.swipe_info?.[swipeId];
            if (activeSwipe?.extra && message.swipes?.[swipeId] === message.mes) {
                activeSwipe.extra = {
                    ...activeSwipe.extra,
                    hogwartsMud: structuredClone(message.extra.hogwartsMud),
                    display_text: translatedZh,
                };
            }
            await context.saveChat();
            updateNativeMessageBlock(messageId, message);
        } catch (error) {
            console.error('[Hogwarts MUD] Translation failed', error);
            message.extra.hogwartsMud = {
                ...message.extra.hogwartsMud,
                sourceEn: message.mes,
                error: String(error?.message || error),
                provider,
            };
            await context.saveChat();
        } finally {
            translationJobs.delete(messageId);
            scheduleRender();
        }
    })();

    translationJobs.set(messageId, job);
    scheduleRender();
    return job;
}

async function translateExistingMessages() {
    if (automaticModelWorkSuppressed) {
        return;
    }
    const context = getContext();
    const state =
        getMudState();
    const startIndex =
        Math.max(
            0,
            Number(
                state?.scene
                    ?.startedMessageId ??
                0,
            ),
            context.chat.length -
                12,
        );
    for (
        let index = startIndex;
        index <
            context.chat.length;
        index++
    ) {
        await translateMessage(index);
    }
}

async function translateCurrentStateAndLatestArchive() {
    const context =
        getContext();
    const state =
        getMudState();
    if (
        !state ||
        !getSettings()
            .translationEnabled
    ) {
        return;
    }
    const values = [];
    const setters = [];
    const add = (
        value,
        setter,
    ) => {
        if (
            String(
                value || '',
            ).trim()
        ) {
            values.push(value);
            setters.push(setter);
        }
    };
    const scene =
        state.scene;
    if (scene) {
        add(
            scene.nameEn,
            value => {
                scene.name =
                    value;
            },
        );
        add(
            scene.summaryEn,
            value => {
                scene.summary =
                    value;
            },
        );
        add(
            scene.explorationHookEn,
            value => {
                scene.explorationHook =
                    value;
            },
        );
        add(
            scene.crowdDirectionEn,
            value => {
                scene.crowdDirection =
                    value;
            },
        );
        const intent =
            scene.nextSceneIntent;
        if (intent) {
            add(
                intent.titleEn,
                value => {
                    intent.title =
                        value;
                },
            );
            add(
                intent.summaryEn,
                value => {
                    intent.summary =
                        value;
                },
            );
            add(
                intent.triggerEn,
                value => {
                    intent.trigger =
                        value;
                },
            );
        }
    }
    (
        state.actors ||
        []
    )
        .filter(actor =>
            actor.present !==
                false)
        .forEach(actor =>
            add(
                actor
                    .currentActivityEn,
                value => {
                    actor.currentActivity =
                        value;
                },
            ));
    const archive =
        state.sceneArchive
            ?.at(-1);
    if (archive) {
        archive.unresolvedThreads ??=
            [];
        add(
            archive.nameEn,
            value => {
                archive.name =
                    value;
            },
        );
        add(
            archive.summaryEn,
            value => {
                archive.summary =
                    value;
            },
        );
        add(
            archive.closureSummaryEn,
            value => {
                archive.closureSummary =
                    value;
            },
        );
        add(
            archive.authorQuillEn,
            value => {
                archive.authorQuill =
                    value;
            },
        );
        (
            archive
                .unresolvedThreadsEn ||
            []
        ).forEach(
            (thread, index) =>
                add(
                    thread,
                    value => {
                        archive
                            .unresolvedThreads[
                                index
                            ] = value;
                    },
                ),
        );
    }
    if (!values.length) {
        return;
    }
    const translated =
        await translateOpeningValues(
            values,
        );
    translated.forEach(
        (value, index) =>
            setters[index](
                value,
            ),
    );
    if (
        scene &&
        scene.timelineEntries
            ?.length === 1
    ) {
        scene.timelineEntries[0]
            .label =
            scene.summary ||
            scene.summaryEn;
    }
    if (archive) {
        archive.translationProvider =
            getSettings()
                .translationProvider;
        archive.translationVersion =
            TRANSLATION_FORMAT_VERSION;
        archive.translatedAt =
            Date.now();
    }
    await context.saveMetadata();
    renderAll();
}

async function refreshTranslationsForProvider() {
    await translateCurrentStateAndLatestArchive();
    await translateExistingMessages();
}

async function clearDisplayTranslations() {
    const context = getContext();
    let changed = false;
    context.chat.forEach((message, messageId) => {
        if (!message.extra?.hogwartsMud) {
            return;
        }
        delete message.extra.display_text;
        updateNativeMessageBlock(messageId, message);
        changed = true;
    });
    if (changed) {
        await context.saveChat();
    }
    scheduleRender();
}

function insertAtCursor(text, caretOffset = text.length) {
    const start = composerInput.selectionStart ?? composerInput.value.length;
    const end = composerInput.selectionEnd ?? start;
    const before = composerInput.value.slice(0, start);
    const after = composerInput.value.slice(end);
    const separator = before && !before.endsWith('\n') ? '\n' : '';
    composerInput.value = `${before}${separator}${text}${after}`;
    const caret = start + separator.length + caretOffset;
    composerInput.dispatchEvent(new Event('input'));
    composerInput.focus();
    composerInput.setSelectionRange(caret, caret);
}

function getMovementPickerOptions(
    state = getWorldState(),
) {
    const mapId =
        state.map?.activeMapId;
    const currentRoomId =
        state.map?.currentLocalNodeId;
    const map =
        getLocalMapDefinition(
            mapId,
            state.map,
        );
    if (
        !map ||
        !mapId ||
        !currentRoomId
    ) {
        return [];
    }
    const rooms = [
        ...(map.nodes || []),
        ...(state.map
            ?.generatedLocalNodes ||
            [])
            .filter(room =>
                room.mapId === mapId),
    ];
    const roomById = new Map(
        rooms.map(room => [
            room.id,
            room,
        ]),
    );
    const currentRoom =
        roomById.get(currentRoomId);
    const levels = new Map(
        (map.levels || [])
            .map((level, index) => [
                level.id,
                {
                    name:
                        level.name ||
                        level.nameEn ||
                        level.id,
                    order:
                        Number.isFinite(
                            Number(level.z),
                        )
                            ? Number(
                                level.z,
                            )
                            : index,
                },
            ]),
    );
    const discovered = new Set(
        state.map
            ?.discoveredLocalNodeIds ||
        [],
    );
    const accessLabels = {
        public: '公开区域',
        student: '学生区域',
        class: '教学区域',
        private: '私人区域',
        discovered: '已发现',
    };
    return rooms
        .filter(room =>
            room.id !== currentRoomId)
        .filter(room => {
            const access =
                String(
                    room.access ||
                    '',
                );
            const restricted =
                /^(?:private|staff|house_|forbidden|locked|restricted)/u
                    .test(access);
            return !restricted ||
                discovered.has(room.id) ||
                discovered.has(
                    `${mapId}:${room.id}`,
                );
        })
        .map(room => {
            const path =
                findLocalRoomPath(
                    mapId,
                    currentRoomId,
                    room.id,
                    state.map,
                );
            if (!path) return null;
            const level =
                levels.get(
                    room.levelId,
                ) || {
                    name:
                        room.levelId ||
                        '未分层',
                    order: 999,
                };
            const label =
                room.name ||
                room.nameEn ||
                room.id;
            return {
                id: room.id,
                label,
                nameEn:
                    room.nameEn ||
                    '',
                aliases:
                    room.aliases ||
                    [],
                kind:
                    room.kind ||
                    'room',
                accessLabel:
                    accessLabels[
                        room.access
                    ] ||
                    '可通行',
                levelId:
                    room.levelId ||
                    '',
                levelName:
                    level.name,
                levelOrder:
                    level.order,
                currentLevel:
                    room.levelId ===
                    currentRoom
                        ?.levelId,
                hops: Math.max(
                    1,
                    path.roomIds
                        .length - 1,
                ),
            };
        })
        .filter(Boolean)
        .sort((left, right) =>
            Number(
                right.currentLevel,
            ) -
                Number(
                    left.currentLevel,
                ) ||
            left.levelOrder -
                right.levelOrder ||
            left.hops - right.hops ||
            left.label.localeCompare(
                right.label,
                'zh-CN',
            ));
}

function closeMovementPicker() {
    const panel =
        root.querySelector(
            '#hpmud_movement_panel',
        );
    const button =
        root.querySelector(
            '#hpmud_insert_movement',
        );
    panel.hidden = true;
    root.classList.remove(
        'movement-picker-open',
    );
    button.setAttribute(
        'aria-expanded',
        'false',
    );
}

function setComposerMovementDestination(
    destinationLabel,
) {
    const marker =
        `→【${destinationLabel}】`;
    const currentValue =
        composerInput.value;
    const directive =
        parseExplicitMovementDirective(
            currentValue,
        );
    if (directive) {
        composerInput.value =
            currentValue.slice(
                0,
                directive.start,
            ) +
            marker +
            currentValue.slice(
                directive.end,
            );
        composerInput.dispatchEvent(
            new Event('input'),
        );
        const caret =
            directive.start +
            marker.length;
        composerInput.focus();
        composerInput.setSelectionRange(
            caret,
            caret,
        );
    } else {
        insertAtCursor(marker);
    }
    closeMovementPicker();
}

function renderMovementPicker(
    query = '',
) {
    const state =
        getWorldState();
    const options =
        getMovementPickerOptions(
            state,
        );
    const normalizedQuery =
        String(query || '')
            .normalize('NFKC')
            .trim()
            .toLocaleLowerCase();
    const visibleOptions =
        normalizedQuery
            ? options.filter(option =>
                [
                    option.label,
                    option.nameEn,
                    option.id,
                    option.levelName,
                    ...option.aliases,
                ]
                    .join(' ')
                    .normalize('NFKC')
                    .toLocaleLowerCase()
                    .includes(
                        normalizedQuery,
                    ))
            : options;
    const origin =
        root.querySelector(
            '#hpmud_movement_origin',
        );
    origin.textContent = [
        getRoomName(
            state,
            state.map?.activeMapId,
            state.map
                ?.currentLocalNodeId,
        ),
        `${visibleOptions.length} 个地点`,
    ].join(' · ');
    const container =
        root.querySelector(
            '#hpmud_movement_options',
        );
    container.replaceChildren();
    if (!visibleOptions.length) {
        const empty =
            document.createElement(
                'div',
            );
        empty.className =
            'hpmud-movement-empty';
        empty.textContent =
            normalizedQuery
                ? '没有匹配的可达地点'
                : '当前没有可达地点';
        container.append(empty);
        return;
    }
    const groups = new Map();
    visibleOptions.forEach(option => {
        if (!groups.has(
            option.levelId,
        )) {
            groups.set(
                option.levelId,
                {
                    name:
                        option.levelName,
                    current:
                        option
                            .currentLevel,
                    options: [],
                },
            );
        }
        groups.get(
            option.levelId,
        ).options.push(option);
    });
    groups.forEach(group => {
        const section =
            document.createElement(
                'section',
            );
        section.className =
            'hpmud-movement-group';
        const heading =
            document.createElement(
                'header',
            );
        const name =
            document.createElement(
                'strong',
            );
        const count =
            document.createElement(
                'small',
            );
        name.textContent =
            group.current
                ? `${group.name} · 当前层`
                : group.name;
        count.textContent =
            `${group.options.length}`;
        heading.append(name, count);
        section.append(heading);
        group.options.forEach(option => {
            const button =
                document.createElement(
                    'button',
                );
            button.type = 'button';
            button.className =
                'hpmud-movement-option';
            const marker =
                document.createElement(
                    'i',
                );
            const copy =
                document.createElement(
                    'span',
                );
            const title =
                document.createElement(
                    'strong',
                );
            const meta =
                document.createElement(
                    'small',
                );
            marker.textContent = '→';
            title.textContent =
                option.label;
            meta.textContent = [
                option.accessLabel,
                `${option.hops} 段路径`,
                option.id,
            ].join(' · ');
            copy.append(title, meta);
            button.append(
                marker,
                copy,
            );
            button.addEventListener(
                'click',
                () =>
                    setComposerMovementDestination(
                        option.label,
                    ),
            );
            section.append(button);
        });
        container.append(section);
    });
}

function openMovementPicker() {
    const panel =
        root.querySelector(
            '#hpmud_movement_panel',
        );
    const button =
        root.querySelector(
            '#hpmud_insert_movement',
        );
    const search =
        root.querySelector(
            '#hpmud_movement_search',
        );
    const opening =
        panel.hidden;
    if (!opening) {
        closeMovementPicker();
        return;
    }
    closeSpellPicker();
    search.value = '';
    renderMovementPicker();
    panel.style.left = '0px';
    panel.hidden = false;
    root.classList.add(
        'movement-picker-open',
    );
    button.setAttribute(
        'aria-expanded',
        'true',
    );
    const rect =
        panel.getBoundingClientRect();
    const viewportPadding = 12;
    let offset = 0;
    if (
        rect.right >
        window.innerWidth -
            viewportPadding
    ) {
        offset -=
            rect.right -
            (
                window.innerWidth -
                viewportPadding
            );
    }
    if (
        rect.left + offset <
        viewportPadding
    ) {
        offset +=
            viewportPadding -
            (
                rect.left +
                offset
            );
    }
    panel.style.left =
        `${offset}px`;
    search.focus();
}

function getKnownSpellMap(
    state = getWorldState(),
) {
    return new Map(
        (
            state.spellbook
                ?.known ||
            []
        ).map(entry => [
            entry.spellId,
            entry,
        ]),
    );
}

function getSpellProgressPercent(
    entry,
) {
    if (!entry) {
        return 0;
    }
    const current =
        getSpellProficiency(
            entry.proficiencyXp,
        );
    const ranks = [
        {
            minimumXp: 0,
        },
        {
            minimumXp: 20,
        },
        {
            minimumXp: 60,
        },
        {
            minimumXp: 140,
        },
        {
            minimumXp: 300,
        },
    ];
    const currentIndex =
        ranks.findIndex(rank =>
            rank.minimumXp ===
            current.minimumXp);
    const next =
        ranks[
            currentIndex + 1
        ];
    if (!next) {
        return 100;
    }
    const span =
        next.minimumXp -
        current.minimumXp;
    return Math.max(
        4,
        Math.min(
            100,
            Math.round(
                (
                    (
                        entry
                            .proficiencyXp -
                        current
                            .minimumXp
                    ) /
                    span
                ) *
                    100,
            ),
        ),
    );
}

function closeSpellPicker() {
    const panel =
        root.querySelector(
            '#hpmud_spell_panel',
        );
    const button =
        root.querySelector(
            '#hpmud_insert_spell',
        );
    if (
        !panel ||
        !button
    ) {
        return;
    }
    panel.hidden = true;
    button.setAttribute(
        'aria-expanded',
        'false',
    );
}

function getSpellCastTemplate(
    spell,
) {
    const marker =
        createSpellDirective(
            spell.id,
        );
    const needsTarget =
        [
            'person',
            'creature',
            'object',
            'effect',
        ].includes(
            spell.target,
        );
    const targetText =
        needsTarget
            ? '对准目标，'
            : '';
    const text =
        `${marker} *我举起魔杖，${targetText}念出：“${spell.incantation}！”*`;
    return {
        text,
        selection:
            needsTarget
                ? {
                    start:
                        text.indexOf(
                            '目标',
                        ),
                    end:
                        text.indexOf(
                            '目标',
                        ) +
                        2,
                }
                : null,
    };
}

function setComposerSpell(
    spellId,
) {
    const spell =
        getSpellDefinition(
            spellId,
        );
    if (!spell) {
        return;
    }
    const template =
        getSpellCastTemplate(
            spell,
        );
    const existing =
        parseSpellCastDirectives(
            composerInput.value,
        )[0];
    if (existing) {
        const lineStart =
            composerInput.value
                .lastIndexOf(
                    '\n',
                    existing.index,
                ) +
            1;
        const nextBreak =
            composerInput.value
                .indexOf(
                    '\n',
                    existing.index,
                );
        const lineEnd =
            nextBreak < 0
                ? composerInput
                    .value
                    .length
                : nextBreak;
        composerInput.value =
            composerInput.value.slice(
                0,
                lineStart,
            ) +
            template.text +
            composerInput.value.slice(
                lineEnd,
            );
        composerInput.dispatchEvent(
            new Event('input'),
        );
        if (
            template.selection
        ) {
            composerInput.setSelectionRange(
                lineStart +
                    template
                        .selection
                        .start,
                lineStart +
                    template
                        .selection
                        .end,
            );
        }
    } else {
        const insertionStart =
            composerInput
                .selectionStart ??
            composerInput.value
                .length;
        const before =
            composerInput.value
                .slice(
                    0,
                    insertionStart,
                );
        const separator =
            before &&
            !before.endsWith(
                '\n',
            )
                ? '\n'
                : '';
        insertAtCursor(
            template.text,
        );
        if (
            template.selection
        ) {
            const start =
                insertionStart +
                separator.length +
                template
                    .selection
                    .start;
            composerInput.setSelectionRange(
                start,
                start +
                    2,
            );
        }
    }
    composerInput.focus();
    closeSpellPicker();
}

function renderSpellPicker(
    query = '',
) {
    const state =
        getWorldState();
    const knownById =
        getKnownSpellMap(
            state,
        );
    const normalizedQuery =
        String(query || '')
            .normalize('NFKC')
            .trim()
            .toLocaleLowerCase();
    const source =
        spellPickerShowAll
            ? SPELL_CATALOG
            : SPELL_CATALOG
                .filter(spell =>
                    knownById.has(
                        spell.id,
                    ));
    const visible =
        source
            .filter(spell =>
                !normalizedQuery ||
                [
                    spell.incantation,
                    spell.name,
                    spell.nameEn,
                    spell.effect,
                    spell.effectEn,
                    spell.id,
                ]
                    .join(' ')
                    .normalize(
                        'NFKC',
                    )
                    .toLocaleLowerCase()
                    .includes(
                        normalizedQuery,
                    ))
            .sort((left, right) =>
                Number(
                    !knownById.has(
                        left.id,
                    ),
                ) -
                    Number(
                        !knownById.has(
                            right.id,
                        ),
                    ) ||
                left.curriculumYear -
                    right.curriculumYear ||
                left.incantation
                    .localeCompare(
                        right.incantation,
                    ));
    const title =
        root.querySelector(
            '#hpmud_spell_panel_title',
        );
    const count =
        root.querySelector(
            '#hpmud_spell_count',
        );
    const toggle =
        root.querySelector(
            '#hpmud_spell_show_all',
        );
    title.textContent =
        spellPickerShowAll
            ? '全部常见咒语'
            : '已学咒语';
    count.textContent =
        `${visible.length} 个 · 年级不限制学习`;
    toggle.textContent =
        spellPickerShowAll
            ? '只看已学咒语'
            : '尝试未学咒语';
    const container =
        root.querySelector(
            '#hpmud_spell_options',
        );
    container.replaceChildren();
    if (!visible.length) {
        const empty =
            document.createElement(
                'div',
            );
        empty.className =
            'hpmud-spell-empty';
        empty.textContent =
            spellPickerShowAll
                ? '没有匹配的咒语'
                : '尚未学会咒语；可以切换到全部目录进行自学或实验。';
        container.append(empty);
        return;
    }
    visible.forEach(spell => {
        const learned =
            knownById.get(
                spell.id,
            );
        const rank =
            learned
                ? getSpellProficiency(
                    learned
                        .proficiencyXp,
                )
                : null;
        const button =
            document.createElement(
                'button',
            );
        button.type = 'button';
        button.className =
            'hpmud-spell-option';
        const copy =
            document.createElement(
                'span',
            );
        const name =
            document.createElement(
                'strong',
            );
        const meta =
            document.createElement(
                'small',
            );
        const badge =
            document.createElement(
                'em',
            );
        const progress =
            document.createElement(
                'span',
            );
        const fill =
            document.createElement(
                'i',
            );
        progress.className =
            'hpmud-spell-progress';
        name.textContent =
            `${spell.incantation} · ${spell.name}`;
        meta.textContent = [
            spell.effect,
            learned
                ? SPELL_LEARNING_SOURCE_LABELS[
                    learned
                        .learnedSource
                ] ||
                learned.learnedSource
                : '未学 · 可直接实验',
            spell.curriculumYear >
                0
                ? `常规课程 ${spell.curriculumYear} 年级`
                : '非标准课程',
        ].join(' · ');
        badge.textContent =
            learned
                ? `${rank.label} · ${learned.proficiencyXp} XP`
                : '未学 · 难度 +2';
        fill.style.width =
            `${
                getSpellProgressPercent(
                    learned,
                )
            }%`;
        copy.append(
            name,
            meta,
        );
        progress.append(fill);
        button.append(
            copy,
            badge,
            progress,
        );
        button.addEventListener(
            'click',
            () =>
                setComposerSpell(
                    spell.id,
                ),
        );
        container.append(button);
    });
}

function openSpellPicker() {
    const panel =
        root.querySelector(
            '#hpmud_spell_panel',
        );
    const button =
        root.querySelector(
            '#hpmud_insert_spell',
        );
    const search =
        root.querySelector(
            '#hpmud_spell_search',
        );
    if (!panel.hidden) {
        closeSpellPicker();
        return;
    }
    closeMovementPicker();
    spellPickerShowAll =
        false;
    search.value = '';
    renderSpellPicker();
    panel.style.left = '0px';
    panel.hidden = false;
    button.setAttribute(
        'aria-expanded',
        'true',
    );
    const rect =
        panel.getBoundingClientRect();
    const padding = 12;
    let offset = 0;
    if (
        rect.right >
        window.innerWidth -
            padding
    ) {
        offset -=
            rect.right -
            (
                window.innerWidth -
                padding
            );
    }
    if (
        rect.left + offset <
        padding
    ) {
        offset +=
            padding -
            (
                rect.left +
                offset
            );
    }
    panel.style.left =
        `${offset}px`;
    search.focus();
}

function clearComposerSpell() {
    composerInput.value =
        removeSpellCastDirectives(
            composerInput.value,
        );
    composerInput.dispatchEvent(
        new Event('input'),
    );
    composerInput.focus();
}

function renderComposerSpellPreview() {
    const preview =
        root.querySelector(
            '#hpmud_spell_preview',
        );
    const cast =
        parseSpellCastDirectives(
            composerInput.value,
        )[0];
    if (!cast) {
        preview.hidden = true;
        return;
    }
    const spell =
        getSpellDefinition(
            cast.spellId,
        );
    const learned =
        getKnownSpellMap()
            .get(
                cast.spellId,
            );
    const rank =
        learned
            ? getSpellProficiency(
                learned
                    .proficiencyXp,
            )
            : null;
    preview.querySelector(
        'strong',
    ).textContent =
        `${spell.incantation} · ${spell.name}`;
    preview.querySelector(
        'small',
    ).textContent =
        learned
            ? `${
                SPELL_LEARNING_SOURCE_LABELS[
                    learned
                        .learnedSource
                ] ||
                learned.learnedSource
            } · ${rank.label} ${
                learned.proficiencyXp
            } XP · 本回合必定进行施法检定`
            : '尚未学会 · 本次按自行实验结算 · 本回合必定进行施法检定';
    preview.hidden = false;
}

function setComposerAddressTarget(
    label,
) {
    const currentValue =
        composerInput.value;
    const selectionStart =
        composerInput.selectionStart ??
        currentValue.length;
    const selectionEnd =
        composerInput.selectionEnd ??
        selectionStart;
    const selected =
        currentValue.slice(
            selectionStart,
            selectionEnd,
        );
    const useSelection =
        Boolean(selected.trim()) &&
        !/[\r\n]/u.test(selected);
    const insertionEnd =
        useSelection
            ? selectionEnd
            : selectionStart;
    const before =
        currentValue.slice(
            0,
            selectionStart,
        );
    const after =
        currentValue.slice(
            insertionEnd,
        );
    const speech =
        useSelection
            ? selected.trim()
            : '……';
    const prefix =
        `@${label}：`;
    const block =
        `${prefix}${speech}`;
    const separatorBefore =
        before &&
        !before.endsWith('\n')
            ? '\n'
            : '';
    const separatorAfter =
        after &&
        !after.startsWith('\n')
            ? '\n'
            : '';
    composerInput.value =
        `${before}${separatorBefore}${block}${separatorAfter}${after}`;
    const blockStart =
        before.length +
        separatorBefore.length;
    const selectStart =
        blockStart +
        prefix.length;
    const selectEnd =
        selectStart +
        speech.length;
    composerInput.dispatchEvent(
        new Event('input'),
    );
    composerInput.focus();
    composerInput
        .setSelectionRange(
            selectStart,
            selectEnd,
        );
}

function clearComposerAddressTarget() {
    composerInput.value =
        stripExplicitAddressTargets(
            composerInput.value,
        );
    composerInput.dispatchEvent(
        new Event('input'),
    );
    composerInput.focus();
}

function getActiveAddressingState(state) {
    const activeIds = new Set(
        projectPeoplePanel(state)
            .activePeople
            .map(person => person.id),
    );
    return {
        ...state,
        actors: (state?.actors || [])
            .map(actor => ({
                ...actor,
                present:
                    activeIds.has(actor.id),
            })),
    };
}

function renderComposerAddressing() {
    const state = getWorldState();
    const addressing =
        resolvePlayerAddressing(
            getActiveAddressingState(
                state,
            ),
            composerInput.value,
        );
    const preview = root.querySelector(
        '#hpmud_address_preview',
    );
    const title =
        preview.querySelector('strong');
    const detail =
        preview.querySelector('small');
    preview.hidden =
        !addressing.attempted;
    preview.classList.toggle(
        'is-warning',
        !addressing.valid,
    );
    if (addressing.attempted) {
        const blockCount =
            addressing.blocks.length;
        const targetLabels = [
            ...new Set(
                addressing.blocks.map(
                    block =>
                        block.mode ===
                            'broadcast'
                            ? '全场'
                            : block
                                .targetLabel,
                ),
            ),
        ];
        title.textContent =
            addressing.valid
                ? addressing.mode ===
                    'broadcast'
                    ? blockCount > 1
                        ? `${blockCount} 段对全场发言`
                        : '对全场发言'
                    : addressing.mode ===
                        'direct'
                        ? blockCount > 1
                            ? `${blockCount} 段对 ${targetLabels[0]} 说`
                            : `对 ${targetLabels[0]} 说`
                        : `${blockCount} 段定向台词 · ${targetLabels.join(' / ')}`
                : '受话对象无效';
        detail.textContent =
            addressing.valid
                ? '以“@人物：”开头的行是台词；其他行按动作与叙述处理'
                : addressing.error;
    }

    const options = root.querySelector(
        '#hpmud_address_options',
    );
    options.replaceChildren();
    const createOption = (
        label,
        actorId = '',
    ) => {
        const button =
            document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.classList.toggle(
            'active',
            actorId
                ? addressing
                    .actorIds
                    .includes(actorId)
                : addressing.blocks
                    .some(block =>
                        block.mode ===
                            'broadcast'),
        );
        button.addEventListener(
            'click',
            () => {
                setComposerAddressTarget(
                    label,
                );
                root.querySelector(
                    '#hpmud_address_menu',
                ).removeAttribute('open');
            },
        );
        options.append(button);
    };
    createOption('全场');
    projectPeoplePanel(state)
        .activePeople
        .forEach(person => {
            const { actor, profile } =
                person;
            createOption(
                profile?.name ||
                actor?.name ||
                profile?.nameEn ||
                actor?.nameEn ||
                person.id,
                person.id,
            );
        });
}

function projectActorLibraryForContext(
    actorLibrary,
    contextPlan,
    {
        actorIds = null,
        includePrivate = true,
        includeMemories = true,
    } = {},
) {
    const allowedIds = actorIds
        ? new Set(actorIds)
        : null;
    return (actorLibrary || [])
        .filter(actor =>
            !allowedIds || allowedIds.has(actor.id))
        .map(actor => {
            const dynamic =
                normalizeActorMemoryProfile(actor);
            return {
                id: actor.id,
                nameEn: actor.nameEn,
                roleEn: actor.roleEn,
                relationshipToPlayerEn:
                    actor.relationshipToPlayerEn,
                impressionOfPlayerEn:
                    dynamic.impressionOfPlayerEn,
                publicDescriptionEn:
                    actor.publicDescriptionEn,
                publicBackgroundEn:
                    actor.publicBackgroundEn,
                personalityEn: actor.personalityEn,
                speechStyleEn: actor.speechStyleEn,
                ...(includePrivate ? {
                    privateGoalEn: actor.privateGoalEn,
                    fearEn: actor.fearEn,
                    secretEn: actor.secretEn,
                    knowledgeEn:
                        dynamic.knowledgeEn,
                } : {}),
                ...(includeMemories ? {
                    sharedMemories:
                        selectSharedMemoriesForContext(
                            dynamic.sharedMemories,
                            contextPlan,
                        ),
                } : {}),
            };
        });
}

function createDailyDirectorPrompt(
    state,
    retrievedKnowledge = [],
    contextPlan = createContextBudgetPlan(
        CONTEXT_SIZE_PRESETS.rich,
        DEFAULT_MODEL_SLOTS.medium.maxResponseLength,
    ),
) {
    const date = getWorldDate(state.clock);
    return [
        {
            role: 'system',
            content: `You are the mid-tier Daily Director for a persistent Harry Potter RPG. You are called exactly once per in-world date. Settle the previous day's character consequences and prepare today's actor guidance, clue opportunities, and time policy. Return exactly one compact JSON object with no Markdown.

Rules:
- Produce one directive for every currently present actor.
- Use actor-library private goals, fears, secrets, and knowledge boundaries.
- A revealed clue must be prewritten and must have had its unlock condition satisfied in the supplied previous-day events.
- Do not write scene prose or NPC dialogue.
- Keep ordinary turn durations at least 15 minutes. Instantaneous magic may use fewer.
- Keep every string under 20 English words. Do not restate character profiles.

Schema:
{
  "date": "YYYY-MM-DD",
  "actorDirectives": [
    {
      "id":"actor_id",
      "goalEn":"today's immediate goal",
      "moodEn":"current mood",
      "guidanceEn":"how to perform this actor today"
    }
  ],
  "revealedClueIds": ["clues actually earned yesterday"],
  "timePolicy": {
    "defaultMinutes":15,
    "movementMinutes":15,
    "investigationMinutes":30,
    "extendedActionMinutes":60,
    "instantaneousMagicMinutes":1
  }
}`,
        },
        {
            role: 'user',
            content: JSON.stringify({
                date,
                currentScene: state.scene,
                presentActors: state.actors,
                actorLibrary:
                    projectActorLibraryForContext(
                        state.actorLibrary,
                        contextPlan,
                    ),
                hiddenStoryArcs: state.storyArcs,
                discoveredClues: state.clues,
                recentTimeline: (state.timeline || []).slice(
                    -contextPlan.recentMessageLimit,
                ),
                recentMessages: getContext().chat.slice(
                    -contextPlan.recentMessageLimit,
                ).map(message => ({
                    isUser: Boolean(message.is_user),
                    text: message.mes,
                })),
                retrievedLocalKnowledge: formatRetrievedKnowledge(retrievedKnowledge),
            }),
        },
    ];
}

function validateDailyDirectorPlan(plan, state) {
    const errors = [];
    const date = getWorldDate(state.clock);
    const actorIds = new Set((state.actorLibrary || []).map(actor => actor.id));
    const presentActorIds = (state.actors || [])
        .filter(actor => actor.present !== false)
        .map(actor => actor.id);
    if (plan?.date !== date) {
        errors.push(`日计划日期必须是 ${date}。`);
    }
    const directives = Array.isArray(plan?.actorDirectives) ? plan.actorDirectives : [];
    const directiveIds = new Set(directives.map(item => item.id));
    presentActorIds.forEach(actorId => {
        if (!directiveIds.has(actorId)) {
            errors.push(`日计划缺少在场人物 ${actorId} 的指令。`);
        }
    });
    directives.forEach(item => {
        if (!actorIds.has(item.id)) {
            errors.push(`日计划引用了不存在的角色 ${item.id || '?'}。`);
        }
        for (const key of ['goalEn', 'moodEn', 'guidanceEn']) {
            if (!String(item[key] || '').trim()) {
                errors.push(`角色 ${item.id || '?'} 的日计划缺少 ${key}。`);
            }
        }
    });
    const activeArc = (state.storyArcs || []).find(arc => arc.status === 'active');
    const clueIds = new Set((activeArc?.cluePlan || []).map(clue => clue.id));
    (plan?.revealedClueIds || []).forEach(clueId => {
        if (!clueIds.has(clueId)) {
            errors.push(`日结试图揭示未预写线索 ${clueId || '?'}。`);
        }
    });
    const policy = plan?.timePolicy || {};
    for (const key of [
        'defaultMinutes',
        'movementMinutes',
        'investigationMinutes',
        'extendedActionMinutes',
        'instantaneousMagicMinutes',
    ]) {
        if (!Number.isInteger(Number(policy[key])) || Number(policy[key]) < 0) {
            errors.push(`日计划时间规则 ${key} 无效。`);
        }
    }
    return { valid: errors.length === 0, errors };
}

async function generateDailyDirectorPlan(
    roleSlot,
    state,
    retrievedKnowledge,
    contextPlan,
) {
    let response = await sendRoleRequest(
        roleSlot,
        createDailyDirectorPrompt(
            state,
            retrievedKnowledge,
            contextPlan,
        ),
        { json: true },
    );
    let raw = extractRoleResponseText(response);
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const plan = parseJsonObject(raw);
            const validation = validateDailyDirectorPlan(plan, state);
            if (!validation.valid) {
                throw new Error(validation.errors.join('；'));
            }
            return plan;
        } catch (error) {
            lastError = error;
            if (attempt > 0) break;
            response = await sendRoleRequest(roleSlot, [
                {
                    role: 'system',
                    content: 'Repair the compact daily-director JSON. Keep the supplied date, include every present actor exactly once, use only prewritten clue IDs, and provide a complete timePolicy. Output no dialogue or scene prose.',
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        validationError: String(error?.message || error),
                        invalidOutput: typeof raw === 'string' ? raw : JSON.stringify(raw),
                        requiredSchema:
                            createDailyDirectorPrompt(
                                state,
                                retrievedKnowledge,
                                contextPlan,
                            )[0].content,
                    }),
                },
            ], { json: true });
            raw = extractRoleResponseText(response);
        }
    }
    throw new Error(`中档日计划连续两次无效：${String(lastError?.message || lastError)}`);
}

async function ensureDailyDirectorPlan() {
    let state = getMudState();
    const date = getWorldDate(state?.clock);
    if (!date || state?.phase !== 'playing') {
        return;
    }
    if (isDailyDirectorPlanCurrent(state.clock, state.dailyDirector)) {
        return;
    }
    if (dailyDirectorPromise) {
        return dailyDirectorPromise;
    }

    dailyDirectorPromise = (async () => {
        const context = getContext();
        state = getMudState();
        state.dailyDirector = {
            date,
            status: 'building',
            error: '',
            plan: null,
            settledAt: null,
        };
        await context.saveMetadata();
        renderAll();
        try {
            const slots = resolveRoleSlots(state.modelSlots);
            const contextPlan =
                createContextBudgetPlan(
                    slots.medium.contextSize,
                    slots.medium.maxResponseLength,
                );
            const entityIds = [
                state.scene?.id,
                state.map?.currentLocalNodeId,
                ...(state.actors || []).filter(actor => actor.present !== false).map(actor => actor.id),
            ].filter(Boolean);
            const retrievedKnowledge = await retrieveLocalKnowledge(
                `Daily plan for ${date}. ${state.scene?.summaryEn || state.scene?.summary || ''}`,
                entityIds,
                {
                    includeLockedClues: true,
                    limit: contextPlan.ragLimit,
                },
            );
            const plan = await generateDailyDirectorPlan(
                slots.medium,
                state,
                retrievedKnowledge,
                contextPlan,
            );
            state = getMudState();
            const activeArc = (state.storyArcs || []).find(arc => arc.status === 'active');
            const cluePlan = new Map((activeArc?.cluePlan || []).map(clue => [clue.id, clue]));
            const existingClueIds = new Set((state.clues || []).map(clue => clue.id));
            const revealed = (plan.revealedClueIds || [])
                .filter(clueId => cluePlan.has(clueId) && !existingClueIds.has(clueId))
                .map(clueId => {
                    const clue = cluePlan.get(clueId);
                    return {
                        id: clue.id,
                        labelEn: clue.labelEn,
                        detailEn: clue.playerFacingDiscoveryEn,
                        label: clue.labelEn,
                        detail: clue.playerFacingDiscoveryEn,
                        discovered: true,
                        discoveredAt: state.clock,
                    };
                });
            state.clues = [...(state.clues || []), ...revealed];
            state.storyArcs = (state.storyArcs || []).map(arc => arc.id === activeArc?.id ? {
                ...arc,
                revealedClueIds: [...new Set([
                    ...(arc.revealedClueIds || []),
                    ...revealed.map(clue => clue.id),
                ])],
            } : arc);
            const directives = new Map(plan.actorDirectives.map(item => [item.id, item]));
            state.actors = (state.actors || []).map(actor => {
                const directive = directives.get(actor.id);
                return directive ? {
                    ...actor,
                    currentIntentEn: directive.goalEn,
                    currentIntent: directive.goalEn,
                } : actor;
            });
            state.dailyDirector = {
                date,
                status: 'ready',
                error: '',
                plan,
                settledAt: new Date().toISOString(),
            };
            await context.saveMetadata();
            applySystemPrompt();
            renderAll();
            await syncLocalKnowledge();
        } catch (error) {
            state = getMudState();
            state.dailyDirector = {
                date,
                status: 'failed',
                error: String(error?.cause?.message || error?.message || error),
                plan: null,
                settledAt: null,
            };
            await context.saveMetadata();
            renderAll();
            throw error;
        }
    })().finally(() => {
        dailyDirectorPromise = null;
    });
    return dailyDirectorPromise;
}

function buildPacingActorSelectionPolicy(
    state,
    pacingSignals,
) {
    const recentPlayerTurns =
        getContext().chat
            .filter(message =>
                message.is_user)
            .slice(-16)
            .map(message => {
                const addressing =
                    message.extra
                        ?.hogwartsMud
                        ?.addressing ||
                    {};
                const actorIds =
                    Array.isArray(
                        addressing
                            .actorIds,
                    )
                        ? addressing
                            .actorIds
                        : (
                            addressing
                                .blocks ||
                            []
                        )
                            .map(block =>
                                block
                                    .targetActorId)
                            .filter(Boolean);
                return {
                    actorIds,
                    sceneId:
                        message.extra
                            ?.hogwartsMud
                            ?.sceneId ||
                        '',
                };
            });
    return buildActorSelectionPolicy(
        state,
        pacingSignals
            .selectionPlayerAction ||
        pacingSignals
            .playerAction ||
        '',
        recentPlayerTurns,
        pacingSignals
            .currentAddressing ||
        null,
    );
}

function createPacingDirectorPrompt(
    state,
    pacingSignals,
    retrievedKnowledge = [],
    contextPlan = createContextBudgetPlan(
        CONTEXT_SIZE_PRESETS.rich,
        DEFAULT_MODEL_SLOTS.medium.maxResponseLength,
    ),
) {
    const presentActorIds = new Set(
        (state.actors || [])
            .filter(actor => actor.present !== false)
            .map(actor => actor.id),
    );
    const actorSelectionPolicy =
        buildPacingActorSelectionPolicy(
            state,
            pacingSignals,
        );
    const metActorIds =
        new Set(
            actorSelectionPolicy
                .metActorIds,
        );
    const absentActorIds =
        state.actorLibrary
            .filter(actor =>
                !presentActorIds
                    .has(actor.id))
            .map(actor =>
                actor.id);
    const knownAbsentActorIds =
        absentActorIds.filter(actorId =>
            metActorIds.has(actorId));
    const unmetAbsentActorIds =
        absentActorIds.filter(actorId =>
            !metActorIds.has(actorId));
    return [
        {
            role: 'system',
            content: `You are the mid-tier Pacing Director and Causal Collapse Resolver for a persistent Harry Potter RPG. You are called when local pacing signals detect repetition, drift, or a first meaningful observation of an unresolved person, location, or item. Diagnose the scene and return exactly one compact JSON object with no Markdown.

${CANON_CAST_IDENTITY_CONTRACT}

Authority and limits:
- This is not a daily plan and not scene prose. Do not write dialogue.
- Prefer a concrete turn when the same core cast or pressure has repeated.
- When pacingSignals.reasons includes causal_collapse_opportunity, first try to bind one previously unobserved but logically compatible fact. The player's observation triggers materialization, but the fact must have existed in world time before the current observation.
- A causal fact may be an ordinary social edge, offscreen event, institutional fact, material history, obligation, or rumor route. It must not contradict prior dialogue, observed space, actor knowledge, time, map state, or existing causalCollapseRecords.
- Bind only reversible medium-tier facts. Blood relations, major identities, deaths, permanent injuries, successful major crimes, Canon rewrites, and irreversible consequences require the high tier and cannot be materialized here.
- Causal collapse uses aftermath-first presentation. Provide physical, social, or institutional residues for the low tier to show; do not put the hidden explanation into beatEn or pressureEn.
- Use existing actor and item IDs only. causalCollapse cannot create a new actor.
- If no natural fact passes compatibility, return one ordinary environmental_hook, minor_mishap, complication, or existing_actor_action in the same response with causalCollapse null. Do not hold and do not request another model call.
- Apply actorSelectionPolicy in this exact descending order: explicitActorIds from the current turn; pursuedActorIds from sustained player attention; actors causally required by unresolved events; the current social-stage new/familiar quota; ordinary familiar recall. A lower tier must never displace a plausible higher-tier actor.
- exploration means the player is still discovering the social world. After higher priorities are satisfied, prefer one plausible unmetAvailableActor or a new public guest over an ordinary knownAbsentActor. Generic familiar recall is limited to actorSelectionPolicy.stageQuota.genericFamiliarRecallBudget.
- circle_formation balances unmet and familiar actors according to stageQuota. socially_stable may prefer knownAbsentActors, while preserving the supplied new-actor share across scenes.
- A known absent actor may always return early when explicitly named, pursued, causally required, or carrying a live unresolved thread. The social stage never blocks such a return.
- kind new_actor is reserved for an unmetAvailableActor or a genuinely new guestActor. A returning knownAbsentActor uses kind existing_actor_action. Use mixed only when both categories participate. A familiar return does not satisfy the social-stage new-actor share.
- explicitCanonCandidates are user-named Canon characters. When one is plausible at the current time and place, reference its stable ID in actorEntrances; normalization will promote it without inventing a duplicate.
- When pacingSignals.reasons includes explicit_canon_actor_request, do not hold. Admit the plausible selected Canon candidate with its supplied stable ID; if the candidate is genuinely impossible at this time or place, use a concrete non-actor intervention rather than inventing a duplicate.
- New people must be plausible for the current room, age context, and activity. A public guest has no secret, hidden relationship, private lore, special power, or permanent plot authority.
- guestActor.publicDescriptionEn must contain only stable physical traits. Never put clothes, accessories, held items, nearby belongings, furniture, pose, activity, or location into it; currentActivityEn carries activity and the material observer records dynamic presentation.
- You may foreground one supplied active story arc through observable pressure, but never invent or reveal a hidden truth or locked clue.
- You may create an immediate public complication, but not a permanent consequence, new map, item, spell, relationship, or canon rewrite.
- The intervention will be binding for the next low-tier performance. Keep it playable and stop before the player chooses a response.
- Use hold when the current interaction still has meaningful unused pressure, except when causal_collapse_opportunity is active.
- Keep diagnosisEn, beatEn, pressureEn, and actor activities under 45 English words each.

Schema:
{
  "decision": "hold|intervene",
  "diagnosisEn": "brief meta diagnosis",
  "reassessAfterTurns": 2,
  "intervention": null
}

For intervene, intervention must be:
{
  "kind": "new_actor|causal_collision|environmental_hook|minor_mishap|existing_actor_action|complication|main_arc|mixed",
  "timing": "this_turn",
  "beatEn": "observable event the low tier must realize",
  "pressureEn": "immediate public pressure requiring player response",
  "arcId": "existing_active_arc_id_or_empty",
  "actorEntrances": [
    {
      "id": "existing_absent_actor_id",
      "currentActivityEn": "observable entrance activity"
    }
  ],
  "guestActor": null,
  "causalCollapse": null
}

For a bound causal fact, use kind causal_collision and causalCollapse:
{
  "kind": "social_edge|offscreen_event|institutional_fact|material_history|obligation|rumor_route",
  "focusActorId": "existing_focus_actor_id_or_empty",
  "relatedActorIds": ["existing_actor_id"],
  "itemId": "existing_item_id_or_empty",
  "mapId": "current_authoritative_map_id",
  "roomId": "current_authoritative_room_id",
  "effectiveMinutesBeforeObservation": 7,
  "factEn": "specific fact that was true before observation",
  "edgeType": "friend|roommate|classmate|rival|neighbor|witness|creditor|debtor|empty",
  "visibleResiduesEn": ["observable aftermath detail"],
  "aftermathEn": "what the low tier should visibly stage without explaining the cause",
  "witnessAccounts": [
    {
      "actorId": "existing_actor_id",
      "accountEn": "what only this actor knows and may reveal if directly addressed"
    }
  ],
  "sourceEventIds": ["existing_event_id_if_any"],
  "persistenceTargets": ["event|social_graph|room_state|item|rumor|obligation"],
  "surfaceMode": "aftermath",
  "consequenceMode": "mixed",
  "irreversible": false,
  "requiresHighTier": false
}

When a public guest is necessary, guestActor must contain exactly:
{
  "id": "new_snake_case_id",
  "nameEn": "public name",
  "roleEn": "ordinary local role",
  "relationshipToPlayerEn": "newly met or stranger",
  "publicDescriptionEn": "stable physical traits only; no clothing, props, activity, or location",
  "publicBackgroundEn": "minimal public background",
  "personalityEn": "performable public temperament",
  "speechStyleEn": "performable speech style",
  "currentActivityEn": "observable entrance activity"
}`,
        },
        {
            role: 'user',
            content: JSON.stringify({
                pacingSignals,
                clock: state.clock,
                currentScene: state.scene,
                currentLocation: state.location,
                presentActors: state.actors.filter(actor =>
                    actor.present !== false),
                actorSelectionPolicy,
                knownAbsentActors:
                    projectActorLibraryForContext(
                        state.actorLibrary,
                        contextPlan,
                        {
                            actorIds:
                                knownAbsentActorIds,
                            includePrivate: false,
                            includeMemories: false,
                        },
                    ),
                unmetAvailableActors:
                    projectActorLibraryForContext(
                        state.actorLibrary,
                        contextPlan,
                        {
                            actorIds:
                                unmetAbsentActorIds,
                            includePrivate: false,
                            includeMemories: false,
                        },
                    ),
                explicitCanonCandidates:
                    actorSelectionPolicy
                        .explicitCanonCandidates,
                activeStoryArcs: (state.storyArcs || []).filter(arc =>
                    arc.status === 'active'),
                discoveredClues: state.clues,
                recentScenes: (state.sceneArchive || []).slice(
                    contextPlan.mode === 'lean'
                        ? -1
                        : contextPlan.mode === 'balanced'
                            ? -2
                            : -3,
                ),
                currentSceneTimeline:
                    (
                        state.scene?.timelineEntries ||
                        []
                    ).slice(
                        -contextPlan.recentMessageLimit,
                    ),
                recentMessages: getContext().chat
                    .slice(Math.max(
                        0,
                        Number(state.scene?.startedMessageId || 0),
                    ))
                    .slice(
                        -contextPlan.recentMessageLimit,
                    )
                    .map(message => ({
                        isUser: Boolean(message.is_user),
                        text: message.mes,
                    })),
                causalCollapseRecords:
                    (
                        state
                            .causalCollapse
                            ?.records ||
                        []
                    ).slice(-8),
                mapAuthority: buildMapAuthorityContext(state),
                retrievedLocalKnowledge:
                    formatRetrievedKnowledge(retrievedKnowledge),
            }),
        },
    ];
}

async function generatePacingAssessment(
    roleSlot,
    state,
    pacingSignals,
    retrievedKnowledge,
    contextPlan,
) {
    const actorSelectionPolicy =
        buildPacingActorSelectionPolicy(
            state,
            pacingSignals,
        );
    const prompt = createPacingDirectorPrompt(
        state,
        pacingSignals,
        retrievedKnowledge,
        contextPlan,
    );
    let response = await sendRoleRequest(
        roleSlot,
        prompt,
        { json: true },
    );
    let raw = extractRoleResponseText(response);
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const payload =
                normalizePacingAssessmentPayload(
                    parseJsonObject(raw),
                    state,
                    actorSelectionPolicy
                        .explicitCanonCandidates,
                );
            if (payload.decision === 'hold' &&
                payload.intervention === undefined) {
                payload.intervention = null;
            }
            const validation = validatePacingAssessment(
                payload,
                state,
                pacingSignals,
            );
            if (!validation.valid) {
                throw new Error(validation.errors.join('；'));
            }
            return payload;
        } catch (error) {
            lastError = error;
            if (attempt > 0) break;
            response = await sendRoleRequest(roleSlot, [
                {
                    role: 'system',
                    content: 'Repair the pacing assessment JSON. Preserve actorSelectionPolicy priority order and social-stage quota. Use only supplied active arc, actor, item, map, and room IDs. If causal_collapse_opportunity is active, return one compatible causal_collision with aftermath-only surface data, or one ordinary incident with causalCollapse null; never hold. Causal facts must be reversible and requireHighTier false. Otherwise return hold with null intervention or one safe this_turn intervention. Return JSON only.',
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        validationError:
                            String(error?.message || error),
                        invalidOutput: raw,
                        originalRequest:
                            JSON.parse(prompt[1].content),
                        requiredSchema: prompt[0].content,
                    }),
                },
            ], { json: true });
            raw = extractRoleResponseText(response);
        }
    }
    throw new Error(
        `中档节奏评估连续两次无效：${String(lastError?.message || lastError)}`,
    );
}

async function ensurePacingDirectorAssessment(
    playerAction = '',
    currentAddressing = null,
    selectionPlayerAction = playerAction,
) {
    if (pacingDirectorPromise) {
        return pacingDirectorPromise;
    }
    let state = getMudState();
    const pacingSignals = analyzePacingSignals(
        state,
        playerAction,
    );
    pacingSignals.playerAction = playerAction;
    pacingSignals
        .selectionPlayerAction =
        selectionPlayerAction;
    pacingSignals.currentAddressing =
        currentAddressing
            ?.valid === true
            ? {
                mode:
                    currentAddressing
                        .mode,
                attempted:
                    Boolean(
                        currentAddressing
                            .attempted,
                    ),
                valid: true,
                actorIds: [
                    ...(
                        currentAddressing
                            .actorIds ||
                        []
                    ),
                ],
                targetLabels: [
                    ...(
                        currentAddressing
                            .targetLabels ||
                        []
                    ),
                ],
            }
            : null;
    if (!pacingSignals.shouldAssess) {
        return null;
    }
    pacingDirectorPromise = (async () => {
        const context = getContext();
        state = getMudState();
        state.pacingDirector = {
            ...(state.pacingDirector || {}),
            status: 'assessing',
            error: '',
        };
        await context.saveMetadata();
        renderAll();
        try {
            const slots = resolveRoleSlots(state.modelSlots);
            const contextPlan =
                createContextBudgetPlan(
                    slots.medium.contextSize,
                    slots.medium.maxResponseLength,
                );
            const entityIds = [
                state.scene?.id,
                state.map?.currentLocalNodeId,
                ...(state.actors || [])
                    .filter(actor => actor.present !== false)
                    .map(actor => actor.id),
                ...(state.storyArcs || [])
                    .filter(arc => arc.status === 'active')
                    .map(arc => arc.id),
            ].filter(Boolean);
            const retrievedKnowledge =
                await retrieveLocalKnowledge(
                    `Assess scene pacing: ${pacingSignals.reasons.join(', ')}. ` +
                    `${state.scene?.summaryEn || state.scene?.summary || ''}`,
                    entityIds,
                    {
                        includeLockedClues: true,
                        limit: contextPlan.ragLimit,
                    },
                );
            const assessment = await generatePacingAssessment(
                slots.medium,
                state,
                pacingSignals,
                retrievedKnowledge,
                contextPlan,
            );
            state = getMudState();
            context.chatMetadata.hogwartsMud =
                applyPacingAssessment(
                    state,
                    assessment,
                    pacingSignals,
                );
            await context.saveMetadata();
            applySystemPrompt();
            renderAll();
            if (assessment.intervention?.guestActor ||
                assessment.intervention?.actorEntrances?.length ||
                assessment.intervention?.causalCollapse) {
                await syncLocalKnowledge();
            }
            return assessment;
        } catch (error) {
            state = getMudState();
            state.pacingDirector = {
                ...(state.pacingDirector || {}),
                status: 'failed',
                error: String(
                    error?.cause?.message ||
                    error?.message ||
                    error,
                ),
                lastAssessedTurn:
                    Number(state.turn?.count || 0),
                lastAssessedSceneId: state.scene?.id || '',
                reassessAfterTurns: 2,
            };
            await context.saveMetadata();
            renderAll();
            console.warn(
                '[Hogwarts MUD] Pacing assessment failed; continuing the ordinary turn',
                error,
            );
            return null;
        }
    })().finally(() => {
        pacingDirectorPromise = null;
        renderAll();
    });
    return pacingDirectorPromise;
}

function collectSocialDirectorEvidence(
    state,
    {
        backfill = false,
    } = {},
) {
    const chat =
        getContext().chat ||
        [];
    const sceneStart =
        Math.max(
            0,
            Number(
                state.scene
                    ?.startedMessageId ||
                0,
            ),
        );
    const lastProcessed =
        Number(
            state.socialGraph
                ?.lastProcessedMessageId ??
            -1,
        );
    const start =
        backfill
            ? Math.max(
                0,
                lastProcessed +
                    1,
            )
            : Math.max(
                sceneStart,
                lastProcessed +
                    1,
            );
    const eventKnowledgeById =
        new Map(
            (state.eventKnowledge || [])
                .filter(event =>
                    event?.eventId)
                .map(event => [
                    event.eventId,
                    event,
                ]),
        );
    chat.forEach(message => {
        const event =
            message.extra
                ?.hogwartsMud
                ?.turnTransaction
                ?.eventKnowledge;
        if (
            event?.eventId &&
            !eventKnowledgeById.has(
                event.eventId,
            )
        ) {
            eventKnowledgeById.set(
                event.eventId,
                event,
            );
        }
    });
    const eventsByMessageId =
        new Map();
    for (
        const event
        of eventKnowledgeById.values()
    ) {
        for (
            const rawMessageId
            of event.sourceMessageIds ||
            []
        ) {
            const messageId =
                Number(rawMessageId);
            if (
                !Number.isInteger(
                    messageId,
                )
            ) {
                continue;
            }
            const events =
                eventsByMessageId
                    .get(messageId) ||
                [];
            events.push(event);
            eventsByMessageId.set(
                messageId,
                events,
            );
        }
    }
    const knownActorIds =
        new Set(
            (state.actorLibrary || [])
                .map(actor => actor.id),
        );
    const candidates =
        chat
            .map((message, index) => ({
                message,
                index,
            }))
            .filter(({ message, index }) =>
                index >= start &&
                eventsByMessageId
                    .has(index) &&
                (
                    message.is_user ||
                    Array.isArray(
                        message.extra
                            ?.hogwartsMud
                            ?.segments,
                    )
                ))
            .map(({ message, index }) => {
                const mud =
                    message.extra
                        ?.hogwartsMud ||
                    {};
                const committedEvents =
                    eventsByMessageId
                        .get(index) ||
                    [];
                const sceneIds = [
                    ...new Set(
                        committedEvents
                            .map(event =>
                                String(
                                    event
                                        .sceneId ||
                                    '',
                                ))
                            .filter(Boolean),
                    ),
                ];
                const sceneId =
                    sceneIds.length === 1
                        ? sceneIds[0]
                        : '';
                const segments =
                    message.is_user
                        ? []
                        : (
                            mud.segments ||
                            []
                        ).map(segment => ({
                            type:
                                segment.type,
                            actorId:
                                segment.actorId ||
                                '',
                            textEn:
                                segment.textEn ||
                                '',
                        }));
                const witnessActorIds = [
                    ...new Set(
                        committedEvents
                            .flatMap(event =>
                                event
                                    .witnessActorIds ||
                                [])
                            .filter(actorId =>
                                knownActorIds
                                    .has(
                                        actorId,
                                    )),
                    ),
                ].sort();
                return {
                    id: index,
                    sceneId,
                    isUser:
                        Boolean(
                            message.is_user,
                        ),
                    text:
                        message.is_user
                            ? String(
                                message.mes ||
                                '',
                            )
                            : '',
                    segments,
                    witnessActorIds,
                    eventIds:
                        committedEvents
                            .map(event =>
                                event.eventId),
                };
            });
    let batchEnd =
        Math.min(
            candidates.length,
            24,
        );
    if (
        candidates[
            batchEnd - 1
        ]?.isUser &&
        candidates[batchEnd] &&
        !candidates[batchEnd]
            .isUser
    ) {
        batchEnd++;
    }
    const records =
        candidates.slice(
            0,
            batchEnd,
        );
    const selectedEventIds =
        new Set(
            records.flatMap(record =>
                record.eventIds),
        );
    records.forEach(record => {
        delete record.eventIds;
    });
    const eventKnowledge = [
        ...eventKnowledgeById
            .values(),
    ]
        .filter(event =>
            selectedEventIds.has(
                event.eventId,
            ))
        .map(event =>
            structuredClone(event));
    return {
        backfill,
        hasMore:
            candidates.length >
            records.length,
        messages: records,
        allowedMessageIds:
            records.map(record =>
                record.id),
        messageSceneIds:
            Object.fromEntries(
                records.map(record => [
                    record.id,
                    record.sceneId,
                ]),
            ),
        witnessActorIdsByMessageId:
            Object.fromEntries(
                records.map(record => [
                    record.id,
                    record
                        .witnessActorIds,
                ]),
            ),
        eventKnowledge,
        presentActorIds: [
            ...new Set(
                records.flatMap(record =>
                    record
                        .witnessActorIds
                        .filter(actorId =>
                            actorId !==
                                'player')),
            ),
        ],
        sceneIds: [
            ...new Set(
                records
                    .map(record =>
                        record.sceneId)
                    .filter(Boolean),
            ),
        ],
    };
}

export function createMemoryConsolidationPrompt(
    state,
    signals,
    evidence,
    contextPlan = createContextBudgetPlan(
        CONTEXT_SIZE_PRESETS.rich,
        DEFAULT_MODEL_SLOTS.medium.maxResponseLength,
    ),
) {
    const reviewableIds = new Set(
        signals.actors.map(actor => actor.id),
    );
    const reviewableActors =
        evidence.backfill
            ? []
            : state.actorLibrary
                .filter(actor =>
                    reviewableIds.has(
                        actor.id,
                    ))
                .map(actor => {
                    const dynamic =
                        normalizeActorMemoryProfile(
                            actor,
                        );
                    return {
                        id: actor.id,
                        nameEn:
                            actor.nameEn,
                        relationshipToPlayerEn:
                            actor
                                .relationshipToPlayerEn,
                        impressionOfPlayerEn:
                            dynamic
                                .impressionOfPlayerEn,
                        sharedMemories:
                            selectSharedMemoriesForContext(
                                dynamic
                                    .sharedMemories,
                                contextPlan,
                            ),
                        socialStatements:
                            actor
                                .socialStatements ||
                            [],
                        socialRelationships:
                            buildSocialAudienceProjection(
                                state,
                                actor.id,
                            ).relationships,
                    };
                });
    const backfillRules =
        evidence.backfill
            ? `
- This is a versioned catch-up scan. reviews must be exactly [] and scanComplete must be true only after every supplied sceneEvidence message has been scanned.
- sceneEvidence may span multiple archived scenes. Every statement and relationship item must copy the exact sceneId supplied on its source message.
- Output at most 12 statements and 24 relationshipEvidence items. Prioritize meaningful player-facing changes, then durable inter-NPC changes.
- Include introductions, refusals, coercion, injury, help, promises, betrayal, repair, and structural relationships. Omit routine classroom facts, transient preferences, and evidence already represented by existingSocialGraph.`
            : `
- This is an event-boundary update. reviews may consolidate supplied memories. scanComplete must be true after all supplied sceneEvidence messages have been scanned.`;
    const existingGraph =
        normalizeSocialGraph(
            state.socialGraph,
        );
    const existingSocialGraph = {
        statements:
            existingGraph.statements
                .map(statement => ({
                    id: statement.id,
                    subjectId:
                        statement.subjectId,
                    speakerId:
                        statement.speakerId,
                    category:
                        statement.category,
                    textEn:
                        statement.textEn,
                    sourceMessageIds:
                        statement
                            .sourceMessageIds ||
                        [],
                })),
        relationshipEvidence:
            existingGraph
                .relationshipEvidence
                .map(item => ({
                    id: item.id,
                    sourceActorId:
                        item.sourceActorId,
                    targetActorId:
                        item.targetActorId,
                    eventKind:
                        item.eventKind,
                    dimensionDeltas:
                        item.dimensionDeltas ||
                        [],
                    structuralTags:
                        item.structuralTags ||
                        [],
                    summaryEn:
                        item.summaryEn,
                    sceneId:
                        item.sceneId,
                    sourceMessageIds:
                        item
                            .sourceMessageIds ||
                        [],
                })),
        relationships:
            existingGraph
                .relationships
                .map(edge => ({
                    sourceActorId:
                        edge.sourceActorId,
                    targetActorId:
                        edge.targetActorId,
                    familiarity:
                        edge.familiarity,
                    closeness:
                        edge.closeness,
                    warmth:
                        edge.warmth,
                    trust: edge.trust,
                    respect:
                        edge.respect,
                    influence:
                        edge.influence,
                    tension:
                        edge.tension,
                    resentment:
                        edge.resentment,
                    fear: edge.fear,
                    protectiveness:
                        edge
                            .protectiveness,
                    structuralTags:
                        edge.structuralTags ||
                        [],
                })),
        lastProcessedMessageId:
            existingGraph
                .lastProcessedMessageId,
    };
    return [
        {
            role: 'system',
            content: `You are the single mid-tier Social Director for a persistent Harry Potter RPG. Perform one source-grounded extraction for a deterministic LangGraph reducer. Consolidate player-visible relationship memory, attributed NPC statements, and directed social evidence. Do not write scene prose or invent events. Return one compact JSON object. Internal reasoning is permitted, but the final answer must contain one complete JSON object matching the schema.

Rules:
- Use only supplied memory IDs and their observable summaries. Never use actor secrets, hidden clues, private goals, or facts the actor did not witness.
- statements records what a supplied actor publicly claimed, not omniscient truth. Every statement needs subjectId, speakerId, sceneId, witnessedBy, and exact sourceMessageIds.
- relationshipEvidence is directed and may connect a supplied actor to another supplied actor or to player. Every item needs sceneId, witnessedBy, and exact sourceMessageIds.
- witnessedBy must be a subset of every cited message's witnessActorIds. Never grant knowledge to an absent actor.
- Use only actorDirectory IDs and allowedMessageIds. Never assume player witnessed a message unless that message's witnessActorIds includes player.
- existingSocialGraph is read-only calibration and duplicate context. Never emit migration, summaries, or score corrections for stored relationships; extract only new supplied sceneEvidence.
- Emit one consolidated relationshipEvidence item per directed actor pair, eventKind, scene, and sourceMessageIds set. The reducer, not you, owns final scores.
- dimensionDeltas are proposals. Allowed dimensions are familiarity, closeness, warmth, trust, respect, influence, tension, resentment, fear, and protectiveness.
- eventKind must be one of introduction, routine_interaction, shared_time, serious_conversation, vulnerability, support, help, gift, promise, praise, rescue, sacrifice, insult, humiliation, threat, harm, betrayal, unresolved_conflict, accepted_apology, accepted_compensation, forgiveness, reappraisal, or other.
- structuralTags may contain only family, authority, classmate, rivalry, or mentor. Tags describe structure, never sentiment.
- Include at most four emotionAppraisals from anger, fear, contempt, disgust, envy, shame, guilt, gratitude, admiration, hope, disappointment, relief, pity, joy, or distress. Intensity is 1-5 and every appraisal cites sourceMessageIds from its parent evidence.
- Do not repeat evidence already represented by existingSocialGraph. Repeated similar new events still need their own exact new message provenance.
- familiarity is knowledge, not liking. Same class or forced co-presence primarily changes familiarity. Raise closeness only for voluntary shared time, serious conversation, vulnerability, support, mutual risk, or sustained shared experience.
- resentment may rise only for a clear insult, humiliation, threat, harm, betrayal, or unresolved conflict. It may fall only for an explicitly accepted apology/compensation, forgiveness, or reappraisal. A gift, greeting, or unaccepted apology must not lower resentment.
- Closeness anchors: 0 none, 10 first met, 20 acquaintance, 35 friend, 50 close friend, 70 confidant/high intimacy, 90 lifelong/family-grade bond.
- Signed anchors for warmth/trust/respect: -75 hatred/expected betrayal/strong contempt; -50 dislike/distrust/contempt; -20 coolness/guarded/disapproval; 0 neutral/unverified; 20 liking/limited trust/recognition; 50 deep affection/high trust/admiration; 75 devoted care/life-or-death trust/reverence.
- Negative anchors for tension/resentment/fear: 10 slight, 20 remembered/guarded, 35 strained, 50 overt conflict/serious grievance/fear, 70 explosive/vengeful/terrified, 90 actively hostile/irreconcilable/traumatic.
- Impact bands: trace=1; minor=2-3; meaningful=4-6; major=7-12; defining=13-18. defining is only for a source-grounded irreversible betrayal or sacrifice. Ordinary closeness change is at most 10; defining closeness is at most 15.
- Calibration examples: routine class chat => routine_interaction with familiarity +1 trace and usually no closeness; concrete support => support with warmth/trust +4 to +6 meaningful; major betrayal => betrayal with trust -7 to -12, warmth loss, and supported resentment/tension; an apology lowers resentment only as accepted_apology when the source shows acceptance.
- Keep small texture in everyday memories unless it is redundant or stale.
- Merge related everyday memories into a recent memory only when together they describe a meaningful pattern or event.
- Promote to core only when at least one source is already recent/core and the experience is a lasting turning point or repeated defining pattern.
- Core memories cannot be forgotten or downgraded. They may only be merged into another core memory.
- A source memory ID may appear in only one operation.
- Use targetTier "forget" for redundant everyday/recent memories; omit summaryEn for forget.
- Update impressionOfPlayerEn only when the supplied memories support a sharper current opinion. It must be a concrete judgment, never "stranger" or a relationship label.
- Keep each impression and summary under 40 English words.
- Set reviewAfterTurns to 10-20. Never schedule another review sooner than 10 committed turns.
- Review only actors who need an operation or an impression refinement. Include 0-8 actor reviews.
${backfillRules}

Schema:
{
  "scanComplete": true,
  "reviewAfterTurns": 10,
  "reviews": [
    {
      "id": "existing_actor_id",
      "impressionOfPlayerEn": "optional refined current opinion",
      "operations": [
        {
          "sourceIds": ["existing_memory_id"],
          "targetTier": "core|recent|forget",
          "summaryEn": "required merged memory unless targetTier is forget"
        }
      ]
    }
  ],
  "statements": [
    {
      "subjectId": "existing_actor_id",
      "speakerId": "existing_actor_id",
      "sceneId": "exact_source_scene_id",
      "category": "family|origin|education|wealth|occupation|identity|history|preference|other",
      "textEn": "one source-grounded public claim",
      "witnessedBy": ["player", "existing_actor_id"],
      "sourceMessageIds": [123]
    }
  ],
  "relationshipEvidence": [
    {
      "sourceActorId": "existing_actor_id",
      "targetActorId": "player|different_existing_actor_id",
      "sceneId": "exact_source_scene_id",
      "eventKind": "support",
      "dimensionDeltas": [
        {"dimension": "trust", "delta": 4, "impact": "meaningful"}
      ],
      "structuralTags": ["classmate"],
      "emotionAppraisals": [
        {"emotion": "gratitude", "intensity": 3, "sourceMessageIds": [123]}
      ],
      "summaryEn": "one observable directed relationship event",
      "witnessedBy": ["existing_actor_id"],
      "sourceMessageIds": [123]
    }
  ]
}`,
        },
        {
            role: 'user',
            content: JSON.stringify({
                clock: state.clock,
                currentTurn:
                    Number(state.turn?.count || 0),
                consolidationSignals: signals,
                reviewableActors,
                actorDirectory:
                    (state.actorLibrary ||
                    []).map(actor => ({
                        id: actor.id,
                        nameEn:
                            actor.nameEn,
                    })),
                existingSocialGraph:
                    existingSocialGraph,
                sceneEvidence:
                    evidence.messages,
                allowedMessageIds:
                    evidence
                        .allowedMessageIds,
            }),
        },
    ];
}

const SOCIAL_DIRECTOR_EVENT_KINDS =
    Object.freeze([
        'introduction',
        'routine_interaction',
        'shared_time',
        'serious_conversation',
        'vulnerability',
        'support',
        'help',
        'gift',
        'promise',
        'praise',
        'rescue',
        'sacrifice',
        'insult',
        'humiliation',
        'threat',
        'harm',
        'betrayal',
        'unresolved_conflict',
        'accepted_apology',
        'accepted_compensation',
        'forgiveness',
        'reappraisal',
        'other',
    ]);
const SOCIAL_DIRECTOR_IMPACTS =
    Object.freeze([
        'trace',
        'minor',
        'meaningful',
        'major',
        'defining',
    ]);
const SOCIAL_DIRECTOR_DIMENSIONS =
    Object.freeze([
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
const SOCIAL_DIRECTOR_STRUCTURAL_TAGS =
    Object.freeze([
        'family',
        'authority',
        'classmate',
        'rivalry',
        'mentor',
    ]);
const SOCIAL_DIRECTOR_EMOTIONS =
    Object.freeze([
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

export const SOCIAL_DIRECTOR_RESPONSE_SCHEMA = {
    name:
        'hogwarts_mud_social_director',
    description:
        'Source-grounded social extraction for the deterministic relationship reducer.',
    strict: true,
    value: {
        type: 'object',
        additionalProperties: false,
        properties: {
            scanComplete: {
                type: 'boolean',
            },
            reviewAfterTurns: {
                type: 'integer',
                minimum: 10,
                maximum: 20,
            },
            reviews: {
                type: 'array',
                maxItems: 8,
                items: {
                    type: 'object',
                    additionalProperties:
                        false,
                    properties: {
                        id: {
                            type: 'string',
                        },
                        impressionOfPlayerEn: {
                            type: 'string',
                        },
                        operations: {
                            type: 'array',
                            items: {
                                type:
                                    'object',
                                additionalProperties:
                                    false,
                                properties: {
                                    sourceIds: {
                                        type:
                                            'array',
                                        items: {
                                            type:
                                                'string',
                                        },
                                    },
                                    targetTier: {
                                        type:
                                            'string',
                                        enum: [
                                            'core',
                                            'recent',
                                            'forget',
                                        ],
                                    },
                                    summaryEn: {
                                        type: [
                                            'string',
                                            'null',
                                        ],
                                    },
                                },
                                required: [
                                    'sourceIds',
                                    'targetTier',
                                    'summaryEn',
                                ],
                            },
                        },
                    },
                    required: [
                        'id',
                        'impressionOfPlayerEn',
                        'operations',
                    ],
                },
            },
            statements: {
                type: 'array',
                maxItems: 12,
                items: {
                    type: 'object',
                    additionalProperties:
                        false,
                    properties: {
                        subjectId: {
                            type: 'string',
                        },
                        speakerId: {
                            type: 'string',
                        },
                        sceneId: {
                            type: 'string',
                        },
                        category: {
                            type: 'string',
                            enum: [
                                'family',
                                'origin',
                                'education',
                                'wealth',
                                'occupation',
                                'identity',
                                'history',
                                'preference',
                                'other',
                            ],
                        },
                        textEn: {
                            type: 'string',
                        },
                        witnessedBy: {
                            type: 'array',
                            items: {
                                type:
                                    'string',
                            },
                        },
                        sourceMessageIds: {
                            type: 'array',
                            items: {
                                type:
                                    'integer',
                            },
                        },
                    },
                    required: [
                        'subjectId',
                        'speakerId',
                        'sceneId',
                        'category',
                        'textEn',
                        'witnessedBy',
                        'sourceMessageIds',
                    ],
                },
            },
            relationshipEvidence: {
                type: 'array',
                maxItems: 24,
                items: {
                    type: 'object',
                    additionalProperties:
                        false,
                    properties: {
                        sourceActorId: {
                            type: 'string',
                        },
                        targetActorId: {
                            type: 'string',
                        },
                        sceneId: {
                            type: 'string',
                        },
                        eventKind: {
                            type: 'string',
                            enum:
                                SOCIAL_DIRECTOR_EVENT_KINDS,
                        },
                        dimensionDeltas: {
                            type: 'array',
                            maxItems: 10,
                            items: {
                                type:
                                    'object',
                                additionalProperties:
                                    false,
                                properties: {
                                    dimension: {
                                        type:
                                            'string',
                                        enum:
                                            SOCIAL_DIRECTOR_DIMENSIONS,
                                    },
                                    delta: {
                                        type:
                                            'number',
                                        minimum:
                                            -18,
                                        maximum:
                                            18,
                                    },
                                    impact: {
                                        type:
                                            'string',
                                        enum:
                                            SOCIAL_DIRECTOR_IMPACTS,
                                    },
                                },
                                required: [
                                    'dimension',
                                    'delta',
                                    'impact',
                                ],
                            },
                        },
                        structuralTags: {
                            type: 'array',
                            maxItems: 5,
                            items: {
                                type:
                                    'string',
                                enum:
                                    SOCIAL_DIRECTOR_STRUCTURAL_TAGS,
                            },
                        },
                        emotionAppraisals: {
                            type: 'array',
                            maxItems: 4,
                            items: {
                                type:
                                    'object',
                                additionalProperties:
                                    false,
                                properties: {
                                    emotion: {
                                        type:
                                            'string',
                                        enum:
                                            SOCIAL_DIRECTOR_EMOTIONS,
                                    },
                                    intensity: {
                                        type:
                                            'integer',
                                        minimum:
                                            1,
                                        maximum:
                                            5,
                                    },
                                    sourceMessageIds: {
                                        type:
                                            'array',
                                        items: {
                                            type:
                                                'integer',
                                        },
                                    },
                                },
                                required: [
                                    'emotion',
                                    'intensity',
                                    'sourceMessageIds',
                                ],
                            },
                        },
                        summaryEn: {
                            type: 'string',
                        },
                        witnessedBy: {
                            type: 'array',
                            items: {
                                type:
                                    'string',
                            },
                        },
                        sourceMessageIds: {
                            type: 'array',
                            items: {
                                type:
                                    'integer',
                            },
                        },
                    },
                    required: [
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
                },
            },
        },
        required: [
            'scanComplete',
            'reviewAfterTurns',
            'reviews',
            'statements',
            'relationshipEvidence',
        ],
    },
};

async function generateMemoryConsolidation(
    roleSlot,
    state,
    signals,
    evidence,
    contextPlan,
) {
    const prompt = createMemoryConsolidationPrompt(
        state,
        signals,
        evidence,
        contextPlan,
    );
    const response = await sendRoleRequest(
        roleSlot,
        prompt,
        {
            json: true,
            jsonSchema:
                SOCIAL_DIRECTOR_RESPONSE_SCHEMA,
        },
    );
    const extracted =
        extractRoleResponseText(
            response,
        );
    const payload =
        normalizeMemoryConsolidationPayload(
            extracted,
            state,
        );
    if (
        payload.scanComplete !==
            true
    ) {
        console.warn(
            '[Hogwarts MUD] Social Director returned no complete JSON object',
            {
                content:
                    typeof response
                        ?.content ===
                        'string'
                        ? response.content
                            .slice(0, 500)
                        : response?.content,
                reasoning:
                    typeof response
                        ?.reasoning ===
                        'string'
                        ? response.reasoning
                            .slice(0, 500)
                        : response
                            ?.reasoning,
            },
        );
        throw new Error(
            '社交导演没有返回完整 JSON 扫描结果。',
        );
    }
    if (
        evidence.backfill &&
        payload.reviews.length
    ) {
        throw new Error(
            '补算模式不得修改共同记忆。',
        );
    }
    const validation =
        validateMemoryConsolidation(
            payload,
            state,
        );
    if (!validation.valid) {
        throw new Error(
            validation.errors.join('；'),
        );
    }
    return payload;
}

async function localizeMemoryConsolidation(payload) {
    if (!getSettings().translationEnabled) {
        return payload;
    }
    const values = payload.reviews.flatMap(review => [
        review.impressionOfPlayerEn || '',
        ...(review.operations || []).map(
            operation => operation.summaryEn || '',
        ),
    ]).concat(
        (payload.statements || [])
            .map(statement =>
                statement.textEn ||
                ''),
        (
            payload
                .relationshipEvidence ||
            []
        ).map(evidence =>
            evidence.summaryEn ||
            ''),
    );
    const translated =
        await translateOpeningValues(values);
    let cursor = 0;
    const localized = {
        ...payload,
        reviews: payload.reviews.map(review => {
            const impressionOfPlayer =
                translated[cursor++];
            return {
                ...review,
                ...(review.impressionOfPlayerEn
                    ? { impressionOfPlayer }
                    : {}),
                operations: (
                    review.operations || []
                ).map(operation => {
                    const summary = translated[cursor++];
                    return {
                        ...operation,
                        ...(operation.summaryEn
                            ? { summary }
                            : {}),
                    };
                }),
            };
        }),
    };
    localized.statements =
        (
            payload.statements ||
            []
        ).map(statement => {
            const text =
                translated[cursor++];
            return {
                ...statement,
                text:
                    text ||
                    statement.textEn,
            };
        });
    localized.relationshipEvidence =
        (
            payload
                .relationshipEvidence ||
            []
        ).map(evidence => {
            const summary =
                translated[cursor++];
            return {
                ...evidence,
                summary:
                    summary ||
                    evidence.summaryEn,
                dimensionDeltas:
                    evidence
                        .dimensionDeltas ||
                    [],
                structuralTags:
                    evidence
                        .structuralTags ||
                    [],
                emotionAppraisals:
                    evidence
                        .emotionAppraisals ||
                    [],
            };
        });
    return localized;
}

async function resolveSocialDirectorGraph(
    state,
    payload,
    evidence,
) {
    const firstMessageId =
        evidence
            .allowedMessageIds[0] ??
        -1;
    const lastMessageId =
        evidence
            .allowedMessageIds
            .at(-1) ??
        -1;
    const response = await fetch(
        '/api/hogwarts-mud/social/resolve',
        {
            method: 'POST',
            headers:
                getRequestHeaders(),
            body: JSON.stringify({
                sceneId:
                    evidence.backfill
                        ? `social_catchup_${firstMessageId}_${lastMessageId}`
                        : state.scene?.id ||
                            '',
                clock: state.clock,
                turn: Number(
                    state.turn?.count ||
                    0,
                ),
                actorIds:
                    (
                        state.actorLibrary ||
                        []
                    ).map(actor =>
                        actor.id),
                presentActorIds:
                    evidence
                        .presentActorIds,
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
                existingGraph:
                    normalizeSocialGraph(
                        state.socialGraph,
                    ),
                extraction:
                    payload,
            }),
        },
    );
    if (!response.ok) {
        throw new Error(
            `社交导演图请求失败（${response.status}）。`,
        );
    }
    const result =
        await response.json();
    const validation =
        validateSocialDirectorResult(
            result,
            state,
            evidence
                .allowedMessageIds,
        );
    if (!validation.valid) {
        throw new Error(
            validation.errors.join(
                '；',
            ),
        );
    }
    return result;
}

async function ensureMemoryConsolidation(
    {
        backfill = false,
    } = {},
) {
    if (memoryDirectorPromise) {
        return memoryDirectorPromise;
    }
    let state = getMudState();
    const signals =
        analyzeMemoryConsolidation(state);
    if (
        !backfill &&
        !signals.shouldReview
    ) {
        return null;
    }
    const evidence =
        collectSocialDirectorEvidence(
            state,
            {
                backfill,
            },
        );
    if (
        !evidence
            .allowedMessageIds
            .length
    ) {
        if (backfill) {
            const context =
                getContext();
            const next =
                structuredClone(
                    state,
                );
            next.socialGraph =
                normalizeSocialGraph(
                    next.socialGraph,
                );
            next.socialGraph
                .extractorVersion =
                SOCIAL_GRAPH_EXTRACTOR_VERSION;
            next.socialGraph
                .backfillPendingSceneId =
                '';
            next.socialGraph.status =
                'ready';
            next.socialGraph.error =
                '';
            context.chatMetadata
                .hogwartsMud =
                next;
            await context
                .saveMetadata();
            renderAll();
        }
        return null;
    }
    memoryDirectorPromise = (async () => {
        const context = getContext();
        state = getMudState();
        state.socialGraph =
            normalizeSocialGraph(
                state.socialGraph,
            );
        state.socialGraph.status =
            'running';
        state.socialGraph.error =
            '';
        if (!backfill) {
            state.memoryDirector = {
                ...(state.memoryDirector || {}),
                status: 'consolidating',
                error: '',
            };
        }
        await context.saveMetadata();
        renderAll();
        try {
            const slots = resolveRoleSlots(
                state.modelSlots,
            );
            const contextPlan =
                createContextBudgetPlan(
                    slots.medium.contextSize,
                    slots.medium.maxResponseLength,
                );
            let payload =
                await generateMemoryConsolidation(
                    slots.medium,
                    state,
                    signals,
                    evidence,
                    contextPlan,
                );
            try {
                payload =
                    await localizeMemoryConsolidation(
                        payload,
                    );
            } catch (translationError) {
                console.warn(
                    '[Hogwarts MUD] Memory consolidation translation failed; using English',
                    translationError,
                );
            }
            state = getMudState();
            const graphResult =
                await resolveSocialDirectorGraph(
                    state,
                    payload,
                    evidence,
                );
            const next =
                applySocialDirectorResult(
                    state,
                    graphResult,
                    evidence
                        .allowedMessageIds,
                );
            next.socialGraph
                .extractorVersion =
                SOCIAL_GRAPH_EXTRACTOR_VERSION;
            next.socialGraph.status =
                'ready';
            next.socialGraph.error =
                '';
            if (backfill) {
                next.socialGraph
                    .backfilledSceneIds = [
                        ...new Set([
                            ...(
                                next
                                    .socialGraph
                                    .backfilledSceneIds ||
                                []
                            ),
                            ...evidence
                                .sceneIds,
                        ]),
                    ].slice(-50);
                next.socialGraph
                    .backfillPendingSceneId =
                    evidence.hasMore
                        ? state
                            .socialGraph
                            ?.backfillPendingSceneId ||
                            state.scene?.id ||
                            ''
                        : '';
            }
            context.chatMetadata
                .hogwartsMud =
                next;
            await context.saveMetadata();
            applySystemPrompt();
            renderAll();
            await syncLocalKnowledge();
            return graphResult;
        } catch (error) {
            state = getMudState();
            state.socialGraph =
                normalizeSocialGraph(
                    state.socialGraph,
                );
            state.socialGraph.status =
                'failed';
            state.socialGraph.error =
                String(
                    error?.cause?.message ||
                    error?.message ||
                    error,
                );
            if (backfill) {
                state.socialGraph
                    .backfillPendingSceneId =
                    state.socialGraph
                        .backfillPendingSceneId ||
                    state.scene?.id ||
                    '';
            } else {
                state.memoryDirector = {
                    ...(state.memoryDirector || {}),
                    status: 'failed',
                    error:
                        state.socialGraph
                            .error,
                    lastReviewedTurn:
                        Number(
                            state.turn
                                ?.count ||
                            0,
                        ),
                    reviewAfterTurns: 10,
                };
            }
            await context.saveMetadata();
            renderAll();
            console.warn(
                '[Hogwarts MUD] Social Director failed; keeping committed narrative and prior social state',
                error,
            );
            return null;
        }
    })().finally(() => {
        memoryDirectorPromise = null;
        renderAll();
    });
    return memoryDirectorPromise;
}

async function ensureSocialDirectorCatchup(
    {
        force = false,
    } = {},
) {
    for (
        let batch = 0;
        batch < 5;
        batch++
    ) {
        const graph =
            normalizeSocialGraph(
                getMudState()
                    ?.socialGraph,
            );
        if (
            !force &&
            graph.extractorVersion >=
                SOCIAL_GRAPH_EXTRACTOR_VERSION &&
            !graph
                .backfillPendingSceneId
        ) {
            return graph;
        }
        const attemptKey = [
            graph.extractorVersion,
            graph
                .lastProcessedMessageId,
            graph
                .backfillPendingSceneId,
        ].join(':');
        if (
            socialDirectorCatchupAttempts
                .has(attemptKey)
        ) {
            return graph;
        }
        socialDirectorCatchupAttempts
            .add(attemptKey);
        await ensureMemoryConsolidation({
            backfill: true,
        });
        const nextGraph =
            normalizeSocialGraph(
                getMudState()
                    ?.socialGraph,
            );
        if (
            nextGraph.status ===
                'failed' ||
            !nextGraph
                .backfillPendingSceneId
        ) {
            return nextGraph;
        }
        force = false;
    }
    return normalizeSocialGraph(
        getMudState()?.socialGraph,
    );
}

function createSceneTransitionPrompt(
    state,
    tier,
    destinationHint,
    expectedDestination,
    intentOverride,
    retrievedKnowledge = [],
    contextPlan = createContextBudgetPlan(
        CONTEXT_SIZE_PRESETS.rich,
        DEFAULT_MODEL_SLOTS.medium.maxResponseLength,
    ),
) {
    const isHighTier = tier === 'high';
    const destinationAuthority = expectedDestination
        ? getSceneDestinationAuthority(state, expectedDestination)
        : null;
    return [
        {
            role: 'system',
            content: `You are the ${isHighTier ? 'high-tier World Director' : 'mid-tier Scene Transition Director'} for a persistent Harry Potter RPG. The player has explicitly chosen to close the current scene. Settle the observed scene and choose the next committed structured state as one JSON object with no Markdown. A separate low-tier performer writes the public opening after your state is accepted.

Authority and boundaries:
- Archive only events that already occurred in the supplied messages. Do not rewrite the player action.
- authorQuillEn is an out-of-character editorial postscript evaluating the player's performance in the chapter being closed. Write 180-280 English words packed with affectionate roasting, callbacks, mock awards, deadpan asides, and at least three distinct jokes grounded in specific observable player choices.
- The Author's Quill is funny rather than lyrical or therapeutic. It may tease the player's tactics and running bits, but never insult the real player, speak as an NPC, reveal hidden truths, locked clues, private motives, future events, exact hidden rolls, or information absent from the observed transcript.
- Do not merely summarize the chapter. Treat it like a sharp British humour column written by an omniscient editor who has seen the player's chaos but is contractually forbidden to spoil the plot.
- Realize committedNextSceneIntent by default. If userOverride.changed is true, honor the user's edited direction while preserving committed facts.
- The next scene must use an existing mapId and roomId from mapAuthority. Never invent or rename a room.
- If explicitDestination is supplied, nextScene.mapId and nextScene.roomId must match it exactly.
- If explicitDestination is supplied, rewrite every destination-sensitive field for that room. nextScene.nameEn and nextScene.summaryEn must each literally name explicitDestination.roomNameEn. Stale state from the old room makes the entire package invalid.
- ${isHighTier
        ? 'You may settle a major causal turn using only already committed hidden-story facts, but may not reveal a locked clue without its prewritten condition.'
        : 'Handle an ordinary scene close and location transition. Do not create hidden facts, clues, relationships, items, spells, or permanent consequences.'}
- actorStates is private structured state, not prose. It may reference only the supplied actorLibrary. Record each actor's exact existing mapId and roomId; actors may remain visible from another room when a sightline exists. Omitted actors leave the visible scene.
- Follow sceneCastPolicy. In crowded scenes prefer 2-4 active named actors, prioritize the actor who drives the scene procedure plus the player's immediate relationship focus, and rotate overexposed actors out. Other students are anonymous crowd texture.
- Any named actor required to speak or drive the next scene must be present in actorStates. Do not use actorStates to enumerate everyone who could plausibly occupy a classroom or hall.
- When a newly activated actor has no established first impression, actorStates must include a 1-24 word firstImpressionOfPlayerEn based only on the player's visible features and conduct.
- actorContinuityCapsules are sealed by actorId and contain only established social continuity. A capsule may guide only its matching actor. If hasMetPlayer is true, do not write a first-time self-introduction to the player. Treat knownActorIds as people that actor has already met. relationshipToPlayer.stageEn and sharedMemories override generic or stale relationship labels.
- Do not transfer one actor's memory, impression, or relationship knowledge to another actor or to the narrator.
- behavioralEnvironment describes the closing clock. Compute the opening clock from currentClock plus transitionMinutes instead of carrying the closing period forward.
- Choose transitionMinutes freely according to the time that naturally passes in the fiction. Sleep, travel, waiting, holidays, and deliberate time skips may advance as long as needed. If asleep characters wake in the next scene, allow a plausible rest unless an already established alarm, emergency, departure, or other observable cause wakes them early.
- Materially embody the opening time's daylight, sleep pressure, curfew, weather, exposure, clothing, shelter, noise, and activity implications. Do not recite them as a checklist.
- Do not output openingSegments or any public opening prose. The low-tier performer will render actorStates, summaryEn, explorationHookEn, crowdDirectionEn, and the environment into a concrete opening that requires the player's response.
- While creating nextScene, also prewrite followingSceneIntent for the scene after it. Keep that intent player-facing and free of spoilers.
- transitionMinutes must be a non-negative integer with no maximum span. Do not compress an overnight rest into the old three-hour ceiling, and do not repeat time already consumed by the last player turn.
- Use original English prose and the supplied canon-compatible voice contract.

Schema:
{
  "transitionMinutes": 0,
  "closureSummaryEn": "specific observable closure of the old scene",
  "authorQuillEn": "180-280 word OOC comic review of the player's observed chapter performance",
  "unresolvedThreadsEn": ["public unresolved thread"],
  "nextScene": {
    "id": "unique_snake_case_id",
    "nameEn": "scene title",
    "summaryEn": "player-visible scene situation",
    "chapterEn": "chapter title",
    "mapId": "existing_map_id",
    "roomId": "existing_room_id",
    "actorStates": [
      {
        "id": "actor_id",
        "present": true,
        "currentActivityEn": "observable activity in the new scene",
        "firstImpressionOfPlayerEn": "short visible first impression when required",
        "mapId": "same_existing_map_id",
        "roomId": "existing_room_id"
      }
    ],
    "followingSceneIntent": {
      "titleEn": "player-facing next beat title",
      "summaryEn": "non-spoiler default direction",
      "triggerEn": "observable condition for ending nextScene",
      "mapId": "existing_map_id",
      "roomId": "existing_room_id",
      "tier": "medium|high"
    }
  }
}

${CANON_WIT_TONE_CONTRACT}`,
        },
        {
            role: 'user',
            content: JSON.stringify({
                tier,
                destinationHint,
                explicitDestination: destinationAuthority,
                committedNextSceneIntent:
                    state.scene?.nextSceneIntent,
                userOverride: intentOverride,
                currentClock: state.clock,
                currentChapter: state.chapter,
                currentScene: state.scene,
                currentLocation: state.location,
                currentActors: state.actors,
                actorLibrary:
                    projectActorLibraryForContext(
                        state.actorLibrary,
                        contextPlan,
                        {
                            includePrivate: isHighTier,
                            includeMemories: isHighTier,
                        },
                    ),
                actorContinuityCapsules:
                    buildActorContinuityCapsules(
                        state,
                        (
                            state.actorLibrary ||
                            []
                        ).map(actor =>
                            actor.id),
                        contextPlan,
                    ),
                sceneCastPolicy:
                    buildSceneCastRotationPolicy(
                        state,
                        expectedDestination ||
                        {},
                    ),
                behavioralEnvironment:
                    buildBehavioralEnvironment(
                        state,
                    ),
                currentConflict: state.conflict,
                discoveredClues: state.clues,
                hiddenStoryArcs: isHighTier
                    ? state.storyArcs
                    : [],
                mapAuthority: buildMapAuthorityContext(state),
                recentMessages: getContext().chat
                    .slice(Math.max(0, Number(state.scene?.startedMessageId || 0)))
                    .slice(
                        -contextPlan.chapterMessageLimit,
                    )
                    .map(message => ({
                        isUser: Boolean(message.is_user),
                        text: message.mes,
                        segments: message.extra?.hogwartsMud?.segments,
                    })),
                retrievedLocalKnowledge: formatRetrievedKnowledge(retrievedKnowledge),
            }),
        },
    ];
}

async function generateSceneTransitionPackage(
    roleSlot,
    state,
    tier,
    destinationHint,
    expectedDestination,
    intentOverride,
    retrievedKnowledge,
    contextPlan,
) {
    const prompt = createSceneTransitionPrompt(
        state,
        tier,
        destinationHint,
        expectedDestination,
        intentOverride,
        retrievedKnowledge,
        contextPlan,
    );
    let response = await sendRoleRequest(roleSlot, prompt, { json: true });
    let raw = extractRoleResponseText(response);
    let lastError = null;
    const destinationAuthority = expectedDestination
        ? getSceneDestinationAuthority(state, expectedDestination)
        : null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const parsed =
                parseJsonObject(raw);
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
            const payload = normalizeSceneTransitionPackage(
                parsed,
                state,
                {
                    tier,
                },
            );
            const validation = validateSceneTransitionPackage(payload, state, {
                expectedMapId: expectedDestination?.mapId,
                expectedRoomId: expectedDestination?.roomId,
                requireDestinationGrounding: Boolean(destinationAuthority),
            });
            if (!validation.valid) {
                throw new Error(validation.errors.join('；'));
            }
            return payload;
        } catch (error) {
            lastError = error;
            if (attempt >= 2) break;
            response = await sendRoleRequest(roleSlot, [
                {
                    role: 'system',
                    content: `Rewrite the invalid scene-transition JSON as one complete replacement object. Preserve only the observed closure facts, committed intent or explicit user override, existing actor IDs, and world facts. Include authorQuillEn as a 180-280 word OOC comic review with specific callbacks, affectionate roasting, mock awards or deadpan asides, and at least three jokes based only on observed player choices. It must not reveal hidden facts, private motives, locked clues, future events, or hidden roll details.

The destination authority is binding. Rewrite nextScene.id, nameEn, summaryEn, actorStates.currentActivityEn, and followingSceneIntent so they form one coherent new scene at that destination. Do not retain state or physical details from the old room. If a supplied actor cannot plausibly be at the destination, mark that actor absent. nextScene.nameEn and nextScene.summaryEn must each literally contain destinationAuthority.roomNameEn.

Preserve actorContinuityCapsules from originalRequest. behavioralEnvironment describes only the closing clock; derive the opening conditions from currentClock plus transitionMinutes. Choose any non-negative transitionMinutes naturally required by sleep, travel, waiting, holidays, or another time skip, with no maximum span. Familiar actors must behave as already acquainted, and the opening must embody materially relevant time, sleep pressure, curfew, and weather effects without reciting them.

Do not output openingSegments or public opening prose. Return only valid structured transition JSON. Never invent a player action.`,
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        validationError: String(error?.message || error),
                        invalidOutput: raw,
                        originalRequest: JSON.parse(prompt[1].content),
                        destinationAuthority,
                        requiredSchema: prompt[0].content,
                    }),
                },
            ], { json: true });
            raw = extractRoleResponseText(response);
        }
    }
    throw new Error(`场景结算连续三次无效：${String(lastError?.message || lastError)}`);
}

async function generateSceneTransitionOpening(
    roleSlot,
    state,
    payload,
    expectedDestination,
    contextPlan,
) {
    const nextScene =
        payload.nextScene;
    const presentActorIds =
        new Set(
            (
                nextScene
                    .actorStates ||
                []
            )
                .filter(actor =>
                    actor.present ===
                        true)
                .map(actor =>
                    actor.id),
        );
    const projectedState =
        structuredClone(
            state,
        );
    projectedState.clock =
        payload.nextClock;
    projectedState.map = {
        ...(
            projectedState.map ||
            {}
        ),
        activeMapId:
            nextScene.mapId,
        currentLocalNodeId:
            nextScene.roomId,
    };
    projectedState.scene = {
        ...(
            projectedState.scene ||
            {}
        ),
        id: nextScene.id,
        nameEn:
            nextScene.nameEn,
        summaryEn:
            nextScene.summaryEn,
        mapId:
            nextScene.mapId,
        roomId:
            nextScene.roomId,
    };
    const existingActors =
        new Map(
            (
                state.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    projectedState.actors =
        (
            nextScene
                .actorStates ||
            []
        ).map(actor => ({
            ...(
                existingActors.get(
                    actor.id,
                ) ||
                {}
            ),
            ...actor,
        }));
    const destinationAuthority =
        getSceneDestinationAuthority(
            state,
            expectedDestination || {
                mapId:
                    nextScene.mapId,
                roomId:
                    nextScene.roomId,
            },
        );
    const prompt = [
        {
            role: 'system',
            content: `You are the low-tier Scene Opening Performer for a persistent Harry Potter RPG. A higher-tier director has already committed the next scene's state. Render that state as vivid player-facing English prose and NPC dialogue. Return exactly one JSON object with a segments array and no Markdown.

Boundaries:
- Do not change the committed clock, map, room, cast, activities, life states, items, facts, hooks, or following intent.
- The player is already at destinationAuthority. Begin inside the committed destination, not travelling toward it.
- Never speak, think, decide, emote, inspect, move, or act for the player. End at a concrete prompt for the player's response.
- Dialogue may use only a supplied present actor ID. Never introduce or name another actor.
- actorStates is private state, not text to paraphrase. Never write "remains visible in the scene", "is still present", a cast roll call, or one sentence per actor.
- It is valid to omit a present actor from the opening prose when that actor is not important to the immediate camera. Preserve them silently in state.
- In a crowded scene, focus on at most 2-3 named actors. Let everyone else remain anonymous simultaneous crowd texture.
- Use currentActivityEn as blocking guidance, then dramatize only the actions needed for this opening. Do not mechanically restate it.
- Use explorationHookEn as an optional concrete detail, not an instruction label. Use crowdDirectionEn as background motion, not an attendance list.
- Preserve actor-specific continuity. One actor cannot use another actor's memories or private knowledge.
- The first narration segment should identify destinationAuthority.roomNameEn naturally.
- Write 2-6 ordered segments, including at least one narration segment, totalling roughly 180-420 English words.
- Follow the supplied canon-compatible wit contract without copying published prose.

Schema:
{
  "segments": [
    {
      "type": "narration",
      "textEn": "observable opening prose"
    },
    {
      "type": "dialogue",
      "actorId": "supplied_present_actor_id",
      "textEn": "spoken words only"
    }
  ]
}

${CANON_CAST_IDENTITY_CONTRACT}

${CANON_WIT_TONE_CONTRACT}`,
        },
        {
            role: 'user',
            content:
                JSON.stringify({
                    openingClock:
                        payload
                            .nextClock,
                    destinationAuthority,
                    nextScene: {
                        ...nextScene,
                        openingSegments:
                            undefined,
                    },
                    presentActorStates:
                        (
                            nextScene
                                .actorStates ||
                            []
                        ).filter(actor =>
                            actor.present ===
                                true),
                    actorProfiles:
                        projectActorLibraryForContext(
                            (
                                state
                                    .actorLibrary ||
                                []
                            ).filter(actor =>
                                presentActorIds
                                    .has(
                                        actor.id,
                                    )),
                            contextPlan,
                            {
                                includePrivate:
                                    false,
                                includeMemories:
                                    false,
                            },
                        ),
                    actorContinuityCapsules:
                        buildActorContinuityCapsules(
                            state,
                            [
                                ...presentActorIds,
                            ],
                            contextPlan,
                        ),
                    behavioralEnvironment:
                        buildBehavioralEnvironment(
                            projectedState,
                        ),
                    currentMaterialState:
                        buildCurrentMaterialState(
                            projectedState,
                        ),
                }),
        },
    ];
    let raw = '';
    let lastError = null;
    for (
        let attempt = 0;
        attempt < 2;
        attempt++
    ) {
        try {
            const response =
                await sendRoleRequest(
                    roleSlot,
                    attempt === 0
                        ? prompt
                        : [
                            {
                                role:
                                    'system',
                                content:
                                    'Repair the scene-opening performance. Return only a JSON object with 2-6 ordered segments. Keep all committed state unchanged. Use only supplied present actor IDs for dialogue. Do not enumerate the cast, restate actorStates, use "remains visible in the scene", or act for the player.',
                            },
                            {
                                role: 'user',
                                content:
                                    JSON.stringify({
                                        validationError:
                                            String(
                                                lastError
                                                    ?.message ||
                                                lastError ||
                                                '',
                                            ),
                                        invalidOutput:
                                            raw,
                                        originalRequest:
                                            JSON.parse(
                                                prompt[1]
                                                    .content,
                                            ),
                                    }),
                            },
                        ],
                    {
                        json: true,
                    },
                );
            raw =
                extractRoleResponseText(
                    response,
                );
            const parsed =
                parseJsonObject(raw);
            const segments =
                stripSyntheticSceneOpeningActorSegments(
                    parsed.segments,
                );
            const candidate =
                structuredClone(
                    payload,
                );
            candidate.nextScene
                .openingSegments =
                segments;
            const validation =
                validateSceneTransitionPackage(
                    candidate,
                    state,
                    {
                        expectedMapId:
                            nextScene.mapId,
                        expectedRoomId:
                            nextScene.roomId,
                        requireDestinationGrounding:
                            Boolean(
                                destinationAuthority,
                            ),
                    },
                );
            if (!validation.valid) {
                throw new Error(
                    validation.errors
                        .join('；'),
                );
            }
            return candidate;
        } catch (error) {
            lastError = error;
        }
    }
    console.warn(
        '[Hogwarts MUD] Low-tier scene opening failed; using the deterministic short opening',
        lastError,
    );
    return payload;
}

async function localizeSceneTransitionPackage(payload) {
    if (!getSettings().translationEnabled) {
        return payload;
    }
    const nextScene = payload.nextScene;
    const values = [
        payload.closureSummaryEn,
        payload.authorQuillEn,
        ...(payload.unresolvedThreadsEn || []),
        nextScene.nameEn,
        nextScene.summaryEn,
        nextScene.chapterEn,
        ...(nextScene.actorStates || []).map(actor => actor.currentActivityEn),
        ...(nextScene.openingSegments || []).map(segment => segment.textEn),
        nextScene.followingSceneIntent.titleEn,
        nextScene.followingSceneIntent.summaryEn,
        nextScene.followingSceneIntent.triggerEn,
    ];
    const translated = await translateOpeningValues(values);
    let cursor = 0;
    return {
        ...payload,
        translationProvider:
            getSettings()
                .translationProvider,
        closureSummary: translated[cursor++],
        authorQuill: translated[cursor++],
        unresolvedThreads: (payload.unresolvedThreadsEn || [])
            .map(() => translated[cursor++]),
        nextScene: {
            ...nextScene,
            name: translated[cursor++],
            summary: translated[cursor++],
            chapter: translated[cursor++],
            actorStates: (nextScene.actorStates || []).map(actor => ({
                ...actor,
                currentActivity: translated[cursor++],
            })),
            openingSegments: (nextScene.openingSegments || []).map(segment => ({
                ...segment,
                textZh: translated[cursor++],
            })),
            followingSceneIntent: {
                ...nextScene.followingSceneIntent,
                title: translated[cursor++],
                summary: translated[cursor++],
                trigger: translated[cursor++],
            },
        },
    };
}

function getCurrentSceneMessageIds(state) {
    const chat = getContext().chat;
    const sceneId = state.scene?.id;
    const isFirstScene = !(state.sceneArchive || []).length;
    const openingMessageId = isFirstScene
        ? chat.findIndex(message =>
            message.extra?.hogwartsMud?.role === 'opening_narrative')
        : -1;
    const start = Math.max(
        0,
        Math.min(
            Number(state.scene?.startedMessageId || 0),
            openingMessageId >= 0
                ? openingMessageId
                : Number.POSITIVE_INFINITY,
        ),
    );
    const ids = [];
    chat.forEach((message, messageId) => {
        if (messageId < start) return;
        if (message.is_user ||
            message.extra?.hogwartsMud?.sceneId === sceneId ||
            (isFirstScene &&
                message.extra?.hogwartsMud?.role === 'opening_narrative') ||
            (isFirstScene &&
                Array.isArray(message.extra?.hogwartsMud?.segments))) {
            ids.push(messageId);
        }
    });
    return ids;
}

function buildSceneArchiveEntry(state, payload, tier) {
    const messageIds =
        getCurrentSceneMessageIds(
            state,
        );
    const presence =
        projectSceneArchivePresence(
            state,
            {
                sceneId:
                    state.scene.id,
                messageIds,
            },
        );
    return {
        id: state.scene.id,
        name: state.scene.name,
        nameEn: state.scene.nameEn,
        summary: state.scene.summary,
        summaryEn: state.scene.summaryEn,
        closureSummary: payload.closureSummary || payload.closureSummaryEn,
        closureSummaryEn: payload.closureSummaryEn,
        authorQuill:
            payload.authorQuill ||
            payload.authorQuillEn,
        authorQuillEn: payload.authorQuillEn,
        unresolvedThreads: payload.unresolvedThreads || payload.unresolvedThreadsEn || [],
        unresolvedThreadsEn: payload.unresolvedThreadsEn || [],
        startedClock: state.scene.startedClock || state.clock,
        endedClock: state.clock,
        location: state.location,
        mapId: state.scene.mapId || state.map?.activeMapId,
        roomId: state.scene.roomId || state.map?.currentLocalNodeId,
        activeInteractionActorIds:
            presence
                .activeInteractionActorIds,
        localOccupantActorIds:
            presence
                .localOccupantActorIds,
        localCohortIds:
            presence.localCohortIds,
        events: presence.events,
        actorIds:
            presence.actorIds,
        messageIds,
        timelineEntries: structuredClone(
            state.scene.timelineEntries || [],
        ),
        tier,
        translationProvider:
            payload
                .translationProvider ||
            '',
        status: 'closed',
        closedAt: new Date().toISOString(),
    };
}

function buildSceneTransitionMessage(payload, state) {
    const segments = payload.nextScene.openingSegments;
    const sourceEn = composeSceneSegments(segments, state.actorLibrary, 'en');
    const translatedZh = composeSceneSegments(segments, state.actorLibrary, 'zh');
    const hasTranslation = getSettings().translationEnabled &&
        segments.some(segment => String(segment.textZh || '').trim()) &&
        translatedZh !== sourceEn;
    return {
        name: 'Scene',
        is_user: false,
        is_system: false,
        send_date: new Date().toISOString(),
        mes: sourceEn,
        extra: {
            hogwartsMud: {
                sourceEn,
                translatedZh: hasTranslation ? translatedZh : undefined,
                provider: hasTranslation
                    ? payload
                        .translationProvider ||
                        getSettings()
                            .translationProvider
                    : undefined,
                translatedAt: hasTranslation ? Date.now() : undefined,
                translationVersion: hasTranslation
                    ? TRANSLATION_FORMAT_VERSION
                    : undefined,
                role: 'scene_opening',
                sceneId: payload.nextScene.id,
                segments,
                sceneTransition: {
                    closureSummaryEn: payload.closureSummaryEn,
                    transitionMinutes: payload.transitionMinutes,
                },
                authorQuill:
                    payload.authorQuill ||
                    payload.authorQuillEn,
                authorQuillEn: payload.authorQuillEn,
            },
            ...(hasTranslation
                ? { display_text: translatedZh }
                : {}),
        },
    };
}

async function runSceneTransition({
    tier = 'medium',
    destinationHint = '',
} = {}) {
    if (sceneTransitionPromise) {
        return sceneTransitionPromise;
    }
    const context = getContext();
    let state = getMudState();
    if (!state?.scene || state.phase !== 'playing') {
        throw new Error('当前没有可以结束的活动场景。');
    }
    ensureSceneLifecycleState(state);
    const committedIntent = state.scene.nextSceneIntent;
    const defaultHint = formatNextSceneIntent(committedIntent);
    const destinationChanged = destinationHint.trim() !==
        defaultHint.trim();
    const tierChanged = tier !== committedIntent.tier;
    const intentOverride = {
        changed: destinationChanged || tierChanged,
        destinationChanged,
        tierChanged,
        text: destinationHint,
        requestedTier: tier,
    };
    const slots = resolveRoleSlots(state.modelSlots);
    const roleSlot = tier === 'high' ? slots.high : slots.medium;
    const contextPlan = createContextBudgetPlan(
        roleSlot.contextSize,
        roleSlot.maxResponseLength,
    );
    if (!roleSlot.profileId) {
        throw new Error(`未配置${tier === 'high' ? '高档' : '中档'} Connection Profile。`);
    }
    const expectedDestination = destinationChanged
        ? findSceneDestination(destinationHint, state)
        : {
            mapId: committedIntent.mapId,
            roomId: committedIntent.roomId,
        };

    sceneTransitionPromise = (async () => {
        sceneTransitionActive = true;
        const residentAdmission =
            admitCurrentLocationResidents(
                state,
                {
                    mapId:
                        expectedDestination
                            ?.mapId,
                    roomId:
                        expectedDestination
                            ?.roomId,
                    activate: false,
                },
            );
        state =
            residentAdmission.state;
        context.chatMetadata
            .hogwartsMud =
            state;
        state.sceneTransition = {
            status: 'resolving',
            tier,
            error: '',
            requestedAt: new Date().toISOString(),
            settledAt: null,
            destinationHint,
            expectedDestination,
            intentOverride,
        };
        await context.saveMetadata();
        renderAll();
        try {
            const entityIds = [
                state.scene.id,
                state.map?.activeMapId,
                state.map?.currentLocalNodeId,
                expectedDestination?.roomId,
                ...(state.actors || []).filter(actor => actor.present !== false)
                    .map(actor => actor.id),
            ].filter(Boolean);
            const retrievedKnowledge = await retrieveLocalKnowledge(
                `Close scene ${state.scene.nameEn || state.scene.name}. ` +
                `Next destination: ${destinationHint || 'director choice'}.`,
                entityIds,
                {
                    includeLockedClues: true,
                    limit: contextPlan.ragLimit,
                },
            );
            let payload = await generateSceneTransitionPackage(
                roleSlot,
                state,
                tier,
                destinationHint,
                expectedDestination,
                intentOverride,
                retrievedKnowledge,
                contextPlan,
            );
            const openingContextPlan =
                createContextBudgetPlan(
                    slots.low
                        .contextSize,
                    slots.low
                        .maxResponseLength,
                );
            if (
                !slots.low.profileId
            ) {
                throw new Error(
                    '未配置低档 Connection Profile，无法生成场景开场。',
                );
            }
            payload =
                await generateSceneTransitionOpening(
                    slots.low,
                    state,
                    payload,
                    expectedDestination,
                    openingContextPlan,
                );
            try {
                payload = await localizeSceneTransitionPackage(payload);
            } catch (translationError) {
                console.warn('[Hogwarts MUD] Scene transition translation failed; using English', translationError);
            }
            const archiveEntry = buildSceneArchiveEntry(state, payload, tier);
            const startedMessageId = context.chat.length;
            const nextState = applySceneTransition(
                state,
                payload,
                archiveEntry,
                {
                    expectedMapId: expectedDestination?.mapId,
                    expectedRoomId: expectedDestination?.roomId,
                    startedMessageId,
                    tier,
                },
            );
            const message = buildSceneTransitionMessage(payload, nextState);
            context.chatMetadata.hogwartsMud = nextState;
            context.chat.push(message);
            await context.saveMetadata();
            await context.saveChat();
            const interiorState =
                await ensureCurrentInteriorMap();
            const settledState =
                interiorState ||
                getMudState();
            await syncLocalKnowledge();
            applySystemPrompt();
            renderAll();
            if (settledState.dailyDirector?.date !== getWorldDate(settledState.clock)) {
                await ensureDailyDirectorPlan();
            }
            setTimeout(
                () => {
                    void ensureSocialDirectorCatchup({
                        force: true,
                    });
                },
                0,
            );
            toastr.success(`旧场景已封存，当前场景切换到${settledState.location}。`);
            return settledState;
        } catch (error) {
            state = getMudState();
            state.sceneTransition = {
                ...state.sceneTransition,
                status: 'failed',
                error: String(error?.cause?.message || error?.message || error),
                settledAt: null,
            };
            await context.saveMetadata();
            renderAll();
            throw error;
        } finally {
            sceneTransitionActive = false;
            sceneTransitionPromise = null;
            renderAll();
        }
    })();
    return sceneTransitionPromise;
}

const EXPLICIT_PROGRESSION_PATTERN =
    /(?:赶紧|立刻|现在|马上|开始|继续|带路|打开|开启|解锁|交给|给我|出发|跟上|跟着|进入|进去|走吧|走，|走。)|(?:open|unlock|start|continue|lead the way|let'?s go|go through|hand over)/i;

function createSceneMomentumDirective(
    state,
    playerAction,
    budget,
) {
    const nextIntent = state.scene?.nextSceneIntent || null;
    const intentLocationReached =
        Boolean(
            nextIntent?.mapId &&
            nextIntent?.roomId &&
            nextIntent.mapId ===
                state.map?.activeMapId &&
            nextIntent.roomId ===
                state.map
                    ?.currentLocalNodeId,
        );
    return {
        required: Number(budget.elapsedMinutes) >= 15,
        explicitProgressionRequest:
            EXPLICIT_PROGRESSION_PATTERN.test(
                String(playerAction || ''),
            ),
        playerRoomMustRemain:
            state.map?.currentLocalNodeId || null,
        committedNextSceneIntent: nextIntent,
        intentLocationReached,
        minimumCompletedProcedureUnits:
            intentLocationReached &&
            Number(
                budget.elapsedMinutes,
            ) >= 15
                ? 1
                : 0,
        unresolvedPublicPressureEn:
            state.scene?.pacingPressureEn || '',
        instruction:
            intentLocationReached
                ? 'The committed intent location is already reached. Complete at least one visible procedural unit beyond entry, setup, announcement, or preparation.'
                : nextIntent
                    ? 'Advance a deterministic NPC or procedural step toward the committed next intent without changing the player room.'
                    : 'Advance one concrete NPC, practical, informational, access, or social step.',
    };
}

function projectPacingDirectiveForPerformance(
    pendingBeat,
    addressing,
) {
    if (
        pendingBeat?.status !==
            'pending'
    ) {
        return null;
    }
    const projected =
        structuredClone(pendingBeat);
    const collapse =
        projected.causalCollapse;
    if (!collapse) {
        return projected;
    }
    const addressedActorIds =
        new Set(
            addressing?.actorIds ||
            [],
        );
    projected.causalCollapse = {
        recordId:
            collapse.recordId ||
            collapse.id,
        kind: collapse.kind,
        surfaceMode:
            collapse.surfaceMode,
        visibleResiduesEn:
            collapse
                .visibleResiduesEn,
        aftermathEn:
            collapse.aftermathEn,
        witnessAccounts:
            (
                collapse
                    .witnessAccounts ||
                []
            ).filter(account =>
                addressedActorIds
                    .has(
                        account
                            .actorId,
                    )),
    };
    return projected;
}

function createScenePerformancePrompt(
    state,
    playerAction,
    budget,
    retrievedKnowledge = [],
    movementResolution = null,
    momentumDirective = null,
    checkResolution = null,
    addressingOverride = null,
    mentionedKnownActors = [],
    contextPlan = createContextBudgetPlan(
        CONTEXT_SIZE_PRESETS.rich,
        DEFAULT_MODEL_SLOTS.low.maxResponseLength,
    ),
) {
    const addressing =
        addressingOverride
            ?.valid === true
            ? addressingOverride
            : resolvePlayerAddressing(
                getActiveAddressingState(
                    state,
                ),
                playerAction,
            );
    const narrativePlayerAction =
        removeExplicitAddressDirective(
            playerAction,
        );
    const currentRoomState =
        state.map
            ?.roomStates?.[
                `${state.map?.activeMapId}:${state.map?.currentLocalNodeId}`
            ] ||
        null;
    const sceneSafeRoomState =
        currentRoomState
            ? Object.fromEntries(
                Object.entries(
                    currentRoomState,
                ).filter(([key]) =>
                    key !==
                    'materialEffects'),
            )
            : null;
    const playerTurnSequence =
        buildStructuredPlayerTurnSequence(
            playerAction,
            addressing,
        );
    const privateKnowledgeActorIds =
        new Set(
            addressing.actorIds ||
            [],
        );
    const presentActorIds = new Set(
        state.actors.filter(actor => actor.present !== false).map(actor => actor.id),
    );
    const actorProfiles = state.actorLibrary
        .filter(actor => presentActorIds.has(actor.id))
        .map(actor => {
            return {
                id: actor.id,
                nameEn: actor.nameEn,
                roleEn: actor.roleEn,
                publicDescriptionEn:
                    actor.publicDescriptionEn,
                presentation:
                    state
                        .actorPresentations?.[
                            actor.id
                        ] ||
                    null,
                personalityEn: actor.personalityEn,
                speechStyleEn: actor.speechStyleEn,
            };
        });
    const addressedActorKnowledge =
        buildActorKnowledgeCapsules(
            state,
            [...privateKnowledgeActorIds],
            contextPlan,
        );
    const actorContinuityCapsules =
        buildActorContinuityCapsules(
            state,
            [...presentActorIds],
            contextPlan,
        );
    const behavioralEnvironment =
        buildBehavioralEnvironment(
            state,
        );
    const pacingDirective =
        projectPacingDirectiveForPerformance(
            state.pacingDirector
                ?.pendingBeat,
            addressing,
        );
    return [
        {
            role: 'system',
            content: `You are the low-tier On-Scene Performer for a persistent Harry Potter RPG. Render the already committed scene into vivid observable prose, physical action, and NPC dialogue. Return exactly one JSON object with no Markdown.

${CANON_CAST_IDENTITY_CONTRACT}

Strict boundaries:
- segments is the only required output field. State bookkeeping is handled by a deterministic settlement graph after your response. Omit optional metadata whenever no real state change occurred.
- You may perform mundane blocking, gestures, conversation, sensory changes, and ordinary consequences that follow directly from the player's stated action.
- You may not create a new location, formal NPC, item, spell, relationship, hidden fact, clue, rule result, or plot turn. The sole NPC exception is temporaryActorPromotionPolicy: promote a specific unnamed crowd member whom the player has already selected for direct, continuing interaction.
- playerTurnSequence is the sole authoritative ordered player input. direct_speech and broadcast_speech entries are already routed by the rules layer; action entries are never spoken dialogue. Preserve lineIndex and speechOrder. Never infer, replace, or merge an addressee from prose.
- addressing is routing metadata for playerTurnSequence. Do not reinterpret playerAction or names inside action entries to infer another addressee.
- mentionedKnownActors is rules-layer authority for familiar people explicitly named in action prose. Each listed actor is now present in the current room. Depict an observable response to the acknowledged gesture or action; do not replace them with an anonymous bystander.
- Every direct block's targetActorId must visibly answer, refuse, evade, fail to hear, be interrupted for a concrete reason, or leave before the next direct block is resolved. Broadcast blocks address the room. In open mode, do not infer a private addressee from names mentioned in prose.
- addressedActorKnowledge contains sealed actor-ID capsules. An NPC may use only the capsule whose actorId exactly equals that NPC's ID. Never transfer, paraphrase, imply, or reveal a memory, directive, impression, claim, relationship, rumor, private goal, fear, secret, or inference from one capsule through another NPC or the narrator.
- actorContinuityCapsules contain non-secret relationship continuity for the matching actor. If hasMetPlayer is true, treat the player as already known. Treat knownActorIds as people that actor has already met. Use relationshipToPlayer.stageEn and sharedMemories instead of generic or stale relationship labels, but never transfer one actor's continuity through another.
- actorProfiles and presentActors are public performance data only. An actor absent from addressedActorKnowledge may use only current-scene observations, public profile fields, the current player action, and common retrievedLocalKnowledge.
- socialKnowledge statements and relationship evidence are known to that capsule's actor because they spoke, directly participated, or were recorded as a witness. The fact that another capsule knows something never makes it common knowledge.
- stateProposals are sparse, optional hints. Emit one only when the prose actually changes an NPC's activity/presence/room, creates a temporary actor, changes an item, or supplies a directly witnessed social hint. Never repeat unchanged state.
- social_hint is optional and actor-scoped. Never write core memory, relationship labels, private facts, or deductions. The settlement graph enforces visibility, cooldown, and significance independently.
- Follow the committed scene, actor profiles, local records, and today's medium-tier directives exactly.
- Daily directives can outlive a scene transition. Current committed scene, location, rooms, and currentActivityEn always override stale locations or completed actions mentioned in a daily directive.
- behavioralEnvironment is binding current context. Materially embody time period, daylight, sleep pressure, curfew, weather, exposure, clothing, shelter, noise, and activity effects when relevant. It overrides stale daily timing or location guidance. Do not recite it as a checklist.
- If pacingDirective is supplied, it is already committed mid-tier authority. Realize its beat and pressure during this turn using only the actors already present in this input, plus any player-selected unnamed person who must be promoted under temporaryActorPromotionPolicy. Do not add anything else beyond that directive.
- If pacingDirective contains causalCollapse, show its visibleResiduesEn and aftermathEn before explaining anything. The narrator must not state or infer the hidden cause. Only an actor-specific witnessAccounts entry or that actor's sealed causalFacts may be spoken, and only by the matching directly addressed actor.
- currentRoomState.visibleResiduesEn contains previously committed aftermath that remains physically or institutionally observable. Preserve it until a later authoritative state change removes it; visibility does not grant knowledge of its hidden cause.
- A named residue or belonging never makes its owner present. Only presentActors entries with present true may speak, act, move, or receive state proposals; do not admit an absent owner because their blanket, trunk, note, damage, or other aftermath remains in the room.
- currentMaterialState is binding visual state for the player, present actors, and this room only. Preserve active outfits, accessories, hairstyles, visible conditions, held objects and hands, placements, moves, removals, furnishing adjustments, damage, repairs, dirt, and cleaning silently unless relevant; do not reset anything merely because this turn does not mention it.
- Use only facts already observable in the scene or explicitly supplied in the scene-safe local records. Never disclose a locked clue or infer a private fact.
- Never add speech, thoughts, intentions, or choices for the player beyond the supplied action.
- NPCs have agency. They must pursue their committed goals, initiate practical steps, and act without waiting for the player to prompt every motion.
- Do not stop immediately before a deterministic NPC action that the player already requested and whose prerequisites are satisfied. Opening an established door, demonstrating a known mechanism, handing over a prepared object, or beginning an agreed procedure is progression, not control of the player.
- Never turn "McGonagall opens the wall" into "McGonagall raises her wand and is about to open the wall." Complete the NPC action, then stop at the new choice or consequence it creates.
- Do not move the player to another authoritative room unless movementResolution already committed that move. NPCs may open access, move along valid routes, and expose what lies beyond while the player remains free to follow or refuse.
- The rules layer has already settled player movement in spatialContext. Begin with the player at that committed room and never move them back.
- NPCs in another room may react only when spatialContext says they can see or hear the player. Do not teleport an NPC between rooms.
- actor_move proposals may move an NPC only through existing connected rooms on the same map. Omit the proposal when no movement occurs.
- If checkResolution is supplied, the local rules layer has already resolved the uncertain action. Depict its exact outcome and consequences; never reroll, change the modifier, soften a failure, or stop before the resolved outcome.
- Never reveal checkResolution.hidden, an opponent roll, or an exact hidden difficulty in prose or dialogue.
- If checkResolution is null, do not invent a roll or claim that a check occurred.
- The scene must plausibly cover ${budget.elapsedMinutes} in-world minutes. This is a duration to dramatize, not a timestamp to mention.
- Quantified relative narration such as "five minutes later" or "ten minutes ago" is allowed only when it remains within this turn's ${budget.elapsedMinutes}-minute span. Never invent an absolute clock, date, opening time, transport schedule, external countdown, or a relative duration longer than this turn.
- Do not pad with empty chatter. Let conversation, practical movement, pauses, social friction, and environmental continuity make the duration believable.
- For this duration and cast size, write approximately ${budget.minimumWords}-${budget.maximumWords} English words across ${budget.minimumSegments || 4}-${budget.maximumSegments || 16} ordered segments.
- Include at least two narration segments. Use dialogue segments only for present actors.
- When ensemblePolicy is supplied, the extra budget exists to preserve both crowd life and story movement. Reserve at least ${Math.round((budget.primaryProgressionShare || 0.4) * 100)}% of the response for the primary interaction and concrete progression after the player's immediate action.
- Ensemble texture is simultaneous background, not a roll call. Individuate at most ${budget.maximumIndividuatedSecondaryActors || 2} secondary named actors unless the player directly affects more. Do not spend one reaction sentence proving that every present actor still exists.
- Apply temporaryActorPromotionPolicy independently of the medium-tier pacing cooldown. Merely looking across a crowd keeps people anonymous. Selecting one specific unnamed person and sitting beside, addressing, touching, displacing, following, blocking, giving to, taking from, or otherwise directly affecting them requires promotion in this response.
- A promoted person must use a new stable snake_case ID not listed in reservedActorIds, appear visibly in segments, and receive one temporary_actor proposal. Use an observable descriptor as nameEn until the story reveals a real name. Do not invent secrets, private history, special powers, or a relationship.
- A promoted actor's publicDescriptionEn contains stable physical traits only. Exclude clothing, accessories, held items, nearby belongings, pose, activity, and location; currentActivityEn and the material observer own those dynamic details.
- A 15-minute turn must materially advance at least one concrete axis: NPC initiative, access change, practical procedure, new bounded information, or social position. Furnishings, bystander reactions, and repeated explanations do not count by themselves.
- If momentumDirective.explicitProgressionRequest is true, complete that requested procedural step in the prose. An optional signals.sceneProgression may report the completion, but omission never invalidates good prose.
- If momentumDirective.intentLocationReached is true, entry, lining up, opening doors, introductions, songs, announcements, and "about to begin" beats are setup rather than completed procedure units. Render at least momentumDirective.minimumCompletedProcedureUnits finished unit beyond setup before stopping.
- signals.eventEnded is optional and true only when a bounded interaction or procedure phase genuinely closes. Omit signals rather than filling them mechanically.
- If pacingDirective is visibly realized, signals.pacingBeatRealized may be true. The settlement graph does not require this bookkeeping field.

Schema:
{
  "segments":[
    {"type":"narration","textEn":"observable scene prose and action"},
    {"type":"dialogue","actorId":"actor_id","textEn":"spoken words only"}
  ],
  "stateProposals":[
    {
      "type":"actor_activity|actor_move|actor_enter|actor_exit",
      "actorId":"actor_id",
      "currentActivityEn":"only when changed",
      "mapId":"existing_map_id when moving",
      "roomId":"reachable_room_id when moving"
    },
    {
      "type":"social_hint",
      "actorId":"actor_id",
      "firstImpressionOfPlayerEn":"optional first impression",
      "impressionOfPlayerEn":"optional concrete current opinion based on this turn",
      "memoryUpdate":{
        "summaryEn":"optional directly witnessed experience",
        "significance":"everyday|notable",
        "lastingImpactEn":"required only for notable"
      }
    },
    {
      "type":"item_update",
      "item":{"id":"stable_item_id","action":"acquire|update|carry|equip|store|consume|lose"}
    },
    {
      "type":"temporary_actor",
      "actor":{
        "id":"new_stable_snake_case_id",
        "nameEn":"observable public name or descriptor",
        "roleEn":"ordinary scene role",
        "publicDescriptionEn":"stable physical traits only; no clothing, props, activity, or location",
        "personalityEn":"performable public temperament",
        "speechStyleEn":"performable speech style",
        "currentActivityEn":"observable activity at entry"
      }
    }
  ],
  "signals":{
    "eventEnded":false,
    "pacingBeatRealized":false,
    "sceneProgression":{
      "type":"npc_initiative|access_change|practical_step|new_information|social_shift",
      "summaryEn":"optional completed change",
      "completedRequestedStep":false
    }
  }
}

${CANON_WIT_TONE_CONTRACT}`,
        },
        {
            role: 'user',
            content: JSON.stringify({
                playerAction:
                    narrativePlayerAction,
                playerTurnSequence,
                addressing,
                privateKnowledgeActorIds:
                    [...privateKnowledgeActorIds],
                addressedActorKnowledge,
                actorContinuityCapsules,
                behavioralEnvironment,
                elapsedMinutes: budget.elapsedMinutes,
                targetWordRange: [budget.minimumWords, budget.maximumWords],
                ensemblePolicy:
                    budget.ensemble
                        ? {
                            activeNamedActorCount:
                                budget
                                    .activeNamedActorCount,
                            targetSegmentRange: [
                                budget
                                    .minimumSegments,
                                budget
                                    .maximumSegments,
                            ],
                            primaryProgressionShare:
                                budget
                                    .primaryProgressionShare,
                            maximumIndividuatedSecondaryActors:
                                budget
                                    .maximumIndividuatedSecondaryActors,
                        }
                        : null,
                clockBeforeTurn: state.clock,
                currentScene: state.scene,
                currentLocation: state.location,
                currentRoomId: state.map?.currentLocalNodeId,
                currentRoomState:
                    sceneSafeRoomState,
                currentMaterialState:
                    buildCurrentMaterialState(
                        state,
                    ),
                movementResolution,
                momentumDirective,
                checkResolution,
                mentionedKnownActors,
                spatialContext: buildSpatialContext(state),
                temporaryActorPromotionPolicy:
                    buildTemporaryActorPromotionPolicy(
                        state,
                    ),
                presentActors: state.actors.map(actor => ({
                    id: actor.id,
                    nameEn: actor.nameEn,
                    roleEn: actor.roleEn,
                    publicDescriptionEn: actor.publicDescriptionEn,
                    presentation:
                        state
                            .actorPresentations?.[
                                actor.id
                            ] ||
                        null,
                    currentActivityEn: actor.currentActivityEn,
                    mapId: actor.mapId,
                    roomId: actor.roomId,
                    present: actor.present !== false,
                })),
                actorProfiles,
                pacingDirective,
                retrievedLocalKnowledge: formatRetrievedKnowledge(retrievedKnowledge),
                contextPolicy: {
                    mode: contextPlan.mode,
                    label: contextPlan.label,
                    inputBudget:
                        contextPlan.inputBudget,
                    ragLimit: contextPlan.ragLimit,
                    memoryLimits:
                        contextPlan.memoryLimits,
                },
            }),
        },
    ];
}

async function settleScenePerformance(
    payload,
    state,
    {
        playerAction,
        movementResolution,
        momentumDirective,
        checkResolution,
        admittedActors,
    },
) {
    const input = {
        payload,
        worldState: state,
        playerAction,
        movementResolution,
        momentumDirective,
        checkResolution,
        admittedActors,
    };
    try {
        const response = await fetch(
            '/api/hogwarts-mud/turn/settle',
            {
                method: 'POST',
                headers:
                    getRequestHeaders(),
                body:
                    JSON.stringify(
                        input,
                    ),
            },
        );
        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`,
            );
        }
        const result =
            await response.json();
        if (
            !result?.performance ||
            typeof result.performance !==
                'object'
        ) {
            throw new Error(
                'Turn settlement graph returned no performance.',
            );
        }
        return {
            ...result.performance,
            settlementSource:
                'langgraph',
        };
    } catch (error) {
        console.warn(
            '[Hogwarts MUD] Turn settlement graph unavailable; using local reducer',
            error,
        );
        return {
            ...settleNarrativeTurnPerformance(
                payload,
                state,
                {
                    playerAction,
                    movementResolution,
                    momentumDirective,
                    checkResolution,
                    admittedActors,
                },
            ),
            settlementSource:
                'local_reducer',
        };
    }
}

async function generateScenePerformance(
    lowSlot,
    state,
    playerAction,
    budget,
    retrievedKnowledge,
    movementResolution,
    momentumDirective,
    checkResolution,
    addressing,
    mentionedKnownActors,
    contextPlan,
) {
    if (!lowSlot.profileId) {
        throw new Error('现场表演没有可用的低档 Connection Profile。');
    }
    const scenePrompt = createScenePerformancePrompt(
        state,
        playerAction,
        budget,
        retrievedKnowledge,
        movementResolution,
        momentumDirective,
        checkResolution,
        addressing,
        mentionedKnownActors,
        contextPlan,
    );
    beginLiveSceneStream(checkResolution);
    let response = await sendRoleRequest(
        lowSlot,
        scenePrompt,
        {
            json: true,
            stream: true,
            onProgress: rawText =>
                updateLiveSceneStream(
                    rawText,
                    'receiving',
                ),
        },
    );
    let raw = extractRoleResponseText(response);
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            let parsedPayload;
            try {
                parsedPayload = parseJsonObject(raw);
            } catch (parseError) {
                parsedPayload =
                    recoverScenePerformancePayload(raw);
                if (!parsedPayload) throw parseError;
            }
            if (
                !Array.isArray(
                    parsedPayload
                        ?.segments,
                )
            ) {
                parsedPayload =
                    recoverScenePerformancePayload(raw) ||
                    parsedPayload;
            }
            const payload =
                await settleScenePerformance(
                    parsedPayload,
                    state,
                    {
                        playerAction,
                        movementResolution,
                        momentumDirective,
                        checkResolution,
                        admittedActors:
                            mentionedKnownActors,
                    },
                );
            const validation = validateScenePerformance(
                payload,
                state,
                budget,
                momentumDirective,
                checkResolution,
                movementResolution,
                playerAction,
            );
            if (!validation.valid) {
                throw new Error(validation.errors.join('；'));
            }
            setLiveSceneStreamPhase(
                'receiving',
                payload.segments,
            );
            return payload;
        } catch (error) {
            lastError = error;
            if (attempt > 0) break;
            setLiveSceneStreamPhase('repairing');
            response = await sendRoleRequest(lowSlot, [
                {
                    role: 'system',
                    content: `Repair only the narrative core of the on-scene performance JSON. Return ${budget.minimumSegments || 4}-${budget.maximumSegments || 16} ordered narration/dialogue segments with at least two narration segments. Every segment must contain concrete observable prose or spoken words; never return ellipses, TBD, or placeholder text. Each dialogue segment must use a supplied present actor ID. Preserve every already valid segment, but rewrite any sentence named by validationError. stateProposals and signals are optional; omit them rather than inventing metadata. If checkResolution exists, visibly apply that exact local result without rerolling or changing it. If momentumDirective requests a deterministic action whose prerequisites are satisfied, complete it in the prose rather than stopping at preparation. If a pacingDirective exists, visibly perform it using the supplied actors. Preserve the committed player room and actor rooms. The prose must plausibly cover ${budget.elapsedMinutes} minutes. Quantified relative narration is allowed only within that ${budget.elapsedMinutes}-minute span; never invent an absolute clock, date, schedule, external countdown, or longer relative duration. Do not add world facts or locked clues. Return one JSON object with no Markdown.`,
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        validationError: String(error?.message || error),
                        invalidOutput: raw,
                        requiredSchema: scenePrompt[0].content,
                        originalSceneInput: JSON.parse(scenePrompt[1].content),
                    }),
                },
            ], {
                json: true,
                stream: true,
                onProgress: rawText =>
                    updateLiveSceneStream(
                        rawText,
                        'repairing',
                    ),
            });
            raw = extractRoleResponseText(response);
        }
    }
    throw new Error(`低档现场表演连续两次无效：${String(lastError?.message || lastError)}`);
}

function buildSceneTransaction(
    performance,
    budget,
    pacingBeat = null,
    checkResolution = null,
) {
    return {
        protocolVersion:
            performance
                .protocolVersion ||
            2,
        settlementSource:
            performance
                .settlementSource ||
            'unknown',
        elapsedMinutes: budget.elapsedMinutes,
        instantaneousMagic: budget.elapsedMinutes < 15,
        exceptionReasonEn: budget.elapsedMinutes < 15
            ? 'The local semantic adjudicator classifies the enacted action as instantaneous.'
            : '',
        publicEventEn: performance.publicEventEn,
        eventEnded:
            performance.eventEnded ===
            true,
        sceneProgression: structuredClone(
            performance.sceneProgression,
        ),
        segments: performance.segments,
        actorPresence:
            structuredClone(
                performance.actorPresence,
            ),
        actorUpdates: Array.isArray(performance.actorUpdates)
            ? performance.actorUpdates
            : [],
        temporaryActorEntrances:
            Array.isArray(
                performance
                    .temporaryActorEntrances,
            )
                ? performance
                    .temporaryActorEntrances
                : [],
        itemUpdates:
            Array.isArray(
                performance.itemUpdates,
            )
                ? performance.itemUpdates
                : [],
        revealedClues:
            Array.isArray(
                performance
                    .revealedClues,
            )
                ? performance
                    .revealedClues
                : [],
        settlementWarnings:
            Array.isArray(
                performance
                    .settlementWarnings,
            )
                ? performance
                    .settlementWarnings
                : [],
        ...(checkResolution ? {
            checkResolution: structuredClone(
                checkResolution,
            ),
        } : {}),
        ...(pacingBeat ? {
            pacingBeat: structuredClone(pacingBeat),
        } : {}),
    };
}

async function localizeTurnTransaction(transaction) {
    const temporaryActorEntrances =
        (
            transaction
                .temporaryActorEntrances ||
            []
        ).map(actor => ({
            ...actor,
            ...resolveTemporaryActorRevealedName(
                actor,
                transaction.segments,
            ),
        }));
    const source = {
        ...transaction,
        temporaryActorEntrances,
    };
    if (!getSettings().translationEnabled) {
        return source;
    }
    const values = [
        source.publicEventEn,
        ...source.segments.map(segment => segment.textEn),
        ...(source.actorUpdates || []).flatMap(update => [
            update.currentActivityEn || '',
            update.currentIntentEn || '',
            update.impressionOfPlayerEn || '',
            update.memoryUpdate?.summaryEn || '',
        ]),
        ...temporaryActorEntrances.flatMap(actor => [
            actor.nameEn,
            actor.roleEn,
            actor.publicDescriptionEn,
            actor.personalityEn,
            actor.speechStyleEn,
            actor.currentActivityEn,
        ]),
        ...(source.revealedClues || []).flatMap(clue => [
            clue.labelEn,
            clue.detailEn,
        ]),
    ];
    const translated = await translateOpeningValues(values);
    let cursor = 0;
    const localized = {
        ...source,
        publicEvent: translated[cursor++],
        segments: source.segments.map(segment => ({
            ...segment,
            textZh: translated[cursor++],
        })),
        actorUpdates: [],
        temporaryActorEntrances: [],
        revealedClues: [],
    };
    (source.actorUpdates || []).forEach(update => {
        const currentActivity = translated[cursor++];
        const currentIntent = translated[cursor++];
        const impressionOfPlayer = translated[cursor++];
        const memorySummary = translated[cursor++];
        localized.actorUpdates.push({
            ...update,
            currentActivity,
            currentIntent,
            ...(update.impressionOfPlayerEn
                ? { impressionOfPlayer }
                : {}),
            ...(update.memoryUpdate
                ? {
                    memoryUpdate: {
                        ...update.memoryUpdate,
                        summary: memorySummary,
                    },
                }
                : {}),
        });
    });
    temporaryActorEntrances.forEach(actor => {
        localized
            .temporaryActorEntrances
            .push({
                ...actor,
                name:
                    translated[cursor++],
                role:
                    translated[cursor++],
                publicDescription:
                    translated[cursor++],
                personality:
                    translated[cursor++],
                speechStyle:
                    translated[cursor++],
                currentActivity:
                    translated[cursor++],
            });
    });
    (source.revealedClues || []).forEach(clue => {
        localized.revealedClues.push({
            ...clue,
            label: translated[cursor++],
            detail: translated[cursor++],
        });
    });
    return localized;
}

function buildLocalSemanticActorContext(
    state,
) {
    const profiles =
        new Map(
            (
                state.actorLibrary ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const localOccupantIds =
        new Set(
            state.localPresence
                ?.occupantActorIds ||
            [],
        );
    return [
        {
            id: 'player',
            nameEn:
                state.character
                    ?.identity
                    ?.name ||
                'Player',
            roleEn:
                'Player character',
            currentActivityEn: '',
            mapId:
                state.map
                    ?.activeMapId ||
                '',
            roomId:
                state.map
                    ?.currentLocalNodeId ||
                '',
        },
        ...(
            state.actors ||
            []
        )
            .filter(actor =>
                actor.present !==
                    false ||
                localOccupantIds
                    .has(actor.id))
            .map(actor => {
                const profile =
                    profiles.get(
                        actor.id,
                    ) ||
                    {};
                return {
                    id: actor.id,
                    nameEn:
                        actor.nameEn ||
                        profile.nameEn ||
                        '',
                    roleEn:
                        actor.roleEn ||
                        profile.roleEn ||
                        '',
                    currentActivityEn:
                        actor
                            .currentActivityEn ||
                        '',
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
                };
            }),
    ];
}

function buildLocalSemanticRoomContext(
    state,
) {
    const map =
        buildLocalMapModel(
            state.map?.activeMapId,
            state.map,
            state.map?.currentLevelId,
        );
    return {
        mapId:
            state.map?.activeMapId ||
            state.scene?.mapId ||
            '',
        currentRoomId:
            state.map
                ?.currentLocalNodeId ||
            state.scene?.roomId ||
            '',
        rooms:
            (map?.nodes || [])
                .map(room => ({
                    id: room.id,
                    nameEn:
                        room.nameEn ||
                        room.name ||
                        room.id,
                    kind:
                        room.kind ||
                        '',
                })),
        exits:
            (map?.exits || [])
                .map(exit => ({
                    from:
                        exit.from,
                    to: exit.to,
                    minutes:
                        Number(
                            exit.minutes ||
                            1,
                        ),
                })),
    };
}

function createFallbackLocalAdjudication(
    movementResolution,
    forceCheck,
    error = '',
) {
    const routeMinutes =
        movementResolution?.moved
            ? Math.max(
                15,
                Number(
                    movementResolution
                        .minutes ||
                    0,
                ) ||
                15,
            )
            : 15;
    return {
        result: {
            schemaVersion: 1,
            temporal: {
                mode:
                    movementResolution
                        ?.moved
                        ? 'travel'
                        : 'ordinary',
                elapsedMinutes:
                    routeMinutes,
                basis:
                    movementResolution
                        ?.moved
                        ? 'route'
                        : 'fallback',
                evidenceText: '',
                reasonEn:
                    'Narrative-first fallback uses one ordinary short turn.',
                confidence: 0,
            },
            check: {
                required:
                    Boolean(
                        forceCheck,
                    ),
                ruleId:
                    forceCheck
                        ? 'forced_general'
                        : 'none',
                targetActorId: '',
                reasonEn:
                    forceCheck
                        ? 'The player explicitly requested a check.'
                        : 'Automatic checks are skipped while the local semantic adjudicator is unavailable.',
                confidence: 0,
            },
        },
        diagnostics: {
            fallback: true,
            error:
                String(
                    error || '',
                ).slice(0, 500),
        },
    };
}

async function requestLocalTurnAdjudication(
    state,
    playerAction,
    addressing,
    movementResolution,
    forceCheck,
) {
    try {
        const response =
            await fetch(
                '/api/hogwarts-mud/local/adjudicate',
                {
                    method: 'POST',
                    headers:
                        getRequestHeaders(),
                    body:
                        JSON.stringify({
                            input: {
                                playerTurnSequence:
                                    buildStructuredPlayerTurnSequence(
                                        playerAction,
                                        addressing,
                                    ),
                                forcedCheck:
                                    Boolean(
                                        forceCheck,
                                    ),
                                clock:
                                    state.clock,
                                scene: {
                                    id:
                                        state.scene
                                            ?.id ||
                                        '',
                                    summaryEn:
                                        state.scene
                                            ?.summaryEn ||
                                        '',
                                    nextSceneIntent:
                                        state.scene
                                            ?.nextSceneIntent ||
                                        null,
                                    recentTimeline:
                                        (
                                            state.scene
                                                ?.timelineEntries ||
                                            []
                                        ).slice(-4),
                                },
                                room:
                                    buildLocalSemanticRoomContext(
                                        state,
                                    ),
                                actors:
                                    buildLocalSemanticActorContext(
                                        state,
                                    ),
                                movementResolution:
                                    movementResolution ||
                                    null,
                                timePolicy:
                                    state
                                        .dailyDirector
                                        ?.plan
                                        ?.timePolicy ||
                                    {},
                            },
                        }),
                },
            );
        if (!response.ok) {
            throw new Error(
                (
                    await response.text()
                ).slice(0, 1_000) ||
                `HTTP ${response.status}`,
            );
        }
        const adjudication =
            await response.json();
        const temporal =
            adjudication
                ?.result
                ?.temporal;
        if (
            !temporal ||
            !Number.isInteger(
                temporal
                    .elapsedMinutes,
            )
        ) {
            throw new Error(
                'Local adjudicator returned no temporal decision.',
            );
        }
        if (
            temporal.mode !==
                'instantaneous' &&
            temporal.elapsedMinutes <
                15
        ) {
            temporal.elapsedMinutes =
                15;
        }
        return adjudication;
    } catch (error) {
        console.warn(
            '[Hogwarts MUD] Local semantic adjudication failed; using narrative-first fallback',
            error,
        );
        return createFallbackLocalAdjudication(
            movementResolution,
            forceCheck,
            error?.message ||
            error,
        );
    }
}

function findObservationEvidence(
    sourceText,
    evidenceText,
) {
    const evidence =
        String(
            evidenceText || '',
        ).trim();
    if (!evidence) {
        return null;
    }
    const start =
        String(sourceText || '')
            .indexOf(evidence);
    if (start < 0) {
        return null;
    }
    return {
        text: evidence,
        start,
        end:
            start +
            evidence.length,
    };
}

function resolveObservedMaterialActorId(
    event,
    state,
    evidenceText,
) {
    if (
        event.sourceKind ===
            'player'
    ) {
        return 'player';
    }
    const evidence =
        String(
            evidenceText || '',
        ).toLocaleLowerCase();
    const candidates = [
        {
            id: 'player',
            names: [
                state.character
                    ?.identity
                    ?.name,
                'Tina',
                '蒂娜',
            ],
        },
        ...(
            state.actors ||
            []
        ).map(actor => ({
            id: actor.id,
            names: [
                actor.name,
                actor.nameEn,
                ...(actor.aliases ||
                    []),
            ],
        })),
    ]
        .flatMap(candidate =>
            candidate.names
                .filter(Boolean)
                .map(name => ({
                    id:
                        candidate.id,
                    name:
                        String(name)
                            .toLocaleLowerCase(),
                })))
        .sort((left, right) =>
            right.name.length -
            left.name.length);
    const matched =
        candidates.find(candidate =>
            candidate.name.length >=
                2 &&
            evidence.includes(
                candidate.name,
            ));
    if (matched) {
        return matched.id;
    }
    const validIds =
        new Set([
            'player',
            ...(
                state.actors ||
                []
            ).map(actor =>
                actor.id),
        ]);
    return validIds.has(
        event.actorId,
    )
        ? event.actorId
        : '';
}

function projectObservedMaterialEvents(
    observation,
    state,
    playerAction,
    narrativeText,
) {
    return (
        observation?.result
            ?.materialEvents ||
        []
    )
        .filter(event =>
            Number(
                event.confidence ||
                0,
            ) >= 0.55)
        .map(event => {
            const sourceText =
                event.sourceKind ===
                    'player'
                    ? playerAction
                    : narrativeText;
            const evidence =
                findObservationEvidence(
                    sourceText,
                    event.evidenceText,
                );
            if (!evidence) {
                return null;
            }
            const actorId =
                resolveObservedMaterialActorId(
                    event,
                    state,
                    evidence.text,
                );
            const actor =
                (
                    state.actors ||
                    []
                ).find(item =>
                    item.id ===
                        actorId);
            const objectIsActor =
                event.type ===
                    'object_moved' &&
                actor &&
                [
                    actor.name,
                    actor.nameEn,
                    ...(actor.aliases ||
                        []),
                ]
                    .filter(Boolean)
                    .some(name =>
                        String(
                            event
                                .objectText ||
                            '',
                        )
                            .toLocaleLowerCase()
                            .includes(
                                String(name)
                                    .toLocaleLowerCase(),
                            ));
            if (objectIsActor) {
                return null;
            }
            return {
                ...event,
                actorId:
                    actorId,
                id: '',
                mapId:
                    state.map
                        ?.activeMapId ||
                    state.scene
                        ?.mapId ||
                    '',
                roomId:
                    state.map
                        ?.currentLocalNodeId ||
                    state.scene
                        ?.roomId ||
                    '',
                sceneId:
                    state.scene
                        ?.id ||
                    '',
                sourceKinds: [
                    event
                        .sourceKind,
                ],
                evidence: [
                    evidence,
                ],
            };
        })
        .filter(Boolean);
}

function findActorObservationEvidence(
    narrativeText,
    observed,
    actor,
    roomContext,
) {
    const profileNames = [
        actor.name,
        actor.nameEn,
        ...(actor.aliases || []),
    ]
        .filter(Boolean)
        .map(name =>
            String(name)
                .toLocaleLowerCase());
    const exact =
        findObservationEvidence(
            narrativeText,
            observed.evidenceText,
        );
    if (
        exact &&
        profileNames.some(name =>
            exact.text
                .toLocaleLowerCase()
                .includes(name))
    ) {
        return exact;
    }
    const targetRoom =
        roomContext.rooms.find(
            room =>
                room.id ===
                    observed.roomId,
        );
    const roomNames = [
        observed.roomId,
        targetRoom?.nameEn,
    ]
        .filter(Boolean)
        .map(name =>
            String(name)
                .replace(/_/gu, ' ')
                .toLocaleLowerCase());
    const sentences =
        String(narrativeText || '')
            .match(
                /[^.!?\n]+(?:[.!?]+|$)/gu,
            ) ||
        [];
    const sentence =
        sentences.find(value => {
            const normalized =
                value
                    .toLocaleLowerCase();
            return profileNames
                .some(name =>
                    normalized.includes(
                        name,
                    )) &&
                (
                    !roomNames.length ||
                    roomNames.some(name =>
                        normalized.includes(
                            name,
                        ))
                );
        });
    return sentence
        ? findObservationEvidence(
            narrativeText,
            sentence.trim(),
        )
        : null;
}

function recoverObservedActorMovements(
    observation,
    state,
    narrativeText,
) {
    const result =
        observation?.result;
    if (!result) {
        return;
    }
    const roomContext =
        buildLocalSemanticRoomContext(
            state,
        );
    const boundary =
        result.eventBoundary;
    const boundaryEvidence =
        findObservationEvidence(
            narrativeText,
            boundary?.evidenceText,
        );
    const recovered =
        [];
    for (
        const event
        of result.materialEvents ||
        []
    ) {
        if (
            event.type !==
                'object_moved' ||
            event.sourceKind !==
                'narrative'
        ) {
            continue;
        }
        const evidence =
            findObservationEvidence(
                narrativeText,
                event.evidenceText,
            );
        if (!evidence) {
            continue;
        }
        const actorId =
            resolveObservedMaterialActorId(
                event,
                state,
                evidence.text,
            );
        const actor =
            (
                state.actors ||
                []
            ).find(item =>
                item.id ===
                    actorId);
        if (!actor) {
            continue;
        }
        const targetRoom =
            roomContext.rooms.find(
                room =>
                    [
                        room.id,
                        room.nameEn,
                    ]
                        .filter(Boolean)
                        .some(name =>
                            String(
                                event
                                    .targetText ||
                                '',
                            )
                                .replace(
                                    /_/gu,
                                    ' ',
                                )
                                .toLocaleLowerCase()
                                .includes(
                                    String(name)
                                        .replace(
                                            /_/gu,
                                            ' ',
                                        )
                                        .toLocaleLowerCase(),
                                )),
            );
        if (!targetRoom) {
            continue;
        }
        recovered.push({
            actorId:
                actor.id,
            currentActivityEn:
                evidence.text,
            presence:
                boundary?.ended &&
                boundaryEvidence &&
                targetRoom.id !==
                    roomContext
                        .currentRoomId
                    ? 'absent'
                    : 'present',
            roomId:
                targetRoom.id,
            evidenceText:
                evidence.text,
            confidence:
                Math.max(
                    0.75,
                    Number(
                        event.confidence ||
                        0,
                    ),
                ),
        });
    }
    const byActor =
        new Map(
            (
                result.actorUpdates ||
                []
            ).map(update => [
                update.actorId,
                update,
            ]),
        );
    for (const update of recovered) {
        byActor.set(
            update.actorId,
            update,
        );
    }
    result.actorUpdates =
        [...byActor.values()];
}

function isObservedEventBoundary(
    observation,
    narrativeText,
) {
    const boundary =
        observation?.result
            ?.eventBoundary;
    if (
        !boundary?.ended ||
        Number(
            boundary.confidence ||
            0,
        ) < 0.55
    ) {
        return false;
    }
    const evidence =
        findObservationEvidence(
            narrativeText,
            boundary.evidenceText,
        );
    if (!evidence) {
        return false;
    }
    return /(?:\bleft\b|\bwalked (?:out|away|through)\b|\bdeparted\b|\bwas gone\b|\bfinished\b|\bcompleted\b|\bended\b|\bclosed\b|离开|走出|完成|结束|告一段落)/iu
        .test(evidence.text);
}

function applyObservedActorUpdates(
    transaction,
    observation,
    state,
    narrativeText,
) {
    const actors =
        new Map(
            (
                state.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const roomContext =
        buildLocalSemanticRoomContext(
            state,
        );
    const roomIds =
        new Set(
            roomContext.rooms
                .map(room =>
                    room.id),
        );
    const presentIds =
        new Set(
            Array.isArray(
                transaction
                    ?.actorPresence
                    ?.presentActorIdsAfterTurn,
            )
                ? transaction
                    .actorPresence
                    .presentActorIdsAfterTurn
                : (
                    state.actors ||
                    []
                )
                    .filter(actor =>
                        actor.present !==
                            false)
                    .map(actor =>
                        actor.id),
        );
    const updates =
        new Map(
            (
                transaction
                    .actorUpdates ||
                []
            ).map(update => [
                update.id,
                update,
            ]),
        );
    const localOccupantIds =
        new Set(
            state.localPresence
                ?.occupantActorIds ||
            [],
        );
    for (
        const observed
        of (
            observation?.result
                ?.actorUpdates ||
            []
        )
    ) {
        const actor =
            actors.get(
                observed.actorId,
            );
        if (
            !actor ||
            (
                actor.present ===
                    false &&
                !localOccupantIds
                    .has(actor.id)
            ) ||
            Number(
                observed.confidence ||
                0,
            ) < 0.65 ||
            !findActorObservationEvidence(
                narrativeText,
                observed,
                actor,
                roomContext,
            )
        ) {
            continue;
        }
        const targetRoomId =
            roomIds.has(
                observed.roomId,
            )
                ? observed.roomId
                : actor.roomId ||
                    roomContext
                        .currentRoomId;
        const fromRoomId =
            actor.roomId ||
            roomContext
                .currentRoomId;
        if (
            targetRoomId !==
                fromRoomId &&
            !findLocalRoomPath(
                actor.mapId ||
                    roomContext.mapId,
                fromRoomId,
                targetRoomId,
                state.map,
            )
        ) {
            continue;
        }
        const nextUpdate = {
            ...(
                updates.get(
                    actor.id,
                ) ||
                {
                    id:
                        actor.id,
                }
            ),
            currentActivityEn:
                observed
                    .currentActivityEn,
            mapId:
                actor.mapId ||
                roomContext.mapId,
            roomId:
                targetRoomId,
        };
        const boundary =
            observation?.result
                ?.eventBoundary;
        const boundaryEnded =
            Boolean(
                boundary?.ended &&
                Number(
                    boundary
                        .confidence ||
                    0,
                ) >= 0.55 &&
                findObservationEvidence(
                    narrativeText,
                    boundary
                        .evidenceText,
                ),
            );
        const leftInteraction =
            boundaryEnded &&
            targetRoomId !==
                roomContext
                    .currentRoomId;
        if (
            observed.presence ===
                'absent' ||
            leftInteraction
        ) {
            nextUpdate.present =
                false;
            presentIds.delete(
                actor.id,
            );
        } else if (
            observed.presence ===
                'present'
        ) {
            nextUpdate.present =
                true;
            presentIds.add(
                actor.id,
            );
        }
        updates.set(
            actor.id,
            nextUpdate,
        );
    }
    transaction.actorUpdates =
        [...updates.values()];
    transaction.actorPresence = {
        presentActorIdsAfterTurn:
            [...presentIds],
    };
}

async function requestLocalTurnObservation(
    state,
    playerAction,
    transaction,
    {
        addressing = {},
    } = {},
) {
    const narrativeText = (
        transaction.segments || []
    )
        .map(segment =>
            segment.textEn ||
            '')
        .filter(Boolean)
        .join('\n');
    const narrativeSegments =
        (
            transaction.segments ||
            []
        ).map(segment => ({
            type:
                segment.type,
            actorId:
                segment.actorId ||
                '',
            textEn:
                segment.textEn ||
                '',
        }));
    const actors =
        buildLocalSemanticActorContext(
            state,
        ).map(actor => ({
            id:
                actor.id,
            nameEn:
                actor.nameEn,
            roleEn:
                actor.roleEn,
            mapId:
                actor.mapId,
            roomId:
                actor.roomId,
        }));
    const playerTurnSequence =
        buildStructuredPlayerTurnSequence(
            playerAction,
            addressing,
        );
    const targetActorIds = [
        ...(
            addressing.actorIds ||
            []
        ),
        transaction
            .checkResolution
            ?.target
            ?.actorId,
    ].filter(Boolean);
    const createFallbackPerception =
        () =>
            createDeterministicPerceptionFallback({
                playerAction,
                narrativeText,
                narrativeSegments,
                playerTurnSequence,
                spellCasts:
                    transaction
                        .spellCasts ||
                    [],
                checkResolution:
                    transaction
                        .checkResolution,
                targetActorIds,
                actors:
                    state.actors ||
                    [],
                knownActorIds: (
                    state.actorLibrary ||
                    []
                ).map(actor =>
                    actor.id),
            });
    try {
        const response =
            await fetch(
                '/api/hogwarts-mud/local/observe',
                {
                    method: 'POST',
                    headers:
                        getRequestHeaders(),
                    body:
                        JSON.stringify({
                            input: {
                                clock:
                                    state.clock,
                                playerAction:
                                    String(
                                        playerAction ||
                                        '',
                                    ),
                                playerTurnSequence,
                                targetActorIds,
                                narrativeSegments,
                                narrativeText,
                                room:
                                    buildLocalSemanticRoomContext(
                                        state,
                                    ),
                                actors,
                                localPresence:
                                    state
                                        .localPresence ||
                                    null,
                                inventory:
                                    (
                                        state.items ||
                                        []
                                    ).map(
                                        item => ({
                                            id:
                                                item.id,
                                            labelEn:
                                                item
                                                    .labelEn ||
                                                '',
                                            detailEn:
                                                item
                                                    .detailEn ||
                                                '',
                                            importance:
                                                item
                                                    .importance ||
                                                'ordinary',
                                            custody:
                                                item
                                                    .custody ||
                                                'stored',
                                            ownerId:
                                                item
                                                    .ownerId ||
                                                'player',
                                        }),
                                    ),
                                existingActorPresence:
                                    transaction
                                        .actorPresence ||
                                    null,
                            },
                        }),
                },
            );
        if (!response.ok) {
            throw new Error(
                (
                    await response.text()
                ).slice(0, 1_000) ||
                `HTTP ${response.status}`,
            );
        }
        const observation =
            await response.json();
        const perceptionValidation =
            validatePerceptionContract(
                observation
                    ?.result
                    ?.perception,
                {
                    actors:
                        state.actors ||
                        [],
                    knownActorIds: (
                        state
                            .actorLibrary ||
                        []
                    ).map(actor =>
                        actor.id),
                    sourceTexts: [
                        playerAction,
                        ...narrativeSegments
                            .map(segment =>
                                segment
                                    .textEn),
                    ],
                },
            );
        const rejectedFailedConcealment =
            [
                'failure',
                'critical_failure',
            ].includes(
                transaction
                    .checkResolution
                    ?.outcome,
            ) &&
            observation
                ?.result
                ?.perception
                ?.concealment ===
                    'successful' &&
            /(?:\b(?:secretly|stealth|sneak|hide|conceal)\w*\b|偷偷|悄悄|隐蔽|隐藏)/iu
                .test(playerAction);
        const perception =
            perceptionValidation.valid &&
            !rejectedFailedConcealment
                ? perceptionValidation
                    .value
                : createFallbackPerception();
        observation.result ??= {};
        observation.result
            .perception =
            perception;
        if (
            perception?.source ===
                'deterministic_fallback'
        ) {
            observation
                .diagnostics ??= {};
            observation
                .diagnostics
                .perceptionFallback =
                true;
        }
        recoverObservedActorMovements(
            observation,
            state,
            narrativeText,
        );
        return {
            observation,
            narrativeText,
            materialEvents:
                projectObservedMaterialEvents(
                    observation,
                    state,
                    playerAction,
                    narrativeText,
                ),
            itemUpdates:
                projectObservedInventoryUpdates(
                    observation
                        ?.result
                        ?.inventoryUpdates,
                    state,
                    playerAction,
                    narrativeText,
                ),
            perception,
            targetActorIds,
        };
    } catch (error) {
        console.warn(
            '[Hogwarts MUD] Local semantic observation failed; committing narrative without optional observations',
            error,
        );
        return {
            observation: {
                result: {
                    schemaVersion: 1,
                    materialEvents:
                        [],
                    inventoryUpdates:
                        [],
                    eventBoundary: {
                        ended: false,
                        reasonEn:
                            'Narrative-first fallback omits uncertain event boundaries.',
                        evidenceText:
                            '',
                        confidence: 0,
                    },
                    actorUpdates:
                        [],
                    perception:
                        createFallbackPerception(),
                },
                diagnostics: {
                    fallback: true,
                    error:
                        String(
                            error?.message ||
                            error,
                        ).slice(
                            0,
                            500,
                        ),
                },
            },
            narrativeText,
            materialEvents: [],
            itemUpdates: [],
            perception:
                createFallbackPerception(),
            targetActorIds,
        };
    }
}

function findPlayerActionForMessage(chat, messageId) {
    for (let index = messageId - 1; index >= 0; index--) {
        if (chat[index]?.is_user) {
            return chat[index].mes;
        }
        if (!chat[index]?.is_system) {
            break;
        }
    }
    return '';
}

async function repairLegacyGenericTurnSummaries() {
    const context = getContext();
    const state = getMudState();
    let chatChanged = false;
    let metadataChanged = false;
    const replacements = new Map();

    context.chat.forEach((message, messageId) => {
        const transactions = [
            message.extra?.hogwartsMud?.turnTransaction,
            ...(message.swipe_info || []).map(
                swipe => swipe.extra?.hogwartsMud?.turnTransaction,
            ),
        ].filter(transaction =>
            transaction &&
            /player completes|player acts|characters respond/i.test(
                String(transaction.publicEventEn || ''),
            ),
        );
        if (!transactions.length) return;

        const action = findPlayerActionForMessage(context.chat, messageId)
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 180);
        if (!action) return;
        transactions.forEach(transaction => {
            transaction.publicEventEn = `Legacy player action: ${action}`;
            transaction.publicEvent = action;
            if (transaction.committedClock) {
                replacements.set(transaction.committedClock, action);
            }
        });
        chatChanged = true;
    });

    if (replacements.size) {
        state.timeline = (state.timeline || []).map(entry =>
            replacements.has(entry.clock) &&
                /玩家完成规定的动作|player completes|characters respond/i.test(
                    String(entry.label || ''),
                )
                ? { ...entry, label: replacements.get(entry.clock) }
                : entry,
        );
        metadataChanged = true;
    }
    if (chatChanged) await context.saveChat();
    if (metadataChanged) await context.saveMetadata();
}

async function repairLegacySyntheticSceneOpeningSegments() {
    const context =
        getContext();
    const state =
        getMudState();
    let changed = false;
    for (
        const message
        of context.chat
    ) {
        const mud =
            message?.extra
                ?.hogwartsMud;
        if (
            mud?.role !==
                'scene_opening' ||
            !Array.isArray(
                mud.segments,
            )
        ) {
            continue;
        }
        const cleaned =
            stripSyntheticSceneOpeningActorSegments(
                mud.segments,
            );
        if (
            cleaned.length ===
                mud.segments.length ||
            !cleaned.length
        ) {
            continue;
        }
        const sourceEn =
            composeSceneSegments(
                cleaned,
                state
                    .actorLibrary ||
                    [],
                'en',
            );
        const translatedZh =
            composeSceneSegments(
                cleaned,
                state
                    .actorLibrary ||
                    [],
                'zh',
            );
        const hasTranslation =
            cleaned.some(segment =>
                String(
                    segment.textZh ||
                    '',
                ).trim()) &&
            translatedZh !==
                sourceEn;
        mud.segments =
            cleaned;
        mud.sourceEn =
            sourceEn;
        mud.translatedZh =
            hasTranslation
                ? translatedZh
                : undefined;
        message.mes =
            sourceEn;
        if (hasTranslation) {
            message.extra
                .display_text =
                translatedZh;
        } else {
            delete message.extra
                .display_text;
        }
        changed = true;
    }
    if (changed) {
        await context.saveChat();
    }
}

async function repairNarratedCurrentLocationResidents() {
    const context =
        getContext();
    const state =
        getMudState();
    const openingText =
        context.chat
            .filter(message =>
                message?.extra
                    ?.hogwartsMud
                    ?.role ===
                    'scene_opening' &&
                message.extra
                    .hogwartsMud
                    .sceneId ===
                    state.scene?.id)
            .map(message =>
                String(
                    message.extra
                        .hogwartsMud
                        .sourceEn ||
                    message.mes ||
                    '',
                ))
            .join('\n')
            .toLocaleLowerCase();
    if (!openingText) {
        return;
    }
    const admission =
        admitCurrentLocationResidents(
            state,
            {
                activate: false,
            },
        );
    if (
        !admission
            .admittedActorIds
            .length
    ) {
        return;
    }
    const next =
        admission.state;
    const profileById =
        new Map(
            (
                next.actorLibrary ||
                []
            ).map(profile => [
                profile.id,
                profile,
            ]),
        );
    const activatedIds =
        new Set(
            admission
                .admittedActorIds
                .filter(actorId => {
                    const profile =
                        profileById.get(
                            actorId,
                        );
                    return [
                        profile
                            ?.nameEn,
                        ...(
                            profile
                                ?.aliases ||
                            []
                        ),
                    ]
                        .filter(Boolean)
                        .some(name =>
                            openingText
                                .includes(
                                    String(name)
                                        .toLocaleLowerCase(),
                                ));
                }),
        );
    if (!activatedIds.size) {
        return;
    }
    next.actors = (
        next.actors ||
        []
    ).map(actor =>
        activatedIds.has(
            actor.id,
        )
            ? {
                ...actor,
                present: true,
            }
            : actor);
    context.chatMetadata
        .hogwartsMud =
        next;
    await context.saveMetadata();
}

function buildSceneMessage(transaction, state, existingMessage = null) {
    const renderableActors = [
        ...(state.actorLibrary || []),
        ...(state.actors || []),
    ];
    const sourceEn = composeSceneSegments(transaction.segments, renderableActors, 'en');
    const translatedZh = composeSceneSegments(transaction.segments, renderableActors, 'zh');
    const hasTranslation = getSettings().translationEnabled &&
        transaction.segments.some(segment =>
            String(segment.textZh || '').trim()) &&
        translatedZh !== sourceEn;
    const message = existingMessage || {
        name: 'Scene',
        is_user: false,
        is_system: false,
        send_date: new Date().toISOString(),
        mes: sourceEn,
        extra: {},
    };
    message.name = 'Scene';
    message.mes = sourceEn;
    message.extra = message.extra && typeof message.extra === 'object' ? message.extra : {};
    message.extra.hogwartsMud = {
        ...message.extra.hogwartsMud,
        sourceEn,
        translatedZh: hasTranslation ? translatedZh : undefined,
        provider: hasTranslation
            ? getSettings()
                .translationProvider
            : undefined,
        translatedAt: hasTranslation ? Date.now() : undefined,
        translationVersion: hasTranslation
            ? TRANSLATION_FORMAT_VERSION
            : undefined,
        role: 'scene_turn',
        sceneId: state.scene?.id,
        segments: transaction.segments,
        turnTransaction: transaction,
    };
    if (hasTranslation) {
        message.extra.display_text = translatedZh;
    } else {
        delete message.extra.display_text;
    }
    return message;
}

async function runStructuredTurn(
    playerAction,
    assistantMessageId = null,
    forceCheck = false,
) {
    const jobKey = assistantMessageId ?? 'new-turn';
    const existingJob = turnSettlementJobs.get(jobKey);
    if (existingJob) {
        return existingJob;
    }
    const context = getContext();
    if (!playerAction ||
        getMudState()?.phase !== 'playing' ||
        sceneTransitionActive ||
        getMudState()?.sceneTransition?.status === 'resolving') {
        return;
    }

    const job = (async () => {
        turnSettlementActive = true;
        let state = getMudState();
        let spellCasts =
            parseSpellCastDirectives(
                playerAction,
            );
        let addressing =
            resolvePlayerAddressing(
                getActiveAddressingState(
                    state,
                ),
                playerAction,
            );
        if (!addressing.valid) {
            throw new Error(
                addressing.error,
            );
        }
        const narrativePlayerAction =
            removeSpellCastDirectives(
                removeExplicitAddressDirective(
                    playerAction,
                ),
            );
        state.turn ??= {};
        state.turn.status = 'resolving';
        state.turn.error = '';
        await context.saveMetadata();
        renderAll();
        try {
            const playerMessage = assistantMessageId === null
                ? [...context.chat].reverse().find(message =>
                    message.is_user &&
                    message.mes === playerAction)
                : context.chat
                    .slice(0, assistantMessageId)
                    .reverse()
                    .find(message => message.is_user);
            const storedAddressing =
                playerMessage?.extra
                    ?.hogwartsMud
                    ?.addressing;
            if (
                storedAddressing
                    ?.valid === true &&
                storedAddressing
                    ?.attempted === true
            ) {
                addressing =
                    structuredClone(
                        storedAddressing,
                    );
            }
            if (
                playerMessage?.extra
                    ?.hogwartsMud
            ) {
                playerMessage.extra
                    .hogwartsMud
                    .addressing =
                    structuredClone(
                        addressing,
                    );
                await context.saveChat();
            }
            const storedSpellCasts =
                playerMessage?.extra
                    ?.hogwartsMud
                    ?.spellCasts;
            if (
                Array.isArray(
                    storedSpellCasts,
                ) &&
                storedSpellCasts.length
            ) {
                spellCasts =
                    structuredClone(
                        storedSpellCasts,
                    );
            } else if (
                spellCasts.length &&
                playerMessage?.extra
                    ?.hogwartsMud
            ) {
                playerMessage.extra
                    .hogwartsMud
                    .spellCasts =
                    structuredClone(
                        spellCasts,
                    );
                await context.saveChat();
            }
            await ensureDirectorFoundation();
            await ensureDailyDirectorPlan();
            state = getMudState();
            const playerMessageId =
                context.chat.indexOf(
                    playerMessage,
                );
            const rollbackCheckpoint =
                playerMessageId >= 0
                    ? createTurnRetryCheckpoint(
                        state,
                        {
                            playerMessageId,
                            assistantMessageId:
                                assistantMessageId ??
                                context.chat
                                    .length,
                            playerAction,
                            forceCheck,
                        },
                    )
                    : null;
            const movementResult = applyPlayerMovement(
                state,
                narrativePlayerAction,
            );
            const movementResolution = movementResult.movement;
            if (movementResolution) {
                if (playerMessage?.extra?.hogwartsMud) {
                    playerMessage.extra.hogwartsMud.movement =
                        movementResolution;
                    await context.saveChat();
                }
            }
            if (movementResolution?.moved) {
                const presenceReconciliation =
                    reconcileVisibleActorPresenceState(
                        movementResult.state,
                    );
                context.chatMetadata.hogwartsMud =
                    presenceReconciliation
                        .state;
                state = getMudState();
                await context.saveMetadata();
                applySystemPrompt();
                renderAll();
            }
            const storedMentionedActors =
                playerMessage?.extra
                    ?.hogwartsMud
                    ?.mentionedKnownActors;
            const mentionedAdmission =
                admitMentionedKnownActors(
                    state,
                    narrativePlayerAction,
                );
            const mentionedKnownActors =
                mentionedAdmission
                    .admittedActors.length
                    ? mentionedAdmission
                        .admittedActors
                    : Array.isArray(
                        storedMentionedActors,
                    )
                        ? structuredClone(
                            storedMentionedActors,
                        )
                        : [];
            if (
                mentionedAdmission
                    .admittedActors.length
            ) {
                context.chatMetadata
                    .hogwartsMud =
                    mentionedAdmission.state;
                state = getMudState();
                if (
                    playerMessage?.extra
                        ?.hogwartsMud
                ) {
                    playerMessage.extra
                        .hogwartsMud
                        .mentionedKnownActors =
                        structuredClone(
                            mentionedKnownActors,
                        );
                    await context.saveChat();
                }
                await context.saveMetadata();
                applySystemPrompt();
                renderAll();
            }
            await ensurePacingDirectorAssessment(
                narrativePlayerAction,
                addressing,
                playerAction,
            );
            state = getMudState();
            const forceCheckRequested =
                forceCheck ||
                spellCasts.length >
                    0 ||
                Boolean(
                    playerMessage?.extra
                        ?.hogwartsMud
                        ?.requiresCheck,
                );
            const existingAdjudication =
                playerMessage?.extra
                    ?.hogwartsMud
                    ?.localAdjudication;
            const localAdjudication =
                existingAdjudication ||
                await requestLocalTurnAdjudication(
                    state,
                    playerAction,
                    addressing,
                    movementResolution,
                    forceCheckRequested,
                );
            if (
                !existingAdjudication &&
                playerMessage?.extra
                    ?.hogwartsMud
            ) {
                playerMessage.extra
                    .hogwartsMud
                    .localAdjudication =
                    structuredClone(
                        localAdjudication,
                    );
                await context.saveChat();
            }
            const existingCheck =
                playerMessage?.extra?.hogwartsMud
                    ?.checkResolution;
            const checkResolution = existingCheck ||
                resolveActionCheck(
                    state,
                    narrativePlayerAction,
                    {
                        forced:
                            forceCheckRequested,
                        semanticCheck:
                            localAdjudication
                                .result
                                .check,
                        spellCast:
                            spellCasts[0] ||
                            null,
                    },
                );
            if (checkResolution &&
                !existingCheck &&
                playerMessage?.extra?.hogwartsMud) {
                playerMessage.extra.hogwartsMud
                    .checkResolution =
                    structuredClone(checkResolution);
                await context.saveChat();
            }
            const slots = resolveRoleSlots(state.modelSlots);
            const contextPlan =
                createContextBudgetPlan(
                    slots.low.contextSize,
                    slots.low.maxResponseLength,
                );
            const knowledgeAudienceActorIds =
                (state.actors || [])
                    .filter(actor =>
                        actor.present !==
                            false)
                    .map(actor =>
                        actor.id);
            const entityIds = [
                state.scene?.id,
                state.map?.currentLocalNodeId,
            ].filter(Boolean);
            let retrievedKnowledge = await retrieveLocalKnowledge(
                narrativePlayerAction,
                entityIds,
                {
                    limit:
                        contextPlan
                            .ragLimit *
                        3,
                },
            );
            retrievedKnowledge =
                filterKnowledgeForAudience(
                    retrievedKnowledge,
                    {
                        actorIds:
                            knowledgeAudienceActorIds,
                    },
                ).slice(
                    0,
                    contextPlan.ragLimit,
                );
            const budget = createTurnPerformanceBudget(
                narrativePlayerAction,
                state.dailyDirector?.plan?.timePolicy,
                {
                    activeNamedActorCount:
                        knowledgeAudienceActorIds
                            .length,
                    adjudicatedMinutes:
                        localAdjudication
                            .result
                            .temporal
                            .elapsedMinutes,
                },
            );
            const momentumDirective =
                createSceneMomentumDirective(
                    state,
                    narrativePlayerAction,
                    budget,
                );
            const performance = await generateScenePerformance(
                slots.low,
                state,
                narrativePlayerAction,
                budget,
                retrievedKnowledge,
                movementResolution,
                momentumDirective,
                checkResolution,
                addressing,
                mentionedKnownActors,
                contextPlan,
            );
            setLiveSceneStreamPhase(
                'translating',
                performance.segments,
            );
            let transaction = buildSceneTransaction(
                performance,
                budget,
                state.pacingDirector?.pendingBeat?.status === 'pending'
                    ? state.pacingDirector.pendingBeat
                    : null,
                checkResolution,
            );
            transaction.spellCasts =
                structuredClone(
                    spellCasts,
                );
            const validation = validateTurnTransaction(transaction, state);
            if (!validation.valid) {
                throw new Error(`合并后的回合事务无效：${validation.errors.join('；')}`);
            }
            try {
                transaction = await localizeTurnTransaction(transaction);
            } catch (translationError) {
                console.warn('[Hogwarts MUD] Turn transaction translation failed; using English labels', translationError);
            }
            const localObservation =
                await requestLocalTurnObservation(
                    state,
                    narrativePlayerAction,
                    transaction,
                    {
                        addressing,
                    },
                );
            transaction.materialEvents =
                localObservation
                    .materialEvents;
            transaction.itemUpdates = [
                ...new Map(
                    [
                        ...(
                            transaction
                                .itemUpdates ||
                            []
                        ),
                        ...(
                            localObservation
                                .itemUpdates ||
                            []
                        ),
                    ].map(update => [
                        update.id,
                        update,
                    ]),
                ).values(),
            ];
            transaction.materialExtraction = {
                schemaVersion: 1,
                source:
                    'ollama_structured_observer',
                ...(
                    localObservation
                        .observation
                        .diagnostics ||
                    {}
                ),
            };
            transaction.eventEnded =
                isObservedEventBoundary(
                    localObservation
                        .observation,
                    localObservation
                        .narrativeText,
                );
            applyObservedActorUpdates(
                transaction,
                localObservation
                    .observation,
                state,
                localObservation
                    .narrativeText,
            );
            transaction =
                reconcileTurnActorPresenceWithSpatialState(
                    transaction,
                    state,
                );
            transaction.localPresence =
                reduceLocalPresence(
                    state,
                    {
                        actorUpdates:
                            transaction
                                .actorUpdates,
                    },
                );
            transaction.perception =
                localObservation
                    .perception;
            const witnessResolution =
                resolveEventWitnesses({
                    perception:
                        transaction
                            .perception,
                    localPresence:
                        transaction
                            .localPresence,
                    activeInteractionActorIds:
                        transaction
                            .actorPresence
                            ?.presentActorIdsAfterTurn ||
                        [],
                    targetActorIds:
                        localObservation
                            .targetActorIds,
                    actors:
                        state.actors ||
                        [],
                    knownActorIds: (
                        state
                            .actorLibrary ||
                        []
                    ).map(actor =>
                        actor.id),
                    spatialGraph:
                        buildLocalSemanticRoomContext(
                            state,
                        ),
                });
            if (witnessResolution) {
                transaction
                    .participantActorIds =
                    witnessResolution
                        .participantActorIds;
                transaction
                    .witnessActorIds =
                    witnessResolution
                        .witnessActorIds;
                transaction
                    .witnessCohortIds =
                    witnessResolution
                        .witnessCohortIds;
                transaction
                    .witnessBasis =
                    witnessResolution
                        .witnessBasis;
                const rawSceneId =
                    String(
                        state.scene?.id ||
                        '',
                    );
                const sceneId =
                    /^[a-z][a-z0-9_]{0,79}$/u
                        .test(rawSceneId)
                        ? rawSceneId
                        : 'scene_current';
                transaction
                    .eventKnowledge =
                    normalizeEventKnowledge({
                        sceneId,
                        sourceMessageIds: [
                            ...(
                                playerMessageId >=
                                    0
                                    ? [
                                        playerMessageId,
                                    ]
                                    : []
                            ),
                            assistantMessageId ??
                            context.chat
                                .length,
                        ],
                        summaryEn:
                            transaction
                                .publicEventEn,
                        ...witnessResolution,
                        perception:
                            transaction
                                .perception,
                        source:
                            transaction
                                .perception
                                .source,
                    }, {
                        actors:
                            state.actors ||
                            [],
                        knownActorIds: (
                            state
                                .actorLibrary ||
                            []
                        ).map(actor =>
                            actor.id),
                        cohortIds:
                            transaction
                                .localPresence
                                .cohortIds,
                        sourceTexts: [
                            narrativePlayerAction,
                            localObservation
                                .narrativeText,
                        ],
                    });
            }
            if (
                localAdjudication
                    .diagnostics
                    ?.fallback ||
                localObservation
                    .observation
                    .diagnostics
                    ?.fallback ||
                localObservation
                    .observation
                    .diagnostics
                    ?.perceptionFallback
            ) {
                transaction.settlementWarnings = [
                    ...(
                        transaction
                            .settlementWarnings ||
                        []
                    ),
                    {
                        code:
                            'local_semantic_fallback',
                        detail:
                            'Narrative committed with conservative local semantic defaults.',
                    },
                ].slice(-24);
            }
            setLiveSceneStreamPhase(
                'committing',
                [],
            );
            let nextState = applyTurnTransaction(
                state,
                transaction,
                narrativePlayerAction,
            );
            nextState =
                applyPresenceWitnessTransaction(
                    nextState,
                    transaction,
                );
            nextState = consumePacingBeat(nextState);
            if (rollbackCheckpoint) {
                nextState.turnRetry =
                    rollbackCheckpoint;
            }
            context.chatMetadata.hogwartsMud = nextState;
            state = getMudState();
            transaction.committedClock = state.clock;
            const existingMessage = assistantMessageId === null
                ? null
                : context.chat[assistantMessageId];
            const message = buildSceneMessage(transaction, state, existingMessage);
            let messageId = assistantMessageId;
            if (messageId === null) {
                context.chat.push(message);
                messageId = context.chat.length - 1;
            }
            await context.saveMetadata();
            await context.saveChat();
            await syncLocalKnowledge();
            applySystemPrompt();
            updateNativeMessageBlock(messageId, message);
            renderAll();
            await ensureSocialDirectorCatchup();
            await ensureMemoryConsolidation();
            state = getMudState();
            if (state.dailyDirector?.date !== getWorldDate(state.clock)) {
                await ensureDailyDirectorPlan();
            }
        } catch (error) {
            state = getMudState();
            state.turn ??= {};
            state.turn.status = 'failed';
            state.turn.error = String(error?.cause?.message || error?.message || error);
            await context.saveMetadata();
            renderAll();
            throw error;
        } finally {
            turnSettlementActive = false;
            liveSceneStream = null;
            turnSettlementJobs.delete(jobKey);
            renderAll();
        }
    })();
    turnSettlementJobs.set(jobKey, job);
    return job;
}

async function rollbackLastTurn() {
    const context = getContext();
    const checkpoint =
        getAvailableTurnRollbackCheckpoint(
            getMudState(),
            context.chat,
        ) ||
        createLegacyTurnRollbackCheckpoint(
            getMudState(),
            context.chat,
        );
    if (!checkpoint) {
        toastr.info(
            '当前没有可回滚的已完成回合。',
        );
        renderAll();
        return;
    }
    if (
        turnSettlementActive ||
        sceneTransitionActive
    ) {
        toastr.warning(
            '世界状态仍在结算，请稍候。',
        );
        return;
    }
    if (
        !window.confirm(
            '回滚上一轮会删除对应的玩家消息与场景回复，并恢复提交前的世界状态。继续吗？',
        )
    ) {
        return;
    }
    turnSettlementActive = true;
    renderAll();
    try {
        const restored =
            restoreTurnRetryCheckpoint(
                checkpoint,
            );
        context.chat.splice(
            checkpoint
                .playerMessageId,
        );
        context.chatMetadata
            .hogwartsMud =
            restored;
        await context.saveMetadata();
        await context.saveChat();
        await context.printMessages();
        await syncLocalKnowledge();
        applySystemPrompt();
        composerInput.value =
            checkpoint.playerAction;
        composerInput.dispatchEvent(
            new Event('input'),
        );
        toastr.success(
            '已回滚上一轮；原输入已放回编辑框。',
        );
    } catch (error) {
        toastr.error(
            String(
                error?.cause?.message ||
                error?.message ||
                error,
            ),
        );
    } finally {
        turnSettlementActive = false;
        renderAll();
    }
}

async function retryFailedPlayerTurn() {
    const context = getContext();
    const failedTurn =
        getFailedPlayerTurn(
            context.chat,
            getMudState()?.turn,
        );
    if (!failedTurn) {
        toastr.info(
            '当前没有待重试的玩家回合。',
        );
        renderAll();
        return;
    }
    if (
        turnSettlementActive ||
        sceneTransitionActive
    ) {
        toastr.warning(
            '世界状态仍在结算，请稍候。',
        );
        return;
    }
    try {
        await runStructuredTurn(
            failedTurn.playerAction,
            null,
            failedTurn.forceCheck,
        );
    } catch (error) {
        toastr.error(
            String(
                error?.cause?.message ||
                error?.message ||
                error,
            ),
        );
    }
}

async function processUnsettledTurn() {
    const context = getContext();
    const unsettled =
        findUnsettledTurn(
            context.chat,
            getMudState()?.turn,
        );
    if (!unsettled) {
        if (
            getFailedPlayerTurn(
                context.chat,
                getMudState()?.turn,
            )
        ) {
            renderAll();
        }
        return;
    }
    await runStructuredTurn(
        unsettled.playerAction,
        unsettled
            .assistantMessageId,
        unsettled.forceCheck,
    );
}

async function preparePlayableState() {
    try {
        const context = getContext();
        let state = getMudState();
        const lifecycleChanged = ensureSceneLifecycleState(state);
        const recentPlayerAction = [...context.chat]
            .reverse()
            .find(message => message.is_user)?.mes || '';
        const spatial = reconcileSpatialState(
            state,
            recentPlayerAction,
        );
        const presence =
            reconcileVisibleActorPresenceState(
                spatial.state,
            );
        if (spatial.changed) {
            context.chatMetadata.hogwartsMud =
                presence.state;
            state = getMudState();
        } else if (
            presence.changed
        ) {
            context.chatMetadata.hogwartsMud =
                presence.state;
            state = getMudState();
        }
        if (
            lifecycleChanged ||
            spatial.changed ||
            presence.changed
        ) {
            await context.saveMetadata();
            applySystemPrompt();
            renderAll();
        }
        await ensureCurrentInteriorMap();
        state = getMudState();
        const activeMap =
            getLocalMapDefinition(
                state.map
                    ?.activeMapId,
                state.map,
            );
        if (
            activeMap
                ?.sourceContainerKey &&
            inspectorMapScope !==
                'auto'
        ) {
            inspectorMapScope =
                'auto';
            inspectorMapLevel = '';
            renderAll();
        }
        await ensureDirectorFoundation();
        await repairLegacyGenericTurnSummaries();
        await repairLegacySyntheticSceneOpeningSegments();
        await repairNarratedCurrentLocationResidents();
        await syncLocalKnowledge();
        await ensureDailyDirectorPlan();
        await processUnsettledTurn();
        await ensureSocialDirectorCatchup();
    } catch (error) {
        console.error('[Hogwarts MUD] Playable-state preparation failed', error);
        toastr.error(String(error?.cause?.message || error?.message || error));
    }
}

async function submitTurn(requireCheck = false) {
    if (getMudState()?.phase !== 'playing') {
        toastr.warning('首幕尚未完成，当前不能提交行动。');
        return;
    }
    if (
        getFailedPlayerTurn(
            getContext().chat,
            getMudState()?.turn,
        )
    ) {
        toastr.warning(
            '上一条玩家消息已经保存但尚未生成回复，请先重试本回合。',
        );
        return;
    }
    const text = composerInput.value.trim();
    if (!text) {
        composerInput.focus();
        return;
    }
    const addressing =
        resolvePlayerAddressing(
            getActiveAddressingState(
                getMudState(),
            ),
            text,
        );
    const spellCasts =
        parseSpellCastDirectives(
            text,
        );
    if (!addressing.valid) {
        toastr.warning(
            addressing.error,
        );
        composerInput.focus();
        return;
    }
    if (turnSettlementActive ||
        sceneTransitionActive ||
        interiorMapPromise ||
        getMudState()?.map
            ?.interiorMapGeneration
            ?.status ===
            'generating' ||
        getMudState()?.sceneTransition?.status === 'resolving' ||
        getMudState()?.directorFoundation?.status === 'building') {
        toastr.warning('世界状态仍在结算，请稍候。');
        return;
    }
    composerInput.value = '';
    composerInput.style.height = '';
    renderComposerAddressing();
    const context = getContext();
    context.chat.push({
        name: context.name1 || 'User',
        is_user: true,
        is_system: false,
        send_date: new Date().toISOString(),
        mes: text,
        extra: {
            hogwartsMud: {
                role: 'player_turn',
                requiresCheck:
                    requireCheck ||
                    spellCasts.length >
                        0,
                sceneId: getMudState()?.scene?.id,
                spellCasts:
                    structuredClone(
                        spellCasts,
                    ),
                addressing:
                    structuredClone(
                        addressing,
                    ),
            },
        },
    });
    await context.saveChat();
    renderAll();
    try {
        await runStructuredTurn(
            text,
            null,
            requireCheck,
        );
    } catch (error) {
        console.error('[Hogwarts MUD] Structured turn failed', error);
        toastr.error(String(error?.cause?.message || error?.message || error));
    }
}

async function importPreset(file) {
    assertImportSize(file.size);
    const raw = JSON.parse(await file.text());
    const { clean, removed } = sanitizePresetData(raw);
    const selected = root.querySelector('#hpmud_preset_target').value;
    const fallback = getContext().mainApi || 'openai';
    const apiId = selected === 'auto' ? detectPresetApi(clean, fallback) : selected;
    const manager = getPresetManager(apiId);
    if (!manager) {
        throw new Error(`当前酒馆没有可用的 ${apiId} Preset Manager。`);
    }

    const fileName = file.name.replace(/\.(json|settings)$/i, '');
    const name = String(clean.name || fileName || 'Imported Preset');
    clean.name = name;
    await manager.savePreset(name, clean);
    const option = manager.findPreset(name);
    if (option) {
        manager.selectPreset(option);
    }
    return { name, apiId, removed };
}

function persistModelSlots(slots) {
    const normalized = normalizeModelSlots(slots);
    getSettings().modelSlots = structuredClone(normalized);
    const state = getMudState();
    if (isGameStarted() && state) {
        state.modelSlots = structuredClone(normalized);
        saveMetadataDebounced();
    }
    saveSettingsDebounced();
    return normalized;
}

async function importRoleChatPreset(file, role) {
    assertImportSize(file.size);
    const raw = JSON.parse(await file.text());
    const { clean } = sanitizePresetData(raw);
    const manager = getPresetManager('openai');
    if (!manager) {
        throw new Error('当前酒馆没有可用的 Chat Completion Preset Manager。');
    }
    const fileName = file.name.replace(/\.(json|settings)$/i, '');
    const name = String(clean.name || fileName || `Imported ${role} Preset`);
    clean.name = name;
    await manager.savePreset(name, clean);
    const slots = collectModelSlots();
    slots[role].presetName = name;
    if (clean.openai_max_context !== undefined) {
        slots[role].contextSize = Number(clean.openai_max_context);
    }
    if (clean.openai_max_tokens !== undefined) {
        slots[role].maxResponseLength = Number(clean.openai_max_tokens);
    }
    persistModelSlots(slots);
    syncModelSlotControls();
    setControlValue(`preset_${role}`, name);
    return name;
}

function normalizeRegexPresetItems(value) {
    return Array.isArray(value)
        ? value.map(item => typeof item === 'string' ? { id: item } : { id: item.id }).filter(item => item.id)
        : [];
}

async function importRoleRegexPreset(file, role) {
    assertImportSize(file.size);
    const raw = JSON.parse(await file.text());
    extension_settings.regex_presets ??= [];
    let preset;
    if (
        raw &&
        typeof raw === 'object' &&
        !Array.isArray(raw) &&
        (Array.isArray(raw.global) || Array.isArray(raw.scoped) || Array.isArray(raw.preset))
    ) {
        preset = {
            id: uuidv4(),
            name: String(raw.name || file.name.replace(/\.json$/i, '') || 'Imported Regex Preset'),
            isSelected: false,
            global: normalizeRegexPresetItems(raw.global),
            scoped: normalizeRegexPresetItems(raw.scoped),
            preset: normalizeRegexPresetItems(raw.preset),
        };
    } else {
        const scripts = normalizeRegexScripts(raw, uuidv4);
        const current = getScriptsByType(SCRIPT_TYPES.GLOBAL);
        await saveScriptsByType([...current, ...scripts], SCRIPT_TYPES.GLOBAL);
        preset = {
            id: uuidv4(),
            name: file.name.replace(/\.json$/i, '') || `Imported ${role} Regex`,
            isSelected: false,
            global: scripts.map(script => ({ id: script.id })),
            scoped: [],
            preset: [],
        };
    }
    extension_settings.regex_presets.push(preset);
    const slots = collectModelSlots();
    slots[role].regexPresetId = preset.id;
    persistModelSlots(slots);
    RegexProvider.instance.clear();
    syncModelSlotControls();
    setControlValue(`regex_${role}`, preset.id);
    return preset;
}

async function importRegexFiles(files) {
    const targetValue = root.querySelector('#hpmud_regex_target').value;
    const target = targetValue === 'preset' ? SCRIPT_TYPES.PRESET : SCRIPT_TYPES.GLOBAL;
    const imported = [];

    for (const file of files) {
        assertImportSize(file.size);
        const raw = JSON.parse(await file.text());
        imported.push(...normalizeRegexScripts(raw, uuidv4));
    }

    const current = getScriptsByType(target);
    await saveScriptsByType([...current, ...imported], target);
    RegexProvider.instance.clear();

    if (target === SCRIPT_TYPES.PRESET) {
        allowPresetScripts(getCurrentPresetAPI(), getCurrentPresetName());
    }
    const context = getContext();
    if (context.getCurrentChatId()) {
        await context.reloadCurrentChat();
    }
    return imported;
}

function syncSettingsUi() {
    const settings = getSettings();
    root.querySelector('#hpmud_prompt_enabled').checked = settings.enabled;
    root.querySelector(
        '#hpmud_translation_provider',
    ).value =
        settings.translationProvider;
    root.querySelector('#hpmud_world_prompt').value = settings.worldPrompt;
    const labels = {
        local: '本地 4B',
        google: 'Google',
        bing: 'Bing',
        off: '不开',
    };
    root.querySelector(
        '#hpmud_translation_provider_status',
    ).textContent =
        labels[settings.translationProvider];
    root.querySelectorAll(
        '[data-hpmud-translation-provider]',
    ).forEach(button => {
        const selected =
            button.dataset
                .hpmudTranslationProvider ===
            settings.translationProvider;
        button.classList.toggle(
            'active',
            selected,
        );
        button.setAttribute(
            'aria-checked',
            String(selected),
        );
    });
}

function setTranslationProvider(provider) {
    const settings = getSettings();
    settings.translationProvider =
        normalizeTranslationProvider(provider);
    settings.translationEnabled =
        settings.translationProvider !== 'off';
    saveSettingsDebounced();
    syncSettingsUi();
    if (settings.translationEnabled) {
        void refreshTranslationsForProvider();
    } else {
        void clearDisplayTranslations();
    }
}

function bindUi() {
    root.querySelector('#hpmud_open_home').addEventListener('click', () => setAppScreen('home'));
    root.querySelector('#hpmud_new_game').addEventListener('click', () => void beginNewGame());
    root.querySelector('#hpmud_refresh_saves').addEventListener('click', () => void renderSaveLibrary());
    root.querySelectorAll('[data-campaign]').forEach(button => {
        button.addEventListener('click', () => selectCampaign(button.dataset.campaign));
    });
    root.querySelector('#hpmud_campaign_year').addEventListener('change', event => {
        updateCampaign({ startYear: Number(event.target.value) });
    });
    root.querySelector('#hpmud_campaign_grade').addEventListener('change', event => {
        updateCampaign({ grade: Number(event.target.value) });
    });
    root.querySelectorAll('[data-difficulty]').forEach(button => {
        button.addEventListener('click', () => {
            if (DIFFICULTY_PRESETS[button.dataset.difficulty]) {
                updateCampaign({ difficulty: button.dataset.difficulty });
            }
        });
    });
    root.querySelector('#hpmud_reopen_setup').addEventListener('click', () => {
        activeSetupStep = 'identity';
        setAppScreen('setup');
    });
    root.querySelector('#hpmud_reopen_models').addEventListener('click', () => {
        activeSetupStep = 'models';
        setAppScreen('setup');
    });
    root.querySelector('#hpmud_open_settings').addEventListener('click', () => {
        syncSettingsUi();
        settingsDialog.showModal();
    });
    root.querySelectorAll(
        '[data-hpmud-translation-provider]',
    ).forEach(button => {
        button.addEventListener(
            'click',
            () => setTranslationProvider(
                button.dataset
                    .hpmudTranslationProvider,
            ),
        );
    });
    root.querySelectorAll('[data-hpmud-step]').forEach(button => {
        button.addEventListener('click', () => {
            saveSetupDraft();
            showSetupStep(button.dataset.hpmudStep);
        });
    });
    root.querySelector('#hpmud_setup_previous').addEventListener('click', () => {
        const steps = ['identity', 'background', 'aptitudes', 'models', 'review'];
        saveSetupDraft();
        showSetupStep(steps[Math.max(0, steps.indexOf(activeSetupStep) - 1)]);
    });
    root.querySelector('#hpmud_setup_next').addEventListener('click', () => {
        const steps = ['identity', 'background', 'aptitudes', 'models', 'review'];
        saveSetupDraft();
        showSetupStep(steps[Math.min(steps.length - 1, steps.indexOf(activeSetupStep) + 1)]);
    });
    root.querySelector('#hpmud_setup_return_game').addEventListener('click', () => {
        void saveInGameModelConfigAndReturn().catch(error => {
            console.error(
                '[Hogwarts MUD] Failed to save in-game model config',
                error,
            );
            toastr.error(
                String(error?.message || error),
            );
        });
    });
    root.querySelectorAll(
        '[data-hpmud-context-preset]',
    ).forEach(button => {
        button.addEventListener('click', () => {
            applyContextSizePreset(
                button.dataset.hpmudContextPreset,
            );
        });
    });
    root.querySelector('#hpmud_setup_map_scope').addEventListener('change', event => {
        setupMapScope = event.target.value;
        setupMapLevel = '';
        renderSetupMap();
    });
    root.querySelector('#hpmud_setup_map_level').addEventListener('change', event => {
        setupMapLevel = event.target.value;
        renderSetupMap();
    });
    setupForm.addEventListener('input', event => {
        if (event.target.matches('input[type="number"][name^="attr_"]')) {
            updateAttributeTotal();
        }
        saveSetupDraft();
    });
    setupForm.addEventListener('submit', event => {
        event.preventDefault();
        void startGameFromSetup().catch(error => {
            console.error('[Hogwarts MUD] Failed to start game', error);
            toastr.error(String(error?.message || error));
        });
    });
    root.querySelector('#hpmud_polish_background').addEventListener('click', () => void polishCharacterBackground());
    root.querySelector('#hpmud_refresh_profiles').addEventListener('click', syncModelSlotControls);
    root.querySelector('#hpmud_create_profile').addEventListener('click', () => {
        const role = ['low', 'medium', 'high'].find(item => !getSetupControl(`profile_${item}`)?.value) || '';
        openProfileEditor(null, role);
    });
    root.querySelector('#hpmud_edit_profile').addEventListener('click', () => {
        const { profile, role } = getSelectedProfileForEditing();
        if (!profile) {
            toastr.warning('请先在任一职责槽选择要编辑的 Connection Profile。');
            return;
        }
        openProfileEditor(profile, role);
    });
    root.querySelectorAll('[data-hpmud-profile-slot]').forEach(select => {
        select.addEventListener('change', () => {
            persistModelSlots(collectModelSlots());
            syncModelSlotControls();
        });
    });
    root.querySelectorAll('[data-hpmud-preset-slot], [data-hpmud-regex-slot]').forEach(select => {
        select.addEventListener('change', () => persistModelSlots(collectModelSlots()));
    });
    for (const role of ['low', 'medium', 'high']) {
        for (const name of [`context_${role}`, `response_${role}`]) {
            getSetupControl(name).addEventListener('change', () => {
                const slots = persistModelSlots(collectModelSlots());
                setControlValue(`context_${role}`, slots[role].contextSize);
                setControlValue(`response_${role}`, slots[role].maxResponseLength);
                syncContextPolicyUi(slots);
            });
        }
    }
    root.querySelectorAll('[data-hpmud-import-preset-role]').forEach(button => {
        button.addEventListener('click', () => {
            rolePresetImportTarget = button.dataset.hpmudImportPresetRole;
            root.querySelector('#hpmud_role_preset_file').click();
        });
    });
    root.querySelector('#hpmud_role_preset_file').addEventListener('change', async event => {
        const file = event.target.files?.[0];
        const role = rolePresetImportTarget;
        if (!file || !role) return;
        try {
            const name = await importRoleChatPreset(file, role);
            toastr.success(`Chat Completion Preset “${name}” 已导入并绑定到该职责。`);
        } catch (error) {
            console.error('[Hogwarts MUD] Role preset import failed', error);
            toastr.error(String(error?.message || error));
        } finally {
            rolePresetImportTarget = '';
            event.target.value = '';
        }
    });
    root.querySelectorAll('[data-hpmud-import-regex-role]').forEach(button => {
        button.addEventListener('click', () => {
            roleRegexImportTarget = button.dataset.hpmudImportRegexRole;
            root.querySelector('#hpmud_role_regex_file').click();
        });
    });
    root.querySelector('#hpmud_role_regex_file').addEventListener('change', async event => {
        const file = event.target.files?.[0];
        const role = roleRegexImportTarget;
        if (!file || !role) return;
        try {
            const preset = await importRoleRegexPreset(file, role);
            toastr.success(`Regex Preset “${preset.name}” 已导入并绑定到该职责。`);
        } catch (error) {
            console.error('[Hogwarts MUD] Role regex import failed', error);
            toastr.error(String(error?.message || error));
        } finally {
            roleRegexImportTarget = '';
            event.target.value = '';
        }
    });
    root.querySelector('#hpmud_profile_source').addEventListener('change', syncProfileEndpointVisibility);
    root.querySelector('#hpmud_profile_model').addEventListener('change', () => {
        syncManualModelVisibility();
        if (root.querySelector('#hpmud_profile_model').value === MANUAL_MODEL_VALUE) {
            root.querySelector('#hpmud_profile_manual_model').focus();
        }
    });
    root.querySelector('#hpmud_profile_cancel').addEventListener('click', async () => {
        await clearTemporaryProfileSecret();
        profileEditorDialog.close();
    });
    profileEditorDialog.addEventListener('cancel', event => {
        event.preventDefault();
        void clearTemporaryProfileSecret().finally(() => profileEditorDialog.close());
    });
    root.querySelector('#hpmud_profile_form').addEventListener('submit', event => {
        event.preventDefault();
        void saveProfileEditor().catch(error => {
            console.error('[Hogwarts MUD] Profile save failed', error);
            toastr.error(String(error?.message || error));
        });
    });
    root.querySelector('#hpmud_profile_test').addEventListener('click', () => {
        void testProfileConnection().catch(error => {
            console.error('[Hogwarts MUD] Profile test failed', error);
            root.querySelector('#hpmud_profile_test_status').textContent = '连接失败';
            toastr.error(String(error?.message || error));
        });
    });
    root.querySelector('#hpmud_profile_delete').addEventListener('click', () => {
        void deleteProfileEditor().catch(error => {
            console.error('[Hogwarts MUD] Profile deletion failed', error);
            toastr.error(String(error?.message || error));
        });
    });
    root.querySelector('#hpmud_scene_collapse').addEventListener('click', () => {
        root.classList.remove('scene-open');
        root.classList.add('scene-collapsed');
    });
    root.querySelector('#hpmud_scene_restore').addEventListener('click', () => {
        root.classList.remove('scene-collapsed');
        if (matchMedia('(max-width: 1080px)').matches) {
            root.classList.add('scene-open');
        }
    });
    root.querySelector('#hpmud_end_scene').addEventListener(
        'click',
        openSceneTransitionDialog,
    );
    root.querySelector('#hpmud_transition_destination').addEventListener(
        'input',
        updateSceneDestinationStatus,
    );
    for (const id of [
        '#hpmud_scene_transition_cancel',
        '#hpmud_scene_transition_back',
    ]) {
        root.querySelector(id).addEventListener('click', () =>
            sceneTransitionDialog.close());
    }
    root.querySelector('#hpmud_scene_transition_form').addEventListener(
        'submit',
        event => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const tier = form.get('scene_transition_tier') === 'high'
                ? 'high'
                : 'medium';
            const destinationHint = root
                .querySelector('#hpmud_transition_destination')
                .value
                .trim();
            sceneTransitionDialog.close();
            void runSceneTransition({
                tier,
                destinationHint,
            }).catch(error => {
                console.error('[Hogwarts MUD] Scene transition failed', error);
                toastr.error(String(error?.cause?.message || error?.message || error));
            });
        },
    );
    root.querySelector('#hpmud_archive_close').addEventListener(
        'click',
        () => sceneArchiveDialog.close(),
    );
    root.querySelector('#hpmud_focus').addEventListener('click', event => {
        root.classList.toggle('focus-mode');
        event.currentTarget.textContent = root.classList.contains('focus-mode') ? '退出专注' : '专注';
    });
    root.querySelector('#hpmud_character').addEventListener('click', () => {
        if (isGameStarted() && workspaceElement.hidden === false) {
            renderInspector('character');
        }
    });
    root.querySelectorAll('[data-hpmud-tab]').forEach(button => {
        button.addEventListener('click', () => renderInspector(button.dataset.hpmudTab));
    });
    root.querySelectorAll('[data-hpmud-inspector]').forEach(button => {
        button.addEventListener('click', () => renderInspector(button.dataset.hpmudInspector));
    });
    root.querySelectorAll('[data-hpmud-template]').forEach(button => {
        button.addEventListener('click', () => {
            const templates = {
                speech: ['“……”', 1],
                action: ['我……', 1],
                thought: ['我心里想：……', 5],
            };
            const [text, caret] = templates[button.dataset.hpmudTemplate];
            insertAtCursor(text, caret);
            button.closest('details').removeAttribute('open');
        });
    });
    root.querySelector(
        '#hpmud_insert_spell',
    ).addEventListener(
        'click',
        openSpellPicker,
    );
    root.querySelector(
        '#hpmud_close_spell',
    ).addEventListener(
        'click',
        closeSpellPicker,
    );
    root.querySelector(
        '#hpmud_spell_search',
    ).addEventListener(
        'input',
        event =>
            renderSpellPicker(
                event.currentTarget
                    .value,
            ),
    );
    root.querySelector(
        '#hpmud_spell_show_all',
    ).addEventListener(
        'click',
        () => {
            spellPickerShowAll =
                !spellPickerShowAll;
            renderSpellPicker(
                root.querySelector(
                    '#hpmud_spell_search',
                ).value,
            );
        },
    );
    root.querySelector(
        '#hpmud_clear_spell',
    ).addEventListener(
        'click',
        clearComposerSpell,
    );
    const movementButton =
        root.querySelector(
            '#hpmud_insert_movement',
        );
    movementButton
        ?.addEventListener(
            'click',
            openMovementPicker,
        );
    root.querySelector(
        '#hpmud_close_movement',
    ).addEventListener(
        'click',
        closeMovementPicker,
    );
    root.querySelector(
        '#hpmud_custom_movement',
    ).addEventListener(
        'click',
        () => {
            closeMovementPicker();
            insertAtCursor(
                '→【】',
                2,
            );
        },
    );
    root.querySelector(
        '#hpmud_movement_search',
    ).addEventListener(
        'input',
        event =>
            renderMovementPicker(
                event.currentTarget
                    .value,
            ),
    );
    root.addEventListener(
        'click',
        event => {
            const picker =
                root.querySelector(
                    '#hpmud_movement_picker',
                );
            const panel =
                root.querySelector(
                    '#hpmud_movement_panel',
                );
            if (
                !panel.hidden &&
                !picker.contains(
                    event.target,
                )
            ) {
                closeMovementPicker();
            }
            const spellPicker =
                root.querySelector(
                    '#hpmud_spell_picker',
                );
            const spellPanel =
                root.querySelector(
                    '#hpmud_spell_panel',
                );
            if (
                !spellPanel.hidden &&
                !spellPicker.contains(
                    event.target,
                )
            ) {
                closeSpellPicker();
            }
        },
    );
    root.addEventListener(
        'keydown',
        event => {
            if (
                event.key ===
                    'Escape' &&
                !root.querySelector(
                    '#hpmud_movement_panel',
                ).hidden
            ) {
                event.preventDefault();
                closeMovementPicker();
                movementButton.focus();
            } else if (
                event.key ===
                    'Escape' &&
                !root.querySelector(
                    '#hpmud_spell_panel',
                ).hidden
            ) {
                event.preventDefault();
                closeSpellPicker();
                root.querySelector(
                    '#hpmud_insert_spell',
                ).focus();
            }
        },
    );
    root.querySelector(
        '#hpmud_clear_address',
    ).addEventListener(
        'click',
        clearComposerAddressTarget,
    );
    root.querySelector('#hpmud_composer').addEventListener('submit', event => {
        event.preventDefault();
        submitTurn(false);
    });
    root.querySelector('#hpmud_check').addEventListener('click', () => submitTurn(true));
    root.querySelector(
        '#hpmud_rollback_turn',
    ).addEventListener(
        'click',
        () => {
            void rollbackLastTurn();
        },
    );
    composerInput.addEventListener('input', () => {
        composerInput.style.height = 'auto';
        composerInput.style.height = `${Math.min(composerInput.scrollHeight, 150)}px`;
        renderComposerAddressing();
        renderComposerSpellPreview();
    });
    composerInput.addEventListener('keydown', event => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            submitTurn(false);
        }
    });

    root.querySelector('#hpmud_save_settings').addEventListener('click', () => {
        const settings = getSettings();
        settings.enabled = root.querySelector('#hpmud_prompt_enabled').checked;
        settings.translationProvider =
            normalizeTranslationProvider(
                root.querySelector(
                    '#hpmud_translation_provider',
                ).value,
            );
        settings.translationEnabled =
            settings.translationProvider !==
            'off';
        settings.worldPrompt = root.querySelector('#hpmud_world_prompt').value.trim() || DEFAULT_WORLD_PROMPT;
        saveSettingsDebounced();
        syncSettingsUi();
        applySystemPrompt();
        if (settings.translationEnabled) {
            void refreshTranslationsForProvider();
        } else {
            void clearDisplayTranslations();
        }
    });

    root.querySelector('#hpmud_import_preset').addEventListener('click', () => root.querySelector('#hpmud_preset_file').click());
    root.querySelector('#hpmud_preset_file').addEventListener('change', async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        const status = root.querySelector('#hpmud_preset_status');
        status.textContent = '导入中…';
        try {
            const result = await importPreset(file);
            const stripped = result.removed.length ? ` · 已移除敏感字段 ${result.removed.length} 个` : '';
            status.textContent = `${result.name} · ${result.apiId}${stripped}`;
            toastr.success(`Preset “${result.name}” 已导入。`);
        } catch (error) {
            console.error('[Hogwarts MUD] Preset import failed', error);
            status.textContent = '导入失败';
            toastr.error(String(error?.message || error));
        } finally {
            event.target.value = '';
        }
    });

    root.querySelector('#hpmud_import_regex').addEventListener('click', () => root.querySelector('#hpmud_regex_file').click());
    root.querySelector('#hpmud_regex_file').addEventListener('change', async event => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        const status = root.querySelector('#hpmud_regex_status');
        status.textContent = '导入中…';
        try {
            const scripts = await importRegexFiles(files);
            status.textContent = `已导入 ${scripts.length} 条`;
            toastr.success(`已导入 ${scripts.length} 条 Regex。`);
        } catch (error) {
            console.error('[Hogwarts MUD] Regex import failed', error);
            status.textContent = '导入失败';
            toastr.error(String(error?.message || error));
        } finally {
            event.target.value = '';
        }
    });
}

function addToolbarButton() {
    if (document.querySelector('#hpmud_toolbar_button')) {
        return;
    }
    const target = document.querySelector('#extensionsMenu');
    if (!target) {
        return;
    }
    const item = document.createElement('div');
    item.className = 'list-group-item hpmud-toolbar-item';
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'hpmud_toolbar_button';
    button.className = 'hpmud-toolbar-button';
    button.setAttribute('aria-label', 'Hogwarts MUD');
    button.innerHTML = '<div class="fa-solid fa-hat-wizard extensionsMenuExtensionButton"></div><span>Hogwarts MUD</span>';
    button.addEventListener('click', () => setUiVisible(true));
    item.append(button);
    target.append(item);
}

function registerEvents() {
    eventSource.on(event_types.APP_READY, () => {
        if (activeScreen === 'home') {
            void renderSaveLibrary();
        }
    });
    eventSource.on(event_types.CHAT_CHANGED, () => {
        applySystemPrompt();
        syncModelSlotControls();
        scheduleRender();
    });
    for (const event of [
        event_types.CONNECTION_PROFILE_CREATED,
        event_types.CONNECTION_PROFILE_DELETED,
        event_types.CONNECTION_PROFILE_UPDATED,
    ]) {
        eventSource.on(event, () => {
            if (root && !root.hidden) {
                syncModelSlotControls();
            }
        });
    }
    eventSource.makeLast(event_types.CHARACTER_MESSAGE_RENDERED, async messageId => {
        scheduleRender();
        const normalizedMessageId =
            Number(messageId);
        if (
            !shouldTranslateRenderedMessage(
                normalizedMessageId,
                getMudState(),
            )
        ) {
            return;
        }
        await translateMessage(
            normalizedMessageId,
        );
    });
    eventSource.on(event_types.USER_MESSAGE_RENDERED, scheduleRender);
    eventSource.on(event_types.MESSAGE_UPDATED, messageId => {
        scheduleRender();
        void translateMessage(Number(messageId));
    });
    eventSource.on(event_types.MESSAGE_SWIPED, messageId => {
        scheduleRender();
        void translateMessage(Number(messageId));
    });
    eventSource.on(event_types.MESSAGE_DELETED, scheduleRender);
}

export async function init() {
    getSettings();
    applySystemPrompt();

    const html = await renderExtensionTemplateAsync(MODULE_NAME, 'panel');
    document.body.insertAdjacentHTML('beforeend', html);
    root = document.querySelector('#hpmud_app');
    homeElement = root.querySelector('#hpmud_home');
    setupElement = root.querySelector('#hpmud_setup');
    workspaceElement = root.querySelector('#hpmud_workspace');
    setupForm = root.querySelector('#hpmud_setup_form');
    storyElement = root.querySelector('#hpmud_story');
    inspectorElement = root.querySelector('#hpmud_inspector_content');
    composerInput = root.querySelector('#hpmud_input');
    settingsDialog = root.querySelector('#hpmud_settings');
    profileEditorDialog = root.querySelector('#hpmud_profile_editor');
    sceneTransitionDialog = root.querySelector('#hpmud_scene_transition_dialog');
    sceneArchiveDialog = root.querySelector('#hpmud_scene_archive_dialog');
    relationshipGraphController =
        createRelationshipGraphController({
            root,
            getState: () =>
                getMudState() || {},
            getTimelineKey: () => {
                const context =
                    getContext();
                return String(
                    context
                        .getCurrentChatId?.() ||
                    context.chatId ||
                    getMudState()
                        ?.campaign
                        ?.timelineId ||
                    'unsaved',
                );
            },
            onOpenActor: actorId => {
                selectedActorId =
                    actorId;
                renderInspector(
                    'actor',
                );
            },
        });

    bindUi();
    renderComposerAddressing();
    renderComposerSpellPreview();
    addLauncherButton();
    addToolbarButton();
    registerEvents();
    syncSettingsUi();
    setUiVisible(getSettings().uiEnabled);
    renderAll();
}
