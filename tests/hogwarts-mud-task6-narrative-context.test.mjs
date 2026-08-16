/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
    limitMessagesToContext,
} from '../public/scripts/extensions/hogwarts-mud/core/context-budget.js';
import {
    buildNarrativeAuthoritySnapshot,
} from '../public/scripts/extensions/hogwarts-mud/domain/narrative-authority.js';
import {
    buildNarrativePromptContext,
} from '../public/scripts/extensions/hogwarts-mud/domain/narrative-prompt-context.js';
import {
    createSceneTransitionWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
import {
    createTurnPerformanceWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';

const TIMELINE_EPOCH =
    'task6_narrative_context';
const STATE_REVISION = 23;
const CLOCK = '1991-09-03 · 17:00';

function createState() {
    return {
        timelineEpoch:
            TIMELINE_EPOCH,
        stateRevision:
            STATE_REVISION,
        clock: CLOCK,
        chapter: 'A Test Chapter',
        location: 'Charms Classroom',
        character: {
            confirmed: true,
        },
        scene: {
            id: 'scene_charms',
            nameEn:
                'Charms Classroom',
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
            timelineEntries: [],
        },
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'charms_classroom',
            roomStates: {
                'hogwarts_castle:charms_classroom': {
                    visibleResiduesEn: [
                        'A snapped feather lies beside the lectern.',
                    ],
                },
            },
        },
        actors: [
            {
                id: 'hermione',
                nameEn:
                    'Hermione Granger',
                present: true,
                mapId:
                    'hogwarts_castle',
                roomId:
                    'charms_classroom',
                lifeStatus: 'alive',
                currentActivityEn:
                    'Closing her book.',
            },
            {
                id: 'ron',
                nameEn: 'Ron Weasley',
                present: true,
                mapId:
                    'hogwarts_castle',
                roomId:
                    'charms_classroom',
                lifeStatus: 'alive',
                currentActivityEn:
                    'Watching the door.',
            },
        ],
        actorLibrary: [
            {
                id: 'hermione',
                nameEn:
                    'Hermione Granger',
                roleEn: 'Student',
            },
            {
                id: 'ron',
                nameEn: 'Ron Weasley',
                roleEn: 'Student',
            },
        ],
        items: [{
            id: 'vanished_quill',
            type: 'tool',
            labelEn:
                'Vanished Quill',
            state: 'destroyed',
            physicalForm: 'absent',
            holderId: 'hermione',
            visibility: 'public',
        }],
        actorPresentations: {},
        clues: [],
        storyArcs: [],
    };
}

function createActorCapsule(
    actorId,
    eventId,
) {
    return {
        version: 1,
        scope: 'observer',
        observerId: actorId,
        expectations: [{
            schemaId:
                `schema_${actorId}`,
            labelEn:
                `${actorId} private label`,
            expectationEn:
                `${actorId} expects the player to refuse public help.`,
            confidence: 0.8,
            sourceIds: [
                `schema_${actorId}`,
            ],
        }],
        supportingEvents: [{
            recordId:
                `events_${eventId}`,
            text:
                `${actorId} witnessed ${eventId}.`,
            sceneId:
                `scene_${actorId}`,
            effectiveClock:
                '1991-09-02 · 16:00',
            sourceRefs: [{
                type: 'event',
                id: eventId,
            }],
        }],
        counterexample: {
            recordId:
                `events_${actorId}_counter`,
            text:
                `${actorId} witnessed a counterexample.`,
            sceneId:
                `scene_${actorId}_counter`,
            effectiveClock:
                '1991-09-02 · 17:00',
            sourceRefs: [{
                type: 'event',
                id:
                    `event_${actorId}_counter`,
            }],
        },
        sourceIds: [
            `schema_${actorId}`,
            eventId,
        ],
        confidence: 0.8,
        capsuleId:
            `activation_${actorId}`,
        sealed: true,
    };
}

function createActorKnowledgeRecords(
    actorId,
    eventId,
) {
    const appraisalId =
        `appraisal_${actorId}`;
    const schemaId =
        `schema_${actorId}`;
    const base = {
        version: 2,
        projectorVersion: 2,
        timelineEpoch:
            TIMELINE_EPOCH,
        stateRevision:
            STATE_REVISION,
        effectiveClock:
            '1991-09-02 · 16:00',
        sceneId:
            `scene_${actorId}`,
        tags: ['current'],
        visibility: {
            scope: 'actor',
            actorIds: [
                actorId,
            ],
        },
    };
    return [{
        ...base,
        recordId:
            `events_${eventId}`,
        id:
            `events_${eventId}`,
        category: 'events',
        nodeType: 'fact',
        title:
            `${actorId} support event`,
        text:
            `${actorId} witnessed ${eventId}.`,
        sourceRefs: [{
            type: 'event',
            id: eventId,
        }],
        data: {
            eventKnowledge: {
                eventId,
            },
        },
    }, {
        ...base,
        recordId:
            `appraisals_${actorId}`,
        id:
            `appraisals_${actorId}`,
        category: 'appraisals',
        nodeType: 'appraisal',
        title:
            `${actorId} appraisal`,
        text:
            `${actorId} interprets the event privately.`,
        sourceRefs: [{
            type: 'appraisal',
            id: appraisalId,
        }],
        data: {
            appraisal: {
                id: appraisalId,
                observerId:
                    actorId,
                targetId: 'player',
                sourceEventIds: [
                    eventId,
                ],
                confidence: 0.8,
            },
        },
    }, {
        ...base,
        recordId:
            `schemas_${actorId}`,
        id:
            `schemas_${actorId}`,
        category: 'schemas',
        nodeType: 'schema',
        title:
            `${actorId} schema`,
        text:
            `${actorId} expects a repeated pattern.`,
        sourceRefs: [{
            type: 'schema',
            id: schemaId,
        }],
        data: {
            schema: {
                id: schemaId,
                observerId:
                    actorId,
                targetId: 'player',
                labelEn:
                    `${actorId} private label`,
                expectationEn:
                    `${actorId} expects the player to refuse public help.`,
                confidence: 0.8,
                status: 'active',
                supportAppraisalIds: [
                    appraisalId,
                ],
                counterAppraisalIds: [],
            },
        },
    }];
}

function createRetrievalResult() {
    return {
        records: [
            {
                version: 2,
                recordId:
                    'events_old_quill_claim',
                id:
                    'events_old_quill_claim',
                category: 'events',
                nodeType: 'fact',
                title:
                    'Old quill claim',
                text:
                    'An earlier transcript claimed Hermione still held the vanished quill.',
                tags: ['superseded'],
                sourceRefs: [{
                    type: 'message',
                    id: '212',
                }],
                visibility: {
                    scope: 'public',
                    actorIds: [],
                },
            },
            ...createActorKnowledgeRecords(
                'hermione',
                'event_hermione_help',
            ),
            ...createActorKnowledgeRecords(
                'ron',
                'event_ron_help',
            ),
        ],
        activationCapsules: {
            version: 1,
            common: {
                version: 1,
                scope: 'common',
                observerId: '',
                facts: [],
                sourceIds: [],
                confidence: 0,
                capsuleId:
                    'activation_common',
                sealed: true,
            },
            byActorId: {
                hermione:
                    createActorCapsule(
                        'hermione',
                        'event_hermione_help',
                    ),
                ron:
                    createActorCapsule(
                        'ron',
                        'event_ron_help',
                    ),
            },
        },
    };
}

function createContextPlan() {
    return {
        mode: 'rich',
        label: 'rich',
        inputBudget: 108_000,
        ragLimit: 10,
        chapterMessageLimit: 20,
        memoryLimits: {},
    };
}

function formatRetrievedKnowledgeFixture() {
    return '[HISTORICAL_EVIDENCE status=superseded recordId=events_old_quill_claim sourceRefs=message:212]';
}

function createTurnWorkflow() {
    return createTurnPerformanceWorkflow({
        CANON_CAST_IDENTITY_CONTRACT:
            '',
        CANON_WIT_TONE_CONTRACT: '',
        CONTEXT_SIZE_PRESETS: {
            rich: 120_000,
        },
        DEFAULT_MODEL_SLOTS: {
            low: {
                maxResponseLength:
                    12_000,
            },
        },
        buildActorContinuityCapsules:
            () => [],
        buildActorKnowledgeCapsules:
            () => [{
                actorId: 'hermione',
                sealed: true,
                knowledgeEn: [
                    'Hermione-only knowledge.',
                ],
            }],
        buildBehavioralEnvironment:
            () => ({}),
        buildCurrentMaterialState:
            () => ({}),
        buildSpatialContext:
            () => ({}),
        buildStructuredPlayerTurnSequence:
            () => [],
        buildTemporaryActorPromotionPolicy:
            () => ({}),
        createContextBudgetPlan:
            createContextPlan,
        formatRetrievedKnowledge:
            formatRetrievedKnowledgeFixture,
        getActiveAddressingState:
            () => ({}),
        getAuthoritativeSceneSpells:
            () => [],
        parseItemOperationDirectives:
            () => ({
                directives: [{
                    operation: 'carry',
                    itemId:
                        'vanished_quill',
                }],
                errors: [],
            }),
        removeExplicitAddressDirective:
            value => value,
        resolvePlayerAddressing:
            () => ({
                valid: true,
                actorIds: [
                    'hermione',
                ],
            }),
    });
}

function createTransitionWorkflow({
    openingPrompts = [],
} = {}) {
    return createSceneTransitionWorkflow({
        CANON_CAST_IDENTITY_CONTRACT:
            '',
        CANON_WIT_TONE_CONTRACT: '',
        CONTEXT_SIZE_PRESETS: {
            rich: 120_000,
        },
        DEFAULT_MODEL_SLOTS: {
            medium: {
                maxResponseLength:
                    12_000,
            },
        },
        buildActorContinuityCapsules:
            (_state, actorIds) =>
                actorIds.map(actorId => ({
                    actorId,
                    sealed: true,
                })),
        buildBehavioralEnvironment:
            () => ({}),
        buildCurrentMaterialState:
            () => ({}),
        buildMapAuthorityContext:
            () => ({}),
        buildSceneCastRotationPolicy:
            () => ({}),
        createContextBudgetPlan:
            createContextPlan,
        extractRoleResponseText:
            response =>
                response.content,
        formatRetrievedKnowledge:
            formatRetrievedKnowledgeFixture,
        getContext:
            () => ({
                chat: [],
            }),
        getSceneDestinationAuthority:
            (_state, destination) => ({
                ...destination,
                roomNameEn:
                    'Library',
            }),
        parseJsonObject:
            value =>
                JSON.parse(value),
        projectActorLibraryForContext:
            actorLibrary =>
                actorLibrary,
        projectNpcRuntimeActorsForPrompt:
            state =>
                state.actors,
        sendSceneOpeningRequest:
            async (_slot, prompt) => {
                openingPrompts.push(prompt);
                return {
                    content:
                        JSON.stringify({
                            segments: [
                                {
                                    type:
                                        'narration',
                                    textEn:
                                        'The Library settles into view.',
                                },
                                {
                                    type:
                                        'narration',
                                    textEn:
                                        'Rain taps softly against the tall windows.',
                                },
                            ],
                        }),
                };
            },
        stripSyntheticSceneOpeningActorSegments:
            segments =>
                segments,
        synchronizeHeldItemLocations:
            items =>
                items,
        validateSceneTransitionPackage:
            () => ({
                valid: true,
                errors: [],
            }),
    });
}

test('[defect-probing] narrative context preserves supplied sealed capsules after record filtering', () => {
    const retrieval = [];
    retrieval.activationCapsules =
        createRetrievalResult()
            .activationCapsules;
    const context =
        buildNarrativePromptContext(
            createState(),
            retrieval,
            {
                actorIds: [
                    'hermione',
                ],
            },
        );

    assert.equal(
        context
            .memoryActivationCapsules
            .byActorId
            .hermione
            .capsuleId,
        'activation_hermione',
    );
    assert.equal(
        context
            .memoryActivationCapsules
            .byActorId
            .hermione
            .supportingEvents[0]
            .sourceRefs[0].id,
        'event_hermione_help',
    );
});

test('[defect-probing] ordinary Performer receives one authority snapshot and actor-sealed memory capsules', () => {
    const state = createState();
    state.actors.push({
        id: 'mcgonagall',
        nameEn:
            'Minerva McGonagall',
        present: false,
        mapId:
            'hogwarts_castle',
        roomId:
            'transfiguration_classroom',
    });
    const retrieval =
        createRetrievalResult();
    const prompt =
        createTurnWorkflow()
            .createScenePerformancePrompt(
                state,
                'Ask Hermione for help.',
                {
                    elapsedMinutes: 15,
                    minimumWords: 240,
                    maximumWords: 560,
                },
                retrieval,
                null,
                null,
                null,
                {
                    valid: true,
                    actorIds: [
                        'hermione',
                    ],
                },
                [],
                createContextPlan(),
            );
    const payload =
        JSON.parse(
            prompt[1].content,
        );
    const systemContract =
        prompt[0].content;

    assert.deepEqual(
        Object.keys(payload),
        [
            'playerTurn',
            'sceneFacts',
            'actorCards',
            'actionOpportunities',
            'memoryActivations',
            'prohibitions',
        ],
    );
    for (const field of [
        'playerTurn',
        'sceneFacts',
        'actorCards',
        'actionOpportunities',
        'memoryActivations',
        'prohibitions',
    ]) {
        assert.match(
            systemContract,
            new RegExp(
                `\\b${field}\\b`,
                'u',
            ),
        );
    }
    assert.doesNotMatch(
        systemContract,
        /\b(?:playerTurnSequence|addressing|actorKnowledge|actorContinuityCapsules|actorProfiles|presentActors|memoryActivationCapsules|historicalKnowledgeEvidence)\b/u,
    );
    const expectedAuthoritySnapshot =
        buildNarrativeAuthoritySnapshot(
            state,
        );
    delete expectedAuthoritySnapshot
        .currentActors;
    assert.deepEqual(
        payload.sceneFacts
            .authoritySnapshot,
        expectedAuthoritySnapshot,
    );
    assert.deepEqual(
        Object.keys(
            payload
                .memoryActivations
                .byActorId,
        ),
        [
            'hermione',
            'ron',
        ],
    );
    assert.equal(
        payload
            .memoryActivations
            .byActorId
            .hermione
            .supportingEvents[0]
            .sourceRefs[0].id,
        'event_hermione_help',
    );
    assert.equal(
        payload
            .memoryActivations
            .byActorId.ron
            .sourceIds
            .includes(
                'event_hermione_help',
            ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            payload,
            'addressedActorKnowledge',
        ),
        false,
    );
    assert.deepEqual(
        payload.actorCards.map(card =>
            card.actorId),
        [
            'hermione',
            'ron',
        ],
    );
    assert.equal(
        Object.hasOwn(
            payload,
            'historicalKnowledgeEvidence',
        ),
        false,
    );
});

test('[defect-probing] low-tier Prompt contract uses Schema for behavior and Event for details without crossing actors', () => {
    const prompt =
        createTurnWorkflow()
            .createScenePerformancePrompt(
                createState(),
                'Continue.',
                {
                    elapsedMinutes: 15,
                    minimumWords: 240,
                    maximumWords: 560,
                },
                createRetrievalResult(),
                null,
                null,
                null,
                {
                    valid: true,
                    actorIds: [
                        'hermione',
                    ],
                },
                [],
                createContextPlan(),
            )[0].content;

    assert.match(
        prompt,
        /expectationEn.*(?:shape|drive).*behavior/isu,
    );
    assert.match(
        prompt,
        /concrete prior (?:time|place|action|quotation).*supporting Event/isu,
    );
    assert.match(
        prompt,
        /never.*(?:another actor|cross actor).*capsule/isu,
    );
    assert.match(
        prompt,
        /authoritySnapshot.*(?:binding|highest precedence)/isu,
    );
});

test('[defect-probing] medium Transition and low Opening use the shared snapshot and present-actor capsules', async () => {
    const state = createState();
    const retrieval =
        createRetrievalResult();
    const workflow =
        createTransitionWorkflow();
    const transitionPrompt =
        workflow
            .createSceneTransitionPrompt(
                state,
                'medium',
                '',
                null,
                {
                    changed: false,
                },
                retrieval,
                createContextPlan(),
            );
    const transitionPayload =
        JSON.parse(
            transitionPrompt[1]
                .content,
        );

    const expectedAuthoritySnapshot =
        buildNarrativeAuthoritySnapshot(
            state,
        );
    delete expectedAuthoritySnapshot
        .currentActors;
    assert.deepEqual(
        transitionPayload
            .authoritySnapshot,
        expectedAuthoritySnapshot,
    );
    assert.deepEqual(
        Object.keys(
            transitionPayload
                .memoryActivationCapsules
                .byActorId,
        ),
        [
            'hermione',
            'ron',
        ],
    );

    const openingPrompts = [];
    const openingWorkflow =
        createTransitionWorkflow({
            openingPrompts,
        });
    await openingWorkflow
        .generateSceneTransitionOpening(
            {},
            state,
            {
                nextClock:
                    '1991-09-03 · 17:15',
                nextScene: {
                    id: 'scene_library',
                    nameEn: 'Library',
                    summaryEn:
                        'The Library waits.',
                    mapId:
                        'hogwarts_castle',
                    roomId: 'library',
                    actorStates: [{
                        id: 'hermione',
                        present: true,
                        mapId:
                            'hogwarts_castle',
                        roomId:
                            'library',
                        currentActivityEn:
                            'Sorting notes.',
                        currentIntentEn:
                            'Finish the index.',
                    }],
                },
            },
            {
                mapId:
                    'hogwarts_castle',
                roomId: 'library',
            },
            createContextPlan(),
            {},
            retrieval,
        );
    const openingPayload =
        JSON.parse(
            openingPrompts[0][1]
                .content,
        );
    const openingContract =
        openingPrompts[0][0]
            .content;

    assert.equal(
        openingPayload
            .authoritySnapshot
            .sceneId,
        'scene_library',
    );
    assert.deepEqual(
        Object.keys(
            openingPayload
                .memoryActivationCapsules
                .byActorId,
        ),
        ['hermione'],
    );
    assert.equal(
        openingPayload
            .memoryActivationCapsules
            .byActorId.ron,
        undefined,
    );
    assert.match(
        openingContract,
        /only already committed Actor\/Scene observable state.*safe opening prose/isu,
    );
    assert.match(
        openingContract,
        /promise.*secret.*hidden truth.*relationship.*Item transfer/isu,
    );
});

test('[defect-probing] raw retrieval is attributed historical evidence and marks superseded records', async () => {
    const source =
        await readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/knowledge.js',
                import.meta.url,
            ),
            'utf8',
        );
    assert.match(
        source,
        /HISTORICAL_EVIDENCE/u,
    );
    assert.match(
        source,
        /status=superseded/u,
    );
    assert.match(
        source,
        /sourceRefs/u,
    );
    assert.match(
        source,
        /recordId/u,
    );
});

test('[defect-probing] context overflow trims historical retrieval before protected narrative authority', () => {
    const authoritySnapshot = {
        version: 1,
        timelineEpoch:
            TIMELINE_EPOCH,
        stateRevision:
            STATE_REVISION,
        currentItems: [{
            id: 'vanished_quill',
            physicalForm: 'absent',
        }],
    };
    const itemDirectives = [{
        operation: 'carry',
        itemId: 'vanished_quill',
    }];
    const actorKnowledge = [{
        actorId: 'hermione',
        sealed: true,
    }];
    const memoryActivationCapsules =
        createRetrievalResult()
            .activationCapsules;
    const limited =
        limitMessagesToContext(
            [{
                role: 'system',
                content:
                    'Keep narrative authority.',
            }, {
                role: 'user',
                content:
                    JSON.stringify({
                        playerAction:
                            'Try to pick up the quill.',
                        authoritySnapshot,
                        itemDirectives,
                        actorKnowledge,
                        memoryActivationCapsules,
                        historicalKnowledgeEvidence:
                            'obsolete transcript '.repeat(
                                30_000,
                            ),
                    }),
            }],
            32_768,
            18_576,
        );
    const payload =
        JSON.parse(
            limited[1].content,
        );

    assert.deepEqual(
        payload.authoritySnapshot,
        authoritySnapshot,
    );
    assert.deepEqual(
        payload.itemDirectives,
        itemDirectives,
    );
    assert.deepEqual(
        payload.actorKnowledge,
        actorKnowledge,
    );
    assert.deepEqual(
        payload
            .memoryActivationCapsules,
        memoryActivationCapsules,
    );
    assert.equal(
        payload
            .historicalKnowledgeEvidence,
        undefined,
    );
});

test('[defect-probing] context overflow preserves the complete system contract and removes duplicate actor context', () => {
    const systemContract =
        `SYSTEM_CONTRACT ${'s'.repeat(5_000)}`;
    const actorKnowledge = [{
        actorId: 'hermione',
        evidence:
            'knowledge '.repeat(
                1_400,
            ),
    }];
    const limited =
        limitMessagesToContext(
            [{
                role: 'system',
                content:
                    systemContract,
            }, {
                role: 'user',
                content:
                    JSON.stringify({
                        playerAction:
                            'Continue the scene.',
                        actorKnowledge,
                        addressedActorKnowledge:
                            actorKnowledge,
                        currentMaterialState: {
                            evidence:
                                'material '.repeat(
                                    700,
                                ),
                        },
                        currentRoomState: {
                            evidence:
                                'room '.repeat(
                                    700,
                                ),
                        },
                    }),
            }],
            32_768,
            18_576,
        );
    const payload =
        JSON.parse(
            limited[1].content,
        );
    const totalCharacters =
        limited.reduce(
            (sum, message) =>
                sum +
                message.content.length,
            0,
        );

    assert.equal(
        limited[0].content,
        systemContract,
    );
    assert.ok(
        totalCharacters <=
            24_576,
    );
    assert.deepEqual(
        payload.actorKnowledge,
        actorKnowledge,
    );
    assert.equal(
        payload
            .addressedActorKnowledge,
        undefined,
    );
    assert.ok(
        payload.contextOmittedFields
            .includes(
                'addressedActorKnowledge',
            ),
    );
});

test('[defect-probing] extreme Performer repair trimming preserves action, conflict, authority, capsules, and segment provenance', () => {
    const authoritySnapshot = {
        version: 1,
        timelineEpoch:
            TIMELINE_EPOCH,
        stateRevision:
            STATE_REVISION,
    };
    const memoryActivationCapsules =
        createRetrievalResult()
            .activationCapsules;
    const claimTextEn =
        'Yesterday in the rain corridor, you hid my umbrella.';
    const validationConflict = {
        stage:
            'scene_performance_validation',
        errors: [
            'invalid_segment_actor_id [segment:1]',
            'Item vanished_quill is physically absent.',
        ],
        details: {
            segmentIndex: 0,
        },
    };
    const limited =
        limitMessagesToContext(
            [{
                role: 'system',
                content:
                    'Repair the performance.',
            }, {
                role: 'user',
                content:
                    JSON.stringify({
                        authoritySnapshot,
                        memoryActivationCapsules,
                        validationConflict,
                        validationError:
                            validationConflict
                                .errors
                                .join('；'),
                        invalidOutput: {
                            segments: [{
                                type: 'dialogue',
                                actorId:
                                    'hermione',
                                textEn:
                                    claimTextEn,
                                historicalClaims: [{
                                    claimTextEn,
                                    sourceEventIds: [
                                        'event_umbrella',
                                    ],
                                }],
                            }],
                            disposable:
                                'x'.repeat(
                                    40_000,
                                ),
                        },
                        requiredSchema:
                            `SECRET_PROMPT_SENTINEL ${'s'.repeat(40_000)}`,
                        originalSceneInput: {
                            playerAction:
                                'Try to pick up the vanished quill.',
                            authoritySnapshot,
                            memoryActivationCapsules,
                            historicalKnowledgeEvidence:
                                'obsolete '.repeat(
                                    20_000,
                                ),
                        },
                    }),
            }],
            32_768,
            18_576,
        );
    const payload =
        JSON.parse(
            limited[1].content,
        );
    const invalidOutput =
        payload.invalidOutput;

    assert.equal(
        payload.originalSceneInput
            .playerAction,
        'Try to pick up the vanished quill.',
    );
    assert.deepEqual(
        payload.authoritySnapshot,
        authoritySnapshot,
    );
    assert.deepEqual(
        payload.originalSceneInput
            .authoritySnapshot,
        authoritySnapshot,
    );
    assert.deepEqual(
        payload.memoryActivationCapsules,
        memoryActivationCapsules,
    );
    assert.deepEqual(
        payload.validationConflict,
        validationConflict,
    );
    assert.deepEqual(
        invalidOutput.segments[0]
            .historicalClaims,
        [{
            claimTextEn,
            sourceEventIds: [
                'event_umbrella',
            ],
        }],
    );
    assert.equal(
        payload.requiredSchema,
        undefined,
    );
    assert.doesNotMatch(
        limited[1].content,
        /SECRET_PROMPT_SENTINEL/u,
    );
});

test('[defect-probing] extreme Opening repair trimming preserves the committed original request and segment provenance', () => {
    const authoritySnapshot = {
        version: 1,
        timelineEpoch:
            TIMELINE_EPOCH,
        stateRevision:
            STATE_REVISION,
    };
    const memoryActivationCapsules =
        createRetrievalResult()
            .activationCapsules;
    const claimTextEn =
        'Yesterday in the rain corridor, you hid my umbrella.';
    const originalRequest = {
        openingClock:
            '1991-09-03 · 17:15',
        authoritySnapshot,
        destinationAuthority: {
            mapId: 'hogwarts_castle',
            roomId: 'library',
        },
        nextScene: {
            id: 'scene_library',
            roomId: 'library',
        },
        presentActorStates: [{
            id: 'hermione',
            present: true,
        }],
        authoritativeItems: [{
            id: 'vanished_quill',
            physicalForm: 'absent',
        }],
        memoryActivationCapsules,
        historicalKnowledgeEvidence:
            'obsolete '.repeat(
                20_000,
            ),
    };
    const validationConflict = {
        stage:
            'scene_opening_validation',
        errors: [
            'invalid_segment_actor_id [segment:1]',
            'Opening contradicts absent Item vanished_quill.',
        ],
    };
    const limited =
        limitMessagesToContext(
            [{
                role: 'system',
                content:
                    'Repair the opening.',
            }, {
                role: 'user',
                content:
                    JSON.stringify({
                        authoritySnapshot,
                        memoryActivationCapsules,
                        validationConflict,
                        validationError:
                            validationConflict
                                .errors
                                .join('；'),
                        invalidOutput:
                            JSON.stringify({
                                segments: [{
                                    type: 'dialogue',
                                    actorId:
                                        'hermione',
                                    textEn:
                                        claimTextEn,
                                    historicalClaims: [{
                                        claimTextEn,
                                        sourceEventIds: [
                                            'event_umbrella',
                                        ],
                                    }],
                                }],
                                disposable:
                                    'x'.repeat(
                                        40_000,
                                    ),
                            }),
                        requiredSchema:
                            `SECRET_PROMPT_SENTINEL ${'s'.repeat(40_000)}`,
                        originalRequest,
                    }),
            }],
            32_768,
            18_576,
        );
    const payload =
        JSON.parse(
            limited[1].content,
        );
    const invalidOutput =
        JSON.parse(
            payload.invalidOutput,
        );

    assert.deepEqual(
        payload.originalRequest,
        {
            openingClock:
                originalRequest
                    .openingClock,
            authoritySnapshot,
            destinationAuthority:
                originalRequest
                    .destinationAuthority,
            nextScene:
                originalRequest
                    .nextScene,
            presentActorStates:
                originalRequest
                    .presentActorStates,
            authoritativeItems:
                originalRequest
                    .authoritativeItems,
            memoryActivationCapsules,
        },
    );
    assert.deepEqual(
        payload.validationConflict,
        validationConflict,
    );
    assert.deepEqual(
        invalidOutput.segments[0]
            .historicalClaims[0]
            .sourceEventIds,
        ['event_umbrella'],
    );
    assert.equal(
        payload.requiredSchema,
        undefined,
    );
    assert.doesNotMatch(
        limited[1].content,
        /SECRET_PROMPT_SENTINEL/u,
    );
});
