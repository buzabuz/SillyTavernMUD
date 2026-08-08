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
    /(?:教学|教会|讲解|示范|演示|练习|尝试这个咒语|跟着念|照着第?\s*\d+\s*页|teach|taught|demonstrat|practi[cs]e|try (?:it|this spell)|repeat after|writ(?:e|es|ten).{0,40}(?:board|blackboard)|page\s+\d+)/iu;
const SPELL_SELF_STUDY_PATTERN =
    /(?:自学|学习|研究|阅读|照着书|查阅|笔记|偷偷学|self[- ]?study|learn|study|research|read(?:ing)?|from (?:a|the) book|notes?)/iu;
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
            next.spellbook ||
            null,
        );
    next.spellbook =
        normalized;
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
            JSON.stringify(
                next.spellbook,
            ),
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
    if (
        !casts.length &&
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
    findSpellReferences(
        narrativeText,
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
