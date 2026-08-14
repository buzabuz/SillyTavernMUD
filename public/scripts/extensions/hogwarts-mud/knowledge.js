import { getRequestHeaders } from '/script.js';
import { getStringHash } from '/scripts/utils.js';
import {
    getActiveInteractionActorIds,
} from './presence-witness-contract.js';
import {
    projectActorCore,
} from './domain/actor-context-schema.js';
import {
    KNOWLEDGE_API_CONTRACT_VERSION,
    KNOWLEDGE_CATEGORIES as V2_KNOWLEDGE_CATEGORIES,
    computeKnowledgeProjectionFingerprint,
    createChunkedKnowledgeRecords,
    createKnowledgeRecordV2,
    hydrateCanonicalKnowledgeCandidates,
    hydrateKnowledgeRecords,
    isKnowledgeRecordVisible,
    normalizeKnowledgeId,
} from './domain/knowledge-projector-v2.js';
import {
    getLegalAppraisalObserverIds,
} from './domain/memory-synapse-schema.js';

export const KNOWLEDGE_CATEGORIES = V2_KNOWLEDGE_CATEGORIES;
const VECTOR_SOURCE = 'transformers';
const VECTOR_PREFIX = 'HPMUD_KB_RECORD ';

export class KnowledgeApiContractError
    extends Error {
    constructor(actualVersion) {
        super(
            `Knowledge API contract mismatch: expected ${KNOWLEDGE_API_CONTRACT_VERSION}, received ${
                actualVersion ??
                'missing'
            }. Restart the SillyTavern server before continuing.`,
        );
        this.name =
            'KnowledgeApiContractError';
        this.code =
            'KNOWLEDGE_API_CONTRACT_MISMATCH';
        this.expectedVersion =
            KNOWLEDGE_API_CONTRACT_VERSION;
        this.actualVersion =
            actualVersion ??
            null;
    }
}

function assertKnowledgeApiContract(
    payload,
) {
    const actualVersion =
        Number(
            payload
                ?.knowledgeApiContractVersion,
        );
    if (
        actualVersion !==
        KNOWLEDGE_API_CONTRACT_VERSION
    ) {
        throw new KnowledgeApiContractError(
            Number.isFinite(actualVersion)
                ? actualVersion
                : null,
        );
    }
}

function normalizeId(value, fallback = 'unknown') {
    return normalizeKnowledgeId(
        value,
        fallback,
    );
}

function makeRecord(category, id, title, text, data, entityIds = [], tags = []) {
    return {
        category,
        id: normalizeId(id),
        title: String(title || id),
        text: String(text || '').trim(),
        data,
        entityIds: [...new Set(entityIds.map(value => normalizeId(value)).filter(Boolean))],
        tags: [...new Set(tags.map(value => normalizeId(value)).filter(Boolean))],
    };
}

function getLegacyRecordSourceRefs(record) {
    const sourceRefs = [];
    const add = (type, values) => {
        for (const value of values || []) {
            if (
                value !== undefined &&
                value !== null &&
                String(value).trim()
            ) {
                sourceRefs.push({
                    type,
                    id: String(value),
                });
            }
        }
    };
    add(
        'state',
        [record.id],
    );
    add(
        'message',
        record.data?.messageIds ||
        record.data?.sourceMessageIds ||
        record.data?.eventKnowledge
            ?.sourceMessageIds ||
        [],
    );
    add(
        'event',
        record.data?.events
            ?.map(event =>
                event.eventId) ||
        record.data?.sourceEventIds ||
        [],
    );
    if (
        record.data?.eventKnowledge
            ?.eventId
    ) {
        add(
            'event',
            [
                record.data
                    .eventKnowledge
                    .eventId,
            ],
        );
    }
    add(
        'appraisal',
        (
            record.data
                ?.relationshipReceiptRefs ||
            []
        )
            .map(reference =>
                reference.appraisalId)
            .filter(Boolean),
    );
    return sourceRefs;
}

function getLegacyRecordVisibility(
    record,
    state = {},
) {
    if (record.category === 'clues') {
        return {
            scope:
                record.tags.includes(
                    'discovered',
                )
                    ? 'public'
                    : 'locked',
            actorIds:
                record.tags.includes(
                    'discovered',
                )
                    ? ['player']
                    : [],
        };
    }
    if (
        record.category ===
        'appraisals'
    ) {
        return {
            scope: 'actor',
            actorIds: [
                record.data
                    ?.appraisal
                    ?.observerId,
            ].filter(Boolean),
        };
    }
    if (
        record.category ===
        'schemas'
    ) {
        return {
            scope: 'actor',
            actorIds: [
                record.data
                    ?.schema
                    ?.observerId,
            ].filter(Boolean),
        };
    }
    if (
        record.category ===
        'social_evidence'
    ) {
        return {
            scope: 'witnesses',
            actorIds: [
                'player',
                ...(
                    record.data
                        ?.socialEvidence
                        ?.witnessedBy ||
                    []
                ),
                record.data
                    ?.socialEvidence
                    ?.sourceActorId,
                record.data
                    ?.socialEvidence
                    ?.targetActorId,
            ].filter(Boolean),
        };
    }
    if (
        record.category === 'scenes'
    ) {
        return {
            scope: 'witnesses',
            actorIds: [
                'player',
                ...(
                    record.data
                        ?.activeInteractionActorIds ||
                    []
                ),
                ...(
                    record.data
                        ?.participantActorIds ||
                    []
                ),
                ...(
                    record.data
                        ?.witnessActorIds ||
                    []
                ),
            ],
        };
    }
    if (
        record.category === 'events'
    ) {
        const event =
            record.data
                ?.eventKnowledge ||
            record.data
                ?.causalCollapse ||
            {};
        const explicitPublic =
            event.visibility ===
                'public' ||
            event.visibility?.scope ===
                'public';
        if (explicitPublic) {
            return {
                scope: 'public',
                actorIds: [],
            };
        }
        const actorIds = [
            ...new Set([
                ...(
                    event
                        .participantActorIds ||
                    []
                ),
                ...(
                    event
                        .witnessActorIds ||
                    []
                ),
                ...(
                    event
                        .knownByActorIds ||
                    []
                ),
                ...getLegalAppraisalObserverIds(
                    state,
                    event,
                ),
                ...(
                    event
                        .knownToPlayer ===
                    true
                        ? ['player']
                        : []
                ),
            ]),
        ];
        return actorIds.length
            ? {
                scope: 'witnesses',
                actorIds,
            }
            : {
                scope: 'locked',
                actorIds: [],
            };
    }
    return {
        scope: 'public',
        actorIds: [],
    };
}

function getSafeRecordData(record) {
    return record.data;
}

function projectLegacyRecordsV2(
    records,
    state,
) {
    const timelineEpoch =
        String(
            state.timelineEpoch ||
            state.knowledgeBase
                ?.timelineId ||
            'legacy_epoch',
        );
    const stateRevision =
        Math.max(
            0,
            Number(
                state.stateRevision,
            ) || 0,
        );
    const nodeTypeByCategory = {
        actors: 'actor',
        scenes: 'scene',
        events: 'fact',
        clues: 'clue',
        appraisals: 'appraisal',
        schemas: 'schema',
        social_evidence: 'fact',
    };
    return records
        .filter(record =>
            record.text)
        .flatMap(record => {
            const sceneId =
                record.data
                    ?.eventKnowledge
                    ?.sceneId ||
                record.data
                    ?.causalCollapse
                    ?.sceneId ||
                record.data
                    ?.appraisal
                    ?.sceneId ||
                (
                    record.category ===
                    'scenes'
                        ? record.id
                        : ''
                );
            const effectiveClock =
                record.data
                    ?.transaction
                    ?.committedClock ||
                record.data
                    ?.causalCollapse
                    ?.effectiveSinceClock ||
                record.data
                    ?.appraisal
                    ?.committedClock ||
                record.data
                    ?.schema
                    ?.updatedClock ||
                record.data
                    ?.archive
                    ?.startedClock ||
                state.clock ||
                '';
            const input = {
                ...record,
                recordId:
                    `${record.category}_${record.id}`,
                nodeType:
                    nodeTypeByCategory[
                        record.category
                    ],
                timelineEpoch,
                stateRevision,
                sourceRefs:
                    getLegacyRecordSourceRefs(
                        record,
                    ),
                visibility:
                    getLegacyRecordVisibility(
                        record,
                        state,
                    ),
                effectiveClock,
                sceneId,
                data:
                    getSafeRecordData(
                        record,
                    ),
            };
            return (
                record.category ===
                    'scenes' ||
                record.category ===
                    'events'
            )
                ? createChunkedKnowledgeRecords(
                    input,
                )
                : [
                    createKnowledgeRecordV2(
                        input,
                    ),
                ];
        })
        .sort((left, right) =>
            left.recordId.localeCompare(
                right.recordId,
            ));
}

export function ensureKnowledgeBaseIdentity(context, state) {
    state.knowledgeBase ??= {};
    const chatId = context.getCurrentChatId?.() || context.chatId || '';
    const fallback = [
        state.campaign?.startYear,
        state.character?.identity?.name,
        state.campaign?.presetId,
    ].filter(Boolean).join('-');
    state.knowledgeBase.timelineId ||= normalizeId(chatId || fallback || `timeline-${Date.now()}`);
    state.knowledgeBase.vectorSource = VECTOR_SOURCE;
    state.knowledgeBase.categories ??= {};
    return state.knowledgeBase.timelineId;
}

function resolveKnowledgeBaseIdentity(
    context,
    state,
) {
    const chatId =
        context.getCurrentChatId?.() ||
        context.chatId ||
        '';
    const fallback = [
        state.campaign?.startYear,
        state.character?.identity?.name,
        state.campaign?.presetId,
        state.timelineEpoch,
    ].filter(Boolean).join('-');
    return normalizeId(
        state.knowledgeBase?.timelineId ||
        chatId ||
        fallback ||
        'timeline',
    );
}

export function buildKnowledgeRecords(state, chat = []) {
    const records = [];
    const activeActorIds =
        getActiveInteractionActorIds(
            state,
        );
    for (const actor of state.actorLibrary || []) {
        const core =
            projectActorCore(actor);
        const indexedCore = {
            id: core.id,
            canonCatalogId:
                core.canonCatalogId,
            nameEn: core.nameEn,
            aliases: core.aliases,
            roleEn: core.roleEn,
            publicProfile:
                core.publicProfile,
            performanceCore:
                core.performanceCore,
        };
        records.push(makeRecord(
            'actors',
            core.id,
            core.nameEn,
            [
                `Actor: ${core.nameEn}`,
                `Role: ${core.roleEn}`,
                `Public description: ${core.publicProfile.descriptionEn}`,
                `Public background: ${core.publicProfile.backgroundEn}`,
                `Temperament: ${core.performanceCore.temperamentEn}`,
                `Speech style: ${core.performanceCore.speechStyleEn}`,
                `Motives: ${core.performanceCore.motivesEn.join(' | ')}`,
                `Social strategies: ${core.performanceCore.socialStrategiesEn.join(' | ')}`,
                `Boundaries: ${core.performanceCore.boundariesEn.join(' | ')}`,
                `Vulnerabilities: ${core.performanceCore.vulnerabilitiesEn.join(' | ')}`,
            ].join('\n'),
            {
                actorCore:
                    indexedCore,
            },
            [
                core.id,
                core.canonCatalogId,
            ],
            ['actor_core'],
        ));
    }

    const archivedMessageOwners = new Map();
    for (const archivedScene of state.sceneArchive || []) {
        for (const messageId of archivedScene.messageIds || []) {
            archivedMessageOwners.set(
                messageId,
                normalizeId(archivedScene.id),
            );
        }
    }
    const sceneDescriptors = [
        ...(state.sceneArchive || []).map(scene => ({
            sceneId: normalizeId(scene.id),
            scene,
            archivedScene: scene,
            isCurrentScene: false,
        })),
        ...(state.scene ? [{
            sceneId: normalizeId(state.scene.id),
            scene: state.scene,
            archivedScene: null,
            isCurrentScene: true,
        }] : []),
    ];
    const chronicleBySceneId =
        new Map(
            (
                state.globalChronicle
                    ?.entries ||
                []
            ).map(entry => [
                normalizeId(
                    entry.sceneId,
                ),
                entry,
            ]),
        );
    for (const descriptor of sceneDescriptors) {
        const {
            sceneId,
            scene,
            archivedScene,
            isCurrentScene,
        } = descriptor;
        const currentStart = Math.max(
            0,
            Number(state.scene?.startedMessageId || 0),
        );
        const messageIds = archivedScene?.messageIds?.length
            ? archivedScene.messageIds
            : chat
                .map((message, index) => ({ message, index }))
                .filter(({ message, index }) =>
                    index >= currentStart &&
                    !archivedMessageOwners.has(index) &&
                    (
                        message.is_user ||
                        Array.isArray(
                            message.extra?.hogwartsMud?.segments,
                        )
                    ),
                )
                .map(entry => entry.index);
        const transcript = messageIds
            .map(messageId => chat[messageId])
            .filter(Boolean)
            .flatMap(message => message.is_user
                ? [`Player: ${message.mes}`]
                : (message.extra?.hogwartsMud?.segments || []).map(segment =>
                    segment.type === 'dialogue'
                        ? `${segment.actorId}: ${segment.textEn}`
                        : segment.textEn))
            .join('\n\n');
        const location = isCurrentScene
            ? state.location
            : archivedScene?.location || '';
        const mapId = isCurrentScene
            ? state.map?.activeMapId
            : archivedScene?.mapId;
        const roomId = isCurrentScene
            ? state.map?.currentLocalNodeId
            : archivedScene?.roomId;
        const activeInteractionActorIds =
            isCurrentScene
                ? activeActorIds
                : archivedScene
                    ?.activeInteractionActorIds ||
                    archivedScene
                        ?.actorIds ||
                    [];
        const localOccupantActorIds =
            isCurrentScene
                ? state.localPresence
                    ?.occupantActorIds ||
                    []
                : archivedScene
                    ?.localOccupantActorIds ||
                    archivedScene
                        ?.actorIds ||
                    [];
        const localCohortIds =
            isCurrentScene
                ? state.localPresence
                    ?.cohortIds ||
                    []
                : archivedScene
                    ?.localCohortIds ||
                    [];
        const events =
            isCurrentScene
                ? (
                    state.eventKnowledge ||
                    []
                ).filter(event =>
                    event.sceneId ===
                        sceneId)
                : archivedScene
                    ?.events ||
                    [];
        const chronicle =
            chronicleBySceneId
                .get(sceneId) ||
            null;
        const participantActorIds = [
            ...new Set(
                events.flatMap(event =>
                    event
                        .participantActorIds ||
                    []),
            ),
        ];
        const witnessActorIds = [
            ...new Set(
                events.flatMap(event =>
                    event
                        .witnessActorIds ||
                    []),
            ),
        ];
        const witnessCohortIds = [
            ...new Set(
                events.flatMap(event =>
                    event
                        .witnessCohortIds ||
                    []),
            ),
        ];
        records.push(makeRecord(
            'scenes',
            sceneId,
            scene?.nameEn || scene?.name || sceneId,
            [
                `Scene: ${scene?.nameEn || scene?.name || sceneId}`,
                `Summary: ${scene?.summaryEn || scene?.summary || ''}`,
                `Exploration hook: ${scene?.explorationHookEn || scene?.explorationHook || ''}`,
                `Closure: ${archivedScene?.closureSummaryEn || ''}`,
                `Chronicle: ${chronicle?.summaryEn || ''}`,
                `Time: ${archivedScene
                    ? `${archivedScene.startedClock || ''} to ${archivedScene.endedClock || ''}`
                    : state.scene?.startedClock || state.clock}`,
                `Location: ${location}`,
                `Current room: ${roomId || ''}`,
                `Active interaction actors: ${activeInteractionActorIds.join(', ')}`,
                `Local occupants: ${localOccupantActorIds.join(', ')}`,
                `Local cohorts: ${localCohortIds.join(', ')}`,
                `Event participants: ${participantActorIds.join(', ')}`,
                `Event witnesses: ${witnessActorIds.join(', ')}`,
                `Transcript:\n${transcript}`,
            ].join('\n'),
            {
                scene,
                archive: archivedScene || null,
                location,
                mapId,
                currentRoomId: roomId,
                messageIds,
                activeInteractionActorIds,
                localOccupantActorIds,
                localCohortIds,
                participantActorIds,
                witnessActorIds,
                witnessCohortIds,
                events,
                chronicle,
            },
            [
                sceneId,
                roomId,
                ...activeInteractionActorIds,
                ...localOccupantActorIds,
                ...localCohortIds,
                ...participantActorIds,
                ...witnessActorIds,
                ...witnessCohortIds,
            ],
            ['scene', archivedScene ? 'closed' : 'active', location],
        ));
    }

    for (
        const event
        of state.eventKnowledge || []
    ) {
        const reported =
            event.eventKind ===
                'reported';
        const sourceMessages =
            reported
                ? []
                : (
                    event
                        .sourceMessageIds ||
                    []
                )
                    .map(messageId => ({
                        messageId,
                        message:
                            chat[messageId],
                    }))
                    .filter(entry =>
                        entry.message);
        const transaction =
            sourceMessages
                .map(entry =>
                    entry.message.extra
                        ?.hogwartsMud
                        ?.turnTransaction)
                .find(Boolean) ||
            null;
        const relationshipReceiptRefs =
            (
                state.socialGraph
                    ?.relationshipEvidence ||
                []
            )
                .filter(receipt =>
                    receipt.eventId ===
                        event.eventId)
                .map(receipt => ({
                    receiptId:
                        receipt.id,
                    sourceActorId:
                        receipt
                            .sourceActorId,
                    targetActorId:
                        receipt
                            .targetActorId,
                    appraisalId:
                        receipt
                            .appraisalId,
                }));
        const socialClaimRefs = [
            ...(
                state.socialGraph
                    ?.identityClaims ||
                []
            ).filter(claim =>
                claim
                    .reportedEventId ===
                event.eventId)
                .map(claim => ({
                    claimId:
                        claim.id,
                    kind:
                        'identity',
                    subjectId:
                        claim.subjectId,
                })),
            ...(
                state.socialGraph
                    ?.relationshipClaims ||
                []
            ).filter(claim =>
                claim
                    .reportedEventId ===
                event.eventId)
                .map(claim => ({
                    claimId:
                        claim.id,
                    kind:
                        'relationship',
                    subjectId:
                        claim.subjectId,
                    targetRefId:
                        claim
                            .targetRefId,
                })),
        ];
        records.push(makeRecord(
            'events',
            event.eventId,
            event.summaryEn ||
                event.eventId,
            [
                `Clock: ${event.clock || transaction?.committedClock || state.clock}`,
                `${reported ? 'Reported communication' : 'Event'}: ${event.summaryEn || ''}`,
                `Speaker: ${reported ? event.report?.speakerId || '' : ''}`,
                `Recipients: ${reported ? (event.report?.recipientIds || []).join(', ') : ''}`,
                `Subjects: ${reported ? (event.report?.subjectIds || []).join(', ') : ''}`,
                `Participants: ${(event.participantActorIds || []).join(', ')}`,
                `Witnesses: ${(event.witnessActorIds || []).join(', ')}`,
                `Witness cohorts: ${(event.witnessCohortIds || []).join(', ')}`,
                ...(
                    reported
                        ? []
                        : [
                            `Transcript: ${sourceMessages.flatMap(entry =>
                                entry.message.is_user
                                    ? [entry.message.mes]
                                    : (
                                        entry.message.extra
                                            ?.hogwartsMud
                                            ?.segments ||
                                        []
                                    ).map(segment =>
                                        segment.textEn)).filter(Boolean).join(' | ')}`,
                        ]
                ),
            ].join('\n'),
            {
                eventKnowledge:
                    reported
                        ? {
                            version:
                                event.version,
                            eventKind:
                                event.eventKind,
                            eventId:
                                event.eventId,
                            sceneId:
                                event.sceneId,
                            clock:
                                event.clock,
                            summaryEn:
                                event.summaryEn,
                            participantActorIds:
                                event
                                    .participantActorIds,
                            witnessActorIds:
                                event
                                    .witnessActorIds,
                            witnessCohortIds:
                                event
                                    .witnessCohortIds,
                            witnessBasis:
                                event
                                    .witnessBasis,
                            knownToPlayer:
                                event
                                    .knownToPlayer,
                            source:
                                event.source,
                            report: {
                                statementKind:
                                    event.report
                                        ?.statementKind,
                                speakerId:
                                    event.report
                                        ?.speakerId,
                                recipientIds:
                                    event.report
                                        ?.recipientIds ||
                                    [],
                                subjectIds:
                                    event.report
                                        ?.subjectIds ||
                                    [],
                                distortionLevel:
                                    event.report
                                        ?.distortionLevel,
                            },
                        }
                        : event,
                sourceMessageIds:
                    reported
                        ? []
                        : event
                            .sourceMessageIds ||
                            [],
                relationshipReceiptRefs,
                socialClaimRefs,
                transaction,
            },
            [
                event.sceneId,
                ...(
                    event
                        .participantActorIds ||
                    []
                ),
                ...(
                    event
                        .witnessActorIds ||
                    []
                ),
                ...(
                    event
                        .witnessCohortIds ||
                    []
                ),
                ...(
                    event.report
                        ?.subjectIds ||
                    []
                ),
            ],
            [
                'event',
                event.sceneId,
                event.eventKind,
                event.perception
                    ?.salience,
            ],
        ));
    }

    for (const collapse of (
        state.causalCollapse
            ?.records ||
        []
    )) {
        records.push(makeRecord(
            'events',
            collapse.id,
            collapse.factEn,
            [
                `Effective since: ${collapse.effectiveSinceClock || ''}`,
                `Observed at: ${collapse.observedAtClock || ''}`,
                `Materialized turn: ${collapse.materializedAtTurn || ''}`,
                `Kind: ${collapse.kind}`,
                `Fact: ${collapse.factEn}`,
                `Visible residues: ${(collapse.visibleResiduesEn || []).join(' | ')}`,
                `Known by: ${(collapse.knownByActorIds || []).join(', ')}`,
                `Status: ${collapse.status || 'materialized'}`,
            ].join('\n'),
            {
                causalCollapse: collapse,
            },
            [
                collapse.sceneId,
                collapse.roomId,
                collapse.itemId,
                collapse.focusActorId,
                ...(collapse.relatedActorIds || []),
                ...(collapse.knownByActorIds || []),
            ].filter(Boolean),
            [
                'event',
                'causal_collapse',
                collapse.kind,
                collapse.status,
            ].filter(Boolean),
        ));
    }

    const discovered = new Map((state.clues || []).map(clue => [clue.id, clue]));
    for (const arc of state.storyArcs || []) {
        for (const clue of arc.cluePlan || []) {
            const publicClue = discovered.get(clue.id);
            records.push(makeRecord(
                'clues',
                clue.id,
                clue.labelEn,
                [
                    `Story arc: ${arc.id}`,
                    `Clue: ${clue.labelEn}`,
                    `Hidden fact: ${clue.hiddenFactEn}`,
                    `Player-facing discovery: ${clue.playerFacingDiscoveryEn}`,
                    `Unlock condition: ${clue.unlockConditionEn}`,
                    `Sources: ${[
                        ...(clue.sourceActorIds || []),
                        ...(clue.sourceLocationIds || []),
                        clue.sourceItemId,
                    ].filter(Boolean).join(', ')}`,
                    `Discovered: ${Boolean(publicClue)}`,
                ].join('\n'),
                { storyArcId: arc.id, plan: clue, discovered: publicClue || null },
                [
                    clue.id,
                    ...(clue.sourceActorIds || []),
                    ...(clue.sourceLocationIds || []),
                    clue.sourceItemId,
                ].filter(Boolean),
                ['clue', arc.id, publicClue ? 'discovered' : 'locked'],
            ));
        }
    }

    const appraisals =
        state.memorySynapse
            ?.appraisals ||
        state.appraisals ||
        [];
    for (const appraisal of appraisals) {
        if (
            (
                appraisal.contextTags ||
                []
            ).includes(
                'migrated_current_impression',
            )
        ) {
            continue;
        }
        records.push(makeRecord(
            'appraisals',
            appraisal.id,
            appraisal.summaryEn ||
                appraisal.id,
            [
                `Observer: ${appraisal.observerId || ''}`,
                `Target: ${appraisal.targetId || ''}`,
                `Interpretation: ${appraisal.summaryEn || ''}`,
                `Confidence: ${Number(appraisal.confidence) || 0}`,
                `Status: ${appraisal.status || 'provisional'}`,
                `Context: ${(appraisal.contextTags || []).join(', ')}`,
            ].join('\n'),
            {
                appraisal,
                sourceEventIds:
                    appraisal
                        .sourceEventIds ||
                    [],
            },
            [
                appraisal.observerId,
                appraisal.targetId,
            ].filter(Boolean),
            [
                'appraisal',
                appraisal.status,
                ...(appraisal.contextTags || []),
            ].filter(Boolean),
        ));
    }

    const schemas =
        state.memorySynapse
            ?.personSchemas ||
        state.personSchemas ||
        [];
    for (const schema of schemas) {
        records.push(makeRecord(
            'schemas',
            schema.id,
            schema.labelEn ||
                schema.id,
            [
                `Observer: ${schema.observerId || ''}`,
                `Target: ${schema.targetId || ''}`,
                `Pattern: ${schema.labelEn || ''}`,
                `Expectation: ${schema.expectationEn || ''}`,
                `Confidence: ${Number(schema.confidence) || 0}`,
                `Status: ${schema.status || 'active'}`,
                `Context: ${(schema.contextTags || []).join(', ')}`,
            ].join('\n'),
            {
                schema,
                sourceEventIds:
                    schema
                        .supportEventIds ||
                    [],
            },
            [
                schema.observerId,
                schema.targetId,
            ].filter(Boolean),
            [
                'schema',
                schema.status,
                ...(schema.contextTags || []),
            ].filter(Boolean),
        ));
    }

    return projectLegacyRecordsV2(
        records,
        state,
    );
}

function getCollectionId(timelineId, category) {
    return `hpmud_${normalizeId(timelineId)}_${category}`;
}

function getVectorText(record) {
    return VECTOR_PREFIX +
        JSON.stringify(record);
}

function parseVectorRecord(text) {
    if (!String(text || '').startsWith(VECTOR_PREFIX)) return null;
    try {
        return JSON.parse(String(text).slice(VECTOR_PREFIX.length));
    } catch {
        return null;
    }
}

async function vectorRequest(endpoint, body) {
    const response = await fetch(`/api/vector/${endpoint}`, {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ ...body, source: VECTOR_SOURCE }),
    });
    if (!response.ok) {
        throw new Error(`Vector ${endpoint} failed with ${response.status}`);
    }
    return response.status === 200 && response.headers.get('content-type')?.includes('json')
        ? response.json()
        : null;
}

async function syncVectorRecords(
    timelineId,
    records,
    removedEntries = [],
    allRecords = records,
) {
    for (const category of KNOWLEDGE_CATEGORIES) {
        let categoryRecords = records.filter(record => record.category === category);
        const allCategoryRecords =
            allRecords.filter(record =>
                record.category ===
                category);
        const collectionId = getCollectionId(timelineId, category);
        if (allCategoryRecords.length) {
            const savedHashes =
                await vectorRequest(
                    'list',
                    {
                        collectionId,
                    },
                ) || [];
            const expectedHashes =
                allCategoryRecords.map(
                    record =>
                        getStringHash(
                            `${
                                category
                            }:${
                                record.recordId
                            }`,
                        ),
                );
            if (
                expectedHashes.some(
                    hash =>
                        !savedHashes
                            .includes(hash),
                )
            ) {
                categoryRecords =
                    allCategoryRecords;
            }
        }
        const removedIds =
            removedEntries
                .filter(entry =>
                    entry?.category ===
                    category)
                .map(entry =>
                    normalizeId(
                        entry.recordId ||
                        entry.id,
                    ));
        const recordIds =
            [...new Set([
                ...categoryRecords.map(
                    record =>
                        record.recordId,
                ),
                ...removedIds,
            ])];
        if (!recordIds.length) continue;
        const hashes = recordIds.map(
            id =>
                getStringHash(
                    `${category}:${id}`,
                ),
        );
        await vectorRequest('delete', { collectionId, hashes });
        if (!categoryRecords.length) continue;
        await vectorRequest('insert', {
            collectionId,
            items: categoryRecords.map((record, index) => ({
                hash:
                    getStringHash(
                        `${
                            category
                        }:${
                            record.recordId
                        }`,
                    ),
                index,
                text: getVectorText(record),
            })),
        });
    }
}

export async function syncKnowledgeBase(context, state) {
    const timelineId = ensureKnowledgeBaseIdentity(context, state);
    const records = buildKnowledgeRecords(state, context.chat);
    const previousHashes = state.knowledgeBase.recordHashes || {};
    const nextHashes = Object.fromEntries(records.map(record => [
        record.recordId,
        record.contentChecksum,
    ]));
    const projectionFingerprint =
        computeKnowledgeProjectionFingerprint(
            records,
        );
    const changedRecords = records.filter(record => {
        return previousHashes[
            record.recordId
        ] !==
            nextHashes[
                record.recordId
            ];
    });
    const healthResponse =
        await fetch(
            '/api/hogwarts-mud/knowledge/health',
            {
                method: 'POST',
                headers:
                    getRequestHeaders(),
                body: JSON.stringify({
                    knowledgeApiContractVersion:
                        KNOWLEDGE_API_CONTRACT_VERSION,
                    timelineId,
                }),
            },
        );
    if (!healthResponse.ok) {
        throw new Error(
            `Local knowledge health check failed with ${healthResponse.status}`,
        );
    }
    const health =
        await healthResponse.json();
    assertKnowledgeApiContract(
        health,
    );
    if (
        health.exact?.ok === true &&
        health.exact
            .projectionFingerprint ===
            projectionFingerprint &&
        (
            health.preferred
                ?.configured !==
                true ||
            health.preferred?.ok ===
                true
        )
    ) {
        const metadataBefore =
            JSON.stringify(
                state.knowledgeBase,
            );
        state.knowledgeBase
            .knowledgeApiContractVersion =
            KNOWLEDGE_API_CONTRACT_VERSION;
        state.knowledgeBase
            .projectionFingerprint =
            projectionFingerprint;
        state.knowledgeBase
            .indexFormatVersion =
            Number(
                health.exact
                    .indexFormatVersion,
            ) || 0;
        state.knowledgeBase
            .projectorVersion =
            Number(
                health.exact
                    .projectorVersion,
            ) || 0;
        state.knowledgeBase
            .categories =
            Object.fromEntries(
                KNOWLEDGE_CATEGORIES
                    .map(category => [
                        category,
                        records.filter(
                            record =>
                                record.category ===
                                category,
                        ).length,
                    ]),
            );
        state.knowledgeBase
            .vectorStatus =
            'ready';
        state.knowledgeBase
            .vectorError =
            '';
        state.knowledgeBase
            .recordHashes =
            nextHashes;
        state.knowledgeBase
            .diagnostics = {
                backend:
                    health.preferred
                        ?.configured
                        ? health
                            .preferred
                            .backend
                        : health
                            .exact
                            .backend,
                preferredBackend:
                    health.preferred
                        ?.backend ||
                    'none',
                degraded: false,
                projectionFingerprint,
                syncSkipped:
                    'content_unchanged',
            };
        return {
            timelineId,
            records,
            projectionFingerprint,
            skipped: true,
            metadataChanged:
                JSON.stringify(
                    state
                        .knowledgeBase,
                ) !==
                metadataBefore,
        };
    }
    const response = await fetch('/api/hogwarts-mud/knowledge/sync', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
            knowledgeApiContractVersion:
                KNOWLEDGE_API_CONTRACT_VERSION,
            timelineId,
            timelineEpoch:
                String(
                    state.timelineEpoch ||
                    state.knowledgeBase
                        .timelineId,
                ),
            stateRevision:
                Math.max(
                    0,
                    Number(
                        state.stateRevision,
                    ) || 0,
                ),
            records,
            replace: true,
        }),
    });
    if (!response.ok) {
        throw new Error(`Local knowledge sync failed with ${response.status}`);
    }
    const result = await response.json();
    assertKnowledgeApiContract(
        result,
    );
    state.knowledgeBase.rootPath = result.root;
    state.knowledgeBase.diagnostics =
        result.diagnostics || {};
    state.knowledgeBase
        .knowledgeApiContractVersion =
        KNOWLEDGE_API_CONTRACT_VERSION;
    state.knowledgeBase
        .projectionFingerprint =
        String(
            result.diagnostics
                ?.projectionFingerprint ||
            '',
        );
    state.knowledgeBase
        .indexFormatVersion =
        Number(
            result.diagnostics
                ?.indexFormatVersion,
        ) || 0;
    state.knowledgeBase
        .projectorVersion =
        Number(
            result.diagnostics
                ?.projectorVersion,
        ) || 0;
    state.knowledgeBase.lastSyncedAt = new Date().toISOString();
    state.knowledgeBase.categories = Object.fromEntries(
        KNOWLEDGE_CATEGORIES.map(category => [
            category,
            records.filter(record => record.category === category).length,
        ]),
    );
    try {
        if (
            result.diagnostics
                ?.backend !==
                'qdrant' &&
            result.diagnostics
                ?.preferredBackend !==
                'qdrant'
        ) {
            await syncVectorRecords(
                timelineId,
                changedRecords,
                result.removed,
                records,
            );
        }
        state.knowledgeBase.vectorStatus = 'ready';
        state.knowledgeBase.vectorError = '';
        state.knowledgeBase.recordHashes = nextHashes;
    } catch (error) {
        state.knowledgeBase.vectorStatus = 'failed';
        state.knowledgeBase.vectorError = String(error?.message || error);
        console.warn('[Hogwarts MUD] Vector sync failed; local JSON remains authoritative', error);
    }
    return { timelineId, records };
}

function createSceneSafeRecord(record, includePrivateRecords) {
    if (includePrivateRecords || record.category !== 'actors') {
        return record;
    }
    const privatePrefixes = [
        'Private goal:',
        'Fear:',
        'Secret:',
        'Knowledge boundary:',
        'Current intent:',
    ];
    return {
        ...record,
        text: String(record.text || '')
            .split('\n')
            .filter(line => !privatePrefixes.some(prefix => line.startsWith(prefix)))
            .join('\n'),
        data: undefined,
    };
}

export async function retrieveKnowledge(
    context,
    state,
    query,
    entityIds = [],
    limit = 6,
    {
        includeLockedClues = false,
        audienceActorIds = ['player'],
        nodeTypes = [],
        seedRecordIds = [],
    } = {},
) {
    const timelineId =
        resolveKnowledgeBaseIdentity(
            context,
            state,
        );
    const timelineEpoch =
        String(
            state.timelineEpoch ||
            timelineId,
        );
    const stateRevision =
        Math.max(
            0,
            Number(
                state.stateRevision,
            ) || 0,
        );
    const audience = {
        actorIds:
            audienceActorIds,
        includeLocked:
            includeLockedClues,
        role:
            includeLockedClues
                ? 'author'
                : 'player',
    };
    const filters = {
        timelineEpoch,
        stateRevision,
        audience,
        clock: state.clock || '',
        nodeTypes,
        supersededSourceRefs:
            state.authoritySnapshot
                ?.supersededSourceRefs ||
            state.supersededSourceRefs ||
            [],
    };
    const exactResponse = await fetch('/api/hogwarts-mud/knowledge/search', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
            knowledgeApiContractVersion:
                KNOWLEDGE_API_CONTRACT_VERSION,
            timelineId,
            timelineEpoch,
            stateRevision,
            query,
            entityIds,
            categories: KNOWLEDGE_CATEGORIES,
            limit,
            audience,
            clock: filters.clock,
            nodeTypes,
            supersededSourceRefs:
                filters
                    .supersededSourceRefs,
        }),
    });
    if (!exactResponse.ok) {
        throw new Error(
            `Local knowledge search failed with ${exactResponse.status}`,
        );
    }
    const exactResult =
        await exactResponse.json();
    assertKnowledgeApiContract(
        exactResult,
    );
    const canExpose = record =>
        record &&
        record.timelineEpoch ===
            timelineEpoch &&
        Number(
            record.stateRevision,
        ) <=
            stateRevision &&
        isKnowledgeRecordVisible(
            record,
            audience,
        ) &&
        (
            includeLockedClues ||
            record.category !==
                'clues' ||
            record.tags?.includes(
                'discovered',
            )
        );
    const exactRecords =
        exactResult.records || [];
    let semanticRecords = [];
    if (
        exactResult.diagnostics
            ?.backend !== 'qdrant' &&
        exactResult.diagnostics
            ?.preferredBackend !==
            'qdrant'
    ) {
        try {
            const results = await vectorRequest('query-multi', {
                collectionIds: KNOWLEDGE_CATEGORIES.map(category => getCollectionId(timelineId, category)),
                searchText: query,
                topK: limit,
                threshold: 0.2,
            }) || {};
            semanticRecords = Object.values(results)
                .flatMap(result => result.metadata || [])
                .map(metadata => parseVectorRecord(metadata.text))
                .filter(canExpose);
        } catch (error) {
            console.warn('[Hogwarts MUD] Semantic retrieval failed; using exact local retrieval', error);
        }
    }
    const merged = new Map();
    [...exactRecords.filter(canExpose), ...semanticRecords].forEach(record => {
        const key =
            record.recordId;
        if (!merged.has(key)) {
            merged.set(key, createSceneSafeRecord(record, includeLockedClues));
        }
    });
    const hydration =
        hydrateCanonicalKnowledgeCandidates({
            candidateRecords:
                [...merged.values()],
            seedRecordIds,
            canonicalRecords:
                buildKnowledgeRecords(
                    state,
                    context.chat ||
                    [],
                ),
            filters,
        });
    const records =
        hydration.records
            .slice(0, limit)
            .map(record => {
                const superseded =
                    record.tags?.includes(
                        'superseded',
                    );
                return {
                    ...record,
                    evidenceType:
                        'HISTORICAL_EVIDENCE',
                    evidenceStatus:
                        superseded
                            ? 'SUPERSEDED'
                            : 'HISTORICAL',
                };
            });
    records.diagnostics = {
        ...(
            exactResult
                .diagnostics ||
            {}
        ),
        hydrationSuppressed: [
            ...(
                exactResult
                    .diagnostics
                    ?.hydrationSuppressed ||
                []
            ),
            ...(
                hydration
                    .diagnostics
                    ?.suppressed ||
                []
            ),
        ],
    };
    return records;
}

export function formatRetrievedKnowledge(
    records,
    maxCharacters = 8_000,
) {
    if (!records?.length) return 'No relevant local records were retrieved.';
    const sections = [];
    let remaining = Math.max(1_000, Number(maxCharacters) || 8_000);
    for (const record of records) {
        const superseded =
            record.evidenceStatus ===
                'SUPERSEDED' ||
            record.tags?.includes(
                'superseded',
            );
        const sourceRefs =
            (record.sourceRefs || [])
                .map(reference => {
                    const type =
                        String(
                            reference?.type ||
                            '',
                        ).trim();
                    const id =
                        String(
                            reference?.id ||
                            '',
                        ).trim();
                    return type && id
                        ? `${type}:${id}`
                        : '';
                })
                .filter(Boolean)
                .join(',');
        const evidenceStatus =
            superseded
                ? 'status=superseded'
                : 'status=historical';
        const header =
            `[HISTORICAL_EVIDENCE${
                superseded
                    ? ' SUPERSEDED'
                    : ''
            } ${evidenceStatus} recordId=${
                record.recordId ||
                record.id ||
                'unknown'
            } sourceRefs=${
                sourceRefs ||
                'none'
            }] ${record.title}\n`;
        const allowance = Math.min(3_000, remaining - header.length);
        if (allowance < 200) break;
        const text = String(record.text || '');
        const body = text.length <= allowance
            ? text
            : [
                text.slice(0, Math.floor(allowance * 0.55)),
                '\n...[local record truncated]...\n',
                text.slice(-Math.floor(allowance * 0.35)),
            ].join('');
        const section = header + body;
        sections.push(section);
        remaining -= section.length + 7;
        if (remaining < 200) break;
    }
    return sections.join('\n\n---\n\n');
}
