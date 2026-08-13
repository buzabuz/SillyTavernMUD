// Extracted from the helpers compatibility facade for Task 4.

import {
    countTextWords,
    FIRST_IMPRESSION_MAX_WORDS,
    IMPRESSION_MAX_WORDS,
    isValidFirstImpression,
    isValidImpressionShorthand,
} from './actor-memory.js';

import {
    CROWDED_SCENE_ROOM_KINDS,
} from './cast.js';

import {
    ACTOR_LIFE_STATUS_VALUES,
} from './inventory.js';

import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';

import {
    validateNarrationConsistency,
} from './narrative-authority.js';
import {
    validateHistoricalClaimProvenance,
} from './narrative-memory-provenance.js';

import {
    createFallbackNextSceneIntent,
    findSceneDestination,
    formatSceneLocationId,
    validateNextSceneIntent,
    validateSceneDestinationGrounding,
} from './scene-destination.js';

import {
    normalizeMemoryId,
} from './stable-identity.js';

import {
    advanceWorldClock,
    getWorldClockGapMinutes,
    WORLD_CLOCK_PATTERN,
    worldClockToEpochMinutes,
} from './time-environment.js';

import {
    normalizeTransitionWorldChanges,
    validateTransitionWorldChanges,
} from './world-changes.js';

const TRANSITION_MEMORY_BOILERPLATE_PATTERN =
    /(?:^During the closed scene,|This experience materially shaped the actor['’]s view of the player\.$)/u;

const SCENE_OPENING_UNCOMMITTED_FACT_RULES = [
    {
        label: '未提交承诺',
        pattern:
            /(?:\bpromise(?:s|d)?\b|\b(?:swear|swears|swore|sworn|vow|vows|vowed|pledge|pledges|pledged)\b|\b(?:you\s+have|i\s+give\s+you)\s+my\s+word\b|承诺|发誓|保证)/iu,
    },
    {
        label: '隐藏事实',
        pattern:
            /(?:\bsecrets?\b|\bsecretly\b|\b(?:hidden|lost|true)\s+(?:heir|identity|lineage|parentage|legacy|truth)\b|\bthe\s+truth\s+is\b|\b(?:is|are|was|were)\s+actually\b|隐藏(?:的)?继承人|秘密|隐藏事实)/iu,
    },
    {
        label: '关系变更',
        pattern:
            /(?:\b(?:we|they|you(?:\s+two)?|you\s+and\s+i)\s+(?:are|become|became)\s+(?:now\s+)?(?:best\s+friends?|friends?|family|siblings?|sisters?|brothers?|partners?|allies|rivals?|enemies)(?:\s+now)?\b|\byou\s+are\s+my\s+(?:best\s+friend|friend|sister|brother|family|partner|ally|rival|enemy)\b|\bi\s+(?:love|trust|hate)\s+you\b|\b(?:our|their)\s+(?:friendship|relationship|alliance|rivalry)\s+(?:begins?|starts?|ends?|is\s+over)\b|(?:从现在起|从今以后).{0,24}(?:朋友|家人|姐妹|兄弟|伙伴|盟友|敌人|恋人)|(?:成为|不再是).{0,12}(?:朋友|家人|姐妹|兄弟|伙伴|盟友|敌人|恋人))/iu,
    },
    {
        label: '物品转移',
        pattern:
            /(?:\b(?:gift|loan)\s+(?:for|to)\s+(?:you|him|her|them|the\s+player|tina)\b|\b(?:theft|item\s+transfer)\b|\b(?:i|we)\s+(?:give|lend|hand|pass|return|offer)\s+(?:you|him|her|them)\b|\b(?:give|lend|hand|pass|return|offer)(?:s|ed|ing)?\s+(?:you|him|her|them|the\s+player|tina)\s+(?:my|his|her|their|the|this|that|a|an)\b|\b(?:give|lend|hand|pass|return|offer)(?:s|ed|ing)?\s+(?:my|his|her|their|the|this|that|a|an)\s+[^.!?]{0,80}\s+to\s+(?:you|him|her|them|the\s+player|tina)\b|\b(?:it(?:'s| is)|this\s+is|that\s+is|they(?:'re| are))\s+yours(?:\s+now)?\b|\b(?:belongs?\s+to\s+you\s+now|for\s+you\s+to\s+keep)\b|\b(?:take|keep|accept)\s+(?:my|this|that)\s+(?:[a-z][a-z'-]*\s+){0,3}(?:book|ring|key|wand|quill|letter|note|parchment|journal|diary|map|token|necklace|amulet|bracelet|ribbon|pendant|brooch|badge|coin|pouch|bag|box|bottle|vial|artifact|heirloom|keepsake|cloak|robe|scarf|broom|compass|photograph|photo|item|object)\b|(?:赠予|赠送|送给|交给|借给|归还给|转交).{0,40})/iu,
    },
];

function getSceneOpeningUncommittedFactRules(
    value,
) {
    const text =
        String(
            typeof value === 'string'
                ? value
                : value?.textEn ||
                    '',
        ).trim();
    if (!text) {
        return [];
    }
    return SCENE_OPENING_UNCOMMITTED_FACT_RULES
        .filter(rule =>
            rule.pattern.test(text));
}

export function filterCommittedSceneOpeningExperienceSegments(
    segments = [],
) {
    return (
        Array.isArray(segments)
            ? segments
            : []
    ).filter(segment =>
        getSceneOpeningUncommittedFactRules(
            segment,
        ).length === 0);
}

export function validateSceneOpeningExperienceSegments(
    segments = [],
) {
    const errors = [];
    (
        Array.isArray(segments)
            ? segments
            : []
    ).forEach((segment, index) => {
        getSceneOpeningUncommittedFactRules(
            segment,
        ).forEach(rule => {
            errors.push(
                `下一场景开场第 ${index + 1} 段包含${rule.label}；Scene Opening 只能描写已提交状态与安全可观察内容。`,
            );
        });
    });
    return {
        valid:
            errors.length === 0,
        errors,
    };
}

export function isValidTransitionSceneMemory(
    value,
) {
    const text = String(value || '').trim();
    const wordCount = countTextWords(text);
    return (
        wordCount >= 8 &&
        wordCount <= 32 &&
        /[.!?]["'’)]?$/u.test(text) &&
        !TRANSITION_MEMORY_BOILERPLATE_PATTERN
            .test(text)
    );
}

export function stripSyntheticSceneOpeningActorSegments(
    segments = [],
) {
    return (
        Array.isArray(segments)
            ? segments
            : []
    ).filter(segment =>
        !(
            segment?.type ===
                'narration' &&
            /^[A-Z][A-Za-z.'’-]*(?:\s+[A-Z][A-Za-z.'’-]*){1,5}\s+remains visible in the scene,\s+/u
                .test(
                    String(
                        segment.textEn ||
                        '',
                    ).trim(),
                )
        ));
}

export function normalizeSceneTransitionPackage(
    payload,
    worldState,
    options = {},
) {
    const normalized = structuredClone(payload);
    const transitionMinutes = Number(
        normalized.transitionMinutes,
    );
    normalized.transitionMinutes =
        Number.isFinite(transitionMinutes)
            ? Math.max(
                0,
                Math.round(
                    transitionMinutes,
                ),
            )
            : 0;
    normalized.nextClock =
        WORLD_CLOCK_PATTERN.test(
            String(
                normalized.nextClock || '',
            ),
        )
            ? String(
                normalized.nextClock,
            )
            : advanceWorldClock(
                worldState.clock,
                normalized.transitionMinutes,
            );
    normalized.worldChanges =
        normalizeTransitionWorldChanges(
            normalized.worldChanges,
        );
    const worldChangeGapMinutes =
        getWorldClockGapMinutes(
            worldState.clock,
            normalized.nextClock,
        );
    if (
        Number.isFinite(
            worldChangeGapMinutes,
        ) &&
        worldChangeGapMinutes <
            7 * 1440
    ) {
        normalized.worldChanges = {
            prophetBriefs: [],
            gossipUpdates: [],
        };
    }
    normalized.closureSummaryEn = String(
        normalized.closureSummaryEn ||
        worldState.scene?.summaryEn ||
        'The current scene reaches its committed conclusion.',
    ).trim();
    normalized.unresolvedThreadsEn =
        Array.isArray(
            normalized.unresolvedThreadsEn,
        )
            ? normalized
                .unresolvedThreadsEn
                .map(item =>
                    String(item || '').trim())
                .filter(Boolean)
                .slice(0, 8)
            : [];
    const profiles = new Map(
        (worldState.actorLibrary || []).map(
            profile => [
                profile.id,
                profile,
            ],
        ),
    );
    const suppliedRelationshipUpdates =
        Array.isArray(
            normalized.relationshipUpdates,
        )
            ? normalized.relationshipUpdates
            : [];
    const suppliedUpdatesById = new Map(
        suppliedRelationshipUpdates
            .filter(update =>
                profiles.has(update?.id))
            .map(update => [
                update.id,
                update,
            ]),
    );
    const suppliedMemoryCounts = new Map();
    suppliedUpdatesById.forEach(update => {
        const fingerprint = String(
            update.sceneMemoryEn || '',
        )
            .trim()
            .toLocaleLowerCase();
        if (!fingerprint) return;
        suppliedMemoryCounts.set(
            fingerprint,
            (
                suppliedMemoryCounts
                    .get(fingerprint) ||
                0
            ) + 1,
        );
    });
    normalized.relationshipUpdates =
        [...suppliedUpdatesById]
            .filter(([, supplied]) => {
                const fingerprint = String(
                    supplied.sceneMemoryEn || '',
                )
                    .trim()
                    .toLocaleLowerCase();
                return (
                    isValidTransitionSceneMemory(
                        supplied.sceneMemoryEn,
                    ) &&
                    suppliedMemoryCounts
                        .get(fingerprint) === 1
                );
            })
            .slice(0, 6)
            .map(([id, supplied]) => {
                const suppliedImpression = String(
                    supplied
                        .impressionOfPlayerEn ||
                    '',
                ).trim();
                return {
                    id,
                    impressionOfPlayerEn:
                        suppliedImpression,
                    sceneMemoryEn:
                        String(
                            supplied
                                .sceneMemoryEn,
                        ).trim(),
                };
            });
    const nextScene = normalized?.nextScene;
    if (!nextScene || typeof nextScene !== 'object') {
        return normalized;
    }
    if (
        options
            .repairUnboundDestination
    ) {
        const suppliedMap =
            getLocalMapDefinition(
                nextScene.mapId,
                worldState.map,
            );
        const suppliedRoomExists =
            getMapRooms(
                suppliedMap,
                worldState.map,
            ).some(room =>
                room.id ===
                nextScene.roomId);
        if (!suppliedRoomExists) {
            const candidate =
                findSceneDestination(
                    [
                        nextScene.roomId,
                        nextScene.nameEn,
                        nextScene.summaryEn,
                        nextScene
                            .explorationHookEn,
                        ...(
                            nextScene
                                .openingSegments ||
                            []
                        ).map(segment =>
                            segment.textEn),
                        options
                            .destinationHint,
                    ]
                        .filter(Boolean)
                        .join(' '),
                    worldState,
                );
            if (candidate) {
                nextScene.mapId =
                    candidate.mapId;
                nextScene.roomId =
                    candidate.roomId;
            }
        }
    }
    const map = getLocalMapDefinition(nextScene.mapId, worldState.map);
    const rooms = getMapRooms(map, worldState.map);
    const roomIds = new Set(rooms.map(room => room.id));
    const room = rooms.find(item =>
        item.id === nextScene.roomId);
    const usedSceneIds = new Set([
        worldState.scene?.id,
        ...(worldState.sceneArchive || [])
            .map(scene => scene.id),
    ].filter(Boolean));
    if (
        !/^[a-z][a-z0-9_]{2,79}$/.test(
            String(nextScene.id || ''),
        ) ||
        usedSceneIds.has(nextScene.id)
    ) {
        nextScene.id = normalizeMemoryId(
            `${nextScene.mapId}_${nextScene.roomId}_${Number(worldState.turn?.count || 0) + 1}`,
            'next_scene',
        );
    }
    nextScene.nameEn = String(
        nextScene.nameEn ||
        room?.nameEn ||
        formatSceneLocationId(
            nextScene.roomId,
        ) ||
        'Next Scene',
    ).trim();
    nextScene.summaryEn = String(
        nextScene.summaryEn ||
        `${nextScene.nameEn} begins with the player-visible situation ready for a response.`,
    ).trim();
    nextScene.chapterEn = String(
        nextScene.chapterEn ||
        worldState.chapter ||
        nextScene.nameEn,
    ).trim();
    nextScene.temporalFactsEn =
        Array.isArray(
            nextScene.temporalFactsEn,
        )
            ? nextScene.temporalFactsEn
                .map(item =>
                    String(item || '').trim())
                .filter(Boolean)
                .slice(0, 6)
            : [];
    const hookWords = String(
        nextScene.explorationHookEn || '',
    )
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    nextScene.explorationHookEn = (
        hookWords.length >= 6
            ? hookWords
            : [
                ...hookWords,
                'A nearby detail can be inspected or ignored.',
            ]
    )
        .slice(0, 60)
        .join(' ');
    const crowdedRoom =
        CROWDED_SCENE_ROOM_KINDS
            .has(room?.kind) ||
        [
            'public',
            'student',
            'visitor',
        ].includes(room?.access);
    const crowdDirectionWords =
        String(
            nextScene
                .crowdDirectionEn ||
            '',
        )
            .trim()
            .split(/\s+/)
            .filter(Boolean);
    nextScene.crowdDirectionEn =
        (
            crowdDirectionWords.length
                ? crowdDirectionWords
                : crowdedRoom
                    ? 'Keep the surrounding crowd alive through collective movement and one or two fleeting unnamed visual figures; give them no attributable dialogue or persistent identity.'
                        .split(/\s+/)
                    : []
        )
            .slice(0, 80)
            .join(' ');
    const projected = structuredClone(worldState);
    projected.map.activeMapId = nextScene.mapId;
    projected.map.currentLocalNodeId = nextScene.roomId;
    projected.scene = {
        ...(projected.scene || {}),
        mapId: nextScene.mapId,
        roomId: nextScene.roomId,
    };

    const validActorIds = new Set(
        (worldState.actorLibrary || [])
            .map(actor => actor.id),
    );
    const seenActorIds = new Set();
    nextScene.actorStates = (nextScene.actorStates || [])
        .filter(actor =>
            validActorIds.has(actor?.id) &&
            !seenActorIds.has(actor.id) &&
            seenActorIds.add(actor.id))
        .slice(0, 6)
        .map(actor => {
            const candidate =
                findSceneDestination(
                    actor.currentActivityEn,
                    projected,
                );
            const currentActor = (
                worldState.actors || []
            ).find(item =>
                item.id === actor.id);
            const normalizedActor = {
                id: actor.id,
                present:
                    actor.present === true,
                currentActivityEn:
                    String(
                        actor
                            .currentActivityEn ||
                        'Remaining nearby in the new scene.',
                    ).trim(),
                currentIntentEn:
                    String(
                        actor
                            .currentIntentEn ??
                        '',
                    ).trim(),
                lifeStatus:
                    ACTOR_LIFE_STATUS_VALUES
                        .includes(
                            actor.lifeStatus,
                        )
                        ? actor.lifeStatus
                        : currentActor
                            ?.lifeStatus ||
                            'alive',
                lifeStatusPermanent:
                    currentActor
                        ?.lifeStatusPermanent ===
                        true ||
                    (
                        options.tier ===
                            'high' &&
                        actor
                            .lifeStatusPermanent ===
                            true
                    ),
                lifeStatusDetailEn:
                    String(
                        actor
                            .lifeStatusDetailEn ||
                        'Alive.',
                    ).trim(),
                mapId: nextScene.mapId,
                roomId: roomIds.has(
                    actor.roomId,
                )
                    ? actor.roomId
                    : candidate?.mapId ===
                        nextScene.mapId
                        ? candidate.roomId
                        : nextScene.roomId,
            };
            const firstImpression =
                String(
                    actor
                        .firstImpressionOfPlayerEn ||
                    '',
                ).trim();
            if (firstImpression) {
                normalizedActor
                    .firstImpressionOfPlayerEn =
                    firstImpression;
            }
            const firstImpressionWords =
                String(
                    normalizedActor
                        .firstImpressionOfPlayerEn ||
                    '',
                )
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean);
            if (
                firstImpressionWords.length >
                FIRST_IMPRESSION_MAX_WORDS
            ) {
                const clipped =
                    firstImpressionWords
                        .slice(
                            0,
                            FIRST_IMPRESSION_MAX_WORDS,
                        )
                        .join(' ')
                        .replace(
                            /[,:;—-]+$/u,
                            '',
                        );
                normalizedActor
                    .firstImpressionOfPlayerEn =
                    /[.!?]$/u.test(clipped)
                        ? clipped
                        : `${clipped}.`;
            }
            if (
                worldState
                    .actorMemoryIndex
                    ?.byActorId
                    ?.[actor.id]
                    ?.firstImpressionRef
            ) {
                delete normalizedActor
                    .firstImpressionOfPlayerEn;
            }
            return normalizedActor;
        });
    nextScene.openingSegments =
        Array.isArray(
            nextScene.openingSegments,
        )
            ? nextScene.openingSegments
                .filter(segment =>
                    ['narration', 'dialogue']
                        .includes(segment?.type) &&
                    String(
                        segment?.textEn || '',
                    ).trim())
                .slice(0, 8)
            : [];
    const presentIds = new Set(
        nextScene.actorStates
            .filter(actor => actor.present)
            .map(actor => actor.id),
    );
    nextScene.openingSegments =
        nextScene.openingSegments
            .filter(segment =>
                segment.type !== 'dialogue' ||
                presentIds.has(
                    segment.actorId,
                ));
    if (!nextScene.openingSegments.some(
        segment =>
            segment.type === 'narration',
    )) {
        nextScene.openingSegments.unshift({
            type: 'narration',
            textEn:
                `${nextScene.nameEn}: ${nextScene.summaryEn}`,
        });
    }
    if (nextScene.openingSegments.length < 2) {
        nextScene.openingSegments.push({
            type: 'narration',
            textEn:
                nextScene
                    .crowdDirectionEn ||
                'The immediate surroundings remain visible and available for the player to inspect or ignore.',
        });
    }
    projected.actors = nextScene.actorStates.map(actor => ({
        ...actor,
        nameEn: (worldState.actorLibrary || []).find(item =>
            item.id === actor.id)?.nameEn || actor.id,
    }));

    const following = nextScene.followingSceneIntent || {};
    if (!validateNextSceneIntent(following, projected).valid) {
        const candidate = findSceneDestination(
            `${following.titleEn || ''} ${following.summaryEn || ''}`,
            projected,
        );
        if (candidate) {
            following.mapId = candidate.mapId;
            following.roomId = candidate.roomId;
        }
    }
    if (!validateNextSceneIntent(following, projected).valid) {
        const fallback = createFallbackNextSceneIntent(projected);
        nextScene.followingSceneIntent = {
            ...fallback,
            titleEn: String(following.titleEn || fallback.titleEn),
            summaryEn: String(following.summaryEn || fallback.summaryEn),
            triggerEn: String(following.triggerEn || fallback.triggerEn),
            tier: ['medium', 'high'].includes(following.tier)
                ? following.tier
                : fallback.tier,
        };
    } else {
        nextScene.followingSceneIntent = following;
    }
    return normalized;
}

export function validateSceneTransitionPackage(payload, worldState, options = {}) {
    const errors = [];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { valid: false, errors: ['场景切换包必须是对象。'] };
    }
    const transitionMinutes = Number(payload.transitionMinutes);
    if (
        !Number.isInteger(
            transitionMinutes,
        ) ||
        transitionMinutes < 0
    ) {
        errors.push(
            'transitionMinutes 必须是非负整数。',
        );
    }
    const nextClock = String(
        payload.nextClock || '',
    );
    const currentClockMinutes =
        worldClockToEpochMinutes(
            worldState.clock,
        );
    const nextClockMinutes =
        worldClockToEpochMinutes(
            nextClock,
        );
    if (nextClockMinutes === null) {
        errors.push(
            'nextClock 必须是有效的 YYYY-MM-DD · HH:mm 权威时间。',
        );
    } else if (
        currentClockMinutes !== null &&
        nextClockMinutes <
            currentClockMinutes +
            Math.max(
                0,
                transitionMinutes,
            )
    ) {
        errors.push(
            'nextClock 不得早于当前时间加转场耗时。',
        );
    }
    errors.push(
        ...validateTransitionWorldChanges(
            payload.worldChanges,
            worldState,
            nextClock,
            {
                allowPending:
                    options
                        .deferWorldChanges ===
                    true,
            },
        ),
    );
    if (!String(payload.closureSummaryEn || '').trim()) {
        errors.push('场景切换包缺少具体的收束摘要。');
    }
    const authorQuillEn = String(
        payload.authorQuillEn || '',
    ).trim();
    const authorQuillWords = authorQuillEn
        .split(/\s+/)
        .filter(Boolean)
        .length;
    if (authorQuillWords < 40 ||
        authorQuillWords > 500) {
        errors.push(
            '作者的羽毛笔必须是 40–500 词的具体 OOC 章节评价。',
        );
    }
    if (!Array.isArray(payload.unresolvedThreadsEn) || payload.unresolvedThreadsEn.length > 8 ||
        payload.unresolvedThreadsEn.some(item => !String(item || '').trim())) {
        errors.push('unresolvedThreadsEn 必须是至多 8 条非空文本。');
    }
    const relationshipUpdates =
        payload.relationshipUpdates;
    const relationshipActorIds = new Set(
        (worldState.actorLibrary || [])
            .map(actor => actor.id),
    );
    const updatedRelationshipIds = new Set();
    const relationshipMemoryTexts = new Set();
    if (!Array.isArray(relationshipUpdates) ||
        relationshipUpdates.length > 6) {
        errors.push(
            'relationshipUpdates 必须是至多 6 条人物关系结算。',
        );
    } else {
        relationshipUpdates.forEach(update => {
            if (
                !relationshipActorIds.has(
                    update?.id,
                ) ||
                updatedRelationshipIds.has(
                    update?.id,
                )
            ) {
                errors.push(
                    `关系结算人物 ${update?.id || '?'} 不存在或重复。`,
                );
            }
            updatedRelationshipIds.add(
                update?.id,
            );
            if (!isValidImpressionShorthand(
                update?.impressionOfPlayerEn,
            )) {
                errors.push(
                    `关系结算人物 ${update?.id || '?'} 的印象必须是非占位的 1–${IMPRESSION_MAX_WORDS} 词主观 shorthand。`,
                );
            }
            const memoryText = String(
                update?.sceneMemoryEn || '',
            ).trim();
            const memoryFingerprint =
                memoryText.toLocaleLowerCase();
            if (!isValidTransitionSceneMemory(
                memoryText,
            )) {
                errors.push(
                    `关系结算人物 ${update?.id || '?'} 的章节记忆必须是完整、具体、非模板化的 8–32 词人物视角记忆。`,
                );
            }
            if (
                memoryFingerprint &&
                relationshipMemoryTexts.has(
                    memoryFingerprint,
                )
            ) {
                errors.push(
                    `关系结算人物 ${update?.id || '?'} 复用了其他人物的相同章节记忆。`,
                );
            }
            relationshipMemoryTexts.add(
                memoryFingerprint,
            );
        });
    }

    const nextScene = payload.nextScene;
    if (!nextScene || typeof nextScene !== 'object' || Array.isArray(nextScene)) {
        return { valid: false, errors: [...errors, '场景切换包缺少 nextScene。'] };
    }
    if (!/^[a-z][a-z0-9_]{2,79}$/.test(String(nextScene.id || ''))) {
        errors.push('nextScene.id 必须是唯一的 snake_case ID。');
    }
    const usedSceneIds = new Set([
        worldState.scene?.id,
        ...(worldState.sceneArchive || []).map(scene => scene.id),
    ].filter(Boolean));
    if (usedSceneIds.has(nextScene.id)) {
        errors.push(`场景 ID ${nextScene.id} 已被使用。`);
    }
    for (const key of ['nameEn', 'summaryEn', 'chapterEn', 'mapId', 'roomId']) {
        if (!String(nextScene[key] || '').trim()) {
            errors.push(`nextScene 缺少 ${key}。`);
        }
    }
    const explorationHookEn = String(
        nextScene.explorationHookEn || '',
    ).trim();
    const explorationHookWords =
        explorationHookEn
            .split(/\s+/)
            .filter(Boolean)
            .length;
    if (
        explorationHookWords < 6 ||
        explorationHookWords > 60
    ) {
        errors.push(
            '下一场景必须包含 6–60 词的非剧透 explorationHookEn。',
        );
    }
    if (
        !Array.isArray(
            nextScene.temporalFactsEn,
        ) ||
        nextScene.temporalFactsEn.length > 6 ||
        nextScene.temporalFactsEn.some(
            item =>
                !String(item || '').trim(),
        )
    ) {
        errors.push(
            '下一场景 temporalFactsEn 必须是至多 6 条非空公开时间事实。',
        );
    }

    const map = getLocalMapDefinition(nextScene.mapId, worldState.map);
    const rooms = map ? [
        ...(map.nodes || []),
        ...(worldState.map?.generatedLocalNodes || [])
            .filter(room => room.mapId === map.id),
    ] : [];
    const room = rooms.find(item => item.id === nextScene.roomId);
    if (!map) {
        errors.push(`nextScene 引用了不存在的地图 ${nextScene.mapId || '?'}。`);
    } else if (!room) {
        errors.push(`nextScene 引用了不存在的房间 ${nextScene.roomId || '?'}。`);
    }
    if (options.expectedMapId && nextScene.mapId !== options.expectedMapId) {
        errors.push(`下一场景必须使用玩家指定的地图 ${options.expectedMapId}。`);
    }
    if (options.expectedRoomId && nextScene.roomId !== options.expectedRoomId) {
        errors.push(`下一场景必须落在玩家指定的房间 ${options.expectedRoomId}。`);
    }

    const actorIds = new Set((worldState.actorLibrary || []).map(actor => actor.id));
    const actorStates = Array.isArray(nextScene.actorStates) ? nextScene.actorStates : [];
    const stateIds = new Set();
    if (actorStates.length > 6) {
        errors.push('下一场景人物状态不能超过 6 条。');
    }
    actorStates.forEach(actor => {
        if (!actorIds.has(actor.id) || stateIds.has(actor.id)) {
            errors.push(`下一场景人物 ${actor.id || '?'} 不存在或重复。`);
        }
        stateIds.add(actor.id);
        if (typeof actor.present !== 'boolean' || !String(actor.currentActivityEn || '').trim()) {
            errors.push(`下一场景人物 ${actor.id || '?'} 缺少公开活动状态。`);
        }
        if (
            actor.present === true &&
            (
                !Object.hasOwn(
                    actor,
                    'currentIntentEn',
                ) ||
                typeof actor
                    .currentIntentEn !==
                    'string'
            )
        ) {
            errors.push(
                `下一场景人物 ${actor.id || '?'} 必须显式提交或清空 currentIntentEn。`,
            );
        }
        const currentActor =
            (worldState.actors || []).find(
                item => item.id === actor.id,
            );
        const firstImpressionRef =
            worldState
                .actorMemoryIndex
                ?.byActorId
                ?.[actor.id]
                ?.firstImpressionRef ||
            '';
        const needsFirstImpression =
            actor.present === true &&
            actor.roomId ===
                nextScene.roomId &&
            !firstImpressionRef;
        if (
            needsFirstImpression &&
            !isValidFirstImpression(
                actor
                    .firstImpressionOfPlayerEn,
            )
        ) {
            errors.push(
                `下一场景新入场人物 ${actor.id || '?'} 必须提交基于玩家可见特征的初见印象。`,
            );
        }
        if (
            actor
                .firstImpressionOfPlayerEn &&
            firstImpressionRef
        ) {
            errors.push(
                `下一场景人物 ${actor.id || '?'} 已有初见印象，不得覆盖。`,
            );
        }
        const currentLifeStatus =
            currentActor?.lifeStatus ||
            'alive';
        const nextLifeStatus =
            actor.lifeStatus;
        if (!ACTOR_LIFE_STATUS_VALUES.includes(
            nextLifeStatus,
        )) {
            errors.push(
                `下一场景人物 ${actor.id || '?'} 的 lifeStatus 无效。`,
            );
        }
        if (
            typeof actor
                .lifeStatusPermanent !==
                'boolean' ||
            !String(
                actor.lifeStatusDetailEn ||
                '',
            ).trim()
        ) {
            errors.push(
                `下一场景人物 ${actor.id || '?'} 必须明确生命状态、永久标记和公开说明。`,
            );
        }
        if (
            currentActor
                ?.lifeStatusPermanent &&
            currentLifeStatus === 'dead' &&
            nextLifeStatus !== 'dead'
        ) {
            errors.push(
                `永久死亡人物 ${actor.id || '?'} 不能恢复为其他状态。`,
            );
        }
        if (
            nextLifeStatus === 'dead' &&
            options.tier !== 'high' &&
            currentLifeStatus !== 'dead'
        ) {
            errors.push(
                `只有高端世界导演可以提交人物 ${actor.id || '?'} 的永久死亡。`,
            );
        }
        if (
            actor.lifeStatusPermanent &&
            !currentActor
                ?.lifeStatusPermanent &&
            options.tier !== 'high'
        ) {
            errors.push(
                `只有高端世界导演可以提交人物 ${actor.id || '?'} 的永久生命状态。`,
            );
        }
        if (
            ['dead', 'missing'].includes(
                nextLifeStatus,
            ) &&
            actor.present
        ) {
            errors.push(
                `死亡或失踪人物 ${actor.id || '?'} 不能标记为在场行动者。`,
            );
        }
        const actorMapId = actor.mapId || nextScene.mapId;
        if (actorMapId !== nextScene.mapId ||
            !rooms.some(room => room.id === actor.roomId)) {
            errors.push(`下一场景人物 ${actor.id || '?'} 的地图房间无效。`);
        }
    });

    const presentActorIds = new Set(
        actorStates.filter(actor => actor.present).map(actor => actor.id),
    );
    const summaryText =
        String(
            nextScene.summaryEn ||
            '',
        ).toLocaleLowerCase();
    (
        worldState.actorLibrary ||
        []
    ).forEach(profile => {
        const explicitlyNamed =
            [
                profile.nameEn,
                ...(
                    profile.aliases ||
                    []
                ),
            ]
                .filter(name =>
                    String(name || '')
                        .trim()
                        .length >= 4)
                .some(name =>
                    summaryText.includes(
                        String(name)
                            .toLocaleLowerCase(),
                    ));
        if (
            explicitlyNamed &&
            !presentActorIds.has(
                profile.id,
            )
        ) {
            errors.push(
                `下一场景摘要明确点名 ${profile.id}，该人物必须以 present:true 写入 actorStates。`,
            );
        }
    });
    const segments = Array.isArray(nextScene.openingSegments)
        ? nextScene.openingSegments
        : [];
    if (segments.length < 2 || segments.length > 8) {
        errors.push('下一场景开场必须包含 2–8 个分段。');
    }
    if (!segments.some(segment => segment.type === 'narration')) {
        errors.push('下一场景开场至少需要一个环境或动作描写分段。');
    }
    segments.forEach(segment => {
        if (!['narration', 'dialogue'].includes(segment.type) ||
            !String(segment.textEn || '').trim()) {
            errors.push('下一场景开场包含无效或空白分段。');
        }
        if (segment.type === 'dialogue' && !presentActorIds.has(segment.actorId)) {
            errors.push(`下一场景对白引用了不在场人物 ${segment.actorId || '?'}。`);
        }
    });
    const openingExperienceValidation =
        validateSceneOpeningExperienceSegments(
            segments,
        );
    errors.push(
        ...openingExperienceValidation
            .errors,
    );
    const actorActivitySegments =
        actorStates
            .filter(actor =>
                actor.present ===
                    true &&
                String(
                    actor
                        .currentActivityEn ||
                    '',
                ).trim())
            .map(actor => {
                const primaryActivityEn =
                    String(
                        actor
                            .currentActivityEn,
                    )
                        .split(
                            /[;,]/u,
                            1,
                        )[0]
                        .trim();
                return {
                    type: 'narration',
                    textEn:
                        `${actor.id} is ${primaryActivityEn}`,
                };
            });
    const narrationConsistency =
        validateNarrationConsistency(
            [
                ...segments,
                ...actorActivitySegments,
            ],
            worldState,
            {
                actors: actorStates,
                clock:
                    payload.nextClock,
                mapId:
                    nextScene.mapId,
                roomId:
                    nextScene.roomId,
            },
        );
    errors.push(
        ...narrationConsistency
            .errors,
    );
    const historicalClaimValidation =
        validateHistoricalClaimProvenance(
            segments,
            options
                .memoryActivationCapsules,
        );
    errors.push(
        ...historicalClaimValidation
            .errors,
    );
    const followingIntent = validateNextSceneIntent(
        nextScene.followingSceneIntent,
        worldState,
    );
    errors.push(...followingIntent.errors.map(error =>
        `后续${error}`));
    if (options.requireDestinationGrounding &&
        options.expectedMapId &&
        options.expectedRoomId) {
        const grounding = validateSceneDestinationGrounding(
            payload,
            worldState,
            {
                mapId: options.expectedMapId,
                roomId: options.expectedRoomId,
            },
        );
        errors.push(...grounding.errors);
    }
    return { valid: errors.length === 0, errors };
}
