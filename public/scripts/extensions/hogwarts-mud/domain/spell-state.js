import {
    findSpellReferences,
    getSpellDefinition,
    getSpellProficiency,
    normalizeKnownSpell,
    normalizeSpellbook,
    parseSpellCastDirectives,
    SPELL_CATALOG_VERSION,
} from '../spell-catalog.js';
const SPELL_TEACHING_PATTERN =
    /(?:教学|教会|讲解|解释|说明|示范|演示|练习|念出|说出|写下|尝试这个咒语|跟着念|照着第?\s*\d+\s*页|teach|taught|explain|demonstrat|practi[cs]e|pronounc|try (?:it|this spell)|repeat after|writ(?:e|es|ten).{0,40}(?:board|blackboard)|page\s+\d+)/iu;
const SPELL_SELF_STUDY_PATTERN =
    /(?:自学|学习|研究|阅读|照着书|查阅|笔记|偷偷学|self[- ]?study|learn|study|research|read(?:ing)?|from (?:a|the) book|notes?)/iu;
const SPELL_OBSERVATION_INTENT_PATTERN =
    /(?:(?:看清|辨认|认出|观察|查看|阅读|解读|研究|学习|记住|理解|identify|observe|inspect|read|study|learn|understand).{0,120}(?:咒语|咒文|法术|变形术|incantation|spell|transfiguration)|(?:咒语|咒文|法术|变形术|incantation|spell|transfiguration).{0,120}(?:看清|辨认|认出|观察|查看|阅读|解读|研究|学习|记住|理解|identify|observe|inspect|read|study|learn|understand))/iu;
const SPELL_SOURCE_PRIORITY =
    Object.freeze({
        experiment: 0,
        prior_schooling: 1,
        self_study: 2,
        class: 3,
        special_instruction: 4,
    });
const SPELL_OUTCOME_XP =
    Object.freeze({
        catastrophic_failure: 1,
        failure: 2,
        success_with_cost: 5,
        success: 8,
        critical_success: 12,
    });
const SPELL_OBSERVATION_LEARNED_OUTCOMES =
    new Set([
        'success_with_cost',
        'success',
        'critical_success',
    ]);

export function resolveSpellObservation(
    worldState,
    playerAction,
) {
    const action =
        String(playerAction || '');
    if (
        !SPELL_OBSERVATION_INTENT_PATTERN
            .test(action)
    ) {
        return null;
    }
    const scene =
        worldState?.scene ||
        {};
    const intent =
        scene.nextSceneIntent ||
        {};
    const actionReferences =
        findSpellReferences(
            action,
        );
    const contextValues = [
        scene.nameEn,
        scene.name,
        scene.summaryEn,
        scene.summary,
        intent.titleEn,
        intent.title,
        intent.summaryEn,
        intent.summary,
        intent.triggerEn,
        intent.trigger,
    ].filter(Boolean);
    const contextReferences =
        findSpellReferences(
            contextValues.join('\n'),
        );
    const spell =
        actionReferences[0] ||
        contextReferences[0];
    if (!spell) {
        return null;
    }
    return {
        version: 1,
        spellId:
            spell.id,
        name:
            spell.name,
        nameEn:
            spell.nameEn,
        incantation:
            spell.incantation,
        incantationKnown:
            spell.incantationKnown,
        source:
            actionReferences.length
                ? 'player_reference'
                : 'scene_instruction',
        evidenceText:
            actionReferences.length
                ? action.slice(0, 500)
                : String(
                    contextValues.find(value =>
                        findSpellReferences(
                            value,
                        ).some(reference =>
                            reference.id ===
                            spell.id)) ||
                    '',
                ).slice(0, 500),
    };
}

function createLearnedSpellEntry(
    spellId,
    {
        source = 'experiment',
        detail = '',
        clock = '',
        turn = 0,
        proficiencyXp = 0,
        sortOrder = 0,
    } = {},
) {
    return normalizeKnownSpell({
        spellId,
        learnedSource:
            source,
        learnedSourceDetail:
            detail,
        firstLearnedClock:
            clock,
        firstLearnedTurn:
            turn,
        lastPracticedClock:
            '',
        lastPracticedTurn:
            0,
        attempts: 0,
        successes: 0,
        criticalSuccesses: 0,
        failures: 0,
        proficiencyXp,
        sortOrder,
    });
}

function upsertLearnedSpell(
    spellbook,
    spellId,
    {
        source = 'experiment',
        detail = '',
        clock = '',
        turn = 0,
        proficiencyXp = 0,
    } = {},
) {
    const spell =
        getSpellDefinition(
            spellId,
            spellbook,
        );
    if (!spell) {
        return null;
    }
    spellbook.known ??= [];
    const index =
        spellbook.known
            .findIndex(entry =>
                entry.spellId ===
                spell.id);
    if (index < 0) {
        const created =
            createLearnedSpellEntry(
                spell.id,
                {
                    source,
                    detail,
                    clock,
                    turn,
                    proficiencyXp,
                    sortOrder:
                        spellbook.known
                            .length,
                },
            );
        spellbook.known.push(
            created,
        );
        spellbook.lastUpdatedClock =
            clock ||
            spellbook
                .lastUpdatedClock;
        return created;
    }
    const existing =
        spellbook.known[index];
    const existingPriority =
        SPELL_SOURCE_PRIORITY[
            existing.learnedSource
        ] ??
        0;
    const nextPriority =
        SPELL_SOURCE_PRIORITY[
            source
        ] ??
        0;
    const next =
        normalizeKnownSpell({
            ...existing,
            ...(nextPriority >
                existingPriority
                ? {
                    learnedSource:
                        source,
                    learnedSourceDetail:
                        detail ||
                        existing
                            .learnedSourceDetail,
                }
                : {}),
            firstLearnedClock:
                existing
                    .firstLearnedClock ||
                clock,
            firstLearnedTurn:
                existing
                    .firstLearnedTurn ||
                turn,
            proficiencyXp:
                Math.max(
                    Number(
                        existing
                            .proficiencyXp ||
                        0,
                    ),
                    Number(
                        proficiencyXp ||
                        0,
                    ),
                ),
        });
    spellbook.known[index] =
        next;
    return next;
}

function getSpellLearningSource(
    text,
) {
    const source =
        String(text || '');
    if (
        SPELL_SELF_STUDY_PATTERN
            .test(source)
    ) {
        return 'self_study';
    }
    return 'experiment';
}

function getSpellTextFromMessage(
    message,
) {
    const mud =
        message?.extra
            ?.hogwartsMud;
    return [
        mud?.sourceEn,
        message?.mes,
        ...(
            mud?.segments ||
            []
        ).map(segment =>
            segment.textEn),
    ]
        .filter(Boolean)
        .join('\n');
}

export function migrateSpellbookState(
    worldState,
    chat = [],
) {
    if (!worldState) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(
            worldState,
        );
    const normalized =
        normalizeSpellbook(
            next.spellbook,
            {
                grade:
                    next.campaign
                        ?.grade ||
                    1,
                clock:
                    next.clock ||
                    '',
            },
        );
    const previous =
        JSON.stringify(
            {
                spellbook:
                    next.spellbook ||
                    null,
                pendingSpellProposals:
                    next
                        .pendingSpellProposals ||
                    [],
                spellProposalDecisions:
                    next
                        .spellProposalDecisions ||
                    [],
            },
        );
    next.spellbook =
        normalized;
    next.pendingSpellProposals =
        Array.isArray(
            next.pendingSpellProposals,
        )
            ? next
                .pendingSpellProposals
            : [];
    next.spellProposalDecisions =
        Array.isArray(
            next.spellProposalDecisions,
        )
            ? next
                .spellProposalDecisions
            : [];
    const startIndex =
        Math.max(
            0,
            Number(
                normalized
                    .lastScannedMessageId ??
                -1,
            ) +
                1,
        );
    (
        Array.isArray(chat)
            ? chat
            : []
    )
        .slice(startIndex)
        .forEach(
            (
                message,
                offset,
            ) => {
                const messageId =
                    startIndex +
                    offset;
                const text =
                    getSpellTextFromMessage(
                        message,
                    );
                if (
                    message
                        ?.is_user
                ) {
                    parseSpellCastDirectives(
                        text,
                        next,
                    ).forEach(cast => {
                        const source =
                            getSpellLearningSource(
                                text,
                            );
                        upsertLearnedSpell(
                            next.spellbook,
                            cast.spellId,
                            {
                                source,
                                detail:
                                    source ===
                                        'self_study'
                                        ? 'Learned through the player\'s own study.'
                                        : 'Discovered through the player\'s own experiment.',
                                clock:
                                    next.clock ||
                                    '',
                                turn:
                                    next.turn
                                        ?.count ||
                                    0,
                                proficiencyXp:
                                    source ===
                                        'self_study'
                                        ? 5
                                        : 1,
                            },
                        );
                    });
                } else if (
                    SPELL_TEACHING_PATTERN
                        .test(text)
                ) {
                    findSpellReferences(
                        text,
                        next,
                    ).forEach(spell => {
                        upsertLearnedSpell(
                            next.spellbook,
                            spell.id,
                            {
                                source:
                                    'class',
                                detail:
                                    `Taught or demonstrated in ${next.scene?.nameEn || 'class'}.`,
                                clock:
                                    next.clock ||
                                    '',
                                turn:
                                    next.turn
                                        ?.count ||
                                    0,
                                proficiencyXp:
                                    8,
                            },
                        );
                    });
                }
                next.spellbook
                    .lastScannedMessageId =
                    messageId;
            },
        );
    next.spellbook.version =
        SPELL_CATALOG_VERSION;
    return {
        state: next,
        changed:
            previous !==
            JSON.stringify({
                spellbook:
                    next.spellbook,
                pendingSpellProposals:
                    next
                        .pendingSpellProposals ||
                    [],
                spellProposalDecisions:
                    next
                        .spellProposalDecisions ||
                    [],
            }),
    };
}

export function getKnownSpell(
    worldState,
    spellId,
) {
    return (
        worldState
            ?.spellbook
            ?.known ||
        []
    ).find(entry =>
        entry.spellId ===
        spellId) ||
        null;
}

export function getSpellProficiencyModifier(
    worldState,
    spellId,
) {
    const known =
        getKnownSpell(
            worldState,
            spellId,
        );
    if (!known) {
        return -2;
    }
    return getSpellProficiency(
        known.proficiencyXp,
    ).modifier;
}

export function settleSpellProgress(
    worldState,
    playerAction,
    transaction = {},
) {
    const casts =
        Array.isArray(
            transaction
                .spellCasts,
        ) &&
        transaction
            .spellCasts
            .length
            ? transaction
                .spellCasts
            : parseSpellCastDirectives(
                playerAction,
                worldState,
            );
    const narrativeText = [
        transaction.publicEventEn,
        ...(
            transaction.segments ||
            []
        ).map(segment =>
            segment.textEn),
    ]
        .filter(Boolean)
        .join('\n');
    const narrativeDirectives =
        parseSpellCastDirectives(
            narrativeText,
            worldState,
        );
    const spellObservation =
        transaction
            .checkResolution
            ?.spellObservation ||
        null;
    if (
        !casts.length &&
        !narrativeDirectives
            .length &&
        !spellObservation &&
        !SPELL_TEACHING_PATTERN
            .test(narrativeText)
    ) {
        return worldState;
    }
    const next =
        structuredClone(
            worldState,
        );
    next.spellbook =
        normalizeSpellbook(
            next.spellbook,
            {
                grade:
                    next.campaign
                        ?.grade ||
                    1,
                clock:
                    next.clock ||
                    '',
            },
        );
    const sceneLabel =
        next.scene?.nameEn ||
        next.scene?.name ||
        'the current scene';
    const classObservation =
        /(?:class|lesson|教室|课堂|课)/iu
            .test(sceneLabel);
    narrativeDirectives
        .forEach(cast => {
            const spell =
                getSpellDefinition(
                    cast.spellId,
                    next,
                );
            if (!spell) {
                return;
            }
            upsertLearnedSpell(
                next.spellbook,
                spell.id,
                {
                    source:
                        classObservation
                            ? 'class'
                            : 'self_study',
                    detail:
                        `Observed ${spell.incantation || spell.nameEn} during ${sceneLabel}.`,
                    clock:
                        next.clock,
                    turn:
                        next.turn
                            ?.count ||
                        0,
                    proficiencyXp: 1,
                },
            );
        });
    if (spellObservation) {
        const spell =
            getSpellDefinition(
                spellObservation
                    .spellId,
                next,
            );
        if (
            spell &&
            SPELL_OBSERVATION_LEARNED_OUTCOMES
                .has(
                    transaction
                        .checkResolution
                        ?.outcome,
                )
        ) {
            const detail =
                `Actively observed ${spell.incantation} during ${sceneLabel}.`;
            upsertLearnedSpell(
                next.spellbook,
                spell.id,
                {
                    source:
                        classObservation
                            ? 'class'
                            : 'self_study',
                    detail,
                    clock:
                        next.clock,
                    turn:
                        next.turn
                            ?.count ||
                        0,
                    proficiencyXp:
                        SPELL_OUTCOME_XP[
                            transaction
                                .checkResolution
                                ?.outcome
                        ] ??
                        1,
                },
            );
        }
    }
    findSpellReferences(
        narrativeText,
        next,
    ).forEach(spell => {
        if (
            SPELL_TEACHING_PATTERN
                .test(narrativeText)
        ) {
            upsertLearnedSpell(
                next.spellbook,
                spell.id,
                {
                    source:
                        'class',
                    detail:
                        `Taught or demonstrated in ${next.scene?.nameEn || 'class'}.`,
                    clock:
                        next.clock,
                    turn:
                        next.turn
                            ?.count ||
                        0,
                    proficiencyXp:
                        8,
                },
            );
        }
    });
    casts.forEach(cast => {
        const existing =
            getKnownSpell(
                next,
                cast.spellId,
            );
        const source =
            existing
                ?.learnedSource ||
            getSpellLearningSource(
                playerAction,
            );
        const learned =
            upsertLearnedSpell(
                next.spellbook,
                cast.spellId,
                {
                    source,
                    detail:
                        source ===
                            'class'
                            ? `Practised during ${next.scene?.nameEn || 'class'}.`
                            : source ===
                                'self_study'
                                ? 'Learned through the player\'s own study.'
                                : 'Discovered through the player\'s own experiment.',
                    clock:
                        next.clock,
                    turn:
                        next.turn
                            ?.count ||
                        0,
                    proficiencyXp:
                        source ===
                            'class'
                            ? 8
                            : source ===
                                'self_study'
                                ? 5
                                : 1,
                },
            );
        if (!learned) {
            return;
        }
        const outcome =
            transaction
                .checkResolution
                ?.spell
                ?.spellId ===
                cast.spellId
                ? transaction
                    .checkResolution
                    .outcome
                : null;
        const xpGain =
            SPELL_OUTCOME_XP[
                outcome
            ] ??
            1;
        const success =
            [
                'success_with_cost',
                'success',
                'critical_success',
            ].includes(
                outcome,
            );
        const updated =
            normalizeKnownSpell({
                ...learned,
                lastPracticedClock:
                    next.clock,
                lastPracticedTurn:
                    next.turn
                        ?.count ||
                    0,
                attempts:
                    learned.attempts +
                    1,
                successes:
                    learned.successes +
                    (
                        success
                            ? 1
                            : 0
                    ),
                criticalSuccesses:
                    learned
                        .criticalSuccesses +
                    (
                        outcome ===
                            'critical_success'
                            ? 1
                            : 0
                    ),
                failures:
                    learned.failures +
                    (
                        success
                            ? 0
                            : 1
                    ),
                proficiencyXp:
                    learned
                        .proficiencyXp +
                    xpGain,
            });
        const index =
            next.spellbook
                .known
                .findIndex(entry =>
                    entry.spellId ===
                    cast.spellId);
        next.spellbook
            .known[index] =
            updated;
    });
    next.spellbook.lastUpdatedClock =
        next.clock;
    return next;
}
