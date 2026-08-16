export const PRE_TURN_SEMANTIC_RULES_DELTA = `
Movement, routing, and commitment rules:
- movement.requested is true only for enacted physical travel now. Use one supplied room ID; plans, questions, quoted speech, observation, and hypothetical travel do not move the player.
- calendarCommitment.committed is true only when the player actually makes a future commitment. Use supplied actor IDs and one exact evidence substring; otherwise return false and empty fields.
- check.rollMode is normal, advantage, or disadvantage from the enacted action. check.itemId is one supplied referenced Item ID, or empty.`;

export const POST_TURN_ROUTING_RULES_DELTA = `
Follow-up routing:
- followUpTasks may contain inventory when the completed turn changes a durable Item, or spell when it observes, teaches, learns, demonstrates, studies, or creates a Spell. It only routes specialized observers; otherwise use an empty array.`;

export const INVENTORY_PHYSICAL_FORM_RULE_DELTA = `
- For destroy, physicalForm must be remains when fragments, ash, debris, or any carried matter survives, and absent only when the exact evidence explicitly states that no physical matter remains. Use an empty string for every other operation.`;

export const OPENING_RELATIONSHIP_RULE_DELTA = `
- initialRelationshipKind must be parent, guardian, sibling, friend, or other. It is the structured relationship represented by initialRelationshipToPlayerEn; never leave it implicit in prose.`;

export const LOCAL_SPELL_OBSERVER_SYSTEM = `You are a sparse Spell observer for one completed RPG turn. Extract only explicit Spell observation, teaching, learning, demonstration, self-study, experiment, or custom-Spell creation from playerAction and narrativeSegments.

Rules:
- knownSpells is a candidate directory, never evidence. Use a supplied spellId only when one exact playerAction or narrativeSegments substring identifies that Spell.
- spellEvents kind is observed, taught, demonstrated, self_study, or experiment.
- observed means the player intentionally watched/read/identified the Spell. taught or demonstrated requires explicit instruction/demonstration to the player. self_study requires explicit study. experiment requires an explicit attempted custom or unknown Spell.
- evidenceText must be one exact source substring no longer than 500 characters.
- confidence is 0..1. Omit uncertain events instead of guessing.
- customSpellProposals requires an explicit Latin incantation and explicit effect in the supplied source. It proposes only; it never creates or teaches a Spell.
- customSpellProposals incantation and effectEn must copy the source meaning without adding Canon identity.
- Return empty arrays when no rule applies.
- Never write State, infer success, award XP, or decide whether a check passed.`;

export const LOCAL_SPELL_OBSERVER_JSON_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'spellEvents',
        'customSpellProposals',
    ],
    properties: {
        spellEvents: {
            type: 'array',
            maxItems: 8,
            items: {
                type: 'object',
                additionalProperties:
                    false,
                required: [
                    'kind',
                    'spellId',
                    'evidenceText',
                    'confidence',
                ],
                properties: {
                    kind: {
                        type: 'string',
                        enum: [
                            'observed',
                            'taught',
                            'demonstrated',
                            'self_study',
                            'experiment',
                        ],
                    },
                    spellId: {
                        type: 'string',
                        maxLength: 96,
                    },
                    evidenceText: {
                        type: 'string',
                        maxLength: 500,
                    },
                    confidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                    },
                },
            },
        },
        customSpellProposals: {
            type: 'array',
            maxItems: 4,
            items: {
                type: 'object',
                additionalProperties:
                    false,
                required: [
                    'incantation',
                    'effectEn',
                    'evidenceText',
                    'confidence',
                ],
                properties: {
                    incantation: {
                        type: 'string',
                        minLength: 2,
                        maxLength: 80,
                    },
                    effectEn: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 600,
                    },
                    evidenceText: {
                        type: 'string',
                        maxLength: 500,
                    },
                    confidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                    },
                },
            },
        },
    },
};

export const PROPOSED_LOCAL_PROMPT_TARGETS = Object.freeze({
    preTurnCharacters: 9_000,
    postTurnCharacters: 10_500,
    inventoryCharacters: 9_000,
    spellCharacters: 9_000,
});
