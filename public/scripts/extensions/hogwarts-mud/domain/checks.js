// Extracted from the helpers compatibility facade for Task 4.

import {
    getSpellDefinition,
    parseSpellCastDirectives,
} from '../spell-catalog.js';

import {
    buildSpatialContext,
} from './spatial-reconciliation.js';

import {
    getKnownSpell,
    getSpellProficiencyModifier,
    resolveSpellObservation,
} from './spell-state.js';

const CHECK_OUTCOMES = Object.freeze([
    'catastrophic_failure',
    'failure',
    'success_with_cost',
    'success',
    'critical_success',
]);

const CHECK_OUTCOME_LABELS = Object.freeze({
    catastrophic_failure: {
        label: '灾难性失败',
        labelEn: 'Catastrophic failure',
    },
    failure: {
        label: '失败并产生后果',
        labelEn: 'Failure with consequence',
    },
    success_with_cost: {
        label: '成功但付出代价',
        labelEn: 'Success at a cost',
    },
    success: {
        label: '完全成功',
        labelEn: 'Full success',
    },
    critical_success: {
        label: '重大成功',
        labelEn: 'Critical success',
    },
});

export const CHECK_ATTRIBUTE_LABELS = Object.freeze({
    physique: { label: '体魄', labelEn: 'Physique' },
    agility: { label: '灵巧', labelEn: 'Agility' },
    perception: { label: '感知', labelEn: 'Perception' },
    intellect: { label: '智识', labelEn: 'Intellect' },
    willpower: { label: '意志', labelEn: 'Willpower' },
    charisma: { label: '魅力', labelEn: 'Charisma' },
});

const ACTION_CHECK_RULES = Object.freeze([
    {
        id: 'physical_force',
        label: '体魄对抗',
        labelEn: 'Physical contest',
        attribute: 'physique',
        targetAttribute: 'physique',
        skill: 'athletics',
        opposed: true,
        dcAdjustment: 0,
    },
    {
        id: 'agility',
        label: '灵巧行动',
        labelEn: 'Agility action',
        attribute: 'agility',
        targetAttribute: 'agility',
        skill: 'acrobatics',
        opposed: false,
        dcAdjustment: 1,
    },
    {
        id: 'perception',
        label: '感知调查',
        labelEn: 'Perception check',
        attribute: 'perception',
        targetAttribute: 'agility',
        skill: 'investigation',
        opposed: false,
        dcAdjustment: 0,
    },
    {
        id: 'intellect',
        label: '智识检定',
        labelEn: 'Intellect check',
        attribute: 'intellect',
        targetAttribute: 'intellect',
        skill: 'lore',
        opposed: false,
        dcAdjustment: 1,
    },
    {
        id: 'willpower',
        label: '意志检定',
        labelEn: 'Willpower check',
        attribute: 'willpower',
        targetAttribute: 'willpower',
        skill: 'discipline',
        opposed: false,
        dcAdjustment: 1,
    },
    {
        id: 'charisma',
        label: '社交对抗',
        labelEn: 'Social contest',
        attribute: 'charisma',
        targetAttribute: 'willpower',
        skill: 'influence',
        opposed: true,
        dcAdjustment: 0,
    },
    {
        id: 'magic',
        label: '施法检定',
        labelEn: 'Spellcasting check',
        attribute: 'willpower',
        targetAttribute: 'willpower',
        skill: 'spellcasting',
        opposed: false,
        dcAdjustment: 2,
    },
]);

const CHECK_DIFFICULTY_DC = Object.freeze({
    narrative: 10,
    standard: 12,
    harsh: 14,
});

function secureRandomInt(maximum) {
    const range = Math.max(1, Number(maximum) || 1);
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi?.getRandomValues) {
        return Math.floor(Math.random() * range) + 1;
    }
    const values = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / range) * range;
    do {
        cryptoApi.getRandomValues(values);
    } while (values[0] >= limit);
    return (values[0] % range) + 1;
}

function getAttributeModifier(character, attribute) {
    const value = Number(character?.attributes?.[attribute] ?? 10);
    return Math.floor((value - 10) / 2);
}

function getSkillModifier(character, skill) {
    const source = character?.skills?.[skill];
    const value = Number(
        source && typeof source === 'object'
            ? source.value
            : source,
    );
    return Number.isFinite(value) && value > 0
        ? Math.min(5, Math.floor(value / 4))
        : 0;
}

function normalizeCheckText(value) {
    return String(value || '')
        .normalize('NFKC')
        .replace(/[_·]/g, ' ')
        .toLocaleLowerCase();
}

function findCheckTargetActor(
    worldState,
    playerAction,
    checkRule = null,
) {
    const baseQuery = normalizeCheckText(playerAction);
    const query = baseQuery;
    const spatialActors = new Map(
        buildSpatialContext(worldState).actors
            .map(actor => [actor.id, actor]),
    );
    const playerRoomId =
        worldState.map?.currentLocalNodeId;
    let best = null;
    (worldState.actors || [])
        .filter(actor => actor.present !== false)
        .forEach(actor => {
            const spatial = spatialActors.get(actor.id);
            if (checkRule?.id === 'physical_force' &&
                actor.roomId !== playerRoomId) {
                return;
            }
            if (checkRule?.id === 'charisma' &&
                spatial && !spatial.canHearPlayer) {
                return;
            }
            const profile = (worldState.actorLibrary || [])
                .find(item => item.id === actor.id);
            const labels = [
                actor.id,
                actor.name,
                actor.nameEn,
                profile?.name,
                profile?.nameEn,
                actor.role,
                actor.roleEn,
                profile?.role,
                profile?.roleEn,
                profile?.publicDescription,
                profile?.publicDescriptionEn,
            ].filter(Boolean);
            let score = 0;
            labels.forEach(label => {
                const normalized = normalizeCheckText(label);
                if (normalized.length >= 3 &&
                    query.includes(normalized)) {
                    score = Math.max(score, normalized.length + 20);
                }
                normalized.split(/[^\p{L}\p{N}]+/u)
                    .filter(part => part.length >= 4)
                    .forEach(part => {
                        if (query.includes(part)) {
                            score = Math.max(score, part.length);
                        }
                    });
            });
            if (score > 0 && (!best || score > best.score)) {
                best = { actor, profile, score };
            }
        });
    return best;
}

function deriveNpcCheckModifier(actor, profile, attribute) {
    const explicit = Number(
        profile?.checkModifiers?.[attribute] ??
        actor?.checkModifiers?.[attribute],
    );
    if (Number.isFinite(explicit)) {
        return Math.max(-5, Math.min(5, explicit));
    }
    return 0;
}

function rollD20(mode, randomInt) {
    const count = mode === 'normal' ? 1 : 2;
    const rolls = Array.from(
        { length: count },
        () => randomInt(20),
    );
    return {
        rolls,
        keptRoll: mode === 'advantage'
            ? Math.max(...rolls)
            : mode === 'disadvantage'
                ? Math.min(...rolls)
                : rolls[0],
    };
}

function getCheckOutcome(total, targetTotal, naturalRoll) {
    const margin = total - targetTotal;
    let rank = margin <= -10
        ? 0
        : margin < 0
            ? 1
            : margin < 5
                ? 2
                : margin < 10
                    ? 3
                    : 4;
    if (naturalRoll === 1) rank--;
    if (naturalRoll === 20) rank++;
    return CHECK_OUTCOMES[
        Math.max(0, Math.min(CHECK_OUTCOMES.length - 1, rank))
    ];
}

export function detectActionCheck(
    worldState,
    playerAction,
    {
        forced = false,
        spellCast = null,
    } = {},
) {
    const action = String(playerAction || '');
    const structuredSpell =
        getSpellDefinition(
            spellCast?.spellId ||
            parseSpellCastDirectives(
                action,
                worldState,
            )[0]?.spellId,
            worldState,
        );
    const knownSpell =
        structuredSpell
            ? getKnownSpell(
                worldState,
                structuredSpell.id,
            )
            : null;
    const rule =
        structuredSpell
            ? {
                id: 'magic',
                label:
                    `施法检定 · ${structuredSpell.name}`,
                labelEn:
                    `Spellcasting check · ${
                        structuredSpell
                            .incantation ||
                        structuredSpell
                            .nameEn
                    }`,
                attribute:
                    'willpower',
                targetAttribute:
                    structuredSpell
                        .targetAttribute,
                skill:
                    'spellcasting',
                opposed:
                    structuredSpell
                        .opposed,
                dcAdjustment:
                    structuredSpell
                        .dcAdjustment +
                    (
                        knownSpell
                            ? 0
                            : 2
                    ),
                spell:
                    structuredSpell,
                knownSpell:
                    Boolean(
                        knownSpell,
                    ),
            }
            : null;
    if (!rule && !forced) {
        return null;
    }
    const selected = rule || {
        id: 'forced_general',
        label: '主动判定',
        labelEn: 'Player-requested check',
        attribute: 'perception',
        targetAttribute: 'agility',
        skill: 'general',
        opposed: false,
        dcAdjustment: 0,
    };
    const target = findCheckTargetActor(
        worldState,
        action,
        selected,
    );
    return {
        ...selected,
        forced:
            Boolean(
                forced ||
                structuredSpell,
            ),
        target: target
            ? {
                actorId: target.actor.id,
                name: target.actor.name ||
                    target.profile?.name ||
                    target.actor.nameEn ||
                    target.profile?.nameEn ||
                    target.actor.id,
            }
            : null,
    };
}

export function resolveActionCheck(
    worldState,
    playerAction,
    {
        forced = false,
        randomInt = secureRandomInt,
        semanticCheck =
        undefined,
        sourceMessageId =
        null,
        spellCast = null,
    } = {},
) {
    const structuredSpell =
        getSpellDefinition(
            spellCast?.spellId ||
            parseSpellCastDirectives(
                playerAction,
                worldState,
            )[0]?.spellId,
            worldState,
        );
    const spellObservation =
        structuredSpell
            ? null
            : resolveSpellObservation(
                worldState,
                playerAction,
            );
    const observedSpell =
        getSpellDefinition(
            spellObservation
                ?.spellId,
            worldState,
        );
    const hasSemanticCheck =
        semanticCheck &&
        typeof semanticCheck ===
            'object' &&
        !Array.isArray(
            semanticCheck,
        );
    const semanticRule =
        hasSemanticCheck
            ? ACTION_CHECK_RULES.find(
                rule =>
                    rule.id ===
                    semanticCheck
                        .ruleId,
            )
            : null;
    const semanticTarget =
        hasSemanticCheck &&
        semanticCheck
            .targetActorId
            ? (
                worldState.actors ||
                []
            ).find(actor =>
                actor.id ===
                    semanticCheck
                        .targetActorId &&
                actor.present !==
                    false)
            : null;
    const semanticTargetProfile =
        semanticTarget
            ? (
                worldState
                    .actorLibrary ||
                []
            ).find(profile =>
                profile.id ===
                    semanticTarget.id)
            : null;
    let detected;
    if (structuredSpell) {
        detected =
            detectActionCheck(
                worldState,
                playerAction,
                {
                    forced: true,
                    spellCast: {
                        spellId:
                            structuredSpell.id,
                    },
                },
            );
    } else if (
        spellObservation &&
        observedSpell
    ) {
        detected = {
            id: 'perception',
            label: '咒语观测',
            labelEn:
                'Spell observation',
            attribute: 'perception',
            targetAttribute:
                'agility',
            skill: 'investigation',
            opposed: false,
            dcAdjustment:
                observedSpell
                    .dcAdjustment,
            forced: true,
            target: null,
            spellObservation:
                structuredClone(
                    spellObservation,
                ),
        };
    } else if (
        hasSemanticCheck
    ) {
        detected =
            semanticCheck
                .required ||
            forced
                ? {
                    ...(
                        semanticRule ||
                        {
                            id:
                                'forced_general',
                            label:
                                '主动判定',
                            labelEn:
                                'Player-requested check',
                            attribute:
                                'perception',
                            targetAttribute:
                                'agility',
                            skill:
                                'general',
                            opposed:
                                false,
                            dcAdjustment:
                                0,
                        }
                    ),
                    forced:
                        Boolean(
                            forced,
                        ),
                    target:
                        semanticTarget
                            ? {
                                actorId:
                                    semanticTarget.id,
                                name:
                                    semanticTarget.name ||
                                    semanticTargetProfile
                                        ?.name ||
                                    semanticTarget.nameEn ||
                                    semanticTargetProfile
                                        ?.nameEn ||
                                    semanticTarget.id,
                            }
                            : null,
                }
                : null;
    } else {
        detected =
            forced
                ? {
                    id: 'forced_general',
                    label: '主动判定',
                    labelEn:
                        'Player-requested check',
                    attribute:
                        'perception',
                    targetAttribute:
                        'agility',
                    skill: 'general',
                    opposed: false,
                    dcAdjustment: 0,
                    forced: true,
                    target: null,
                }
                : null;
    }
    if (!detected) {
        return null;
    }
    const character = worldState.character || {};
    const attributeModifier = getAttributeModifier(
        character,
        detected.attribute,
    );
    const skillModifier = getSkillModifier(
        character,
        detected.skill,
    );
    const proficiencyModifier =
        detected.spell
            ? getSpellProficiencyModifier(
                worldState,
                detected.spell.id,
            )
            : 0;
    const itemUsed = (worldState.items || []).find(item =>
        [item.id, item.label, item.labelEn]
            .filter(Boolean)
            .some(label =>
                normalizeCheckText(playerAction)
                    .includes(normalizeCheckText(label)),
            ),
    );
    const equipmentModifier = itemUsed ? 1 : 0;
    const rollMode =
        [
            'normal',
            'advantage',
            'disadvantage',
        ].includes(
            semanticCheck?.rollMode,
        )
            ? semanticCheck.rollMode
            : 'normal';
    const playerRoll = rollD20(rollMode, randomInt);
    const modifierTotal = attributeModifier +
        skillModifier +
        equipmentModifier +
        proficiencyModifier;
    const total = playerRoll.keptRoll + modifierTotal;
    const targetMatch =
        semanticTarget
            ? {
                actor:
                    semanticTarget,
                profile:
                    semanticTargetProfile,
            }
            : detected.target
                ? findCheckTargetActor(
                    worldState,
                    detected
                        .target.name,
                    detected,
                )
                : null;
    const useOpposed = Boolean(
        detected.opposed && targetMatch,
    );
    let targetTotal;
    let hidden;
    if (useOpposed) {
        const opponentRoll = rollD20('normal', randomInt);
        const opponentModifier = deriveNpcCheckModifier(
            targetMatch.actor,
            targetMatch.profile,
            detected.targetAttribute,
        );
        targetTotal =
            opponentRoll.keptRoll + opponentModifier;
        hidden = {
            mode: 'opposed',
            opponentRoll: opponentRoll.keptRoll,
            opponentModifier,
            opponentTotal: targetTotal,
        };
    } else {
        const baseDc = CHECK_DIFFICULTY_DC[
            worldState.campaign?.difficulty
        ] || CHECK_DIFFICULTY_DC.standard;
        targetTotal = Math.max(
            5,
            Math.min(25, baseDc + detected.dcAdjustment),
        );
        hidden = {
            mode: 'difficulty',
            difficultyClass: targetTotal,
        };
    }
    const outcome = getCheckOutcome(
        total,
        targetTotal,
        playerRoll.keptRoll,
    );
    return {
        id: globalThis.crypto?.randomUUID?.() ||
            `check-${Date.now()}-${playerRoll.rolls.join('-')}`,
        kind: detected.id,
        labelEn: detected.labelEn,
        reasonCode:
            detected.id,
        ...(
            Number.isInteger(
                sourceMessageId,
            ) &&
            sourceMessageId >= 0
                ? {
                    sourceMessageId,
                }
                : {}
        ),
        forced: detected.forced,
        attribute: detected.attribute,
        attributeLabelEn:
            CHECK_ATTRIBUTE_LABELS[detected.attribute].labelEn,
        skill: detected.skill,
        rollMode,
        rolls: playerRoll.rolls,
        keptRoll: playerRoll.keptRoll,
        modifiers: {
            attribute: attributeModifier,
            skill: skillModifier,
            equipment: equipmentModifier,
            proficiency:
                proficiencyModifier,
            situation: 0,
            total: modifierTotal,
        },
        total,
        target: {
            mode: hidden.mode,
            actorId: detected.target?.actorId || null,
            visibleDifficulty: null,
        },
        outcome,
        outcomeLabelEn: CHECK_OUTCOME_LABELS[outcome].labelEn,
        hidden,
        itemId: itemUsed?.id || null,
        ...(detected.spell
            ? {
                spell: {
                    spellId:
                        detected
                            .spell
                            .id,
                    incantation:
                        detected
                            .spell
                            .incantation,
                    nameEn:
                        detected
                            .spell
                            .nameEn,
                    known:
                        detected
                            .knownSpell,
                    proficiencyBefore:
                        getKnownSpell(
                            worldState,
                            detected
                                .spell
                                .id,
                        )
                            ?.proficiencyXp ||
                        0,
                },
            }
            : {}),
        ...(
            detected
                .spellObservation
                ? {
                    spellObservation:
                        structuredClone(
                            detected
                                .spellObservation,
                        ),
                }
                : {}
        ),
        resolvedAt: new Date().toISOString(),
    };
}

export function validateCheckResolution(check, worldState) {
    const errors = [];
    if (!check || typeof check !== 'object' || Array.isArray(check)) {
        return { valid: false, errors: ['判定结果必须是对象。'] };
    }
    if (!CHECK_ATTRIBUTE_LABELS[check.attribute]) {
        errors.push('判定属性无效。');
    }
    if (!CHECK_OUTCOMES.includes(check.outcome)) {
        errors.push('判定结果等级无效。');
    }
    if (
        check.sourceMessageId !==
            undefined &&
        (
            !Number.isInteger(
                check
                    .sourceMessageId,
            ) ||
            check
                .sourceMessageId <
                0
        )
    ) {
        errors.push(
            '判定来源消息 ID 无效。',
        );
    }
    if (!Array.isArray(check.rolls) ||
        !check.rolls.length ||
        check.rolls.some(roll =>
            !Number.isInteger(roll) || roll < 1 || roll > 20)) {
        errors.push('D20 骰面无效。');
    }
    if (!Number.isInteger(check.keptRoll) ||
        !check.rolls?.includes(check.keptRoll)) {
        errors.push('保留骰面无效。');
    }
    const modifierTotal = Number(check.modifiers?.attribute || 0) +
        Number(check.modifiers?.skill || 0) +
        Number(check.modifiers?.equipment || 0) +
        Number(check.modifiers?.proficiency || 0) +
        Number(check.modifiers?.situation || 0);
    if (Number(check.modifiers?.total) !== modifierTotal ||
        Number(check.total) !==
            Number(check.keptRoll) + modifierTotal) {
        errors.push('判定总值与修正不一致。');
    }
    if (check.target?.actorId &&
        !(worldState.actors || []).some(actor =>
            actor.id === check.target.actorId)) {
        errors.push('判定对抗目标不存在。');
    }
    if (
        check.spell &&
        !getSpellDefinition(
            check.spell.spellId,
            worldState,
        )
    ) {
        errors.push(
            '施法判定引用了未知咒语。',
        );
    }
    if (
        check.spellObservation &&
        !getSpellDefinition(
            check.spellObservation
                .spellId,
            worldState,
        )
    ) {
        errors.push(
            '咒语观测引用了未知咒语。',
        );
    }
    if (!['difficulty', 'opposed'].includes(check.hidden?.mode)) {
        errors.push('判定目标模式无效。');
    } else {
        let targetTotal;
        if (check.hidden.mode === 'opposed') {
            const opponentRoll =
                Number(check.hidden.opponentRoll);
            const opponentModifier =
                Number(check.hidden.opponentModifier);
            targetTotal = opponentRoll + opponentModifier;
            if (!Number.isInteger(opponentRoll) ||
                opponentRoll < 1 ||
                opponentRoll > 20 ||
                Number(check.hidden.opponentTotal) !==
                    targetTotal) {
                errors.push('NPC 暗骰总值无效。');
            }
        } else {
            targetTotal =
                Number(check.hidden.difficultyClass);
            if (!Number.isInteger(targetTotal) ||
                targetTotal < 5 ||
                targetTotal > 25) {
                errors.push('隐藏难度无效。');
            }
        }
        if (Number.isFinite(targetTotal) &&
            CHECK_OUTCOMES.includes(check.outcome) &&
            getCheckOutcome(
                Number(check.total),
                targetTotal,
                Number(check.keptRoll),
            ) !== check.outcome) {
            errors.push('判定结果等级与骰值不一致。');
        }
    }
    return { valid: errors.length === 0, errors };
}
