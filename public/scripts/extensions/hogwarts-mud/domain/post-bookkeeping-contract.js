/**
 * Field routes: vcon013.result.temporaryActors, firstImpressions,
 * sceneProgression, pacingRealization, historicalClaims.
 * Shapes request proposals; owning domain guards remain the only authority.
 */
const text = (maxLength = 500) => ({ type: 'string', maxLength });
const list = (items, maxItems = 16) => ({ type: 'array', items, maxItems });
const object = properties => ({
    type: 'object',
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
});
const nullable = schema => ({ anyOf: [{ type: 'null' }, schema] });

export const POST_BOOKKEEPING_PROPERTIES = {
    temporaryActors: list(object({
        id: text(80),
        nameEn: text(160),
        aliases: list(text(160)),
        roleEn: text(240),
        publicProfile: object({ descriptionEn: text(2000), backgroundEn: text(3000) }),
        performanceCore: object({
            temperamentEn: text(1000), speechStyleEn: text(1000),
            motivesEn: list(text()), socialStrategiesEn: list(text()),
            boundariesEn: list(text()), vulnerabilitiesEn: list(text()),
        }),
        privateFacts: object({ secretEn: text(2000), knowledgeEn: list(text(1200), 32) }),
        runtime: object({
            present: { type: 'boolean' }, roomId: text(120),
            currentActivityEn: text(1000), currentIntentEn: text(1000), currentGoalEn: text(1000),
        }),
        initialRelationshipToPlayerEn: text(),
        firstImpressionOfPlayerEn: text(),
    }), 2),
    firstImpressions: list(object({
        actorId: text(96),
        currentActivityEn: text(),
        firstImpressionOfPlayerEn: text(),
        evidenceText: text(),
    })),
    sceneProgression: nullable(object({
        type: { type: 'string', enum: [
            'npc_initiative', 'access_change', 'practical_step', 'new_information', 'social_shift',
        ] },
        summaryEn: text(1000),
        evidenceText: text(),
    })),
    pacingRealization: nullable(object({
        beatId: text(160), realized: { type: 'boolean' }, evidenceText: text(),
    })),
    historicalClaims: list(object({
        segmentIndex: { type: 'integer', minimum: 0 },
        actorId: text(96),
        claimTextEn: text(1000),
        sourceEventIds: list(text(160)),
    })),
};

export const POST_BOOKKEEPING_SYSTEM = `
Unified bookkeeping:
- The narrative is immutable. Never return revised segments or prose.
- temporaryActors formally proposes only a new message-local speaker selected for direct continuing interaction by temporaryActorPromotionPolicy, at most two. Use its exact declaration ID and displayNameEn as nameEn, current room and present:true. Keep required privateFacts as {secretEn:"",knowledgeEn:[]} and both initialRelationshipToPlayerEn and firstImpressionOfPlayerEn as empty strings. Never recreate a supplied/reserved Actor.
- firstImpressions is only an observable first meeting for an ID in firstMeetingActorIds. It is not a relationship update. Use exact narrative evidence and [] otherwise.
- sceneProgression describes a completed observable change, not a plan. Use an exact narrative evidenceText and concise summaryEn. Return null if no supported progression occurred.
- pacingRealization is null when no pending beat exists. Otherwise use its exact beatId, say whether it was realized, and quote exact narrative evidence for true. Do not consume the beat yourself.
- historicalClaims annotates concrete recalled facts in dialogue only. Use its exact segmentIndex/actorId/claim substring and only supporting Event IDs supplied for that same speaker. Never borrow another speaker's evidence. [] means no supported annotations.
- Actor and Inventory updates are the sole sources for their domains. Never also emit a Scene stateProposals form.
- Empty arrays and nullable null mean a genuine no-change assessment, not an omitted field.
- When recoveryTargets is supplied, return only requested fields. Accepted constraints are immutable and must not be reissued or replaced. Do not return new unrelated operations.`;

export function selectPostOutputSchema(base, input = {}) {
    const schema = structuredClone(base);
    const selected = input.recoveryTargets?.families;
    if (!Array.isArray(selected)) return schema;
    const allowed = new Set(['schemaVersion', ...selected]);
    schema.properties = Object.fromEntries(
        Object.entries(schema.properties).filter(([key]) => allowed.has(key)),
    );
    schema.required = schema.required.filter(key => allowed.has(key));
    return schema;
}

export function selectLocalPostOutputSchema(base, input = {}) {
    const schema = selectPostOutputSchema(base, input);
    const visit = descriptor => {
        if (!descriptor || typeof descriptor !== 'object') return;
        // llama.cpp rejects >=2000 bounded repetitions; Zod still enforces these lengths on return.
        if (descriptor.type === 'string' && descriptor.maxLength >= 2000) delete descriptor.maxLength;
        Object.values(descriptor).forEach(visit);
    };
    visit(schema);
    return schema;
}
