import {
    getCanonSettingProfile,
} from '../canon-characters.js';

export const CHARACTER_ATTRIBUTE_KEYS = Object.freeze([
    'physique',
    'agility',
    'perception',
    'intellect',
    'willpower',
    'charisma',
]);
export const CHARACTER_ATTRIBUTE_BUDGET = 63;
export const STORY_TONE_VALUES =
    Object.freeze([
        'balanced',
        'adventure',
        'mystery',
        'social',
    ]);
export const RELATIVE_AGE_PREFERENCE_VALUES =
    Object.freeze([
        'peer_focused',
        'mixed',
        'intergenerational',
    ]);
export const SOCIAL_DENSITY_VALUES =
    Object.freeze([
        'intimate',
        'balanced',
        'ensemble',
    ]);
export const CANON_DENSITY_VALUES =
    Object.freeze([
        'original_focused',
        'balanced',
        'canon_focused',
    ]);
export const RELATIONSHIP_FOCUS_VALUES =
    Object.freeze([
        'friendship',
        'romance',
        'rivalry',
        'mentorship',
        'family',
    ]);

export function normalizeStoryPreferences(
    preferences = {},
) {
    const relationshipFocus = [
        ...new Set(
            (
                Array.isArray(
                    preferences
                        .relationshipFocus,
                )
                    ? preferences
                        .relationshipFocus
                    : [
                        'friendship',
                        'rivalry',
                    ]
            ).filter(value =>
                RELATIONSHIP_FOCUS_VALUES
                    .includes(value)),
        ),
    ];
    return {
        tone: STORY_TONE_VALUES
            .includes(preferences.tone)
            ? preferences.tone
            : 'balanced',
        relationshipFocus:
            relationshipFocus.length
                ? relationshipFocus
                : [
                    'friendship',
                    'rivalry',
                ],
        socialDensity:
            SOCIAL_DENSITY_VALUES
                .includes(
                    preferences
                        .socialDensity,
                )
                ? preferences
                    .socialDensity
                : 'balanced',
        relativeAgePreference:
            RELATIVE_AGE_PREFERENCE_VALUES
                .includes(
                    preferences
                        .relativeAgePreference,
                )
                ? preferences
                    .relativeAgePreference
                : 'peer_focused',
        canonDensity:
            CANON_DENSITY_VALUES
                .includes(
                    preferences
                        .canonDensity,
                )
                ? preferences
                    .canonDensity
                : 'balanced',
    };
}

function calculateAgeOnDate(
    birthDate,
    worldClock,
) {
    const birth = String(
        birthDate || '',
    ).match(
        /^(\d{4})-(\d{2})-(\d{2})$/,
    );
    const current = String(
        worldClock || '',
    ).match(
        /^(\d{4})-(\d{2})-(\d{2})/,
    );
    if (!birth || !current) return null;
    let age =
        Number(current[1]) -
        Number(birth[1]);
    if (
        Number(current[2]) <
            Number(birth[2]) ||
        (
            Number(current[2]) ===
                Number(birth[2]) &&
            Number(current[3]) <
                Number(birth[3])
        )
    ) {
        age--;
    }
    return age;
}

export function getPlayerAgeAtClock(
    worldState,
) {
    const exact = calculateAgeOnDate(
        worldState.character?.identity
            ?.birthDate,
        worldState.clock,
    );
    if (Number.isFinite(exact)) {
        return exact;
    }
    const baseAge = Number(
        worldState.character?.identity
            ?.age,
    );
    const currentYear = Number(
        String(worldState.clock || '')
            .match(/^(\d{4})/)?.[1],
    );
    const startYear = Number(
        worldState.campaign?.startYear,
    );
    return Number.isFinite(baseAge)
        ? baseAge +
            (
                Number.isFinite(
                    currentYear,
                ) &&
                Number.isFinite(
                    startYear,
                )
                    ? currentYear -
                        startYear
                    : 0
            )
        : null;
}

function getActorAgeAtClock(
    worldState,
    actor,
) {
    const exact = calculateAgeOnDate(
        actor?.birthDate,
        worldState.clock,
    );
    if (Number.isFinite(exact)) {
        return exact;
    }
    const currentYear = Number(
        String(worldState.clock || '')
            .match(/^(\d{4})/)?.[1],
    );
    const birthYear = Number(
        actor?.birthYear,
    );
    if (
        Number.isFinite(currentYear) &&
        Number.isFinite(birthYear)
    ) {
        return currentYear - birthYear;
    }
    const canon = getCanonSettingProfile(
        actor?.canonCatalogId ||
        actor?.nameEn,
        {
            worldYear: currentYear,
            playerAge:
                getPlayerAgeAtClock(
                    worldState,
                ),
        },
    );
    return Number.isFinite(
        canon?.estimatedAge,
    )
        ? canon.estimatedAge
        : null;
}

export function getRelativeAgeProfile(
    worldState,
    actor,
) {
    const playerAge =
        getPlayerAgeAtClock(
            worldState,
        );
    const actorAge =
        getActorAgeAtClock(
            worldState,
            actor,
        );
    if (
        !Number.isFinite(playerAge) ||
        !Number.isFinite(actorAge)
    ) {
        return {
            playerAge,
            actorAge,
            ageDelta: null,
            relativeAgeBand: 'unknown',
        };
    }
    const ageDelta =
        actorAge - playerAge;
    return {
        playerAge,
        actorAge,
        ageDelta,
        relativeAgeBand:
            ageDelta <= -6
                ? 'much_younger'
                : ageDelta <= -2
                    ? 'younger_peer'
                    : ageDelta <= 1
                        ? 'same_age'
                        : ageDelta <= 5
                            ? 'older_peer'
                            : 'older_generation',
    };
}

export function buildPlayerVisibleProfile(
    worldState = {},
) {
    const identity =
        worldState.character?.identity || {};
    const background =
        worldState.character?.background ||
        {};
    return {
        name:
            String(identity.name || '').trim(),
        pronouns:
            String(
                identity.pronouns || '',
            ).trim(),
        age:
            getPlayerAgeAtClock(worldState),
        heritage:
            String(
                identity.heritage ||
                identity.ethnicity ||
                background.ethnicity ||
                background
                    .culturalBackground ||
                '',
            ).trim(),
        appearance:
            String(
                identity.appearance || '',
            ).trim(),
    };
}

export function createDefaultCharacterDraft() {
    return {
        identity: {
            name: '',
            pronouns: '',
            age: 11,
            birthDate: '1980-07-01',
            heritage: '',
            appearance: '',
        },
        background: {
            bloodStatus: '',
            guardian: '',
            home: '',
            economy: '',
            desire: '',
            fear: '',
            habit: '',
            formativeEvent: '',
        },
        aptitudes: {
            learning: '',
            physical: '',
            observation: '',
            social: '',
            pressure: '',
            magicalPotential: 'balanced',
            strongDomain: '',
            weakDomain: '',
            rareTalent: 'none',
        },
        attributes: {
            physique: 10,
            agility: 10,
            perception: 11,
            intellect: 11,
            willpower: 11,
            charisma: 10,
        },
        storyPreferences:
            normalizeStoryPreferences(),
        polishedBackground: '',
        confirmed: false,
    };
}

export function validateCharacterDraft(character) {
    const errors = [];
    if (!String(character?.identity?.name || '').trim()) {
        errors.push('请填写角色姓名。');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(
        String(
            character?.identity
                ?.birthDate || '',
        ),
    )) {
        errors.push(
            '请填写固定出生日期。',
        );
    }
    if (!String(character?.background?.guardian || '').trim()) {
        errors.push('请填写监护人或家庭关系。');
    }
    if (!String(character?.background?.desire || '').trim()) {
        errors.push('请填写角色最想得到的事物。');
    }
    if (!String(character?.background?.fear || '').trim()) {
        errors.push('请填写角色最害怕的事物。');
    }
    if (
        !normalizeStoryPreferences(
            character?.storyPreferences,
        ).relationshipFocus.length
    ) {
        errors.push(
            '请至少选择一种关系体验。',
        );
    }

    const attributes = character?.attributes || {};
    const values = CHARACTER_ATTRIBUTE_KEYS.map(key => Number(attributes[key]));
    if (values.some(value => !Number.isInteger(value) || value < 7 || value > 14)) {
        errors.push('六项属性必须是 7–14 之间的整数。');
    } else if (values.reduce((sum, value) => sum + value, 0) !== CHARACTER_ATTRIBUTE_BUDGET) {
        errors.push(`六项属性总和必须为 ${CHARACTER_ATTRIBUTE_BUDGET}。`);
    }
    return errors;
}

export function buildCharacterContext(character) {
    if (!character?.confirmed) {
        return '';
    }
    return `PLAYER CHARACTER (binding state):
${JSON.stringify(character, null, 2)}

Do not alter confirmed player facts. Never speak, decide, or act on behalf of this character beyond actions explicitly supplied by the player.`;
}
