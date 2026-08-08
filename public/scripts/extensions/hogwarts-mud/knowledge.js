import { getRequestHeaders } from '/script.js';
import { getStringHash } from '/scripts/utils.js';
import {
    buildActorAppearanceView,
    buildSocialAudienceProjection,
    getActiveInteractionActorIds,
    normalizeActorMemoryProfile,
} from './helpers.js';

export const KNOWLEDGE_CATEGORIES = Object.freeze(['actors', 'scenes', 'events', 'clues']);
const VECTOR_SOURCE = 'transformers';
const VECTOR_PREFIX = 'HPMUD_KB_RECORD ';

function normalizeId(value, fallback = 'unknown') {
    const normalized = String(value || '')
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '_')
        .replace(/^[_\-.]+|[_\-.]+$/g, '')
        .slice(0, 96);
    return normalized || fallback;
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
        updatedAt: new Date().toISOString(),
    };
}

function formatSocialRelationship(edge) {
    const dimensions = [
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
    ].map(dimension =>
        `${dimension} ${Number(edge[dimension] || 0)}`);
    const labels =
        (edge.labels || []).join(', ');
    const emotions =
        (edge.activeEmotions || [])
            .map(emotion =>
                `${emotion.emotion} ${emotion.intensity}`)
            .join(', ');
    const latestEvidence =
        edge.latestEvidence?.summaryEn ||
        edge.latestEvidence?.summary ||
        '';
    return [
        `${edge.sourceActorId}->${edge.targetActorId}`,
        labels && `labels ${labels}`,
        dimensions.join(', '),
        emotions && `active emotions ${emotions}`,
        latestEvidence &&
            `latest evidence ${latestEvidence}`,
    ].filter(Boolean).join(': ');
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

export function buildKnowledgeRecords(state, chat = []) {
    const records = [];
    const playerSocialProjection =
        buildSocialAudienceProjection(
            state,
            'player',
        );
    const activeActorIds =
        getActiveInteractionActorIds(
            state,
        );
    const activeActorIdSet =
        new Set(activeActorIds);
    for (const actor of state.actorLibrary || []) {
        const current = (state.actors || []).find(item => item.id === actor.id);
        const normalizedActor =
            normalizeActorMemoryProfile(
                actor,
                current,
            );
        const memories =
            normalizedActor.sharedMemories;
        const memoryLine = tier => (memories[tier] || [])
            .map(memory =>
                memory.summaryEn || memory.summary)
            .filter(Boolean)
            .join(' | ');
        const socialStatements =
            playerSocialProjection
                .statements
                .filter(statement =>
                    statement.subjectId ===
                    actor.id)
                .map(statement =>
                    `${
                        statement.category ||
                        'statement'
                    }: ${
                        statement.textEn ||
                        statement.text
                    }`)
                .filter(Boolean)
                .join(' | ');
        const actorSocialRelationships =
            playerSocialProjection
                .relationships
                .filter(edge =>
                    edge.sourceActorId ===
                        actor.id ||
                    edge.targetActorId ===
                        actor.id);
        const socialRelationships =
            actorSocialRelationships
                .map(formatSocialRelationship)
                .join(' | ');
        const appearance =
            buildActorAppearanceView(
                state,
                actor.id,
            );
        const currentPresentation = [
            appearance.presentation.outfit
                ? `outfit: ${appearance.presentation.outfit}`
                : '',
            appearance.presentation
                .accessories.length
                ? `accessories: ${appearance.presentation.accessories.join(', ')}`
                : '',
            appearance.presentation.hair
                ? `hair: ${appearance.presentation.hair}`
                : '',
            appearance.presentation
                .visibleConditions.length
                ? `visible conditions: ${appearance.presentation.visibleConditions.join(', ')}`
                : '',
            appearance.presentation
                .heldItems.length
                ? `held items: ${appearance.presentation.heldItems
                    .map(entry =>
                        `${entry.hand}: ${entry.item}`)
                    .join(', ')}`
                : '',
        ].filter(Boolean).join(' | ');
        records.push(makeRecord(
            'actors',
            actor.id,
            actor.nameEn || actor.name,
            [
                `Actor: ${actor.nameEn || actor.name}`,
                `Role: ${actor.roleEn || actor.role}`,
                `Relationship to player: ${actor.relationshipToPlayerEn || actor.relationshipToPlayer}`,
                `Current impression of player: ${actor.impressionOfPlayerEn || actor.impressionOfPlayer || ''}`,
                `Core shared memories: ${memoryLine('core')}`,
                `Recent shared events: ${memoryLine('recent')}`,
                `Everyday shared moments: ${memoryLine('everyday')}`,
                `Source-grounded background statements: ${socialStatements}`,
                `Known social relationships: ${socialRelationships}`,
                `Physical description: ${appearance.physicalDescriptionEn || appearance.physicalDescription}`,
                `Current presentation: ${currentPresentation}`,
                `Public background: ${actor.publicBackgroundEn || actor.publicBackground}`,
                `Personality: ${actor.personalityEn || actor.personality}`,
                `Speech style: ${actor.speechStyleEn || actor.speechStyle}`,
                `Private goal: ${actor.privateGoalEn || ''}`,
                `Fear: ${actor.fearEn || ''}`,
                `Secret: ${actor.secretEn || ''}`,
                `Knowledge boundary: ${(normalizedActor.knowledgeEn || []).join(' | ')}`,
                `Current map: ${current?.mapId || ''}`,
                `Current room: ${current?.roomId || ''}`,
                `Current activity: ${current?.currentActivityEn || current?.currentActivity || ''}`,
                `Current intent: ${current?.currentIntentEn || current?.currentIntent || ''}`,
            ].join('\n'),
            {
                profile: {
                    ...normalizedActor,
                    socialStatements:
                        playerSocialProjection
                            .statements
                            .filter(statement =>
                                statement.subjectId ===
                                actor.id),
                    socialRelationships:
                        actorSocialRelationships,
                },
                currentState:
                    current || null,
                currentPresentation:
                    appearance.presentation,
            },
            [
                actor.id,
                current?.roomId,
                ...(
                    activeActorIdSet
                        .has(actor.id)
                        ? [state.scene?.id]
                        : []
                ),
            ],
            [
                'actor',
                activeActorIdSet
                    .has(actor.id)
                    ? 'active'
                    : 'offstage',
            ],
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
            .join('\n\n')
            .slice(-24_000);
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
        const sourceMessages =
            (
                event.sourceMessageIds ||
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
        records.push(makeRecord(
            'events',
            event.eventId,
            event.summaryEn ||
                event.eventId,
            [
                `Clock: ${transaction?.committedClock || state.timeline?.at(-1)?.clock || state.clock}`,
                `Event: ${event.summaryEn || ''}`,
                `Participants: ${(event.participantActorIds || []).join(', ')}`,
                `Witnesses: ${(event.witnessActorIds || []).join(', ')}`,
                `Witness cohorts: ${(event.witnessCohortIds || []).join(', ')}`,
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
            ].join('\n'),
            {
                eventKnowledge: event,
                sourceMessageIds:
                    event.sourceMessageIds ||
                    [],
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
            ],
            [
                'event',
                event.sceneId,
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

    return records.filter(record => record.text);
}

function getCollectionId(timelineId, category) {
    return `hpmud_${normalizeId(timelineId)}_${category}`;
}

function getVectorText(record) {
    return VECTOR_PREFIX + JSON.stringify({
        category: record.category,
        id: record.id,
        title: record.title,
        entityIds: record.entityIds,
        tags: record.tags,
        text: record.text,
    });
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
) {
    for (const category of KNOWLEDGE_CATEGORIES) {
        const categoryRecords = records.filter(record => record.category === category);
        const removedIds =
            removedEntries
                .filter(entry =>
                    entry?.category ===
                    category)
                .map(entry =>
                    normalizeId(
                        entry.id,
                    ));
        const recordIds =
            [...new Set([
                ...categoryRecords.map(
                    record => record.id,
                ),
                ...removedIds,
            ])];
        if (!recordIds.length) continue;
        const collectionId = getCollectionId(timelineId, category);
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
                hash: hashes[index],
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
        `${record.category}:${record.id}`,
        getStringHash(getVectorText(record)),
    ]));
    const changedRecords = records.filter(record => {
        const key = `${record.category}:${record.id}`;
        return previousHashes[key] !== nextHashes[key];
    });
    const response = await fetch('/api/hogwarts-mud/knowledge/sync', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
            timelineId,
            records,
            replace: true,
        }),
    });
    if (!response.ok) {
        throw new Error(`Local knowledge sync failed with ${response.status}`);
    }
    const result = await response.json();
    state.knowledgeBase.rootPath = result.root;
    state.knowledgeBase.lastSyncedAt = new Date().toISOString();
    state.knowledgeBase.categories = Object.fromEntries(
        KNOWLEDGE_CATEGORIES.map(category => [
            category,
            records.filter(record => record.category === category).length,
        ]),
    );
    try {
        await syncVectorRecords(
            timelineId,
            changedRecords,
            result.removed,
        );
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
    { includeLockedClues = false } = {},
) {
    const timelineId = ensureKnowledgeBaseIdentity(context, state);
    const exactResponse = await fetch('/api/hogwarts-mud/knowledge/search', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
            timelineId,
            query,
            entityIds,
            categories: KNOWLEDGE_CATEGORIES,
            limit,
        }),
    });
    const canExpose = record => includeLockedClues ||
        record.category !== 'clues' ||
        record.tags?.includes('discovered');
    const exactRecords = exactResponse.ok
        ? (await exactResponse.json()).records || []
        : [];
    let semanticRecords = [];
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
            .filter(record => record && canExpose(record));
    } catch (error) {
        console.warn('[Hogwarts MUD] Semantic retrieval failed; using exact local retrieval', error);
    }
    const merged = new Map();
    [...exactRecords.filter(canExpose), ...semanticRecords].forEach(record => {
        const key = `${record.category}:${record.id}`;
        if (!merged.has(key)) {
            merged.set(key, createSceneSafeRecord(record, includeLockedClues));
        }
    });
    return [...merged.values()].slice(0, limit);
}

export function formatRetrievedKnowledge(
    records,
    maxCharacters = 8_000,
) {
    if (!records?.length) return 'No relevant local records were retrieved.';
    const sections = [];
    let remaining = Math.max(1_000, Number(maxCharacters) || 8_000);
    for (const record of records) {
        const header =
            `[${record.category}/${record.id}] ${record.title}\n`;
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
