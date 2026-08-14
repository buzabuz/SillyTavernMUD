// Extracted from the helpers compatibility facade for Task 4.

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
    actorContextVersion,
    actorDossierProjectionVersion,
    memoryReferenceVersion,
} from './actor-context-schema.js';

import {
    assertActorContextStateV1,
    recordActorAppraisalV1,
    upsertActorV1,
} from './actor-context-runtime.js';

import {
    getCanonicalPerformanceCore,
} from './actor-core-canon.js';

import {
    projectActorCreationCore,
    projectActorCreationRuntime,
    validateActorCreationProposal,
} from './actor-creation-proposal.js';

import {
    ACTOR_KNOWLEDGE_VERSION,
    FIRST_IMPRESSION_MAX_WORDS,
    FIRST_IMPRESSION_VERSION,
    isValidFirstImpression,
    RELATIONSHIP_MEMORY_VERSION,
} from './actor-memory.js';

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
    createInitialCalendarState,
} from './calendar-schema.js';

import {
    normalizeStoryPreferences,
} from './character.js';

import {
    createSceneItemStates,
    ENTITY_STATE_VERSION,
} from './inventory.js';
import {
    ITEM_SYSTEM_VERSION,
} from './item-schema.js';

import {
    createMandatorySceneStateProjector,
} from './mandatory-projection.js';

import {
    NPC_IDENTITY_MIGRATION_VERSION,
} from './npc-identity-migration.js';
import {
    NPC_IDENTITY_OBSERVATION_MIGRATION_VERSION,
} from './npc-identity-observation-migration.js';
import {
    normalizeNpcIdentity,
} from './npc-identity-schema.js';

import {
    createDefaultMemorySynapse,
} from './memory-synapse-schema.js';

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
    createDefaultModelTaskRuntime,
} from './model-task-runtime.js';

import {
    inferActorRoomId,
    OPENING_ID_PATTERN,
    SPATIAL_STATE_VERSION,
} from './spatial-foundation.js';

import {
    buildBehavioralEnvironment,
} from './time-environment.js';
import {
    createDefaultGlobalChronicle,
    TIMELINE_CHRONICLE_VERSION,
} from './timeline-chronicle.js';

export const buildMandatorySceneState =
    createMandatorySceneStateProjector({
        buildBehavioralEnvironment,
        buildCurrentMaterialState,
    });

function actorIdentitySource(
    actor,
) {
    if (
        actor?.identity &&
        typeof actor.identity ===
            'object'
    ) {
        return actor.identity;
    }
    const birthDate =
        String(
            actor?.birthDate || '',
        ).trim();
    const birthYearText =
        String(
            actor?.birthYear ?? '',
        ).trim();
    const birthYear =
        birthYearText
            ? Number(birthYearText)
            : null;
    return normalizeNpcIdentity({
        birth:
            /^\d{4}-\d{2}-\d{2}$/u
                .test(birthDate)
                ? {
                    date: birthDate,
                    precision: 'exact',
                }
                : Number.isInteger(
                    birthYear,
                )
                    ? {
                        year: birthYear,
                        precision: 'year',
                    }
                    : {},
    });
}

function actorCoreSource(
    actor,
    castDefaults = null,
) {
    const canonical =
        getCanonicalPerformanceCore(
            actor.id,
        );
    const originBySource = {
        canon_catalog:
            'canon_catalog',
        preset_location_resident:
            'preset_resident',
        pacing_public_guest:
            'generated_guest',
        scene_temporary_actor:
            'scene_temporary',
    };
    const cast =
        actor?.cast ||
        castDefaults ||
        (
            actor?.source ||
            actor?.introducedClock ||
            Number.isInteger(
                actor?.introducedTurn,
            )
                ? {
                    origin:
                        originBySource[
                            actor.source
                        ] ||
                        (
                            actor
                                .canonCatalogId
                                ? 'canon_catalog'
                                : 'foundation'
                        ),
                    introducedClock:
                        actor
                            .introducedClock ||
                        '',
                    introducedTurn:
                        Number.isInteger(
                            actor
                                .introducedTurn,
                        )
                            ? actor
                                .introducedTurn
                            : null,
                }
                : null
        );
    return {
        ...actor,
        ...(cast
            ? {
                cast,
            }
            : {}),
        identity:
            actorIdentitySource(actor),
        ...(canonical
            ? {
                performanceCore:
                    canonical,
            }
            : {}),
    };
}

function recordOpeningAppraisals(
    state,
    actor,
    profile,
) {
    const firstImpression =
        actor
            ?.firstImpressionOfPlayerEn ||
        profile
            ?.firstImpressionOfPlayerEn ||
        '';
    if (firstImpression) {
        recordActorAppraisalV1(
            state,
            {
                actorId: profile.id,
                summaryEn:
                    firstImpression,
                kind:
                    'first_impression',
                tier: 'recent',
                clock: state.clock,
                sceneId:
                    state.scene?.id ||
                    '',
                firstImpression:
                    true,
            },
        );
    }
}

function openingRelationshipEdge(
    actor,
) {
    const relationship =
        String(
            actor
                ?.initialRelationshipToPlayerEn ||
            '',
        )
            .normalize('NFKC')
            .toLocaleLowerCase();
    const tags = [];
    if (
        /(?:father|mother|parent|family|relative|父|母|家人|亲属)/u
            .test(relationship)
    ) {
        tags.push(
            'family',
            'parent',
        );
    } else if (
        /(?:guardian|监护)/u
            .test(relationship)
    ) {
        tags.push(
            'family',
            'guardian',
        );
    } else if (
        /(?:sibling|brother|sister|兄弟|姐妹)/u
            .test(relationship)
    ) {
        tags.push(
            'family',
            'sibling',
        );
    } else if (
        /(?:friend|朋友)/u
            .test(relationship)
    ) {
        tags.push('friend');
    }
    const familiarity =
        tags.includes('family')
            ? 70
            : tags.includes('friend')
                ? 35
                : 12;
    return {
        id:
            `relationship_${actor.id}_player`,
        sourceActorId: actor.id,
        targetActorId: 'player',
        familiarity,
        closeness:
            tags.includes('family')
                ? 45
                : tags.includes('friend')
                    ? 20
                    : 0,
        warmth:
            tags.length
                ? 20
                : 0,
        trust:
            tags.length
                ? 15
                : 0,
        respect: 0,
        influence: 0,
        tension: 0,
        resentment: 0,
        fear: 0,
        protectiveness:
            tags.includes('family')
                ? 35
                : 0,
        structuralTags: tags,
        activeEmotions: [],
        evidenceIds: [],
        knownToPlayer: true,
    };
}

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
            nodeOverrides: {},
            roomStates: {},
            exitStates: {},
            proposals: [],
        },
        actors: [],
        actorLibrary: [],
        actorMemoryIndex: {
            version:
                memoryReferenceVersion,
            byActorId: {},
        },
        memorySynapse:
            createDefaultMemorySynapse(),
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
        timelineChronicleVersion:
            TIMELINE_CHRONICLE_VERSION,
        globalChronicle:
            createDefaultGlobalChronicle(),
        turn: {
            count: 0,
            status: 'idle',
            error: '',
            lastElapsedMinutes: 0,
            lastResolvedAt: null,
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
        modelTaskRuntime:
            createDefaultModelTaskRuntime(),
        causalCollapse:
            normalizeCausalCollapseState(),
        actorContextVersion,
        memoryReferenceVersion,
        actorDossierProjectionVersion,
        relationshipMemoryVersion:
            RELATIONSHIP_MEMORY_VERSION,
        actorKnowledgeVersion:
            ACTOR_KNOWLEDGE_VERSION,
        firstImpressionVersion:
            FIRST_IMPRESSION_VERSION,
        npcIdentityVersion:
            NPC_IDENTITY_MIGRATION_VERSION,
        npcIdentityObservationVersion:
            NPC_IDENTITY_OBSERVATION_MIGRATION_VERSION,
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
        pendingSpellProposals: [],
        spellProposalDecisions: [],
        status: [
            { label: '体力', detail: '稳定' },
            { label: '压力', detail: '平静' },
        ],
    };
}

function validateOpeningStoryArc(
    storyArc,
    actorIds,
) {
    const errors = [];
    if (
        !storyArc ||
        typeof storyArc !== 'object' ||
        Array.isArray(storyArc)
    ) {
        return [
            '导演必须预写一条隐藏探索故事线。',
        ];
    }
    for (const key of [
        'id',
        'titleEn',
        'hookEn',
        'hiddenTruthEn',
        'stakesEn',
    ]) {
        if (
            !String(
                storyArc[key] || '',
            ).trim()
        ) {
            errors.push(
                `隐藏探索线缺少 ${key}。`,
            );
        }
    }
    if (
        storyArc.id &&
        !OPENING_ID_PATTERN.test(
            String(storyArc.id),
        )
    ) {
        errors.push(
            '隐藏探索线 ID 必须是 snake_case。',
        );
    }
    const involvedActorIds =
        Array.isArray(
            storyArc.involvedActorIds,
        )
            ? storyArc.involvedActorIds
            : [];
    if (
        involvedActorIds.length < 2 ||
        involvedActorIds.some(actorId =>
            !actorIds.has(actorId))
    ) {
        errors.push(
            '隐藏探索线必须引用角色库中的至少两名角色。',
        );
    }
    const cluePlan =
        Array.isArray(
            storyArc.cluePlan,
        )
            ? storyArc.cluePlan
            : [];
    if (
        cluePlan.length < 3 ||
        cluePlan.length > 8
    ) {
        errors.push(
            '隐藏探索线必须预写 3–8 个线索节点。',
        );
    }
    const clueIds = new Set();
    const clueSources = new Set();
    cluePlan.forEach(clue => {
        if (
            !OPENING_ID_PATTERN.test(
                String(clue.id || ''),
            ) ||
            clueIds.has(clue.id)
        ) {
            errors.push(
                '隐藏线索 ID 无效或重复。',
            );
        }
        clueIds.add(clue.id);
        for (const key of [
            'labelEn',
            'hiddenFactEn',
            'playerFacingDiscoveryEn',
            'unlockConditionEn',
        ]) {
            if (
                !String(
                    clue[key] || '',
                ).trim()
            ) {
                errors.push(
                    `隐藏线索 ${clue.id || '?'} 缺少 ${key}。`,
                );
            }
        }
        const sourceActorIds =
            Array.isArray(
                clue.sourceActorIds,
            )
                ? clue.sourceActorIds
                : [];
        const sourceLocationIds =
            Array.isArray(
                clue.sourceLocationIds,
            )
                ? clue.sourceLocationIds
                : [];
        if (
            !sourceActorIds.length &&
            !sourceLocationIds.length &&
            !String(
                clue.sourceItemId || '',
            ).trim()
        ) {
            errors.push(
                `隐藏线索 ${clue.id || '?'} 必须绑定人物、地点或物品来源。`,
            );
        }
        sourceActorIds.forEach(actorId => {
            clueSources.add(
                `actor:${actorId}`,
            );
            if (!actorIds.has(actorId)) {
                errors.push(
                    `隐藏线索 ${clue.id || '?'} 引用了不存在的角色。`,
                );
            }
        });
        sourceLocationIds
            .forEach(locationId =>
                clueSources.add(
                    `location:${locationId}`,
                ));
        if (clue.sourceItemId) {
            clueSources.add(
                `item:${clue.sourceItemId}`,
            );
        }
    });
    if (clueSources.size < 3) {
        errors.push(
            '隐藏探索线的线索必须分布在至少三个不同来源。',
        );
    }
    return errors;
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
    const openingRoomIds =
        new Set();
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
        rooms.forEach(room => {
            if (!OPENING_ID_PATTERN.test(String(room.id || '')) || openingRoomIds.has(room.id)) {
                errors.push('房间 ID 无效或重复。');
            }
            openingRoomIds.add(room.id);
            if (!levelIds.has(room.levelId)) errors.push(`房间 ${room.id || '?'} 引用了不存在的分区。`);
            if (!String(room.nameEn || '').trim()) errors.push(`房间 ${room.id || '?'} 缺少名称。`);
            if (!Number.isFinite(room.x) || room.x < 5 || room.x > 95 ||
                !Number.isFinite(room.y) || room.y < 5 || room.y > 95) {
                errors.push(`房间 ${room.id || '?'} 坐标必须在 5–95。`);
            }
        });
        if (!openingRoomIds.has(map.currentRoomId)) errors.push('currentRoomId 必须引用地图中的房间。');
        exits.forEach(route => {
            if (!openingRoomIds.has(route.from) || !openingRoomIds.has(route.to) || route.from === route.to) {
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
                !openingRoomIds.has(intent?.roomId)) {
                errors.push('nextSceneIntent 必须引用开场地图中的已有房间。');
            }
            if (!['medium', 'high'].includes(intent?.tier)) {
                errors.push('nextSceneIntent.tier 必须是 medium 或 high。');
            }
        }
    }

    const actorProposals =
        Array.isArray(
            opening.actorProposals,
        )
            ? opening.actorProposals
            : [];
    if (
        actorProposals.length < 3 ||
        actorProposals.length > 8
    ) {
        errors.push(
            '开场必须包含 3–8 名 Actor proposal。',
        );
    }
    const actorIds = new Set();
    let presentActorCount = 0;
    actorProposals.forEach(proposal => {
        const validation =
            validateActorCreationProposal(
                proposal,
                {
                    mode: 'opening',
                },
            );
        errors.push(
            ...validation.errors.map(error =>
                `${proposal?.id || '?'}: ${error}`),
        );
        if (actorIds.has(validation.value.id)) {
            errors.push(
                'Actor proposal ID 不能重复。',
            );
        }
        actorIds.add(validation.value.id);
        if (validation.value.runtime.present) {
            presentActorCount += 1;
            if (
                !openingRoomIds.has(
                    validation.value
                        .runtime.roomId,
                )
            ) {
                errors.push(
                    `在场人物 ${validation.value.id} 引用了不存在的开场房间。`,
                );
            }
        }
        if (
            validation.value.runtime.present &&
            !isValidFirstImpression(
                validation.value
                    .firstImpressionOfPlayerEn,
            )
        ) {
            errors.push(
                `人物 ${validation.value.id || '?'} 的初见印象必须是非占位的 1–${FIRST_IMPRESSION_MAX_WORDS} 词主观观察。`,
            );
        }
    });
    if (
        presentActorCount < 1 ||
        presentActorCount > 8
    ) {
        errors.push(
            '开场必须包含 1–8 名在场 NPC。',
        );
    }
    const playerName = String(character?.identity?.name || '').trim().toLocaleLowerCase();
    if (actorProposals.some(actor => String(actor.nameEn || '').trim().toLocaleLowerCase() === playerName)) {
        errors.push('玩家角色不能被重复列为 NPC。');
    }
    if (actorProposals.some(actor => /hogwarts world director|world narrator|storage narrator/i.test(String(actor.nameEn || '')))) {
        errors.push('后台存档叙事者不能作为在场人物。');
    }
    errors.push(
        ...validateOpeningStoryArc(
            opening.storyArc,
            actorIds,
        ),
    );
    return { valid: errors.length === 0, errors };
}

export function applyOpeningWorldPackage(worldState, opening) {
    const next = structuredClone(worldState);
    const map = opening.scene.map;
    const display = opening.display || {};
    const sceneName = display.sceneName || opening.scene.nameEn;
    const customMap = {
        id: map.id,
        worldAnchorId:
            opening.scene
                .worldAnchorId ||
            '',
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
    next.calendar ??=
        createInitialCalendarState(
            next.clock,
        );
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
        calendarEntryIds: [],
    };
    next.actorLibrary = [];
    next.actors = [];
    next.actorMemoryIndex = {
        version:
            memoryReferenceVersion,
        byActorId: {},
    };
    next.memorySynapse =
        createDefaultMemorySynapse();
    const actorProposals =
        (opening.actorProposals || [])
            .map(proposal =>
                validateActorCreationProposal(
                    proposal,
                    {
                        mode: 'opening',
                    },
                ).value);
    for (const proposal of actorProposals) {
        const actorRoomId =
            proposal.runtime.present
                ? (
                    customMap.nodes.some(
                        room =>
                            room.id ===
                            proposal.runtime
                                .roomId,
                    )
                        ? proposal.runtime
                            .roomId
                        : inferActorRoomId(
                            proposal.runtime,
                            customMap,
                            map.currentRoomId,
                        )
                )
                : '';
        const cast = {
            origin: 'foundation',
            introducedClock:
                proposal.runtime.present
                    ? opening.clock
                    : '',
            introducedTurn:
                proposal.runtime.present
                    ? Number(
                        next.turn
                            ?.count ||
                        0,
                    )
                    : null,
        };
        upsertActorV1(
            next,
            {
                actorId:
                    proposal.id,
                coreSource:
                    actorCoreSource(
                        projectActorCreationCore(
                            proposal,
                            {
                                cast,
                            },
                        ),
                        cast,
                    ),
                runtimeSource:
                    {
                        ...projectActorCreationRuntime(
                            {
                                ...proposal,
                                runtime: {
                                    ...proposal.runtime,
                                    roomId:
                                        actorRoomId,
                                },
                            },
                            {
                                mapId:
                                    proposal
                                        .runtime
                                        .present
                                        ? customMap.id
                                        : '',
                            },
                        ),
                        temporary: false,
                    },
            },
        );
        if (proposal.runtime.present) {
            recordOpeningAppraisals(
                next,
                proposal,
                proposal,
            );
        }
    }
    next.socialGraph =
        normalizeSocialGraph({
            ...next.socialGraph,
            relationships: [
                ...(
                    next.socialGraph
                        ?.relationships ||
                    []
                ),
                ...(
                    actorProposals
                )
                    .filter(proposal =>
                        proposal.runtime
                            .present)
                    .map(
                    openingRelationshipEdge,
                ),
            ],
        });
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
    next.clues = [];
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
    const openingPackage =
        structuredClone(opening);
    delete openingPackage.agenda;
    next.opening = {
        status: 'narrating',
        attempt: Number(next.opening?.attempt || 0),
        error: '',
        package: openingPackage,
        committedAt: new Date().toISOString(),
    };
    return assertActorContextStateV1(
        next,
    );
}
