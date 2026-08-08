// Extracted from the helpers compatibility facade for Task 4.

import {
    EXTENDED_ACTION_PATTERN,
    INVESTIGATION_ACTION_PATTERN,
    MAGIC_ACTION_PATTERN,
    MOVEMENT_ACTION_PATTERN,
} from './spatial-foundation.js';

import {
    advanceWorldClock,
    WORLD_CLOCK_PATTERN,
} from './time-environment.js';

export function estimateTurnMinutes(playerAction, timePolicy = {}) {
    const action = String(playerAction || '');
    const policy = {
        defaultMinutes: Math.max(15, Number(timePolicy.defaultMinutes) || 15),
        movementMinutes: Math.max(15, Number(timePolicy.movementMinutes) || 15),
        investigationMinutes: Math.max(15, Number(timePolicy.investigationMinutes) || 30),
        extendedActionMinutes: Math.max(15, Number(timePolicy.extendedActionMinutes) || 60),
        instantaneousMagicMinutes: Math.max(0, Number(timePolicy.instantaneousMagicMinutes) || 1),
    };
    if (MAGIC_ACTION_PATTERN.test(action)) {
        return policy.instantaneousMagicMinutes;
    }
    if (EXTENDED_ACTION_PATTERN.test(action)) {
        return policy.extendedActionMinutes;
    }
    if (INVESTIGATION_ACTION_PATTERN.test(action)) {
        return policy.investigationMinutes;
    }
    if (MOVEMENT_ACTION_PATTERN.test(action)) {
        return policy.movementMinutes;
    }
    return policy.defaultMinutes;
}

export function createTurnPerformanceBudget(
    playerAction,
    timePolicy = {},
    {
        activeNamedActorCount = 0,
        adjudicatedMinutes =
        undefined,
    } = {},
) {
    const suppliedMinutes =
        Number(
            adjudicatedMinutes,
        );
    const elapsedMinutes =
        Number.isInteger(
            suppliedMinutes,
        ) &&
        suppliedMinutes >= 0 &&
        suppliedMinutes <= 10_080
            ? suppliedMinutes
            : estimateTurnMinutes(
                playerAction,
                timePolicy,
            );
    const baseMinimumWords = elapsedMinutes < 15
        ? 60
        : Math.min(650, 180 + elapsedMinutes * 4);
    const normalizedActorCount =
        Math.max(
            0,
            Number(
                activeNamedActorCount,
            ) || 0,
        );
    const ensembleActorCount =
        elapsedMinutes >= 15
            ? Math.max(
                0,
                normalizedActorCount -
                    3,
            )
            : 0;
    const minimumWords =
        Math.min(
            800,
            baseMinimumWords +
                ensembleActorCount *
                    60,
        );
    const maximumWords =
        Math.min(
            1000,
            baseMinimumWords +
                320 +
                ensembleActorCount *
                    100,
        );
    return {
        elapsedMinutes,
        minimumWords,
        maximumWords,
        ...(ensembleActorCount > 0
            ? {
                activeNamedActorCount:
                    normalizedActorCount,
                ensemble: true,
                minimumSegments:
                    Math.min(
                        8,
                        4 +
                        Math.ceil(
                            ensembleActorCount /
                                2,
                        ),
                    ),
                maximumSegments: 20,
                primaryProgressionShare:
                    0.4,
                maximumIndividuatedSecondaryActors:
                    2,
            }
            : {}),
    };
}

export function resolveTurnElapsedMinutes(
    performance,
    budget,
) {
    const minimumMinutes = Math.max(
        0,
        Number(budget?.elapsedMinutes) || 0,
    );
    if (minimumMinutes < 15) {
        return minimumMinutes;
    }
    const wordCount = (
        performance?.segments || []
    )
        .map(segment =>
            String(segment?.textEn || '').trim())
        .filter(Boolean)
        .join(' ')
        .split(/\s+/)
        .filter(Boolean)
        .length;
    const softWordCapacity = Math.ceil(
        Math.max(
            1,
            Number(budget?.maximumWords) || 1,
        ) * 1.3,
    );
    if (wordCount <= softWordCapacity) {
        return minimumMinutes;
    }
    const overflowBlocks = Math.ceil(
        (wordCount - softWordCapacity) /
        softWordCapacity,
    );
    return minimumMinutes +
        overflowBlocks * 15;
}

const PRECISE_TEMPORAL_CLAIM_PATTERNS = [
    /\b(?:since|at|by|before|after|until|till)\s+(?:noon|midnight|dawn|dusk|sunrise|sunset|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\b(?:shop|store|bank|pub|office|business|premises|doors?)\s+(?:clos(?:e|es|ed|ing)|opens?|opening)\s+(?:at|in|within|by|before|after)\b/gi,
    /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+o['’]?clock\b/gi,
    /\b(?:breakfast|lunch|dinner|supper|tea)\s+(?:at|by)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2})\b/gi,
    /\b(?:train|express|coach|bus|ferry|boat|ship|flight|service)\s+(?:departs?|leaves?|arrives?|boards?|starts?)\s+(?:at\s+)?(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2}(?::[0-5]\d)?|noon|midnight)\b/gi,
    /\b(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty-first|twenty-second|twenty-third|twenty-fourth|twenty-fifth|twenty-sixth|twenty-seventh|twenty-eighth|twenty-ninth|thirtieth|thirty-first|\d{1,2}(?:st|nd|rd|th)?)\s+of\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(?:the\s+)?(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty-first|twenty-second|twenty-third|twenty-fourth|twenty-fifth|twenty-sixth|twenty-seventh|twenty-eighth|twenty-ninth|thirtieth|thirty-first|\d{1,2}(?:st|nd|rd|th)?)\b/gi,
];

const RELATIVE_TEMPORAL_CLAIM_PATTERN =
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|\d+)\s+(minutes?|hours?)\s+(before|after|until|till|later|earlier|ago|past)\b/gi;

const TEMPORAL_NUMBER_WORDS = Object.freeze({
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
});

const TURN_INTERNAL_RELATIVE_DIRECTIONS =
    new Set([
        'after',
        'later',
        'earlier',
        'ago',
        'past',
    ]);

export function validateSceneTemporalConsistency(
    payload,
    worldState,
    budget,
    allowedSourceText = '',
) {
    const startMatch = WORLD_CLOCK_PATTERN.exec(
        String(worldState?.clock || ''),
    );
    if (!startMatch) {
        return { valid: true, errors: [] };
    }
    const minimumEndClock = advanceWorldClock(
        worldState.clock,
        Number(budget?.elapsedMinutes) || 0,
    );
    const endMatch = WORLD_CLOCK_PATTERN.exec(
        minimumEndClock,
    );
    const allowedClockValues = new Set([
        `${startMatch[4]}:${startMatch[5]}`,
        ...(endMatch
            ? [`${endMatch[4]}:${endMatch[5]}`]
            : []),
    ]);
    const corpus = [
        payload?.publicEventEn,
        payload?.sceneProgression?.summaryEn,
        ...(payload?.segments || []).map(
            segment => segment?.textEn,
        ),
        ...(payload?.actorUpdates || []).flatMap(
            update => [
                update?.currentActivityEn,
                update?.impressionOfPlayerEn,
                update?.memoryUpdate?.summaryEn,
            ],
        ),
    ].filter(Boolean).join(' ');
    const source = String(allowedSourceText || '')
        .toLocaleLowerCase();
    const unsupported = new Set();
    for (const claim of corpus.match(
        /\b(?:[01]\d|2[0-3]):[0-5]\d\b/g,
    ) || []) {
        if (!allowedClockValues.has(claim) &&
            !source.includes(claim.toLocaleLowerCase())) {
            unsupported.add(claim);
        }
    }
    for (
        const match of corpus.matchAll(
            RELATIVE_TEMPORAL_CLAIM_PATTERN,
        )
    ) {
        const claim =
            String(match[0] || '')
                .trim();
        if (
            !claim ||
            source.includes(
                claim.toLocaleLowerCase(),
            )
        ) {
            continue;
        }
        const amountText =
            String(match[1] || '')
                .toLocaleLowerCase();
        const amount =
            /^\d+$/.test(amountText)
                ? Number(amountText)
                : TEMPORAL_NUMBER_WORDS[
                    amountText
                ] || 0;
        const durationMinutes =
            amount *
            (
                /^hours?$/i.test(
                    String(
                        match[2] ||
                        '',
                    ),
                )
                    ? 60
                    : 1
            );
        const direction =
            String(match[3] || '')
                .toLocaleLowerCase();
        const withinAuthorizedTurn =
            TURN_INTERNAL_RELATIVE_DIRECTIONS
                .has(direction) &&
            durationMinutes > 0 &&
            durationMinutes <=
                Math.max(
                    0,
                    Number(
                        budget
                            ?.elapsedMinutes ||
                        0,
                    ),
                );
        if (!withinAuthorizedTurn) {
            unsupported.add(claim);
        }
    }
    PRECISE_TEMPORAL_CLAIM_PATTERNS.forEach(pattern => {
        for (const match of corpus.matchAll(pattern)) {
            const claim = String(match[0] || '').trim();
            if (claim &&
                !source.includes(
                    claim.toLocaleLowerCase(),
                )) {
                unsupported.add(claim);
            }
        }
    });
    if (!unsupported.size) {
        return { valid: true, errors: [] };
    }
    return {
        valid: false,
        errors: [
            `现场表演违反系统时间权威（${worldState.clock} 至不早于 ${minimumEndClock}）：不得编造精确时刻、营业时间、外部倒计时或超出本回合跨度的相对时间：${[...unsupported].join('、')}`,
        ],
    };
}
