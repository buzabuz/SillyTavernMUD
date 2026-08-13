const CONCRETE_PRIOR_TIME_PATTERN =
    /\b(?:yesterday|last\s+(?:night|week|month|term|year|summer|winter|spring|autumn|fall)|(?:on|that)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:earlier|previously|before)\s+(?:that|then|today|tonight)|(?:at|on)\s+\d{1,2}(?::\d{2})?|in\s+\d{4})\b/iu;

const CONCRETE_RECALL_PATTERN =
    /\b(?:remember|recall|when)\b.{0,120}\b(?:you|we|i|he|she|they)\b|\b(?:you|we)\b.{0,100}\b(?:said|told|asked|promised|hid|left|gave|took|broke|found|met|helped|refused|lied|saved|ran|went|came|were|did|had)\b/iu;

const CONCRETE_QUOTATION_PATTERN =
    /\b(?:you|we|i|he|she|they)\s+(?:said|told|asked|promised|shouted|whispered|called)\b.{0,80}["“'‘][^"”'’]{2,}["”'’]/iu;

const NON_ASSERTIVE_PATTERN =
    /\b(?:might|may|maybe|perhaps|probably|possibly|expect|expects|expected|anticipate|anticipated|assume|assumed|guess|guessed|imagine|imagined|would|could)\b/iu;

const NON_EPISODIC_GIST_PATTERN =
    /\b(?:always|usually|often|sometimes|generally|normally|typically|habitually|whenever|tends?|tended|every\s+time)\b/iu;

const EXPLICIT_CURRENT_ACTION_PATTERN =
    /\b(?:now|currently|right\s+now|at\s+present)\b/iu;

const CONCRETE_PAST_SUBJECT =
    String.raw`(?:i|you|we|he|she|they|the\s+[\p{L}'’-]+|[\p{L}][\p{L}'’-]*(?:\s+[\p{L}][\p{L}'’-]*){0,3})`;

const CONCRETE_PAST_ACTION =
    String.raw`(?:hid|hidden|put|taught|cast|left|gave|given|took|taken|broke|broken|found|met|helped|refused|lied|saved|ran|went|gone|came|was|were|did|done|stole|stolen|returned|brought|kept|made|sent|showed|held|wrote|written|heard|saw|seen|spoke|spoken|told|said|whispered|waited|packed)`;

const CONCRETE_PAST_ACTION_PATTERN =
    new RegExp(
        String.raw`\b${CONCRETE_PAST_SUBJECT}\s+(?:(?:had|has)\s+)?${CONCRETE_PAST_ACTION}\b`,
        'iu',
    );

const CONCRETE_PLACE_PATTERN =
    /\b(?:in|at|inside|outside|behind|beneath|under|near|beside|within|across|through|along|from|into|onto)\s+(?:(?:my|your|his|her|our|their|the|this|that|a|an)\s+)?[\p{L}\p{N}'’-]+(?:\s+[\p{L}\p{N}'’-]+){0,5}\b/iu;

const CONCRETE_OBJECT_PATTERN =
    /\b(?:my|your|his|her|our|their|the|this|that|these|those|a|an|[\p{L}][\p{L}'’-]*['’]s)\s+[\p{L}\p{N}'’-]+(?:\s+[\p{L}\p{N}'’-]+){0,3}\b/iu;

const CONCRETE_QUOTED_TEXT_PATTERN =
    /(?:["“][^"”\r\n]{2,}["”]|‘[^’\r\n]{2,}’)/u;

const SUPPORT_STOP_WORDS =
    new Set([
        'about',
        'after',
        'again',
        'before',
        'could',
        'from',
        'have',
        'into',
        'just',
        'last',
        'might',
        'said',
        'that',
        'their',
        'there',
        'they',
        'this',
        'told',
        'when',
        'where',
        'with',
        'would',
        'yesterday',
        'your',
    ]);

function normalizeId(
    value,
) {
    return String(value || '')
        .trim();
}

function segmentSentences(
    text,
) {
    return String(text || '')
        .split(/(?<=[.!?])\s+/u)
        .map(value =>
            value.trim())
        .filter(Boolean);
}

function isConcretePriorClaim(
    text,
) {
    const value =
        String(text || '')
            .trim();
    if (
        !value
    ) {
        return false;
    }
    const hasAssertiveConcretePastAction =
        !NON_ASSERTIVE_PATTERN
            .test(value) &&
        !NON_EPISODIC_GIST_PATTERN
            .test(value) &&
        !EXPLICIT_CURRENT_ACTION_PATTERN
            .test(value) &&
        CONCRETE_PAST_ACTION_PATTERN
            .test(value) &&
        (
            CONCRETE_PLACE_PATTERN
                .test(value) ||
            CONCRETE_OBJECT_PATTERN
                .test(value) ||
            CONCRETE_QUOTED_TEXT_PATTERN
                .test(value)
        );
    return (
        CONCRETE_PRIOR_TIME_PATTERN
            .test(value) ||
        CONCRETE_QUOTATION_PATTERN
            .test(value) ||
        hasAssertiveConcretePastAction ||
        (
            !NON_ASSERTIVE_PATTERN
                .test(value) &&
            CONCRETE_RECALL_PATTERN
                .test(value)
        )
    );
}

function isExplicitPriorClaim(
    text,
) {
    const value =
        String(text || '')
            .trim();
    return (
        CONCRETE_PRIOR_TIME_PATTERN
            .test(value) ||
        CONCRETE_RECALL_PATTERN
            .test(value)
    );
}

function supportTokens(
    value,
) {
    return new Set(
        String(value || '')
            .toLocaleLowerCase()
            .match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)
            ?.filter(token =>
                token.length >= 4 &&
                !SUPPORT_STOP_WORDS
                    .has(token)) ||
        [],
    );
}

function concreteClaimSubjectTokens(
    value,
) {
    const pattern =
        new RegExp(
            String.raw`(?:^|[.!?;,]\s*)(${CONCRETE_PAST_SUBJECT})\s+(?:(?:had|has)\s+)?${CONCRETE_PAST_ACTION}\b`,
            'giu',
        );
    const tokens = new Set();
    for (
        const match
        of String(value || '')
            .matchAll(pattern)
    ) {
        for (
            const token
            of supportTokens(
                match[1],
            )
        ) {
            tokens.add(token);
        }
    }
    return tokens;
}

function hasDeterministicSupport(
    claimText,
    events,
) {
    const claimTokens =
        supportTokens(claimText);
    if (!claimTokens.size) {
        return true;
    }
    const evidenceTokens =
        supportTokens(
            events.map(event => [
                event.text,
                event.title,
                event.sceneId,
                event.effectiveClock,
            ].filter(Boolean).join(' '))
                .join(' '),
        );
    const shared = [
        ...claimTokens,
    ].filter(token =>
        evidenceTokens.has(token));
    const subjectTokens =
        concreteClaimSubjectTokens(
            claimText,
        );
    const sharedAnchors =
        shared.filter(token =>
            !subjectTokens.has(
                token,
            ));
    return (
        sharedAnchors.length >= 2 ||
        sharedAnchors.some(token =>
            token.length >= 8)
    );
}

function capsuleEventsBySourceId(
    capsule,
) {
    const eventsById =
        new Map();
    (
        capsule
            ?.supportingEvents ||
        []
    ).forEach(event => {
        (
            event.sourceRefs ||
            []
        )
            .filter(ref =>
                ref?.type ===
                    'event')
            .forEach(ref => {
                const eventId =
                    normalizeId(
                        ref.id,
                    );
                if (eventId) {
                    eventsById.set(
                        eventId,
                        event,
                    );
                }
            });
    });
    return eventsById;
}

function error(
    segmentIndex,
    detail,
) {
    return (
        `unsupported_historical_detail [segment:${segmentIndex + 1}]: ${detail}`
    );
}

export function validateHistoricalClaimProvenance(
    segments,
    memoryActivationCapsules,
) {
    const byActorId =
        memoryActivationCapsules
            ?.byActorId &&
        typeof memoryActivationCapsules
            .byActorId ===
            'object'
            ? memoryActivationCapsules
                .byActorId
            : {};
    const errors = [];
    (
        Array.isArray(segments)
            ? segments
            : []
    ).forEach((segment, segmentIndex) => {
        const text =
            String(
                segment?.textEn ||
                '',
            ).trim();
        const claims =
            Array.isArray(
                segment
                    ?.historicalClaims,
            )
                ? segment
                    .historicalClaims
                : [];
        const concreteSentences =
            segmentSentences(text)
                .filter(sentence =>
                    segment?.type ===
                        'narration'
                        ? isExplicitPriorClaim(
                            sentence,
                        )
                        : isConcretePriorClaim(
                            sentence,
                        ));
        if (
            !claims.length &&
            !concreteSentences.length
        ) {
            return;
        }
        if (
            segment?.type !==
                'dialogue' ||
            !normalizeId(
                segment.actorId,
            )
        ) {
            errors.push(
                error(
                    segmentIndex,
                    'narrator segments cannot consume actor-private supporting Events.',
                ),
            );
            return;
        }
        const actorId =
            normalizeId(
                segment.actorId,
            );
        const capsule =
            byActorId[
                actorId
            ];
        const eventsById =
            capsuleEventsBySourceId(
                capsule,
            );
        if (
            concreteSentences
                .some(sentence =>
                    !claims.some(claim =>
                        sentence.includes(
                            String(
                                claim
                                    ?.claimTextEn ||
                                '',
                            ).trim(),
                        )))
        ) {
            errors.push(
                error(
                    segmentIndex,
                    `actor ${actorId} made a concrete prior-time/place/action/quotation claim without claim-level Event provenance.`,
                ),
            );
        }
        claims.forEach((claim, claimIndex) => {
            const claimText =
                String(
                    claim
                        ?.claimTextEn ||
                    '',
                ).trim();
            const sourceEventIds = [
                ...new Set(
                    (
                        Array.isArray(
                            claim
                                ?.sourceEventIds,
                        )
                            ? claim
                                .sourceEventIds
                            : []
                    )
                        .map(normalizeId)
                        .filter(Boolean),
                ),
            ];
            if (
                !claimText ||
                !text.includes(
                    claimText,
                )
            ) {
                errors.push(
                    error(
                        segmentIndex,
                        `historicalClaims[${claimIndex}] must quote an exact non-empty substring of textEn.`,
                    ),
                );
                return;
            }
            if (
                !sourceEventIds
                    .length
            ) {
                errors.push(
                    error(
                        segmentIndex,
                        `historicalClaims[${claimIndex}] has no sourceEventIds.`,
                    ),
                );
                return;
            }
            const unauthorizedIds =
                sourceEventIds
                    .filter(eventId =>
                        !eventsById
                            .has(
                                eventId,
                            ));
            if (
                unauthorizedIds
                    .length
            ) {
                errors.push(
                    error(
                        segmentIndex,
                        `actor ${actorId} cannot access supporting Event(s) ${unauthorizedIds.join(', ')}.`,
                    ),
                );
                return;
            }
            const supportingEvents =
                sourceEventIds.map(
                    eventId =>
                        eventsById.get(
                            eventId,
                        ),
                );
            if (
                !hasDeterministicSupport(
                    claimText,
                    supportingEvents,
                )
            ) {
                errors.push(
                    error(
                        segmentIndex,
                        `historicalClaims[${claimIndex}] does not share a concrete anchor with its supporting Event evidence.`,
                    ),
                );
            }
        });
    });
    return {
        valid:
            errors.length === 0,
        errors,
    };
}
