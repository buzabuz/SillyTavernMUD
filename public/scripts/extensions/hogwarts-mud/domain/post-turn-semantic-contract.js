import {
    APPEARANCE_SLOT_VALUES,
    LOCAL_MATERIAL_PERSISTENCE_VALUES,
    MATERIAL_EVENT_TYPES,
    MATERIAL_OPERATIONS,
} from '../material-schema.js';
import {
    POST_BOOKKEEPING_PROPERTIES,
    POST_BOOKKEEPING_SYSTEM,
} from './post-bookkeeping-contract.js';

/**
 * Field routes: vcon013.input.itemCandidates,
 * vcon013.result.inventoryUpdates, vcon013.result.identityObservations.
 * See .trae/specs/hogwarts-runtime-contracts/model-field-routes.md.
 */

export const POST_TURN_SEMANTIC_SYSTEM = `You are a sparse observer of an already-written RPG turn. Extract only explicit observable changes from playerAction and narrativeSegments.

Player movement rules:
- movementPreflight is null unless the player used an explicit movement marker. Ordinary prose, plans, room names, recollections, quotes, and NPC names never create player movement.
- When movementPreflight is supplied, return exactly one playerMovement candidate. Use moved only when one exact narrative clause establishes that the player completed the supplied candidate route. Use not_moved when the scene establishes refusal, interruption, failure, or remaining in place. Use already_there only when the scene establishes no travel because the player was already there.
- evidenceText must be one exact non-empty substring from narrativeSegments. It is not a summary.
- moved destinationMapId and destinationRoomId must exactly equal movementPreflight.candidateMapId and movementPreflight.candidateRoomId. Do not select another room.
- accompanyingActorIds contains only supplied eligible companion IDs visibly accompanying the player. For a follow marker, include the supplied guide only when the narrative establishes that they accompanied the player.
- For not_moved or already_there, destinationMapId, destinationRoomId and accompanyingActorIds must be empty.

Material rules:
- Return only physical changes that should persist beyond the sentence: placement, movement, removal, damage, repair, dirt, cleaning, outfit, accessory, hairstyle, visible condition, or held object.
- Do not treat incidental food, ordinary gestures, metaphors, comparisons, schedules, or unchanged surroundings as material events.
- Actor walking between rooms is an actor update, never a material event.
- Changing clothes uses outfit_changed. Do not encode clothing as scene_adjusted.
- evidenceText must be an exact substring of the selected player or narrative source.
- evidenceText must be one concise sentence or clause no longer than 500 characters. Never copy the full narrative.
- Use only supplied actor IDs. Empty actorId is allowed only for scene changes with no identifiable actor.
- Never use permanent persistence.
- Leave irrelevant fields as empty strings. Do not invent previous values, hands, quantities, source objects, or targets.

Actor rules:
- Return only actors whose observable current activity, presence, or room changed.
- Use only supplied actor and room IDs.
- An absent actor cannot enter merely because their name or belonging is mentioned.
- Mark an actor absent only when that actor visibly leaves the current interaction.
- Change roomId only when the same evidence explicitly names the destination room.
- Actor evidence must name that actor in a narrative segment. Never assign the player's first-person action to a supplied NPC.
- Prior currentActivityEn and existingActorUpdates describe old state. They are context, never evidence.
- evidenceText must be an exact substring of a narrative segment, not a field name such as currentActivityEn or playerAction.
- Actor evidence must be one concise sentence no longer than 500 characters.
- Keep actor updates sparse and evidence-based.

Perception rules:
- Return exactly one primary event perception for the enacted turn. Describe how the completed result could be perceived, not merely what the player intended.
- visualScope is none, target, nearby, room, or area. audibleScope is none, target, nearby, room, or adjacent.
- directParticipantActorIds contains only supplied actor IDs directly affected by or deliberately exchanging the event. Do not return witnesses, observers, cohorts, room occupants, or invented IDs.
- A failed covert action that causes a visible or audible public result keeps concealment attempted and uses the scope of the actual result.
- A genuinely successful concealed action uses concealment successful. Whispers and passed notes normally use target scope unless the narrative explicitly exposes them.
- evidenceText must be one exact non-empty substring of playerAction or a narrative segment and no longer than 500 characters.
- Never output witnessActorIds, witnessCohortIds, witnessBasis, or any final witness list.
- attribution is clear only when the observable result clearly identifies its actor. Ambiguous or unknown attribution still records the event itself.
- source must be post_turn_observer.

Temporal claim rules:
- temporalClaims extracts only explicit claims in narrativeSegments; playerAction is context, not claim evidence.
- Use absolute_clock for an exact stated 24-hour clock and normalize clock as HH:MM.
- Use relative_duration for a quantified number of minutes or hours tied to before, after, until, till, later, earlier, ago, or past. Normalize durationMinutes to minutes and set relation.
- Use named_time for noon, midnight, dawn, dusk, sunrise, sunset, or a named weekday used as a time assertion.
- Use schedule for an asserted business opening/closing time, transport departure/arrival, external countdown, or appointment.
- Use calendar_date for an asserted day and month.
- evidenceText must be one exact non-empty substring of a narrative segment and contain the complete temporal claim.
- For absolute_clock, set durationMinutes 0 and relation none. For relative_duration, set clock empty. For all other kinds, set clock empty, durationMinutes 0, and relation none.
- Do not infer a claim from generic words such as later, soon, morning, afternoon, class, dinner, or travel.
- Return every explicit temporal claim, or an empty array when the narration makes none. These claims are transient guard inputs and never change the clock.

Inventory route rules:
- inventoryObservationRequired is true only when the completed player action or narration may establish an Item operation or a new durable Item candidate.
- Inventory route selection is not an Item proposal and never writes State.
- Use false for dialogue, ordinary gestures, incidental food or objects, unchanged possessions, and absent or hypothetical Item changes.

Calibration examples:
1. If one supplied actor explicitly exits to one supplied destination room, emit only that actor as absent in the destination room. Never reuse this instruction as evidence.
2. Player "Tina把二十八只玩具熊排列在床头，然后换上条纹睡衣。" => object_placed for the bears and outfit_changed for striped pyjamas. No updates for unrelated actors.
3. Pure dialogue with no physical or presence change => empty materialEvents and actorUpdates; perception still describes that primary exchange.
4. A failed secret spell sends Ron into the rafters in front of class => visualScope room, audibleScope room, concealment attempted, Ron as a direct participant.
5. A note quietly passed to Harry without discovery => visualScope target, audibleScope none, concealment successful, Harry as a direct participant.
6. Narrative "At 14:50 the shop door opened, five minutes later." => two temporalClaims: absolute_clock clock 14:50, and relative_duration durationMinutes 5 relation later.
${POST_BOOKKEEPING_SYSTEM}`;

export const LOW_POST_TURN_SEMANTIC_SYSTEM = `${POST_TURN_SEMANTIC_SYSTEM}

Low complete-Post rules:
- inventoryObservationRequired is retired as a Low route. Always return false; it must not request another model task.
- itemCandidates is the complete formal Item context for this turn, never evidence. Existing Item proposals use only a supplied itemCandidates id. Never substitute a similar Item or invent an ID.
- inventoryUpdates contains only an exact completed Item operation grounded in playerAction or narrativeSegments. evidenceText and evidenceItemText must be exact source substrings. Return [] when no Item operation is established.
- identityTargetActorIds is the complete Actor set eligible for direct injury observations. inspectionTargetActorIds is the narrower set allowed to receive no_visible_injury.
- identityObservations uses only narration evidence. evidenceSegmentIndex identifies the exact narration segment. Return [] when a direct injury or deliberate no-injury examination is not established.
- Item and Identity candidates are proposals only. They never write State directly.`;

const temporalKinds = [
    'absolute_clock',
    'relative_duration',
    'named_time',
    'schedule',
    'calendar_date',
];
const temporalRelations = [
    'none',
    'before',
    'after',
    'until',
    'till',
    'later',
    'earlier',
    'ago',
    'past',
];

function enumProperty(
    values,
) {
    return {
        type: 'string',
        enum: values,
    };
}

const confidenceProperty = {
    type: 'number',
    minimum: 0,
    maximum: 1,
};

const materialEventJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'type',
        'actorId',
        'objectTextEn',
        'sourceTextEn',
        'targetTextEn',
        'valueTextEn',
        'previousValueTextEn',
        'resultTextEn',
        'quantity',
        'operation',
        'slot',
        'hand',
        'persistence',
        'sourceKind',
        'evidenceText',
        'confidence',
    ],
    properties: {
        type: enumProperty(
            MATERIAL_EVENT_TYPES,
        ),
        actorId: { type: 'string' },
        objectTextEn: { type: 'string' },
        sourceTextEn: { type: 'string' },
        targetTextEn: { type: 'string' },
        valueTextEn: { type: 'string' },
        previousValueTextEn: { type: 'string' },
        resultTextEn: { type: 'string' },
        quantity: {
            anyOf: [
                {
                    type: 'integer',
                    minimum: 1,
                    maximum: 1_000,
                },
                { type: 'null' },
            ],
        },
        operation: enumProperty(
            MATERIAL_OPERATIONS,
        ),
        slot: enumProperty(
            APPEARANCE_SLOT_VALUES,
        ),
        hand: enumProperty([
            'left',
            'right',
            'both',
            'unspecified',
        ]),
        persistence: enumProperty(
            LOCAL_MATERIAL_PERSISTENCE_VALUES,
        ),
        sourceKind: enumProperty([
            'player',
            'narrative',
        ]),
        evidenceText: {
            type: 'string',
            maxLength: 500,
        },
        confidence: confidenceProperty,
    },
};

const actorUpdateJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'actorId',
        'currentActivityEn',
        'presence',
        'roomId',
        'evidenceText',
        'confidence',
    ],
    properties: {
        actorId: { type: 'string' },
        currentActivityEn: {
            type: 'string',
            maxLength: 500,
        },
        presence: enumProperty([
            'unchanged',
            'present',
            'absent',
        ]),
        roomId: { type: 'string' },
        evidenceText: {
            type: 'string',
            maxLength: 500,
        },
        confidence: confidenceProperty,
    },
};

const perceptionJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'version',
        'visualScope',
        'audibleScope',
        'salience',
        'attribution',
        'concealment',
        'directParticipantActorIds',
        'evidenceText',
        'confidence',
        'source',
    ],
    properties: {
        version: {
            type: 'integer',
            const: 1,
        },
        visualScope: enumProperty([
            'none',
            'target',
            'nearby',
            'room',
            'area',
        ]),
        audibleScope: enumProperty([
            'none',
            'target',
            'nearby',
            'room',
            'adjacent',
        ]),
        salience: enumProperty([
            'subtle',
            'normal',
            'notable',
            'major',
        ]),
        attribution: enumProperty([
            'clear',
            'ambiguous',
            'unknown',
        ]),
        concealment: enumProperty([
            'none',
            'attempted',
            'successful',
        ]),
        directParticipantActorIds: {
            type: 'array',
            maxItems: 16,
            items: {
                type: 'string',
            },
        },
        evidenceText: {
            type: 'string',
            minLength: 1,
            maxLength: 500,
        },
        confidence: confidenceProperty,
        source: {
            type: 'string',
            const: 'post_turn_observer',
        },
    },
};

const temporalClaimJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'kind',
        'evidenceText',
        'clock',
        'durationMinutes',
        'relation',
        'confidence',
    ],
    properties: {
        kind: enumProperty(
            temporalKinds,
        ),
        evidenceText: {
            type: 'string',
            minLength: 1,
            maxLength: 500,
        },
        clock: {
            type: 'string',
            maxLength: 5,
        },
        durationMinutes: {
            type: 'integer',
            minimum: 0,
            maximum: 10_080,
        },
        relation: enumProperty(
            temporalRelations,
        ),
        confidence: confidenceProperty,
    },
};

const playerMovementJsonSchema = {
    anyOf: [
        {
            type: 'null',
        },
        {
            type: 'object',
            additionalProperties: false,
            required: [
                'outcome',
                'destinationMapId',
                'destinationRoomId',
                'accompanyingActorIds',
                'evidenceText',
            ],
            properties: {
                outcome: enumProperty([
                    'moved',
                    'not_moved',
                    'already_there',
                ]),
                destinationMapId: {
                    type: 'string',
                    maxLength: 96,
                },
                destinationRoomId: {
                    type: 'string',
                    maxLength: 96,
                },
                accompanyingActorIds: {
                    type: 'array',
                    maxItems: 16,
                    items: {
                        type: 'string',
                        maxLength: 96,
                    },
                },
                evidenceText: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 500,
                },
            },
        },
    ],
};

const inventoryUpdateJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'id',
        'operation',
        'type',
        'labelEn',
        'appearanceEn',
        'ownerId',
        'holderId',
        'targetHolderId',
        'transferMode',
        'storyRoles',
        'visibility',
        'isEquipped',
        'held',
        'sourceKind',
        'evidenceText',
        'evidenceItemText',
        'physicalForm',
        'confidence',
    ],
    properties: {
        id: {
            type: 'string',
            maxLength: 80,
        },
        operation: enumProperty([
            'acquire',
            'carry',
            'place',
            'equip',
            'unequip',
            'give',
            'lend',
            'consume',
            'damage',
            'clean',
            'lose',
            'destroy',
        ]),
        type: enumProperty([
            'wand',
            'eyewear',
            'clothing',
            'accessory',
            'document',
            'container',
            'money',
            'key',
            'book',
            'tool',
            'consumable',
            'keepsake',
            'clue',
            'other',
        ]),
        labelEn: {
            type: 'string',
            maxLength: 200,
        },
        appearanceEn: {
            type: 'string',
            maxLength: 600,
        },
        ownerId: {
            type: 'string',
            maxLength: 96,
        },
        holderId: {
            type: 'string',
            maxLength: 96,
        },
        targetHolderId: {
            type: 'string',
            maxLength: 96,
        },
        transferMode: enumProperty([
            'none',
            'gift',
            'loan',
            'theft',
            'return',
        ]),
        storyRoles: {
            type: 'array',
            maxItems: 5,
            items: enumProperty([
                'signature',
                'social',
                'clue',
                'promise',
                'keepsake',
            ]),
        },
        visibility: enumProperty([
            'public',
            'owner_known',
            'hidden',
        ]),
        isEquipped: {
            type: 'boolean',
        },
        held: {
            type: 'boolean',
        },
        sourceKind: enumProperty([
            'player',
            'narrative',
        ]),
        evidenceText: {
            type: 'string',
            maxLength: 500,
        },
        evidenceItemText: {
            type: 'string',
            maxLength: 300,
        },
        physicalForm: enumProperty([
            'whole',
            'remains',
            'absent',
            'unknown',
        ]),
        confidence: confidenceProperty,
    },
};

const identityObservationJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'actorId',
        'injuryStatus',
        'evidenceText',
        'evidenceSegmentIndex',
        'confidence',
    ],
    properties: {
        actorId: {
            type: 'string',
            minLength: 1,
            maxLength: 96,
        },
        injuryStatus: enumProperty([
            'injured',
            'no_visible_injury',
        ]),
        evidenceText: {
            type: 'string',
            minLength: 1,
            maxLength: 500,
        },
        evidenceSegmentIndex: {
            type: 'integer',
            minimum: 0,
            maximum: 23,
        },
        confidence: confidenceProperty,
    },
};

export const POST_TURN_JSON_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'schemaVersion',
        'materialEvents',
        'actorUpdates',
        'inventoryObservationRequired',
        'perception',
        'temporalClaims',
        'playerMovement',
        ...Object.keys(POST_BOOKKEEPING_PROPERTIES),
    ],
    properties: {
        schemaVersion: {
            type: 'integer',
            const: 2,
        },
        materialEvents: {
            type: 'array',
            maxItems: 16,
            items: materialEventJsonSchema,
        },
        actorUpdates: {
            type: 'array',
            maxItems: 16,
            items: actorUpdateJsonSchema,
        },
        inventoryObservationRequired: {
            type: 'boolean',
        },
        perception: perceptionJsonSchema,
        temporalClaims: {
            type: 'array',
            maxItems: 16,
            items: temporalClaimJsonSchema,
        },
        playerMovement:
            playerMovementJsonSchema,
        ...POST_BOOKKEEPING_PROPERTIES,
    },
};

export const LOW_POST_TURN_JSON_SCHEMA = {
    ...POST_TURN_JSON_SCHEMA,
    required: [
        ...POST_TURN_JSON_SCHEMA.required,
        'inventoryUpdates',
        'identityObservations',
    ],
    properties: {
        ...POST_TURN_JSON_SCHEMA.properties,
        inventoryUpdates: {
            type: 'array',
            maxItems: 8,
            items: inventoryUpdateJsonSchema,
        },
        identityObservations: {
            type: 'array',
            maxItems: 4,
            items: identityObservationJsonSchema,
        },
    },
};

export const POST_TURN_TRANSPORT_JSON_SCHEMA =
    Object.freeze({
        name:
            'hogwarts_mud_post_turn_semantic',
        description:
            'Observed consequences of an already-written Hogwarts MUD turn.',
        strict: true,
        value:
            POST_TURN_JSON_SCHEMA,
    });

export const LOW_POST_TURN_TRANSPORT_JSON_SCHEMA =
    Object.freeze({
        name:
            'hogwarts_mud_low_post_turn_semantic',
        description:
            'Complete observed consequences of an already-written Hogwarts MUD turn.',
        strict: true,
        value:
            LOW_POST_TURN_JSON_SCHEMA,
    });

export function createPostTurnSemanticMessages(
    input,
) {
    return [
        {
            role: 'system',
            content:
                POST_TURN_SEMANTIC_SYSTEM,
        },
        {
            role: 'user',
            content:
                JSON.stringify(input),
        },
    ];
}

export function createLowPostTurnSemanticMessages(
    input,
) {
    return [
        {
            role: 'system',
            content:
                LOW_POST_TURN_SEMANTIC_SYSTEM,
        },
        {
            role: 'user',
            content:
                JSON.stringify(input),
        },
    ];
}
