// Extracted from the helpers compatibility facade for Task 4.

import {
    advanceWorldClock,
    WORLD_CLOCK_PATTERN,
} from './time-environment.js';

export const DETERMINISTIC_TIME_POLICY =
    Object.freeze({
        defaultMinutes: 15,
        movementMinutes: 15,
        investigationMinutes: 30,
        extendedActionMinutes: 60,
        instantaneousMagicMinutes: 1,
    });

export function getDeterministicTimePolicy() {
    return {
        ...DETERMINISTIC_TIME_POLICY,
    };
}

const ENGLISH_NUMBER_VALUES =
    Object.freeze({
        zero: 0,
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
        seventy: 70,
        eighty: 80,
        ninety: 90,
    });
const ENGLISH_NUMBER_TOKEN =
    '(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)';
const ENGLISH_NUMBER_EXPRESSION =
    `${ENGLISH_NUMBER_TOKEN}(?:[\\s-]+(?:and[\\s-]+)?${ENGLISH_NUMBER_TOKEN})*`;
const CHINESE_NUMBER_EXPRESSION =
    '[零〇一二两三四五六七八九十百千万]+';
const DURATION_NUMBER_EXPRESSION =
    `(?:\\d+|${CHINESE_NUMBER_EXPRESSION}|${ENGLISH_NUMBER_EXPRESSION})`;
const DURATION_COMPONENT_PATTERN =
    new RegExp(
        `(${DURATION_NUMBER_EXPRESSION})\\s*(?:个\\s*)?(分钟|小时|天|日|minutes?|hours?|days?)`,
        'giu',
    );
const DURATION_UNIT_PATTERN =
    /(?:分钟|小时|天|日|minutes?|hours?|days?)/iu;
const DURATION_SECONDS_PATTERN =
    /(?:秒|seconds?)/iu;
const DURATION_VAGUE_PATTERN =
    /(?:\b(?:about|around|approximately|roughly|nearly|almost|more than|less than)\b|大约|约莫|左右|差不多|将近|超过|不到)/iu;
const DURATION_FRACTION_PATTERN =
    /(?:\d+[.,]\d+|\b(?:half|quarter)\b|半)/iu;
const DURATION_NEGATIVE_PATTERN =
    /(?:-\s*\d+\s*(?:分钟|小时|天|日|minutes?|hours?|days?))/iu;
const NON_ENGLISH_DURATION_NUMBER_EXPRESSION =
    `(?:\\d+|${CHINESE_NUMBER_EXPRESSION})`;
const DURATION_RANGE_PATTERN =
    new RegExp(
        `(?:${DURATION_NUMBER_EXPRESSION}\\s*(?:–|—|to|至|到)\\s*${DURATION_NUMBER_EXPRESSION}|${NON_ENGLISH_DURATION_NUMBER_EXPRESSION}\\s*-\\s*${NON_ENGLISH_DURATION_NUMBER_EXPRESSION})\\s*(?:个\\s*)?(?:分钟|小时|天|日|minutes?|hours?|days?)`,
        'iu',
    );

function parseEnglishInteger(
    value,
) {
    const tokens =
        String(value || '')
            .toLocaleLowerCase()
            .replaceAll('-', ' ')
            .split(/\s+/u)
            .filter(Boolean);
    let total = 0;
    let current = 0;
    for (const token of tokens) {
        if (token === 'and') {
            continue;
        }
        if (
            Object.hasOwn(
                ENGLISH_NUMBER_VALUES,
                token,
            )
        ) {
            current +=
                ENGLISH_NUMBER_VALUES[
                    token
                ];
            continue;
        }
        if (token === 'hundred') {
            current =
                Math.max(
                    1,
                    current,
                ) * 100;
            continue;
        }
        if (token === 'thousand') {
            total +=
                Math.max(
                    1,
                    current,
                ) * 1_000;
            current = 0;
            continue;
        }
        return null;
    }
    return total + current;
}

function parseChineseInteger(
    value,
) {
    const source =
        String(value || '');
    const digits = {
        零: 0,
        〇: 0,
        一: 1,
        二: 2,
        两: 2,
        三: 3,
        四: 4,
        五: 5,
        六: 6,
        七: 7,
        八: 8,
        九: 9,
    };
    if (
        [...source].every(character =>
            Object.hasOwn(
                digits,
                character,
            ))
    ) {
        return Number(
            [...source]
                .map(character =>
                    digits[
                        character
                    ])
                .join(''),
        );
    }
    const units = {
        十: 10,
        百: 100,
        千: 1_000,
    };
    let total = 0;
    let section = 0;
    let number = 0;
    for (const character of source) {
        if (
            Object.hasOwn(
                digits,
                character,
            )
        ) {
            number =
                digits[character];
            continue;
        }
        if (
            Object.hasOwn(
                units,
                character,
            )
        ) {
            section +=
                Math.max(
                    1,
                    number,
                ) *
                units[character];
            number = 0;
            continue;
        }
        if (character === '万') {
            total +=
                (
                    section +
                    number
                ) * 10_000;
            section = 0;
            number = 0;
            continue;
        }
        return null;
    }
    return total +
        section +
        number;
}

function parseDurationInteger(
    value,
) {
    const source =
        String(value || '')
            .trim();
    if (/^\d+$/u.test(source)) {
        return Number(source);
    }
    if (
        new RegExp(
            `^${CHINESE_NUMBER_EXPRESSION}$`,
            'u',
        ).test(source)
    ) {
        return parseChineseInteger(
            source,
        );
    }
    return parseEnglishInteger(
        source,
    );
}

export function parseExactDurationMinutes(
    value,
) {
    const source =
        String(value || '')
            .normalize('NFKC')
            .trim();
    const fail =
        error => ({
            valid: false,
            minutes: null,
            error,
        });
    if (!source) {
        return fail(
            'duration_missing',
        );
    }
    if (
        DURATION_SECONDS_PATTERN
            .test(source)
    ) {
        return fail(
            'seconds_unsupported',
        );
    }
    if (
        DURATION_VAGUE_PATTERN
            .test(source)
    ) {
        return fail(
            'vague_duration',
        );
    }
    if (
        DURATION_FRACTION_PATTERN
            .test(source)
    ) {
        return fail(
            'fractional_duration',
        );
    }
    if (
        DURATION_NEGATIVE_PATTERN
            .test(source) ||
        DURATION_RANGE_PATTERN
            .test(source)
    ) {
        return fail(
            'range_or_negative_duration',
        );
    }
    const components = [
        ...source.matchAll(
            DURATION_COMPONENT_PATTERN,
        ),
    ];
    if (!components.length) {
        return fail(
            DURATION_UNIT_PATTERN
                .test(source)
                ? 'duration_number_unsupported'
                : 'duration_not_found',
        );
    }
    let minutes = 0;
    for (const match of components) {
        const amount =
            parseDurationInteger(
                match[1],
            );
        if (
            !Number.isSafeInteger(
                amount,
            ) ||
            amount <= 0
        ) {
            return fail(
                'duration_number_invalid',
            );
        }
        const unit =
            String(
                match[2] ||
                '',
            ).toLocaleLowerCase();
        const multiplier =
            unit === '天' ||
            unit === '日' ||
            unit.startsWith('day')
                ? 1_440
                : unit === '小时' ||
                    unit.startsWith(
                        'hour',
                    )
                    ? 60
                    : 1;
        minutes +=
            amount *
            multiplier;
    }
    if (
        !Number.isSafeInteger(
            minutes,
        ) ||
        minutes < 1
    ) {
        return fail(
            'duration_total_invalid',
        );
    }
    if (minutes > 10_080) {
        return fail(
            'duration_over_seven_days',
        );
    }
    return {
        valid: true,
        minutes,
        error: '',
    };
}

export function estimateTurnMinutes(_playerAction, timePolicy = {}) {
    const policy = {
        defaultMinutes: Math.max(15, Number(timePolicy.defaultMinutes) || 15),
        movementMinutes: Math.max(15, Number(timePolicy.movementMinutes) || 15),
        investigationMinutes: Math.max(15, Number(timePolicy.investigationMinutes) || 30),
        extendedActionMinutes: Math.max(15, Number(timePolicy.extendedActionMinutes) || 60),
        instantaneousMagicMinutes: Math.max(0, Number(timePolicy.instantaneousMagicMinutes) || 1),
    };
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

const TURN_INTERNAL_RELATIVE_DIRECTIONS =
    new Set([
        'after',
        'later',
        'earlier',
        'ago',
        'past',
    ]);

function isExactClockClaim(
    value,
) {
    const source =
        String(value || '');
    const parts =
        source.split(':');
    if (
        parts.length !== 2 ||
        parts[0].length !== 2 ||
        parts[1].length !== 2 ||
        ![
            ...parts[0],
            ...parts[1],
        ].every(character =>
            character >= '0' &&
            character <= '9')
    ) {
        return false;
    }
    const hour =
        Number(parts[0]);
    const minute =
        Number(parts[1]);
    return hour >= 0 &&
        hour <= 23 &&
        minute >= 0 &&
        minute <= 59;
}

export function validateSceneTemporalConsistency(
    temporalClaims,
    worldState,
    budget,
    allowedSourceText = '',
    narrativeSourceTexts = [],
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
    const source =
        String(allowedSourceText || '')
            .toLocaleLowerCase();
    const narrativeTexts = (
        Array.isArray(
            narrativeSourceTexts,
        )
            ? narrativeSourceTexts
            : []
    ).map(value =>
        String(
            value?.textEn ??
            value ??
            '',
        ));
    const claims =
        Array.isArray(
            temporalClaims,
        )
            ? temporalClaims
            : [];
    const acceptedClaims = [];
    const rejectedClaims = [];
    const elapsedMinutes =
        Math.max(
            0,
            Number(
                budget
                    ?.elapsedMinutes ||
                0,
            ),
        );
    claims.forEach(
        (
            claim,
            index,
        ) => {
            const evidenceText =
                String(
                    claim
                        ?.evidenceText ||
                    '',
                ).trim();
            const sourceAuthorized =
                Boolean(
                    evidenceText &&
                    source.includes(
                        evidenceText
                            .toLocaleLowerCase(),
                    ),
                );
            const evidenceGrounded =
                Boolean(
                    evidenceText &&
                    narrativeTexts
                        .some(text =>
                            text.includes(
                                evidenceText,
                            )),
                );
            let reason = '';
            if (!evidenceGrounded) {
                reason =
                    'evidence_not_in_narrative';
            } else if (
                claim.kind ===
                    'absolute_clock'
            ) {
                if (
                    !isExactClockClaim(
                        claim.clock,
                    )
                ) {
                    reason =
                        'invalid_clock_shape';
                } else if (
                    !sourceAuthorized &&
                    !allowedClockValues
                        .has(
                            claim.clock,
                        )
                ) {
                    reason =
                        'clock_outside_turn';
                }
            } else if (
                claim.kind ===
                    'relative_duration'
            ) {
                const durationMinutes =
                    Number(
                        claim
                            .durationMinutes,
                    );
                if (
                    !sourceAuthorized &&
                    (
                        !TURN_INTERNAL_RELATIVE_DIRECTIONS
                            .has(
                                claim
                                    .relation,
                            ) ||
                        !Number.isInteger(
                            durationMinutes,
                        ) ||
                        durationMinutes <=
                            0 ||
                        durationMinutes >
                            elapsedMinutes
                    )
                ) {
                    reason =
                        'relative_duration_outside_turn';
                }
            } else if (
                ![
                    'named_time',
                    'schedule',
                    'calendar_date',
                ].includes(
                    claim?.kind,
                )
            ) {
                reason =
                    'unknown_claim_kind';
            } else if (
                !sourceAuthorized
            ) {
                reason =
                    'external_time_not_authorized';
            }
            if (reason) {
                rejectedClaims.push({
                    index,
                    evidenceText,
                    kind:
                        String(
                            claim
                                ?.kind ||
                            '',
                        ),
                    reason,
                });
            } else {
                acceptedClaims.push(
                    structuredClone(
                        claim,
                    ),
                );
            }
        },
    );
    if (!rejectedClaims.length) {
        return {
            valid: true,
            errors: [],
            acceptedClaims,
            rejectedClaims,
        };
    }
    return {
        valid: false,
        errors: [
            `现场表演包含未获时间权威支持的结构化 claim（${worldState.clock} 至不早于 ${minimumEndClock}）：${rejectedClaims.map(claim => `${claim.evidenceText || '?'}[${claim.reason}]`).join('、')}`,
        ],
        acceptedClaims,
        rejectedClaims,
    };
}
