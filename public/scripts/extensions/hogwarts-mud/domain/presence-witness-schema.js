export const PRESENCE_WITNESS_SCHEMA_VERSION = 1;
export const LOCAL_PRESENCE_SCHEMA_VERSION = 1;
export const COHORT_SCHEMA_VERSION = 1;
export const PERCEPTION_SCHEMA_VERSION = 1;
export const WITNESS_RESOLUTION_SCHEMA_VERSION = 1;
export const EVENT_KNOWLEDGE_SCHEMA_VERSION = 2;
export const ACTOR_EVENT_KNOWLEDGE_SCHEMA_VERSION = 2;
export const EVENT_KNOWLEDGE_KIND_VALUES =
    Object.freeze([
        'observed',
        'reported',
    ]);
export const REPORTED_EVENT_STATEMENT_KIND_VALUES =
    Object.freeze([
        'claim',
        'correction',
        'retraction',
    ]);
export const ACTOR_EVENT_KNOWLEDGE_KIND_VALUES =
    Object.freeze([
        'direct',
        'witnessed',
        'reported',
    ]);

export const ACTOR_PRESENT_COMPATIBILITY =
    Object.freeze({
        version: 1,
        meaning: 'active_interaction',
        physicalPresenceAuthority:
            'localPresence',
        falseDoesNotMean:
            'left_current_room',
    });

export const VISUAL_SCOPE_VALUES =
    Object.freeze([
        'none',
        'target',
        'nearby',
        'room',
        'area',
    ]);
export const AUDIBLE_SCOPE_VALUES =
    Object.freeze([
        'none',
        'target',
        'nearby',
        'room',
        'adjacent',
    ]);
export const SALIENCE_VALUES =
    Object.freeze([
        'subtle',
        'normal',
        'notable',
        'major',
    ]);
export const ATTRIBUTION_VALUES =
    Object.freeze([
        'clear',
        'ambiguous',
        'unknown',
    ]);
export const CONCEALMENT_VALUES =
    Object.freeze([
        'none',
        'attempted',
        'successful',
    ]);
export const PERCEPTION_SOURCE_VALUES =
    Object.freeze([
        'post_turn_observer',
        'deterministic_fallback',
        'deterministic_repair',
        'structured_scene_opening',
        'migration',
    ]);
export const LOCAL_PRESENCE_SOURCE_VALUES =
    Object.freeze([
        'initial',
        'actor_position',
        'movement',
        'scene_roster',
        'cohort_roster',
        'migration',
    ]);
export const COHORT_SOURCE_VALUES =
    Object.freeze([
        'class_roster',
        'dorm_roster',
        'family_roster',
        'scene_roster',
        'migration',
    ]);
export const EVENT_KNOWLEDGE_SOURCE_VALUES =
    Object.freeze([
        'post_turn_observer',
        'deterministic_fallback',
        'deterministic_repair',
        'structured_scene_opening',
        'social_event_boundary',
        'migration',
    ]);
export const WITNESS_BASIS_VALUES =
    Object.freeze([
        'direct',
        'target_visual',
        'target_audible',
        'target_visual_audible',
        'nearby_visual',
        'nearby_audible',
        'nearby_visual_audible',
        'room_visual',
        'room_audible',
        'room_visual_audible',
        'area_visual',
        'adjacent_audible',
        'reported',
    ]);

export const LOCAL_PRESENCE_CONTRACT_KEYS =
    Object.freeze([
        'version',
        'mapId',
        'roomId',
        'occupantActorIds',
        'cohortIds',
        'updatedTurn',
        'source',
    ]);
export const COHORT_CONTRACT_KEYS =
    Object.freeze([
        'version',
        'id',
        'labelEn',
        'mapId',
        'roomId',
        'knownMemberActorIds',
        'source',
    ]);
export const PERCEPTION_CONTRACT_KEYS =
    Object.freeze([
        'version',
        'visualScope',
        'audibleScope',
        'salience',
        'attribution',
        'concealment',
        'directParticipantActorIds',
        'evidenceText',
        'confidence',
        'source',
    ]);
export const WITNESS_RESOLUTION_CONTRACT_KEYS =
    Object.freeze([
        'version',
        'participantActorIds',
        'witnessActorIds',
        'witnessCohortIds',
        'witnessBasis',
    ]);
export const EVENT_KNOWLEDGE_CONTRACT_KEYS =
    Object.freeze([
        'version',
        'eventKind',
        'eventId',
        'sceneId',
        'clock',
        'sourceMessageIds',
        'summaryEn',
        'activationSchemaIds',
        'participantActorIds',
        'witnessActorIds',
        'witnessCohortIds',
        'witnessBasis',
        'perception',
        'knownToPlayer',
        'source',
        'report',
    ]);
export const EVENT_KNOWLEDGE_OBSERVED_KEYS =
    Object.freeze([
        'version',
        'eventKind',
        'eventId',
        'sceneId',
        'clock',
        'sourceMessageIds',
        'summaryEn',
        'activationSchemaIds',
        'participantActorIds',
        'witnessActorIds',
        'witnessCohortIds',
        'witnessBasis',
        'perception',
        'knownToPlayer',
        'source',
    ]);
export const EVENT_KNOWLEDGE_REPORTED_KEYS =
    Object.freeze([
        'version',
        'eventKind',
        'eventId',
        'sceneId',
        'clock',
        'summaryEn',
        'activationSchemaIds',
        'participantActorIds',
        'witnessActorIds',
        'witnessCohortIds',
        'witnessBasis',
        'knownToPlayer',
        'source',
        'report',
    ]);
export const REPORTED_EVENT_CONTRACT_KEYS =
    Object.freeze([
        'statementKind',
        'sourceSegmentRefs',
        'speakerId',
        'recipientIds',
        'subjectIds',
        'aboutEventId',
        'parentReportedEventId',
        'distortionLevel',
    ]);
export const SOURCE_SEGMENT_REF_CONTRACT_KEYS =
    Object.freeze([
        'messageId',
        'segmentIndex',
    ]);
