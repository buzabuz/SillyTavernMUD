// Extracted from the helpers compatibility facade for Task 4.

import {
    CANON_SETTING_TAG_VALUES,
    findCanonCharacter,
    getCanonSettingProfile,
} from '../canon-characters.js';

import {
    countTextWords,
} from './actor-memory.js';

import {
    buildStoryCastPolicy,
} from './cast.js';

import {
    CAUSAL_COLLAPSE_KEYS,
    CAUSAL_COLLAPSE_KINDS,
    CAUSAL_COLLAPSE_PERSISTENCE_TARGETS,
    CAUSAL_WITNESS_ACCOUNT_KEYS,
} from './causal-state.js';

import {
    getRelativeAgeProfile,
} from './character.js';

import {
    ACTOR_CREATION_PROPOSAL_KEYS,
    validateActorCreationProposal,
} from './actor-creation-proposal.js';
import {
    normalizePacingAssessmentPayload as normalizeCausalPacingAssessmentPayload,
    validatePacingAssessment as validateCausalPacingAssessment,
} from './causal-pacing-contract.js';

const PACING_INTERVENTION_KINDS = new Set([
    'new_actor',
    'causal_collision',
    'environmental_hook',
    'minor_mishap',
    'urgent_disruption',
    'revelation',
    'existing_actor_action',
    'complication',
    'main_arc',
    'mixed',
]);

const PACING_GUEST_ACTOR_KEYS = new Set([
    'id',
    'nameEn',
    'roleEn',
    'relationshipToPlayerEn',
    'publicDescriptionEn',
    'publicBackgroundEn',
    'personalityEn',
    'speechStyleEn',
    'currentActivityEn',
    'birthDate',
    'settingTags',
]);

export const PACING_TEMPORARY_ACTOR_KEYS =
    new Set(
        ACTOR_CREATION_PROPOSAL_KEYS,
    );

export function buildTemporaryActorPromotionPolicy(
    worldState = {},
) {
    return {
        mode:
            'promote_selected_anonymous_interaction',
        promoteWhen:
            'The player selects one specific unnamed person and starts a continuing interaction by addressing, touching, displacing, sitting beside, following, blocking, giving to, taking from, or otherwise directly affecting that person.',
        keepAnonymousWhen:
            'The person is only glimpsed, described as crowd texture, or receives no individual continuing interaction from the player.',
        maximumEntrances: 2,
        reservedActorIds: [
            ...new Set([
                ...(
                    worldState
                        .actorLibrary ||
                    []
                ).map(actor =>
                    actor.id),
                ...(
                    worldState.actors ||
                    []
                ).map(actor =>
                    actor.id),
            ]),
        ].filter(Boolean),
        requiredFields: [
            ...PACING_TEMPORARY_ACTOR_KEYS,
        ],
    };
}

function normalizeLegacyPacingAssessmentPayload(
    payload,
    worldState = {},
    canonCandidates = [],
) {
    const normalized =
        structuredClone(payload);
    if (
        normalized?.decision ===
            'hold' &&
        normalized.intervention ===
            undefined
    ) {
        normalized.intervention = null;
    }
    const intervention =
        normalized?.intervention;
    if (intervention) {
        intervention.actorEntrances =
            Array.isArray(
                intervention.actorEntrances,
            )
                ? intervention.actorEntrances
                : [];
        intervention.temporaryActors =
            Array.isArray(
                intervention.temporaryActors,
            )
                ? intervention.temporaryActors
                : [];
        intervention.guestActor ??= null;
        intervention.identityMergeFromId ??=
            '';
        intervention.identityEvidenceEn ??=
            '';
        intervention.identityRevealed ??=
            false;
        intervention.causalCollapse ??=
            null;
        if (
            intervention
                .causalCollapse
        ) {
            const collapse =
                intervention
                    .causalCollapse;
            collapse.relatedActorIds =
                Array.isArray(
                    collapse
                        .relatedActorIds,
                )
                    ? collapse
                        .relatedActorIds
                    : [];
            collapse.visibleResiduesEn =
                Array.isArray(
                    collapse
                        .visibleResiduesEn,
                )
                    ? collapse
                        .visibleResiduesEn
                    : [];
            collapse.witnessAccounts =
                Array.isArray(
                    collapse
                        .witnessAccounts,
                )
                    ? collapse
                        .witnessAccounts
                    : [];
            collapse.sourceEventIds =
                Array.isArray(
                    collapse
                        .sourceEventIds,
                )
                    ? collapse
                        .sourceEventIds
                    : [];
            collapse.persistenceTargets =
                Array.isArray(
                    collapse
                        .persistenceTargets,
                )
                    ? collapse
                        .persistenceTargets
                    : [];
            collapse.focusActorId ??=
                '';
            collapse.itemId ??= '';
            collapse.edgeType ??= '';
        }
    }
    if (
        !intervention ||
        intervention.guestActor ||
        !intervention.actorEntrances
    ) {
        return normalized;
    }
    const libraryIds = new Set(
        (worldState.actorLibrary || [])
            .map(actor => actor.id),
    );
    const metActorIds = new Set(
        buildStoryCastPolicy(
            worldState,
        ).metActorIds,
    );
    const entranceMetStates =
        intervention.actorEntrances
            .map(entry =>
                metActorIds.has(
                    entry.id,
                ));
    if (
        intervention.kind ===
            'new_actor' &&
        !intervention.guestActor &&
        entranceMetStates.length
    ) {
        if (
            entranceMetStates
                .every(Boolean)
        ) {
            intervention.kind =
                'existing_actor_action';
        } else if (
            entranceMetStates
                .some(Boolean)
        ) {
            intervention.kind =
                'mixed';
        }
    }
    const suppliedCanon = new Map(
        (canonCandidates || [])
            .map(candidate => [
                candidate.id,
                candidate,
            ]),
    );
    const entranceIndex =
        intervention.actorEntrances
            .findIndex(entry =>
                !libraryIds.has(entry.id) &&
                suppliedCanon.has(entry.id));
    if (entranceIndex < 0) {
        return normalized;
    }
    const entrance =
        intervention.actorEntrances[
            entranceIndex
        ];
    const candidate =
        suppliedCanon.get(entrance.id);
    const canonIdentity =
        findCanonCharacter(
            candidate.id ||
            candidate.nameEn,
        );
    if (!canonIdentity) {
        return normalized;
    }
    const canonProfile =
        getCanonSettingProfile(
            canonIdentity,
        );
    const settingTags =
        canonProfile?.settingTags ||
        candidate.settingTags ||
        [
            'steady',
            'social',
        ];
    intervention.actorEntrances =
        intervention.actorEntrances
            .filter((_, index) =>
                index !== entranceIndex);
    intervention.guestActor = {
        id: canonIdentity.id,
        nameEn:
            canonIdentity.nameEn,
        roleEn:
            candidate.roleEn ||
            canonIdentity.roleEn ||
            'Hogwarts student',
        relationshipToPlayerEn:
            'newly met stranger',
        publicDescriptionEn:
            `${canonIdentity.nameEn} is a student of roughly the player's age with an otherwise unrecorded physical appearance.`,
        publicBackgroundEn:
            'A Hogwarts-bound student from the established Canon cohort.',
        personalityEn:
            settingTags.join(', '),
        speechStyleEn:
            'Age-appropriate speech consistent with established Canon characterization.',
        currentActivityEn:
            entrance
                .currentActivityEn,
        birthDate: '',
        settingTags: [
            ...settingTags,
        ],
    };
    intervention.kind =
        intervention.actorEntrances.length
            ? 'mixed'
            : 'new_actor';
    return normalized;
}

function validateLegacyPacingAssessment(
    payload,
    worldState = {},
    signals = {},
) {
    const errors = [];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { valid: false, errors: ['节奏评估必须是对象。'] };
    }
    if (!['hold', 'intervene'].includes(payload.decision)) {
        errors.push('节奏评估 decision 必须是 hold 或 intervene。');
    }
    if (!String(payload.diagnosisEn || '').trim()) {
        errors.push('节奏评估缺少 diagnosisEn。');
    }
    const reassessAfterTurns = Number(payload.reassessAfterTurns);
    if (!Number.isInteger(reassessAfterTurns) ||
        reassessAfterTurns < 2 ||
        reassessAfterTurns > 6) {
        errors.push('reassessAfterTurns 必须是 2–6 的整数。');
    }
    if (payload.decision === 'hold') {
        if (payload.intervention !== null) {
            errors.push('hold 决策的 intervention 必须是 null。');
        }
        if (
            signals.reasons
                ?.includes(
                    'causal_collapse_opportunity',
                )
        ) {
            errors.push(
                '因果坍塌机会已触发；找不到兼容事实时必须降级为普通意外，不能 hold。',
            );
        }
        if (
            signals.metrics
                ?.forcePeerIntroduction
        ) {
            errors.push(
                '当前同龄关系缺口与权威人物重复出场同时成立，不能继续 hold。',
            );
        }
        if (
            signals.reasons
                ?.includes(
                    'explicit_canon_actor_request',
                )
        ) {
            errors.push(
                '玩家已明确选择一名未入库 Canon 人物，不能继续 hold。',
            );
        }
        return { valid: errors.length === 0, errors };
    }

    const intervention = payload.intervention;
    if (!intervention ||
        typeof intervention !== 'object' ||
        Array.isArray(intervention)) {
        return {
            valid: false,
            errors: [...errors, 'intervene 决策必须包含 intervention。'],
        };
    }
    if (!PACING_INTERVENTION_KINDS.has(intervention.kind)) {
        errors.push('节奏介入 kind 无效。');
    }
    if (intervention.timing !== 'this_turn') {
        errors.push('节奏介入 timing 必须是 this_turn。');
    }
    for (const key of ['beatEn', 'pressureEn']) {
        if (!String(intervention[key] || '').trim()) {
            errors.push(`节奏介入缺少 ${key}。`);
        }
    }
    const activeArcIds = new Set(
        (worldState.storyArcs || [])
            .filter(arc => arc.status === 'active')
            .map(arc => arc.id),
    );
    if (intervention.arcId &&
        !activeArcIds.has(intervention.arcId)) {
        errors.push(`节奏介入引用了非活动主线 ${intervention.arcId}。`);
    }

    const libraryIds = new Set(
        (worldState.actorLibrary || []).map(actor => actor.id),
    );
    const presentIds = new Set(
        (worldState.actors || [])
            .filter(actor => actor.present !== false)
            .map(actor => actor.id),
    );
    const actorEntrances = Array.isArray(intervention.actorEntrances)
        ? intervention.actorEntrances
        : [];
    const entranceIds = new Set();
    if (actorEntrances.length > 2) {
        errors.push('一次节奏介入最多引入两名已有角色。');
    }
    actorEntrances.forEach(entry => {
        if (!libraryIds.has(entry.id) ||
            presentIds.has(entry.id) ||
            entranceIds.has(entry.id)) {
            errors.push(`入场角色 ${entry.id || '?'} 不存在、重复或已经在场。`);
        }
        if (!String(entry.currentActivityEn || '').trim()) {
            errors.push(`入场角色 ${entry.id || '?'} 缺少公开活动。`);
        }
        entranceIds.add(entry.id);
    });

    const temporaryActors =
        Array.isArray(
            intervention.temporaryActors,
        )
            ? intervention.temporaryActors
            : [];
    const runtimeActors = new Map(
        (worldState.actors || [])
            .map(actor => [
                actor.id,
                actor,
            ]),
    );
    const causalOpportunity =
        signals.reasons
            ?.includes(
                'causal_collapse_opportunity',
            )
            ? signals.metrics
                ?.causalCollapseOpportunity ||
                null
            : null;
    const causalCollapse =
        intervention.causalCollapse;
    if (causalCollapse) {
        if (!causalOpportunity) {
            errors.push(
                '没有因果坍塌触发槽位时不得提交 causalCollapse。',
            );
        }
        if (
            intervention.kind !==
                'causal_collision'
        ) {
            errors.push(
                '因果坍塌介入 kind 必须是 causal_collision。',
            );
        }
        const unauthorized =
            Object.keys(
                causalCollapse,
            ).filter(key =>
                !CAUSAL_COLLAPSE_KEYS
                    .has(key));
        if (unauthorized.length) {
            errors.push(
                `causalCollapse 不得写入字段：${unauthorized.join(', ')}。`,
            );
        }
        if (
            !CAUSAL_COLLAPSE_KINDS
                .has(
                    causalCollapse.kind,
                )
        ) {
            errors.push(
                'causalCollapse.kind 无效。',
            );
        }
        const effectiveMinutes =
            Number(
                causalCollapse
                    .effectiveMinutesBeforeObservation,
            );
        if (
            !Number.isInteger(
                effectiveMinutes,
            ) ||
            effectiveMinutes < 1 ||
            effectiveMinutes > 10080
        ) {
            errors.push(
                '因果事实必须发生在观测前 1 分钟至 7 天内。',
            );
        }
        if (
            !String(
                causalCollapse
                    .factEn ||
                '',
            ).trim() ||
            countTextWords(
                causalCollapse
                    .factEn,
            ) > 80
        ) {
            errors.push(
                '因果事实必须是 1–80 词的具体英文事实。',
            );
        }
        if (
            causalCollapse
                .surfaceMode !==
                'aftermath'
        ) {
            errors.push(
                'MVP 因果坍塌只能以 aftermath 方式显影。',
            );
        }
        if (
            causalCollapse
                .consequenceMode !==
                'mixed'
        ) {
            errors.push(
                '因果坍塌后果必须保持麻烦与机会混合。',
            );
        }
        if (
            causalCollapse
                .irreversible !==
                false ||
            causalCollapse
                .requiresHighTier !==
                false
        ) {
            errors.push(
                '中档因果坍塌不得提交不可逆或高档权限事实。',
            );
        }
        const residues =
            causalCollapse
                .visibleResiduesEn;
        if (
            !Array.isArray(residues) ||
            residues.length < 1 ||
            residues.length > 3 ||
            residues.some(residue =>
                !String(
                    residue || '',
                ).trim() ||
                countTextWords(
                    residue,
                ) > 45)
        ) {
            errors.push(
                '因果坍塌必须包含 1–3 条、每条不超过 45 词的可见余波。',
            );
        }
        if (
            !String(
                causalCollapse
                    .aftermathEn ||
                '',
            ).trim() ||
            countTextWords(
                causalCollapse
                    .aftermathEn,
            ) > 45
        ) {
            errors.push(
                '因果坍塌必须包含不超过 45 词的余波表演指令。',
            );
        }
        const actorIds = new Set([
            ...libraryIds,
            ...runtimeActors.keys(),
        ]);
        const focusActorId =
            String(
                causalCollapse
                    .focusActorId ||
                '',
            );
        if (
            focusActorId &&
            !actorIds.has(
                focusActorId,
            )
        ) {
            errors.push(
                `因果坍塌焦点人物 ${focusActorId} 不存在。`,
            );
        }
        const relatedActorIds =
            causalCollapse
                .relatedActorIds;
        if (
            !Array.isArray(
                relatedActorIds,
            ) ||
            relatedActorIds.length > 4 ||
            relatedActorIds.some(
                actorId =>
                    !actorIds.has(
                        actorId,
                    ))
        ) {
            errors.push(
                '因果坍塌关联人物必须是最多四名既有人物。',
            );
        }
        if (
            causalOpportunity
                ?.focusActorId &&
            focusActorId !==
                causalOpportunity
                    .focusActorId
        ) {
            errors.push(
                '因果坍塌焦点人物必须匹配当前观测槽位。',
            );
        }
        if (
            causalOpportunity
                ?.itemId &&
            causalCollapse.itemId !==
                causalOpportunity
                    .itemId
        ) {
            errors.push(
                '因果坍塌物品必须匹配当前检查槽位。',
            );
        }
        if (
            String(
                causalCollapse.mapId ||
                '',
            ) !==
                String(
                    causalOpportunity
                        ?.mapId ||
                    worldState.map
                        ?.activeMapId ||
                    '',
                ) ||
            String(
                causalCollapse.roomId ||
                '',
            ) !==
                String(
                    causalOpportunity
                        ?.roomId ||
                    worldState.map
                        ?.currentLocalNodeId ||
                    '',
                )
        ) {
            errors.push(
                '因果坍塌必须绑定当前权威地图与房间。',
            );
        }
        const persistenceTargets =
            causalCollapse
                .persistenceTargets;
        if (
            !Array.isArray(
                persistenceTargets,
            ) ||
            !persistenceTargets.length ||
            persistenceTargets.some(
                target =>
                    !CAUSAL_COLLAPSE_PERSISTENCE_TARGETS
                        .has(target))
        ) {
            errors.push(
                '因果坍塌必须声明合法的持久化目标。',
            );
        }
        if (
            causalCollapse.kind ===
                'social_edge' &&
            (
                !focusActorId ||
                !relatedActorIds.length ||
                !persistenceTargets
                    .includes(
                        'social_graph',
                    )
            )
        ) {
            errors.push(
                '社会关系坍塌必须包含焦点人物、关联人物和 social_graph 目标。',
            );
        }
        if (
            causalCollapse.kind ===
                'material_history' &&
            (
                !String(
                    causalCollapse
                        .itemId ||
                    '',
                ) ||
                !persistenceTargets
                    .includes('item')
            )
        ) {
            errors.push(
                '物品历史坍塌必须绑定物品和 item 目标。',
            );
        }
        const witnessAccounts =
            causalCollapse
                .witnessAccounts;
        if (
            !Array.isArray(
                witnessAccounts,
            ) ||
            witnessAccounts.length > 4
        ) {
            errors.push(
                '因果坍塌最多包含四个见证者知识账户。',
            );
        } else {
            witnessAccounts.forEach(
                account => {
                    const extraKeys =
                        Object.keys(
                            account || {},
                        ).filter(key =>
                            !CAUSAL_WITNESS_ACCOUNT_KEYS
                                .has(key));
                    if (
                        extraKeys.length ||
                        !actorIds.has(
                            account
                                ?.actorId,
                        ) ||
                        !String(
                            account
                                ?.accountEn ||
                            '',
                        ).trim() ||
                        countTextWords(
                            account
                                ?.accountEn,
                        ) > 60
                    ) {
                        errors.push(
                            '因果坍塌见证者账户无效。',
                        );
                    }
                },
            );
        }
        if (
            !Array.isArray(
                causalCollapse
                    .sourceEventIds,
            ) ||
            causalCollapse
                .sourceEventIds
                .length > 8 ||
            causalCollapse
                .sourceEventIds
                .some(id =>
                    !String(id || '')
                        .trim())
        ) {
            errors.push(
                '因果坍塌来源事件 ID 无效。',
            );
        }
    } else if (causalOpportunity) {
        if (
            ![
                'environmental_hook',
                'minor_mishap',
                'complication',
                'existing_actor_action',
            ].includes(
                intervention.kind,
            )
        ) {
            errors.push(
                '因果事实不成立时必须降级为普通环境变化、意外或既有人物行动。',
            );
        }
    }
    const temporaryIds = new Set();
    if (temporaryActors.length > 2) {
        errors.push(
            '一次节奏介入最多引入两名场景临时人物。',
        );
    }
    temporaryActors.forEach(actor => {
        const existing =
            runtimeActors.get(actor.id);
        if (
            !/^[a-z][a-z0-9_]{2,79}$/
                .test(String(actor.id || '')) ||
            (
                libraryIds.has(actor.id) &&
                !existing?.temporary
            ) ||
            temporaryIds.has(actor.id) ||
            (
                existing &&
                !existing.temporary
            ) ||
            (
                existing &&
                existing.present !==
                    false
            )
        ) {
            errors.push(
                `临时人物 ${actor.id || '?'} 的 ID 无效、重复或已经在场。`,
            );
        }
        const validation =
            validateActorCreationProposal(
                actor,
                {
                    mode:
                        'temporary',
                },
            );
        errors.push(
            ...validation.errors.map(error =>
                `临时人物 ${actor.id || '?'}：${error}`),
        );
        temporaryIds.add(actor.id);
    });

    const guest = intervention.guestActor;
    const castPolicy =
        buildStoryCastPolicy(worldState);
    const canonGuest = guest
        ? findCanonCharacter(
            guest.nameEn,
        )
        : null;
    if (guest !== null && guest !== undefined) {
        if (!guest ||
            typeof guest !== 'object' ||
            Array.isArray(guest)) {
            errors.push('guestActor 必须是对象或 null。');
        } else {
            if (!/^[a-z][a-z0-9_]{2,79}$/.test(String(guest.id || '')) ||
                libraryIds.has(guest.id) ||
                runtimeActors.has(guest.id)) {
                errors.push('guestActor.id 必须是未使用的 snake_case ID。');
            }
            for (const key of PACING_GUEST_ACTOR_KEYS) {
                if ([
                    'birthDate',
                    'settingTags',
                ].includes(key)) {
                    continue;
                }
                if (!String(guest[key] || '').trim()) {
                    errors.push(`guestActor 缺少 ${key}。`);
                }
            }
            if (
                !Array.isArray(
                    guest.settingTags,
                ) ||
                guest.settingTags.length < 2 ||
                guest.settingTags.length > 5 ||
                guest.settingTags.some(
                    tag =>
                        !CANON_SETTING_TAG_VALUES
                            .includes(tag))
            ) {
                errors.push(
                    'guestActor.settingTags 必须包含 2–5 个固定设定标签。',
                );
            }
            const unauthorized = Object.keys(guest)
                .filter(key => !PACING_GUEST_ACTOR_KEYS.has(key));
            if (unauthorized.length) {
                errors.push(
                    `公共过场人物不得写入字段：${unauthorized.join(', ')}。`,
                );
            }
            if (
                castPolicy.remainingStorySlots <
                    1
            ) {
                errors.push(
                    `故事人物已达到上限 ${castPolicy.maxStoryActors}，必须复用已入库人物。`,
                );
            }
            if (
                !canonGuest &&
                castPolicy
                    .remainingGeneratedGuestSlots <
                    1
            ) {
                errors.push(
                    `原创过场人物已达到上限 ${castPolicy.maxGeneratedGuests}，必须复用既有人物或选择 Canon 人物。`,
                );
            }
            if (canonGuest) {
                if (
                    guest.id !==
                    canonGuest.id
                ) {
                    errors.push(
                        `Canon 人物 ${guest.nameEn} 必须使用目录 ID ${canonGuest.id}。`,
                    );
                }
                const duplicate =
                    (worldState.actorLibrary || [])
                        .find(actor =>
                            findCanonCharacter(
                                actor.nameEn,
                            )?.id ===
                                canonGuest.id);
                if (duplicate) {
                    errors.push(
                        `Canon 人物 ${guest.nameEn} 已以 ${duplicate.id} 入库，必须复用已有角色。`,
                    );
                }
                const canonProfile =
                    getCanonSettingProfile(
                        canonGuest,
                    );
                if (
                    JSON.stringify([
                        ...(
                            guest
                                .settingTags ||
                            []
                        ),
                    ].sort()) !==
                    JSON.stringify([
                        ...(
                            canonProfile
                                ?.settingTags ||
                            []
                        ),
                    ].sort())
                ) {
                    errors.push(
                        `Canon 人物 ${guest.nameEn} 必须使用目录预设的 settingTags。`,
                    );
                }
            } else if (
                !/^\d{4}-\d{2}-\d{2}$/
                    .test(
                        String(
                            guest.birthDate ||
                            '',
                        ),
                    )
            ) {
                errors.push(
                    '原创人物出场时必须固化 YYYY-MM-DD 出生日期。',
                );
            }
            const previousGuest =
                worldState.pacingDirector
                    ?.assessment
                    ?.intervention
                    ?.guestActor;
            if (
                !canonGuest &&
                previousGuest &&
                !findCanonCharacter(
                    previousGuest.nameEn,
                ) &&
                signals.metrics
                    ?.explicitNewActorRequest !==
                    true
            ) {
                errors.push(
                    '未明确请求陌生人时，不得连续新增原创过场人物。',
                );
            }
        }
    }
    if (['new_actor', 'mixed'].includes(intervention.kind) &&
        !actorEntrances.length &&
        !guest &&
        !temporaryActors.length) {
        errors.push('新人物介入必须包含已有角色入场或公共过场人物。');
    }
    const identityMergeFromId =
        String(
            intervention
                .identityMergeFromId ||
            '',
        );
    if (identityMergeFromId) {
        const temporary =
            runtimeActors.get(
                identityMergeFromId,
            );
        if (
            !temporary?.temporary ||
            !guest
        ) {
            errors.push(
                '身份合并必须引用既有临时人物，并同时提交正式 guestActor 身份。',
            );
        }
        if (
            intervention
                .identityRevealed !== true ||
            !String(
                intervention
                    .identityEvidenceEn ||
                '',
            ).trim()
        ) {
            errors.push(
                '暂定身份只有在叙事已揭晓且存在明确证据时才能合并。',
            );
        }
    } else if (
        intervention.identityRevealed ||
        String(
            intervention
                .identityEvidenceEn ||
            '',
        ).trim()
    ) {
        errors.push(
            '身份揭晓信息缺少 identityMergeFromId。',
        );
    }
    if (
        signals.metrics
            ?.forcePeerIntroduction
    ) {
        const introducedProfiles = [
            ...actorEntrances
                .map(entry =>
                    (worldState
                        .actorLibrary ||
                    []).find(actor =>
                        actor.id ===
                            entry.id))
                .filter(Boolean),
            ...(guest
                ? [{
                    ...guest,
                    canonCatalogId:
                        canonGuest?.id ||
                        '',
                    birthYear:
                        getCanonSettingProfile(
                            canonGuest,
                        )
                            ?.estimatedBirthYear,
                }]
                : []),
        ];
        if (
            !introducedProfiles.some(
                actor => [
                    'same_age',
                    'younger_peer',
                    'older_peer',
                ].includes(
                    getRelativeAgeProfile(
                        worldState,
                        actor,
                    ).relativeAgeBand,
                ))
        ) {
            errors.push(
                '当前必须补充与玩家年龄相近的新关系人物。',
            );
        }
    }
    if (
        ![
            'new_actor',
            'mixed',
            'existing_actor_action',
        ].includes(
            intervention.kind,
        ) &&
        actorEntrances.length
    ) {
        errors.push(
            '当前介入类型不得夹带 actorEntrances。',
        );
    }
    if (
        !['new_actor', 'mixed'].includes(
            intervention.kind,
        ) &&
        guest
    ) {
        errors.push(
            '非新人物介入不得夹带 guestActor。',
        );
    }
    return { valid: errors.length === 0, errors };
}

export {
    normalizeCausalPacingAssessmentPayload as normalizePacingAssessmentPayload,
    validateCausalPacingAssessment as validatePacingAssessment,
};
