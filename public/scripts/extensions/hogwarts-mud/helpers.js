// Compatibility facade. Implementations live in focused domain modules.

export {
    CONTEXT_SIZE_PRESETS, DEFAULT_CONTEXT_SIZE, DEFAULT_MODEL_SLOTS, DEFAULT_RESPONSE_HEADROOM,
    MANDATORY_CONTEXT_RESERVE, MIN_CONTEXT_SIZE, RESPONSE_HEADROOM_VERSION, ROLE_CONTEXT_RESERVE,
    createContextBudgetPlan, limitMessagesToContext, normalizeModelSlots,
} from './core/context-budget.js';

export {
    extractStreamingSceneSegments, parseCompleteJsonObject, recoverScenePerformancePayload, recoverSceneTransitionPayload,
} from './core/json-recovery.js';

export {
    admitCurrentLocationResidents, admitMentionedKnownActors,
} from './domain/actor-admission.js';

export {
    buildActorNameAliases, buildStructuredPlayerTurnSequence, parseExplicitAddressBlocks, parseExplicitAddressDirective,
    reconcileCanonActorDisplayNames, reconcileTemporaryActorDisplayNames, removeExplicitAddressDirective, resolvePlayerAddressing,
    resolveTemporaryActorRevealedName, stripExplicitAddressTargets,
} from './domain/actor-identity.js';

export {
    buildActorContinuityCapsules, buildActorKnowledgeCapsules, filterKnowledgeForAudience, getActorKnownRumors,
    getActorVisibleSocialKnowledge, migrateActorKnowledgeBoundaries,
} from './domain/actor-knowledge.js';

export {
    migrateRelationshipMemoryState,
} from './domain/actor-memory-migration.js';

export {
    analyzeMemoryConsolidation, applyMemoryConsolidation, normalizeMemoryConsolidationPayload, validateMemoryConsolidation,
} from './domain/actor-memory-reducer.js';

export {
    ACTOR_KNOWLEDGE_BOUNDARY_EN, ACTOR_KNOWLEDGE_VERSION, FIRST_IMPRESSION_MAX_WORDS, FIRST_IMPRESSION_VERSION,
    IMPRESSION_MAX_WORDS, IMPRESSION_UPDATE_COOLDOWN_TURNS, RELATIONSHIP_MEMORY_VERSION, SHARED_MEMORY_TIER_LIMITS,
    normalizeActorMemoryProfile, normalizeSharedMemories, sanitizeActorKnowledgeEn, selectSharedMemoriesForContext,
} from './domain/actor-memory.js';

export {
    ACTOR_PRESENTATION_VERSION, buildActorAppearanceView, migrateActorPresentationState, splitActorVisualDescription,
} from './domain/appearance.js';

export {
    applySceneTransition,
} from './domain/archive-projection.js';

export {
    CAMPAIGN_PRESETS, CANON_CAST_IDENTITY_CONTRACT, CANON_WIT_TONE_CONTRACT, DEFAULT_WORLD_PROMPT,
    DIFFICULTY_PRESETS, ENGLISH_OUTPUT_CONTRACT, buildCampaignContext, buildSystemPrompt,
    createDefaultCampaign, normalizeCampaign,
} from './domain/campaign.js';

export {
    DEFAULT_CAST_POLICY, buildActorSelectionPolicy, buildSceneCastRotationPolicy, buildStoryCastPolicy,
} from './domain/cast.js';

export {
    detectCausalCollapseOpportunity,
} from './domain/causal-collapse.js';

export {
    CAUSAL_COLLAPSE_MAX_BINDINGS_PER_SCENE, CAUSAL_COLLAPSE_MIN_CHECK_TURNS, CAUSAL_COLLAPSE_VERSION, normalizeCausalCollapseState,
} from './domain/causal-state.js';

export {
    CANON_DENSITY_VALUES, CHARACTER_ATTRIBUTE_BUDGET, CHARACTER_ATTRIBUTE_KEYS, RELATIONSHIP_FOCUS_VALUES,
    RELATIVE_AGE_PREFERENCE_VALUES, SOCIAL_DENSITY_VALUES, STORY_TONE_VALUES, buildCharacterContext,
    buildPlayerVisibleProfile, createDefaultCharacterDraft, getPlayerAgeAtClock, getRelativeAgeProfile,
    normalizeStoryPreferences, validateCharacterDraft,
} from './domain/character.js';

export {
    CHECK_ATTRIBUTE_LABELS, detectActionCheck, resolveActionCheck, validateCheckResolution,
} from './domain/checks.js';

export {
    applyDirectorFoundation, applyOpeningWorldPackage, buildMandatorySceneState, createInitialWorldState,
    validateDirectorFoundation, validateOpeningWorldPackage,
} from './domain/initial-world.js';

export {
    applyGeneratedInteriorMap, enterBoundInteriorMap, getInteriorMapRequest, normalizeGeneratedInteriorMapLabels,
    validateGeneratedInteriorMap,
} from './domain/interior-map.js';

export {
    ACTOR_LIFE_STATUS_VALUES, ENTITY_STATE_VERSION, ITEM_CUSTODY_VALUES, ITEM_IMPORTANCE_VALUES,
    OBSERVED_INVENTORY_VERSION, createSceneItemStates, migrateEntityState, migrateObservedInventoryState,
    normalizeInventoryItem, projectObservedInventoryUpdates,
} from './domain/inventory.js';

export {
    getLocalMapDefinition,
} from './domain/map-access.js';

export {
    applyLocalMapMutation, applyMapProposal, buildLocalMapModel, buildMapAuthorityContext,
    buildMapModel, resolveLocalMapId, validateLocalMapMutation, validateLocalMapPack,
    validateMapProposal,
} from './domain/maps.js';

export {
    applyMaterialEvents, buildCurrentMaterialState, normalizeMaterialEvents,
} from './domain/material-state.js';

export {
    applyPlayerMovement, inspectPlayerMovementIntent, isGuidedMovementAction, parseExplicitMovementDirective,
    removeExplicitMovementDirective, resolvePlayerMovement,
} from './domain/movement.js';

export {
    applyPacingAssessment, consumePacingBeat,
} from './domain/pacing-reducer.js';

export {
    analyzePacingSignals,
} from './domain/pacing-signals.js';

export {
    buildTemporaryActorPromotionPolicy, normalizePacingAssessmentPayload, validatePacingAssessment,
} from './domain/pacing-validation.js';

export {
    findLocalRoomPath,
} from './domain/pathfinding.js';

export {
    MAX_IMPORT_BYTES, assertImportSize, detectPresetApi, normalizeRegexScripts,
    sanitizePresetData,
} from './domain/preset-import.js';

export {
    applyEventBoundaryNextSceneIntent, createFallbackNextSceneIntent, findSceneDestination, getSceneDestinationAuthority,
    resolveSceneTransitionDestination, validateEventBoundaryNextSceneIntent, validateNextSceneIntent, validateSceneDestinationGrounding,
} from './domain/scene-destination.js';

export {
    normalizeSceneTransitionPackage, stripSyntheticSceneOpeningActorSegments, validateSceneTransitionPackage,
} from './domain/scene-transition.js';

export {
    migrateLoadedSocialGraph, normalizeSocialGraph, projectActorSocialRelationships,
} from './domain/social-migration.js';

export {
    buildSocialAudienceProjection, deriveRelationshipLabels, isSocialEntryVisibleToAudience,
} from './domain/social-projection.js';

export {
    applySocialDirectorResult, validateSocialDirectorResult,
} from './domain/social-reducer.js';

export {
    SOCIAL_GRAPH_EXTRACTOR_VERSION, SOCIAL_GRAPH_VERSION, SOCIAL_RELATIONSHIP_CLOSENESS_ANCHORS, SOCIAL_RELATIONSHIP_DIMENSIONS,
    SOCIAL_RELATIONSHIP_DIMENSION_RANGES, SOCIAL_RELATIONSHIP_EMOTIONS, SOCIAL_RELATIONSHIP_NEGATIVE_ANCHORS, SOCIAL_RELATIONSHIP_SIGNED_ANCHORS,
    SOCIAL_RELATIONSHIP_STRUCTURAL_TAGS, normalizeSocialRelationshipEdge, normalizeSocialRelationshipEvidence,
} from './domain/social-schema.js';

export {
    ACTOR_MOVEMENT_HISTORY_VERSION, SPATIAL_STATE_VERSION, inferActorRoomId,
} from './domain/spatial-foundation.js';

export {
    ensureMentionedKnownActorMemories, normalizeScenePerformanceActorLocations, sanitizeScenePerformanceActorMetadata,
} from './domain/spatial-performance.js';

export {
    buildSpatialContext, migrateActorMovementHistory, reconcileSpatialState, reconcileTurnActorPresenceWithSpatialState,
    reconcileVisibleActorPresenceState,
} from './domain/spatial-reconciliation.js';

export {
    migrateSpellbookState, settleSpellProgress,
} from './domain/spell-state.js';

export {
    BEHAVIORAL_ENVIRONMENT_VERSION, GOSSIP_CHANNEL_VALUES, TEMPORAL_STATE_VERSION, WORLD_CHANGE_MIN_DAYS,
    WORLD_NEWS_CATEGORY_VALUES, advanceWorldClock, buildBehavioralEnvironment, getWorldClockGapMinutes,
    getWorldDate, isDailyDirectorPlanCurrent, reconcileTemporalState,
} from './domain/time-environment.js';

export {
    TRANSLATION_PROVIDER_IDS, TRANSLATION_TERM_GLOSSARY, applyTranslationGlossaryTargets, buildActorTranslationTerms,
    createTranslationBatches, normalizeLocalTranslationText, normalizeTranslationProvider, protectTranslationTerms,
    restoreTranslationTerms, shouldTranslateToChinese, splitTranslationChunks,
} from './domain/translation.js';

export {
    recoverImplicitTemporaryActorEntrances,
} from './domain/turn-authority.js';

export {
    NARRATIVE_TURN_PROTOCOL_VERSION, finalizeNarrativeTurnPerformance, foldNarrativeTurnProposals, normalizeNarrativeTurnCore,
    reconcileNarrativeTurnAuthority, settleNarrativeTurnPerformance,
} from './domain/turn-protocol.js';

export {
    applyTurnTransaction,
} from './domain/turn-reducer.js';

export {
    createLegacyTurnRollbackCheckpoint, createTurnRetryCheckpoint, findUnsettledTurn, getAvailableTurnRollbackCheckpoint,
    getFailedPlayerTurn, restoreTurnRetryCheckpoint,
} from './domain/turn-rollback.js';

export {
    createTurnPerformanceBudget, estimateTurnMinutes, resolveTurnElapsedMinutes, validateSceneTemporalConsistency,
} from './domain/turn-time.js';

export {
    validateScenePerformance, validateTurnTransaction,
} from './domain/turn-validation.js';

export {
    applyTransitionWorldChanges, normalizeTransitionWorldChanges, validateTransitionWorldChanges,
} from './domain/world-changes.js';

export {
    ACTOR_EVENT_KNOWLEDGE_KIND_VALUES, ACTOR_EVENT_KNOWLEDGE_SCHEMA_VERSION, ACTOR_PRESENT_COMPATIBILITY, ATTRIBUTION_VALUES,
    AUDIBLE_SCOPE_VALUES, COHORT_CONTRACT_KEYS, COHORT_SCHEMA_VERSION, COHORT_SOURCE_VALUES,
    CONCEALMENT_VALUES, EVENT_KNOWLEDGE_CONTRACT_KEYS, EVENT_KNOWLEDGE_SCHEMA_VERSION, EVENT_KNOWLEDGE_SOURCE_VALUES,
    LOCAL_PRESENCE_CONTRACT_KEYS, LOCAL_PRESENCE_SCHEMA_VERSION, LOCAL_PRESENCE_SOURCE_VALUES, PERCEPTION_CONTRACT_KEYS,
    PERCEPTION_SCHEMA_VERSION, PERCEPTION_SOURCE_VALUES, PRESENCE_WITNESS_SCHEMA_VERSION, SALIENCE_VALUES,
    VISUAL_SCOPE_VALUES, WITNESS_BASIS_VALUES, WITNESS_RESOLUTION_CONTRACT_KEYS, WITNESS_RESOLUTION_SCHEMA_VERSION,
    applyPresenceWitnessTransaction, createDefaultLocalPresence, createDefaultPresenceWitnessState, createDeterministicPerceptionFallback,
    createEventKnowledgeId, createStableContractId, getActiveInteractionActorIds, normalizeActiveInteractionActorIds,
    normalizeCohort, normalizeCohorts, normalizeEventKnowledge, normalizeLocalPresence,
    normalizePerception, normalizeWitnessResolution, projectActorEventKnowledge, projectSceneArchivePresence,
    reduceEventKnowledge, reduceLocalPresence, resolveEventWitnesses, validateCohortContract,
    validateEventKnowledgeContract, validateLocalPresenceContract, validatePerceptionContract, validateWitnessResolutionContract,
} from './presence-witness-contract.js';

export {
    SPELL_CATALOG, SPELL_CATALOG_VERSION, SPELL_LEARNING_SOURCE_LABELS, createSpellDirective,
    findSpellReferences, getSpellDefinition, getSpellProficiency, normalizeSpellbook,
    parseSpellCastDirectives, removeSpellCastDirectives,
} from './spell-catalog.js';
