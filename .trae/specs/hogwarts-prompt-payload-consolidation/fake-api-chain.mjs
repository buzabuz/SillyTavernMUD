#!/usr/bin/env node

import assert from 'node:assert/strict';

import * as domain from '../../../public/scripts/extensions/hogwarts-mud/helpers.js';
import {
    beginModelTaskAction,
    endModelTaskAction,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/model-task-runtime.js';
import {
    createModelEventScheduler,
} from '../../../public/scripts/extensions/hogwarts-mud/runtime/model-event-scheduler.js';
import {
    createDirectorWorkflows,
} from '../../../public/scripts/extensions/hogwarts-mud/workflows/directors.js';
import {
    createOpeningWorkflow,
} from '../../../public/scripts/extensions/hogwarts-mud/workflows/opening.js';
import {
    createSceneTransitionWorkflow,
} from '../../../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
import {
    createTurnPerformanceWorkflow,
} from '../../../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';
import {
    PRESET_WORLD_MAP,
} from '../../../public/scripts/extensions/hogwarts-mud/world-data.js';
import {
    parseItemOperationDirectives,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/item-directive.js';

function words(text, target) {
    const source =
        String(text)
            .trim()
            .split(/\s+/u)
            .filter(Boolean);
    const filler = [
        'quietly',
        'nearby',
        'without',
        'changing',
        'the',
        'committed',
        'facts',
    ];
    while (
        source.length <
        target
    ) {
        source.push(
            filler[
                source.length %
                filler.length
            ],
        );
    }
    return source
        .slice(0, target)
        .join(' ');
}

function actorProposal(
    id,
    nameEn,
    roomId,
    present,
) {
    return {
        id,
        nameEn,
        aliases: [
            nameEn.split(' ')[0],
        ],
        roleEn:
            'Household witness',
        publicProfile: {
            descriptionEn:
                'A watchful adult with dark hair and a reserved expression.',
            backgroundEn:
                'A long-standing member of the household.',
        },
        performanceCore: {
            temperamentEn:
                'Practical, guarded, and observant.',
            speechStyleEn:
                'Short precise sentences with dry restraint.',
            motivesEn: [
                'Keep the household safe.',
            ],
            socialStrategiesEn: [
                'Ask direct questions.',
            ],
            boundariesEn: [
                'Will not tolerate threats.',
            ],
            vulnerabilitiesEn: [
                'Protective of family.',
            ],
        },
        privateFacts: {
            secretEn: '',
            knowledgeEn: [
                'A Hogwarts letter arrived this morning.',
            ],
        },
        runtime: {
            present,
            roomId:
                present
                    ? roomId
                    : '',
            currentActivityEn:
                present
                    ? 'Watching the sealed letter.'
                    : 'Waiting elsewhere.',
            currentIntentEn:
                present
                    ? 'Learn who sent the letter.'
                    : '',
            currentGoalEn:
                'Understand the letter.',
        },
        initialRelationshipToPlayerEn:
            'Established household contact.',
        firstImpressionOfPlayerEn:
            present
                ? 'They think Tina is unusually calm about impossible post.'
                : '',
    };
}

function openingResponse() {
    return {
        version: 1,
        chapterEn:
            'The Letter at Breakfast',
        clock:
            '1991-07-24 · 08:10',
        scene: {
            id: 'letter_breakfast',
            nameEn:
                'Kitchen',
            summaryEn:
                'An impossible letter has interrupted breakfast.',
            explorationHookEn:
                'A second envelope scratches inside the blocked letterbox.',
            worldAnchorId: '',
            map: {
                id: 'family_home',
                nameEn:
                    'Family Home',
                currentLevelId:
                    'ground_floor',
                levels: [{
                    id: 'ground_floor',
                    nameEn:
                        'Ground Floor',
                    z: 0,
                }],
                rooms: [{
                    id: 'kitchen',
                    nameEn: 'Kitchen',
                    levelId:
                        'ground_floor',
                    kind: 'room',
                    descriptionEn:
                        'A narrow kitchen with a rain-streaked window.',
                    x: 30,
                    y: 50,
                    access: 'private',
                }, {
                    id: 'hallway',
                    nameEn: 'Hallway',
                    levelId:
                        'ground_floor',
                    kind: 'room',
                    descriptionEn:
                        'A tiled hallway beside the front door.',
                    x: 70,
                    y: 50,
                    access: 'private',
                }],
                exits: [{
                    from: 'kitchen',
                    to: 'hallway',
                    direction: 'east',
                    kind: 'door',
                    minutes: 1,
                }],
                currentRoomId:
                    'kitchen',
            },
        },
        actorProposals: [
            actorProposal(
                'uncle_martin',
                'Uncle Martin',
                'kitchen',
                true,
            ),
            actorProposal(
                'aunt_rose',
                'Aunt Rose',
                'hallway',
                true,
            ),
            actorProposal(
                'owl_keeper',
                'Owl Keeper',
                '',
                false,
            ),
        ],
        storyArc: {
            id: 'letters_without_end',
            titleEn:
                'Letters Without End',
            hookEn:
                'The letters keep arriving.',
            hiddenTruthEn:
                'A Hogwarts clerk activated an admission escalation.',
            stakesEn:
                'The household must confront the magical world.',
            involvedActorIds: [
                'uncle_martin',
                'aunt_rose',
            ],
            cluePlan: [{
                id: 'owl_feather',
                labelEn: 'Owl Feather',
                hiddenFactEn:
                    'The courier was an owl.',
                playerFacingDiscoveryEn:
                    'A barred feather lies by the window.',
                unlockConditionEn:
                    'Inspect the window.',
                sourceActorIds: [],
                sourceLocationIds: [
                    'kitchen',
                ],
                sourceItemId: '',
            }, {
                id: 'keeper_warning',
                labelEn:
                    'Keeper Warning',
                hiddenFactEn:
                    'More letters will follow.',
                playerFacingDiscoveryEn:
                    'The keeper admits the delivery cannot be stopped.',
                unlockConditionEn:
                    'Meet the keeper.',
                sourceActorIds: [
                    'owl_keeper',
                ],
                sourceLocationIds: [],
                sourceItemId: '',
            }, {
                id: 'wax_seal',
                labelEn: 'Wax Seal',
                hiddenFactEn:
                    'The letter is official.',
                playerFacingDiscoveryEn:
                    'The seal bears the Hogwarts crest.',
                unlockConditionEn:
                    'Examine the envelope.',
                sourceActorIds: [],
                sourceLocationIds: [],
                sourceItemId:
                    'admission_letter',
            }],
        },
        conflict: {
            titleEn:
                'Impossible Post',
            premiseEn:
                'The family cannot explain the letter.',
            immediatePressureEn:
                'Another envelope is forcing through the letterbox.',
            stakesEn:
                'Ignoring it will not stop the magical world.',
            incitingEventEn:
                'The first Hogwarts letter arrived.',
        },
        clues: [],
        items: [],
        nextSceneIntent: {
            titleEn:
                'Open the Door',
            summaryEn:
                'The household confronts the next delivery.',
            triggerEn:
                'Someone reaches the hallway.',
            mapId: 'family_home',
            roomId: 'hallway',
            tier: 'medium',
        },
        openingBriefEn:
            'Begin with the second envelope scratching at the blocked letterbox while both adults react independently and leave the player free to respond.',
    };
}

function bootstrapResponse() {
    return {
        segments: [{
            type: 'narration',
            textEn:
                words(
                    'Rain ticked against the kitchen window while a cream envelope worried the brass letterbox with patient little scratches. Uncle Martin stood beside the breakfast table, one hand hovering above the first letter as though touching it might make the green ink spread. From the hallway Aunt Rose called that the front mat was moving again. The kettle clicked off, leaving the room abruptly quiet except for paper against metal. Martin looked from the Hogwarts crest to Tina and then toward the narrow doorway. Nothing in the committed room changed, but the pressure of the unanswered delivery became impossible to ignore.',
                    150,
                ),
        }, {
            type: 'dialogue',
            actorId:
                'uncle_martin',
            textEn:
                words(
                    'That envelope knows our address, Tina. Before anyone opens the door, tell me whether you expected another one.',
                    40,
                ),
        }],
    };
}

function pacingResponse() {
    return {
        decision: 'intervene',
        diagnosisEn:
            'The first inspection can reveal a reversible material history.',
        reassessAfterTurns: 6,
        intervention: {
            kind:
                'causal_collision',
            timing: 'this_turn',
            beatEn:
                'Fresh red wax flakes cling beneath the older seal.',
            pressureEn:
                'The second seal suggests someone reopened the letter before breakfast.',
            arcId: '',
            causalCollapse: {
                kind:
                    'material_history',
                focusActorId: '',
                relatedActorIds: [],
                itemId:
                    'admission_letter',
                mapId: 'family_home',
                roomId: 'kitchen',
                effectiveMinutesBeforeObservation:
                    20,
                factEn:
                    'A household adult opened and resealed the admission letter shortly before breakfast.',
                edgeType: '',
                visibleResiduesEn: [
                    'Fresh red wax flakes cling beneath the older green seal.',
                ],
                aftermathEn:
                    'Show the mismatched wax before anyone explains who touched it.',
                witnessAccounts: [],
                sourceEventIds: [],
                persistenceTargets: [
                    'event',
                    'room_state',
                    'item',
                ],
                surfaceMode:
                    'aftermath',
                consequenceMode:
                    'mixed',
                irreversible: false,
                requiresHighTier:
                    false,
            },
        },
    };
}

function performanceResponse() {
    return {
        segments: [{
            type: 'narration',
            textEn:
                words(
                    'Tina tilted the admission letter toward the window. A line of fresh red wax showed beneath the older green seal, and three brittle flakes dropped beside the cold toast. Uncle Martin stopped reaching for the kettle. His attention fixed on the mismatch while the second envelope continued scratching at the hall door.',
                    170,
                ),
        }, {
            type: 'dialogue',
            actorId:
                'uncle_martin',
            textEn:
                words(
                    'That is not the same wax. Someone opened this before we came downstairs, and I would very much like to know who.',
                    55,
                ),
        }, {
            type: 'narration',
            textEn:
                words(
                    'The observation changed the problem from strange post to a question inside the household. Martin set the kettle aside and turned the letter without breaking either seal.',
                    45,
                ),
        }],
        signals: {
            pacingBeatRealized:
                true,
            sceneProgression: {
                type:
                    'new_information',
                summaryEn:
                    'The inspection exposes a second wax seal and gives the household a concrete new question.',
                completedRequestedStep:
                    true,
            },
        },
    };
}

function transitionResponse(
    actorIds,
) {
    return {
        transitionMinutes: 15,
        closureSummaryEn:
            'The family confirms that the admission letter was opened and resealed before breakfast.',
        globalChronicleSummaryEn:
            words(
                'Tina inspected the Hogwarts letter and found fresh red wax beneath its original green seal. The discovery proved that someone inside the household had opened and resealed the envelope before breakfast, shifting the family argument from whether magic existed to who had already acted on the letter.',
                52,
            ),
        authorQuillEn:
            words(
                'The chapter awarded Tina the Order of Suspicious Stationery for noticing that enchanted post apparently comes with the same quality-control problems as ordinary mail. Uncle Martin attempted the traditional adult defence of standing near a kettle and hoping facts would become less factual. They did not. The wax flakes entered the scene with better timing than most detectives and considerably less paperwork. Tina, meanwhile, inspected the evidence without first eating it, setting fire to it, or demanding a refund from Scotland, which counts as measurable tactical growth. Aunt Rose contributed from the hallway, proving that shouting through a doorway remains the household communication system of choice. The official mock award for Best Supporting Condiment goes to the untouched toast, which survived magic, suspicion, and a family crisis without becoming a metaphor. One point is deducted for nobody checking the obvious second envelope, although its persistent scratching deserves a union representative. Overall, the player turned a static acceptance letter into a concrete mystery, preserved agency, and left the next scene with a clean question: who handled the post before breakfast, and why did they think matching wax was optional?',
                205,
            ),
        unresolvedThreadsEn: [
            'Who opened and resealed the Hogwarts letter before breakfast?',
        ],
        nextScene: {
            id:
                'hallway_second_delivery',
            nameEn:
                'Hallway Second Delivery',
            summaryEn:
                'In the Hallway, the household faces the scratching second envelope.',
            chapterEn:
                'The Letter at the Door',
            mapId: 'family_home',
            roomId: 'hallway',
            explorationHookEn:
                'A thin red wax shaving rests beneath the moving letterbox flap.',
            temporalFactsEn: [],
            crowdDirectionEn: '',
            actorStates:
                actorIds.map(id => ({
                    id,
                    present: true,
                    currentActivityEn:
                        id ===
                            'uncle_martin'
                            ? 'Standing beside the letterbox with the resealed letter.'
                            : 'Watching the letterbox flap move against the second envelope.',
                    currentIntentEn:
                        'Determine who sent and handled the second delivery.',
                    lifeStatus:
                        'alive',
                    lifeStatusPermanent:
                        false,
                    lifeStatusDetailEn:
                        'Alive.',
                    mapId:
                        'family_home',
                    roomId:
                        'hallway',
                })),
            followingSceneIntent: {
                titleEn:
                    'Compare the Seals',
                summaryEn:
                    'The household compares both envelopes without forcing an outcome.',
                triggerEn:
                    'After the second envelope is safely recovered.',
                mapId:
                    'family_home',
                roomId: 'kitchen',
                tier: 'medium',
            },
        },
    };
}

function postTransitionOpeningResponse() {
    return {
        segments: [{
            type: 'narration',
            textEn:
                'The Hallway smelled of rain carried under the front door. Uncle Martin held the resealed letter beside the brass flap while the second envelope pushed its corner through, withdrew, and tried again. A thin shaving of red wax lay on the tile directly below it.',
        }, {
            type: 'dialogue',
            actorId:
                'aunt_rose',
            textEn:
                'Do not tear that one. Put it beside the first, and let us see whether the seals match.',
        }],
    };
}

async function main() {
    globalThis.toastr = {
        success() {},
        warning() {},
        error() {},
        info() {},
    };
    globalThis.fetch =
        async (
            url,
            options = {},
        ) => {
            if (
                String(url) !==
                    '/api/hogwarts-mud/turn/settle'
            ) {
                throw new Error(
                    `Unexpected fake HTTP request ${url}.`,
                );
            }
            const input =
                JSON.parse(
                    options.body,
                );
            return {
                ok: true,
                async json() {
                    return {
                        performance:
                            domain
                                .settleNarrativeTurnPerformance(
                                    input.payload,
                                    input.worldState,
                                    {
                                        playerAction:
                                            input
                                                .playerAction,
                                        movementResolution:
                                            input
                                                .movementResolution,
                                        momentumDirective:
                                            input
                                                .momentumDirective,
                                        checkResolution:
                                            input
                                                .checkResolution,
                                        admittedActors:
                                            input
                                                .admittedActors,
                                    },
                                ),
                    };
                },
            };
        };
    const slots = {
        low: {
            profileId: 'fake-low',
            tier: 'low',
            contextSize: 120_000,
            maxResponseLength:
                12_000,
        },
        medium: {
            profileId: 'fake-medium',
            tier: 'medium',
            contextSize: 120_000,
            maxResponseLength:
                12_000,
        },
        high: {
            profileId: 'fake-high',
            tier: 'high',
            contextSize: 120_000,
            maxResponseLength:
                12_000,
        },
    };
    let state =
        domain.createInitialWorldState(
            {
                identity: {
                    name: 'Tina',
                    age: 11,
                },
                background: {
                    guardian:
                        'Uncle Martin',
                    desire:
                        'Attend Hogwarts',
                    fear: 'Spiders',
                },
                storyPreferences: {},
            },
            slots,
        );
    const context = {
        chat: [],
        chatMetadata: {
            hogwartsMud: state,
        },
        async saveMetadata() {},
        async saveChat() {},
    };
    const queuedResponses = [{
        taskId: 'opening_world',
        tier: 'high',
        payload:
            openingResponse(),
    }, {
        taskId: 'scene_opening',
        tier: 'low',
        payload:
            bootstrapResponse(),
    }, {
        taskId: 'pacing_director',
        tier: 'medium',
        payload:
            pacingResponse(),
    }, {
        taskId: 'scene_performance',
        tier: 'low',
        payload:
            performanceResponse(),
    }, {
        taskId: 'scene_transition',
        tier: 'medium',
        payload: null,
    }, {
        taskId: 'scene_opening',
        tier: 'low',
        payload:
            postTransitionOpeningResponse(),
    }];
    const attempts = [];
    const scheduler =
        createModelEventScheduler({
            getState:
                () =>
                    context
                        .chatMetadata
                        .hogwartsMud,
            getRuntimeMaximumCharacters:
                slot =>
                    domain
                        .createContextBudgetPlan(
                            slot.contextSize,
                            slot.maxResponseLength,
                        )
                        .maxPromptCharacters,
            enforceProductBudget:
                true,
            onAttempt:
                envelope =>
                    attempts.push({
                        taskId:
                            envelope.taskId,
                        tier:
                            envelope.tier,
                        promptCharacters:
                            envelope
                                .promptMeasurement
                                .characters,
                        productTarget:
                            envelope
                                .promptBudget
                                .effectiveMaximumCharacters,
                    }),
            invokeRole:
                async (
                    slot,
                    _messages,
                ) => {
                    const next =
                        queuedResponses
                            .shift();
                    assert.ok(
                        next,
                        'Unexpected fake API call.',
                    );
                    assert.equal(
                        slot.tier,
                        next.tier,
                    );
                    if (
                        next.taskId ===
                            'scene_transition' &&
                        !next.payload
                    ) {
                        next.payload =
                            transitionResponse([
                                'uncle_martin',
                                'aunt_rose',
                            ]);
                    }
                    return {
                        content:
                            JSON.stringify(
                                next.payload,
                            ),
                    };
                },
        });
    const requests = {
        openingWorld:
            scheduler.createRoleRequest(
                'opening_world',
                {
                    eventType:
                        'world.bootstrap_requested',
                    emittedBy:
                        'fake.chain',
                    tier: 'high',
                },
            ),
        bootstrapOpening:
            scheduler.createRoleRequest(
                'scene_opening',
                {
                    eventType:
                        'world.bootstrap_committed',
                    emittedBy:
                        'fake.chain',
                    tier: 'low',
                },
            ),
        pacing:
            scheduler.createRoleRequest(
                'pacing_director',
                {
                    eventType:
                        'turn.pre_generation',
                    emittedBy:
                        'fake.chain',
                    tier: 'medium',
                },
            ),
        performance:
            scheduler.createRoleRequest(
                'scene_performance',
                {
                    eventType:
                        'turn.generation',
                    emittedBy:
                        'fake.chain',
                    tier: 'low',
                },
            ),
        transition:
            scheduler.createRoleRequest(
                'scene_transition',
                {
                    eventType:
                        'scene.close_requested',
                    emittedBy:
                        'fake.chain',
                },
            ),
        sceneOpening:
            scheduler.createRoleRequest(
                'scene_opening',
                {
                    eventType:
                        'scene.transition_committed',
                    emittedBy:
                        'fake.chain',
                    tier: 'low',
                },
            ),
    };
    const openingWorkflow =
        createOpeningWorkflow({
            CANON_WIT_TONE_CONTRACT:
                domain
                    .CANON_WIT_TONE_CONTRACT,
            PRESET_WORLD_MAP:
                PRESET_WORLD_MAP,
            TRANSLATION_FORMAT_VERSION:
                12,
            applyNativeRoleSettings:
                async () => {},
            applyOpeningWorldPackage:
                domain
                    .applyOpeningWorldPackage,
            applySystemPrompt:
                () => {},
            extractRoleResponseText:
                response =>
                    response.content,
            getContext:
                () => context,
            getMudState:
                () =>
                    context
                        .chatMetadata
                        .hogwartsMud,
            getSettings:
                () => ({
                    translationEnabled:
                        false,
                    translationProvider:
                        'none',
                }),
            jobRegistry: {
                opening: null,
            },
            parseJsonObject:
                value =>
                    JSON.parse(value),
            renderAll:
                () => {},
            resolveRoleSlots:
                () => slots,
            scheduleRender:
                () => {},
            sendBootstrapSceneOpeningRequest:
                requests
                    .bootstrapOpening,
            sendOpeningWorldRequest:
                requests
                    .openingWorld,
            syncLocalKnowledge:
                async () => {},
            translateOpeningValues:
                async values =>
                    values,
            validateOpeningWorldPackage:
                domain
                    .validateOpeningWorldPackage,
        });
    await openingWorkflow
        .initializeOpeningWorld();
    state =
        context.chatMetadata
            .hogwartsMud;
    assert.equal(
        state.phase,
        'playing',
    );
    assert.equal(
        context.chat.length,
        1,
    );
    state.turn.count = 6;
    state.items.push({
        version: 3,
        id: 'admission_letter',
        type: 'document',
        labelEn:
            'Hogwarts Admission Letter',
        ownerId: 'player',
        holderId: 'player',
        location: {
            mapId: 'family_home',
            roomId: 'kitchen',
            placement:
                'with_holder',
        },
        appearanceEn:
            'A cream envelope sealed in green wax.',
        state: 'intact',
        physicalForm: 'whole',
        sourceEventId:
            'opening_letter',
        isEquipped: false,
        storyRoles: [
            'clue',
        ],
        visibility: 'public',
        importance: 'key',
    });
    const playerAction =
        'Inspect the Hogwarts Admission Letter.';
    const signals =
        domain.analyzePacingSignals(
            state,
            playerAction,
        );
    assert.equal(
        signals.shouldAssess,
        true,
    );
    beginModelTaskAction(
        state,
        'fake-turn-7',
    );
    const directorWorkflow =
        createDirectorWorkflows({
            CONTEXT_SIZE_PRESETS:
                domain
                    .CONTEXT_SIZE_PRESETS,
            DEFAULT_MODEL_SLOTS:
                domain
                    .DEFAULT_MODEL_SLOTS,
            analyzePacingSignals:
                domain
                    .analyzePacingSignals,
            applyPacingAssessment:
                domain
                    .applyPacingAssessment,
            applySystemPrompt:
                () => {},
            buildNpcIdentityPromptProjection:
                domain
                    .buildNpcIdentityPromptProjection,
            createContextBudgetPlan:
                domain
                    .createContextBudgetPlan,
            extractRoleResponseText:
                response =>
                    response.content,
            getContext:
                () => context,
            getMudState:
                () =>
                    context
                        .chatMetadata
                        .hogwartsMud,
            jobRegistry: {
                pacing: null,
            },
            normalizePacingAssessmentPayload:
                domain
                    .normalizePacingAssessmentPayload,
            parseJsonObject:
                value =>
                    JSON.parse(value),
            renderAll:
                () => {},
            resolveRoleSlots:
                () => slots,
            sendPacingDirectorRequest:
                requests.pacing,
            syncLocalKnowledge:
                async () => {},
            validatePacingAssessment:
                domain
                    .validatePacingAssessment,
        });
    const pacingAssessment =
        await directorWorkflow
            .ensurePacingDirectorAssessment(
                playerAction,
            );
    assert.equal(
        pacingAssessment
            .intervention.kind,
        'causal_collision',
    );
    state =
        context.chatMetadata
            .hogwartsMud;
    const performanceWorkflow =
        createTurnPerformanceWorkflow({
            CANON_CAST_IDENTITY_CONTRACT:
                domain
                    .CANON_CAST_IDENTITY_CONTRACT,
            CANON_WIT_TONE_CONTRACT:
                domain
                    .CANON_WIT_TONE_CONTRACT,
            CONTEXT_SIZE_PRESETS:
                domain
                    .CONTEXT_SIZE_PRESETS,
            DEFAULT_MODEL_SLOTS:
                domain
                    .DEFAULT_MODEL_SLOTS,
            NPC_IDENTITY_PROMPT_BOUNDARY:
                domain
                    .NPC_IDENTITY_PROMPT_BOUNDARY,
            beginLiveSceneStream:
                () => {},
            buildBehavioralEnvironment:
                domain
                    .buildBehavioralEnvironment,
            buildSpatialContext:
                domain
                    .buildSpatialContext,
            buildStructuredPlayerTurnSequence:
                domain
                    .buildStructuredPlayerTurnSequence,
            buildTemporaryActorPromotionPolicy:
                domain
                    .buildTemporaryActorPromotionPolicy,
            createContextBudgetPlan:
                domain
                    .createContextBudgetPlan,
            extractRoleResponseText:
                response =>
                    response.content,
            getActiveAddressingState:
                () => ({}),
            getAuthoritativeSceneSpells:
                domain
                    .getAuthoritativeSceneSpells,
            getRequestHeaders:
                () => ({}),
            getSettings:
                () => ({
                    translationEnabled:
                        false,
                }),
            parseItemOperationDirectives:
                parseItemOperationDirectives,
            parseJsonObject:
                value =>
                    JSON.parse(value),
            recoverScenePerformancePayload:
                domain
                    .recoverScenePerformancePayload,
            removeExplicitAddressDirective:
                domain
                    .removeExplicitAddressDirective,
            resolvePlayerAddressing:
                domain
                    .resolvePlayerAddressing,
            resolveTemporaryActorRevealedName:
                actor => actor,
            sendModelTaskRequest:
                requests.performance,
            setLiveSceneStreamPhase:
                () => {},
            settleNarrativeTurnPerformance:
                domain
                    .settleNarrativeTurnPerformance,
            translateOpeningValues:
                async values =>
                    values,
            updateLiveSceneStream:
                () => {},
            validateScenePerformance:
                domain
                    .validateScenePerformance,
        });
    const budget =
        domain
            .createTurnPerformanceBudget(
                playerAction,
                domain
                    .getDeterministicTimePolicy(),
                {
                    activeNamedActorCount:
                        2,
                    adjudicatedMinutes:
                        15,
                },
            );
    const momentum =
        performanceWorkflow
            .createSceneMomentumDirective(
                state,
                playerAction,
                budget,
            );
    const performance =
        await performanceWorkflow
            .generateScenePerformance(
                slots.low,
                state,
                playerAction,
                budget,
                [],
                null,
                momentum,
                null,
                domain
                    .resolvePlayerAddressing(
                        state,
                        playerAction,
                    ),
                [],
                domain
                    .createContextBudgetPlan(
                        slots.low
                            .contextSize,
                        slots.low
                            .maxResponseLength,
                    ),
            );
    assert.equal(
        performance
            .pacingBeatRealized,
        true,
    );
    const transaction =
        performanceWorkflow
            .buildSceneTransaction(
                performance,
                budget,
                state.pacingDirector
                    .pendingBeat,
                null,
            );
    state =
        domain.applyTurnTransaction(
            state,
            transaction,
        );
    state =
        domain.consumePacingBeat(
            state,
        );
    context.chatMetadata
        .hogwartsMud =
        state;
    context.chat.push({
        is_user: true,
        mes: playerAction,
        extra: {
            hogwartsMud: {
                role: 'player_turn',
            },
        },
    }, {
        is_user: false,
        mes:
            performance.segments
                .map(segment =>
                    segment.textEn)
                .join('\n'),
        extra: {
            hogwartsMud: {
                role: 'scene_turn',
                sceneId:
                    state.scene.id,
                segments:
                    performance
                        .segments,
                turnTransaction:
                    transaction,
            },
        },
    });
    endModelTaskAction(
        state,
        'fake-turn-7',
    );
    beginModelTaskAction(
        state,
        'fake-transition-1',
    );
    const transitionWorkflow =
        createSceneTransitionWorkflow({
            CANON_CAST_IDENTITY_CONTRACT:
                domain
                    .CANON_CAST_IDENTITY_CONTRACT,
            CANON_WIT_TONE_CONTRACT:
                domain
                    .CANON_WIT_TONE_CONTRACT,
            CONTEXT_SIZE_PRESETS:
                domain
                    .CONTEXT_SIZE_PRESETS,
            DEFAULT_MODEL_SLOTS:
                domain
                    .DEFAULT_MODEL_SLOTS,
            NPC_IDENTITY_PROMPT_BOUNDARY:
                domain
                    .NPC_IDENTITY_PROMPT_BOUNDARY,
            buildActorContinuityCapsules:
                domain
                    .buildActorContinuityCapsules,
            buildBehavioralEnvironment:
                domain
                    .buildBehavioralEnvironment,
            buildSceneCastRotationPolicy:
                domain
                    .buildSceneCastRotationPolicy,
            composeSceneSegments:
                openingWorkflow
                    .composeSceneSegments,
            createContextBudgetPlan:
                domain
                    .createContextBudgetPlan,
            extractRoleResponseText:
                response =>
                    response.content,
            findSceneDestination:
                domain
                    .findSceneDestination,
            formatNextSceneIntent:
                domain
                    .formatNextSceneIntent,
            formatRetrievedKnowledge:
                () => '',
            getContext:
                () => context,
            getSceneDestinationAuthority:
                domain
                    .getSceneDestinationAuthority,
            getSettings:
                () => ({
                    translationEnabled:
                        false,
                }),
            normalizeSceneTransitionPackage:
                domain
                    .normalizeSceneTransitionPackage,
            parseJsonObject:
                value =>
                    JSON.parse(value),
            projectActorLibraryForContext:
                directorWorkflow
                    .projectActorLibraryForContext,
            projectSceneArchivePresence:
                domain
                    .projectSceneArchivePresence,
            sendSceneOpeningRequest:
                requests.sceneOpening,
            sendSceneTransitionRequest:
                requests.transition,
            stripSyntheticSceneOpeningActorSegments:
                domain
                    .stripSyntheticSceneOpeningActorSegments,
            synchronizeHeldItemLocations:
                domain
                    .synchronizeHeldItemLocations,
            validateSceneTransitionPackage:
                domain
                    .validateSceneTransitionPackage,
        });
    const expectedDestination = {
        mapId: 'family_home',
        roomId: 'hallway',
    };
    const transitionContextPlan =
        domain.createContextBudgetPlan(
            slots.medium.contextSize,
            slots.medium
                .maxResponseLength,
        );
    let transition =
        await transitionWorkflow
            .generateSceneTransitionPackage(
                slots.medium,
                state,
                'medium',
                'hallway',
                expectedDestination,
                {
                    changed: false,
                },
                [],
                transitionContextPlan,
            );
    transition =
        await transitionWorkflow
            .generateSceneTransitionOpening(
                slots.low,
                state,
                transition,
                expectedDestination,
                domain
                    .createContextBudgetPlan(
                        slots.low
                            .contextSize,
                        slots.low
                            .maxResponseLength,
                    ),
                {},
                [],
            );
    assert.equal(
        transition
            .nextScene
            .openingSegments
            .length,
        2,
    );
    const archiveEntry =
        transitionWorkflow
            .buildSceneArchiveEntry(
                state,
                transition,
                'medium',
            );
    state =
        domain.applySceneTransition(
            state,
            transition,
            archiveEntry,
            {
                expectedMapId:
                    expectedDestination
                        .mapId,
                expectedRoomId:
                    expectedDestination
                        .roomId,
                startedMessageId:
                    context.chat.length,
                tier: 'medium',
            },
        );
    context.chatMetadata
        .hogwartsMud =
        state;
    const openingMessage =
        transitionWorkflow
            .buildSceneTransitionMessage(
                transition,
                state,
            );
    context.chat.push(
        openingMessage,
    );
    const openingExperience =
        domain
            .applyCommittedSceneOpeningExperience(
                state,
                openingMessage,
                context.chat.length - 1,
            );
    state =
        openingExperience.state;
    context.chatMetadata
        .hogwartsMud =
        state;
    endModelTaskAction(
        state,
        'fake-transition-1',
    );
    assert.equal(
        queuedResponses.length,
        0,
    );
    assert.deepEqual(
        attempts.map(
            attempt =>
                attempt.taskId,
        ),
        [
            'opening_world',
            'scene_opening',
            'pacing_director',
            'scene_performance',
            'scene_transition',
            'scene_opening',
        ],
    );
    assert.equal(
        attempts.every(attempt =>
            attempt.promptCharacters <=
                attempt.productTarget),
        true,
    );
    assert.equal(
        state.scene.id,
        'hallway_second_delivery',
    );
    assert.equal(
        state.map
            .currentLocalNodeId,
        'hallway',
    );
    assert.equal(
        state.causalCollapse
            .records[0]
            .status,
        'surfaced',
    );
    assert.equal(
        state.modelTaskRuntime
            .byTaskId
            .pacing_director
            .succeeded,
        1,
    );
    assert.equal(
        state.modelTaskRuntime
            .byTaskId
            .scene_transition
            .succeeded,
        1,
    );
    process.stdout.write(
        `${JSON.stringify({
            calls: attempts,
            finalState: {
                phase: state.phase,
                turn:
                    state.turn.count,
                clock: state.clock,
                sceneId:
                    state.scene.id,
                mapId:
                    state.map
                        .activeMapId,
                roomId:
                    state.map
                        .currentLocalNodeId,
                actorCount:
                    state
                        .actorLibrary
                        .length,
                causalRecords:
                    state
                        .causalCollapse
                        .records
                        .length,
                openingEvents:
                    state
                        .eventKnowledge
                        .length,
            },
        }, null, 2)}\n`,
    );
}

await main();
