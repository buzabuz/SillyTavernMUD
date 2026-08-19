import {
    getSpellDefinition,
    getSpellProficiency,
    normalizeKnownSpell,
    normalizeSpellbook,
    parseSpellCastDirectives,
    SPELL_CATALOG_VERSION,
} from '../spell-catalog.js';
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
    _worldState,
    _playerAction,
) {
    return null;
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
    _text,
) {
    return 'experiment';
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
    const chatLength =
        Array.isArray(chat)
            ? chat.length
            : 0;
    next.spellbook.lastScannedMessageId =
        Math.max(
            startIndex - 1,
            chatLength - 1,
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
    const spellObservation =
        transaction
            .checkResolution
            ?.spellObservation ||
        null;
    if (
        !casts.length &&
        !spellObservation
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
        'the current scene';
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
                    source: 'experiment',
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
