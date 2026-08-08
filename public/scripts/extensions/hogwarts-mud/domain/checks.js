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
        pattern: /(?:推(?!理|测|断)(?:开|倒|到|搡)?|撞(?:开|倒)?|殴打|打(?:他|她|人|向|了|一拳|一下)|踢|抓住|按住|拽|拖|扯|抢|掰|砸|攻击|扑向|绊倒|shove|push|hit|kick|grab|tackle|restrain|trip)/i,
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
        pattern: /(?:躲|闪避|翻越|跳过|跳上|攀|爬|潜行|溜过去|扒窃|偷走|撬锁|追赶|逃脱|dodge|evade|climb|jump|sneak|steal|pickpocket|lockpick|chase|escape)/i,
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
        pattern: /(?:调查|搜索|搜查|仔细检查|仔细观察|偷听|寻找|翻找|辨认|察觉|investigat|search|inspect closely|eavesdrop|notice|spot|track)/i,
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
        pattern: /(?:回忆|推理|解读|破译|计算|研究|分析|认出|recall|deduce|decode|calculate|research|analyse|analyze|identify)/i,
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
        pattern: /(?:抵抗|忍住|集中精神|保持专注|克服恐惧|保持镇定|resist|endure|concentrate|focus|overcome fear|stay calm)/i,
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
        pattern: /(?:说服|欺骗|撒谎|威胁|恐吓|套话|交涉|谈判|魅惑|取悦|persuade|deceive|lie to|threaten|intimidate|negotiate|charm|bluff)/i,
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
        pattern: /(?:施法|念咒|举起魔杖|挥动魔杖|释放咒语|cast(?:ing)? a spell|raise(?:d)? (?:my|the) wand|wave(?:d)? (?:my|the) wand)/i,
    },
]);

const CHECK_DIFFICULTY_DC = Object.freeze({
    narrative: 10,
    standard: 12,
    harsh: 14,
});

const CHECK_ADVANTAGE_PATTERN = /(?:借助|利用.+(?:工具|道具)|有人协助|出其不意|充分准备|with help|using .+ tool|prepared|by surprise)/i;

const CHECK_DISADVANTAGE_PATTERN = /(?:重伤|精疲力尽|惊慌|恐惧得|被束缚|injured|exhausted|panicked|restrained)/i;

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
    const aliases = [];
    if (/(?:男孩|男生|小男孩|小孩)/.test(baseQuery)) {
        aliases.push('boy child first year student');
    }
    if (/(?:女孩|女生|小女孩)/.test(baseQuery)) {
        aliases.push('girl child first year student');
    }
    if (/(?:教授|老师)/.test(baseQuery)) {
        aliases.push('professor teacher');
    }
    if (/(?:店主|老板)/.test(baseQuery)) {
        aliases.push('shopkeeper owner bartender');
    }
    if (/(?:路人|行人)/.test(baseQuery)) {
        aliases.push('passerby shopper stranger');
    }
    if (/(?:爸爸|父亲)/.test(baseQuery)) {
        aliases.push('father guardian');
    }
    const query = `${baseQuery} ${aliases.join(' ')}`;
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
    const role = normalizeCheckText([
        actor?.roleEn,
        actor?.role,
        profile?.roleEn,
        profile?.role,
        profile?.publicDescriptionEn,
    ].filter(Boolean).join(' '));
    let modifier = 0;
    if (/(?:headmistress|professor|auror|master|champion|校长|教授|傲罗|大师)/i.test(role)) {
        modifier = 3;
    } else if (/(?:teacher|guard|officer|adult|shopkeeper|bartender|老师|守卫|成年|店主)/i.test(role)) {
        modifier = 1;
    } else if (/(?:first year|first-year|student|child|boy|girl|一年级|学生|孩子|男孩|女孩)/i.test(role)) {
        modifier = 0;
    }
    if (attribute === 'physique' &&
        /(?:small|frail|stooped|瘦小|虚弱|驼背)/i.test(role)) {
        modifier -= 1;
    }
    return Math.max(-5, Math.min(5, modifier));
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
            )[0]?.spellId,
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
                    `Spellcasting check · ${structuredSpell.incantation}`,
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
            : ACTION_CHECK_RULES.find(item =>
                item.pattern.test(action),
            );
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
    if (selected.id === 'physical_force' &&
        !target &&
        !forced &&
        !/(?:用力|强行|撞开|砸开|破坏|沉重|锁住|卡住|force|break|stuck|heavy)/i.test(action)) {
        return null;
    }
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
        spellCast = null,
    } = {},
) {
    const structuredSpell =
        getSpellDefinition(
            spellCast?.spellId ||
            parseSpellCastDirectives(
                playerAction,
            )[0]?.spellId,
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
            detectActionCheck(
                worldState,
                playerAction,
                {
                    forced,
                    spellCast,
                },
            );
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
    const hasAdvantage =
        CHECK_ADVANTAGE_PATTERN.test(playerAction);
    const statusText = normalizeCheckText(
        (worldState.status || [])
            .map(item => `${item.label} ${item.detail}`)
            .join(' '),
    );
    const hasDisadvantage =
        CHECK_DISADVANTAGE_PATTERN.test(
            `${playerAction} ${statusText}`,
        );
    const rollMode = hasAdvantage === hasDisadvantage
        ? 'normal'
        : hasAdvantage
            ? 'advantage'
            : 'disadvantage';
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
        label: detected.label,
        labelEn: detected.labelEn,
        reasonEn: `Resolve the uncertain player action: ${String(playerAction).slice(0, 240)}`,
        forced: detected.forced,
        attribute: detected.attribute,
        attributeLabel:
            CHECK_ATTRIBUTE_LABELS[detected.attribute].label,
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
            name: detected.target?.name || null,
            visibleDifficulty: null,
        },
        outcome,
        outcomeLabel: CHECK_OUTCOME_LABELS[outcome].label,
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
                    name:
                        detected
                            .spell
                            .name,
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
        )
    ) {
        errors.push(
            '施法判定引用了未知咒语。',
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
