// Extracted from the helpers compatibility facade for Task 4.

import {
    getSpellDefinition,
} from '../spell-catalog.js';

import {
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
    const hasStructuredPublicEvent =
        Boolean(
            String(
                payload.sceneProgression
                    ?.summaryEn ||
                '',
            ).trim(),
        ) ||
        (
            payload.segments ||
            []
        ).some(segment =>
            segment?.type ===
                'narration' &&
            String(
                segment.textEn ||
                '',
            ).trim(),
        );
    if (
        !narrativeFirst &&
        !publicEvent &&
        !hasStructuredPublicEvent
    ) {
        errors.push('现场记录必须提供摘要或一段可归纳的叙述。');
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
                segment.textEn ||
                segment.rawText ||
                '',
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
    const inventoryNarrative = [
        payload.publicEventEn,
        payload.sceneProgression?.summaryEn,
        ...segments.map(segment =>
            segment.textEn),
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
    } else if (
        movementResolution &&
        [
            'failed',
            'already_there',
        ].includes(
            movementResolution.status,
        )
    ) {
        const fact =
            String(
                movementResolution
                    .movementOutcomeFactEn ||
                '',
            ).trim();
        if (
            !fact ||
            !segments.some(segment =>
                segment?.type ===
                    'narration' &&
                String(
                    segment.textEn ||
                    '',
                ).includes(fact))
        ) {
            errors.push(
                '未移动结果必须在正文中保留确定性 movementOutcomeFactEn。',
            );
        }
        if (
            movementResolution
                .remainingMapId !==
                worldState.map
                    ?.activeMapId ||
            movementResolution
                .remainingRoomId !==
                worldState.map
                    ?.currentLocalNodeId
        ) {
            errors.push(
                '未移动结果的 remaining room 必须等于玩家当前权威房间。',
            );
        }
    }

    if (
        momentumDirective?.required
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
        transaction.movementOutcome !==
        undefined
    ) {
        const movement =
            transaction
                .movementOutcome;
        if (
            !movement ||
            typeof movement !==
                'object' ||
            Array.isArray(
                movement,
            ) ||
            movement.version !==
                1 ||
            ![
                'moved',
                'already_there',
                'failed',
            ].includes(
                movement.status,
            )
        ) {
            errors.push(
                'movementOutcome 必须是有效的 MovementOutcomeV1。',
            );
        } else {
            const changed =
                movement.status ===
                'moved';
            if (
                movement.moved !==
                    changed ||
                movement.attempted !==
                    true
            ) {
                errors.push(
                    'movementOutcome 的 attempted/moved 与 status 不一致。',
                );
            }
            if (
                !Number.isInteger(
                    movement.minutes,
                ) ||
                movement.minutes <
                    1 ||
                movement.minutes >
                    10_080 ||
                (
                    !changed &&
                    movement.minutes !==
                        15
                )
            ) {
                errors.push(
                    'movementOutcome minutes 不符合移动时间合同。',
                );
            }
            if (
                movement
                    .remainingMapId !==
                    worldState.map
                        ?.activeMapId ||
                movement
                    .remainingRoomId !==
                    worldState.map
                        ?.currentLocalNodeId
            ) {
                errors.push(
                    'movementOutcome remaining room 与权威玩家位置不一致。',
                );
            }
            if (
                !changed
            ) {
                const fact =
                    String(
                        movement
                            .movementOutcomeFactEn ||
                        '',
                    ).trim();
                const hasFact =
                    (
                        transaction
                            .segments ||
                        []
                    ).some(segment =>
                        segment?.type ===
                            'narration' &&
                        String(
                            segment
                                .textEn ||
                            '',
                        ).includes(
                            fact,
                        ));
                if (
                    !fact ||
                    !hasFact
                ) {
                    errors.push(
                        '未移动 transaction 缺少确定性可见事实。',
                    );
                }
            }
        }
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
        const text =
            String(
                segment.textEn ||
                segment.rawText ||
                '',
            ).trim();
        if (!text) {
            errors.push('叙事分段不能为空。');
        }
        if (
            segment.rawText &&
            (
                segment.authority !==
                    'model_output_evidence' ||
                !segment.language
            )
        ) {
            errors.push(
                'rawText 分段缺少语言证据标记。',
            );
        }
        if (segment.type === 'dialogue' && !actorIds.has(segment.actorId)) {
            errors.push(`对白引用了不存在的角色 ${segment.actorId || '?'}。`);
        }
    });
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
            update.locationKnown ===
                false &&
            (
                update.mapId ||
                update.roomId ||
                update.present !==
                    false
            )
        ) {
            errors.push(
                `人物更新 ${update.id || '?'} 的未知位置必须清空 map/room 且 present=false。`,
            );
        }
        if (
            update.locationKnown ===
                true &&
            (
                !update.mapId ||
                !update.roomId
            )
        ) {
            errors.push(
                `人物更新 ${update.id || '?'} 的已知位置缺少 map/room。`,
            );
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
        if (
            update.locationKnown !==
                false &&
            update.roomId
        ) {
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
