import {
    findCanonCharacter,
    getCanonSettingProfile,
} from '../canon-characters.js';
import {
    createSharedMemoryContextSelector,
} from '../core/context-budget.js';
import {
    normalizeActorVisualRecord,
} from './appearance.js';
import {
    buildActorNameAliases,
} from './actor-identity.js';
import {
    normalizeMemoryId,
} from './stable-identity.js';

export const RELATIONSHIP_MEMORY_VERSION = 6;
export const FIRST_IMPRESSION_VERSION = 1;
export const ACTOR_KNOWLEDGE_VERSION = 1;
export const ACTOR_KNOWLEDGE_BOUNDARY_EN =
    'Use only current-scene observations, actor-specific memories, witnessed social evidence, known rumors, and supplied current-date public facts.';
export const IMPRESSION_MAX_WORDS = 16;
export const FIRST_IMPRESSION_MAX_WORDS = 24;
export const IMPRESSION_UPDATE_COOLDOWN_TURNS = 3;
export const SHARED_MEMORY_TIER_LIMITS = Object.freeze({
    core: 3,
    recent: 6,
    everyday: 8,
});

export const SHARED_MEMORY_TIERS = Object.freeze([
    'core',
    'recent',
    'everyday',
]);

export function normalizeSharedMemories(sharedMemories = {}) {
    return Object.fromEntries(
        SHARED_MEMORY_TIERS.map(tier => {
            const items = Array.isArray(sharedMemories?.[tier])
                ? sharedMemories[tier]
                : [];
            const normalized = items
                .map((item, index) => {
                    const source = typeof item === 'string'
                        ? { summaryEn: item }
                        : item || {};
                    const summaryEn = String(
                        source.summaryEn || source.summary || '',
                    ).trim();
                    if (!summaryEn) return null;
                    return {
                        ...source,
                        id: normalizeMemoryId(
                            source.id,
                            `legacy_${tier}_${index + 1}`,
                        ),
                        summaryEn,
                        summary: String(
                            source.summary || summaryEn,
                        ).trim(),
                        tier,
                        firstClock:
                            source.firstClock ||
                            source.lastClock ||
                            '',
                        lastClock:
                            source.lastClock ||
                            source.firstClock ||
                            '',
                        createdTurn: Math.max(
                            0,
                            Number(source.createdTurn || 0),
                        ),
                        updatedTurn: Math.max(
                            0,
                            Number(
                                source.updatedTurn ||
                                source.createdTurn ||
                                0,
                            ),
                        ),
                        source: source.source || 'legacy',
                    };
                })
                .filter(Boolean);
            return [
                tier,
                normalized.slice(
                    -SHARED_MEMORY_TIER_LIMITS[tier],
                ),
            ];
        }),
    );
}

export function hasGenericImpression(value) {
    return /^(?:stranger|unknown|newly met(?: stranger)?|new acquaintance|none|future contact|has not formed a distinct opinion yet|still forming an opinion from their recent encounters|hard to ignore; still deciding what to make of them|尚不熟悉|陌生人?|还没有形成清晰看法|正从最近的相处中慢慢形成看法)\.?$/i.test(
        String(value || '').trim(),
    );
}

export function countTextWords(value) {
    return String(value || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;
}

export function isValidImpressionShorthand(
    value,
) {
    const impression =
        String(value || '').trim();
    return Boolean(
        impression &&
        countTextWords(impression) <=
            IMPRESSION_MAX_WORDS &&
        !hasGenericImpression(impression) &&
        !/\b(?:currently|right now|this turn|today|at the moment|just (?:saw|heard|watched|learned))\b/i
            .test(impression),
    );
}

export function isValidFirstImpression(
    value,
) {
    const impression =
        String(value || '').trim();
    return Boolean(
        impression &&
        countTextWords(impression) <=
            FIRST_IMPRESSION_MAX_WORDS &&
        !hasGenericImpression(impression) &&
        !/\b(?:currently|right now|this turn|today|at the moment|just (?:saw|heard|watched|learned))\b/i
            .test(impression),
    );
}

export function deriveRelationshipImpression(
    profile = {},
    actorState = {},
) {
    const relationship = [
        profile.relationshipToPlayerEn,
        profile.relationshipToPlayer,
        actorState.relationshipToPlayerEn,
        actorState.relationshipToPlayer,
    ].filter(Boolean).join(' ');
    if (/(?:father|dad|父亲|爸爸)/i.test(relationship)) {
        return {
            established: true,
            en: 'My troublesome daughter; impossible not to worry about.',
            zh: '我那不省心、又不能不管的女儿啊。',
        };
    }
    if (/(?:mother|mum|mom|母亲|妈妈)/i.test(relationship)) {
        return {
            established: true,
            en: 'My impossible child; loved, exhausting, and always on my mind.',
            zh: '我那让人头疼、却总放不下的孩子。',
        };
    }
    if (/(?:parent|guardian|family|sibling|brother|sister|监护人|家人|亲人|兄弟|姐妹|哥哥|姐姐|弟弟|妹妹)/i.test(relationship)) {
        return {
            established: true,
            en: 'Family: familiar trouble, familiar affection, and no easy distance.',
            zh: '自家人：熟悉的麻烦，熟悉的牵挂，想疏远也难。',
        };
    }
    if (/(?:best friend|close friend|childhood friend|old friend|friend|好友|挚友|朋友|发小|青梅竹马)/i.test(relationship)) {
        return {
            established: true,
            en: 'A difficult friend, but still one of mine.',
            zh: '是个难搞的朋友，但终究是自己人。',
        };
    }
    return {
        established: false,
        en: 'Has not formed a distinct opinion yet.',
        zh: '还没有形成清晰看法。',
    };
}

export function sanitizeActorKnowledgeEn(
    profile = {},
    actorState = {},
) {
    const canonIdentity =
        findCanonCharacter(
            profile.canonCatalogId ||
            profile.nameEn ||
            actorState.nameEn,
        );
    const fingerprint = value =>
        String(value || '')
            .normalize('NFKC')
            .trim()
            .toLocaleLowerCase()
            .replace(/\s+/gu, ' ');
    const catalogValues = new Set(
        canonIdentity
            ? [
                canonIdentity.roleEn,
                canonIdentity.house
                    ? `House: ${canonIdentity.house}`
                    : '',
                canonIdentity.affiliationsEn,
                canonIdentity.skillsEn,
            ]
                .map(fingerprint)
                .filter(Boolean)
            : [],
    );
    const source =
        Array.isArray(profile.knowledgeEn)
            ? profile.knowledgeEn
            : Array.isArray(
                actorState.knowledgeEn,
            )
                ? actorState.knowledgeEn
                : [];
    const sanitized = [
        ...new Set(
            source
                .map(value =>
                    String(value || '').trim())
                .filter(Boolean)
                .filter(value =>
                    !catalogValues.has(
                        fingerprint(value),
                    ))
                .filter(value =>
                    !/(?:^|\b)(?:almost|nearly|virtually)?\s*everything(?:\b|$)|\bomniscien(?:t|ce)\b|\bknows?\s+all\b/iu
                        .test(value)),
        ),
    ];
    if (
        canonIdentity &&
        !sanitized.includes(
            ACTOR_KNOWLEDGE_BOUNDARY_EN,
        )
    ) {
        sanitized.push(
            ACTOR_KNOWLEDGE_BOUNDARY_EN,
        );
    }
    return sanitized;
}

function deriveInitialRelationshipTags(
    profile = {},
    actorState = {},
) {
    const rawTags =
        profile.relationshipTags ||
        actorState.relationshipTags;
    const supplied =
        Array.isArray(rawTags)
            ? rawTags.filter(Boolean)
            : [];
    if (supplied.length) return supplied;
    const introduced =
        actorState.present === true ||
        Boolean(
            profile.introducedClock ||
            actorState.introducedClock,
        );
    if (!introduced) return [];
    const relationship = [
        profile.relationshipToPlayerEn,
        profile.relationshipToPlayer,
        actorState
            .relationshipToPlayerEn,
        actorState
            .relationshipToPlayer,
    ].filter(Boolean).join(' ');
    if (
        /(?:parent|father|mother|guardian|family|sibling|brother|sister|父亲|母亲|爸爸|妈妈|监护人|家人|兄弟|姐妹)/i
            .test(relationship)
    ) {
        return ['family'];
    }
    if (
        /(?:friend|好友|朋友|发小)/i
            .test(relationship)
    ) {
        return ['friend'];
    }
    if (
        /(?:rival|competitor|宿敌|对手)/i
            .test(relationship)
    ) {
        return ['rival'];
    }
    if (
        /(?:mentor|mentee|teacher|student|导师|师生)/i
            .test(relationship)
    ) {
        return ['mentor'];
    }
    if (
        /(?:crush|romantic|lover|好感|恋人)/i
            .test(relationship)
    ) {
        return ['romantic_interest'];
    }
    if (
        /(?:enemy|hostile|仇敌|敌人)/i
            .test(relationship)
    ) {
        return ['enemy'];
    }
    return ['acquaintance'];
}

export function normalizeActorMemoryProfile(
    profile = {},
    actorState = {},
) {
    const memories = normalizeSharedMemories(
        profile.sharedMemories ||
        actorState.sharedMemories,
    );
    const hasMemories = SHARED_MEMORY_TIERS.some(
        tier => memories[tier].length,
    );
    const relationshipImpression =
        deriveRelationshipImpression(
            profile,
            actorState,
        );
    const suppliedImpressionEn = String(
        profile.impressionOfPlayerEn ||
        actorState.impressionOfPlayerEn ||
        '',
    ).trim();
    const firstImpressionOfPlayerEn =
        String(
            profile
                .firstImpressionOfPlayerEn ||
            actorState
                .firstImpressionOfPlayerEn ||
            '',
        ).trim();
    const firstImpressionOfPlayer =
        String(
            profile
                .firstImpressionOfPlayer ||
            actorState
                .firstImpressionOfPlayer ||
            firstImpressionOfPlayerEn,
        ).trim();
    const wasUpdated = Boolean(
        profile.impressionUpdatedClock ||
        actorState.impressionUpdatedClock ||
        Number(
            profile.impressionUpdatedTurn ||
            actorState.impressionUpdatedTurn ||
            0,
        ),
    );
    let impressionOfPlayerEn =
        suppliedImpressionEn ||
        relationshipImpression.en;
    let impressionOfPlayer = String(
        profile.impressionOfPlayer ||
        actorState.impressionOfPlayer ||
        (
            suppliedImpressionEn
                ? impressionOfPlayerEn
                : relationshipImpression.zh
        ),
    ).trim();
    if (!wasUpdated &&
        relationshipImpression.established &&
        (
            !suppliedImpressionEn ||
            hasGenericImpression(
                suppliedImpressionEn,
            )
        )) {
        impressionOfPlayerEn =
            relationshipImpression.en;
        impressionOfPlayer =
            relationshipImpression.zh;
    }
    if (hasMemories &&
        hasGenericImpression(impressionOfPlayerEn)) {
        impressionOfPlayerEn =
            'Still forming an opinion from their recent encounters.';
        impressionOfPlayer =
            '正从最近的相处中慢慢形成看法。';
    }
    const canonProfile =
        getCanonSettingProfile(
            profile.canonCatalogId ||
            profile.nameEn ||
            actorState.nameEn,
        );
    const nameEn = String(
        profile.nameEn ||
        actorState.nameEn ||
        profile.name ||
        actorState.name ||
        '',
    ).trim();
    const name = String(
        profile.name ||
        profile.display?.name ||
        actorState.name ||
        nameEn,
    ).trim();
    const visual =
        normalizeActorVisualRecord({
            ...profile,
            physicalDescriptionEn:
                profile
                    .physicalDescriptionEn ||
                actorState
                    .physicalDescriptionEn,
            physicalDescription:
                profile
                    .physicalDescription ||
                actorState
                    .physicalDescription,
            publicDescriptionEn:
                profile
                    .publicDescriptionEn ||
                actorState
                    .publicDescriptionEn,
            publicDescription:
                profile
                    .publicDescription ||
                actorState
                    .publicDescription,
        }).record;
    return {
        ...visual,
        nameEn,
        name,
        aliases: buildActorNameAliases(
            nameEn,
            name,
            [
                ...(profile.aliases || []),
                ...(actorState.aliases || []),
            ],
        ),
        canonCatalogId:
            canonProfile?.id ||
            profile.canonCatalogId ||
            '',
        fixedBirthText:
            canonProfile
                ?.fixedBirthText ||
            profile.fixedBirthText ||
            '',
        birthYear:
            canonProfile
                ?.estimatedBirthYear ||
            profile.birthYear ||
            null,
        settingTags:
            canonProfile
                ?.settingTags ||
            profile.settingTags ||
            [],
        relationshipTags:
            deriveInitialRelationshipTags(
                profile,
                actorState,
            ),
        firstImpressionOfPlayerEn,
        firstImpressionOfPlayer,
        firstImpressionClock:
            profile.firstImpressionClock ||
            actorState.firstImpressionClock ||
            '',
        firstImpressionTurn: Math.max(
            0,
            Number(
                profile
                    .firstImpressionTurn ||
                actorState
                    .firstImpressionTurn ||
                0,
            ),
        ),
        firstImpressionPending:
            !firstImpressionOfPlayerEn &&
            Boolean(
                profile
                    .firstImpressionPending ||
                actorState
                    .firstImpressionPending,
            ),
        impressionOfPlayerEn,
        impressionOfPlayer,
        impressionUpdatedClock:
            profile.impressionUpdatedClock ||
            actorState.impressionUpdatedClock ||
            '',
        impressionUpdatedTurn: Math.max(
            0,
            Number(
                profile.impressionUpdatedTurn ||
                actorState.impressionUpdatedTurn ||
                0,
            ),
        ),
        knowledgeEn:
            sanitizeActorKnowledgeEn(
                profile,
                actorState,
            ),
        sharedMemories: memories,
    };
}


export const selectSharedMemoriesForContext =
    createSharedMemoryContextSelector(
        normalizeSharedMemories,
    );
