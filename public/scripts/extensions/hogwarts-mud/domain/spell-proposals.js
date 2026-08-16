import {
    findSpellReferences,
    getSpellDefinitions,
    normalizeCustomSpellDefinition,
    normalizeKnownSpell,
    normalizeSpellbook,
} from '../spell-catalog.js';

export const SPELL_PROPOSAL_VERSION = 1;

const SPELL_PROPOSAL_LIMIT = 24;
const SPELL_DECISION_LIMIT = 120;
const ENGLISH_INCANTATION_PATTERN =
    /\b(?:the\s+)?incantation\s+(?:is|was|will be|:)\s*[“"'‘]?([A-Z][A-Za-z'’-]*(?:\s+[A-Z][A-Za-z'’-]*){0,3})/gu;
const CHINESE_INCANTATION_PATTERN =
    /(?:咒语|咒文)\s*(?:是|叫|为|：|:)\s*[“"'‘]?([A-Za-z][A-Za-z'’-]*(?:\s+[A-Za-z][A-Za-z'’-]*){0,3})/gu;
const CUSTOM_FREEFORM_MARKER_PATTERN =
    /(?:✦\s*)?【\s*咒语\s*:\s*([A-Za-z][A-Za-z'’ -]{0,78}[A-Za-z'’])\s*】/gu;
const INVALID_INCANTATION_WORDS =
    new Set([
        'The',
        'This',
        'That',
        'It',
        'On',
    ]);
const INDEPENDENT_CUSTOM_SPELL_PATTERN =
    /(?:\b(?:new|different|separate|original|custom|invented|devised|created|made[- ]?up|undocumented|unknown)\s+(?:spell|incantation|charm|hex|jinx|curse)\b|\b(?:invented|devised|created|made[- ]?up)\b.{0,32}\b(?:spell|incantation|charm|hex|jinx|curse)\b|(?:新的|不同的|独立的|原创|自创|发明|创造|未记载|未知).{0,12}(?:咒语|咒文|法术))/iu;
const CUSTOM_SPELL_EFFECT_PATTERN =
    /(?:(?:\bit\b|\bthis\s+(?:spell|incantation|charm|hex|jinx|curse)\b).{0,36}\b(?:make|makes|made|cause|causes|create|creates|turn|turns|transform|transforms|reveal|reveals|conceal|conceals|summon|summons|banish|banishes|repair|repairs|heal|heals|light|lights|darken|darkens|glow|glows)\b|(?:这个|该|此)(?:咒语|咒文|法术).{0,24}(?:使|让|造成|创造|变成|转化|显现|隐藏|召唤|驱逐|修复|治愈|发光))/iu;
const AUTHORITY_CONTEXT_STOP_WORDS =
    new Set([
        'a',
        'an',
        'and',
        'banish',
        'banishes',
        'cause',
        'causes',
        'charm',
        'conceal',
        'conceals',
        'create',
        'creates',
        'exercise',
        'heal',
        'heals',
        'incantation',
        'into',
        'is',
        'it',
        'made',
        'magic',
        'magical',
        'make',
        'makes',
        'repair',
        'repairs',
        'reveal',
        'reveals',
        'spell',
        'summon',
        'summons',
        'technique',
        'the',
        'this',
        'transfiguration',
        'transfigure',
        'transform',
        'transforms',
        'turn',
        'turns',
        'with',
    ]);

function compactText(
    value,
    maximumLength = 500,
) {
    return String(value || '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

function stableCustomSpellId(
    incantation,
) {
    const slug =
        compactText(
            incantation,
            80,
        )
            .toLocaleLowerCase()
            .replace(
                /[^a-z0-9]+/gu,
                '_',
            )
            .replace(
                /^_+|_+$/gu,
                '',
            )
            .slice(0, 64);
    return slug
        ? `custom_${slug}`
        : '';
}

function extractContextTerms(
    value,
) {
    return (
        String(value || '')
            .toLocaleLowerCase()
            .replace(
                /[-–—]/gu,
                ' ',
            )
            .match(
                /[a-z][a-z0-9']{2,}/gu,
            ) ||
        []
    );
}

function getAuthorityContextTerms(
    authoritative,
) {
    return new Set(
        authoritative.flatMap(spell =>
            extractContextTerms(
                [
                    spell.nameEn,
                    spell.effectEn,
                ].join(' '),
            ))
            .filter(term =>
                !AUTHORITY_CONTEXT_STOP_WORDS
                    .has(term)),
    );
}

function isIndependentCustomIncantation(
    match,
    segmentText,
    authoritative,
) {
    if (!authoritative.length) {
        return true;
    }
    const text =
        compactText(
            segmentText,
            800,
        );
    if (
        !INDEPENDENT_CUSTOM_SPELL_PATTERN
            .test(text) &&
        !CUSTOM_SPELL_EFFECT_PATTERN
            .test(text)
    ) {
        return false;
    }
    const authorityTerms =
        getAuthorityContextTerms(
            authoritative,
        );
    const segmentTerms =
        new Set(
            extractContextTerms(
                text,
            ),
        );
    const authorityTermOverlap =
        [...authorityTerms]
            .filter(term =>
                segmentTerms.has(term))
            .length;
    const referencesAuthority =
        authorityTermOverlap >=
        Math.min(
            2,
            authorityTerms.size,
        );
    const incantationTerms =
        new Set(
            extractContextTerms(
                match.incantation,
            ),
        );
    const hasDistinctEffect =
        CUSTOM_SPELL_EFFECT_PATTERN
            .test(text) &&
        [...segmentTerms]
            .some(term =>
                !authorityTerms.has(term) &&
                !incantationTerms.has(term) &&
                !AUTHORITY_CONTEXT_STOP_WORDS
                    .has(term));
    const matchesAuthorityIncantation =
        authoritative.some(spell =>
            compactText(
                spell.incantation,
                80,
            )
                .toLocaleLowerCase() ===
            match.incantation
                .toLocaleLowerCase());
    return (
        !referencesAuthority &&
        !matchesAuthorityIncantation &&
        (
            INDEPENDENT_CUSTOM_SPELL_PATTERN
                .test(text) ||
            hasDistinctEffect
        )
    );
}

function extractExplicitIncantations(
    text,
) {
    const source =
        String(text || '');
    const matches = [];
    for (
        const pattern of [
            ENGLISH_INCANTATION_PATTERN,
            CHINESE_INCANTATION_PATTERN,
        ]
    ) {
        pattern.lastIndex = 0;
        for (
            const match of source
                .matchAll(pattern)
        ) {
            const incantation =
                compactText(
                    match[1],
                    80,
                );
            if (
                !incantation ||
                INVALID_INCANTATION_WORDS
                    .has(incantation)
            ) {
                continue;
            }
            matches.push({
                incantation,
                evidenceText:
                    compactText(
                        match[0],
                        240,
                    ),
            });
        }
    }
    return matches.filter(
        (
            match,
            index,
            values,
        ) =>
            values.findIndex(
                candidate =>
                    candidate
                        .incantation
                        .toLocaleLowerCase() ===
                    match
                        .incantation
                        .toLocaleLowerCase(),
            ) ===
            index,
    );
}

function extractPlayerDeclaredIncantations(
    text,
) {
    const source =
        String(text || '');
    const byIncantation =
        new Map(
            extractExplicitIncantations(
                source,
            ).map(match => [
                match.incantation
                    .toLocaleLowerCase(),
                {
                    ...match,
                    playerDeclared:
                        false,
                },
            ]),
        );
    CUSTOM_FREEFORM_MARKER_PATTERN
        .lastIndex = 0;
    for (
        const match of source.matchAll(
            CUSTOM_FREEFORM_MARKER_PATTERN,
        )
    ) {
        const incantation =
            compactText(
                match[1],
                80,
            );
        if (!incantation) {
            continue;
        }
        byIncantation.set(
            incantation
                .toLocaleLowerCase(),
            {
                incantation,
                evidenceText:
                    compactText(
                        match[0],
                        240,
                    ),
                playerDeclared:
                    true,
            },
        );
    }
    return [
        ...byIncantation.values(),
    ];
}

export function getAuthoritativeSceneSpells(
    worldState,
) {
    const scene =
        worldState?.scene ||
        {};
    const intent =
        scene.nextSceneIntent ||
        {};
    const text = [
        scene.nameEn,
        scene.summaryEn,
        intent.titleEn,
        intent.summaryEn,
        intent.triggerEn,
    ]
        .filter(Boolean)
        .join('\n');
    return findSpellReferences(
        text,
    ).map(spell => ({
        spellId: spell.id,
        incantation:
            spell.incantation,
        nameEn:
            spell.nameEn,
        effectEn:
            spell.effectEn,
        sourceTier:
            spell.sourceTier,
    }));
}

export function normalizeSpellProposal(
    source,
    {
        clock = '',
        sourceEventId = '',
        sourceMessageIds = [],
        index = 0,
    } = {},
) {
    const incantation =
        compactText(
            source?.incantation,
            80,
        );
    const id =
        stableCustomSpellId(
            incantation,
        );
    if (!id) {
        return null;
    }
    const definition =
        normalizeCustomSpellDefinition(
            {
                ...source
                    ?.definition,
                id,
                incantation,
                effectEn:
                    source?.effectEn ||
                    source?.definition
                        ?.effectEn,
                effect:
                    source?.effect ||
                    source?.effectEn ||
                    source?.definition
                        ?.effect ||
                    source?.definition
                        ?.effectEn,
            },
            index,
        );
    if (!definition) {
        return null;
    }
    return {
        version:
            SPELL_PROPOSAL_VERSION,
        key:
            `spell-candidate:${
                definition.id
            }`,
        id:
            definition.id,
        incantation:
            definition
                .incantation,
        definition,
        sourceActorId:
            compactText(
                source
                    ?.sourceActorId,
                96,
            ),
        sourceEventId:
            compactText(
                source
                    ?.sourceEventId ||
                sourceEventId,
                160,
            ),
        sourceMessageIds: [
            ...new Set(
                (
                    source
                        ?.sourceMessageIds ||
                    sourceMessageIds
                )
                    .map(Number)
                    .filter(
                        Number.isInteger,
                    ),
            ),
        ],
        evidenceText:
            compactText(
                source
                    ?.evidenceText,
                500,
            ),
        authorityConflicts:
            (
                source
                    ?.authorityConflicts ||
                []
            )
                .map(spell => ({
                    spellId:
                        compactText(
                            spell
                                ?.spellId,
                            96,
                        ),
                    incantation:
                        compactText(
                            spell
                                ?.incantation,
                            80,
                        ),
                    name:
                        compactText(
                            spell?.name ||
                            spell?.nameEn,
                            120,
                        ),
                }))
                .filter(spell =>
                    spell.spellId &&
                    spell.incantation)
                .slice(0, 4),
        createdClock:
            compactText(
                source
                    ?.createdClock ||
                clock,
                80,
            ),
    };
}

export function extractSpellCandidates(
    transaction,
    worldState,
    context = {},
) {
    const authoritative =
        getAuthoritativeSceneSpells(
            worldState,
        );
    const knownIncantations =
        new Set(
            getSpellDefinitions(
                worldState,
            ).flatMap(spell => [
                spell.incantation,
                ...spell.aliases,
            ])
                .map(value =>
                    compactText(
                        value,
                        80,
                    )
                        .toLocaleLowerCase())
                .filter(Boolean),
        );
    const candidates = [];
    const appendCandidate = (
        match,
        {
            sourceActorId = '',
            evidenceContext = '',
            effectEn = '',
            index = 0,
            playerDeclared = false,
        } = {},
    ) => {
        if (
            knownIncantations
                .has(
                    match
                        .incantation
                        .toLocaleLowerCase(),
                )
        ) {
            return;
        }
        if (
            !playerDeclared &&
            !isIndependentCustomIncantation(
                match,
                evidenceContext,
                authoritative,
            )
        ) {
            return;
        }
        const proposal =
            normalizeSpellProposal(
                {
                    incantation:
                        match
                            .incantation,
                    sourceActorId,
                    evidenceText:
                        match
                            .evidenceText,
                    effectEn:
                        compactText(
                            effectEn
                                ? `Observed narrative evidence: ${effectEn}`
                                : '',
                            300,
                        ),
                    authorityConflicts:
                        [],
                },
                {
                    ...context,
                    index,
                },
            );
        if (proposal) {
            candidates.push(
                proposal,
            );
        }
    };
    (
        transaction?.segments ||
        []
    ).forEach(
        (
            segment,
            index,
        ) => {
            extractExplicitIncantations(
                segment?.textEn,
            ).forEach(match => {
                appendCandidate(
                    match,
                    {
                        sourceActorId:
                            segment
                                ?.type ===
                                'dialogue'
                                ? segment
                                    .actorId
                                : '',
                        evidenceContext:
                            segment
                                ?.textEn,
                        effectEn:
                            segment
                                ?.textEn ||
                            transaction
                                ?.publicEventEn,
                        index,
                    },
                );
            });
        },
    );
    extractPlayerDeclaredIncantations(
        context.playerAction,
    ).forEach(
        (
            match,
            index,
        ) => {
            appendCandidate(
                match,
                {
                    evidenceContext:
                        context
                            .playerAction,
                    effectEn:
                        transaction
                            ?.publicEventEn ||
                        (
                            transaction
                                ?.segments ||
                            []
                        ).map(segment =>
                            segment?.textEn)
                            .filter(Boolean)
                            .join(' '),
                    index:
                        (
                            transaction
                                ?.segments
                                ?.length ||
                            0
                        ) +
                        index,
                    playerDeclared:
                        match
                            .playerDeclared,
                },
            );
        },
    );
    const result = [
        ...new Map(
            candidates.map(
                candidate => [
                    candidate.key,
                    candidate,
                ],
            ),
        ).values(),
    ].slice(
        0,
        SPELL_PROPOSAL_LIMIT,
    );
    return result;
}

export function reconcileAuthoritativeSpellNarrative(
    transaction,
    worldState,
) {
    const authoritative =
        getAuthoritativeSceneSpells(
            worldState,
        );
    if (
        authoritative.length !==
            1 ||
        !transaction ||
        typeof transaction !==
            'object'
    ) {
        return {
            transaction,
            corrections: [],
        };
    }
    const authority =
        authoritative[0];
    const explicit =
        (
            transaction.segments ||
            []
        ).flatMap(segment =>
            extractExplicitIncantations(
                segment?.textEn,
            ).map(match => ({
                ...match,
                segmentText:
                    segment?.textEn ||
                    '',
            })));
    const incorrect =
        explicit.filter(match =>
            (
                match.incantation
                    .toLocaleLowerCase() !==
                authority.incantation
                    .toLocaleLowerCase()
            ) &&
            !isIndependentCustomIncantation(
                match,
                match.segmentText,
                authoritative,
            ));
    if (!incorrect.length) {
        return {
            transaction,
            corrections: [],
        };
    }
    const next =
        structuredClone(
            transaction,
        );
    const corrections =
        incorrect.map(match => ({
            from:
                match.incantation,
            to:
                authority
                    .incantation,
            spellId:
                authority.spellId,
        }));
    const replace =
        value => {
            let text =
                String(value || '');
            corrections.forEach(
                correction => {
                    const escaped =
                        correction.from
                            .replace(
                                /[.*+?^${}()|[\]\\]/gu,
                                '\\$&',
                            );
                    text =
                        text.replace(
                            new RegExp(
                                `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`,
                                'giu',
                            ),
                            correction.to,
                        );
                },
            );
            return text;
        };
    next.publicEventEn =
        replace(
            next.publicEventEn,
        );
    next.segments =
        (
            next.segments ||
            []
        ).map(segment => ({
            ...segment,
            textEn:
                replace(
                    segment.textEn,
                ),
        }));
    next.settlementWarnings = [
        ...(
            next
                .settlementWarnings ||
            []
        ),
        {
            code:
                'authoritative_spell_incantation_reconciled',
            detail:
                `${
                    corrections
                        .map(
                            correction =>
                                `${correction.from} -> ${correction.to}`,
                        )
                        .join(', ')
                } for ${
                    authority.spellId
                }.`,
        },
    ].slice(-24);
    return {
        transaction: next,
        corrections,
    };
}

export function queueSpellCandidates(
    worldState,
    candidates,
) {
    const next =
        structuredClone(
            worldState,
        );
    const decisions =
        new Set(
            (
                next
                    .spellProposalDecisions ||
                []
            ).flatMap(entry => [
                entry.key,
                entry.spellId,
            ]),
        );
    const pending =
        new Map(
            (
                next
                    .pendingSpellProposals ||
                []
            ).map(proposal => [
                proposal.key,
                proposal,
            ]),
        );
    (
        Array.isArray(candidates)
            ? candidates
            : []
    ).forEach(candidate => {
        if (
            !candidate?.key ||
            decisions.has(
                candidate.key,
            ) ||
            decisions.has(
                candidate.id,
            )
        ) {
            return;
        }
        pending.set(
            candidate.key,
            structuredClone(
                candidate,
            ),
        );
    });
    next.pendingSpellProposals = [
        ...pending.values(),
    ].slice(
        -SPELL_PROPOSAL_LIMIT,
    );
    return next;
}

export function getSpellProposalDecision(
    worldState,
    key,
) {
    return (
        worldState
            ?.spellProposalDecisions ||
        []
    ).find(entry =>
        entry.key ===
        key)?.decision ||
        '';
}

export function resolveSpellCandidate(
    worldState,
    key,
    decision,
) {
    const candidate =
        (
            worldState
                ?.pendingSpellProposals ||
            []
        ).find(proposal =>
            proposal.key ===
            key);
    if (
        !candidate ||
        ![
            'accepted',
            'ignored',
        ].includes(decision)
    ) {
        return {
            state:
                worldState,
            changed: false,
        };
    }
    let next =
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
    if (
        decision ===
            'accepted' &&
        !next.spellbook
            .known
            .some(entry =>
                entry.spellId ===
                candidate.id)
    ) {
        const learned =
            normalizeKnownSpell({
                spellId:
                    candidate.id,
                definition:
                    candidate
                        .definition,
                learnedSource:
                    'special_instruction',
                learnedSourceDetail:
                    `Player recorded ${
                        candidate
                            .incantation
                    } from explicit narrative teaching.`,
                firstLearnedClock:
                    next.clock ||
                    candidate
                        .createdClock,
                firstLearnedTurn:
                    next.turn
                        ?.count ||
                    0,
                proficiencyXp:
                    8,
                sortOrder:
                    next.spellbook
                        .known
                        .length,
            });
        if (learned) {
            next.spellbook
                .known
                .push(learned);
            next.spellbook
                .lastUpdatedClock =
                next.clock ||
                candidate
                    .createdClock;
        }
    }
    next.pendingSpellProposals =
        (
            next
                .pendingSpellProposals ||
            []
        ).filter(proposal =>
            proposal.key !==
            key);
    next.spellProposalDecisions = [
        ...(
            next
                .spellProposalDecisions ||
            []
        ).filter(entry =>
            entry.key !==
            key),
        {
            key,
            spellId:
                candidate.id,
            decision,
            decidedClock:
                next.clock ||
                candidate
                    .createdClock,
        },
    ].slice(
        -SPELL_DECISION_LIMIT,
    );
    return {
        state: next,
        changed: true,
        candidate,
        decision,
    };
}
