import {
    createHash,
} from 'node:crypto';
import {
    execFile,
} from 'node:child_process';
import {
    mkdir,
    writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {
    performance,
} from 'node:perf_hooks';
import {
    spawn,
} from 'node:child_process';
import {
    promisify,
} from 'node:util';
import {
    fileURLToPath,
} from 'node:url';

const execFileAsync =
    promisify(execFile);
const SCRIPT_DIRECTORY =
    path.dirname(
        fileURLToPath(
            import.meta.url,
        ),
    );
const PROJECT_ROOT =
    path.resolve(
        SCRIPT_DIRECTORY,
        '..',
        '..',
        '..',
        '..',
    );
const OLLAMA_BINARY =
    path.join(
        PROJECT_ROOT,
        'data',
        '_cache',
        'ollama',
        'ollama',
    );
const OLLAMA_MODELS =
    path.join(
        PROJECT_ROOT,
        'data',
        '_cache',
        'ollama',
        'models',
    );
const OLLAMA_HOME =
    path.join(
        PROJECT_ROOT,
        'data',
        '_cache',
        'ollama',
        'home',
    );
const MODEL_SMALL = 'qwen3:1.7b';
const MODEL_LARGE = 'qwen3:4b';
const BENCHMARK_VERSION = 1;
const NUM_CTX = 4_096;
const NUM_PREDICT = 1_024;
const DEFAULT_TIMEOUT_MS =
    300_000;

const POST_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'eventBoundary',
        'actorUpdates',
        'identityObservations',
        'perception',
        'followUpTasks',
    ],
    properties: {
        eventBoundary: {
            type: 'object',
            additionalProperties:
                false,
            required: [
                'ended',
                'evidenceText',
                'confidence',
            ],
            properties: {
                ended: {
                    type: 'boolean',
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
        actorUpdates: {
            type: 'array',
            maxItems: 12,
            items: {
                type: 'object',
                additionalProperties:
                    false,
                required: [
                    'actorId',
                    'presence',
                    'roomId',
                    'evidenceText',
                    'confidence',
                ],
                properties: {
                    actorId: {
                        type: 'string',
                    },
                    presence: {
                        type: 'string',
                        enum: [
                            'unchanged',
                            'present',
                            'absent',
                        ],
                    },
                    roomId: {
                        type: 'string',
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
        identityObservations: {
            type: 'array',
            maxItems: 12,
            items: {
                type: 'object',
                additionalProperties:
                    false,
                required: [
                    'actorId',
                    'injuryStatus',
                    'evidenceText',
                    'confidence',
                ],
                properties: {
                    actorId: {
                        type: 'string',
                    },
                    injuryStatus: {
                        type: 'string',
                        enum: [
                            'injured',
                            'no_visible_injury',
                            'unknown',
                        ],
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
        perception: {
            type: 'object',
            additionalProperties:
                false,
            required: [
                'visualScope',
                'audibleScope',
                'concealment',
                'directParticipantActorIds',
                'evidenceText',
                'evidenceSegmentIndex',
                'confidence',
            ],
            properties: {
                visualScope: {
                    type: 'string',
                    enum: [
                        'none',
                        'target',
                        'nearby',
                        'room',
                        'area',
                    ],
                },
                audibleScope: {
                    type: 'string',
                    enum: [
                        'none',
                        'target',
                        'nearby',
                        'room',
                        'adjacent',
                    ],
                },
                concealment: {
                    type: 'string',
                    enum: [
                        'none',
                        'attempted',
                        'successful',
                    ],
                },
                directParticipantActorIds: {
                    type: 'array',
                    maxItems: 12,
                    items: {
                        type: 'string',
                    },
                },
                evidenceText: {
                    type: 'string',
                    maxLength: 500,
                },
                evidenceSegmentIndex: {
                    type: 'integer',
                    minimum: -1,
                    maximum: 31,
                },
                confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                },
            },
        },
        followUpTasks: {
            type: 'array',
            maxItems: 2,
            uniqueItems: true,
            items: {
                type: 'string',
                enum: [
                    'inventory',
                    'spell',
                ],
            },
        },
    },
};

const POST_CORE_SCHEMA =
    structuredClone(
        POST_SCHEMA,
    );
POST_CORE_SCHEMA.required =
    POST_CORE_SCHEMA.required
        .filter(field =>
            ![
                'followUpTasks',
                'identityObservations',
            ].includes(field));
delete POST_CORE_SCHEMA
    .properties
    .identityObservations;
delete POST_CORE_SCHEMA
    .properties
    .followUpTasks;
const POST_CORE_ACTOR_UPDATE =
    POST_CORE_SCHEMA
        .properties
        .actorUpdates
        .items;
POST_CORE_ACTOR_UPDATE
    .required
    .splice(
        -1,
        0,
        'evidenceSegmentIndex',
    );
POST_CORE_ACTOR_UPDATE
    .properties
    .evidenceSegmentIndex = {
    type: 'integer',
    minimum: 0,
    maximum: 31,
};

function postCoreSchemaForInput(
    input,
) {
    const schema =
        structuredClone(
            POST_CORE_SCHEMA,
        );
    const focalActorIds = [
        ...new Set(
            input.focalActorIds ||
            [],
        ),
    ];
    if (focalActorIds.length !== 1) {
        return schema;
    }
    const actor =
        (
            input.actors ||
            []
        ).find(candidate =>
            candidate.id ===
            focalActorIds[0]);
    const routedDestinationRoomIds =
        new Set(
            input
                .movementDestinationRoomIds ||
            [],
        );
    const destinationRoomIds =
        (
            input.rooms ||
            []
        )
            .map(room =>
                room.id)
            .filter(roomId =>
                roomId &&
                (
                    !routedDestinationRoomIds
                        .size ||
                    routedDestinationRoomIds
                        .has(roomId)
                ) &&
                roomId !==
                    actor?.roomId);
    const properties =
        schema.properties
            .actorUpdates
            .items
            .properties;
    properties.actorId = {
        type: 'string',
        const:
            focalActorIds[0],
    };
    if (destinationRoomIds.length) {
        properties.roomId = {
            type: 'string',
            enum:
                destinationRoomIds,
        };
    }
    return schema;
}

const INVENTORY_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'inventoryUpdates',
    ],
    properties: {
        inventoryUpdates: {
            type: 'array',
            maxItems: 8,
            items: {
                type: 'object',
                additionalProperties:
                    false,
                required: [
                    'operation',
                    'itemId',
                    'itemType',
                    'ownerId',
                    'holderId',
                    'targetHolderId',
                    'physicalForm',
                    'evidenceText',
                    'confidence',
                ],
                properties: {
                    operation: {
                        type: 'string',
                        enum: [
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
                        ],
                    },
                    itemId: {
                        type: 'string',
                        maxLength: 96,
                    },
                    itemType: {
                        type: 'string',
                        enum: [
                            'document',
                            'wand',
                            'tool',
                            'clothing',
                            'accessory',
                            'book',
                            'consumable',
                            'keepsake',
                            'clue',
                            'other',
                        ],
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
                    physicalForm: {
                        type: 'string',
                        enum: [
                            'unchanged',
                            'remains',
                            'absent',
                        ],
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

function inventorySchemaForHints(
    hints = [],
) {
    const schema =
        structuredClone(
            INVENTORY_SCHEMA,
        );
    if (
        hints.length !== 1
    ) {
        return schema;
    }
    const hint = hints[0];
    const properties =
        schema.properties
            .inventoryUpdates
            .items
            .properties;
    if (hint.operation) {
        properties.operation = {
            type: 'string',
            const:
                hint.operation,
        };
    }
    if (hint.itemId) {
        properties.itemId = {
            type: 'string',
            const:
                hint.itemId,
        };
    }
    properties.physicalForm =
        hint.operation ===
            'destroy'
            ? {
                type: 'string',
                enum: [
                    'remains',
                    'absent',
                ],
            }
            : {
                type: 'string',
                const:
                    'unchanged',
            };
    return schema;
}

const SPELL_SCHEMA = {
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

const IDENTITY_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'identityObservations',
    ],
    properties: {
        identityObservations: {
            type: 'array',
            maxItems: 4,
            items: {
                type: 'object',
                additionalProperties:
                    false,
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
                    },
                    injuryStatus: {
                        type: 'string',
                        enum: [
                            'injured',
                            'no_visible_injury',
                        ],
                    },
                    evidenceText: {
                        type: 'string',
                        maxLength: 500,
                    },
                    evidenceSegmentIndex: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 31,
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

const MERGED_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'post',
        'inventory',
        'spell',
    ],
    properties: {
        post: POST_SCHEMA,
        inventory: INVENTORY_SCHEMA,
        spell: SPELL_SCHEMA,
    },
};

const FOLLOW_UP_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'inventory',
        'spell',
    ],
    properties: {
        inventory:
            INVENTORY_SCHEMA,
        spell: SPELL_SCHEMA,
    },
};

function identitySchemaForTargets(
    actorIds = [],
) {
    const schema =
        structuredClone(
            IDENTITY_SCHEMA,
        );
    const normalizedIds = [
        ...new Set(
            actorIds
                .map(value =>
                    String(
                        value ||
                        '',
                    ).trim())
                .filter(Boolean),
        ),
    ];
    if (normalizedIds.length) {
        schema
            .properties
            .identityObservations
            .items
            .properties
            .actorId = {
            type: 'string',
            enum:
                normalizedIds,
        };
    }
    return schema;
}

function dynamicFollowUpSchema(
    requestedTasks,
    input,
) {
    const requested = [
        ...new Set(
            requestedTasks,
        ),
    ].filter(task =>
        [
            'identity',
            'inventory',
            'spell',
        ].includes(task));
    const properties = {};
    if (
        requested.includes(
            'inventory',
        )
    ) {
        properties.inventory =
            inventorySchemaForHints(
                input
                    .inventoryOperationHints ||
                [],
            );
    }
    if (requested.includes('spell')) {
        properties.spell =
            SPELL_SCHEMA;
    }
    if (
        requested.includes(
            'identity',
        )
    ) {
        properties.identity =
            identitySchemaForTargets(
                input
                    .identityTargetActorIds ||
                [],
            );
    }
    return {
        type: 'object',
        additionalProperties:
            false,
        required: requested,
        properties,
    };
}

const PHYSICAL_FORM_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'physicalForm',
    ],
    properties: {
        physicalForm: {
            type: 'string',
            enum: [
                'remains',
                'absent',
            ],
        },
    },
};

const PHYSICAL_FORM_SYSTEM = `Classify only the physical aftermath of one destroyed Item.
- remains: any fragment, splinter, ash, debris, piece, residue, or physical matter survives.
- absent: the evidence explicitly says no trace, ash, remains, or physical matter survives.
Return only the required JSON field. Do not infer from the Spell name.`;

const POST_SYSTEM = `You are a sparse observer of one already-written RPG turn. Extract only explicit observable results from playerAction and narrativeSegments.

Evidence authority:
- evidenceText must be one exact non-empty substring copied from playerAction or one narrativeSegments[].textEn value.
- Never include JSON field names, labels, prefixes, summaries, actor context, room context, or invented wording in evidenceText.
- Use only supplied actor and room IDs.

Event boundary:
- ended is true only when the bounded interaction visibly closes: the focal actor leaves, the task/procedure completes, or all parties disengage.
- Teaching, receiving an Item, one physical action, finishing a sentence, or continuing dialogue does not end the surrounding interaction.
- Use evidenceText empty when ended is false.

Actor updates:
- Return an actor only when that actor's presence or room visibly changed.
- Never repeat unchanged actors. Never mark present merely because an actor appears in the supplied actor list.
- Mark absent only when exact narrative evidence says the actor left the current interaction.
- A destination room must be named by the same evidence and use one supplied room ID.

Identity observations:
- Emit an injury observation only when narration explicitly describes a visible injury or a deliberate examination result.
- injured requires objective visible injury evidence.
- no_visible_injury requires explicit narration that an examination found no visible injury.
- Silence about injury, ordinary activity, teaching, giving an Item, clothing, posture, or dialogue is not no-visible-injury evidence.
- Dialogue self-claims are not observations.

Perception:
- Describe the primary completed result, not the player's uncompleted intent.
- concealment is none unless the source explicitly describes secrecy, stealth, a whisper, a private note, or successful concealment.
- A failed covert action with a public flash, noise, impact, or injury uses concealment attempted and the public result's actual scope.
- A privately passed note unnoticed by others normally uses visualScope target and audibleScope none.
- directParticipantActorIds contains only supplied actors directly exchanging or affected by the result.
- evidenceSegmentIndex is the zero-based narrativeSegments index that grounds perception, or -1 for playerAction. The index is authority even if evidenceText is malformed.

Routing:
- followUpTasks includes inventory only when a durable Item may change.
- followUpTasks includes spell only when a Spell may be observed, taught, learned, demonstrated, studied, attempted, or created.
- Otherwise use an empty array.

Calibration:
1. "Hermione demonstrated Lumos, corrected Tina's pronunciation, and handed Tina a note." => ended false; actorUpdates []; identityObservations []; followUpTasks inventory and spell.
2. "Harry limped into the Entrance Hall, leaving the classroom, with a bleeding cut visible." => ended true; one Harry absent update to entrance_hall; one injured observation.
3. "Hermione shook her head. The conversation continued without any agreement or action." => ended false; actorUpdates []; identityObservations []; followUpTasks [].
4. "Tina examined Ron's arms; there were no visible injuries." => one Ron no_visible_injury observation only.
5. A failed covert Spell with a public flash uses room visual/audible scope, concealment attempted, and the actual narrative segment index.`;

const POST_CORE_SYSTEM = `You are the sparse post-core observer of one already-written RPG turn. Extract only event boundary, Actor movement/presence, and perception from playerAction and narrativeSegments. Dynamic routing and Identity injury assessment are owned by separate structured inputs and are forbidden here.

Evidence authority:
- evidenceText must be one exact non-empty substring copied from playerAction or one narrativeSegments[].textEn value.
- Never include JSON field names, labels, prefixes, summaries, actor context, room context, or invented wording in evidenceText.
- Use only supplied actor and room IDs.
- playerId is the exact ID for the player. Never emit the player's display name as an Actor ID.

Event boundary:
- ended is true only when the bounded interaction visibly closes: the focal actor leaves, the task/procedure completes, or all parties disengage.
- When an actor in focalActorIds has a valid absent Actor update, ended is true and uses the same source evidence.
- Teaching, receiving an Item, one physical action, finishing a sentence, or continuing dialogue does not end the surrounding interaction.
- Use evidenceText empty when ended is false.

Highest-priority consistency:
- Never return ended false when actorUpdates contains an absent update for an actor in focalActorIds.
- Never return ended true for departure unless that focal absent update is present and valid.

Actor updates:
- Return an actor only when that actor's presence or room visibly changed.
- Never repeat unchanged actors.
- Actor-update evidence must come from one narrativeSegments entry, never playerAction intent; set evidenceSegmentIndex to that entry.
- Mark absent only when that narrative entry says the actor left the current interaction.
- A destination room must be named by the same narrative entry, use one supplied room ID, and differ from the Actor's current roomId.

Perception:
- Describe the primary completed result, not the player's uncompleted intent.
- concealment is none unless the source explicitly describes secrecy, stealth, a whisper, a private note, or successful concealment.
- A failed covert action with a public flash, noise, impact, or injury uses concealment attempted and the public result's actual scope.
- A privately passed note unnoticed by others normally uses visualScope target and audibleScope none.
- directParticipantActorIds contains only supplied actors directly exchanging or affected by the result.
- evidenceSegmentIndex is the zero-based narrativeSegments index that grounds perception, or -1 for playerAction. The index is authority even if evidenceText is malformed.

Calibration:
1. A private note passed to one target with explicit evidence that nobody else noticed uses visualScope target, audibleScope none, and no Actor presence update.
2. A focal actor explicitly leaving for a supplied destination room uses one absent update and ended true.
3. Continued conversation with no enacted change uses ended false and no Actor updates.
4. A failed covert Spell with a public flash uses room visual/audible scope, concealment attempted, and the actual narrative segment index.
5. Never copy wording from these rules into evidenceText.`;

const INVENTORY_SYSTEM = `You are a conservative Item proposal observer for one completed RPG turn. Extract only durable Item changes explicitly enacted in playerAction or narrativeSegments.

Evidence:
- playerAction and narrativeSegments are the only evidence. Inventory is context, never evidence.
- inventoryOperationHints is authoritative operation/item selection from the paid structured proposal. It is routing context, never evidence.
- evidenceText must be one exact source substring. Never copy an itemId, JSON label, field name, or invented wording.

Sparse Item rules:
- Return an empty array unless an exact source clause establishes acquire, carry, place, equip, unequip, give, lend, consume, damage, clean, lose, or destroy.
- Learning or observing a Spell never creates a book, wand, or Item unless the source explicitly transfers that physical object.
- Do not emit an Item merely because its name appears.
- Emit exactly one update per changed physical Item.

Identity and custody:
- Existing Items must reuse a supplied itemId.
- A newly received gift uses operation acquire, a new descriptive snake_case itemId, ownerId and holderId equal to supplied playerId, and targetHolderId empty.
- Giving an existing Item uses operation give, preserves its itemId, and sets targetHolderId to the supplied recipient actor ID.
- itemType describes the physical object: signed parchment/note is document, not book.

Physical form:
- physicalForm is unchanged for every non-destroy operation.
- Destroy with splinters, fragments, ash, debris, pieces, or retained matter uses remains.
- Destroy uses absent only when exact evidence says the Item vanished completely and left no trace, ash, or remains.

Calibration:
1. "Tina slid the folded note beneath Harry's hand." with existing folded_note => give folded_note to harry, physicalForm unchanged.
2. "Hermione handed Tina a signed parchment to keep." => acquire one document owned/held by player, physicalForm unchanged.
3. "The quill snapped, leaving splinters in Tina's hand." => destroy existing quill with remains.
4. "The quill vanished completely, leaving no trace or ash." => destroy existing quill with absent.
5. A Spell lesson with no physical object transfer => inventoryUpdates [].`;

const SPELL_SYSTEM = `You are a sparse Spell observer for one completed RPG turn. Extract only explicit Spell observation, teaching, learning, demonstration, self-study, experiment, or custom-Spell creation.

Evidence and IDs:
- knownSpells is a candidate directory, never evidence.
- evidenceText must be one exact substring copied from playerAction or one narrativeSegments[].textEn value.
- Never include JSON labels or invented wording.
- For a known Spell, copy exactly one supplied spellId. For a custom experiment, spellId is empty.

Event meaning:
- observed means the player intentionally watched, read, or identified a known Spell without instruction.
- taught means someone instructs the player, asks the player to repeat it, corrects pronunciation/technique, or explicitly teaches it.
- demonstrated means a known Spell is shown to the player without instructional exchange.
- self_study requires explicit study from a text or notes.
- experiment requires an explicit attempted custom or unknown Spell.
- One source event produces one spellEvent, not duplicate observed+taught rows. Prefer taught over demonstrated, and demonstrated over observed.

Custom proposals:
- customSpellProposals requires an explicit Latin incantation and explicit intended effect in the source.
- The proposal records the stated intent even when the cast fails.
- Never infer success, learning, XP, or Canon identity.

Calibration:
1. "Lumos. Watch the wand tip, then repeat it." plus corrected pronunciation => one taught spell_lumos event.
2. "Hermione demonstrated Evanesco while Tina watched closely." => one demonstrated spell_evanesco event.
3. "Tina whispered Umbra Flecto, trying to bend light, but it failed." => one experiment event with empty spellId and one custom proposal for Umbra Flecto.
4. No explicit Spell action/teaching/study => both arrays empty.`;

const IDENTITY_SYSTEM = `You are a routed Identity observer for one completed RPG turn. The task is called only because structured routing identified a possible visible injury or an explicit inspection.

Authority:
- identityTargetActorIds is the complete allowed Actor set. Never emit another actor.
- playerAction and narrativeSegments are the only evidence.
- evidenceText must be one exact non-empty substring copied from one narrativeSegments[].textEn value.
- evidenceSegmentIndex is the zero-based narrativeSegments index containing the observation and is the stable authority reference.
- Dialogue claims, actor context, IDs and route metadata are not evidence.

Sparse injury rules:
- injured requires narration explicitly describing an objectively visible injury.
- no_visible_injury requires narration explicitly saying a deliberate examination of an inspectionTargetActorIds actor found no visible injury.
- Silence, ordinary activity, posture, clothing, teaching, Item transfer or unrelated dialogue never implies no_visible_injury.
- Emit at most one observation per routed Actor. Return an empty array when routed evidence is absent.

Calibration:
1. Explicit narration of a visible bleeding cut on a routed Actor => one injured observation with that segment index.
2. Explicit narration that examination of a routed inspection target found no visible injury => one no_visible_injury observation with that segment index.
3. Teaching, Item transfer, ordinary motion, silence or unrelated dialogue => empty.`;

function dynamicFollowUpSystem(
    requestedTasks,
) {
    const requested =
        new Set(
            requestedTasks,
        );
    const sections = [];
    if (requested.has('inventory')) {
        sections.push(
            `INVENTORY:\n${INVENTORY_SYSTEM}`,
        );
    }
    if (requested.has('spell')) {
        sections.push(
            `SPELL:\n${SPELL_SYSTEM}`,
        );
    }
    if (requested.has('identity')) {
        sections.push(
            `IDENTITY:\n${IDENTITY_SYSTEM}`,
        );
    }
    return `Complete only the requested semantic sections for the same completed RPG turn.

requestedTasks is authoritative. Return exactly the sections present in the supplied JSON Schema. Never add or copy work into an unrequested section.

${sections.join('\n\n')}

Each section must independently satisfy its evidence and ID rules.`;
}

const FOLLOW_UP_SYSTEM = `Complete two independent semantic sections for the same completed RPG turn.

requestedTasks is authoritative routing:
- If inventory is absent, inventoryUpdates must be empty.
- If spell is absent, spellEvents and customSpellProposals must be empty.
- Never create work for an unrequested section.

INVENTORY:
${INVENTORY_SYSTEM}

SPELL:
${SPELL_SYSTEM}

Do not copy a fact between sections unless each section's own rules require it. Return exactly the follow-up JSON Schema.`;

const MERGED_SYSTEM = `You are one sparse post-turn semantic observer. Complete three independent sections from the same playerAction and narrativeSegments.

POST:
${POST_SYSTEM}

INVENTORY:
${INVENTORY_SYSTEM}

SPELL:
${SPELL_SYSTEM}

Do not copy a fact between sections unless each section's own rules require it. Return exactly the merged JSON Schema.`;

function baseActors() {
    return [
        {
            id: 'harry',
            roomId:
                'charms_classroom',
        },
        {
            id: 'hermione',
            roomId:
                'charms_classroom',
        },
        {
            id: 'ron',
            roomId:
                'charms_classroom',
        },
    ];
}

function baseRooms() {
    return [
        {
            id: 'charms_classroom',
            nameEn:
                'Charms Classroom',
        },
        {
            id: 'entrance_hall',
            nameEn:
                'Entrance Hall',
        },
    ];
}

const KNOWN_SPELLS = [
    {
        id: 'spell_lumos',
        incantation: 'Lumos',
        nameEn:
            'Wand-Lighting Charm',
    },
    {
        id: 'spell_evanesco',
        incantation: 'Evanesco',
        nameEn:
            'Vanishing Spell',
    },
];

const CASES = [
    {
        id: 'private_note_transfer',
        input: {
            playerAction:
                '*把折好的纸条悄悄推给哈利，只让他看*',
            narrativeSegments: [{
                type: 'narration',
                actorId: '',
                textEn:
                    'Tina slid the folded note beneath Harry\'s hand. No one else noticed.',
            }],
            actors: baseActors(),
            rooms: baseRooms(),
            inventory: [{
                id: 'folded_note',
                itemType: 'document',
                ownerId: 'player',
                holderId: 'player',
            }],
            knownSpells:
                KNOWN_SPELLS,
            checkResult: null,
        },
        expect: {
            boundary: false,
            perception: {
                visualScope: 'target',
                audibleScope: 'none',
            },
            followUps: ['inventory'],
            inventory: {
                operation: 'give',
                itemId: 'folded_note',
                targetHolderId:
                    'harry',
                physicalForm:
                    'unchanged',
            },
            spellCount: 0,
            customSpellCount: 0,
        },
    },
    {
        id: 'departure_visible_injury',
        input: {
            playerAction:
                '*看着哈利离开教室*',
            narrativeSegments: [{
                type: 'narration',
                actorId: '',
                textEn:
                    'Harry limped through the doors into the Entrance Hall, a bleeding cut visible across his palm.',
            }],
            actors: baseActors(),
            rooms: baseRooms(),
            inventory: [],
            knownSpells:
                KNOWN_SPELLS,
            checkResult: null,
        },
        expect: {
            boundary: true,
            actorUpdate: {
                actorId: 'harry',
                presence: 'absent',
                roomId:
                    'entrance_hall',
            },
            injury: {
                actorId: 'harry',
                injuryStatus:
                    'injured',
            },
            followUps: [],
            inventoryCount: 0,
            spellCount: 0,
            customSpellCount: 0,
        },
    },
    {
        id: 'destroy_with_remains',
        input: {
            playerAction:
                '*用力折断自己的羽毛笔*',
            narrativeSegments: [{
                type: 'narration',
                actorId: '',
                textEn:
                    'The quill snapped, leaving splinters and a bent nib in Tina\'s hand.',
            }],
            actors: baseActors(),
            rooms: baseRooms(),
            inventory: [{
                id: 'tinas_quill',
                itemType: 'tool',
                ownerId: 'player',
                holderId: 'player',
            }],
            knownSpells:
                KNOWN_SPELLS,
            checkResult: null,
        },
        expect: {
            boundary: false,
            followUps: ['inventory'],
            inventory: {
                operation: 'destroy',
                itemId: 'tinas_quill',
                physicalForm:
                    'remains',
            },
            spellCount: 0,
            customSpellCount: 0,
        },
    },
    {
        id: 'vanish_item_spell_demo',
        input: {
            playerAction:
                '*仔细观察赫敏演示消失咒*',
            narrativeSegments: [{
                type: 'narration',
                actorId: '',
                textEn:
                    'Hermione demonstrated Evanesco on Tina\'s broken quill. The quill vanished completely, leaving no trace or ash.',
            }],
            actors: baseActors(),
            rooms: baseRooms(),
            inventory: [{
                id: 'tinas_quill',
                itemType: 'tool',
                ownerId: 'player',
                holderId: 'player',
            }],
            knownSpells:
                KNOWN_SPELLS,
            checkResult: {
                outcome: 'success',
            },
        },
        expect: {
            boundary: false,
            followUps: [
                'inventory',
                'spell',
            ],
            inventory: {
                operation: 'destroy',
                itemId: 'tinas_quill',
                physicalForm:
                    'absent',
            },
            spellEvent: {
                kind: 'demonstrated',
                spellId:
                    'spell_evanesco',
            },
            customSpellCount: 0,
        },
    },
    {
        id: 'spell_teaching_and_gift',
        input: {
            playerAction:
                '*认真跟着赫敏学习咒语，然后接过她送的签名羊皮纸*',
            narrativeSegments: [
                {
                    type: 'dialogue',
                    actorId: 'hermione',
                    textEn:
                        'Hermione said, "Lumos. Watch the wand tip, then repeat it."',
                },
                {
                    type: 'narration',
                    actorId: '',
                    textEn:
                        'She demonstrated Lumos twice, corrected Tina\'s pronunciation, and handed Tina a signed parchment to keep.',
                },
            ],
            actors: baseActors(),
            rooms: baseRooms(),
            inventory: [],
            knownSpells:
                KNOWN_SPELLS,
            checkResult: {
                outcome: 'success',
            },
        },
        expect: {
            boundary: false,
            followUps: [
                'inventory',
                'spell',
            ],
            inventory: {
                operation: 'acquire',
                itemType: 'document',
                holderId: 'player',
                physicalForm:
                    'unchanged',
            },
            spellEvent: {
                kind: 'taught',
                spellId:
                    'spell_lumos',
            },
            customSpellCount: 0,
        },
    },
    {
        id:
            'identity_spell_and_gift',
        input: {
            playerAction:
                '*检查哈利手上的伤口，同时跟着赫敏练习 Lumos，并接过她送的签名羊皮纸*',
            narrativeSegments: [
                {
                    type: 'dialogue',
                    actorId: 'hermione',
                    textEn:
                        'Hermione said, "Lumos. Watch the wand tip, then repeat it."',
                },
                {
                    type: 'narration',
                    actorId: '',
                    textEn:
                        'A bleeding cut was clearly visible across Harry\'s palm while Hermione corrected Tina\'s pronunciation and handed Tina a signed parchment to keep.',
                },
            ],
            actors: baseActors(),
            rooms: baseRooms(),
            inventory: [],
            knownSpells:
                KNOWN_SPELLS,
            checkResult: {
                outcome: 'success',
            },
        },
        expect: {
            boundary: false,
            injury: {
                actorId: 'harry',
                injuryStatus:
                    'injured',
            },
            followUps: [
                'inventory',
                'spell',
            ],
            inventory: {
                operation: 'acquire',
                itemType: 'document',
                holderId: 'player',
                physicalForm:
                    'unchanged',
            },
            spellEvent: {
                kind: 'taught',
                spellId:
                    'spell_lumos',
            },
            customSpellCount: 0,
        },
    },
    {
        id: 'hypothetical_no_change',
        input: {
            playerAction:
                '“If I promise to meet tomorrow, would that count? I am not agreeing yet.”',
            narrativeSegments: [{
                type: 'narration',
                actorId: '',
                textEn:
                    'Hermione shook her head. The conversation continued without any agreement or action.',
            }],
            actors: baseActors(),
            rooms: baseRooms(),
            inventory: [],
            knownSpells:
                KNOWN_SPELLS,
            checkResult: null,
        },
        expect: {
            boundary: false,
            followUps: [],
            inventoryCount: 0,
            spellCount: 0,
            customSpellCount: 0,
        },
    },
    {
        id: 'failed_secret_custom_spell',
        input: {
            playerAction:
                '*偷偷尝试自创咒语 Umbra Flecto，让光线弯曲*',
            narrativeSegments: [{
                type: 'narration',
                actorId: '',
                textEn:
                    'Tina whispered Umbra Flecto, trying to bend the light, but the spell failed in a loud flash that sent Ron into the rafters before the whole class.',
            }],
            actors: baseActors(),
            rooms: baseRooms(),
            inventory: [],
            knownSpells:
                KNOWN_SPELLS,
            checkResult: {
                outcome:
                    'critical_failure',
                attemptedConcealment:
                    true,
            },
        },
        expect: {
            boundary: false,
            perception: {
                visualScope: 'room',
                audibleScope: 'room',
                concealment:
                    'attempted',
            },
            followUps: ['spell'],
            inventoryCount: 0,
            spellEvent: {
                kind: 'experiment',
                spellId: '',
            },
            customSpellCount: 1,
        },
    },
    {
        id: 'explicit_no_visible_injury',
        input: {
            playerAction:
                '*仔细检查罗恩有没有受伤*',
            narrativeSegments: [{
                type: 'narration',
                actorId: '',
                textEn:
                    'Tina examined Ron\'s arms and face; there were no visible injuries.',
            }],
            actors: baseActors(),
            rooms: baseRooms(),
            inventory: [],
            knownSpells:
                KNOWN_SPELLS,
            checkResult: {
                outcome: 'success',
            },
        },
        expect: {
            boundary: false,
            injury: {
                actorId: 'ron',
                injuryStatus:
                    'no_visible_injury',
            },
            followUps: [],
            inventoryCount: 0,
            spellCount: 0,
            customSpellCount: 0,
        },
    },
];

const ROUTING_SIGNALS_BY_CASE = {
    private_note_transfer: {
        paidItemOperations: [{
            operation: 'give',
            itemId: 'folded_note',
        }],
    },
    departure_visible_injury: {
        paidActorDepartures: [{
            actorId: 'harry',
            destinationRoomId:
                'entrance_hall',
        }],
        paidInjuryActorIds: [
            'harry',
        ],
    },
    destroy_with_remains: {
        paidItemOperations: [{
            operation: 'destroy',
            itemId: 'tinas_quill',
        }],
    },
    vanish_item_spell_demo: {
        paidItemOperations: [{
            operation: 'destroy',
            itemId: 'tinas_quill',
        }],
        paidSpellProposal: true,
    },
    spell_teaching_and_gift: {
        paidItemOperations: [{
            operation: 'acquire',
            itemId: '',
        }],
        paidSpellProposal: true,
    },
    identity_spell_and_gift: {
        paidItemOperations: [{
            operation: 'acquire',
            itemId: '',
        }],
        paidSpellProposal: true,
        paidInjuryActorIds: [
            'harry',
        ],
    },
    hypothetical_no_change: {},
    failed_secret_custom_spell: {
        paidSpellProposal: true,
    },
    explicit_no_visible_injury: {
        preTurnInspectionActorIds: [
            'ron',
        ],
    },
};

const EXPECTED_ROUTES_BY_CASE = {
    private_note_transfer: {
        requestedTasks: ['inventory'],
        inventoryOperationHints: [{
            operation: 'give',
            itemId: 'folded_note',
        }],
        identityTargetActorIds: [],
        inspectionTargetActorIds: [],
        focalActorIds: [],
        movementDestinationRoomIds:
            [],
    },
    departure_visible_injury: {
        requestedTasks: ['identity'],
        inventoryOperationHints: [],
        identityTargetActorIds: [
            'harry',
        ],
        inspectionTargetActorIds: [],
        focalActorIds: ['harry'],
        movementDestinationRoomIds: [
            'entrance_hall',
        ],
    },
    destroy_with_remains: {
        requestedTasks: ['inventory'],
        inventoryOperationHints: [{
            operation: 'destroy',
            itemId: 'tinas_quill',
        }],
        identityTargetActorIds: [],
        inspectionTargetActorIds: [],
        focalActorIds: [],
        movementDestinationRoomIds:
            [],
    },
    vanish_item_spell_demo: {
        requestedTasks: [
            'inventory',
            'spell',
        ],
        inventoryOperationHints: [{
            operation: 'destroy',
            itemId: 'tinas_quill',
        }],
        identityTargetActorIds: [],
        inspectionTargetActorIds: [],
        focalActorIds: [],
        movementDestinationRoomIds:
            [],
    },
    spell_teaching_and_gift: {
        requestedTasks: [
            'inventory',
            'spell',
        ],
        inventoryOperationHints: [{
            operation: 'acquire',
            itemId: '',
        }],
        identityTargetActorIds: [],
        inspectionTargetActorIds: [],
        focalActorIds: [],
        movementDestinationRoomIds:
            [],
    },
    identity_spell_and_gift: {
        requestedTasks: [
            'inventory',
            'spell',
            'identity',
        ],
        inventoryOperationHints: [{
            operation: 'acquire',
            itemId: '',
        }],
        identityTargetActorIds: [
            'harry',
        ],
        inspectionTargetActorIds: [],
        focalActorIds: [],
        movementDestinationRoomIds:
            [],
    },
    hypothetical_no_change: {
        requestedTasks: [],
        inventoryOperationHints: [],
        identityTargetActorIds: [],
        inspectionTargetActorIds: [],
        focalActorIds: [],
        movementDestinationRoomIds:
            [],
    },
    failed_secret_custom_spell: {
        requestedTasks: ['spell'],
        inventoryOperationHints: [],
        identityTargetActorIds: [],
        inspectionTargetActorIds: [],
        focalActorIds: [],
        movementDestinationRoomIds:
            [],
    },
    explicit_no_visible_injury: {
        requestedTasks: ['identity'],
        inventoryOperationHints: [],
        identityTargetActorIds: [
            'ron',
        ],
        inspectionTargetActorIds: [
            'ron',
        ],
        focalActorIds: [],
        movementDestinationRoomIds:
            [],
    },
};

function deriveDynamicRoute(
    routingSignals = {},
) {
    const exactIds =
        values => [
            ...new Set(
                (
                    values ||
                    []
                )
                    .map(value =>
                        String(
                            value ||
                            '',
                        ).trim())
                    .filter(Boolean),
            ),
        ];
    const inventoryOperationHints =
        (
            routingSignals
                .paidItemOperations ||
            []
        )
            .map(operation => ({
                operation:
                    String(
                        operation
                            ?.operation ||
                        '',
                    ).trim(),
                itemId:
                    String(
                        operation
                            ?.itemId ||
                        '',
                    ).trim(),
            }))
            .filter(operation =>
                operation.operation);
    const inspectionTargetActorIds =
        exactIds(
            routingSignals
                .preTurnInspectionActorIds,
        );
    const identityTargetActorIds =
        exactIds([
            ...(
                routingSignals
                    .paidInjuryActorIds ||
                []
            ),
            ...inspectionTargetActorIds,
        ]);
    const departures =
        routingSignals
            .paidActorDepartures ||
        [];
    const focalActorIds =
        exactIds(
            departures.map(
                departure =>
                    departure?.actorId,
            ),
        );
    const movementDestinationRoomIds =
        exactIds(
            departures.map(
                departure =>
                    departure
                        ?.destinationRoomId,
            ),
        );
    const requested =
        new Set(
            (
                routingSignals
                    .explicitTasks ||
                []
            ).filter(task =>
                [
                    'identity',
                    'inventory',
                    'spell',
                ].includes(task)),
        );
    if (inventoryOperationHints.length) {
        requested.add('inventory');
    }
    if (
        routingSignals
            .paidSpellProposal ===
        true
    ) {
        requested.add('spell');
    }
    if (identityTargetActorIds.length) {
        requested.add('identity');
    }
    return {
        requestedTasks: [
            'inventory',
            'spell',
            'identity',
        ].filter(task =>
            requested.has(task)),
        inventoryOperationHints,
        identityTargetActorIds,
        inspectionTargetActorIds,
        focalActorIds,
        movementDestinationRoomIds,
    };
}

for (const testCase of CASES) {
    testCase.input.routingSignals =
        structuredClone(
            ROUTING_SIGNALS_BY_CASE[
                testCase.id
            ],
        );
    testCase.expect.route =
        structuredClone(
            EXPECTED_ROUTES_BY_CASE[
                testCase.id
            ],
        );
}

CASES.find(testCase =>
    testCase.id ===
        'hypothetical_no_change')
    .expect
    .participantActorIds = [
        'hermione',
    ];

function hash(value) {
    return createHash('sha256')
        .update(
            String(value || ''),
        )
        .digest('hex');
}

function parseArguments() {
    const args =
        process.argv.slice(2);
    const result = {
        suite: 'all',
        output:
            path.join(
                SCRIPT_DIRECTORY,
                'results.json',
            ),
        rounds: 2,
    };
    for (
        let index = 0;
        index < args.length;
        index++
    ) {
        if (
            args[index] ===
            '--suite'
        ) {
            result.suite =
                args[++index];
        } else if (
            args[index] ===
            '--output'
        ) {
            result.output =
                path.resolve(
                    args[++index],
                );
        } else if (
            args[index] ===
            '--rounds'
        ) {
            result.rounds =
                Math.max(
                    1,
                    Number(
                        args[++index],
                    ) || 1,
                );
        }
    }
    return result;
}

async function waitForServer(
    baseUrl,
    child,
    logs,
) {
    const started =
        performance.now();
    while (
        performance.now() -
            started <
        30_000
    ) {
        if (
            child.exitCode !==
            null
        ) {
            throw new Error(
                `Ollama exited before ready: ${logs.stderr.slice(-2_000)}`,
            );
        }
        try {
            const response =
                await fetch(
                    `${baseUrl}/api/version`,
                );
            if (response.ok) {
                return;
            }
        } catch {
            // Server is still starting.
        }
        await new Promise(resolve =>
            setTimeout(
                resolve,
                100,
            ));
    }
    throw new Error(
        'Isolated Ollama did not become ready.',
    );
}

async function startServer({
    port,
    numParallel,
    maxLoadedModels,
    kvCacheType = '',
}) {
    const logs = {
        stdout: '',
        stderr: '',
    };
    const child =
        spawn(
            OLLAMA_BINARY,
            ['serve'],
            {
                cwd: PROJECT_ROOT,
                stdio: [
                    'ignore',
                    'pipe',
                    'pipe',
                ],
                env: {
                    ...process.env,
                    HOME:
                        OLLAMA_HOME,
                    OLLAMA_HOST:
                        `127.0.0.1:${port}`,
                    OLLAMA_MODELS,
                    OLLAMA_NUM_PARALLEL:
                        String(
                            numParallel,
                        ),
                    OLLAMA_MAX_LOADED_MODELS:
                        String(
                            maxLoadedModels,
                        ),
                    OLLAMA_FLASH_ATTENTION:
                        '1',
                    ...(
                        kvCacheType
                            ? {
                                OLLAMA_KV_CACHE_TYPE:
                                    kvCacheType,
                            }
                            : {}
                    ),
                },
            },
        );
    child.stdout.on(
        'data',
        chunk => {
            logs.stdout =
                (
                    logs.stdout +
                    String(chunk)
                ).slice(-20_000);
        },
    );
    child.stderr.on(
        'data',
        chunk => {
            logs.stderr =
                (
                    logs.stderr +
                    String(chunk)
                ).slice(-20_000);
        },
    );
    const baseUrl =
        `http://127.0.0.1:${port}`;
    await waitForServer(
        baseUrl,
        child,
        logs,
    );
    return {
        child,
        baseUrl,
        logs,
        config: {
            port,
            numParallel,
            maxLoadedModels,
            kvCacheType:
                kvCacheType ||
                'default',
        },
    };
}

async function stopServer(server) {
    if (
        !server?.child ||
        server.child.exitCode !==
            null
    ) {
        return;
    }
    server.child.kill('SIGTERM');
    await Promise.race([
        new Promise(resolve =>
            server.child.once(
                'exit',
                resolve,
            )),
        new Promise(resolve =>
            setTimeout(
                resolve,
                5_000,
            )),
    ]);
    if (
        server.child.exitCode ===
        null
    ) {
        server.child.kill(
            'SIGKILL',
        );
    }
}

async function processSnapshot(
    rootPid,
) {
    const {
        stdout,
    } = await execFileAsync(
        'ps',
        [
            '-axo',
            'pid=,ppid=,rss=,command=',
        ],
        {
            maxBuffer:
                4_000_000,
        },
    );
    const rows =
        stdout.split('\n')
            .map(line =>
                line.trim())
            .filter(Boolean)
            .map(line => {
                const match =
                    line.match(
                        /^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/u,
                    );
                return match
                    ? {
                        pid:
                            Number(
                                match[1],
                            ),
                        ppid:
                            Number(
                                match[2],
                            ),
                        rssKb:
                            Number(
                                match[3],
                            ),
                        command:
                            match[4],
                    }
                    : null;
            })
            .filter(Boolean);
    const pids =
        new Set([
            rootPid,
        ]);
    let changed = true;
    while (changed) {
        changed = false;
        for (const row of rows) {
            if (
                pids.has(
                    row.ppid,
                ) &&
                !pids.has(
                    row.pid,
                )
            ) {
                pids.add(row.pid);
                changed = true;
            }
        }
    }
    const selected =
        rows.filter(row =>
            pids.has(row.pid));
    return {
        rssBytes:
            selected.reduce(
                (
                    total,
                    row,
                ) =>
                    total +
                    row.rssKb *
                        1_024,
                0,
            ),
        processes:
            selected.map(row => ({
                pid: row.pid,
                ppid: row.ppid,
                rssBytes:
                    row.rssKb *
                    1_024,
                command:
                    row.command.slice(
                        0,
                        220,
                    ),
            })),
    };
}

class MemorySampler {
    constructor(server) {
        this.server = server;
        this.timer = null;
        this.running = false;
        this.samples = [];
    }

    async sample() {
        if (this.running) {
            return;
        }
        this.running = true;
        try {
            const [
                processes,
                modelResponse,
            ] = await Promise.all([
                processSnapshot(
                    this.server
                        .child.pid,
                ),
                fetch(
                    `${
                        this.server
                            .baseUrl
                    }/api/ps`,
                ).then(response =>
                    response.json())
                    .catch(() => ({
                        models: [],
                    })),
            ]);
            const models =
                (
                    modelResponse
                        ?.models ||
                    []
                ).map(model => ({
                    name:
                        model.name ||
                        model.model,
                    size:
                        Number(
                            model.size ||
                            0,
                        ),
                    sizeVram:
                        Number(
                            model.size_vram ||
                            0,
                        ),
                    contextLength:
                        Number(
                            model
                                .context_length ||
                            0,
                        ),
                }));
            this.samples.push({
                at: performance.now(),
                rssBytes:
                    processes.rssBytes,
                processes:
                    processes.processes,
                models,
                modelBytes:
                    models.reduce(
                        (
                            total,
                            model,
                        ) =>
                            total +
                            model.size,
                        0,
                    ),
                vramBytes:
                    models.reduce(
                        (
                            total,
                            model,
                        ) =>
                            total +
                            model
                                .sizeVram,
                        0,
                    ),
            });
        } finally {
            this.running = false;
        }
    }

    async start() {
        await this.sample();
        this.timer =
            setInterval(
                () => {
                    void this.sample();
                },
                80,
            );
    }

    async stop() {
        if (this.timer) {
            clearInterval(
                this.timer,
            );
        }
        while (this.running) {
            await new Promise(resolve =>
                setTimeout(
                    resolve,
                    10,
                ));
        }
        await this.sample();
        const peak = field =>
            Math.max(
                0,
                ...this.samples.map(
                    sample =>
                        sample[field] ||
                        0,
                ),
            );
        const peakSample =
            this.samples.reduce(
                (
                    current,
                    sample,
                ) =>
                    sample.rssBytes >
                    (
                        current
                            ?.rssBytes ||
                        -1
                    )
                        ? sample
                        : current,
                null,
            );
        return {
            sampleCount:
                this.samples.length,
            peakRssBytes:
                peak('rssBytes'),
            peakModelBytes:
                peak(
                    'modelBytes',
                ),
            peakVramBytes:
                peak(
                    'vramBytes',
                ),
            peakLoadedModels:
                Math.max(
                    0,
                    ...this.samples.map(
                        sample =>
                            sample.models
                                .length,
                    ),
                ),
            peakProcesses:
                peakSample
                    ?.processes ||
                [],
            observedModelSets: [
                ...new Set(
                    this.samples.map(
                        sample =>
                            sample.models
                                .map(model =>
                                    `${
                                        model.name
                                    }@${
                                        model
                                            .contextLength
                                    }`)
                                .sort()
                                .join('+'),
                    ),
                ),
            ].filter(Boolean),
        };
    }
}

async function chatRequest({
    baseUrl,
    model,
    system,
    input,
    schema,
    keepAlive = 0,
    seed = 42,
    numCtx = NUM_CTX,
}) {
    const controller =
        new AbortController();
    const timeout =
        setTimeout(
            () =>
                controller.abort(),
            DEFAULT_TIMEOUT_MS,
        );
    const started =
        performance.now();
    try {
        const response =
            await fetch(
                `${baseUrl}/api/chat`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            {
                                role:
                                    'system',
                                content:
                                    system,
                            },
                            {
                                role: 'user',
                                content:
                                    JSON.stringify(
                                        input,
                                    ),
                            },
                        ],
                        stream: false,
                        think: false,
                        format: schema,
                        keep_alive:
                            keepAlive,
                        options: {
                            temperature: 0,
                            seed,
                            num_ctx:
                                numCtx,
                            num_predict:
                                NUM_PREDICT,
                        },
                    }),
                    signal:
                        controller.signal,
                },
            );
        const payload =
            await response.json();
        if (!response.ok) {
            throw new Error(
                `Ollama ${response.status}: ${JSON.stringify(
                    payload,
                ).slice(0, 1_000)}`,
            );
        }
        const content =
            String(
                payload
                    ?.message
                    ?.content ||
                '',
            );
        let parsed = null;
        let parseError = '';
        try {
            parsed =
                JSON.parse(
                    content,
                );
        } catch (error) {
            parseError =
                String(
                    error?.message ||
                    error,
                );
        }
        return {
            model,
            wallMs:
                performance.now() -
                started,
            totalMs:
                Number(
                    payload
                        .total_duration ||
                    0,
                ) /
                1_000_000,
            loadMs:
                Number(
                    payload
                        .load_duration ||
                    0,
                ) /
                1_000_000,
            promptEvalMs:
                Number(
                    payload
                        .prompt_eval_duration ||
                    0,
                ) /
                1_000_000,
            evalMs:
                Number(
                    payload
                        .eval_duration ||
                    0,
                ) /
                1_000_000,
            promptTokens:
                Number(
                    payload
                        .prompt_eval_count ||
                    0,
                ),
            outputTokens:
                Number(
                    payload.eval_count ||
                    0,
                ),
            contentHash:
                hash(content),
            contentCharacters:
                content.length,
            parsed,
            parseError,
        };
    } finally {
        clearTimeout(timeout);
    }
}

async function prewarm(
    server,
    model = MODEL_SMALL,
    numCtx = NUM_CTX,
) {
    await chatRequest({
        baseUrl:
            server.baseUrl,
        model,
        system:
            'Return the required JSON.',
        input: {
            ready: true,
        },
        schema: {
            type: 'object',
            additionalProperties:
                false,
            required: ['ok'],
            properties: {
                ok: {
                    type: 'boolean',
                },
            },
        },
        keepAlive: '60s',
        numCtx,
    });
}

function splitInput(input) {
    const route =
        deriveDynamicRoute(
            input.routingSignals,
        );
    const routedInput = {
        ...input,
        ...route,
    };
    return {
        post: {
            playerId: 'player',
            ...routedInput,
        },
        inventory: {
            playerId: 'player',
            playerAction:
                input.playerAction,
            narrativeSegments:
                input
                    .narrativeSegments,
            inventory:
                input.inventory,
            inventoryOperationHints:
                route
                    .inventoryOperationHints,
            actors: input.actors,
        },
        spell: {
            playerId: 'player',
            playerAction:
                input.playerAction,
            narrativeSegments:
                input
                    .narrativeSegments,
            knownSpells:
                input.knownSpells,
            checkResult:
                input.checkResult,
        },
    };
}

async function runSplit({
    server,
    input,
    parallel,
    inventoryModel,
    postModel = MODEL_SMALL,
    spellModel = MODEL_SMALL,
    keepAlive = 0,
    seed = 42,
}) {
    const route =
        deriveDynamicRoute(
            input.routingSignals,
        );
    const routedInput = {
        ...input,
        ...route,
    };
    const split =
        splitInput(
            routedInput,
        );
    const operations = [
        () => chatRequest({
            baseUrl:
                server.baseUrl,
            model: postModel,
            system:
                POST_SYSTEM,
            input: split.post,
            schema:
                POST_SCHEMA,
            keepAlive,
            seed,
        }),
        () => chatRequest({
            baseUrl:
                server.baseUrl,
            model:
                inventoryModel,
            system:
                INVENTORY_SYSTEM,
            input:
                split.inventory,
            schema:
                inventorySchemaForHints(
                    split.inventory
                        .inventoryOperationHints,
                ),
            keepAlive,
            seed,
        }),
        () => chatRequest({
            baseUrl:
                server.baseUrl,
            model: spellModel,
            system:
                SPELL_SYSTEM,
            input:
                split.spell,
            schema:
                SPELL_SCHEMA,
            keepAlive,
            seed,
        }),
    ];
    const started =
        performance.now();
    const responses =
        parallel
            ? await Promise.all(
                operations.map(
                    operation =>
                        operation(),
                ),
            )
            : [
                await operations[0](),
                await operations[1](),
                await operations[2](),
            ];
    return {
        wallMs:
            performance.now() -
            started,
        calls: responses,
        output: {
            post:
                responses[0]
                    .parsed,
            inventory:
                responses[1]
                    .parsed,
            spell:
                responses[2]
                    .parsed,
        },
        parseErrors:
            responses.map(
                response =>
                    response
                        .parseError,
            ),
    };
}

async function runRouted({
    server,
    input,
    inventoryModel,
    spellModel = MODEL_SMALL,
    parallelFollowUps,
    keepAlive = 0,
    seed = 42,
}) {
    const split =
        splitInput(input);
    const started =
        performance.now();
    const post =
        await chatRequest({
            baseUrl:
                server.baseUrl,
            model: MODEL_SMALL,
            system:
                POST_SYSTEM,
            input: split.post,
            schema:
                POST_SCHEMA,
            keepAlive,
            seed,
        });
    const inventoryOperation =
        () => chatRequest({
            baseUrl:
                server.baseUrl,
            model:
                inventoryModel,
            system:
                INVENTORY_SYSTEM,
            input:
                split.inventory,
            schema:
                inventorySchemaForHints(
                    split.inventory
                        .inventoryOperationHints,
                ),
            keepAlive,
            seed,
        });
    const spellOperation =
        () => chatRequest({
            baseUrl:
                server.baseUrl,
            model: spellModel,
            system:
                SPELL_SYSTEM,
            input:
                split.spell,
            schema:
                SPELL_SCHEMA,
            keepAlive,
            seed,
        });
    const [
        inventory,
        spell,
    ] =
        parallelFollowUps
            ? await Promise.all([
                inventoryOperation(),
                spellOperation(),
            ])
            : [
                await inventoryOperation(),
                await spellOperation(),
            ];
    const responses = [
        post,
        inventory,
        spell,
    ];
    return {
        wallMs:
            performance.now() -
            started,
        calls: responses,
        output: {
            post: post.parsed,
            inventory:
                inventory.parsed,
            spell: spell.parsed,
        },
        parseErrors:
            responses.map(
                response =>
                    response
                        .parseError,
            ),
    };
}

async function runPostThenMergedFollowUp({
    server,
    input,
    followUpModel,
    postModel = MODEL_SMALL,
    keepAlive = 0,
    postKeepAlive = keepAlive,
    followUpKeepAlive =
        keepAlive,
    postNumCtx = NUM_CTX,
    followUpNumCtx =
        NUM_CTX,
    seed = 42,
}) {
    const split =
        splitInput(input);
    const started =
        performance.now();
    const post =
        await chatRequest({
            baseUrl:
                server.baseUrl,
            model: postModel,
            system:
                POST_SYSTEM,
            input: split.post,
            schema:
                POST_SCHEMA,
            keepAlive:
                postKeepAlive,
            seed,
            numCtx:
                postNumCtx,
        });
    const requestedTasks =
        new Set(
            route.requestedTasks,
        );
    let followUp = null;
    let inventory = {
        inventoryUpdates: [],
    };
    let spell = {
        spellEvents: [],
        customSpellProposals: [],
    };
    const hasDestroyHint =
        (
            route
                .inventoryOperationHints
        ).some(hint =>
            hint.operation ===
            'destroy');
    if (
        requestedTasks.has(
            'inventory',
        ) &&
        requestedTasks.has('spell')
    ) {
        const followUpSchema =
            structuredClone(
                FOLLOW_UP_SCHEMA,
            );
        followUpSchema
            .properties
            .inventory =
            inventorySchemaForHints(
                route
                    .inventoryOperationHints,
            );
        followUp =
            await chatRequest({
                baseUrl:
                    server.baseUrl,
                model:
                    followUpModel,
                system:
                    FOLLOW_UP_SYSTEM,
                input: {
                    playerId:
                        'player',
                    playerAction:
                        input
                            .playerAction,
                    narrativeSegments:
                        input
                            .narrativeSegments,
                    inventory:
                        input.inventory,
                    inventoryOperationHints:
                        route
                            .inventoryOperationHints,
                    actors:
                        input.actors,
                    knownSpells:
                        input
                            .knownSpells,
                    checkResult:
                        input
                            .checkResult,
                    requestedTasks: [
                        'inventory',
                        'spell',
                    ],
                },
                schema:
                    followUpSchema,
                keepAlive:
                    hasDestroyHint
                        ? '60s'
                        : followUpKeepAlive,
                seed,
                numCtx:
                    followUpNumCtx,
            });
        inventory =
            followUp.parsed
                ?.inventory ||
            inventory;
        spell =
            followUp.parsed
                ?.spell ||
            spell;
    } else if (
        requestedTasks.has(
            'inventory',
        )
    ) {
        followUp =
            await chatRequest({
                baseUrl:
                    server.baseUrl,
                model:
                    followUpModel,
                system:
                    INVENTORY_SYSTEM,
                input:
                    split.inventory,
                schema:
                    inventorySchemaForHints(
                        split.inventory
                            .inventoryOperationHints,
                    ),
                keepAlive:
                    hasDestroyHint
                        ? '60s'
                        : followUpKeepAlive,
                seed,
                numCtx:
                    followUpNumCtx,
            });
        inventory =
            followUp.parsed ||
            inventory;
    } else if (
        requestedTasks.has('spell')
    ) {
        followUp =
            await chatRequest({
                baseUrl:
                    server.baseUrl,
                model:
                    followUpModel,
                system:
                    SPELL_SYSTEM,
                input:
                    split.spell,
                schema:
                    SPELL_SCHEMA,
                keepAlive:
                    followUpKeepAlive,
                seed,
                numCtx:
                    followUpNumCtx,
            });
        spell =
            followUp.parsed ||
            spell;
    }
    let physicalFormCall = null;
    const destroyUpdate =
        (
            inventory
                .inventoryUpdates ||
            []
        ).find(update =>
            update.operation ===
            'destroy');
    if (
        hasDestroyHint &&
        destroyUpdate
            ?.evidenceText
    ) {
        physicalFormCall =
            await chatRequest({
                baseUrl:
                    server.baseUrl,
                model:
                    followUpModel,
                system:
                    PHYSICAL_FORM_SYSTEM,
                input: {
                    evidenceText:
                        destroyUpdate
                            .evidenceText,
                },
                schema:
                    PHYSICAL_FORM_SCHEMA,
                keepAlive:
                    followUpKeepAlive,
                seed,
                numCtx: 1_024,
            });
        if (
            physicalFormCall
                .parsed
                ?.physicalForm
        ) {
            destroyUpdate
                .physicalForm =
                physicalFormCall
                    .parsed
                    .physicalForm;
        }
    }
    const calls =
        [
            post,
            ...(
                followUp
                    ? [followUp]
                    : []
            ),
            ...(
                physicalFormCall
                    ? [
                        physicalFormCall,
                    ]
                    : []
            ),
        ];
    return {
        wallMs:
            performance.now() -
            started,
        calls,
        output: {
            post: post.parsed,
            inventory,
            spell,
        },
        parseErrors:
            calls.map(
                response =>
                    response
                        .parseError,
            ),
    };
}

async function runPostThenDynamicFollowUp({
    server,
    input,
    followUpModel =
        MODEL_LARGE,
    postModel = MODEL_SMALL,
    postKeepAlive = 0,
    followUpKeepAlive = 0,
    postNumCtx = 2_048,
    followUpNumCtx = 2_048,
    seed = 42,
}) {
    const started =
        performance.now();
    const route =
        deriveDynamicRoute(
            input.routingSignals,
        );
    const routedInput = {
        ...input,
        ...route,
    };
    const post =
        await chatRequest({
            baseUrl:
                server.baseUrl,
            model: postModel,
            system:
                POST_CORE_SYSTEM,
            input: {
                playerId:
                    'player',
                playerAction:
                    input.playerAction,
                narrativeSegments:
                    input
                        .narrativeSegments,
                actors: input.actors,
                rooms: input.rooms,
                focalActorIds:
                    route.focalActorIds,
                checkResult:
                    input.checkResult,
            },
            schema:
                postCoreSchemaForInput(
                    routedInput,
                ),
            keepAlive:
                postKeepAlive,
            seed,
            numCtx:
                postNumCtx,
        });
    const requestedTasks =
        route.requestedTasks;
    let followUp = null;
    let inventory = {
        inventoryUpdates: [],
    };
    let spell = {
        spellEvents: [],
        customSpellProposals: [],
    };
    let identity = {
        identityObservations: [],
    };
    const hasDestroyHint =
        (
            route
                .inventoryOperationHints
        ).some(hint =>
            hint.operation ===
            'destroy');
    if (requestedTasks.length) {
        const followUpInput = {
            playerId: 'player',
            playerAction:
                input.playerAction,
            narrativeSegments:
                input
                    .narrativeSegments,
            requestedTasks,
        };
        if (
            requestedTasks.includes(
                'inventory',
            )
        ) {
            Object.assign(
                followUpInput,
                {
                    inventory:
                        input.inventory,
                    inventoryOperationHints:
                        route
                            .inventoryOperationHints,
                    actors:
                        input.actors,
                },
            );
        }
        if (
            requestedTasks.includes(
                'spell',
            )
        ) {
            Object.assign(
                followUpInput,
                {
                    knownSpells:
                        input.knownSpells,
                    checkResult:
                        input.checkResult,
                },
            );
        }
        if (
            requestedTasks.includes(
                'identity',
            )
        ) {
            Object.assign(
                followUpInput,
                {
                    actors:
                        input.actors,
                    identityTargetActorIds:
                        route
                            .identityTargetActorIds,
                    inspectionTargetActorIds:
                        route
                            .inspectionTargetActorIds,
                },
            );
        }
        followUp =
            await chatRequest({
                baseUrl:
                    server.baseUrl,
                model:
                    followUpModel,
                system:
                    dynamicFollowUpSystem(
                        requestedTasks,
                    ),
                input:
                    followUpInput,
                schema:
                    dynamicFollowUpSchema(
                        requestedTasks,
                        routedInput,
                    ),
                keepAlive:
                    hasDestroyHint
                        ? '60s'
                        : followUpKeepAlive,
                seed,
                numCtx:
                    followUpNumCtx,
            });
        inventory =
            followUp.parsed
                ?.inventory ||
            inventory;
        spell =
            followUp.parsed
                ?.spell ||
            spell;
        identity =
            followUp.parsed
                ?.identity ||
            identity;
    }
    let physicalFormCall = null;
    const destroyUpdate =
        (
            inventory
                .inventoryUpdates ||
            []
        ).find(update =>
            update.operation ===
            'destroy');
    if (
        hasDestroyHint &&
        destroyUpdate
            ?.evidenceText
    ) {
        physicalFormCall =
            await chatRequest({
                baseUrl:
                    server.baseUrl,
                model:
                    followUpModel,
                system:
                    PHYSICAL_FORM_SYSTEM,
                input: {
                    evidenceText:
                        destroyUpdate
                            .evidenceText,
                },
                schema:
                    PHYSICAL_FORM_SCHEMA,
                keepAlive:
                    followUpKeepAlive,
                seed,
                numCtx: 1_024,
            });
        if (
            physicalFormCall
                .parsed
                ?.physicalForm
        ) {
            destroyUpdate
                .physicalForm =
                physicalFormCall
                    .parsed
                    .physicalForm;
        }
    }
    const calls = [
        post,
        ...(
            followUp
                ? [followUp]
                : []
        ),
        ...(
            physicalFormCall
                ? [physicalFormCall]
                : []
        ),
    ];
    return {
        wallMs:
            performance.now() -
            started,
        calls,
        output: {
            route,
            post: {
                ...(post.parsed ||
                    {}),
                followUpTasks: [],
                identityObservations:
                    identity
                        .identityObservations ||
                    [],
            },
            inventory,
            spell,
        },
        parseErrors:
            calls.map(
                response =>
                    response
                        .parseError,
            ),
    };
}

async function runMerged({
    server,
    input,
    model,
    keepAlive = 0,
    seed = 42,
}) {
    const started =
        performance.now();
    const response =
        await chatRequest({
            baseUrl:
                server.baseUrl,
            model,
            system:
                MERGED_SYSTEM,
            input: {
                playerId:
                    'player',
                ...input,
            },
            schema:
                MERGED_SCHEMA,
            keepAlive,
            seed,
        });
    return {
        wallMs:
            performance.now() -
            started,
        calls: [response],
        output:
            response.parsed,
        parseErrors: [
            response
                .parseError,
        ],
    };
}

function includesSameMembers(
    actual,
    expected,
) {
    const left = [
        ...new Set(
            Array.isArray(actual)
                ? actual
                : [],
        ),
    ].sort();
    const right = [
        ...new Set(
            Array.isArray(expected)
                ? expected
                : [],
        ),
    ].sort();
    return JSON.stringify(left) ===
        JSON.stringify(right);
}

function matchSubset(
    actual,
    expected,
) {
    if (
        !actual ||
        typeof actual !==
            'object'
    ) {
        return false;
    }
    return Object.entries(
        expected,
    ).every(([
        key,
        value,
    ]) =>
        actual[key] ===
        value);
}

function applyDeterministicGuards(
    testCase,
    output,
) {
    const guarded =
        structuredClone(
            output || {
                post: {},
                inventory: {},
                spell: {},
            },
        );
    guarded.post ??= {};
    guarded.inventory ??= {
        inventoryUpdates: [],
    };
    guarded.spell ??= {
        spellEvents: [],
        customSpellProposals: [],
    };
    const sourceTexts = [
        String(
            testCase.input
                .playerAction ||
            '',
        ),
        ...(
            testCase.input
                .narrativeSegments ||
            []
        ).map(segment =>
            String(
                segment?.textEn ||
                '',
            )),
    ];
    const exactEvidence =
        evidence => {
            const value =
                String(
                    evidence ||
                    '',
                ).trim();
            return Boolean(
                value &&
                sourceTexts.some(
                    source =>
                        source.includes(
                            value,
                        ),
                ),
            );
        };
    const actors =
        new Map(
            (
                testCase.input
                    .actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    const roomIds =
        new Set(
            (
                testCase.input
                    .rooms ||
                []
            ).map(room =>
                room.id),
        );
    const roomsById =
        new Map(
            (
                testCase.input
                    .rooms ||
                []
            ).map(room => [
                room.id,
                room,
            ]),
        );
    guarded.post.actorUpdates =
        (
            guarded.post
                .actorUpdates ||
            []
        ).map(update => {
            const index =
                Number(
                    update
                        .evidenceSegmentIndex,
                );
            const resolvedEvidence =
                String(
                    testCase.input
                        .narrativeSegments
                        ?.[index]
                        ?.textEn ||
                    '',
                );
            return resolvedEvidence &&
                !exactEvidence(
                    update.evidenceText,
                )
                ? {
                    ...update,
                    evidenceText:
                        resolvedEvidence,
                }
                : update;
        }).filter(update => {
            const actor =
                actors.get(
                    update.actorId,
                );
            const hasSegmentReference =
                update
                    .evidenceSegmentIndex !==
                undefined;
            const evidence =
                String(
                    update
                        .evidenceText ||
                    '',
                );
            const destination =
                roomsById.get(
                    update.roomId,
                );
            const destinationLabels = [
                destination?.nameEn,
                String(
                    destination?.id ||
                    '',
                ).replace(
                    /_/gu,
                    ' ',
                ),
            ]
                .map(value =>
                    String(
                        value ||
                        '',
                    )
                        .trim()
                        .toLocaleLowerCase())
                .filter(Boolean);
            if (
                !actor ||
                !exactEvidence(
                    evidence,
                ) ||
                !roomIds.has(
                    update.roomId,
                ) ||
                (
                    hasSegmentReference &&
                    !destinationLabels
                        .some(label =>
                            evidence
                                .toLocaleLowerCase()
                                .includes(
                                    label,
                                ))
                )
            ) {
                return false;
            }
            if (
                update.presence ===
                'absent'
            ) {
                return update.roomId !==
                    actor.roomId;
            }
            if (
                update.presence ===
                'present'
            ) {
                return actor.present ===
                    false;
            }
            return false;
        });
    const inspectionTargets =
        new Set(
            guarded.route
                ?.inspectionTargetActorIds ||
            [],
        );
    const identityTargets =
        new Set(
            guarded.route
                ?.identityTargetActorIds ||
            [],
        );
    guarded.post
        .identityObservations =
        (
            guarded.post
                .identityObservations ||
            []
        ).map(observation => {
            if (
                exactEvidence(
                    observation
                        .evidenceText,
                )
            ) {
                return observation;
            }
            const index =
                Number(
                    observation
                        .evidenceSegmentIndex,
                );
            const resolvedEvidence =
                String(
                    testCase.input
                        .narrativeSegments
                        ?.[index]
                        ?.textEn ||
                    '',
                );
            return resolvedEvidence
                ? {
                    ...observation,
                    evidenceText:
                        resolvedEvidence,
                }
                : observation;
        }).filter(observation => {
            if (
                !actors.has(
                    observation.actorId,
                ) ||
                !identityTargets.has(
                    observation.actorId,
                ) ||
                !exactEvidence(
                    observation
                        .evidenceText,
                )
            ) {
                return false;
            }
            return observation
                .injuryStatus !==
                'no_visible_injury' ||
                inspectionTargets.has(
                    observation.actorId,
                );
        });
    if (
        guarded.post
            .eventBoundary
            ?.ended === true &&
        !guarded.post
            .actorUpdates
            .some(update =>
                update.presence ===
                'absent') &&
        testCase.input
            .procedureCompleted !==
            true
    ) {
        guarded.post
            .eventBoundary = {
            ...guarded.post
                .eventBoundary,
            ended: false,
            evidenceText: '',
        };
    }
    if (
        !exactEvidence(
            guarded.post
                .perception
                ?.evidenceText,
        )
    ) {
        const index =
            Number(
                guarded.post
                    .perception
                    ?.evidenceSegmentIndex,
            );
        const resolvedEvidence =
            index === -1
                ? String(
                    testCase.input
                        .playerAction ||
                    '',
                )
                : String(
                    testCase.input
                        .narrativeSegments
                        ?.[index]
                        ?.textEn ||
                    '',
                );
        guarded.post.perception =
            resolvedEvidence
                ? {
                    ...guarded.post
                        .perception,
                    evidenceText:
                        resolvedEvidence,
                }
                : {
                    visualScope:
                        'none',
                    audibleScope:
                        'none',
                    concealment:
                        'none',
                    directParticipantActorIds:
                        [],
                    evidenceText: '',
                    evidenceSegmentIndex:
                        -1,
                    confidence: 0,
                };
    }
    const allowedPerceptionActorIds =
        new Set([
            'player',
            ...actors.keys(),
        ]);
    const perceptionEvidence =
        String(
            guarded.post
                .perception
                .evidenceText ||
            '',
        ).toLocaleLowerCase();
    guarded.post
        .perception
        .directParticipantActorIds =
        (
            guarded.post
                .perception
                .directParticipantActorIds ||
            []
        ).filter(actorId => {
            if (
                !allowedPerceptionActorIds
                    .has(actorId)
            ) {
                return false;
            }
            if (actorId === 'player') {
                return true;
            }
            return perceptionEvidence
                .includes(
                    String(actorId)
                        .replace(
                            /_/gu,
                            ' ',
                        )
                        .toLocaleLowerCase(),
                );
        });
    if (
        testCase.input
            .checkResult
            ?.attemptedConcealment ===
            true &&
        [
            'failure',
            'critical_failure',
        ].includes(
            testCase.input
                .checkResult
                ?.outcome,
        ) &&
        (
            guarded.post
                .perception
                .visualScope !==
                'none' ||
            guarded.post
                .perception
                .audibleScope !==
                'none'
        )
    ) {
        guarded.post
            .perception
            .concealment =
            'attempted';
    }
    const existingItemIds =
        new Set(
            (
                testCase.input
                    .inventory ||
                []
            ).map(item =>
                item.id),
        );
    const allowedHolderIds =
        new Set([
            '',
            'player',
            ...actors.keys(),
        ]);
    guarded.inventory
        .inventoryUpdates =
        (
            guarded.inventory
                .inventoryUpdates ||
            []
        ).filter(update => {
            if (
                !exactEvidence(
                    update
                        .evidenceText,
                ) ||
                !allowedHolderIds
                    .has(
                        update.ownerId,
                    ) ||
                !allowedHolderIds
                    .has(
                        update.holderId,
                    ) ||
                !allowedHolderIds
                    .has(
                        update
                            .targetHolderId,
                    )
            ) {
                return false;
            }
            if (
                update.operation !==
                    'acquire' &&
                !existingItemIds.has(
                    update.itemId,
                )
            ) {
                return false;
            }
            return update.operation ===
                'destroy'
                ? [
                    'remains',
                    'absent',
                ].includes(
                    update
                        .physicalForm,
                )
                : update
                    .physicalForm ===
                    'unchanged';
        });
    const knownSpellIds =
        new Set(
            (
                testCase.input
                    .knownSpells ||
                []
            ).map(spell =>
                spell.id),
        );
    guarded.spell.spellEvents =
        (
            guarded.spell
                .spellEvents ||
            []
        ).filter(event =>
            exactEvidence(
                event.evidenceText,
            ) &&
            (
                knownSpellIds.has(
                    event.spellId,
                ) ||
                (
                    event.kind ===
                        'experiment' &&
                    event.spellId ===
                        ''
                )
            ));
    guarded.spell
        .customSpellProposals =
        (
            guarded.spell
                .customSpellProposals ||
            []
        ).filter(proposal =>
            exactEvidence(
                proposal
                    .evidenceText,
            ));
    return guarded;
}

function scoreOutput(
    testCase,
    output,
    {
        ignorePostRouting =
            false,
    } = {},
) {
    const failures = [];
    let total = 0;
    let passed = 0;
    const check = (
        label,
        condition,
    ) => {
        total++;
        if (condition) {
            passed++;
        } else {
            failures.push(label);
        }
    };
    const post =
        output?.post || {};
    const route =
        output?.route || {};
    const inventory =
        output?.inventory || {};
    const spell =
        output?.spell || {};
    const expected =
        testCase.expect;
    const sourceTexts = [
        String(
            testCase.input
                .playerAction ||
            '',
        ),
        ...(
            testCase.input
                .narrativeSegments ||
            []
        ).map(segment =>
            String(
                segment?.textEn ||
                '',
            )),
    ];
    const evidenceGrounded =
        value => {
            const evidence =
                String(
                    value ||
                    '',
                ).trim();
            return !evidence ||
                sourceTexts.some(
                    source =>
                        source.includes(
                            evidence,
                        ),
                );
        };
    check(
        'eventBoundary',
        post.eventBoundary
            ?.ended ===
            expected.boundary,
    );
    if (expected.route) {
        check(
            'routeTasks',
            includesSameMembers(
                route.requestedTasks,
                expected
                    .route
                    .requestedTasks,
            ),
        );
        check(
            'routeIdentityTargets',
            includesSameMembers(
                route
                    .identityTargetActorIds,
                expected
                    .route
                    .identityTargetActorIds,
            ),
        );
        check(
            'routeInspectionTargets',
            includesSameMembers(
                route
                    .inspectionTargetActorIds,
                expected
                    .route
                    .inspectionTargetActorIds,
            ),
        );
        check(
            'routeFocalActors',
            includesSameMembers(
                route.focalActorIds,
                expected
                    .route
                    .focalActorIds,
            ),
        );
        check(
            'routeMovementDestinations',
            includesSameMembers(
                route
                    .movementDestinationRoomIds,
                expected
                    .route
                    .movementDestinationRoomIds,
            ),
        );
        check(
            'routeInventoryHints',
            JSON.stringify(
                route
                    .inventoryOperationHints ||
                [],
            ) ===
                JSON.stringify(
                    expected
                        .route
                        .inventoryOperationHints ||
                    [],
                ),
        );
    }
    if (expected.perception) {
        check(
            'perception',
            matchSubset(
                post.perception,
                expected.perception,
            ),
        );
    }
    if (
        expected
            .participantActorIds !==
        undefined
    ) {
        check(
            'perceptionParticipants',
            includesSameMembers(
                post.perception
                    ?.directParticipantActorIds,
                expected
                    .participantActorIds,
            ),
        );
    }
    if (expected.actorUpdate) {
        check(
            'actorUpdate',
            (
                post.actorUpdates ||
                []
            ).some(update =>
                matchSubset(
                    update,
                    expected
                        .actorUpdate,
                )),
        );
    }
    check(
        'actorUpdateCount',
        (
            post.actorUpdates ||
            []
        ).length ===
            (
                expected.actorUpdate
                    ? 1
                    : 0
            ),
    );
    if (expected.injury) {
        check(
            'identityObservation',
            (
                post
                    .identityObservations ||
                []
            ).some(observation =>
                matchSubset(
                    observation,
                    expected.injury,
                )),
        );
    }
    check(
        'identityObservationCount',
        (
            post
                .identityObservations ||
            []
        ).length ===
            (
                expected.injury
                    ? 1
                    : 0
            ),
    );
    if (!ignorePostRouting) {
        check(
            'followUpTasks',
            includesSameMembers(
                post.followUpTasks,
                expected.followUps,
            ),
        );
    }
    const updates =
        inventory
            .inventoryUpdates ||
        [];
    if (expected.inventory) {
        check(
            'inventoryUpdate',
            updates.some(update =>
                matchSubset(
                    update,
                    expected
                        .inventory,
                )),
        );
    } else {
        check(
            'inventoryEmpty',
            updates.length ===
                Number(
                    expected
                        .inventoryCount ||
                    0,
                ),
        );
    }
    check(
        'inventoryUpdateCount',
        updates.length ===
            (
                expected.inventory
                    ? 1
                    : Number(
                        expected
                            .inventoryCount ||
                        0,
                    )
            ),
    );
    const spellEvents =
        spell.spellEvents ||
        [];
    if (expected.spellEvent) {
        check(
            'spellEvent',
            spellEvents.some(event =>
                matchSubset(
                    event,
                    expected
                        .spellEvent,
                )),
        );
    } else {
        check(
            'spellEventsEmpty',
            spellEvents.length ===
                Number(
                    expected
                        .spellCount ||
                    0,
                ),
        );
    }
    check(
        'spellEventCount',
        spellEvents.length ===
            (
                expected.spellEvent
                    ? 1
                    : Number(
                        expected
                            .spellCount ||
                        0,
                    )
            ),
    );
    check(
        'customSpellCount',
        (
            spell
                .customSpellProposals ||
            []
        ).length ===
            Number(
                expected
                    .customSpellCount ||
                0,
            ),
    );
    const evidenceValues = [
        post.eventBoundary
            ?.evidenceText,
        post.perception
            ?.evidenceText,
        ...(
            post.actorUpdates ||
            []
        ).map(item =>
            item.evidenceText),
        ...(
            post
                .identityObservations ||
            []
        ).map(item =>
            item.evidenceText),
        ...updates.map(item =>
            item.evidenceText),
        ...spellEvents.map(item =>
            item.evidenceText),
        ...(
            spell
                .customSpellProposals ||
            []
        ).map(item =>
            item.evidenceText),
    ];
    check(
        'allEvidenceGrounded',
        evidenceValues.every(
            evidenceGrounded,
        ),
    );
    const allowedActorIds =
        new Set([
            'player',
            ...(
                testCase.input
                    .actors ||
                []
            ).map(actor =>
                actor.id),
        ]);
    check(
        'actorIdsGrounded',
        [
            ...(
                post.actorUpdates ||
                []
            ).map(item =>
                item.actorId),
            ...(
                post
                    .identityObservations ||
                []
            ).map(item =>
                item.actorId),
            ...(
                post.perception
                    ?.directParticipantActorIds ||
                []
            ),
        ].every(actorId =>
            allowedActorIds.has(
                actorId,
            )),
    );
    check(
        'nonDestroyPhysicalFormEmpty',
        updates.every(update =>
            update.operation ===
                'destroy' ||
            update.physicalForm ===
                'unchanged'),
    );
    return {
        passed,
        total,
        ratio:
            total
                ? passed / total
                : 0,
        failures,
    };
}

function normalizeOutput(
    result,
) {
    return result.output || {
        post: null,
        inventory: null,
        spell: null,
    };
}

async function runMeasured(
    server,
    operation,
) {
    const sampler =
        new MemorySampler(
            server,
        );
    await sampler.start();
    try {
        const result =
            await operation();
        const memory =
            await sampler.stop();
        return {
            ...result,
            memory,
        };
    } catch (error) {
        const memory =
            await sampler.stop();
        return {
            wallMs: null,
            calls: [],
            output: null,
            parseErrors: [],
            error:
                String(
                    error?.stack ||
                    error,
                ),
            memory,
        };
    }
}

const PERFORMANCE_CONFIGS = [
    {
        id: 'serial_same_1_7b',
        port: 11535,
        numParallel: 1,
        maxLoadedModels: 1,
        execute: (
            server,
            input,
        ) =>
            runSplit({
                server,
                input,
                parallel: false,
                inventoryModel:
                    MODEL_SMALL,
            }),
    },
    {
        id: 'parallel_same_1_7b',
        port: 11536,
        numParallel: 3,
        maxLoadedModels: 1,
        execute: (
            server,
            input,
        ) =>
            runSplit({
                server,
                input,
                parallel: true,
                inventoryModel:
                    MODEL_SMALL,
            }),
    },
    {
        id: 'serial_same_4b',
        port: 11542,
        numParallel: 1,
        maxLoadedModels: 1,
        prewarmModel:
            MODEL_LARGE,
        execute: (
            server,
            input,
        ) =>
            runSplit({
                server,
                input,
                parallel: false,
                inventoryModel:
                    MODEL_LARGE,
                postModel:
                    MODEL_LARGE,
                spellModel:
                    MODEL_LARGE,
            }),
    },
    {
        id: 'parallel_same_4b',
        port: 11543,
        numParallel: 3,
        maxLoadedModels: 1,
        prewarmModel:
            MODEL_LARGE,
        execute: (
            server,
            input,
        ) =>
            runSplit({
                server,
                input,
                parallel: true,
                inventoryModel:
                    MODEL_LARGE,
                postModel:
                    MODEL_LARGE,
                spellModel:
                    MODEL_LARGE,
            }),
    },
    {
        id: 'parallel_mixed_max1',
        port: 11537,
        numParallel: 3,
        maxLoadedModels: 1,
        execute: (
            server,
            input,
        ) =>
            runSplit({
                server,
                input,
                parallel: true,
                inventoryModel:
                    MODEL_LARGE,
            }),
    },
    {
        id: 'parallel_mixed_max2',
        port: 11538,
        numParallel: 3,
        maxLoadedModels: 2,
        execute: (
            server,
            input,
        ) =>
            runSplit({
                server,
                input,
                parallel: true,
                inventoryModel:
                    MODEL_LARGE,
            }),
    },
    {
        id: 'pipeline_serial_mixed',
        port: 11544,
        numParallel: 1,
        maxLoadedModels: 1,
        execute: (
            server,
            input,
        ) =>
            runRouted({
                server,
                input,
                inventoryModel:
                    MODEL_LARGE,
                parallelFollowUps:
                    false,
            }),
    },
    {
        id: 'pipeline_parallel_followups_same_1_7b',
        port: 11545,
        numParallel: 2,
        maxLoadedModels: 1,
        execute: (
            server,
            input,
        ) =>
            runRouted({
                server,
                input,
                inventoryModel:
                    MODEL_SMALL,
                parallelFollowUps:
                    true,
            }),
    },
    {
        id: 'pipeline_parallel_followups_mixed_max1',
        port: 11546,
        numParallel: 2,
        maxLoadedModels: 1,
        execute: (
            server,
            input,
        ) =>
            runRouted({
                server,
                input,
                inventoryModel:
                    MODEL_LARGE,
                parallelFollowUps:
                    true,
            }),
    },
    {
        id: 'pipeline_parallel_followups_mixed_max2',
        port: 11547,
        numParallel: 2,
        maxLoadedModels: 2,
        execute: (
            server,
            input,
        ) =>
            runRouted({
                server,
                input,
                inventoryModel:
                    MODEL_LARGE,
                parallelFollowUps:
                    true,
            }),
    },
    {
        id: 'two_stage_merged_followups_1_7b',
        port: 11548,
        numParallel: 1,
        maxLoadedModels: 1,
        execute: (
            server,
            input,
        ) =>
            runPostThenMergedFollowUp({
                server,
                input,
                followUpModel:
                    MODEL_SMALL,
            }),
    },
    {
        id: 'two_stage_merged_followups_4b',
        port: 11549,
        numParallel: 1,
        maxLoadedModels: 1,
        execute: (
            server,
            input,
        ) =>
            runPostThenMergedFollowUp({
                server,
                input,
                followUpModel:
                    MODEL_LARGE,
            }),
    },
    {
        id: 'two_stage_merged_followups_4b_ctx2048',
        port: 11551,
        numParallel: 1,
        maxLoadedModels: 1,
        prewarmNumCtx:
            2_048,
        execute: (
            server,
            input,
        ) =>
            runPostThenMergedFollowUp({
                server,
                input,
                followUpModel:
                    MODEL_LARGE,
                postNumCtx:
                    2_048,
                followUpNumCtx:
                    2_048,
            }),
    },
    {
        id:
            'two_stage_dynamic_4b_identity_ctx2048',
        port: 11552,
        numParallel: 1,
        maxLoadedModels: 1,
        prewarmNumCtx:
            2_048,
        testCaseId:
            'identity_spell_and_gift',
        execute: (
            server,
            input,
        ) =>
            runPostThenDynamicFollowUp({
                server,
                input,
            }),
    },
    {
        id: 'two_stage_all_4b',
        port: 11550,
        numParallel: 1,
        maxLoadedModels: 1,
        prewarmModel:
            MODEL_LARGE,
        execute: (
            server,
            input,
        ) =>
            runPostThenMergedFollowUp({
                server,
                input,
                postModel:
                    MODEL_LARGE,
                followUpModel:
                    MODEL_LARGE,
                postKeepAlive:
                    '60s',
                followUpKeepAlive:
                    0,
            }),
    },
    {
        id: 'merged_1_7b',
        port: 11539,
        numParallel: 1,
        maxLoadedModels: 1,
        execute: (
            server,
            input,
        ) =>
            runMerged({
                server,
                input,
                model:
                    MODEL_SMALL,
            }),
    },
    {
        id: 'merged_4b',
        port: 11540,
        numParallel: 1,
        maxLoadedModels: 1,
        execute: (
            server,
            input,
        ) =>
            runMerged({
                server,
                input,
                model:
                    MODEL_LARGE,
            }),
    },
];

async function runPerformance(
    rounds,
) {
    const defaultTestCase =
        CASES.find(item =>
            item.id ===
            'spell_teaching_and_gift');
    const results = [];
    const filter =
        String(
            process.env
                .BENCHMARK_FILTER ||
            '',
        );
    const configurations =
        filter
            ? PERFORMANCE_CONFIGS
                .filter(config =>
                    config.id
                        .includes(
                            filter,
                        ))
            : PERFORMANCE_CONFIGS;
    for (
        const config of
        configurations
    ) {
        const testCase =
            CASES.find(item =>
                item.id ===
                (
                    config
                        .testCaseId ||
                    defaultTestCase.id
                ));
        process.stdout.write(
            `performance ${config.id}\n`,
        );
        const server =
            await startServer(
                config,
            );
        try {
            await prewarm(
                server,
                config
                    .prewarmModel ||
                    MODEL_SMALL,
                config
                    .prewarmNumCtx ||
                    NUM_CTX,
            );
            const runs = [];
            for (
                let round = 0;
                round < rounds;
                round++
            ) {
                process.stdout.write(
                    `  round ${round + 1}/${rounds}\n`,
                );
                const run =
                    await runMeasured(
                        server,
                        () =>
                            config
                                .execute(
                                    server,
                                    testCase
                                        .input,
                                ),
                    );
                const output =
                    normalizeOutput(
                        run,
                    );
                const acceptedOutput =
                    applyDeterministicGuards(
                        testCase,
                        output,
                    );
                const scoreOptions = {
                    ignorePostRouting:
                        config.id
                            .startsWith(
                                'two_stage_',
                            ),
                };
                runs.push({
                    round,
                    ...run,
                    rawScore:
                        run.output
                            ? scoreOutput(
                                testCase,
                                output,
                                scoreOptions,
                            )
                            : null,
                    acceptedOutput,
                    score:
                        run.output
                            ? scoreOutput(
                                testCase,
                                acceptedOutput,
                                scoreOptions,
                            )
                            : null,
                });
            }
            results.push({
                id: config.id,
                server:
                    server.config,
                testCase:
                    testCase.id,
                runs,
                serverLogTail:
                    server.logs
                        .stderr
                        .slice(
                            -4_000,
                        ),
            });
        } finally {
            await stopServer(
                server,
            );
        }
    }
    return results;
}

const QUALITY_CONFIGS = [
    {
        id: 'split_same_1_7b',
        run: (
            server,
            input,
            seed,
        ) =>
            runSplit({
                server,
                input,
                parallel: false,
                inventoryModel:
                    MODEL_SMALL,
                keepAlive: '60s',
                seed,
            }),
        rounds: 2,
    },
    {
        id: 'split_mixed',
        run: (
            server,
            input,
            seed,
        ) =>
            runSplit({
                server,
                input,
                parallel: false,
                inventoryModel:
                    MODEL_LARGE,
                keepAlive: '60s',
                seed,
            }),
        rounds: 1,
    },
    {
        id: 'split_same_4b',
        run: (
            server,
            input,
            seed,
        ) =>
            runSplit({
                server,
                input,
                parallel: false,
                inventoryModel:
                    MODEL_LARGE,
                postModel:
                    MODEL_LARGE,
                spellModel:
                    MODEL_LARGE,
                keepAlive: '60s',
                seed,
            }),
        rounds: 1,
    },
    {
        id: 'two_stage_merged_followups_1_7b',
        run: (
            server,
            input,
            seed,
        ) =>
            runPostThenMergedFollowUp({
                server,
                input,
                followUpModel:
                    MODEL_SMALL,
                keepAlive: '60s',
                seed,
            }),
        rounds: 2,
    },
    {
        id: 'two_stage_merged_followups_4b',
        run: (
            server,
            input,
            seed,
        ) =>
            runPostThenMergedFollowUp({
                server,
                input,
                followUpModel:
                    MODEL_LARGE,
                keepAlive: '60s',
                seed,
            }),
        rounds: 3,
    },
    {
        id: 'two_stage_merged_followups_4b_ctx2048',
        run: (
            server,
            input,
            seed,
        ) =>
            runPostThenMergedFollowUp({
                server,
                input,
                followUpModel:
                    MODEL_LARGE,
                keepAlive: '60s',
                postNumCtx:
                    2_048,
                followUpNumCtx:
                    2_048,
                seed,
            }),
        rounds: 2,
    },
    {
        id:
            'two_stage_dynamic_4b_identity_ctx2048',
        run: (
            server,
            input,
            seed,
        ) =>
            runPostThenDynamicFollowUp({
                server,
                input,
                seed,
            }),
        rounds: 5,
    },
    {
        id: 'two_stage_all_4b',
        run: (
            server,
            input,
            seed,
        ) =>
            runPostThenMergedFollowUp({
                server,
                input,
                postModel:
                    MODEL_LARGE,
                followUpModel:
                    MODEL_LARGE,
                keepAlive: '60s',
                seed,
            }),
        rounds: 2,
    },
    {
        id: 'merged_1_7b',
        run: (
            server,
            input,
            seed,
        ) =>
            runMerged({
                server,
                input,
                model:
                    MODEL_SMALL,
                keepAlive: '60s',
                seed,
            }),
        rounds: 2,
    },
    {
        id: 'merged_4b',
        run: (
            server,
            input,
            seed,
        ) =>
            runMerged({
                server,
                input,
                model:
                    MODEL_LARGE,
                keepAlive: '60s',
                seed,
            }),
        rounds: 1,
    },
];

async function runQuality(
    requestedRounds,
) {
    const server =
        await startServer({
            port: 11541,
            numParallel: 3,
            maxLoadedModels: 2,
        });
    const results = [];
    const filter =
        String(
            process.env
                .BENCHMARK_FILTER ||
            '',
        );
    const configurations =
        filter
            ? QUALITY_CONFIGS
                .filter(config =>
                    config.id
                        .includes(
                            filter,
                        ))
            : QUALITY_CONFIGS;
    try {
        for (
            const config of
            configurations
        ) {
            const rounds =
                Math.max(
                    1,
                    Math.min(
                        requestedRounds,
                        config.rounds,
                    ),
                );
            process.stdout.write(
                `quality ${config.id}, rounds=${rounds}\n`,
            );
            const runs = [];
            for (
                let round = 0;
                round < rounds;
                round++
            ) {
                for (
                    const testCase of
                    CASES
                ) {
                    process.stdout.write(
                        `  ${testCase.id} r${round + 1}\n`,
                    );
                    const result =
                        await config.run(
                            server,
                            testCase.input,
                            42 + round,
                        );
                    const output =
                        normalizeOutput(
                            result,
                        );
                    const acceptedOutput =
                        applyDeterministicGuards(
                            testCase,
                            output,
                        );
                    const scoreOptions = {
                        ignorePostRouting:
                            config.id
                                .startsWith(
                                    'two_stage_',
                                ),
                    };
                    runs.push({
                        caseId:
                            testCase.id,
                        round,
                        wallMs:
                            result.wallMs,
                        calls:
                            result.calls,
                        parseErrors:
                            result
                                .parseErrors,
                        rawScore:
                            scoreOutput(
                                testCase,
                                output,
                                scoreOptions,
                            ),
                        acceptedOutput,
                        score:
                            scoreOutput(
                                testCase,
                                acceptedOutput,
                                scoreOptions,
                            ),
                        output,
                    });
                }
            }
            results.push({
                id: config.id,
                rounds,
                runs,
            });
        }
    } finally {
        await stopServer(server);
    }
    return results;
}

function summarize(
    performanceResults,
    qualityResults,
) {
    const performance =
        (
            performanceResults ||
            []
        ).map(config => {
            const successful =
                config.runs.filter(
                    run =>
                        !run.error,
                );
            const average = field =>
                successful.length
                    ? successful.reduce(
                        (
                            total,
                            run,
                        ) =>
                            total +
                            Number(
                                run[field] ||
                                0,
                            ),
                        0,
                    ) /
                    successful.length
                    : null;
            return {
                id: config.id,
                successfulRuns:
                    successful.length,
                failedRuns:
                    config.runs.length -
                    successful.length,
                averageWallMs:
                    average('wallMs'),
                peakRssBytes:
                    Math.max(
                        0,
                        ...config.runs.map(
                            run =>
                                run.memory
                                    ?.peakRssBytes ||
                                0,
                        ),
                    ),
                peakModelBytes:
                    Math.max(
                        0,
                        ...config.runs.map(
                            run =>
                                run.memory
                                    ?.peakModelBytes ||
                                0,
                        ),
                    ),
                peakVramBytes:
                    Math.max(
                        0,
                        ...config.runs.map(
                            run =>
                                run.memory
                                    ?.peakVramBytes ||
                                0,
                        ),
                    ),
                peakLoadedModels:
                    Math.max(
                        0,
                        ...config.runs.map(
                            run =>
                                run.memory
                                    ?.peakLoadedModels ||
                                0,
                        ),
                    ),
                scoreRatio:
                    successful.length
                        ? successful.reduce(
                            (
                                total,
                                run,
                            ) =>
                                total +
                                (
                                    run.score
                                        ?.ratio ||
                                    0
                                ),
                            0,
                        ) /
                        successful.length
                        : null,
            };
        });
    const quality =
        (
            qualityResults ||
            []
        ).map(config => {
            const totalPassed =
                config.runs.reduce(
                    (
                        total,
                        run,
                    ) =>
                        total +
                        run.score
                            .passed,
                    0,
                );
            const totalChecks =
                config.runs.reduce(
                    (
                        total,
                        run,
                    ) =>
                        total +
                        run.score
                            .total,
                    0,
                );
            return {
                id: config.id,
                runCount:
                    config.runs
                        .length,
                passed:
                    totalPassed,
                checks:
                    totalChecks,
                scoreRatio:
                    totalChecks
                        ? totalPassed /
                            totalChecks
                        : 0,
                averageWallMs:
                    config.runs
                        .reduce(
                            (
                                total,
                                run,
                            ) =>
                                total +
                                run.wallMs,
                            0,
                        ) /
                    Math.max(
                        1,
                        config.runs
                            .length,
                    ),
                failuresByCase:
                    Object.fromEntries(
                        CASES.map(
                            testCase => [
                                testCase.id,
                                config.runs
                                    .filter(
                                        run =>
                                            run.caseId ===
                                            testCase.id,
                                    )
                                    .flatMap(
                                        run =>
                                            run
                                                .score
                                                .failures,
                                    ),
                            ],
                        ),
                    ),
            };
        });
    return {
        performance,
        quality,
    };
}

async function main() {
    const options =
        parseArguments();
    await mkdir(
        path.dirname(
            options.output,
        ),
        {
            recursive: true,
        },
    );
    let performanceResults =
        null;
    let qualityResults = null;
    if (
        [
            'all',
            'performance',
        ].includes(
            options.suite,
        )
    ) {
        performanceResults =
            await runPerformance(
                options.rounds,
            );
    }
    if (
        [
            'all',
            'quality',
        ].includes(
            options.suite,
        )
    ) {
        qualityResults =
            await runQuality(
                options.rounds,
            );
    }
    const output = {
        benchmarkVersion:
            BENCHMARK_VERSION,
        generatedAt:
            new Date()
                .toISOString(),
        machine: {
            model:
                'MacBook Pro Mac15,6',
            chip: 'Apple M3 Pro',
            memoryBytes:
                38_654_705_664,
            ollamaVersion:
                '0.32.6',
            models: {
                [MODEL_SMALL]: {
                    parameterCount:
                        2_031_739_904,
                    quantization:
                        'Q4_K_M',
                    diskBytes:
                        1_400_000_000,
                },
                [MODEL_LARGE]: {
                    parameterCount:
                        4_022_468_096,
                    quantization:
                        'Q4_K_M',
                    diskBytes:
                        2_500_000_000,
                },
            },
        },
        promptHashes: {
            post:
                hash(POST_SYSTEM),
            postCore:
                hash(
                    POST_CORE_SYSTEM,
                ),
            inventory:
                hash(
                    INVENTORY_SYSTEM,
                ),
            spell:
                hash(
                    SPELL_SYSTEM,
                ),
            identity:
                hash(
                    IDENTITY_SYSTEM,
                ),
            dynamicAll:
                hash(
                    dynamicFollowUpSystem([
                        'inventory',
                        'spell',
                        'identity',
                    ]),
                ),
            merged:
                hash(
                    MERGED_SYSTEM,
                ),
        },
        caseIds:
            CASES.map(item =>
                item.id),
        performanceResults,
        qualityResults,
        summary:
            summarize(
                performanceResults,
                qualityResults,
            ),
    };
    await writeFile(
        options.output,
        `${JSON.stringify(
            output,
            null,
            2,
        )}\n`,
        'utf8',
    );
    process.stdout.write(
        `${JSON.stringify(
            output.summary,
            null,
            2,
        )}\n`,
    );
}

await main();
