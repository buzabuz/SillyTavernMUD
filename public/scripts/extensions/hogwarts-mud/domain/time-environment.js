// Extracted from the helpers compatibility facade for Task 4.

import {
    getLocalMapDefinition,
    getMapRooms,
} from './map-access.js';

export const WORLD_CLOCK_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) · (\d{2}):(\d{2})$/;

export function advanceWorldClock(clock, elapsedMinutes) {
    const match = WORLD_CLOCK_PATTERN.exec(String(clock || ''));
    if (!match) {
        throw new Error('世界时钟格式无效。');
    }
    const [, year, month, day, hour, minute] = match;
    const value = new Date(Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
    ));
    value.setUTCMinutes(value.getUTCMinutes() + Number(elapsedMinutes || 0));
    const pad = number => String(number).padStart(2, '0');
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())} · ` +
        `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`;
}

export const BEHAVIORAL_ENVIRONMENT_VERSION = 1;

const WEATHER_PATTERNS = Object.freeze([
    {
        condition: 'overcast',
        conditionEn: 'Low overcast',
        precipitationEn: 'None',
        windEn: 'Light breeze',
        visibilityEn: 'Good',
    },
    {
        condition: 'light_rain',
        conditionEn: 'Light rain',
        precipitationEn: 'Intermittent light rain',
        windEn: 'Light breeze',
        visibilityEn: 'Moderate',
    },
    {
        condition: 'mist',
        conditionEn: 'Highland mist',
        precipitationEn: 'Fine moisture',
        windEn: 'Calm',
        visibilityEn: 'Limited',
    },
    {
        condition: 'steady_rain',
        conditionEn: 'Steady rain',
        precipitationEn: 'Continuous rain',
        windEn: 'Moderate wind',
        visibilityEn: 'Reduced',
    },
    {
        condition: 'clear_spells',
        conditionEn: 'Broken cloud with clear spells',
        precipitationEn: 'None',
        windEn: 'Light breeze',
        visibilityEn: 'Good',
    },
    {
        condition: 'windy',
        conditionEn: 'Windy and overcast',
        precipitationEn: 'Occasional drizzle',
        windEn: 'Strong wind',
        visibilityEn: 'Good',
    },
]);

function stableEnvironmentHash(value) {
    let hash = 2166136261;
    for (
        const character of String(value || '')
    ) {
        hash ^= character
            .codePointAt(0);
        hash = Math.imul(
            hash,
            16777619,
        );
    }
    return hash >>> 0;
}

function getEnvironmentPeriod(hour) {
    if (hour < 5) {
        return 'deep_night';
    }
    if (hour < 7) {
        return 'dawn';
    }
    if (hour < 9) {
        return 'early_morning';
    }
    if (hour < 12) {
        return 'morning';
    }
    if (hour < 14) {
        return 'midday';
    }
    if (hour < 18) {
        return 'afternoon';
    }
    if (hour < 21) {
        return 'evening';
    }
    return 'late_night';
}

export function buildBehavioralEnvironment(
    worldState = {},
    clock = worldState.clock,
) {
    const match =
        WORLD_CLOCK_PATTERN.exec(
            String(clock || ''),
        );
    if (!match) {
        return {
            version:
                BEHAVIORAL_ENVIRONMENT_VERSION,
            clock: String(clock || ''),
            source:
                'deterministic_local_policy',
            period: 'unknown',
            daylight: 'unknown',
            exposure: 'unknown',
            curfewActive: false,
            sleepPressure: 'unknown',
            weather: null,
            behavioralConstraintsEn: [
                'Use only explicit scene evidence for time and weather behavior.',
            ],
        };
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const mapId = String(
        worldState.map
            ?.activeMapId ||
        worldState.scene?.mapId ||
        '',
    );
    const roomId = String(
        worldState.map
            ?.currentLocalNodeId ||
        worldState.scene?.roomId ||
        '',
    );
    const map =
        getLocalMapDefinition(
            mapId,
            worldState.map || {},
        );
    const room = map
        ? getMapRooms(
            map,
            worldState.map || {},
        ).find(item =>
            item.id === roomId)
        : null;
    const placeText = [
        roomId,
        room?.nameEn,
        room?.kind,
        ...(room?.tags || []),
    ]
        .filter(Boolean)
        .join(' ');
    const exposure =
        /(?:garden|grounds|courtyard|street|alley|shore|platform|exterior|forest|lake|path|road|village|yard|jetty|bridge|outdoor)/iu
            .test(placeText)
            ? 'outdoor'
            : 'indoor';
    const regionId =
        /(?:hogwarts|hogsmeade)/iu
            .test(mapId)
            ? 'scottish_highlands'
            : /(?:diagon|knockturn|kings_cross|ministry|st_mungo)/iu
                .test(mapId)
                ? 'london'
                : 'britain';
    const weatherSlot =
        Math.floor(hour / 6);
    const slotKey = [
        year,
        String(month)
            .padStart(2, '0'),
        String(day)
            .padStart(2, '0'),
        weatherSlot,
        regionId,
    ].join(':');
    const weather =
        WEATHER_PATTERNS[
            stableEnvironmentHash(
                slotKey,
            ) %
            WEATHER_PATTERNS.length
        ];
    const baseTemperatureByMonth = [
        4,
        5,
        7,
        10,
        13,
        16,
        18,
        18,
        14,
        10,
        7,
        5,
    ];
    const timeTemperatureOffset =
        hour < 6
            ? -3
            : hour < 10
                ? -1
                : hour < 18
                    ? 2
                    : 0;
    const temperatureC =
        baseTemperatureByMonth[
            month - 1
        ] +
        timeTemperatureOffset +
        (
            regionId ===
                'scottish_highlands'
                ? -2
                : 0
        );
    const sunriseByMonth = [
        8,
        7,
        6,
        5,
        4,
        4,
        4,
        5,
        6,
        7,
        8,
        8,
    ];
    const sunsetByMonth = [
        16,
        17,
        18,
        20,
        21,
        22,
        22,
        21,
        19,
        18,
        16,
        16,
    ];
    const daylight =
        hour >=
            sunriseByMonth[
                month - 1
            ] &&
        hour <
            sunsetByMonth[
                month - 1
            ]
            ? 'daylight'
            : 'dark';
    const period =
        getEnvironmentPeriod(hour);
    const atHogwarts =
        /hogwarts/iu.test(
            mapId,
        );
    const curfewActive =
        atHogwarts &&
        (
            hour >= 21 ||
            hour < 6
        );
    const sleepPressure =
        hour < 5
            ? 'high'
            : hour < 7 ||
                hour >= 22
                ? 'moderate'
                : 'low';
    const constraints = [
        `Treat ${String(clock)} as ${period.replaceAll('_', ' ')} with ${daylight}; it is a behavioral condition, not a decorative label.`,
    ];
    if (sleepPressure === 'high') {
        constraints.push(
            'Most school-age characters should be asleep, preparing to sleep, or showing a concrete reason for remaining active.',
        );
    } else if (
        sleepPressure ===
            'moderate'
    ) {
        constraints.push(
            'School-age characters should show plausible tiredness, bedtime preparation, or an existing reason to stay active.',
        );
    }
    if (curfewActive) {
        constraints.push(
            'Hogwarts student curfew is active; corridor movement should be limited, quiet, supervised, or carry an observable risk of intervention.',
        );
    }
    constraints.push(
        exposure === 'outdoor'
            ? `People are exposed to ${weather.conditionEn.toLocaleLowerCase()}, ${weather.windEn.toLocaleLowerCase()}, and about ${temperatureC}°C; reflect this through clothing, shelter, pace, visibility, or physical comfort when relevant.`
            : `The ${weather.conditionEn.toLocaleLowerCase()} weather and about ${temperatureC}°C remain outside; reflect them only through windows, sound, draughts, wet arrivals, heating, clothing, or plans when relevant.`,
    );
    constraints.push(
        'Current scene, location, and environment override a daily directive whose activity or location has already passed.',
        'Embody only materially relevant effects; do not recite the environment as a checklist.',
    );
    return {
        version:
            BEHAVIORAL_ENVIRONMENT_VERSION,
        source:
            'deterministic_local_policy',
        clock: String(clock),
        slotKey,
        regionId,
        period,
        localTime: {
            year,
            month,
            day,
            hour,
            minute,
        },
        daylight,
        exposure,
        curfewActive,
        sleepPressure,
        weather: {
            ...weather,
            temperatureC,
        },
        behavioralConstraintsEn:
            constraints,
    };
}

export function worldClockToEpochMinutes(clock) {
    const match = WORLD_CLOCK_PATTERN.exec(
        String(clock || ''),
    );
    if (!match) return null;
    return Math.floor(
        Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            Number(match[4]),
            Number(match[5]),
        ) / 60000,
    );
}

export const TEMPORAL_STATE_VERSION = 1;

export const WORLD_CHANGE_MIN_DAYS = 7;

export const GOSSIP_CHANNEL_VALUES =
    Object.freeze([
        'classmates',
        'family',
        'house',
        'staff',
        'local',
        'public',
    ]);

export const WORLD_NEWS_CATEGORY_VALUES =
    Object.freeze([
        'ministry',
        'britain',
        'hogwarts',
        'local',
        'international',
    ]);

export function getWorldClockGapMinutes(
    fromClock,
    toClock,
) {
    const fromMinutes =
        worldClockToEpochMinutes(fromClock);
    const toMinutes =
        worldClockToEpochMinutes(toClock);
    return fromMinutes === null ||
        toMinutes === null
        ? null
        : toMinutes - fromMinutes;
}

export function reconcileTemporalState(
    worldState,
    sceneOpeningText = '',
) {
    let next = structuredClone(worldState);
    const scene = next.scene;
    const openingText = String(
        sceneOpeningText || '',
    );
    if (
        !scene ||
        !openingText.trim() ||
        Number(
            scene.temporalGroundingVersion ||
            0,
        ) >= TEMPORAL_STATE_VERSION
    ) {
        return {
            state: worldState,
            changed: false,
            clockRepair: null,
        };
    }

    const normalizedOpening =
        openingText.toLocaleLowerCase();
    const mapId =
        next.map?.activeMapId ||
        scene.mapId;
    const isLegacySchoolDeparture =
        mapId === 'kings_cross' &&
        /(?:first of september|1(?:st)? september|september (?:the )?first|september 1(?:st)?)/i
            .test(normalizedOpening) &&
        /(?:hogwarts express|platform(?: nine| 9)|barrier)/i
            .test(normalizedOpening);
    const clockMatch = WORLD_CLOCK_PATTERN.exec(
        String(next.clock || ''),
    );
    let clockRepair = null;

    if (isLegacySchoolDeparture && clockMatch) {
        const year = Number(clockMatch[1]);
        const oldStart =
            scene.startedClock ||
            next.clock;
        const oldStartMinutes =
            worldClockToEpochMinutes(oldStart);
        const targetStart =
            `${year}-09-01 · 10:30`;
        const targetStartMinutes =
            worldClockToEpochMinutes(
                targetStart,
            );
        if (
            oldStartMinutes !== null &&
            targetStartMinutes !== null &&
            targetStartMinutes >
                oldStartMinutes &&
            getWorldDate(next.clock) !==
                `${year}-09-01`
        ) {
            const deltaMinutes =
                targetStartMinutes -
                oldStartMinutes;
            const shiftClock = value =>
                WORLD_CLOCK_PATTERN.test(
                    String(value || ''),
                )
                    ? advanceWorldClock(
                        value,
                        deltaMinutes,
                    )
                    : value;
            const shiftSceneState = state => {
                const shifted =
                    structuredClone(state);
                const currentSceneClocks =
                    new Set(
                        [
                            shifted.scene
                                ?.startedClock,
                            ...(
                                shifted.scene
                                    ?.timelineEntries ||
                                []
                            ).map(entry =>
                                entry.clock),
                        ].filter(Boolean),
                    );
                shifted.clock =
                    shiftClock(shifted.clock);
                if (shifted.scene) {
                    shifted.scene.startedClock =
                        shiftClock(
                            shifted.scene
                                .startedClock,
                        );
                    shifted.scene.timelineEntries =
                        (
                            shifted.scene
                                .timelineEntries ||
                            []
                        ).map(entry => ({
                            ...entry,
                            clock:
                                shiftClock(
                                    entry.clock,
                                ),
                        }));
                }
                shifted.timeline = (
                    shifted.timeline || []
                ).map(entry =>
                    currentSceneClocks.has(
                        entry.clock,
                    )
                        ? {
                            ...entry,
                            clock:
                                shiftClock(
                                    entry.clock,
                                ),
                        }
                        : entry);
                shifted.items = (
                    shifted.items || []
                ).map(item =>
                    currentSceneClocks.has(
                        item.updatedClock,
                    )
                        ? {
                            ...item,
                            updatedClock:
                                shiftClock(
                                    item
                                        .updatedClock,
                                ),
                        }
                        : item);
                return shifted;
            };
            next = shiftSceneState(next);
            if (next.turnRetry?.baseState) {
                next.turnRetry = {
                    ...next.turnRetry,
                    baseState:
                        shiftSceneState(
                            next.turnRetry
                                .baseState,
                        ),
                };
                next.turnRetry.baseClock =
                    next.turnRetry
                        .baseState.clock;
            }
            clockRepair = {
                fromClock:
                    worldState.clock,
                toClock: next.clock,
                fromSceneStartedClock:
                    oldStart,
                toSceneStartedClock:
                    next.scene
                        ?.startedClock,
                source:
                    'legacy_kings_cross_anchor',
            };
        }
    }

    next.scene.temporalFactsEn =
        [...new Set([
            ...(
                next.scene
                    .temporalFactsEn || []
            ),
            ...(isLegacySchoolDeparture
                ? [
                    `The current date is 1 September ${clockMatch?.[1] || ''}.`,
                    'The train departs at eleven.',
                ]
                : []),
        ])];
    next.scene.temporalFacts =
        [...new Set([
            ...(
                next.scene
                    .temporalFacts || []
            ),
            ...(isLegacySchoolDeparture
                ? [
                    `${clockMatch?.[1] || ''} 年 9 月 1 日。`,
                    '火车十一点出发。',
                ]
                : []),
        ])];
    next.scene.temporalGroundingVersion =
        TEMPORAL_STATE_VERSION;
    return {
        state: next,
        changed: true,
        clockRepair,
    };
}

export function getWorldDate(clock) {
    const match = WORLD_CLOCK_PATTERN.exec(String(clock || ''));
    return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

export function isDailyDirectorPlanCurrent(clock, dailyDirector) {
    const date = getWorldDate(clock);
    return Boolean(
        date &&
        dailyDirector?.date === date &&
        dailyDirector?.status === 'ready' &&
        dailyDirector?.plan,
    );
}
