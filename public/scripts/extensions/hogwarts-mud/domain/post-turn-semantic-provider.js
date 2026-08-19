export const DEFAULT_POST_TURN_SEMANTIC_PROVIDER =
    'low';

export const POST_TURN_SEMANTIC_PROVIDERS =
    Object.freeze([
        'low',
        'local',
    ]);

export function normalizePostTurnSemanticProvider(
    value,
) {
    return POST_TURN_SEMANTIC_PROVIDERS.includes(
        value,
    )
        ? value
        : DEFAULT_POST_TURN_SEMANTIC_PROVIDER;
}
