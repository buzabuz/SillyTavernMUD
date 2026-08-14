import {
    countTextWords,
} from './actor-memory.js';
import {
    CAUSAL_COLLAPSE_KEYS,
    CAUSAL_COLLAPSE_KINDS,
    CAUSAL_COLLAPSE_PERSISTENCE_TARGETS,
    CAUSAL_WITNESS_ACCOUNT_KEYS,
} from './causal-state.js';

const PACING_PAYLOAD_KEYS =
    new Set([
        'decision',
        'diagnosisEn',
        'reassessAfterTurns',
        'intervention',
    ]);

const PACING_INTERVENTION_KEYS =
    new Set([
        'kind',
        'timing',
        'beatEn',
        'pressureEn',
        'arcId',
        'actorEntrances',
        'temporaryActors',
        'guestActor',
        'identityMergeFromId',
        'identityEvidenceEn',
        'identityRevealed',
        'causalCollapse',
    ]);

function isRecord(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value),
    );
}

function unknownKeys(
    value,
    allowedKeys,
) {
    return isRecord(value)
        ? Object.keys(value)
            .filter(key =>
                !allowedKeys.has(key))
        : [];
}

export function normalizePacingAssessmentPayload(
    payload,
) {
    const normalized =
        isRecord(payload)
            ? structuredClone(payload)
            : payload;
    if (
        normalized?.decision ===
            'hold' &&
        normalized.intervention ===
            undefined
    ) {
        normalized.intervention = null;
    }
    if (
        isRecord(
            normalized?.intervention,
        )
    ) {
        const intervention =
            normalized.intervention;
        intervention.actorEntrances ??= [];
        intervention.temporaryActors ??= [];
        intervention.guestActor ??= null;
        intervention.identityMergeFromId ??= '';
        intervention.identityEvidenceEn ??= '';
        intervention.identityRevealed ??= false;
        intervention.causalCollapse ??= null;
        if (
            isRecord(
                intervention
                    .causalCollapse,
            )
        ) {
            const collapse =
                intervention
                    .causalCollapse;
            collapse.relatedActorIds ??= [];
            collapse.visibleResiduesEn ??= [];
            collapse.witnessAccounts ??= [];
            collapse.sourceEventIds ??= [];
            collapse.persistenceTargets ??= [];
            collapse.focusActorId ??= '';
            collapse.itemId ??= '';
            collapse.edgeType ??= '';
        }
    }
    return normalized;
}

function validateCausalCollapse(
    collapse,
    worldState,
    opportunity,
    errors,
) {
    if (!isRecord(collapse)) {
        errors.push(
            'causal_collision 必须包含 causalCollapse。',
        );
        return;
    }
    const unauthorized =
        unknownKeys(
            collapse,
            CAUSAL_COLLAPSE_KEYS,
        );
    if (unauthorized.length) {
        errors.push(
            `causalCollapse 不得写入字段：${unauthorized.join(', ')}。`,
        );
    }
    if (
        !CAUSAL_COLLAPSE_KINDS
            .has(collapse.kind)
    ) {
        errors.push(
            'causalCollapse.kind 无效。',
        );
    }
    const effectiveMinutes =
        Number(
            collapse
                .effectiveMinutesBeforeObservation,
        );
    if (
        !Number.isInteger(
            effectiveMinutes,
        ) ||
        effectiveMinutes < 1 ||
        effectiveMinutes > 10_080
    ) {
        errors.push(
            '因果事实必须发生在观测前 1 分钟至 7 天内。',
        );
    }
    if (
        !String(
            collapse.factEn ||
            '',
        ).trim() ||
        countTextWords(
            collapse.factEn,
        ) > 80
    ) {
        errors.push(
            '因果事实必须是 1-80 词的具体英文事实。',
        );
    }
    if (
        collapse.surfaceMode !==
            'aftermath' ||
        collapse.consequenceMode !==
            'mixed'
    ) {
        errors.push(
            '因果坍塌必须使用 aftermath/mixed 显影合同。',
        );
    }
    if (
        collapse.irreversible !==
            false ||
        collapse.requiresHighTier !==
            false
    ) {
        errors.push(
            '中档因果坍塌不得提交不可逆或高档权限事实。',
        );
    }
    const residues =
        collapse.visibleResiduesEn;
    if (
        !Array.isArray(residues) ||
        residues.length < 1 ||
        residues.length > 3 ||
        residues.some(residue =>
            !String(
                residue ||
                '',
            ).trim() ||
            countTextWords(
                residue,
            ) > 45)
    ) {
        errors.push(
            '因果坍塌必须包含 1-3 条、每条不超过 45 词的可见余波。',
        );
    }
    if (
        !String(
            collapse.aftermathEn ||
            '',
        ).trim() ||
        countTextWords(
            collapse.aftermathEn,
        ) > 45
    ) {
        errors.push(
            '因果坍塌必须包含不超过 45 词的余波表演指令。',
        );
    }
    const actorIds =
        new Set([
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
        ]);
    const focusActorId =
        String(
            collapse.focusActorId ||
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
        collapse.relatedActorIds;
    if (
        !Array.isArray(
            relatedActorIds,
        ) ||
        relatedActorIds.length > 4 ||
        relatedActorIds.some(
            actorId =>
                !actorIds.has(
                    actorId))
    ) {
        errors.push(
            '因果坍塌关联人物必须是最多四名既有人物。',
        );
    }
    if (
        opportunity.focusActorId &&
        focusActorId !==
            opportunity.focusActorId
    ) {
        errors.push(
            '因果坍塌焦点人物必须匹配当前观测槽位。',
        );
    }
    if (
        opportunity.itemId &&
        collapse.itemId !==
            opportunity.itemId
    ) {
        errors.push(
            '因果坍塌物品必须匹配当前检查槽位。',
        );
    }
    if (
        String(
            collapse.mapId ||
            '',
        ) !==
            String(
                opportunity.mapId ||
                '',
            ) ||
        String(
            collapse.roomId ||
            '',
        ) !==
            String(
                opportunity.roomId ||
                '',
            )
    ) {
        errors.push(
            '因果坍塌必须绑定当前权威地图与房间。',
        );
    }
    const persistenceTargets =
        collapse.persistenceTargets;
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
        collapse.kind ===
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
        collapse.kind ===
            'material_history' &&
        (
            !String(
                collapse.itemId ||
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
        collapse.witnessAccounts;
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
        witnessAccounts
            .forEach(account => {
                if (
                    unknownKeys(
                        account,
                        CAUSAL_WITNESS_ACCOUNT_KEYS,
                    ).length ||
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
            });
    }
    if (
        !Array.isArray(
            collapse.sourceEventIds,
        ) ||
        collapse.sourceEventIds
            .length > 8 ||
        collapse.sourceEventIds
            .some(id =>
                !String(id || '')
                    .trim())
    ) {
        errors.push(
            '因果坍塌来源事件 ID 无效。',
        );
    }
}

export function validatePacingAssessment(
    payload,
    worldState = {},
    signals = {},
) {
    const errors = [];
    if (!isRecord(payload)) {
        return {
            valid: false,
            errors: [
                '节奏评估必须是对象。',
            ],
        };
    }
    const extraPayloadKeys =
        unknownKeys(
            payload,
            PACING_PAYLOAD_KEYS,
        );
    if (extraPayloadKeys.length) {
        errors.push(
            `节奏评估不得写入字段：${extraPayloadKeys.join(', ')}。`,
        );
    }
    const opportunity =
        signals.reasons
            ?.includes(
                'causal_collapse_opportunity',
            )
            ? signals.metrics
                ?.causalCollapseOpportunity ||
                null
            : null;
    if (!opportunity) {
        errors.push(
            'Pacing 只能处理已触发的 causal_collapse_opportunity。',
        );
    }
    if (
        ![
            'hold',
            'intervene',
        ].includes(
            payload.decision,
        )
    ) {
        errors.push(
            '节奏评估 decision 必须是 hold 或 intervene。',
        );
    }
    if (
        !String(
            payload.diagnosisEn ||
            '',
        ).trim() ||
        countTextWords(
            payload.diagnosisEn,
        ) > 45
    ) {
        errors.push(
            '节奏评估 diagnosisEn 必须是 1-45 词。',
        );
    }
    const reassessAfterTurns =
        Number(
            payload.reassessAfterTurns,
        );
    if (
        !Number.isInteger(
            reassessAfterTurns,
        ) ||
        reassessAfterTurns < 2 ||
        reassessAfterTurns > 6
    ) {
        errors.push(
            'reassessAfterTurns 必须是 2-6 的整数。',
        );
    }
    if (
        payload.decision ===
            'hold'
    ) {
        if (
            payload.intervention !==
                null
        ) {
            errors.push(
                'hold 决策的 intervention 必须是 null。',
            );
        }
        return {
            valid:
                errors.length === 0,
            errors,
        };
    }
    const intervention =
        payload.intervention;
    if (!isRecord(intervention)) {
        return {
            valid: false,
            errors: [
                ...errors,
                'intervene 决策必须包含 intervention。',
            ],
        };
    }
    const extraInterventionKeys =
        unknownKeys(
            intervention,
            PACING_INTERVENTION_KEYS,
        );
    if (
        extraInterventionKeys.length
    ) {
        errors.push(
            `节奏介入不得写入字段：${extraInterventionKeys.join(', ')}。`,
        );
    }
    if (
        intervention.kind !==
            'causal_collision' ||
        intervention.timing !==
            'this_turn'
    ) {
        errors.push(
            'Pacing 介入只能是 this_turn causal_collision。',
        );
    }
    for (const key of [
        'beatEn',
        'pressureEn',
    ]) {
        if (
            !String(
                intervention[key] ||
                '',
            ).trim() ||
            countTextWords(
                intervention[key],
            ) > 45
        ) {
            errors.push(
                `${key} 必须是 1-45 词。`,
            );
        }
    }
    if (
        String(
            intervention.arcId ||
            '',
        ) ||
        (
            intervention
                .actorEntrances ||
            []
        ).length ||
        (
            intervention
                .temporaryActors ||
            []
        ).length ||
        intervention.guestActor !==
            null ||
        String(
            intervention
                .identityMergeFromId ||
            '',
        ) ||
        String(
            intervention
                .identityEvidenceEn ||
            '',
        ) ||
        intervention
            .identityRevealed !==
            false
    ) {
        errors.push(
            'causal-only Pacing 不得创建、引入或合并人物，也不得写主线。',
        );
    }
    validateCausalCollapse(
        intervention.causalCollapse,
        worldState,
        opportunity || {},
        errors,
    );
    return {
        valid:
            errors.length === 0,
        errors,
    };
}
