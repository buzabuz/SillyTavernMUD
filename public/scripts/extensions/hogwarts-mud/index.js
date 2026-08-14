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
    CONTEXT_SIZE_PRESETS,
    DEFAULT_MODEL_SLOTS,
    RESPONSE_HEADROOM_VERSION,
    createContextBudgetPlan,
    limitMessagesToContext,
    normalizeModelSlots,
} from './core/context-budget.js';
import {
    extractStreamingSceneSegments,
    parseCompleteJsonObject,
    recoverScenePerformancePayload,
} from './core/json-recovery.js';
import { admitCurrentLocationResidents, admitMentionedKnownActors } from './domain/actor-admission.js';
import { migrateActorContextV1 } from './domain/actor-context-cutover.js';
import {
    buildStructuredPlayerTurnSequence,
    reconcileCanonActorDisplayNames,
    reconcileTemporaryActorDisplayNames,
    removeExplicitAddressDirective,
    resolvePlayerAddressing,
    resolveTemporaryActorRevealedName,
    stripExplicitAddressTargets,
} from './domain/actor-identity.js';
import {
    buildActorContinuityCapsules,
    buildActorKnowledgeCapsules,
    buildActorMemoryKnowledgeSeeds,
    filterKnowledgeForAudience,
    migrateActorKnowledgeBoundaries,
} from './domain/actor-knowledge.js';
import { migrateRelationshipMemoryState } from './domain/actor-memory-migration.js';
import {
    analyzeMemoryConsolidation,
    captureMemoryBoundaryGuard,
    isMemoryBoundaryGuardCurrent,
    normalizeMemoryConsolidationPayload,
    validateMemoryConsolidation,
} from './domain/actor-memory-reducer.js';
import {
    normalizeActorMemoryProfile,
    selectSharedMemoriesForContext,
} from './domain/actor-memory.js';
import { buildActorAppearanceView, migrateActorPresentationState } from './domain/appearance.js';
import { applySceneTransition } from './domain/archive-projection.js';
import {
    CAMPAIGN_PRESETS,
    CANON_CAST_IDENTITY_CONTRACT,
    CANON_WIT_TONE_CONTRACT,
    DEFAULT_WORLD_PROMPT,
    DIFFICULTY_PRESETS,
    buildCampaignContext,
    buildSystemPrompt,
    createDefaultCampaign,
    normalizeCampaign,
} from './domain/campaign.js';
import { buildActorSelectionPolicy, buildSceneCastRotationPolicy } from './domain/cast.js';
import { normalizeCausalCollapseState } from './domain/causal-state.js';
import { migrateNpcIdentityState } from './domain/npc-identity-migration.js';
import { migrateNpcIdentityObservations } from './domain/npc-identity-observation-migration.js';
import { NPC_IDENTITY_PROMPT_BOUNDARY, buildNpcIdentityPromptProjection, projectNpcRuntimeActorsForPrompt } from './domain/npc-identity-prompt-projection.js';
import { buildCharacterContext, createDefaultCharacterDraft, validateCharacterDraft } from './domain/character.js';
import { resolveActionCheck } from './domain/checks.js';
import { applyOpeningWorldPackage, buildMandatorySceneState, createInitialWorldState, validateOpeningWorldPackage } from './domain/initial-world.js';
import {
    applyGeneratedInteriorMap,
    enterBoundInteriorMap,
    getInteriorMapRequest,
    normalizeGeneratedInteriorMapLabels,
    validateGeneratedInteriorMap,
} from './domain/interior-map.js';
import { migrateObservedInventoryState, projectObservedInventoryUpdates, synchronizeHeldItemLocations } from './domain/inventory.js';
import { createItemOperationDirective, createItemReferenceDirective, parseItemOperationDirectives } from './domain/item-directive.js';
import { migrateItemSystemState } from './domain/item-migration.js';
import { getItemProposalDecision, projectActorItems, projectItemCard, projectItemLedger } from './domain/item-projection.js';
import { partitionItemProposals, resolveItemCandidate } from './domain/item-reducer.js';
import { getLocalMapDefinition } from './domain/map-access.js';
import {
    applyMapProposal,
    buildLocalMapModel,
    buildMapAuthorityContext,
    buildMapModel,
    resolveLocalMapId,
    validateMapProposal,
} from './domain/maps.js';
import { buildCurrentMaterialState } from './domain/material-state.js';
import { applyPlayerMovement, parseExplicitMovementDirective } from './domain/movement.js';
import { applyPacingAssessment, consumePacingBeat } from './domain/pacing-reducer.js';
import { analyzePacingSignals } from './domain/pacing-signals.js';
import {
    buildTemporaryActorPromotionPolicy,
    normalizePacingAssessmentPayload,
    validatePacingAssessment,
} from './domain/pacing-validation.js';
import { findLocalRoomPath } from './domain/pathfinding.js';
import {
    assertImportSize,
    detectPresetApi,
    normalizeRegexScripts,
    sanitizePresetData,
} from './domain/preset-import.js';
import {
    createFallbackNextSceneIntent,
    findSceneDestination,
    getSceneDestinationAuthority,
    validateNextSceneIntent,
} from './domain/scene-destination.js';
import {
    normalizeSceneTransitionPackage,
    stripSyntheticSceneOpeningActorSegments,
    validateSceneTransitionPackage,
} from './domain/scene-transition.js';
import {
    migrateLoadedSocialGraph,
    normalizeSocialGraph,
    projectActorSocialRelationships,
} from './domain/social-migration.js';
import { buildSocialAudienceProjection } from './domain/social-projection.js';
import { applySocialDirectorResult, validateSocialDirectorResult } from './domain/social-v3-reducer.js';
import { SOCIAL_GRAPH_EXTRACTOR_VERSION } from './domain/social-schema.js';
import {
    buildSpatialContext,
    migrateActorMovementHistory,
    reconcileSpatialState,
    reconcileTurnActorPresenceWithSpatialState,
    reconcileVisibleActorPresenceState,
} from './domain/spatial-reconciliation.js';
import { migrateSpellbookState } from './domain/spell-state.js';
import * as spellProposalPorts from './domain/spell-proposals.js';
import {
    buildBehavioralEnvironment,
} from './domain/time-environment.js';
import { projectSceneTransitionPresence } from './domain/transition-presence.js';
import {
    TRANSLATION_TERM_GLOSSARY,
    applyTranslationGlossaryTargets,
    buildActorTranslationTerms,
    createTranslationBatches,
    normalizeLocalTranslationText,
    normalizeTranslationProvider,
    protectTranslationTerms,
    restoreTranslationTerms,
    shouldTranslateToChinese,
    splitTranslationChunks,
} from './domain/translation.js';
import { settleNarrativeTurnPerformance } from './domain/turn-protocol.js';
import { applyTurnTransaction } from './domain/turn-reducer.js';
import {
    createLegacyTurnRollbackCheckpoint,
    createTurnRetryCheckpoint,
    findUnsettledTurn,
    getAvailableTurnRollbackCheckpoint,
    getFailedPlayerTurn,
    restoreTurnRetryCheckpoint,
} from './domain/turn-rollback.js';
import { createTurnPerformanceBudget } from './domain/turn-time.js';
import { validateScenePerformance, validateTurnTransaction } from './domain/turn-validation.js';
import {
    applyPresenceWitnessTransaction,
    createDeterministicPerceptionFallback,
    normalizeEventKnowledge,
    projectSceneArchivePresence,
    reduceLocalPresence,
    resolveEventWitnesses,
    validatePerceptionContract,
} from './presence-witness-contract.js';
import { reconcileObservedPerceptionWithFallback } from './domain/perception-reconciliation.js';
import {
    SPELL_CATALOG, SPELL_LEARNING_SOURCE_LABELS, createSpellDirective,
    getSpellDefinition, getSpellDefinitions, getSpellProficiency,
    parseSpellCastDirectives, removeSpellCastDirectives,
} from './spell-catalog.js';
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
import { createAutomaticWorkGate } from './runtime/automatic-work.js';
import { createJobRegistry } from './runtime/job-registry.js';
import { createActionPorts } from './runtime/action-ports.js';
import { createGuardedSavePorts } from './runtime/guarded-save-ports.js?v=0.1.1';
import {
    canOpenCurrentSocialSaveReadOnly,
    shouldTranslateRenderedMessage,
} from './runtime/read-only-policy.js';
import { createWorkflowApplication } from './workflows/application.js';
import { createSocialMemoryWorkflow } from './workflows/social-memory.js';
import {
    createUiApplication,
    UI_ACTION_NAMES,
} from './ui/application.js';
import { getUiDomRefs } from './ui/dom.js';
import { createUiSessionState } from './ui/session-state.js';
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
const LIVE_STREAM_PHASE_LABELS = Object.freeze({
    connecting: '正在铺开羊皮纸',
    receiving: '正在生成完整回复',
    repairing: '结构校对后重新整理',
    translating: '原稿完成，正在译入中文',
    committing: '正在装订现场记录',
});
const automaticWork = createAutomaticWorkGate(), jobRegistry = createJobRegistry();
const saveRevisionPorts = createGuardedSavePorts({ getContext, saveMetadataDebounced,
    onConflict: (_conflict, message) => { toastr.error(message); application?.renderAll(); } });
const actionPorts = createActionPorts(UI_ACTION_NAMES);
const session = createUiSessionState({
    campaign: createDefaultCampaign(),
    currentScenePageSize: CURRENT_SCENE_PAGE_SIZE,
    archiveListPageSize: ARCHIVE_LIST_PAGE_SIZE,
    archiveTranscriptPageSize: ARCHIVE_TRANSCRIPT_PAGE_SIZE,
});
const platform = {
    ARCHIVE_LIST_PAGE_SIZE,
    ARCHIVE_TRANSCRIPT_PAGE_SIZE,
    CAMPAIGN_PRESETS,
    CANON_CAST_IDENTITY_CONTRACT,
    CANON_WIT_TONE_CONTRACT,
    CONTEXT_SIZE_PRESETS,
    CURRENT_SCENE_PAGE_SIZE,
    ConnectionManagerRequestService,
    DEFAULT_MODEL_SLOTS,
    DEFAULT_SETTINGS,
    DEFAULT_WORLD_PROMPT,
    DIFFICULTY_PRESETS,
    LIVE_STREAM_PHASE_LABELS,
    LOCAL_MAP_CATALOG,
    MANUAL_MODEL_VALUE,
    MAP_DIRECTOR_TRIGGERS,
    MAX_RENDERED_MESSAGES,
    MODULE_NAME,
    NPC_IDENTITY_PROMPT_BOUNDARY,
    PRESET_WORLD_MAP,
    PROFILE_SECRET_KEYS,
    PROMPT_KEY,
    RESPONSE_HEADROOM_VERSION,
    RegexProvider,
    SCRIPT_TYPES,
    SECRET_KEYS,
    SOCIAL_GRAPH_EXTRACTOR_VERSION,
    SPELL_CATALOG,
    SPELL_LEARNING_SOURCE_LABELS,
    ...spellProposalPorts,
    TRANSLATION_FORMAT_VERSION,
    TRANSLATION_TERM_GLOSSARY,
    admitCurrentLocationResidents,
    admitMentionedKnownActors,
    allowPresetScripts,
    analyzeMemoryConsolidation,
    analyzePacingSignals,
    applyGeneratedInteriorMap,
    applyMapProposal,
    applyOpeningWorldPackage,
    applyPacingAssessment,
    applyPlayerMovement,
    applyPresenceWitnessTransaction,
    applySceneTransition,
    applySocialDirectorResult,
    applyTranslationGlossaryTargets,
    applyTurnTransaction,
    assertImportSize,
    buildActorAppearanceView,
    buildActorContinuityCapsules,
    buildActorKnowledgeCapsules,
    buildActorMemoryKnowledgeSeeds,
    buildActorSelectionPolicy,
    buildActorTranslationTerms,
    buildBehavioralEnvironment,
    buildCampaignContext,
    buildCharacterContext,
    buildCurrentMaterialState,
    buildLocalMapModel,
    buildMandatorySceneState,
    buildMapAuthorityContext,
    buildMapModel,
    buildNpcIdentityPromptProjection,
    buildSceneCastRotationPolicy,
    buildSocialAudienceProjection,
    buildSpatialContext,
    captureMemoryBoundaryGuard,
    buildStructuredPlayerTurnSequence,
    buildSystemPrompt,
    buildTemporaryActorPromotionPolicy,
    canOpenCurrentSocialSaveReadOnly,
    consumePacingBeat,
    createContextBudgetPlan,
    createDefaultCampaign,
    createDefaultCharacterDraft,
    createDeterministicPerceptionFallback,
    createFallbackNextSceneIntent,
    createInitialWorldState, createItemOperationDirective, createItemReferenceDirective,
    createLegacyTurnRollbackCheckpoint,
    createRelationshipGraphController,
    createSpellDirective,
    createTranslationBatches,
    createTurnPerformanceBudget,
    createTurnRetryCheckpoint,
    deleteSecret,
    detectPresetApi,
    doNewChat,
    enterBoundInteriorMap,
    eventSource,
    event_types,
    extension_prompt_roles,
    extension_prompt_types,
    extension_settings,
    extractStreamingSceneSegments,
    filterKnowledgeForAudience,
    findLocalRoomPath,
    findSceneDestination,
    findUnsettledTurn,
    formatRetrievedKnowledge,
    getAvailableTurnRollbackCheckpoint,
    getCharacters,
    getContext,
    getCurrentPresetAPI,
    getCurrentPresetName,
    getFailedPlayerTurn,
    getInteriorMapRequest,
    getLocalMapDefinition,
    getPresetLocalMap,
    getPresetManager,
    getRequestHeaders,
    getSceneDestinationAuthority,
    getScriptsByType,
    getSpellDefinition,
    getSpellDefinitions,
    getSpellProficiency,
    isMemoryBoundaryGuardCurrent,
    limitMessagesToContext,
    migrateActorContextState:
        migrateActorContextV1,
    migrateActorKnowledgeBoundaries,
    migrateActorMovementHistory,
    migrateActorPresentationState,
    migrateLoadedSocialGraph,
    migrateObservedInventoryState,
    migrateItemSystemState,
    migrateNpcIdentityState,
    migrateNpcIdentityObservations,
    migrateRelationshipMemoryState,
    migrateSpellbookState,
    normalizeActorMemoryProfile,
    normalizeCampaign,
    normalizeCausalCollapseState,
    normalizeEventKnowledge,
    normalizeGeneratedInteriorMapLabels,
    normalizeLocalTranslationText,
    normalizeMemoryConsolidationPayload,
    normalizeModelSlots,
    normalizePacingAssessmentPayload,
    normalizeRegexScripts,
    normalizeSceneTransitionPackage,
    normalizeSocialGraph,
    normalizeTranslationProvider,
    parseCompleteJsonObject,
    parseExplicitMovementDirective,
    parseItemOperationDirectives,
    parseSpellCastDirectives,
    partitionItemProposals,
    projectActorSocialRelationships,
    projectActorItems,
    projectItemCard,
    projectItemLedger,
    projectObservedInventoryUpdates,
    projectPeoplePanel,
    projectNpcRuntimeActorsForPrompt,
    projectSceneTransitionPresence,
    projectSceneArchivePresence, reconcileObservedPerceptionWithFallback,
    protectTranslationTerms,
    reconcileCanonActorDisplayNames,
    reconcileSpatialState,
    reconcileTemporaryActorDisplayNames,
    reconcileTurnActorPresenceWithSpatialState,
    reconcileVisibleActorPresenceState,
    recoverScenePerformancePayload,
    reduceLocalPresence,
    removeExplicitAddressDirective,
    removeSpellCastDirectives,
    renderExtensionTemplateAsync,
    resolveActionCheck,
    resolveEventWitnesses,
    resolveItemCandidate,
    resolveLocalMapId,
    resolvePlayerAddressing,
    resolveTemporaryActorRevealedName,
    restoreTranslationTerms,
    restoreTurnRetryCheckpoint,
    retrieveKnowledge,
    sanitizePresetData,
    saveMetadataDebounced,
    saveScriptsByType,
    saveSettingsDebounced,
    selectCharacterById,
    selectSharedMemoriesForContext,
    setExtensionPrompt,
    settleNarrativeTurnPerformance,
    shouldTranslateRenderedMessage,
    shouldTranslateToChinese,
    splitTranslationChunks,
    stripExplicitAddressTargets,
    stripSyntheticSceneOpeningActorSegments,
    synchronizeHeldItemLocations, syncKnowledgeBase,
    updateMessageBlock,
    uuidv4,
    validateCharacterDraft,
    validateGeneratedInteriorMap,
    validateMapProposal,
    validateMemoryConsolidation,
    validateNextSceneIntent,
    validateOpeningWorldPackage,
    validatePacingAssessment,
    validatePerceptionContract,
    validateScenePerformance,
    validateSceneTransitionPackage,
    validateSocialDirectorResult,
    validateTurnTransaction,
    getItemProposalDecision,
    writeSecret,
    ...saveRevisionPorts,
};

let initializationPromise = null, application = null;
const compatibility = createSocialMemoryWorkflow({
    buildSocialAudienceProjection,
    normalizeActorMemoryProfile,
    normalizeSocialGraph,
    selectSharedMemoriesForContext,
});

async function initialize() {
    const html =
        await renderExtensionTemplateAsync(
            MODULE_NAME,
            'panel',
        );
    document.body.insertAdjacentHTML(
        'beforeend',
        html,
    );
    const refs = getUiDomRefs(
        document.querySelector('#hpmud_app'),
    );
    const workflows =
        createWorkflowApplication({
            ...platform,
            ...actionPorts.actions,
            automaticWork,
            jobRegistry,
        });
    application = createUiApplication({
        refs,
        session,
        actions: actionPorts.actions,
        ports: {
            ...platform,
            ...workflows,
            automaticWork,
            jobRegistry,
        },
    });
    refs.relationshipGraphController =
        createRelationshipGraphController({
            root: refs.root,
            getState: () =>
                workflows.getMudState() || {},
            getTimelineKey: () => {
                const context = getContext();
                return String(
                    context.getCurrentChatId?.() ||
                    context.chatId ||
                    workflows.getMudState()
                        ?.campaign
                        ?.timelineId ||
                    'unsaved',
                );
            },
            onOpenActor: actorId => {
                session.selectedActorId = actorId;
                application.renderInspector(
                    'actor',
                );
            },
        });
    actionPorts.bind(application);

    application.registerUiBindings();
    application.addLauncherButton();
    application.addToolbarButton();
    application.registerHostEvents();

    workflows.getSettings();
    application.applySystemPrompt();
    application.renderComposerAddressing();
    application.renderComposerSpellPreview();
    application.syncSettingsUi();
    application.setUiVisible(
        workflows.getSettings().uiEnabled,
    );
    application.renderAll();
}
export {
    canOpenCurrentSocialSaveReadOnly,
    shouldTranslateRenderedMessage,
};
export const {
    createMemoryConsolidationPrompt,
    SOCIAL_DIRECTOR_RESPONSE_SCHEMA,
} = compatibility;
export function init() {
    initializationPromise ??= initialize();
    return initializationPromise;
}
