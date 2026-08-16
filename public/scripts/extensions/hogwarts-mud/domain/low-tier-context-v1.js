export const LOW_TIER_CONTEXT_VERSION = 1;
export const LOW_TIER_CONTEXT_KEYS =
    Object.freeze([
        'playerTurn',
        'sceneFacts',
        'actorCards',
        'actionOpportunities',
        'memoryActivations',
        'prohibitions',
    ]);
export const LOW_TIER_CONTEXT_MAX_BYTES =
    50 * 1024;
export const LOW_TIER_ACTOR_CARD_MAX_BYTES =
    4 * 1024;
export const LOW_TIER_ACTIVE_SCHEMA_LIMIT = 3;
export const LOW_TIER_ACTOR_EVENT_LIMIT = 3;
export const LOW_TIER_GLOBAL_EVENT_LIMIT = 8;

function clone(value, fallback) {
    try {
        const serialized =
            JSON.stringify(value);
        return serialized === undefined
            ? fallback
            : JSON.parse(serialized);
    } catch {
        return fallback;
    }
}

function utf8ByteLength(value) {
    const source = String(value);
    let length = 0;
    for (
        let index = 0;
        index < source.length;
        index++
    ) {
        const code =
            source.charCodeAt(index);
        if (code <= 0x7f) {
            length++;
        } else if (code <= 0x7ff) {
            length += 2;
        } else if (
            code >= 0xd800 &&
            code <= 0xdbff &&
            index + 1 < source.length &&
            source.charCodeAt(index + 1) >=
                0xdc00 &&
            source.charCodeAt(index + 1) <=
                0xdfff
        ) {
            length += 4;
            index++;
        } else {
            length += 3;
        }
    }
    return length;
}

function bytes(value) {
    return utf8ByteLength(
        JSON.stringify(value),
    );
}

function text(value, maximumLength = 1000) {
    return String(value ?? '')
        .normalize('NFC')
        .trim()
        .slice(0, maximumLength);
}

function textList(
    values,
    maximumItems,
    maximumLength = 320,
) {
    return [
        ...new Set(
            (
                Array.isArray(values)
                    ? values
                    : []
            )
                .map(value =>
                    text(
                        value,
                        maximumLength,
                    ))
                .filter(Boolean),
        ),
    ].slice(0, maximumItems);
}

function compactActorCard(card) {
    const next = clone(card, {});
    const lists = [
        next.performanceCore?.motivesEn,
        next.performanceCore
            ?.socialStrategiesEn,
        next.performanceCore
            ?.boundariesEn,
        next.relationStance
            ?.actionBiasesEn,
        next.relationStance
            ?.activeSentimentsEn,
        next.relationStance?.labels,
    ].filter(Array.isArray);
    while (
        bytes(next) >
            LOW_TIER_ACTOR_CARD_MAX_BYTES &&
        lists.some(values =>
            values.length > 1)
    ) {
        lists
            .sort((left, right) =>
                right.length -
                left.length)[0]
            .pop();
    }
    const stringSlots = [
        [next.runtime, 'presentation'],
        [next.runtime, 'activityEn'],
        [next.runtime, 'intentEn'],
        [
            next.performanceCore,
            'speechStyleEn',
        ],
        [
            next.performanceCore,
            'temperamentEn',
        ],
    ];
    for (const [owner, key] of stringSlots) {
        while (
            owner &&
            bytes(next) >
                LOW_TIER_ACTOR_CARD_MAX_BYTES &&
            String(owner[key] || '')
                .length > 80
        ) {
            owner[key] =
                String(owner[key])
                    .slice(
                        0,
                        Math.max(
                            80,
                            Math.floor(
                                owner[key]
                                    .length /
                                2,
                            ),
                        ),
                    );
        }
    }
    return next;
}

function relationshipStance(
    state,
    actorId,
) {
    const edge =
        (
            state.socialGraph
                ?.relationships ||
            []
        ).find(candidate =>
            (
                candidate.sourceActorId ===
                    actorId &&
                candidate.targetActorId ===
                    'player'
            ) ||
            (
                candidate.sourceActorId ===
                    'player' &&
                candidate.targetActorId ===
                    actorId
            ));
    return {
        labels:
            textList(
                edge?.labels ||
                edge?.structuralTags,
                8,
                80,
            ),
        actionBiasesEn:
            textList(
                edge?.actionBiasesEn,
                6,
            ),
        activeSentimentsEn:
            textList(
                (
                    edge?.activeEmotions ||
                    []
                ).map(emotion =>
                    emotion?.emotion),
                6,
                80,
            ),
    };
}

function buildActorCards(
    state,
    actorIds,
) {
    const cores =
        new Map(
            (
                state.actorLibrary ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const runtimes =
        new Map(
            (
                state.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    return actorIds
        .map(actorId => {
            const core =
                cores.get(actorId);
            const runtime =
                runtimes.get(actorId);
            if (!core || !runtime) {
                return null;
            }
            const performanceCore =
                core.performanceCore ||
                {};
            const presentation =
                state
                    .actorPresentations?.[
                        actorId
                    ] ||
                {};
            return compactActorCard({
                actorId,
                nameEn:
                    text(
                        core.nameEn,
                        160,
                    ),
                roleEn:
                    text(
                        core.roleEn,
                        160,
                    ),
                performanceCore: {
                    temperamentEn:
                        text(
                            performanceCore
                                .temperamentEn,
                            800,
                        ),
                    speechStyleEn:
                        text(
                            performanceCore
                                .speechStyleEn,
                            800,
                        ),
                    motivesEn:
                        textList(
                            performanceCore
                                .motivesEn,
                            5,
                        ),
                    socialStrategiesEn:
                        textList(
                            performanceCore
                                .socialStrategiesEn,
                            5,
                        ),
                    boundariesEn:
                        textList(
                            performanceCore
                                .boundariesEn,
                            5,
                        ),
                },
                runtime: {
                    activityEn:
                        text(
                            runtime
                                .currentActivityEn,
                            500,
                        ),
                    intentEn:
                        text(
                            runtime
                                .currentIntentEn,
                            500,
                        ),
                    location:
                        [
                            runtime.mapId,
                            runtime.roomId,
                        ]
                            .filter(Boolean)
                            .join(':'),
                    presentation:
                        text(
                            presentation
                                .outfitEn,
                            500,
                        ),
                },
                relationStance:
                    relationshipStance(
                        state,
                        actorId,
                    ),
            });
        })
        .filter(Boolean);
}

function projectMemoryActivations(
    capsules,
    actorIds,
) {
    let globalEvents = 0;
    const byActorId = {};
    for (const actorId of actorIds) {
        const capsule =
            capsules
                ?.byActorId?.[
                    actorId
                ];
        if (!capsule) continue;
        const remaining =
            Math.max(
                0,
                LOW_TIER_GLOBAL_EVENT_LIMIT -
                    globalEvents,
            );
        const supportingEvents =
            (
                capsule.supportingEvents ||
                []
            )
                .slice(
                    0,
                    Math.min(
                        LOW_TIER_ACTOR_EVENT_LIMIT,
                        remaining,
                    ),
                )
                .map(event => ({
                    recordId:
                        text(
                            event.recordId,
                            180,
                        ),
                    text:
                        text(
                            event.text,
                            1200,
                        ),
                    sceneId:
                        text(
                            event.sceneId,
                            180,
                        ),
                    effectiveClock:
                        text(
                            event
                                .effectiveClock,
                            120,
                        ),
                    sourceRefs:
                        clone(
                            event.sourceRefs,
                            [],
                        ).slice(0, 12),
                }));
        globalEvents +=
            supportingEvents.length;
        byActorId[actorId] = {
            version:
                Number(
                    capsule.version,
                ) || 1,
            scope: 'observer',
            observerId: actorId,
            expectations:
                (
                    capsule
                        .expectations ||
                    []
                )
                    .slice(
                        0,
                        LOW_TIER_ACTIVE_SCHEMA_LIMIT,
                    )
                    .map(expectation => ({
                        schemaId:
                            text(
                                expectation
                                    .schemaId,
                                180,
                            ),
                        observerId:
                            text(
                                expectation
                                    .observerId ||
                                actorId,
                                180,
                            ),
                        targetId:
                            text(
                                expectation
                                    .targetId,
                                180,
                            ),
                        expectationEn:
                            text(
                                expectation
                                    .expectationEn,
                                800,
                            ),
                        confidence:
                            Number(
                                expectation
                                    .confidence,
                            ) || 0,
                        status:
                            text(
                                expectation
                                    .status,
                                40,
                            ),
                    })),
            supportingEvents,
            sourceIds:
                textList(
                    capsule.sourceIds,
                    24,
                    180,
                ),
            confidence:
                Number(
                    capsule.confidence,
                ) || 0,
            capsuleId:
                text(
                    capsule.capsuleId,
                    180,
                ),
            sealed: true,
        };
    }
    return {
        version:
            Number(capsules?.version) ||
            LOW_TIER_CONTEXT_VERSION,
        common:
            clone(
                capsules?.common,
                {
                    facts: [],
                    sealed: true,
                },
            ),
        byActorId,
    };
}

function removeOneSlowEvent(
    context,
) {
    const capsules =
        Object.values(
            context.memoryActivations
                ?.byActorId ||
            {},
        ).reverse();
    const capsule =
        capsules.find(current =>
            current.supportingEvents
                ?.length);
    if (!capsule) return false;
    capsule.supportingEvents.pop();
    return true;
}

function shrinkLargestString(
    value,
) {
    let candidate = null;
    const visit = current => {
        if (
            !current ||
            typeof current !== 'object'
        ) {
            return;
        }
        for (const [
            key,
            entry,
        ] of Object.entries(current)) {
            if (
                typeof entry === 'string' &&
                (
                    !candidate ||
                    entry.length >
                        candidate.value.length
                )
            ) {
                candidate = {
                    owner: current,
                    key,
                    value: entry,
                };
            } else if (
                entry &&
                typeof entry === 'object'
            ) {
                visit(entry);
            }
        }
    };
    visit(value);
    if (!candidate?.value.length) {
        return false;
    }
    candidate.owner[candidate.key] =
        candidate.value.slice(
            0,
            Math.floor(
                candidate.value.length /
                2,
            ),
        );
    return true;
}

function shrinkLargestArray(
    value,
) {
    let candidate = null;
    const visit = current => {
        if (
            !current ||
            typeof current !== 'object'
        ) {
            return;
        }
        if (Array.isArray(current)) {
            if (
                current.length &&
                (
                    !candidate ||
                    current.length >
                        candidate.length
                )
            ) {
                candidate = current;
            }
        }
        for (const entry of Object.values(
            current,
        )) {
            if (
                entry &&
                typeof entry === 'object'
            ) {
                visit(entry);
            }
        }
    };
    visit(value);
    if (!candidate) return false;
    candidate.splice(
        Math.ceil(
            candidate.length / 2,
        ),
    );
    return true;
}

export function isLowTierContextV1(
    value,
) {
    if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value)
    ) {
        return false;
    }
    const keys =
        Object.keys(value).sort();
    return (
        keys.length ===
            LOW_TIER_CONTEXT_KEYS
                .length &&
        keys.every(
            (
                key,
                index,
            ) =>
                key ===
                [...LOW_TIER_CONTEXT_KEYS]
                    .sort()[index],
        )
    );
}

export function trimLowTierContextV1(
    value,
    maximumBytes =
    LOW_TIER_CONTEXT_MAX_BYTES,
) {
    const context =
        clone(value, {
            playerTurn: {},
            sceneFacts: {},
            actorCards: [],
            actionOpportunities: [],
            memoryActivations: {
                common: {
                    facts: [],
                    sealed: true,
                },
                byActorId: {},
            },
            prohibitions: [],
        });
    while (
        bytes(context) >
            maximumBytes &&
        removeOneSlowEvent(context)
    ) {
        // Remove hydrated history before other context.
    }
    while (
        bytes(context) >
            maximumBytes &&
        context.actionOpportunities
            .length
    ) {
        context.actionOpportunities
            .pop();
    }
    const commonFacts =
        context.memoryActivations
            ?.common?.facts;
    while (
        bytes(context) >
            maximumBytes &&
        Array.isArray(commonFacts) &&
        commonFacts.length
    ) {
        commonFacts.pop();
    }
    if (
        bytes(context) >
            maximumBytes &&
        context.playerTurn?.repair
            ?.invalidOutput
    ) {
        const invalid =
            context.playerTurn
                .repair.invalidOutput;
        context.playerTurn
            .repair.invalidOutput = {
                segments:
                    clone(
                        invalid.segments,
                        [],
                    ).map(segment =>
                        Object.fromEntries(
                            [
                                'type',
                                'actorId',
                                'textEn',
                                'historicalClaims',
                            ]
                                .filter(key =>
                                    Object.hasOwn(
                                        segment,
                                        key,
                                    ))
                                .map(key => [
                                    key,
                                    segment[key],
                                ]),
                        )),
            };
    }
    if (
        bytes(context) >
        maximumBytes
    ) {
        context.prohibitions =
            clone(
                context.prohibitions,
                [],
            ).slice(0, 8);
    }
    while (
        bytes(context) >
            maximumBytes &&
        shrinkLargestString(context)
    ) {
        // Preserve the six-field shape while reducing oversized leaf text.
    }
    while (
        bytes(context) >
            maximumBytes &&
        shrinkLargestArray(context)
    ) {
        // Arrays are reduced only after all text has been compacted.
    }
    return context;
}

export function trimLowTierContextForBudget(
    value,
    maximumBytes,
) {
    return isLowTierContextV1(value)
        ? trimLowTierContextV1(
            value,
            maximumBytes,
        )
        : null;
}

export function projectLowTierContextV1(
    state,
    {
        actorIds = [],
        playerTurn = {},
        sceneFacts = {},
        actionOpportunities = [],
        memoryActivationCapsules = {},
        prohibitions = [],
    } = {},
) {
    const stableActorIds = [
        ...new Set(
            actorIds
                .map(actorId =>
                    text(
                        actorId,
                        180,
                    ))
                .filter(Boolean),
        ),
    ].sort();
    return trimLowTierContextV1({
        playerTurn:
            clone(playerTurn, {}),
        sceneFacts:
            clone(sceneFacts, {}),
        actorCards:
            buildActorCards(
                state,
                stableActorIds,
            ),
        actionOpportunities:
            clone(
                actionOpportunities,
                [],
            ),
        memoryActivations:
            projectMemoryActivations(
                memoryActivationCapsules,
                stableActorIds,
            ),
        prohibitions:
            clone(prohibitions, []),
    });
}
