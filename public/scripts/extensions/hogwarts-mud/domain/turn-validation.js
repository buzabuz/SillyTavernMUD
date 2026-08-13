// Extracted from the helpers compatibility facade for Task 4.

import {
    getSpellDefinition,
} from '../spell-catalog.js';

import {
    countTextWords,
    FIRST_IMPRESSION_MAX_WORDS,
    IMPRESSION_MAX_WORDS,
    isValidFirstImpression,
    isValidImpressionShorthand,
} from './actor-memory.js';

import {
    validateCheckResolution,
} from './checks.js';

import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';

import {
    validateItemOperation,
} from './item-reducer.js';
import {
    normalizeNpcIdentityObservation,
} from './npc-identity-observation.js';
import {
    validateNarrationConsistency,
} from './narrative-authority.js';

import {
    normalizeSpellProposal,
} from './spell-proposals.js';

import {
    findLocalRoomPath,
} from './pathfinding.js';

import {
    normalizeSpatialText,
} from './spatial-foundation.js';

import {
    buildSpatialContext,
} from './spatial-reconciliation.js';

import {
    validateActorPresenceResolution,
    validateItemUpdates,
    validateTemporaryActorEntrances,
} from './turn-authority.js';

import {
    NARRATIVE_TURN_PROTOCOL_VERSION,
} from './turn-protocol.js';

import {
    validateSceneTemporalConsistency,
} from './turn-time.js';

function projectNarrativeActorAuthority(
    payload,
    worldState,
) {
    const actorsById =
        new Map(
            (
                worldState.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    (
        payload
            .temporaryActorEntrances ||
        []
    ).forEach(actor =>
        actorsById.set(
            actor.id,
            actor,
        ));
    (
        payload.actorUpdates ||
        []
    ).forEach(update => {
        actorsById.set(
            update.id,
            {
                ...(
                    actorsById.get(
                        update.id,
                    ) ||
                    {}
                ),
                ...update,
            },
        );
    });
    const presentIds =
        Array.isArray(
            payload.actorPresence
                ?.presentActorIdsAfterTurn,
        )
            ? new Set(
                payload
                    .actorPresence
                    .presentActorIdsAfterTurn,
            )
            : null;
    return [
        ...actorsById.values(),
    ].map(actor => ({
        ...actor,
        present:
            presentIds
                ? presentIds.has(
                    actor.id,
                )
                : actor.present !==
                    false,
    }));
}

function getNarrativeMutableItemIds(
    payload,
) {
    return [
        ...(
            payload.itemUpdates ||
            []
        ).map(update =>
            update.id),
        ...(
            payload.itemOperations ||
            []
        ).map(operation =>
            operation.itemId ||
            operation.id),
    ].filter(Boolean);
}

export function validateScenePerformance(
    payload,
    worldState,
    budget,
    momentumDirective = null,
    checkResolution = null,
    movementResolution = null,
    temporalSourceText = '',
) {
    const errors = [];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { valid: false, errors: ['现场表演必须是对象。'] };
    }
    const narrativeFirst =
        Number(
            payload.protocolVersion ||
            0,
        ) >=
        NARRATIVE_TURN_PROTOCOL_VERSION;

    const temporaryValidation =
        validateTemporaryActorEntrances(
            payload
                .temporaryActorEntrances ??
            [],
            worldState,
        );
    errors.push(
        ...temporaryValidation.errors,
    );
    const temporaryActorIds = new Set(
        temporaryValidation.ids,
    );
    const presentActorIds = new Set([
        ...(
            (worldState.actors || [])
                .filter(actor => actor.present !== false)
                .map(actor => actor.id)
        ),
        ...temporaryActorIds,
    ]);
    const presentActors = new Map(
        [
            ...(worldState.actors || [])
                .filter(actor => actor.present !== false)
                .map(actor => [actor.id, actor]),
            ...(payload
                .temporaryActorEntrances ||
                [])
                .map(actor => [
                    actor.id,
                    actor,
                ]),
        ],
    );
    const publicEvent = String(payload.publicEventEn || '').trim();
    if (
        !narrativeFirst &&
        (
            !publicEvent ||
            /player completes|player acts|characters respond/i
                .test(publicEvent)
        )
    ) {
        errors.push('现场记录必须是具体事件摘要，不能使用通用占位句。');
    }
    if (
        !narrativeFirst &&
        typeof payload.eventEnded !==
        'boolean') {
        errors.push(
            '低档必须明确提交 eventEnded 布尔信号。',
        );
    }
    if (
        !narrativeFirst &&
        checkResolution &&
        payload.checkApplied !== true
    ) {
        errors.push('低档必须明确执行已提交的本地判定结果。');
    }
    if (
        !narrativeFirst &&
        !checkResolution &&
        payload.checkApplied === true
    ) {
        errors.push('没有本地判定时，低档不得声称执行了判定。');
    }

    const segments = Array.isArray(payload.segments) ? payload.segments : [];
    // 分段数量是 Prompt 质量目标，不是本地失败门槛；本地只拒绝空表演。
    if (segments.length < 1) {
        errors.push('现场表演至少要包含 1 个分段。');
    }
    segments.forEach(segment => {
        const text =
            String(
                segment.textEn || '',
            ).trim();
        const placeholderOnly =
            /^(?:[.\u2026…\-_*~\s]+|tbd|todo|placeholder|same as above)$/iu
                .test(text);
        if (!['narration', 'dialogue'].includes(segment.type) ||
            !text) {
            errors.push('现场表演包含无效或空白分段。');
        } else if (placeholderOnly) {
            errors.push(
                '现场表演分段不能只包含省略号或占位文本。',
            );
        }
        if (segment.type === 'dialogue' && !presentActorIds.has(segment.actorId)) {
            errors.push(`现场对白引用了不存在的在场角色 ${segment.actorId || '?'}。`);
        }
    });
    const narrationConsistency =
        validateNarrationConsistency(
            segments,
            worldState,
            {
                actors:
                    projectNarrativeActorAuthority(
                        payload,
                        worldState,
                    ),
                elapsedMinutes:
                    budget
                        ?.elapsedMinutes,
                mutableItemIds:
                    getNarrativeMutableItemIds(
                        payload,
                    ),
            },
        );
    errors.push(
        ...narrationConsistency
            .errors,
    );
    const temporalValidation =
        validateSceneTemporalConsistency(
            payload,
            worldState,
            budget,
            temporalSourceText,
        );
    errors.push(...temporalValidation.errors);
    const inventoryNarrative = [
        payload.publicEventEn,
        payload.sceneProgression?.summaryEn,
        ...segments.map(segment =>
            segment.textEn),
        ...(payload.actorUpdates || [])
            .flatMap(update => [
                update.memoryUpdate
                    ?.summaryEn,
                update.memoryUpdate
                    ?.lastingImpactEn,
            ]),
    ].filter(Boolean).join(' ');
    errors.push(...validateItemUpdates(
        payload.itemUpdates ?? [],
        worldState,
        temporalSourceText,
        inventoryNarrative,
        {
            requireNarrativeAcquisition:
                !narrativeFirst,
        },
    ));
    if (movementResolution?.moved) {
        const destinationMap =
            getLocalMapDefinition(
                movementResolution.toMapId,
                worldState.map,
            );
        const destinationRoom = getMapRooms(
            destinationMap,
            worldState.map,
        ).find(room =>
            room.id === movementResolution.toRoomId);
        const arrivalLabels = [
            movementResolution.toRoomNameEn,
            destinationRoom?.nameEn,
            ...(destinationRoom?.aliases || []),
            String(
                movementResolution.toRoomId || '',
            ).replace(/_/g, ' '),
        ]
            .map(normalizeSpatialText)
            .filter(label =>
                label.length >= 4 &&
                /[a-z]/i.test(label));
        const arrivalCorpus = normalizeSpatialText([
            publicEvent,
            payload.sceneProgression?.summaryEn,
            ...segments.map(segment =>
                segment.textEn),
        ].filter(Boolean).join(' '));
        if (arrivalLabels.length &&
            !arrivalLabels.some(label =>
                arrivalCorpus.includes(label))) {
            errors.push(
                `已提交移动必须在本回合明确抵达 ${movementResolution.toRoomName || movementResolution.toRoomNameEn || movementResolution.toRoomId}，不能停在途中。`,
            );
        }
    }

    if (
        momentumDirective?.required &&
        !narrativeFirst
    ) {
        const progression = payload.sceneProgression;
        const allowedProgressionTypes = new Set([
            'npc_initiative',
            'access_change',
            'practical_step',
            'new_information',
            'social_shift',
        ]);
        if (!progression ||
            typeof progression !== 'object' ||
            Array.isArray(progression)) {
            errors.push('15 分钟现场必须包含 sceneProgression。');
        } else {
            if (!allowedProgressionTypes.has(progression.type)) {
                errors.push('sceneProgression.type 无效。');
            }
            const summary = String(
                progression.summaryEn || '',
            ).trim();
            if (!summary) {
                errors.push('sceneProgression 缺少已完成的具体变化。');
            }
            const checkBlocksCompletion =
                [
                    'catastrophic_failure',
                    'failure',
                ].includes(
                    checkResolution
                        ?.outcome,
                );
            if (
                momentumDirective
                    .explicitProgressionRequest &&
                !checkBlocksCompletion &&
                progression.completedRequestedStep !== true) {
                errors.push('玩家明确要求的程序性推进没有在本回合完成。');
            }
            if (
                momentumDirective
                    .explicitProgressionRequest &&
                !checkBlocksCompletion &&
                /\b(?:prepares?|preparing|about to|ready to|waits? to|will|intends? to)\b/i.test(summary)) {
                errors.push('程序性推进停在了准备阶段，必须完成动作后再停。');
            }
        }
    }

    const actorUpdates = payload.actorUpdates === undefined
        ? []
        : payload.actorUpdates;
    if (!Array.isArray(actorUpdates)) {
        errors.push('actorUpdates 必须是数组。');
    } else {
        if (
            movementResolution?.moved &&
            !narrativeFirst
        ) {
            const updatesByActor = new Map(
                actorUpdates.map(update => [
                    update.id,
                    update,
                ]),
            );
            (movementResolution.companionIds || [])
                .forEach(actorId => {
                    const update =
                        updatesByActor.get(actorId);
                    if (
                        !update ||
                        update.mapId !==
                            movementResolution.toMapId ||
                        update.roomId !==
                            movementResolution.toRoomId ||
                        !String(
                            update.currentActivityEn || '',
                        ).trim()
                    ) {
                        errors.push(
                            `同行者 ${actorId} 必须更新到已提交目的地并刷新当前活动。`,
                        );
                    }
                });
        }
        const initialSpatialActors = new Map(
            buildSpatialContext(worldState).actors
                .map(actor => [actor.id, actor]),
        );
        const allowedUpdateKeys = new Set([
            'id',
            'present',
            'currentActivityEn',
            'mapId',
            'roomId',
            'firstImpressionOfPlayerEn',
            'impressionOfPlayerEn',
            'memoryUpdate',
        ]);
        actorUpdates.forEach(update => {
            if (!presentActorIds.has(update.id) ||
                (
                    !narrativeFirst &&
                    !String(
                        update
                            .currentActivityEn ||
                        '',
                    ).trim()
                )) {
                errors.push(`现场人物更新 ${update.id || '?'} 无效。`);
            }
            if (update.present !== undefined && typeof update.present !== 'boolean') {
                errors.push(`现场人物更新 ${update.id || '?'} 的 present 必须是布尔值。`);
            }
            if (update.mapId || update.roomId) {
                const actor = presentActors.get(update.id);
                const mapId = update.mapId || actor?.mapId ||
                    worldState.map?.activeMapId;
                const fromRoomId = actor?.roomId ||
                    worldState.map?.currentLocalNodeId;
                if (mapId !== (actor?.mapId || worldState.map?.activeMapId)) {
                    errors.push(`低档现场人物 ${update.id || '?'} 不能跨地图移动。`);
                } else if (!update.roomId || !findLocalRoomPath(
                    mapId,
                    fromRoomId,
                    update.roomId,
                    worldState.map,
                )) {
                    errors.push(`现场人物 ${update.id || '?'} 的目标房间不可达。`);
                }
            }
            if (
                update
                    .firstImpressionOfPlayerEn !=
                    null
            ) {
                let spatial =
                    initialSpatialActors.get(
                        update.id,
                    );
                if (
                    !spatial?.canSeePlayer &&
                    (update.mapId ||
                        update.roomId)
                ) {
                    const projectedState = {
                        ...worldState,
                        actors: (
                            worldState.actors ||
                            []
                        ).map(actor =>
                            actor.id ===
                                update.id
                                ? {
                                    ...actor,
                                    mapId:
                                        update.mapId ||
                                        actor.mapId,
                                    roomId:
                                        update.roomId ||
                                        actor.roomId,
                                }
                                : actor),
                    };
                    spatial = buildSpatialContext(
                        projectedState,
                    ).actors.find(actor =>
                        actor.id ===
                            update.id);
                }
                if (!spatial?.canSeePlayer) {
                    errors.push(
                        `现场人物 ${update.id || '?'} 无法看见玩家，不得形成外貌初见印象。`,
                    );
                }
                if (!isValidFirstImpression(
                    update
                        .firstImpressionOfPlayerEn,
                )) {
                    errors.push(
                        `现场人物 ${update.id || '?'} 的初见印象必须是非占位的 1–${FIRST_IMPRESSION_MAX_WORDS} 词主观观察。`,
                    );
                }
                if (
                    worldState
                        .actorMemoryIndex
                        ?.byActorId
                        ?.[update.id]
                        ?.firstImpressionRef
                ) {
                    errors.push(
                        `现场人物 ${update.id || '?'} 已有初见印象，不得覆盖。`,
                    );
                }
            }
            if (
                update.impressionOfPlayerEn != null ||
                update.memoryUpdate != null
            ) {
                if (
                    temporaryActorIds.has(
                        update.id,
                    )
                ) {
                    if (
                        update
                            .impressionOfPlayerEn !=
                        null
                    ) {
                        errors.push(
                            `临时人物 ${update.id} 不得形成正式玩家印象。`,
                        );
                    }
                } else {
                    let spatial =
                    initialSpatialActors.get(update.id);
                    if (
                        !spatial?.canSeePlayer &&
                    !spatial?.canHearPlayer &&
                    (update.mapId || update.roomId)
                    ) {
                        const projectedState = {
                            ...worldState,
                            actors: (worldState.actors || [])
                                .map(actor =>
                                    actor.id === update.id
                                        ? {
                                            ...actor,
                                            mapId:
                                            update.mapId ||
                                            actor.mapId,
                                            roomId:
                                            update.roomId ||
                                            actor.roomId,
                                        }
                                        : actor),
                        };
                        spatial = buildSpatialContext(
                            projectedState,
                        ).actors.find(actor =>
                            actor.id === update.id);
                    }
                    if (
                        !spatial?.canSeePlayer &&
                    !spatial?.canHearPlayer
                    ) {
                        errors.push(
                            `现场人物 ${update.id || '?'} 无法看见或听见玩家，不得形成玩家印象或共同记忆。`,
                        );
                    }
                }
            }
            if (update.impressionOfPlayerEn != null) {
                const impression = String(
                    update.impressionOfPlayerEn || '',
                ).trim();
                if (!isValidImpressionShorthand(
                    impression,
                )) {
                    errors.push(
                        `现场人物 ${update.id || '?'} 的玩家印象必须是 1–${IMPRESSION_MAX_WORDS} 词的主观 shorthand，不能复述本轮动作。`,
                    );
                }
            }
            if (update.memoryUpdate != null) {
                const memory = update.memoryUpdate;
                if (!memory ||
                    typeof memory !== 'object' ||
                    Array.isArray(memory)) {
                    errors.push(
                        `现场人物 ${update.id || '?'} 的 memoryUpdate 必须是对象。`,
                    );
                } else {
                    const summary = String(
                        memory.summaryEn || '',
                    ).trim();
                    const wordCount = summary
                        .split(/\s+/)
                        .filter(Boolean)
                        .length;
                    if (!summary || wordCount > 40) {
                        errors.push(
                            `现场人物 ${update.id || '?'} 的共同记忆必须具体且不超过 40 词。`,
                        );
                    }
                    if (![
                        'everyday',
                        'notable',
                    ].includes(memory.significance)) {
                        errors.push(
                            `现场人物 ${update.id || '?'} 的共同记忆显著度无效。`,
                        );
                    }
                    const lastingImpactEn =
                        String(
                            memory
                                .lastingImpactEn ||
                            '',
                        ).trim();
                    if (
                        memory.significance ===
                            'notable' &&
                        (
                            !lastingImpactEn ||
                            countTextWords(
                                lastingImpactEn,
                            ) > 24
                        )
                    ) {
                        errors.push(
                            `现场人物 ${update.id || '?'} 的 notable 记忆必须说明 24 词内的长期影响。`,
                        );
                    }
                    const unauthorizedMemoryKeys =
                        Object.keys(memory).filter(key =>
                            ![
                                'summaryEn',
                                'significance',
                                'lastingImpactEn',
                            ].includes(key));
                    if (unauthorizedMemoryKeys.length) {
                        errors.push(
                            `低档不得直接写入共同记忆字段：${unauthorizedMemoryKeys.join(', ')}。`,
                        );
                    }
                }
            }
            const unauthorizedKeys = Object.keys(update)
                .filter(key => !allowedUpdateKeys.has(key));
            if (unauthorizedKeys.length) {
                errors.push(
                    `低档现场表演者不得写入 ${update.id || '?'} 的字段：${unauthorizedKeys.join(', ')}。`,
                );
            }
        });
    }
    errors.push(
        ...validateActorPresenceResolution(
            payload.actorPresence,
            worldState,
            actorUpdates,
            {
                required:
                    !narrativeFirst,
                authorizedEntranceIds:
                    temporaryValidation.ids,
            },
        ),
    );

    const pacingBeat = worldState.pacingDirector?.pendingBeat;
    if (pacingBeat?.status === 'pending') {
        if (
            !narrativeFirst &&
            payload.pacingBeatRealized !==
                true
        ) {
            errors.push('低档必须明确执行已提交的节奏转机。');
        }
        const introducedActorIds = [
            ...(pacingBeat.actorEntrances || [])
                .map(entry => entry.id),
            pacingBeat.guestActor?.id,
        ].filter(Boolean);
        const representedActorIds = new Set([
            ...segments
                .filter(segment => segment.type === 'dialogue')
                .map(segment => segment.actorId),
            ...(Array.isArray(actorUpdates)
                ? actorUpdates.map(update => update.id)
                : []),
        ]);
        introducedActorIds.forEach(actorId => {
            if (!representedActorIds.has(actorId)) {
                errors.push(`节奏转机的新入场人物 ${actorId} 未在现场中出现。`);
            }
        });
    }

    return { valid: errors.length === 0, errors };
}

export function validateTurnTransaction(
    transaction,
    worldState,
    playerAction = '',
    {
        allowLocalizedTemporaryActorFields =
        false,
    } = {},
) {
    const errors = [];
    if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)) {
        return { valid: false, errors: ['回合结算包必须是对象。'] };
    }
    const narrativeFirst =
        Number(
            transaction
                .protocolVersion ||
            0,
        ) >=
        NARRATIVE_TURN_PROTOCOL_VERSION;
    const elapsedMinutes = Number(transaction.elapsedMinutes);
    if (!Number.isInteger(elapsedMinutes) || elapsedMinutes < 0 || elapsedMinutes > 10080) {
        errors.push('elapsedMinutes 必须是 0–10080 的整数。');
    }
    if (!String(transaction.publicEventEn || '').trim()) {
        errors.push('回合结算必须包含玩家可知的事件摘要。');
    }
    if (
        transaction.eventEnded !==
            undefined &&
        typeof transaction.eventEnded !==
            'boolean'
    ) {
        errors.push(
            '回合 eventEnded 必须是布尔值。',
        );
    }
    if (transaction.checkResolution) {
        const checkValidation = validateCheckResolution(
            transaction.checkResolution,
            worldState,
        );
        errors.push(...checkValidation.errors);
    }
    if (
        transaction.spellCasts !==
            undefined
    ) {
        if (
            !Array.isArray(
                transaction
                    .spellCasts,
            )
        ) {
            errors.push(
                'spellCasts 必须是数组。',
            );
        } else {
            transaction
                .spellCasts
                .forEach(cast => {
                    if (
                        !getSpellDefinition(
                            cast
                                ?.spellId,
                            worldState,
                        )
                    ) {
                        errors.push(
                            `spellCasts 引用了未知咒语 ${cast?.spellId || '?'}。`,
                        );
                    }
                });
        }
    }
    const temporaryValidation =
        validateTemporaryActorEntrances(
            transaction
                .temporaryActorEntrances ??
            [],
            worldState,
            {
                allowLocalizedDisplayFields:
                    allowLocalizedTemporaryActorFields,
            },
        );
    errors.push(
        ...temporaryValidation.errors,
    );
    const actorIds = new Set([
        ...(worldState.actorLibrary || [])
            .map(actor => actor.id),
        ...(worldState.actors || [])
            .map(actor => actor.id),
        ...temporaryValidation.ids,
    ]);
    const segments = Array.isArray(transaction.segments) ? transaction.segments : [];
    // 分段数量是 Prompt 质量目标，不是本地失败门槛；本地只拒绝空叙事。
    if (segments.length < 1) {
        errors.push('回合叙事至少要包含 1 个分段。');
    }
    segments.forEach(segment => {
        if (!['narration', 'dialogue'].includes(segment.type)) {
            errors.push('叙事分段类型只能是 narration 或 dialogue。');
        }
        if (!String(segment.textEn || '').trim()) {
            errors.push('叙事分段不能为空。');
        }
        if (segment.type === 'dialogue' && !actorIds.has(segment.actorId)) {
            errors.push(`对白引用了不存在的角色 ${segment.actorId || '?'}。`);
        }
    });
    const narrationConsistency =
        validateNarrationConsistency(
            segments,
            worldState,
            {
                actors:
                    projectNarrativeActorAuthority(
                        transaction,
                        worldState,
                    ),
                elapsedMinutes,
                mutableItemIds:
                    getNarrativeMutableItemIds(
                        transaction,
                    ),
            },
        );
    errors.push(
        ...narrationConsistency
            .errors,
    );
    const narrationTexts =
        segments
            .filter(segment =>
                segment.type ===
                    'narration')
            .map(segment =>
                String(
                    segment.textEn ||
                    '',
                ));
    if (
        transaction
            .identityObservations !==
            undefined &&
        !Array.isArray(
            transaction
                .identityObservations,
        )
    ) {
        errors.push(
            'identityObservations 必须是数组。',
        );
    } else if (
        (
            transaction
                .identityObservations ||
            []
        ).length > 16
    ) {
        errors.push(
            'identityObservations 每回合最多 16 条。',
        );
    } else {
        (
            transaction
                .identityObservations ||
            []
        ).forEach(
            observation => {
                const normalized =
                    normalizeNpcIdentityObservation(
                        observation,
                    );
                if (
                    !normalized ||
                    normalized.confidence <
                        0.7
                ) {
                    errors.push(
                        '人物身体观察无效或置信度不足。',
                    );
                    return;
                }
                if (
                    !actorIds.has(
                        normalized
                            .actorId,
                    )
                ) {
                    errors.push(
                        `人物身体观察引用了不存在的角色 ${normalized.actorId}。`,
                    );
                }
                if (
                    !narrationTexts
                        .some(text =>
                            text.includes(
                                normalized
                                    .evidenceText,
                            ))
                ) {
                    errors.push(
                        `人物身体观察 ${normalized.actorId} 缺少叙事证据。`,
                    );
                }
            },
        );
    }
    const inventoryNarrative = [
        transaction.publicEventEn,
        transaction.sceneProgression
            ?.summaryEn,
        ...segments.map(segment =>
            segment.textEn),
    ].filter(Boolean).join(' ');
    errors.push(...validateItemUpdates(
        transaction.itemUpdates ?? [],
        worldState,
        playerAction,
        inventoryNarrative,
        {
            requireNarrativeAcquisition:
                !narrativeFirst,
        },
    ));
    (
        transaction
            .itemOperations ||
        []
    ).forEach(operation => {
        errors.push(
            ...validateItemOperation(
                operation,
                worldState,
            ),
        );
    });
    (
        transaction
            .itemCandidates ||
        []
    ).forEach(candidate => {
        if (
            candidate.operation !==
                'acquire'
        ) {
            errors.push(
                `待收录物品 ${candidate.id || '?'} 只能使用 acquire。`,
            );
            return;
        }
        errors.push(
            ...validateItemOperation(
                candidate,
                worldState,
                {
                    allowCreate:
                        true,
                },
            ),
        );
    });
    if (
        transaction
            .spellCandidates !==
            undefined &&
        !Array.isArray(
            transaction
                .spellCandidates,
        )
    ) {
        errors.push(
            'spellCandidates 必须是数组。',
        );
    } else {
        (
            transaction
                .spellCandidates ||
            []
        ).forEach(
            (
                candidate,
                index,
            ) => {
                const normalized =
                    normalizeSpellProposal(
                        candidate,
                        {
                            index,
                        },
                    );
                if (
                    !normalized ||
                    normalized.key !==
                        candidate.key ||
                    !candidate
                        .evidenceText
                ) {
                    errors.push(
                        `待收录咒语 ${candidate?.id || '?'} 无效或缺少教学证据。`,
                    );
                }
                if (
                    candidate
                        ?.sourceActorId &&
                    !actorIds.has(
                        candidate
                            .sourceActorId,
                    )
                ) {
                    errors.push(
                        `待收录咒语 ${candidate.id || '?'} 引用了未知教学者 ${candidate.sourceActorId}。`,
                    );
                }
            },
        );
    }
    (transaction.actorUpdates || []).forEach(update => {
        if (!actorIds.has(update.id)) {
            errors.push(`人物更新引用了不存在的角色 ${update.id || '?'}。`);
        }
        if (
            update
                .firstImpressionOfPlayerEn !=
                null &&
            !isValidFirstImpression(
                update
                    .firstImpressionOfPlayerEn,
            )
        ) {
            errors.push(
                `人物更新 ${update.id || '?'} 的初见印象必须是非占位的 1–${FIRST_IMPRESSION_MAX_WORDS} 词主观观察。`,
            );
        }
        if (
            update.impressionOfPlayerEn != null &&
            !isValidImpressionShorthand(
                update.impressionOfPlayerEn,
            )
        ) {
            errors.push(
                `人物更新 ${update.id || '?'} 的玩家印象必须是 1–${IMPRESSION_MAX_WORDS} 词的主观 shorthand。`,
            );
        }
        if (update.memoryUpdate != null &&
            (
                !String(
                    update.memoryUpdate?.summaryEn || '',
                ).trim() ||
                ![
                    'everyday',
                    'notable',
                ].includes(
                    update.memoryUpdate?.significance,
                )
            )) {
            errors.push(`人物更新 ${update.id || '?'} 的共同记忆无效。`);
        }
        if (
            update.memoryUpdate
                ?.significance ===
                'notable' &&
            !String(
                update.memoryUpdate
                    ?.lastingImpactEn || '',
            ).trim()
        ) {
            errors.push(
                `人物更新 ${update.id || '?'} 的 notable 记忆缺少长期影响。`,
            );
        }
        if (update.roomId) {
            const actor = (worldState.actors || [])
                .find(item => item.id === update.id);
            const mapId = update.mapId || actor?.mapId ||
                worldState.map?.activeMapId;
            const fromRoomId = actor?.roomId ||
                worldState.map?.currentLocalNodeId;
            if (!findLocalRoomPath(
                mapId,
                fromRoomId,
                update.roomId,
                worldState.map,
            )) {
                errors.push(`人物更新 ${update.id || '?'} 的房间不可达。`);
            }
        }
    });
    errors.push(
        ...validateActorPresenceResolution(
            transaction.actorPresence,
            worldState,
            transaction.actorUpdates,
            {
                authorizedEntranceIds:
                    temporaryValidation.ids,
            },
        ),
    );
    const activeArc = (worldState.storyArcs || []).find(arc => arc.status === 'active');
    const plannedClueIds = new Set((activeArc?.cluePlan || []).map(clue => clue.id));
    (transaction.revealedClues || []).forEach(clue => {
        if (!plannedClueIds.has(clue.id)) {
            errors.push(`回合试图揭示未预写的线索 ${clue.id || '?'}。`);
        }
        if (!String(clue.labelEn || '').trim() || !String(clue.detailEn || '').trim()) {
            errors.push(`揭示线索 ${clue.id || '?'} 缺少玩家可见内容。`);
        }
    });
    return { valid: errors.length === 0, errors };
}
