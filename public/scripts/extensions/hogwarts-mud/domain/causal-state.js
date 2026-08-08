export const CAUSAL_COLLAPSE_VERSION = 1;
export const CAUSAL_COLLAPSE_MIN_CHECK_TURNS = 6;
export const CAUSAL_COLLAPSE_MAX_BINDINGS_PER_SCENE = 1;
export const CAUSAL_COLLAPSE_KINDS = new Set([
    'social_edge',
    'offscreen_event',
    'institutional_fact',
    'material_history',
    'obligation',
    'rumor_route',
]);
export const CAUSAL_COLLAPSE_PERSISTENCE_TARGETS =
    new Set([
        'event',
        'social_graph',
        'room_state',
        'item',
        'rumor',
        'obligation',
    ]);
export const CAUSAL_COLLAPSE_KEYS =
    new Set([
        'kind',
        'focusActorId',
        'relatedActorIds',
        'itemId',
        'mapId',
        'roomId',
        'effectiveMinutesBeforeObservation',
        'factEn',
        'edgeType',
        'visibleResiduesEn',
        'aftermathEn',
        'witnessAccounts',
        'sourceEventIds',
        'persistenceTargets',
        'surfaceMode',
        'consequenceMode',
        'irreversible',
        'requiresHighTier',
    ]);
export const CAUSAL_SOCIAL_STRUCTURAL_TAG_BY_EDGE_TYPE =
    Object.freeze({
        roommate: 'roommate',
        classmate: 'classmate',
        rival: 'rivalry',
        neighbor: 'neighbor',
        witness: 'witness',
        creditor: 'creditor',
        debtor: 'debtor',
    });
export const CAUSAL_WITNESS_ACCOUNT_KEYS =
    new Set([
        'actorId',
        'accountEn',
    ]);

export function normalizeCausalCollapseState(
    value = {},
) {
    return {
        version:
            CAUSAL_COLLAPSE_VERSION,
        minimumCheckIntervalTurns:
            CAUSAL_COLLAPSE_MIN_CHECK_TURNS,
        maximumBindingsPerScene:
            CAUSAL_COLLAPSE_MAX_BINDINGS_PER_SCENE,
        lastCheckedTurn:
            Number.isInteger(
                value.lastCheckedTurn,
            )
                ? Math.max(
                    0,
                    value.lastCheckedTurn,
                )
                : null,
        lastBoundTurn:
            Number.isInteger(
                value.lastBoundTurn,
            )
                ? Math.max(
                    0,
                    value.lastBoundTurn,
                )
                : null,
        checkedSlots:
            Array.isArray(
                value.checkedSlots,
            )
                ? value.checkedSlots
                    .filter(entry =>
                        entry?.key &&
                        Number.isInteger(
                            entry.checkedTurn,
                        ))
                    .slice(-100)
                : [],
        records:
            Array.isArray(
                value.records,
            )
                ? value.records
                    .filter(record =>
                        record?.id &&
                        CAUSAL_COLLAPSE_KINDS
                            .has(record.kind) &&
                        record.factEn)
                    .slice(-100)
                : [],
    };
}
