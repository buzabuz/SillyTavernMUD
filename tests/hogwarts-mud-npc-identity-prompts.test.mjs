/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildActorKnowledgeCapsules,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-knowledge.js';
import {
    actorContextVersion,
    actorDossierProjectionVersion,
    memoryReferenceVersion,
    normalizeActorCore,
    normalizeActorMemoryIndex,
    normalizeActorRuntime,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-schema.js';
import {
    normalizeMemorySynapse,
} from '../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-schema.js';
import {
    normalizeNpcIdentity,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js';
import {
    NPC_IDENTITY_PROMPT_BOUNDARY,
    buildNpcIdentityPromptProjection,
    projectNpcRuntimeActorsForPrompt,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-prompt-projection.js';
import {
    createDirectorWorkflows,
} from '../public/scripts/extensions/hogwarts-mud/workflows/directors.js';
import {
    createSceneTransitionWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
import {
    createMediumCalendarDirectorPrompt,
} from '../public/scripts/extensions/hogwarts-mud/workflows/medium-calendar-director.js';
import {
    createSocialMemoryWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/social-memory.js';
import {
    createTurnPerformanceWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';
import {
    buildSocialAudienceProjection,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-projection.js';
import {
    normalizeSocialGraph,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';

const IVY_ID = 'ivy_warrington';
const DRACO_ID = 'canon_draco_malfoy';
const CURRENT_CLOCK =
    '1991-09-02 · 12:00';
const FUTURE_CLOCK =
    '1992-09-01';

function createIdentity() {
    return normalizeNpcIdentity({
        gender: {
            code: 'female',
            label: 'female',
        },
        birth: {
            date: '1980-02-03',
            precision: 'exact',
        },
        education: [{
            schoolId: 'hogwarts',
            houseId: 'slytherin',
            entryYear: 1991,
            exitYear: 1998,
            status: 'enrolled',
        }],
        lineage: {
            status: 'half_blood',
            basis: 'authority-only',
        },
        body: {
            naturalHairColor: 'brown',
            hairColor: 'brown',
            eyeColor: 'violet-after-1992',
            form: {
                code: 'human',
                label: 'human',
                asOfClock: CURRENT_CLOCK,
            },
            asOfClock: CURRENT_CLOCK,
        },
        provenance: {
            registryVersion: 1,
            generatedBy: 'test_registry',
            records: [{
                fieldPath: 'body.eyeColor',
                sourceTier: 'canon_book',
                sourceRef: 'test:future-eye',
                effectiveFrom:
                    FUTURE_CLOCK,
                effectiveTo: '',
            }],
        },
    });
}

function createWorldState() {
    const identity = createIdentity();
    return {
        actorContextVersion,
        memoryReferenceVersion,
        actorDossierProjectionVersion,
        phase: 'playing',
        clock: CURRENT_CLOCK,
        turn: {
            count: 4,
        },
        scene: {
            id: 'charms_class',
            nameEn: 'Charms Classroom',
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
            timelineEntries: [],
        },
        map: {
            activeMapId: 'hogwarts_castle',
            currentLocalNodeId:
                'charms_classroom',
            roomStates: {},
        },
        location: 'Charms Classroom',
        actors: [normalizeActorRuntime({
            id: IVY_ID,
            currentGoalEn:
                'Win the lesson.',
            currentIntentEn:
                'Answer first.',
            currentActivityEn:
                'Holding her wand ready.',
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
            present: true,
            lifeStatus: 'alive',
        }), normalizeActorRuntime({
            id: DRACO_ID,
            currentActivityEn:
                'Elsewhere.',
            mapId: 'hogwarts_castle',
            roomId: 'slytherin_common_room',
            present: false,
            lifeStatus: 'alive',
        })],
        actorLibrary: [normalizeActorCore({
            id: IVY_ID,
            canonCatalogId: IVY_ID,
            nameEn: 'Ivy Warrington',
            aliases: ['Ivy'],
            roleEn: 'Student',
            publicProfile: {
                descriptionEn:
                    'A brown-haired student.',
                backgroundEn:
                    'A first-year student.',
            },
            performanceCore: {
                temperamentEn:
                    'Competitive.',
                speechStyleEn:
                    'Clipped.',
                motivesEn: [
                    'Succeed in class.',
                ],
                socialStrategiesEn: [],
                boundariesEn: [],
                vulnerabilitiesEn: [
                    'Failure.',
                ],
            },
            identity,
            privateFacts: {
                secretEn:
                    'A private secret.',
                knowledgeEn: [
                    'Ivy knows the classroom rules.',
                ],
            },
        }), normalizeActorCore({
            id: DRACO_ID,
            canonCatalogId: DRACO_ID,
            nameEn: 'Draco Malfoy',
            aliases: ['Draco'],
            roleEn: 'Student',
            publicProfile: {
                descriptionEn:
                    'A pale student.',
                backgroundEn:
                    'A first-year student.',
            },
            performanceCore: {
                temperamentEn: 'Proud.',
                speechStyleEn: 'Drawling.',
                motivesEn: [],
                socialStrategiesEn: [],
                boundariesEn: [],
                vulnerabilitiesEn: [],
            },
            identity:
                normalizeNpcIdentity(),
            privateFacts: {
                secretEn: '',
                knowledgeEn: [],
            },
        })],
        actorMemoryIndex:
            normalizeActorMemoryIndex({
                byActorId: {
                    [IVY_ID]: {
                        firstImpressionRef:
                            '',
                        core: [],
                        recent: [],
                        everyday: [],
                    },
                    [DRACO_ID]: {
                        firstImpressionRef:
                            '',
                        core: [],
                        recent: [],
                        everyday: [],
                    },
                },
            }),
        memorySynapse:
            normalizeMemorySynapse(),
        actorPresentations: {},
        items: [],
        storyArcs: [],
        clues: [],
        timeline: [],
        sceneArchive: [],
        causalCollapse: {
            records: [],
        },
        dailyDirector: {
            plan: {
                actorDirectives: [],
            },
        },
        socialGraph:
            normalizeSocialGraph({
                identityClaims: [{
                    id:
                        'ivy_self_lineage',
                    subjectId: IVY_ID,
                    fieldPath:
                        'lineage.status',
                    value: 'pure_blood',
                    sourceKind: 'self',
                    speakerId: IVY_ID,
                    sourceMessageIds: [7],
                    witnessedBy: [
                        'player',
                        IVY_ID,
                    ],
                    clock:
                        CURRENT_CLOCK,
                }, {
                    id:
                        'draco_hidden_lineage',
                    subjectId: IVY_ID,
                    fieldPath:
                        'lineage.status',
                    value: 'muggle_born',
                    sourceKind: 'other',
                    speakerId: DRACO_ID,
                    sourceMessageIds: [8],
                    witnessedBy: [
                        DRACO_ID,
                    ],
                    clock:
                        CURRENT_CLOCK,
                }, {
                    id:
                        'ivy_future_claim',
                    subjectId: IVY_ID,
                    fieldPath:
                        'body.eyeColor',
                    value:
                        'future-claim',
                    sourceKind: 'self',
                    speakerId: IVY_ID,
                    sourceMessageIds: [9],
                    witnessedBy: [
                        'player',
                        IVY_ID,
                    ],
                    clock:
                        '1992-09-02 · 12:00',
                }],
                personReferences: [{
                    id:
                        'ivy_brother_ref',
                    label:
                        'Ivy\'s brother',
                    status:
                        'nonexistent',
                    actorId: '',
                }],
                relationshipClaims: [{
                    id:
                        'ivy_brother_claim',
                    subjectId: IVY_ID,
                    relationshipKind:
                        'brother',
                    targetRefId:
                        'ivy_brother_ref',
                    sourceKind: 'self',
                    speakerId: IVY_ID,
                    sourceMessageIds: [7],
                    witnessedBy: [
                        'player',
                        IVY_ID,
                    ],
                    clock:
                        CURRENT_CLOCK,
                }],
            }),
    };
}

function createContextPlan() {
    return {
        mode: 'rich',
        label: 'rich',
        inputBudget: 100000,
        ragLimit: 8,
        recentMessageLimit: 12,
        chapterMessageLimit: 24,
        memoryLimits: {},
    };
}

function createDirectorHarness(state) {
    return createDirectorWorkflows({
        CANON_CAST_IDENTITY_CONTRACT: '',
        CONTEXT_SIZE_PRESETS: {
            rich: 100000,
        },
        DEFAULT_MODEL_SLOTS: {
            medium: {
                maxResponseLength: 4000,
            },
        },
        NPC_IDENTITY_PROMPT_BOUNDARY,
        buildActorSelectionPolicy:
            () => ({
                metActorIds: [
                    DRACO_ID,
                ],
                explicitActorIds: [],
                pursuedActorIds: [],
                explicitCanonCandidates: [],
                stageQuota: {
                    genericFamiliarRecallBudget:
                        1,
                },
            }),
        buildMapAuthorityContext:
            () => ({}),
        buildNpcIdentityPromptProjection,
        createContextBudgetPlan:
            createContextPlan,
        formatRetrievedKnowledge:
            () => '',
        getContext: () => ({
            chat: [],
        }),
        getMudState: () => state,
        getWorldDate:
            () => '1991-09-02',
        normalizeActorMemoryProfile:
            actor => ({
                ...actor,
                impressionOfPlayerEn:
                    '',
                sharedMemories: {},
                knowledgeEn:
                    actor.knowledgeEn ||
                    [],
            }),
        selectSharedMemoriesForContext:
            () => ({}),
        projectNpcRuntimeActorsForPrompt,
    });
}

const MEDIUM_INACCESSIBLE_FIELDS =
    new Set([
        'privateGoal',
        'privateGoalEn',
        'secret',
        'secretEn',
        'storyArcs',
        'hiddenStoryArcs',
        'activeStoryArcs',
        'lockedClue',
        'lockedClues',
        'lockedFacts',
    ]);

function findInaccessibleFieldPaths(
    value,
    path = '$',
) {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return [];
    }
    if (Array.isArray(value)) {
        return value.flatMap(
            (
                child,
                index,
            ) =>
                findInaccessibleFieldPaths(
                    child,
                    `${path}[${index}]`,
                ),
        );
    }
    return Object.entries(value)
        .flatMap(([
            key,
            child,
        ]) => [
            ...(
                MEDIUM_INACCESSIBLE_FIELDS
                    .has(key)
                    ? [`${path}.${key}`]
                    : []
            ),
            ...findInaccessibleFieldPaths(
                child,
                `${path}.${key}`,
            ),
        ]);
}

function assertMediumPromptIsProjected(
    label,
    payload,
    sentinels,
) {
    const leaks =
        findMediumPromptLeaks(
            label,
            payload,
            sentinels,
        );
    assert.deepEqual(
        leaks,
        [],
        `${label} serialized medium-inaccessible authority`,
    );
}

function findMediumPromptLeaks(
    label,
    payload,
    sentinels,
) {
    const serialized =
        JSON.stringify(payload);
    return [
        ...findInaccessibleFieldPaths(
            payload,
        ).map(path =>
            `${label}:field:${path}`),
        ...sentinels
            .filter(sentinel =>
                serialized.includes(
                    sentinel,
                ))
            .map(sentinel =>
                `${label}:value:${sentinel}`),
    ];
}

function createTierProjectionState() {
    const state =
        createWorldState();
    state.timelineEpoch =
        'tier_projection_epoch';
    state.stateRevision = 17;
    state.actorLibrary[0]
        .privateFacts = {
        ...state.actorLibrary[0]
            .privateFacts,
        secretEn:
            'MEDIUM_ACTOR_SECRET',
        knowledgeEn: [
            'MEDIUM_PRIVATE_GOAL',
        ],
    };
    state.actors[0]
        .privateGoalEn =
        'MEDIUM_RUNTIME_PRIVATE_GOAL';
    state.actors[0]
        .secretEn =
        'MEDIUM_RUNTIME_SECRET';
    state.storyArcs = [{
        id: 'hidden_arc',
        status: 'active',
        hiddenFactEn:
            'MEDIUM_HIDDEN_STORY_ARC',
    }];
    state.clues = [{
        id: 'locked_clue',
        discovered: false,
        hiddenFactEn:
            'MEDIUM_LOCKED_CLUE',
    }, {
        id: 'public_clue',
        discovered: true,
        playerFacingDiscoveryEn:
            'PUBLIC_DISCOVERED_CLUE',
    }];
    state.calendar = {
        version: 2,
        horizon:
            '1991-09-10 · 12:00',
        storylines: [],
        storyBeats: [],
        entries: [],
    };
    state.memorySynapse = {
        version: 1,
        appraisals: [{
            id: 'appraisal_private_field_probe',
            observerId: IVY_ID,
            targetId: 'player',
            privateGoalEn:
                'MEDIUM_APPRAISAL_PRIVATE_GOAL',
        }],
        personSchemas: [],
    };
    return state;
}

function createTierProjectionTransitionWorkflow(
    state,
) {
    const directors =
        createDirectorHarness(state);
    return createSceneTransitionWorkflow({
        CANON_CAST_IDENTITY_CONTRACT: '',
        CANON_WIT_TONE_CONTRACT: '',
        NPC_IDENTITY_PROMPT_BOUNDARY,
        buildActorContinuityCapsules:
            () => [],
        buildBehavioralEnvironment:
            () => ({}),
        buildMapAuthorityContext:
            () => ({}),
        buildSceneCastRotationPolicy:
            () => ({}),
        createContextBudgetPlan:
            createContextPlan,
        formatRetrievedKnowledge:
            records =>
                JSON.stringify(
                    records,
                ),
        getContext: () => ({
            chat: [],
        }),
        projectActorLibraryForContext:
            directors
                .projectActorLibraryForContext,
        projectNpcRuntimeActorsForPrompt,
        synchronizeHeldItemLocations:
            items => items,
    });
}

function createTurnPrompt(state) {
    const workflow =
        createTurnPerformanceWorkflow({
            CANON_CAST_IDENTITY_CONTRACT:
                '',
            CANON_WIT_TONE_CONTRACT: '',
            CONTEXT_SIZE_PRESETS: {
                rich: 100000,
            },
            DEFAULT_MODEL_SLOTS: {
                low: {
                    maxResponseLength:
                        4000,
                },
            },
            NPC_IDENTITY_PROMPT_BOUNDARY,
            buildActorContinuityCapsules:
                () => [],
            buildActorKnowledgeCapsules,
            buildBehavioralEnvironment:
                () => ({}),
            buildCurrentMaterialState:
                () => ({}),
            buildNpcIdentityPromptProjection,
            buildSpatialContext:
                () => ({}),
            buildStructuredPlayerTurnSequence:
                () => [],
            buildTemporaryActorPromotionPolicy:
                () => ({}),
            createContextBudgetPlan:
                createContextPlan,
            formatRetrievedKnowledge:
                () => '',
            getActiveAddressingState:
                value => value,
            getAuthoritativeSceneSpells:
                () => [],
            parseItemOperationDirectives:
                () => ({
                    directives: [],
                    errors: [],
                }),
            projectNpcRuntimeActorsForPrompt,
            removeExplicitAddressDirective:
                value => value,
            resolvePlayerAddressing:
                () => ({
                    valid: true,
                    actorIds: [IVY_ID],
                }),
        });
    return workflow.createScenePerformancePrompt(
        state,
        'Ask Ivy about her family.',
        {
            elapsedMinutes: 15,
            minimumWords: 240,
            maximumWords: 560,
        },
        [],
        null,
        null,
        null,
        {
            valid: true,
            actorIds: [IVY_ID],
        },
        [],
        createContextPlan(),
    );
}

test('[defect-probing] actor Identity knowledge obeys observer and clock boundaries', () => {
    const state = createWorldState();
    const [capsule] =
        buildActorKnowledgeCapsules(
            state,
            [IVY_ID],
            createContextPlan(),
        );

    assert.equal(
        capsule.identityProjection
            .authority.lineage.status,
        'half_blood',
    );
    assert.equal(
        capsule.identityProjection
            .authority.body.eyeColor,
        'unknown',
    );
    assert.deepEqual(
        capsule.identityProjection
            .claims.identityClaims
            .map(claim => claim.id),
        ['ivy_self_lineage'],
    );
    assert.equal(
        Object.hasOwn(
            capsule.identityProjection,
            'currentGoalEn',
        ),
        false,
    );
});

test('[defect-probing] prompt authority projects year-only Birth without age or legacy range fields', () => {
    const state = createWorldState();
    state.actorLibrary[0]
        .identity.birth = {
            date: '',
            year: 1980,
            precision: 'year',
            earliest: '1980-01-01',
            latest: '1980-12-31',
        };
    const projection =
        buildNpcIdentityPromptProjection(
            state,
            IVY_ID,
            IVY_ID,
        );

    assert.deepEqual(
        projection.authority.birth,
        {
            date: '',
            year: 1980,
            precision: 'year',
        },
    );
    assert.deepEqual(
        projection.authority
            .derived.age,
        {
            years: null,
            minimumYears: null,
            maximumYears: null,
            precision: 'unknown',
        },
    );
    assert.doesNotMatch(
        JSON.stringify(
            projection.authority,
        ),
        /range|earliest|latest/u,
    );
});

test('[defect-probing] ordinary-turn prompt uses ActorCore English authority without raw Identity claims', () => {
    const state = createWorldState();
    const prompt =
        createTurnPrompt(state);
    const systemPrompt =
        prompt[0].content;
    const payload =
        JSON.parse(
            prompt[1].content,
        );
    const actorCard =
        payload.actorCards[0];

    assert.equal(
        actorCard.actorId,
        IVY_ID,
    );
    assert.equal(
        actorCard.nameEn,
        'Ivy Warrington',
    );
    assert.equal(
        actorCard.roleEn,
        'Student',
    );
    assert.equal(
        Object.hasOwn(
            actorCard,
            'identity',
        ),
        false,
    );
    assert.doesNotMatch(
        JSON.stringify(payload),
        /ivy_self_lineage|ivy_brother_ref|half_blood|future-claim/u,
    );
    assert.match(
        systemPrompt,
        /cannot write authority Identity/iu,
    );
});

test('[defect-probing] Daily and Pacing Director prompts never serialize raw runtime Identity', () => {
    const state = createWorldState();
    const directors =
        createDirectorHarness(state);
    const dailyPayload =
        JSON.parse(
            directors
                .createDailyDirectorPrompt(
                    state,
                    [],
                    createContextPlan(),
                )[1].content,
        );
    const pacingPayload =
        JSON.parse(
            directors
                .createPacingDirectorPrompt(
                    state,
                    {
                        reasons: [],
                    },
                    [],
                    createContextPlan(),
                )[1].content,
        );

    assert.equal(
        Object.hasOwn(
            dailyPayload
                .presentActors[0],
            'identity',
        ),
        false,
    );
    assert.equal(
        dailyPayload.actorLibrary[0]
            .identityProjection
            .authority.body.eyeColor,
        'unknown',
    );
    assert.equal(
        Object.hasOwn(
            pacingPayload
                .presentActors[0],
            'identity',
        ),
        false,
    );
    assert.equal(
        pacingPayload
            .knownAbsentActors[0]
            .identityProjection
            .authority,
        null,
    );
});

test('[defect-probing] Daily production prompt excludes private goals, secrets, locked clues, and hidden arcs', () => {
    const state =
        createTierProjectionState();
    const payload =
        JSON.parse(
            createDirectorHarness(
                state,
            )
                .createDailyDirectorPrompt(
                    state,
                    [],
                    createContextPlan(),
                )[1].content,
        );

    assertMediumPromptIsProjected(
        'Daily',
        payload,
        [
            'MEDIUM_PRIVATE_GOAL',
            'MEDIUM_ACTOR_SECRET',
            'MEDIUM_RUNTIME_PRIVATE_GOAL',
            'MEDIUM_RUNTIME_SECRET',
            'MEDIUM_HIDDEN_STORY_ARC',
            'MEDIUM_LOCKED_CLUE',
        ],
    );
    assert.deepEqual(
        payload.discoveredClues
            .map(clue =>
                clue.id),
        ['public_clue'],
    );
});

test('[defect-probing] Pacing production prompt excludes private goals, secrets, locked clues, and active arcs', () => {
    const state =
        createTierProjectionState();
    const payload =
        JSON.parse(
            createDirectorHarness(
                state,
            )
                .createPacingDirectorPrompt(
                    state,
                    {
                        reasons: [],
                    },
                    [],
                    createContextPlan(),
                )[1].content,
        );

    assertMediumPromptIsProjected(
        'Pacing',
        payload,
        [
            'MEDIUM_PRIVATE_GOAL',
            'MEDIUM_ACTOR_SECRET',
            'MEDIUM_RUNTIME_PRIVATE_GOAL',
            'MEDIUM_RUNTIME_SECRET',
            'MEDIUM_HIDDEN_STORY_ARC',
            'MEDIUM_LOCKED_CLUE',
        ],
    );
    assert.deepEqual(
        payload.discoveredClues
            .map(clue =>
                clue.id),
        ['public_clue'],
    );
});

test('[defect-probing] Calendar, Moment, Memory, and Transition production prompts share the medium projection', () => {
    const state =
        createTierProjectionState();
    const transitionWorkflow =
        createTierProjectionTransitionWorkflow(
            state,
        );
    const lockedKnowledge = [{
        recordId:
            'locked_knowledge_record',
        nodeType: 'clue',
        text:
            'MEDIUM_LOCKED_KNOWLEDGE',
        visibility: {
            scope: 'locked',
            actorIds: [],
        },
    }];
    const transitionPayload =
        JSON.parse(
            transitionWorkflow
                .createSceneTransitionPrompt(
                    state,
                    'medium',
                    '',
                    null,
                    {
                        changed: false,
                    },
                    lockedKnowledge,
                    createContextPlan(),
                )[1].content,
        );
    const momentPayload =
        JSON.parse(
            transitionWorkflow
                .createSceneTransitionPrompt(
                    state,
                    'medium',
                    '',
                    null,
                    {
                        changed: true,
                    },
                    lockedKnowledge,
                    createContextPlan(),
                    {
                        kind:
                            'calendar_moment',
                        fixedClock:
                            '1991-09-03 · 13:00',
                        targetEntry: {
                            id:
                                'calendar_probe',
                            secretEn:
                                'MEDIUM_MOMENT_SECRET',
                        },
                        calendarEntries: [],
                        calendarStorySources: [{
                            hiddenStoryArcs: [
                                'MEDIUM_MOMENT_HIDDEN_ARC',
                            ],
                        }],
                    },
                )[1].content,
        );
    const calendarPayload =
        JSON.parse(
            createMediumCalendarDirectorPrompt(
                state,
                {
                    trigger: {
                        reasons: ['manual'],
                    },
                    mapAuthority: {
                        privateGoalEn:
                            'MEDIUM_CALENDAR_PRIVATE_GOAL',
                        lockedClues: [{
                            id:
                                'calendar_locked_clue',
                            text:
                                'MEDIUM_CALENDAR_LOCKED_CLUE',
                        }],
                    },
                },
            )[1].content,
        );
    const memoryWorkflow =
        createSocialMemoryWorkflow({
            CONTEXT_SIZE_PRESETS: {
                rich: 100000,
            },
            DEFAULT_MODEL_SLOTS: {
                medium: {
                    maxResponseLength:
                        4000,
                },
            },
            buildSocialAudienceProjection,
            createContextBudgetPlan:
                createContextPlan,
            normalizeActorMemoryProfile:
                actor => ({
                    ...actor,
                    impressionOfPlayerEn:
                        '',
                    sharedMemories: {},
                }),
            normalizeSocialGraph,
            selectSharedMemoriesForContext:
                () => ({}),
        });
    const memoryPayload =
        JSON.parse(
            memoryWorkflow
                .createMemoryConsolidationPrompt(
                    state,
                    {
                        actors: [],
                    },
                    {
                        backfill: true,
                        messages: [],
                        allowedMessageIds: [],
                        eventKnowledge: [{
                            eventId:
                                'locked_memory_event',
                            sceneId:
                                state.scene.id,
                            summaryEn:
                                'MEDIUM_MEMORY_LOCKED_EVENT',
                            visibility: {
                                scope:
                                    'locked',
                            },
                            secretEn:
                                'MEDIUM_MEMORY_SECRET',
                        }],
                    },
                    createContextPlan(),
                )[1].content,
        );
    const cases = [
        [
            'Calendar',
            calendarPayload,
            [
                'MEDIUM_CALENDAR_PRIVATE_GOAL',
                'MEDIUM_CALENDAR_LOCKED_CLUE',
            ],
        ],
        [
            'Moment',
            momentPayload,
            [
                'MEDIUM_MOMENT_SECRET',
                'MEDIUM_MOMENT_HIDDEN_ARC',
                'MEDIUM_LOCKED_KNOWLEDGE',
            ],
        ],
        [
            'Memory',
            memoryPayload,
            [
                'MEDIUM_APPRAISAL_PRIVATE_GOAL',
                'MEDIUM_MEMORY_LOCKED_EVENT',
                'MEDIUM_MEMORY_SECRET',
            ],
        ],
        [
            'Transition',
            transitionPayload,
            [
                'MEDIUM_LOCKED_KNOWLEDGE',
            ],
        ],
    ];

    assert.deepEqual(
        cases.flatMap(([
            label,
            payload,
            sentinels,
        ]) =>
            findMediumPromptLeaks(
                label,
                payload,
                sentinels,
            )),
        [],
        'all medium production prompts must use the same authority projection',
    );
});

test('dedicated high Transition keeps authorized private facts, locked knowledge, and hidden arcs', () => {
    const state =
        createTierProjectionState();
    const payload =
        JSON.parse(
            createTierProjectionTransitionWorkflow(
                state,
            )
                .createSceneTransitionPrompt(
                    state,
                    'high',
                    '',
                    null,
                    {
                        changed: false,
                    },
                    [{
                        recordId:
                            'locked_high_record',
                        nodeType: 'clue',
                        text:
                            'HIGH_LOCKED_KNOWLEDGE',
                        visibility: {
                            scope:
                                'locked',
                            actorIds: [],
                        },
                    }],
                    createContextPlan(),
                )[1].content,
        );

    assert.equal(
        payload.actorLibrary[0]
            .privateFacts
            .secretEn,
        'MEDIUM_ACTOR_SECRET',
    );
    assert.deepEqual(
        payload.actorLibrary[0]
            .privateFacts
            .knowledgeEn,
        ['MEDIUM_PRIVATE_GOAL'],
    );
    assert.equal(
        payload.hiddenStoryArcs[0]
            .hiddenFactEn,
        'MEDIUM_HIDDEN_STORY_ARC',
    );
    assert.match(
        payload
            .historicalKnowledgeEvidence,
        /HIGH_LOCKED_KNOWLEDGE/u,
    );
});

test('[defect-probing] Scene Transition uses filtered Identity and keeps activity outside it', () => {
    const state = createWorldState();
    const directors =
        createDirectorHarness(state);
    const workflow =
        createSceneTransitionWorkflow({
            CANON_CAST_IDENTITY_CONTRACT:
                '',
            CANON_WIT_TONE_CONTRACT: '',
            NPC_IDENTITY_PROMPT_BOUNDARY,
            buildActorContinuityCapsules:
                () => [],
            buildBehavioralEnvironment:
                () => ({}),
            buildMapAuthorityContext:
                () => ({}),
            buildSceneCastRotationPolicy:
                () => ({}),
            createContextBudgetPlan:
                createContextPlan,
            formatRetrievedKnowledge:
                () => '',
            getContext: () => ({
                chat: [],
            }),
            projectActorLibraryForContext:
                directors
                    .projectActorLibraryForContext,
            projectNpcRuntimeActorsForPrompt,
            synchronizeHeldItemLocations:
                items => items,
        });
    const prompt =
        workflow.createSceneTransitionPrompt(
            state,
            'medium',
            '',
            null,
            {
                changed: false,
            },
            [],
            createContextPlan(),
        );
    const systemPrompt =
        prompt[0].content;
    const payload =
        JSON.parse(
            prompt[1].content,
        );

    assert.equal(
        Object.hasOwn(
            payload.currentActors[0],
            'identity',
        ),
        false,
    );
    assert.equal(
        payload.actorLibrary[0]
            .identityProjection
            .authority.body.eyeColor,
        'unknown',
    );
    assert.equal(
        payload.currentActors[0]
            .currentActivityEn,
        'Holding her wand ready.',
    );
    assert.doesNotMatch(
        JSON.stringify(
            payload.actorLibrary[0]
                .identityProjection,
        ),
        /Holding her wand ready|Win the lesson|anxious/u,
    );
    assert.match(
        systemPrompt,
        /person reference resolution/iu,
    );
});

test('Social Director keeps attributed statements as the only identity claim proposal channel', () => {
    const state = createWorldState();
    const workflow =
        createSocialMemoryWorkflow({
            CONTEXT_SIZE_PRESETS: {
                rich: 100000,
            },
            DEFAULT_MODEL_SLOTS: {
                medium: {
                    maxResponseLength:
                        4000,
                },
            },
            buildSocialAudienceProjection,
            createContextBudgetPlan:
                createContextPlan,
            normalizeActorMemoryProfile:
                actor => ({
                    ...actor,
                    impressionOfPlayerEn:
                        '',
                    sharedMemories: {},
                }),
            normalizeSocialGraph,
            selectSharedMemoriesForContext:
                () => ({}),
        });
    const prompt =
        workflow
            .createMemoryConsolidationPrompt(
                state,
                {
                    actors: [],
                },
                {
                    backfill: true,
                    messages: [],
                    allowedMessageIds: [],
                },
                createContextPlan(),
            );

    assert.match(
        prompt[0].content,
        /statements are evidence-grounded claim proposals/iu,
    );
    assert.match(
        prompt[0].content,
        /never write authority Identity, person reference resolution, or a formal family edge/iu,
    );
    assert.equal(
        Object.hasOwn(
            workflow
                .SOCIAL_DIRECTOR_RESPONSE_SCHEMA
                .value.properties,
            'identityClaims',
        ),
        false,
    );
});
