// Extracted from the helpers compatibility facade for Task 4.

import {
    CANON_SETTING_TAG_VALUES,
} from '../canon-characters.js';

import {
    LOCAL_MAP_SCHEMA_VERSION,
} from '../map-pack.js';

import {
    MATERIAL_STATE_SCHEMA_VERSION,
} from '../material-schema.js';

import {
    createDefaultPresenceWitnessState,
} from '../presence-witness-contract.js';

import {
    createInitialSpellbook,
} from '../spell-catalog.js';

import {
    PRESET_WORLD_MAP,
} from '../world-data.js';

import {
    getActorKnownRumors,
} from './actor-knowledge.js';

import {
    ACTOR_KNOWLEDGE_VERSION,
    FIRST_IMPRESSION_MAX_WORDS,
    FIRST_IMPRESSION_VERSION,
    isValidFirstImpression,
    normalizeActorMemoryProfile,
    RELATIONSHIP_MEMORY_VERSION,
} from './actor-memory.js';

import {
    migrateActorPresentationState,
} from './appearance.js';

import {
    createDefaultCampaign,
    normalizeCampaign,
} from './campaign.js';

import {
    DEFAULT_CAST_POLICY,
} from './cast.js';

import {
    normalizeCausalCollapseState,
} from './causal-state.js';

import {
    normalizeStoryPreferences,
} from './character.js';

import {
    createSceneItemStates,
    ENTITY_STATE_VERSION,
    normalizeActorLifeState,
} from './inventory.js';
import {
    ITEM_SYSTEM_VERSION,
} from './item-schema.js';

import {
    createMandatorySceneStateProjector,
} from './mandatory-projection.js';

import {
    buildCurrentMaterialState,
} from './material-state.js';

import {
    createFallbackNextSceneIntent,
} from './scene-destination.js';

import {
    normalizeSocialGraph,
} from './social-migration.js';

import {
    inferActorRoomId,
    OPENING_ID_PATTERN,
    SPATIAL_STATE_VERSION,
} from './spatial-foundation.js';

import {
    buildBehavioralEnvironment,
} from './time-environment.js';

export const buildMandatorySceneState =
    createMandatorySceneStateProjector({
        buildBehavioralEnvironment,
        buildCurrentMaterialState,
        getActorKnownRumors,
        normalizeActorMemoryProfile,
    });

export function createInitialWorldState(character, modelSlots, campaign = createDefaultCampaign()) {
    const normalizedCampaign = normalizeCampaign(campaign);
    const normalizedCharacter =
        structuredClone(character);
    normalizedCharacter.identity ??= {};
    normalizedCharacter.identity
        .birthDate ||=
        `${normalizedCampaign.startYear - Number(normalizedCharacter.identity.age || 11)}-07-01`;
    normalizedCharacter.identity
        .heritage ??=
        normalizedCharacter.identity
            .ethnicity ||
        normalizedCharacter.background
            ?.ethnicity ||
        normalizedCharacter.background
            ?.culturalBackground ||
        '';
    normalizedCharacter.storyPreferences =
        normalizeStoryPreferences(
            normalizedCharacter
                .storyPreferences,
        );
    return {
        phase: 'initializing',
        campaign: normalizedCampaign,
        chapter: '正在编排首幕',
        clock: `${normalizedCampaign.startYear} · 时间待定`,
        location: '世界建档中',
        character: {
            ...normalizedCharacter,
            confirmed: true,
        },
        modelSlots: structuredClone(modelSlots),
        map: {
            baseVersion: PRESET_WORLD_MAP.version,
            localMapVersion: LOCAL_MAP_SCHEMA_VERSION,
            activeMapId: null,
            currentNodeId: null,
            currentLocalNodeId: null,
            currentLevelId: null,
            discoveredNodeIds: [],
            discoveredLocalNodeIds: [],
            generatedNodes: [],
            customLocalMaps: [],
            generatedLocalNodes: [],
            generatedLocalExits: [],
            interiorMapBindings: {},
            nodeOverrides: {},
            roomStates: {},
            exitStates: {},
            proposals: [],
        },
        actors: [],
        actorLibrary: [],
        ...createDefaultPresenceWitnessState(),
        actorPresentations: {},
        materialEventLog: [],
        materialStateVersion:
            MATERIAL_STATE_SCHEMA_VERSION,
        castPolicy: structuredClone(
            DEFAULT_CAST_POLICY,
        ),
        storyArcs: [],
        conflict: null,
        agenda: [],
        timeline: [],
        worldNews: [],
        gossipPacks: [],
        worldChangeLog: [],
        turn: {
            count: 0,
            status: 'idle',
            error: '',
            lastElapsedMinutes: 0,
            lastResolvedAt: null,
        },
        dailyDirector: {
            date: '',
            status: 'pending',
            error: '',
            plan: null,
            settledAt: null,
        },
        pacingDirector: {
            status: 'idle',
            error: '',
            lastAssessedTurn: null,
            lastAssessedSceneId: '',
            reassessAfterTurns: 6,
            assessment: null,
            pendingBeat: null,
        },
        causalCollapse:
            normalizeCausalCollapseState(),
        relationshipMemoryVersion:
            RELATIONSHIP_MEMORY_VERSION,
        actorKnowledgeVersion:
            ACTOR_KNOWLEDGE_VERSION,
        firstImpressionVersion:
            FIRST_IMPRESSION_VERSION,
        entityStateVersion:
            ENTITY_STATE_VERSION,
        memoryDirector: {
            status: 'idle',
            error: '',
            lastReviewedTurn: 0,
            triggerMode:
                'event_boundary',
            minimumReviewTurns: 10,
            pendingEventBoundary: null,
            reviewedActorIds: [],
            reviewedAt: null,
        },
        socialGraph:
            normalizeSocialGraph(),
        sceneArchive: [],
        sceneTransition: {
            status: 'idle',
            tier: 'medium',
            error: '',
            requestedAt: null,
            settledAt: null,
        },
        spatial: {
            version: SPATIAL_STATE_VERSION,
            player: {
                mapId: null,
                roomId: null,
            },
            lastMovement: null,
        },
        knowledgeBase: {
            timelineId: '',
            rootPath: '',
            vectorSource: 'transformers',
            vectorStatus: 'pending',
            vectorError: '',
            categories: {},
            lastSyncedAt: null,
        },
        directorFoundation: {
            status: 'pending',
            error: '',
            committedAt: null,
        },
        opening: {
            status: 'pending',
            attempt: 0,
            error: '',
            package: null,
            committedAt: null,
        },
        clues: [],
        checks: [],
        items: [],
        itemSystemVersion:
            ITEM_SYSTEM_VERSION,
        canonItemCatalogVersion: 0,
        pendingItemProposals: [],
        itemProposalDecisions: [],
        spellbook:
            createInitialSpellbook(
                normalizedCampaign
                    .grade,
                '',
            ),
        status: [
            { label: '体力', detail: '稳定' },
            { label: '压力', detail: '平静' },
        ],
    };
}

export function validateDirectorFoundation(foundation, presentActors = []) {
    const errors = [];
    if (!foundation || typeof foundation !== 'object' || Array.isArray(foundation)) {
        return { valid: false, errors: ['导演基础包必须是对象。'] };
    }

    const actorLibrary = Array.isArray(foundation.actorLibrary) ? foundation.actorLibrary : [];
    if (actorLibrary.length < 3 || actorLibrary.length > 24) {
        errors.push('出场角色库必须包含 3–24 名角色。');
    }
    const actorIds = new Set();
    actorLibrary.forEach(actor => {
        if (!OPENING_ID_PATTERN.test(String(actor.id || '')) || actorIds.has(actor.id)) {
            errors.push('出场角色库 ID 无效或重复。');
        }
        actorIds.add(actor.id);
        for (const key of [
            'nameEn',
            'roleEn',
            'relationshipToPlayerEn',
            'impressionOfPlayerEn',
            'publicDescriptionEn',
            'publicBackgroundEn',
            'personalityEn',
            'speechStyleEn',
            'privateGoalEn',
            'fearEn',
            'secretEn',
        ]) {
            if (!String(actor[key] || '').trim()) {
                errors.push(`角色 ${actor.id || '?'} 缺少 ${key}。`);
            }
        }
        if (!Array.isArray(actor.knowledgeEn) || actor.knowledgeEn.length < 1) {
            errors.push(`角色 ${actor.id || '?'} 必须有独立知识边界。`);
        }
        if (
            !/^\d{4}-\d{2}-\d{2}$/
                .test(
                    String(
                        actor.birthDate ||
                        '',
                    ),
                )
        ) {
            errors.push(
                `角色 ${actor.id || '?'} 必须固化出生日期。`,
            );
        }
        if (
            !Array.isArray(
                actor.settingTags,
            ) ||
            actor.settingTags.length < 2 ||
            actor.settingTags.length > 5 ||
            actor.settingTags.some(
                tag =>
                    !CANON_SETTING_TAG_VALUES
                        .includes(tag))
        ) {
            errors.push(
                `角色 ${actor.id || '?'} 必须有 2–5 个固定设定标签。`,
            );
        }
    });

    const presentIds = (presentActors || []).map(actor => actor.id).filter(Boolean);
    presentIds.forEach(actorId => {
        if (!actorIds.has(actorId)) {
            errors.push(`在场人物 ${actorId} 不存在于出场角色库。`);
        }
        const profile = actorLibrary.find(
            actor =>
                actor.id === actorId,
        );
        if (!isValidFirstImpression(
            profile
                ?.firstImpressionOfPlayerEn,
        )) {
            errors.push(
                `在场人物 ${actorId} 必须有基于玩家可见特征的初见印象。`,
            );
        }
    });

    const storyArc = foundation.storyArc;
    if (!storyArc || typeof storyArc !== 'object' || Array.isArray(storyArc)) {
        errors.push('导演必须预写一条隐藏探索故事线。');
        return { valid: false, errors };
    }
    for (const key of ['id', 'titleEn', 'hookEn', 'hiddenTruthEn', 'stakesEn']) {
        if (!String(storyArc[key] || '').trim()) {
            errors.push(`隐藏探索线缺少 ${key}。`);
        }
    }
    if (storyArc.id && !OPENING_ID_PATTERN.test(String(storyArc.id))) {
        errors.push('隐藏探索线 ID 必须是 snake_case。');
    }
    const involvedActorIds = Array.isArray(storyArc.involvedActorIds) ? storyArc.involvedActorIds : [];
    if (involvedActorIds.length < 2 || involvedActorIds.some(actorId => !actorIds.has(actorId))) {
        errors.push('隐藏探索线必须引用角色库中的至少两名角色。');
    }

    const cluePlan = Array.isArray(storyArc.cluePlan) ? storyArc.cluePlan : [];
    if (cluePlan.length < 3 || cluePlan.length > 8) {
        errors.push('隐藏探索线必须预写 3–8 个线索节点。');
    }
    const clueIds = new Set();
    const clueSources = new Set();
    cluePlan.forEach(clue => {
        if (!OPENING_ID_PATTERN.test(String(clue.id || '')) || clueIds.has(clue.id)) {
            errors.push('隐藏线索 ID 无效或重复。');
        }
        clueIds.add(clue.id);
        for (const key of ['labelEn', 'hiddenFactEn', 'playerFacingDiscoveryEn', 'unlockConditionEn']) {
            if (!String(clue[key] || '').trim()) {
                errors.push(`隐藏线索 ${clue.id || '?'} 缺少 ${key}。`);
            }
        }
        const sourceActorIds = Array.isArray(clue.sourceActorIds) ? clue.sourceActorIds : [];
        const sourceLocationIds = Array.isArray(clue.sourceLocationIds) ? clue.sourceLocationIds : [];
        if (!sourceActorIds.length && !sourceLocationIds.length && !String(clue.sourceItemId || '').trim()) {
            errors.push(`隐藏线索 ${clue.id || '?'} 必须绑定人物、地点或物品来源。`);
        }
        sourceActorIds.forEach(actorId => {
            clueSources.add(`actor:${actorId}`);
            if (!actorIds.has(actorId)) {
                errors.push(`隐藏线索 ${clue.id || '?'} 引用了不存在的角色。`);
            }
        });
        sourceLocationIds.forEach(locationId => clueSources.add(`location:${locationId}`));
        if (clue.sourceItemId) clueSources.add(`item:${clue.sourceItemId}`);
    });
    if (clueSources.size < 3) {
        errors.push('隐藏探索线的线索必须分布在至少三个不同来源。');
    }
    return { valid: errors.length === 0, errors };
}

export function validateOpeningWorldPackage(opening, character, campaign) {
    const errors = [];
    if (!opening || typeof opening !== 'object' || Array.isArray(opening)) {
        return { valid: false, errors: ['开场世界包必须是对象。'] };
    }
    const requiredText = [
        ['chapterEn', opening.chapterEn],
        ['clock', opening.clock],
        ['scene.nameEn', opening.scene?.nameEn],
        ['scene.summaryEn', opening.scene?.summaryEn],
        [
            'scene.explorationHookEn',
            opening.scene?.explorationHookEn,
        ],
        ['conflict.titleEn', opening.conflict?.titleEn],
        ['conflict.premiseEn', opening.conflict?.premiseEn],
        ['conflict.immediatePressureEn', opening.conflict?.immediatePressureEn],
        ['conflict.stakesEn', opening.conflict?.stakesEn],
        ['conflict.incitingEventEn', opening.conflict?.incitingEventEn],
        ['openingBriefEn', opening.openingBriefEn],
    ];
    requiredText.forEach(([path, value]) => {
        if (!String(value || '').trim()) errors.push(`${path} 不能为空。`);
    });
    const openingHookWords = String(
        opening.scene?.explorationHookEn || '',
    )
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;
    if (
        openingHookWords < 6 ||
        openingHookWords > 60
    ) {
        errors.push(
            'scene.explorationHookEn 必须是 6–60 词的非剧透环境钩子。',
        );
    }
    if (!/^\d{4}-\d{2}-\d{2} · \d{2}:\d{2}$/.test(String(opening.clock || ''))) {
        errors.push('clock 必须使用 YYYY-MM-DD · HH:MM。');
    } else if (!String(opening.clock).startsWith(String(normalizeCampaign(campaign).startYear))) {
        errors.push('开场年份必须与剧本年份一致。');
    }

    const map = opening.scene?.map;
    if (!map || typeof map !== 'object') {
        errors.push('scene.map 不能为空。');
    } else {
        if (!OPENING_ID_PATTERN.test(String(map.id || ''))) errors.push('scene.map.id 必须是 snake_case。');
        if (!String(map.nameEn || '').trim()) errors.push('scene.map.nameEn 不能为空。');
        const levels = Array.isArray(map.levels) ? map.levels : [];
        const rooms = Array.isArray(map.rooms) ? map.rooms : [];
        const exits = Array.isArray(map.exits) ? map.exits : [];
        if (levels.length < 1 || levels.length > 4) errors.push('家庭/开场地图必须包含 1–4 个分区。');
        if (rooms.length < 2 || rooms.length > 16) errors.push('家庭/开场地图必须包含 2–16 个房间。');
        const levelIds = new Set();
        levels.forEach(level => {
            if (!OPENING_ID_PATTERN.test(String(level.id || '')) || levelIds.has(level.id)) {
                errors.push('地图分区 ID 无效或重复。');
            }
            levelIds.add(level.id);
        });
        const roomIds = new Set();
        rooms.forEach(room => {
            if (!OPENING_ID_PATTERN.test(String(room.id || '')) || roomIds.has(room.id)) {
                errors.push('房间 ID 无效或重复。');
            }
            roomIds.add(room.id);
            if (!levelIds.has(room.levelId)) errors.push(`房间 ${room.id || '?'} 引用了不存在的分区。`);
            if (!String(room.nameEn || '').trim()) errors.push(`房间 ${room.id || '?'} 缺少名称。`);
            if (!Number.isFinite(room.x) || room.x < 5 || room.x > 95 ||
                !Number.isFinite(room.y) || room.y < 5 || room.y > 95) {
                errors.push(`房间 ${room.id || '?'} 坐标必须在 5–95。`);
            }
        });
        if (!roomIds.has(map.currentRoomId)) errors.push('currentRoomId 必须引用地图中的房间。');
        exits.forEach(route => {
            if (!roomIds.has(route.from) || !roomIds.has(route.to) || route.from === route.to) {
                errors.push('地图出口引用了不存在或相同的房间。');
            }
        });
        if (opening.nextSceneIntent !== undefined) {
            const intent = opening.nextSceneIntent;
            for (const key of ['titleEn', 'summaryEn', 'triggerEn']) {
                if (!String(intent?.[key] || '').trim()) {
                    errors.push(`nextSceneIntent 缺少 ${key}。`);
                }
            }
            if (intent?.mapId !== map.id ||
                !roomIds.has(intent?.roomId)) {
                errors.push('nextSceneIntent 必须引用开场地图中的已有房间。');
            }
            if (!['medium', 'high'].includes(intent?.tier)) {
                errors.push('nextSceneIntent.tier 必须是 medium 或 high。');
            }
        }
    }

    const actors = Array.isArray(opening.actors) ? opening.actors : [];
    if (actors.length < 1 || actors.length > 8) errors.push('开场必须包含 1–8 名在场 NPC。');
    const actorIds = new Set();
    actors.forEach(actor => {
        if (!OPENING_ID_PATTERN.test(String(actor.id || '')) || actorIds.has(actor.id)) {
            errors.push('在场人物 ID 无效或重复。');
        }
        actorIds.add(actor.id);
        for (const key of ['nameEn', 'roleEn', 'relationshipToPlayerEn', 'firstImpressionOfPlayerEn', 'impressionOfPlayerEn', 'currentActivityEn', 'currentIntentEn']) {
            if (!String(actor[key] || '').trim()) errors.push(`人物 ${actor.id || '?'} 缺少 ${key}。`);
        }
        if (!isValidFirstImpression(
            actor.firstImpressionOfPlayerEn,
        )) {
            errors.push(
                `人物 ${actor.id || '?'} 的初见印象必须是非占位的 1–${FIRST_IMPRESSION_MAX_WORDS} 词主观观察。`,
            );
        }
    });
    const playerName = String(character?.identity?.name || '').trim().toLocaleLowerCase();
    if (actors.some(actor => String(actor.nameEn || '').trim().toLocaleLowerCase() === playerName)) {
        errors.push('玩家角色不能被重复列为 NPC。');
    }
    if (actors.some(actor => /hogwarts world director|world narrator|storage narrator/i.test(String(actor.nameEn || '')))) {
        errors.push('后台存档叙事者不能作为在场人物。');
    }
    if (!Array.isArray(opening.agenda) || opening.agenda.length < 1) {
        errors.push('开场必须提供至少一项后续日程。');
    }
    const foundationValidation = validateDirectorFoundation({
        actorLibrary: opening.actorLibrary,
        storyArc: opening.storyArc,
    }, actors);
    errors.push(...foundationValidation.errors);
    return { valid: errors.length === 0, errors };
}

export function applyOpeningWorldPackage(worldState, opening) {
    const next = structuredClone(worldState);
    const map = opening.scene.map;
    const display = opening.display || {};
    const sceneName = display.sceneName || opening.scene.nameEn;
    const customMap = {
        id: map.id,
        parentWorldNodeId: opening.scene.worldAnchorId || '',
        name: display.mapName || map.nameEn,
        nameEn: map.nameEn,
        coordinateSystem: 'abstract-grid-100',
        defaultLevelId: map.currentLevelId || map.levels[0].id,
        layoutRule: 'This opening-scene map is committed world state. Changes require a validated World Director mutation.',
        levels: map.levels.map((level, index) => ({
            id: level.id,
            name: display.levelNames?.[index] || level.nameEn,
            nameEn: level.nameEn,
            z: Number(level.z || 0),
        })),
        nodes: map.rooms.map((room, index) => ({
            id: room.id,
            name: display.roomNames?.[index] || room.nameEn,
            nameEn: room.nameEn,
            levelId: room.levelId,
            kind: room.kind || 'room',
            x: room.x,
            y: room.y,
            access: room.access || 'private',
            description: room.descriptionEn || '',
            descriptionEn: room.descriptionEn || '',
            tags: ['opening_generated'],
        })),
        exits: map.exits.map(route => ({
            from: route.from,
            to: route.to,
            direction: route.direction || 'passage',
            kind: route.kind || 'door',
            minutes: Math.max(0, Number(route.minutes || 1)),
            conditions: [],
        })),
    };
    next.phase = 'opening_narration';
    next.chapter = display.chapter || opening.chapterEn;
    next.clock = opening.clock;
    next.location = sceneName;
    next.scene = {
        id: opening.scene.id || map.id,
        name: sceneName,
        nameEn: opening.scene.nameEn,
        summary: display.sceneSummary || opening.scene.summaryEn,
        summaryEn: opening.scene.summaryEn,
        explorationHook:
            display.sceneExplorationHook ||
            opening.scene.explorationHookEn,
        explorationHookEn:
            opening.scene.explorationHookEn,
        startedClock: opening.clock,
        startedMessageId: 0,
        timelineEntries: [{
            clock: opening.clock,
            label: display.incitingEvent ||
                opening.conflict.incitingEventEn,
        }],
        mapId: map.id,
        roomId: map.currentRoomId,
    };
    next.actors = opening.actors.map((actor, index) =>
        normalizeActorLifeState({
            ...actor,
            name: display.actorNames?.[index] || actor.nameEn,
            role: display.actorRoles?.[index] || actor.roleEn,
            relationshipToPlayer: display.actorRelationships?.[index] || actor.relationshipToPlayerEn,
            firstImpressionOfPlayerEn:
                actor.firstImpressionOfPlayerEn,
            firstImpressionOfPlayer:
                display.actorFirstImpressions?.[index] ||
                actor.firstImpressionOfPlayerEn,
            firstImpressionClock:
                opening.clock,
            firstImpressionTurn: 0,
            firstImpressionPending: false,
            impressionOfPlayerEn:
            actor.impressionOfPlayerEn ||
            actor.relationshipToPlayerEn,
            impressionOfPlayer:
            display.actorImpressions?.[index] ||
            actor.impressionOfPlayerEn ||
            display.actorRelationships?.[index] ||
            actor.relationshipToPlayerEn,
            impressionUpdatedClock: opening.clock,
            impressionUpdatedTurn: 0,
            currentActivity: display.actorActivities?.[index] || actor.currentActivityEn,
            currentIntent: display.actorIntents?.[index] || actor.currentIntentEn,
            mapId: customMap.id,
            roomId: customMap.nodes.some(room => room.id === actor.roomId)
                ? actor.roomId
                : inferActorRoomId(actor, customMap, map.currentRoomId),
            present: actor.present !== false,
        }));
    const openingActors = new Map(
        next.actors.map(actor => [actor.id, actor]),
    );
    next.actorLibrary = (opening.actorLibrary || []).map(actor =>
        normalizeActorMemoryProfile({
            ...actor,
            name:
                actor.display?.name ||
                actor.name ||
                actor.nameEn,
            aliases:
                actor.aliases || [],
            role: actor.display?.role || actor.roleEn,
            relationshipToPlayer:
                actor.display?.relationshipToPlayer ||
                actor.relationshipToPlayerEn,
            firstImpressionOfPlayerEn:
                actor.firstImpressionOfPlayerEn ||
                openingActors.get(actor.id)
                    ?.firstImpressionOfPlayerEn ||
                '',
            firstImpressionOfPlayer:
                actor.display?.firstImpressionOfPlayer ||
                openingActors.get(actor.id)
                    ?.firstImpressionOfPlayer ||
                '',
            firstImpressionClock:
                openingActors.has(actor.id)
                    ? opening.clock
                    : '',
            firstImpressionTurn: 0,
            firstImpressionPending:
                false,
            impressionOfPlayerEn:
                actor.impressionOfPlayerEn ||
                openingActors.get(actor.id)
                    ?.impressionOfPlayerEn ||
                actor.relationshipToPlayerEn,
            impressionOfPlayer:
                actor.display?.impressionOfPlayer ||
                openingActors.get(actor.id)
                    ?.impressionOfPlayer ||
                actor.display?.relationshipToPlayer ||
                actor.relationshipToPlayerEn,
            impressionUpdatedClock:
                openingActors.has(actor.id)
                    ? opening.clock
                    : '',
            impressionUpdatedTurn: 0,
            introducedClock:
                openingActors.has(actor.id)
                    ? opening.clock
                    : '',
            introducedTurn: 0,
            lifeStatus:
                openingActors.get(actor.id)
                    ?.lifeStatus ||
                actor.lifeStatus ||
                'alive',
            lifeStatusPermanent:
                Boolean(
                    openingActors.get(actor.id)
                        ?.lifeStatusPermanent ||
                    actor.lifeStatusPermanent,
                ),
            lifeStatusDetailEn:
                openingActors.get(actor.id)
                    ?.lifeStatusDetailEn ||
                actor.lifeStatusDetailEn ||
                'Alive.',
            lifeStatusDetail:
                openingActors.get(actor.id)
                    ?.lifeStatusDetail ||
                actor.lifeStatusDetail ||
                '存活。',
            lifeStatusSinceClock:
                openingActors.get(actor.id)
                    ?.lifeStatusSinceClock ||
                actor.lifeStatusSinceClock ||
                '',
            publicDescription:
                actor.display?.publicDescription ||
                actor.publicDescriptionEn,
            publicBackground:
                actor.display?.publicBackground ||
                actor.publicBackgroundEn,
            personality:
                actor.display?.personality ||
                actor.personalityEn,
            speechStyle:
                actor.display?.speechStyle ||
                actor.speechStyleEn,
        }, openingActors.get(actor.id)));
    next.storyArcs = opening.storyArc ? [{
        ...structuredClone(opening.storyArc),
        status: opening.storyArc.status || 'active',
        revealedClueIds: [],
    }] : [];
    next.conflict = {
        ...opening.conflict,
        title: display.conflictTitle || opening.conflict.titleEn,
        premise: display.conflictPremise || opening.conflict.premiseEn,
        immediatePressure: display.conflictPressure || opening.conflict.immediatePressureEn,
        stakes: display.conflictStakes || opening.conflict.stakesEn,
        incitingEvent: display.incitingEvent || opening.conflict.incitingEventEn,
    };
    next.agenda = (opening.agenda || []).map((item, index) => ({
        ...item,
        timeLabel: display.agendaTimes?.[index] || item.timeLabelEn,
        label: display.agendaLabels?.[index] || item.labelEn,
    }));
    next.clues = [];
    next.timeline = [{
        clock: opening.clock,
        label: display.incitingEvent || opening.conflict.incitingEventEn,
    }];
    next.items = [];
    next.map.customLocalMaps = [
        ...(next.map.customLocalMaps || []).filter(item => item.id !== customMap.id),
        customMap,
    ];
    next.map.activeMapId = customMap.id;
    next.map.currentNodeId = null;
    next.map.currentLocalNodeId = map.currentRoomId;
    next.map.currentLevelId = customMap.nodes.find(room => room.id === map.currentRoomId)?.levelId || customMap.defaultLevelId;
    next.map.discoveredLocalNodeIds = customMap.nodes.map(room => `${customMap.id}:${room.id}`);
    next.spatial = {
        version: SPATIAL_STATE_VERSION,
        player: {
            mapId: customMap.id,
            roomId: map.currentRoomId,
        },
        lastMovement: null,
    };
    next.scene.itemStates =
        createSceneItemStates(
            next.items,
            {
                mapId: customMap.id,
                roomId: map.currentRoomId,
            },
        );
    next.scene.nextSceneIntent = opening.nextSceneIntent
        ? structuredClone(opening.nextSceneIntent)
        : createFallbackNextSceneIntent(next);
    next.opening = {
        status: 'narrating',
        attempt: Number(next.opening?.attempt || 0),
        error: '',
        package: structuredClone(opening),
        committedAt: new Date().toISOString(),
    };
    next.directorFoundation = {
        status: 'ready',
        error: '',
        committedAt: new Date().toISOString(),
    };
    return migrateActorPresentationState(
        next,
    ).state;
}

export function applyDirectorFoundation(worldState, foundation) {
    const validation = validateDirectorFoundation(foundation, worldState.actors);
    if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
    }
    const next = structuredClone(worldState);
    const previousProfiles = new Map(
        (next.actorLibrary || []).map(actor => [
            actor.id,
            normalizeActorMemoryProfile(actor),
        ]),
    );
    const currentActors = new Map(
        (next.actors || []).map(actor => [actor.id, actor]),
    );
    next.actorLibrary = foundation.actorLibrary.map(actor => {
        const previous = previousProfiles.get(actor.id);
        return normalizeActorMemoryProfile({
            ...actor,
            name:
                actor.display?.name ||
                actor.name ||
                actor.nameEn,
            aliases:
                actor.aliases || [],
            role: actor.display?.role || actor.roleEn,
            relationshipToPlayer:
                actor.display?.relationshipToPlayer ||
                actor.relationshipToPlayerEn,
            firstImpressionOfPlayerEn:
                previous
                    ?.firstImpressionOfPlayerEn ||
                actor.firstImpressionOfPlayerEn ||
                '',
            firstImpressionOfPlayer:
                previous
                    ?.firstImpressionOfPlayer ||
                actor.display
                    ?.firstImpressionOfPlayer ||
                actor.firstImpressionOfPlayerEn ||
                '',
            firstImpressionClock:
                previous
                    ?.firstImpressionClock ||
                (
                    currentActors.has(actor.id)
                        ? next.clock
                        : ''
                ),
            firstImpressionTurn:
                previous
                    ?.firstImpressionTurn ||
                0,
            firstImpressionPending:
                currentActors.has(actor.id) &&
                !(
                    previous
                        ?.firstImpressionOfPlayerEn ||
                    actor
                        .firstImpressionOfPlayerEn
                ),
            impressionOfPlayerEn:
                previous?.impressionOfPlayerEn ||
                actor.impressionOfPlayerEn ||
                actor.relationshipToPlayerEn,
            impressionOfPlayer:
                previous?.impressionOfPlayer ||
                actor.display?.impressionOfPlayer ||
                actor.impressionOfPlayerEn ||
                actor.display?.relationshipToPlayer ||
                actor.relationshipToPlayerEn,
            impressionUpdatedClock:
                previous?.impressionUpdatedClock || '',
            impressionUpdatedTurn:
                previous?.impressionUpdatedTurn || 0,
            relationshipTags:
                previous?.relationshipTags,
            introducedClock:
                previous?.introducedClock ||
                (
                    currentActors.has(
                        actor.id,
                    )
                        ? next.clock
                        : ''
                ),
            introducedTurn:
                previous?.introducedTurn ||
                (
                    currentActors.has(
                        actor.id,
                    )
                        ? Number(
                            next.turn
                                ?.count || 0,
                        )
                        : null
                ),
            sharedMemories:
                previous?.sharedMemories,
            publicDescription:
                actor.display?.publicDescription ||
                actor.publicDescriptionEn,
            publicBackground:
                actor.display?.publicBackground ||
                actor.publicBackgroundEn,
            personality:
                actor.display?.personality ||
                actor.personalityEn,
            speechStyle:
                actor.display?.speechStyle ||
                actor.speechStyleEn,
        }, currentActors.get(actor.id));
    });
    next.storyArcs = [{
        ...structuredClone(foundation.storyArc),
        status: foundation.storyArc.status || 'active',
        revealedClueIds: Array.isArray(foundation.storyArc.revealedClueIds)
            ? foundation.storyArc.revealedClueIds
            : [],
    }];
    next.actors = next.actors.map(actor => {
        const profile = next.actorLibrary.find(item => item.id === actor.id);
        return profile ? {
            ...actor,
            name: profile.name,
            role: profile.role,
            relationshipToPlayer: profile.relationshipToPlayer,
            firstImpressionOfPlayerEn:
                profile
                    .firstImpressionOfPlayerEn,
            firstImpressionOfPlayer:
                profile
                    .firstImpressionOfPlayer,
            firstImpressionClock:
                profile.firstImpressionClock,
            firstImpressionTurn:
                profile.firstImpressionTurn,
            firstImpressionPending:
                profile.firstImpressionPending,
            impressionOfPlayerEn:
                profile.impressionOfPlayerEn,
            impressionOfPlayer:
                profile.impressionOfPlayer,
            impressionUpdatedClock:
                profile.impressionUpdatedClock,
            impressionUpdatedTurn:
                profile.impressionUpdatedTurn,
        } : actor;
    });
    next.clues = (next.clues || []).filter(clue => clue.discovered === true);
    next.timeline = Array.isArray(next.timeline) && next.timeline.length
        ? next.timeline
        : [{
            clock: next.clock,
            label: next.scene?.summary || next.chapter || '故事开始',
        }];
    next.directorFoundation = {
        status: 'ready',
        error: '',
        committedAt: new Date().toISOString(),
    };
    return next;
}
