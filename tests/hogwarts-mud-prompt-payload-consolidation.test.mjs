import assert from 'node:assert/strict';
import {
    readFileSync,
} from 'node:fs';
import test from 'node:test';

import {
    normalizeActorCreationProposal,
    validateActorCreationProposal,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-creation-proposal.js';
import {
    applyOpeningWorldPackage,
    createInitialWorldState,
    validateOpeningWorldPackage,
} from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import {
    buildNarrativeAuthoritySnapshot,
} from '../public/scripts/extensions/hogwarts-mud/domain/narrative-authority.js';
import {
    findMountedInteriorMap,
    getInteriorMount,
    listMapsByMountHierarchy,
    migrateInteriorMountAuthority,
} from '../public/scripts/extensions/hogwarts-mud/domain/interior-mount.js';
import {
    enterBoundInteriorMap,
    getInteriorMapRequest,
} from '../public/scripts/extensions/hogwarts-mud/domain/interior-map.js';
import {
    applyPlayerMovement,
} from '../public/scripts/extensions/hogwarts-mud/domain/movement.js';
import {
    findSceneDestination,
} from '../public/scripts/extensions/hogwarts-mud/domain/scene-destination.js';
import {
    MODEL_TASK_CATALOG,
    validateModelTaskCatalog,
} from '../public/scripts/extensions/hogwarts-mud/domain/model-task-registry.js';
import {
    createModelEventScheduler,
} from '../public/scripts/extensions/hogwarts-mud/runtime/model-event-scheduler.js';
import {
    beginModelTaskAction,
    createDefaultModelTaskRuntime,
    normalizeModelTaskRuntime,
} from '../public/scripts/extensions/hogwarts-mud/domain/model-task-runtime.js';
import {
    prepareSaveRevisionCommit,
} from '../public/scripts/extensions/hogwarts-mud/domain/save-revision.js';
import {
    allocatePromptSections,
    getTaskPromptBudgetPolicy,
} from '../public/scripts/extensions/hogwarts-mud/domain/prompt-budget-allocator.js';
import {
    analyzePacingSignals,
} from '../public/scripts/extensions/hogwarts-mud/domain/pacing-signals.js';
import {
    applyPacingAssessment,
    consumePacingBeat,
} from '../public/scripts/extensions/hogwarts-mud/domain/pacing-reducer.js';
import {
    foldNarrativeTurnProposals,
    settleNarrativeTurnPerformance,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-protocol.js';
import {
    captureMemoryBoundaryGuard,
    isMemoryBoundaryGuardCurrent,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory-reducer.js';
import {
    normalizePacingAssessmentPayload,
    validatePacingAssessment,
} from '../public/scripts/extensions/hogwarts-mud/domain/causal-pacing-contract.js';
import {
    createDirectorWorkflows,
} from '../public/scripts/extensions/hogwarts-mud/workflows/directors.js';
import {
    createOpeningWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/opening.js';
import {
    validateLowSceneOpeningOutput,
} from '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
import {
    createSocialMemoryWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/social-memory.js';
import {
    validateLowScenePerformanceOutputContract,
} from '../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';
import {
    createInteriorMapWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/interior-map.js';
import {
    buildCalendarLocationOptions,
} from '../public/scripts/extensions/hogwarts-mud/ui/calendar-view-model.js';

function actorProposal(
    id,
    {
        present = true,
        roomId = 'kitchen',
    } = {},
) {
    return {
        id,
        nameEn:
            id
                .split('_')
                .map(part =>
                    part[0]
                        .toUpperCase() +
                    part.slice(1))
                .join(' '),
        aliases: [],
        roleEn: 'Opening witness',
        publicProfile: {
            descriptionEn:
                'A compact person with dark hair and an alert expression.',
            backgroundEn:
                'A member of the household.',
        },
        performanceCore: {
            temperamentEn:
                'Practical and observant.',
            speechStyleEn:
                'Short, precise sentences.',
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
                'An unusual letter arrived.',
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
                    ? 'Watching the letter.'
                    : 'Waiting elsewhere.',
            currentIntentEn:
                present
                    ? 'Find out who sent it.'
                    : '',
            currentGoalEn:
                'Understand the letter.',
        },
        initialRelationshipToPlayerEn:
            'Established household contact.',
        firstImpressionOfPlayerEn:
            present
                ? 'They seem unusually calm about the impossible letter.'
                : '',
    };
}

function openingPackage() {
    const actorProposals = [
        actorProposal(
            'uncle_martin',
        ),
        actorProposal(
            'aunt_rose',
            {
                roomId:
                    'hallway',
            },
        ),
        actorProposal(
            'owl_keeper',
            {
                present: false,
            },
        ),
    ];
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
                'A second envelope scratches insistently inside the blocked letterbox.',
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
                rooms: [
                    {
                        id: 'kitchen',
                        nameEn:
                            'Kitchen',
                        levelId:
                            'ground_floor',
                        kind: 'room',
                        descriptionEn:
                            'A narrow kitchen.',
                        x: 30,
                        y: 50,
                        access: 'private',
                    },
                    {
                        id: 'hallway',
                        nameEn:
                            'Hallway',
                        levelId:
                            'ground_floor',
                        kind: 'room',
                        descriptionEn:
                            'A tiled hallway.',
                        x: 65,
                        y: 50,
                        access: 'private',
                    },
                ],
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
        actorProposals,
        storyArc: {
            id: 'letters_without_end',
            titleEn:
                'Letters Without End',
            hookEn:
                'The letters keep arriving.',
            hiddenTruthEn:
                'A Hogwarts clerk has activated the admission escalation process.',
            stakesEn:
                'The household must confront the magical world.',
            involvedActorIds: [
                'uncle_martin',
                'aunt_rose',
            ],
            cluePlan: [
                {
                    id: 'owl_feather',
                    labelEn:
                        'Owl Feather',
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
                },
                {
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
                },
                {
                    id: 'wax_seal',
                    labelEn:
                        'Wax Seal',
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
                },
            ],
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
                'The household must confront the next delivery.',
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

test(
    'ActorCreationProposalV1 normalizes one nested Core/Runtime proposal and rejects flat legacy fields',
    () => {
        const proposal =
            actorProposal(
                'uncle_martin',
            );
        const validation =
            validateActorCreationProposal(
                proposal,
                {
                    mode: 'opening',
                },
            );
        assert.equal(
            validation.valid,
            true,
            validation.errors.join(
                '\n',
            ),
        );
        assert.deepEqual(
            normalizeActorCreationProposal(
                proposal,
            ),
            validation.value,
        );
        const flat = {
            ...proposal,
            publicDescriptionEn:
                proposal.publicProfile
                    .descriptionEn,
        };
        assert.equal(
            validateActorCreationProposal(
                flat,
            ).valid,
            false,
        );
    },
);

test(
    'Opening World commits Actor proposals once into ActorCoreV1 and ActorRuntimeV1',
    () => {
        const world =
            createInitialWorldState(
                {
                    identity: {
                        name: 'Tina',
                        age: 11,
                    },
                    background: {},
                    storyPreferences: {},
                },
                {
                    low: {},
                    medium: {},
                    high: {},
                },
            );
        const opening =
            openingPackage();
        const validation =
            validateOpeningWorldPackage(
                opening,
                world.character,
                world.campaign,
            );
        assert.equal(
            validation.valid,
            true,
            validation.errors.join(
                '\n',
            ),
        );
        const committed =
            applyOpeningWorldPackage(
                world,
                opening,
            );
        assert.equal(
            committed.actorLibrary
                .length,
            3,
        );
        assert.equal(
            committed.actors.length,
            3,
        );
        assert.equal(
            committed.actors
                .filter(actor =>
                    actor.present)
                .length,
            2,
        );
        assert.equal(
            committed.actorLibrary
                .every(actor =>
                    actor.publicProfile
                        .descriptionEn &&
                    actor.performanceCore
                        .speechStyleEn &&
                    actor.cast.origin ===
                        'foundation'),
            true,
        );
        assert.equal(
            committed.opening.package
                .actors,
            undefined,
        );
        assert.equal(
            committed.opening.package
                .actorLibrary,
            undefined,
        );
    },
);

test(
    'bootstrap Scene Opening validator enforces the Prompt 180-420 word contract',
    () => {
        const {
            validateBootstrapSceneOpening,
        } = createOpeningWorkflow({});
        const state = {
            actors: [],
        };
        const payload = wordCount => ({
            segments: [{
                type: 'narration',
                textEn: 'Opening',
            }, {
                type: 'narration',
                textEn:
                    Array.from(
                        {
                            length:
                                wordCount - 1,
                        },
                        () => 'word',
                    ).join(' '),
            }],
        });
        assert.equal(
            validateBootstrapSceneOpening(
                payload(179),
                state,
            ).valid,
            false,
        );
        assert.equal(
            validateBootstrapSceneOpening(
                payload(180),
                state,
            ).valid,
            true,
        );
        assert.equal(
            validateBootstrapSceneOpening(
                payload(420),
                state,
            ).valid,
            true,
        );
        assert.equal(
            validateBootstrapSceneOpening(
                payload(421),
                state,
            ).valid,
            false,
        );
    },
);

test(
    'both Low Scene Opening modes reject fields outside their exact Schemas',
    () => {
        const {
            validateBootstrapSceneOpening,
        } = createOpeningWorkflow({});
        const bootstrap = {
            segments: [{
                type: 'narration',
                textEn:
                    Array.from(
                        {
                            length: 179,
                        },
                        () => 'word',
                    ).join(' '),
            }, {
                type: 'narration',
                textEn: 'Closing.',
            }],
        };
        assert.equal(
            validateBootstrapSceneOpening(
                bootstrap,
                {
                    actors: [],
                },
            ).valid,
            true,
        );
        assert.equal(
            validateBootstrapSceneOpening(
                {
                    ...bootstrap,
                    memoryUpdate: {},
                },
                {
                    actors: [],
                },
            ).valid,
            false,
        );
        assert.equal(
            validateBootstrapSceneOpening(
                {
                    segments: [{
                        ...bootstrap
                            .segments[0],
                        historicalClaims: [],
                    }, bootstrap
                        .segments[1]],
                },
                {
                    actors: [],
                },
            ).valid,
            false,
        );

        const transitionOpening = {
            segments: [{
                type: 'narration',
                textEn:
                    'The Library doors settle shut.',
            }, {
                type: 'dialogue',
                actorId: 'hermione',
                textEn:
                    'Yesterday, you hid my umbrella.',
                historicalClaims: [{
                    claimTextEn:
                        'Yesterday, you hid my umbrella.',
                    sourceEventIds: [
                        'event_umbrella',
                    ],
                }],
            }],
        };
        assert.equal(
            validateLowSceneOpeningOutput(
                transitionOpening,
                new Set([
                    'hermione',
                ]),
            ).valid,
            true,
        );
        assert.equal(
            validateLowSceneOpeningOutput(
                {
                    ...transitionOpening,
                    memoryUpdate: {},
                },
                new Set([
                    'hermione',
                ]),
            ).valid,
            false,
        );
        assert.equal(
            validateLowSceneOpeningOutput(
                {
                    segments: [
                        transitionOpening
                            .segments[0],
                        {
                            ...transitionOpening
                                .segments[1],
                            historicalClaims: [{
                                ...transitionOpening
                                    .segments[1]
                                    .historicalClaims[0],
                                memoryUpdate: {},
                            }],
                        },
                    ],
                },
                new Set([
                    'hermione',
                ]),
            ).valid,
            false,
        );
    },
);

test(
    'Narrative Authority is the single visible Item/Material/Room projection',
    () => {
        const snapshot =
            buildNarrativeAuthoritySnapshot({
                stateRevision: 4,
                clock:
                    '1991-09-02 · 12:00',
                scene: {
                    id: 'charms',
                },
                actors: [],
                actorPresentations: {},
                items: [
                    {
                        id: 'visible_quill',
                        type: 'object',
                        labelEn: 'Quill',
                        visibility: 'public',
                    },
                    {
                        id: 'hidden_note',
                        type: 'object',
                        labelEn:
                            'Hidden Note',
                        visibility: 'hidden',
                    },
                ],
                map: {
                    activeMapId:
                        'castle',
                    currentLocalNodeId:
                        'classroom',
                    roomStates: {
                        'castle:classroom': {
                            visibleResiduesEn: [
                                'Smoke marks the desk.',
                            ],
                            materialEffects: [{
                                duplicate:
                                    true,
                            }],
                        },
                    },
                },
            });
        assert.deepEqual(
            snapshot.currentItems
                .map(item =>
                    item.id),
            [
                'visible_quill',
            ],
        );
        assert.equal(
            snapshot.currentRoomState
                .materialEffects,
            undefined,
        );
    },
);

function mountedMapFixture() {
    return {
        id:
            'kings_cross_hogwarts_express_interior',
        worldAnchorId:
            'kings_cross',
        mount: {
            parentMapId:
                'kings_cross',
            parentRoomId:
                'hogwarts_express',
        },
        generatedBy:
            'medium-scene-director',
        name:
            '霍格沃茨特快 · 内部',
        nameEn:
            'Hogwarts Express Interior',
        defaultLevelId: 'train',
        defaultRoomId:
            'entry_vestibule',
        currentRoomId:
            'entry_vestibule',
        levels: [{
            id: 'train',
            name: '车厢',
            nameEn:
                'Carriage',
            z: 0,
        }],
        nodes: [{
            id: 'entry_vestibule',
            name: '上车前厅',
            nameEn:
                'Entry Vestibule',
            levelId: 'train',
            kind: 'vestibule',
        }, {
            id: 'student_compartment',
            name: '学生隔间',
            nameEn:
                'Student Compartment',
            levelId: 'train',
            kind: 'compartment',
        }],
        exits: [{
            from: 'entry_vestibule',
            to:
                'student_compartment',
            direction: 'forward',
            kind: 'corridor',
            minutes: 1,
            conditions: [],
        }],
    };
}

test(
    'Interior mount migration atomically replaces legacy bindings with one mount authority',
    () => {
        const legacyChild = {
            ...mountedMapFixture(),
            parentWorldNodeId:
                'kings_cross',
            parentMapId:
                'kings_cross',
            parentRoomId:
                'hogwarts_express',
            sourceContainerKey:
                'kings_cross:hogwarts_express',
        };
        delete legacyChild
            .worldAnchorId;
        delete legacyChild.mount;
        const state = {
            map: {
                activeMapId:
                    legacyChild.id,
                currentLocalNodeId:
                    'entry_vestibule',
                customLocalMaps: [
                    legacyChild,
                ],
                generatedLocalNodes: [],
                interiorMapBindings: {
                    'kings_cross:hogwarts_express':
                        legacyChild.id,
                },
            },
        };
        const before =
            structuredClone(state);
        const migration =
            migrateInteriorMountAuthority(
                state,
            );
        assert.equal(
            migration.changed,
            true,
        );
        assert.deepEqual(
            migration.stats,
            {
                mountedInteriorCount:
                    1,
                removedLegacyBindingCount:
                    1,
            },
        );
        assert.deepEqual(
            state,
            before,
            'migration must not mutate the source State',
        );
        assert.equal(
            Object.hasOwn(
                migration.state.map,
                'interiorMapBindings',
            ),
            false,
        );
        const child =
            migration.state.map
                .customLocalMaps[0];
        assert.deepEqual(
            getInteriorMount(child),
            {
                parentMapId:
                    'kings_cross',
                parentRoomId:
                    'hogwarts_express',
            },
        );
        assert.equal(
            child.worldAnchorId,
            'kings_cross',
        );
        for (const legacyField of [
            'parentWorldNodeId',
            'parentMapId',
            'parentRoomId',
            'sourceContainerKey',
        ]) {
            assert.equal(
                Object.hasOwn(
                    child,
                    legacyField,
                ),
                false,
            );
        }
        assert.equal(
            findMountedInteriorMap(
                migration.state.map,
                'kings_cross',
                'hogwarts_express',
            )?.id,
            child.id,
        );
        const repeated =
            migrateInteriorMountAuthority(
                migration.state,
            );
        assert.equal(
            repeated.changed,
            false,
        );
        assert.equal(
            repeated.state,
            migration.state,
        );
        const conflicting =
            structuredClone(before);
        conflicting.map
            .interiorMapBindings[
                'kings_cross:hogwarts_express'
            ] = 'wrong_child';
        assert.throws(
            () =>
                migrateInteriorMountAuthority(
                    conflicting,
                ),
            /not .*wrong_child|wrong_child.*not/iu,
        );
        assert.deepEqual(
            conflicting.map
                .customLocalMaps[0],
            before.map
                .customLocalMaps[0],
        );
    },
);

test(
    'mounted Interior movement, Scene destination and Calendar hierarchy preserve the parent room',
    () => {
        const child =
            mountedMapFixture();
        child.mount = {
            parentMapId:
                'test_station',
            parentRoomId:
                'registered_train',
        };
        const parentMap = {
            id: 'test_station',
            worldAnchorId:
                'kings_cross',
            name:
                'Test Station',
            nameEn:
                'Test Station',
            defaultLevelId:
                'station',
            levels: [{
                id: 'station',
                name: 'Station',
                nameEn:
                    'Station',
                z: 0,
            }],
            nodes: [{
                id: 'platform',
                name: 'Platform',
                nameEn:
                    'Platform',
                levelId:
                    'station',
            }, {
                id: 'registered_train',
                name:
                    'Registered Train',
                nameEn:
                    'Registered Train',
                levelId:
                    'station',
                kind: 'train',
            }],
            exits: [{
                from:
                    'registered_train',
                to: 'platform',
                direction: 'south',
                kind: 'door',
                minutes: 1,
                conditions: [],
            }],
        };
        const state = {
            clock:
                '1991-09-01 · 10:00',
            location:
                'Hogwarts Express Interior',
            map: {
                activeMapId:
                    child.id,
                currentLocalNodeId:
                    'entry_vestibule',
                currentLevelId:
                    'train',
                customLocalMaps: [
                    parentMap,
                    child,
                ],
                generatedLocalNodes: [],
                generatedLocalExits: [],
                discoveredLocalNodeIds:
                    [],
                exitStates: {},
            },
            scene: {
                id: 'boarding',
                mapId: child.id,
                roomId:
                    'entry_vestibule',
            },
            actors: [],
            actorLibrary: [],
            items: [],
            spatial: {
                version: 1,
                player: {
                    mapId:
                        child.id,
                    roomId:
                        'entry_vestibule',
                },
                lastMovement: null,
            },
        };
        const exited =
            applyPlayerMovement(
                state,
                '',
                {
                    confirmed: true,
                    confirmedDestination: {
                        mapId:
                            parentMap.id,
                        roomId:
                            'platform',
                        roomNameEn:
                            'Platform',
                        levelId:
                            'station',
                    },
                },
            );
        assert.equal(
            exited.movement.bridge,
            'interior_to_parent',
        );
        assert.equal(
            exited.state.map
                .activeMapId,
            parentMap.id,
        );
        const entered =
            applyPlayerMovement(
                exited.state,
                '',
                {
                    confirmed: true,
                    confirmedDestination: {
                        mapId:
                            child.id,
                        roomId:
                            'entry_vestibule',
                        roomNameEn:
                            'Entry Vestibule',
                        levelId:
                            'train',
                    },
                },
            );
        assert.equal(
            entered.movement.bridge,
            'parent_to_interior',
        );
        assert.equal(
            entered.state.map
                .activeMapId,
            child.id,
        );
        assert.equal(
            findSceneDestination(
                'Go to the Student Compartment.',
                state,
            )?.mapId,
            child.id,
        );
        const hierarchy =
            listMapsByMountHierarchy(
                state.map,
            );
        const parentIndex =
            hierarchy.findIndex(entry =>
                entry.map.id ===
                    parentMap.id);
        const childIndex =
            hierarchy.findIndex(entry =>
                entry.map.id ===
                    child.id);
        assert.equal(
            childIndex >
                parentIndex,
            true,
        );
        assert.equal(
            hierarchy[childIndex]
                .depth,
            1,
        );
        const calendarChild =
            buildCalendarLocationOptions(
                state,
            ).find(option =>
                option.id ===
                    child.id);
        assert.equal(
            calendarChild.depth,
            1,
        );
        assert.match(
            calendarChild.name,
            /Hogwarts Express|霍格沃茨特快/u,
        );
    },
);

test(
    'registered preset Interior enters without invoking the Cartographer',
    async () => {
        const presetChild = {
            ...mountedMapFixture(),
            id:
                'registered_train_interior',
        };
        delete presetChild.mount;
        const parentMap = {
            id: 'test_station',
            worldAnchorId:
                'kings_cross',
            name:
                'Test Station',
            nameEn:
                'Test Station',
            defaultLevelId:
                'station',
            levels: [{
                id: 'station',
                name: 'Station',
                nameEn:
                    'Station',
                z: 0,
            }],
            nodes: [{
                id: 'registered_train',
                name:
                    'Registered Train',
                nameEn:
                    'Registered Train',
                levelId:
                    'station',
                kind: 'train',
                tags: [
                    'requires_interior_map',
                    'preset_interior_map:registered_train_interior',
                ],
            }],
            exits: [],
        };
        const state = {
            location:
                'Registered Train',
            map: {
                activeMapId:
                    parentMap.id,
                currentLocalNodeId:
                    'registered_train',
                currentLevelId:
                    'station',
                customLocalMaps: [
                    parentMap,
                    presetChild,
                ],
                generatedLocalNodes: [],
                discoveredLocalNodeIds:
                    [],
            },
            scene: {
                id: 'registered_boarding',
                mapId: parentMap.id,
                roomId:
                    'registered_train',
            },
            actors: [],
            items: [],
            spatial: {
                version: 1,
                player: {
                    mapId:
                        parentMap.id,
                    roomId:
                        'registered_train',
                },
                lastMovement: null,
            },
        };
        const context = {
            chatMetadata: {
                hogwartsMud:
                    state,
            },
            saveMetadata:
                async () => {},
        };
        let modelCalls = 0;
        const workflow =
            createInteriorMapWorkflow({
                applySystemPrompt:
                    () => {},
                enterBoundInteriorMap,
                getContext:
                    () => context,
                getInspectorMapScope:
                    () => 'auto',
                getInteriorMapRequest,
                getLocalMapDefinition:
                    (mapId, mapState) =>
                        (
                            mapState
                                .customLocalMaps ||
                            []
                        ).find(map =>
                            map.id ===
                                mapId),
                getMudState:
                    () =>
                        context
                            .chatMetadata
                            .hogwartsMud,
                jobRegistry: {
                    interiorMap: null,
                },
                renderAll:
                    () => {},
                resetInspectorMapScope:
                    () => {},
                sendModelTaskRequest:
                    async () => {
                        modelCalls += 1;
                    },
            });
        const request =
            getInteriorMapRequest(
                state,
            );
        assert.equal(
            request.status,
            'ready',
        );
        const entered =
            await workflow
                .ensureCurrentInteriorMap();
        assert.equal(
            modelCalls,
            0,
        );
        assert.equal(
            entered.map
                .activeMapId,
            presetChild.id,
        );
        assert.deepEqual(
            getInteriorMount(
                entered.map
                    .customLocalMaps
                    .find(map =>
                        map.id ===
                            presetChild.id),
            ),
            {
                parentMapId:
                    parentMap.id,
                parentRoomId:
                    'registered_train',
            },
        );
    },
);

test(
    'model task catalog accounts for 20 tasks with 16 active and four explicit removals',
    () => {
        assert.deepEqual(
            validateModelTaskCatalog(),
            {
                valid: true,
                errors: [],
            },
        );
        assert.equal(
            MODEL_TASK_CATALOG.length,
            20,
        );
        assert.equal(
            MODEL_TASK_CATALOG
                .filter(task =>
                    task.status ===
                    'active')
                .length,
            16,
        );
        assert.deepEqual(
            MODEL_TASK_CATALOG
                .filter(task =>
                    task.status ===
                    'retired')
                .map(task =>
                    task.taskId)
                .sort(),
            [
                'daily_director',
                'director_foundation',
                'opening_dialogue',
                'opening_scene_plan',
            ],
        );
        const runtime =
            createDefaultModelTaskRuntime();
        assert.equal(
            Object.keys(
                runtime.byTaskId,
            ).length,
            16,
        );
        for (const retiredTaskId of [
            'daily_director',
            'director_foundation',
            'opening_dialogue',
            'opening_scene_plan',
        ]) {
            assert.equal(
                Object.hasOwn(
                    runtime.byTaskId,
                    retiredTaskId,
                ),
                false,
            );
        }
    },
);

test(
    'model event scheduler validates task, tier and event before invoking the model adapter',
    async () => {
        const attempts = [];
        const calls = [];
        const scheduler =
            createModelEventScheduler({
                getState: () => ({
                    timelineEpoch:
                        'epoch_a',
                    stateRevision: 8,
                    turn: {
                        count: 3,
                    },
                    scene: {
                        id: 'breakfast',
                    },
                }),
                invokeRole:
                    async (
                        slot,
                        messages,
                        options,
                    ) => {
                        calls.push({
                            slot,
                            messages,
                            options,
                        });
                        return {
                            content: 'ok',
                        };
                    },
                onAttempt:
                    envelope =>
                        attempts.push(
                            envelope,
                        ),
            });
        const request =
            scheduler.createRoleRequest(
                'pacing_director',
                {
                    eventType:
                        'turn.pre_generation',
                    emittedBy:
                        'turn.pacing_guard',
                    tier: 'medium',
                },
            );
        await request(
            {
                profileId:
                    'medium-profile',
            },
            [{
                role: 'user',
                content: 'test',
            }],
            {
                json: true,
                modelTaskActionId:
                    'turn:3',
            },
        );
        assert.equal(
            calls.length,
            1,
        );
        assert.deepEqual(
            calls[0].options,
            {
                json: true,
            },
        );
        assert.equal(
            attempts[0].taskId,
            'pacing_director',
        );
        assert.equal(
            attempts[0].event
                .actionId,
            'turn:3',
        );
        await assert.rejects(
            () =>
                scheduler.runRoleTask(
                    'pacing_director',
                    {},
                    [],
                    {
                        tier: 'high',
                    },
                    {
                        eventType:
                            'turn.pre_generation',
                        emittedBy: 'test',
                    },
                ),
            /cannot use tier high/u,
        );
        await assert.rejects(
            () =>
                scheduler.runRoleTask(
                    'pacing_director',
                    {},
                    [],
                    {
                        tier: 'medium',
                    },
                    {
                        eventType:
                            'turn.post_commit',
                        emittedBy: 'test',
                    },
                ),
            /cannot run for event/u,
        );
    },
);

test(
    'Low proposal Schema, fold and validator expose one exact first-impression contract',
    () => {
        const valid = {
            segments: [{
                type: 'narration',
                textEn:
                    'Hermione looks up from her notes.',
            }],
            stateProposals: [{
                type: 'social_hint',
                actorId: 'hermione',
                currentActivityEn:
                    'Watching the player from across the desk.',
                firstImpressionOfPlayerEn:
                    'A conspicuously eager classmate.',
            }],
            signals: {
                eventEnded: false,
            },
        };
        assert.deepEqual(
            validateLowScenePerformanceOutputContract(
                valid,
            ),
            {
                valid: true,
                errors: [],
            },
        );
        const folded =
            foldNarrativeTurnProposals(
                valid,
            );
        assert.deepEqual(
            folded.actorUpdates,
            [{
                id: 'hermione',
                currentActivityEn:
                    'Watching the player from across the desk.',
                firstImpressionOfPlayerEn:
                    'A conspicuously eager classmate.',
            }],
        );
        assert.equal(
            validateLowScenePerformanceOutputContract(
                valid,
                {
                    requireSceneProgression:
                        true,
                    requirePacingBeatRealized:
                        true,
                },
            ).valid,
            false,
        );
        const requiredSignals = {
            ...valid,
            signals: {
                eventEnded: false,
                pacingBeatRealized: true,
                sceneProgression: {
                    type:
                        'new_information',
                    summaryEn:
                        'Hermione identifies the next practical step.',
                    completedRequestedStep:
                        true,
                },
            },
        };
        assert.deepEqual(
            validateLowScenePerformanceOutputContract(
                requiredSignals,
                {
                    requireSceneProgression:
                        true,
                    requirePacingBeatRealized:
                        true,
                },
            ),
            {
                valid: true,
                errors: [],
            },
        );
        for (const forbidden of [
            {
                impressionOfPlayerEn:
                    'Too eager.',
            },
            {
                memoryUpdate: {
                    summaryEn:
                        'The player waved.',
                    significance:
                        'everyday',
                },
            },
        ]) {
            const result =
                validateLowScenePerformanceOutputContract({
                    ...valid,
                    stateProposals: [{
                        ...valid
                            .stateProposals[0],
                        ...forbidden,
                    }],
                });
            assert.equal(
                result.valid,
                false,
            );
        }
        const legacyFold =
            foldNarrativeTurnProposals({
                segments:
                    valid.segments,
                actorUpdates: [{
                    id: 'hermione',
                    memoryUpdate: {
                        summaryEn:
                            'Legacy memory.',
                        significance:
                            'everyday',
                    },
                }],
                itemUpdates: [{
                    id: 'legacy_item',
                    action: 'acquire',
                }],
                revealedClues: [
                    'legacy_clue',
                ],
            });
        assert.deepEqual(
            legacyFold.actorUpdates,
            [],
        );
        assert.deepEqual(
            legacyFold.itemUpdates,
            [],
        );
        assert.deepEqual(
            legacyFold.revealedClues,
            [],
        );
        const source =
            readFileSync(
                new URL(
                    '../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js',
                    import.meta.url,
                ),
                'utf8',
            );
        assert.doesNotMatch(
            source,
            /"impressionOfPlayerEn"\s*:/u,
        );
        assert.doesNotMatch(
            source,
            /"memoryUpdate"\s*:/u,
        );
    },
);

test(
    'mentioned-Actor settlement ignores legacy automatic-memory flags',
    () => {
        const settled =
            settleNarrativeTurnPerformance(
                {
                    segments: [{
                        type:
                            'narration',
                        textEn:
                            'Lavender nods back.',
                    }],
                    signals: {
                        eventEnded:
                            false,
                    },
                },
                {
                    actors: [],
                    actorLibrary: [],
                    items: [],
                    storyArcs: [],
                    map: {
                        activeMapId:
                            'test_map',
                        currentLocalNodeId:
                            'test_room',
                        customLocalMaps:
                            [],
                        generatedLocalNodes:
                            [],
                    },
                },
                {
                    admittedActors: [{
                        id: 'lavender',
                        requireReaction:
                            true,
                        requireEverydayMemory:
                            true,
                    }],
                },
            );
        assert.deepEqual(
            settled.actorUpdates,
            [],
        );
    },
);

test(
    'scheduler enforces product budget including transport JSON Schema before model invocation',
    async () => {
        const state = {
            timelineEpoch:
                'budget_epoch',
            stateRevision: 1,
            turn: {
                count: 1,
            },
            scene: {
                id: 'budget_scene',
            },
            modelTaskRuntime:
                createDefaultModelTaskRuntime(),
        };
        let calls = 0;
        const scheduler =
            createModelEventScheduler({
                getState:
                    () => state,
                invokeRole:
                    async () => {
                        calls += 1;
                        return {
                            content: '{}',
                        };
                    },
                enforceProductBudget:
                    true,
            });
        await assert.rejects(
            () =>
                scheduler.runRoleTask(
                    'social_director',
                    {
                        tier: 'medium',
                    },
                    [{
                        role: 'user',
                        content:
                            'x'.repeat(
                                75_000,
                            ),
                    }],
                    {
                        tier: 'medium',
                        jsonSchema: {
                            type: 'object',
                            description:
                                'y'.repeat(
                                    6_000,
                                ),
                        },
                    },
                    {
                        eventType:
                            'turn.post_commit',
                        emittedBy:
                            'budget.test',
                    },
                ),
            /above product budget/u,
        );
        assert.equal(
            calls,
            0,
        );
        assert.equal(
            state.modelTaskRuntime
                .byTaskId
                .social_director
                .attempted,
            0,
        );
    },
);

test(
    'Pacing triggers only once per Scene for a causal-collapse opportunity',
    () => {
        const state = {
            phase: 'playing',
            clock:
                '1991-09-03 · 10:30',
            turn: {
                count: 12,
            },
            scene: {
                id: 'library',
                timelineEntries:
                    Array.from(
                        {
                            length: 20,
                        },
                        () => ({}),
                    ),
            },
            map: {
                activeMapId:
                    'castle',
                currentLocalNodeId:
                    'library',
            },
            actorLibrary: [],
            actors: [],
            items: [{
                id: 'brass_key',
                labelEn:
                    'Brass Key',
                importance: 'key',
            }],
            pacingDirector: {
                status: 'idle',
                lastAssessedTurn:
                    null,
                lastAssessedSceneId:
                    '',
                pendingBeat: null,
            },
            causalCollapse: {
                minimumCheckIntervalTurns:
                    6,
                maximumBindingsPerScene:
                    1,
                checkedSlots: [],
                records: [],
            },
        };
        const signals =
            analyzePacingSignals(
                state,
                'Inspect the Brass Key.',
            );
        assert.equal(
            signals.shouldAssess,
            true,
        );
        assert.deepEqual(
            signals.reasons,
            [
                'causal_collapse_opportunity',
            ],
        );
        assert.equal(
            analyzePacingSignals(
                state,
                'Wait through the long scene.',
            ).shouldAssess,
            false,
        );
        state.pacingDirector
            .lastAssessedSceneId =
            'library';
        assert.equal(
            analyzePacingSignals(
                state,
                'Inspect the Brass Key.',
            ).shouldAssess,
            false,
        );
    },
);

test(
    'causal-only Pacing rejects filler and Actor admission while using a compact Prompt',
    () => {
        const state = {
            clock:
                '1991-09-03 · 10:30',
            scene: {
                id: 'library',
                summaryEn:
                    'The player examines an old key.',
            },
            map: {
                activeMapId:
                    'castle',
                currentLocalNodeId:
                    'library',
            },
            location:
                'Library',
            actorLibrary: [],
            actors: [],
            items: [{
                id: 'brass_key',
                labelEn:
                    'Brass Key',
                importance: 'key',
            }],
            eventKnowledge: [],
            causalCollapse: {
                records: [],
            },
        };
        const opportunity = {
            key:
                'item:brass_key:first_inspection',
            type:
                'first_item_inspection',
            focusActorId: '',
            mapId: 'castle',
            roomId: 'library',
            itemId: 'brass_key',
        };
        const signals = {
            reasons: [
                'causal_collapse_opportunity',
            ],
            metrics: {
                causalCollapseOpportunity:
                    opportunity,
            },
        };
        const hold =
            normalizePacingAssessmentPayload({
                decision: 'hold',
                diagnosisEn:
                    'No committed fact supports a prior history.',
                reassessAfterTurns: 6,
            });
        assert.deepEqual(
            validatePacingAssessment(
                hold,
                state,
                signals,
            ),
            {
                valid: true,
                errors: [],
            },
        );
        const filler = {
            ...hold,
            decision: 'intervene',
            intervention: {
                kind: 'minor_mishap',
                timing: 'this_turn',
                beatEn:
                    'A book falls.',
                pressureEn:
                    'Someone must catch it.',
                arcId: '',
                actorEntrances: [],
                temporaryActors: [],
                guestActor: null,
                identityMergeFromId: '',
                identityEvidenceEn: '',
                identityRevealed: false,
                causalCollapse: null,
            },
        };
        assert.equal(
            validatePacingAssessment(
                filler,
                state,
                signals,
            ).valid,
            false,
        );
        const workflow =
            createDirectorWorkflows({});
        const prompt =
            workflow
                .createPacingDirectorPrompt(
                    state,
                    signals,
                );
        const payload =
            JSON.parse(
                prompt[1].content,
            );
        assert.deepEqual(
            Object.keys(payload),
            [
                'causalOpportunity',
                'clock',
                'currentScene',
                'currentLocation',
                'actorDirectory',
                'currentItem',
                'recentCommittedEvents',
                'existingCausalFacts',
            ],
        );
        for (const legacyField of [
            'actorSelectionPolicy',
            'knownAbsentActors',
            'unmetAvailableActors',
            'recentScenes',
            'recentMessages',
            'mapAuthority',
            'guestActor',
            'actorEntrances',
        ]) {
            assert.equal(
                Object.hasOwn(
                    payload,
                    legacyField,
                ),
                false,
            );
        }
    },
);

test(
    'causal-only Pacing commits and consumes one fact without writing Actors',
    () => {
        const state =
            createInitialWorldState(
                {
                    identity: {
                        name: 'Tina',
                        age: 11,
                    },
                    background: {},
                    storyPreferences: {},
                },
                {
                    low: {},
                    medium: {},
                    high: {},
                },
            );
        state.phase = 'playing';
        state.clock =
            '1991-09-03 · 10:30';
        state.turn.count = 12;
        state.scene = {
            id: 'library',
        };
        state.map = {
            activeMapId: 'castle',
            currentLocalNodeId:
                'library',
            roomStates: {},
        };
        const opportunity = {
            key:
                'location:castle:library:first_observation',
            type:
                'first_location_observation',
            focusActorId: '',
            mapId: 'castle',
            roomId: 'library',
            itemId: '',
        };
        const signals = {
            reasons: [
                'causal_collapse_opportunity',
            ],
            metrics: {
                causalCollapseOpportunity:
                    opportunity,
            },
        };
        const payload =
            normalizePacingAssessmentPayload({
                decision:
                    'intervene',
                diagnosisEn:
                    'A prior institutional restriction has visible consequences in this room.',
                reassessAfterTurns: 6,
                intervention: {
                    kind:
                        'causal_collision',
                    timing:
                        'this_turn',
                    beatEn:
                        'Fresh sealing wax marks the restricted cabinet.',
                    pressureEn:
                        'The new seal blocks immediate access.',
                    arcId: '',
                    causalCollapse: {
                        kind:
                            'institutional_fact',
                        focusActorId: '',
                        relatedActorIds:
                            [],
                        itemId: '',
                        mapId:
                            'castle',
                        roomId:
                            'library',
                        effectiveMinutesBeforeObservation:
                            20,
                        factEn:
                            'A librarian sealed the cabinet shortly before the player arrived.',
                        edgeType: '',
                        visibleResiduesEn: [
                            'Fresh red wax seals the cabinet latch.',
                        ],
                        aftermathEn:
                            'Show the new seal before anyone explains it.',
                        witnessAccounts:
                            [],
                        sourceEventIds:
                            [],
                        persistenceTargets: [
                            'event',
                            'room_state',
                        ],
                        surfaceMode:
                            'aftermath',
                        consequenceMode:
                            'mixed',
                        irreversible:
                            false,
                        requiresHighTier:
                            false,
                    },
                },
            });
        const actorCoreCount =
            state.actorLibrary.length;
        const actorRuntimeCount =
            state.actors.length;
        const committed =
            applyPacingAssessment(
                state,
                payload,
                signals,
            );
        assert.equal(
            committed.actorLibrary
                .length,
            actorCoreCount,
        );
        assert.equal(
            committed.actors.length,
            actorRuntimeCount,
        );
        assert.equal(
            committed.pacingDirector
                .pendingBeat.kind,
            'causal_collision',
        );
        assert.equal(
            committed.causalCollapse
                .records.length,
            1,
        );
        const consumed =
            consumePacingBeat(
                committed,
            );
        assert.equal(
            consumed.causalCollapse
                .records[0].status,
            'surfaced',
        );
    },
);

test(
    'model task runtime normalization preserves unset revision fields and is idempotent',
    () => {
        const first =
            normalizeModelTaskRuntime(
                null,
            );
        const second =
            normalizeModelTaskRuntime(
                first,
            );
        assert.deepEqual(
            second,
            first,
        );
        assert.equal(
            first.byTaskId
                .scene_performance
                .lastAttemptedRevision,
            null,
        );
        assert.equal(
            first.byTaskId
                .scene_performance
                .lastCompletedRevision,
            null,
        );
        assert.equal(
            first.byTaskId
                .scene_performance
                .lastTurn,
            null,
        );
        assert.equal(
            first.byTaskId
                .scene_performance
                .nextEligibleTurn,
            null,
        );
    },
);

test(
    'model task runtime persists counters and shares one medium quota across an action',
    async () => {
        let state = {
            timelineEpoch: 'epoch_a',
            stateRevision: 9,
            revisionHistory: [],
            turn: {
                count: 4,
            },
            scene: {
                id: 'library',
            },
            modelTaskRuntime:
                createDefaultModelTaskRuntime(),
        };
        let persistedState =
            structuredClone(
                state,
            );
        beginModelTaskAction(
            state,
            'turn:5',
        );
        const scheduler =
            createModelEventScheduler({
                getState: () =>
                    state,
                persistRuntime:
                    async current => {
                        const committed =
                            prepareSaveRevisionCommit({
                                currentState:
                                    persistedState,
                                nextState:
                                    current,
                                source:
                                    'model_task_runtime',
                                changedDomains: [
                                    'model_task_runtime',
                                ],
                            });
                        persistedState =
                            structuredClone(
                                committed
                                    .state,
                            );
                        state =
                            structuredClone(
                                committed
                                    .state,
                            );
                    },
                invokeRole:
                    async () => ({
                        content: 'ok',
                    }),
            });
        await scheduler.runRoleTask(
            'pacing_director',
            {},
            [],
            {
                tier: 'medium',
            },
            {
                eventType:
                    'turn.pre_generation',
                emittedBy:
                    'turn.pacing_guard',
            },
        );
        assert.equal(
            state.modelTaskRuntime
                .byTaskId
                .pacing_director
                .attempted,
            1,
        );
        assert.equal(
            state.modelTaskRuntime
                .byTaskId
                .pacing_director
                .succeeded,
            1,
        );
        await assert.rejects(
            () =>
                scheduler.runRoleTask(
                    'social_director',
                    {},
                    [],
                    {
                        tier: 'medium',
                    },
                    {
                        eventType:
                            'turn.post_commit',
                        emittedBy:
                            'social.memory_guard',
                    },
                ),
            error =>
                error?.code ===
                'MODEL_TASK_DEFERRED',
        );
        assert.equal(
            state.modelTaskRuntime
                .byTaskId
                .social_director
                .deferred,
            1,
        );
        assert.deepEqual(
            state.modelTaskRuntime
                .quotaWindows
                .medium
                .usedTaskIds,
            [
                'pacing_director',
            ],
        );
        assert.deepEqual(
            state.revisionHistory
                .map(entry => ({
                    source:
                        entry.source,
                    changedDomains:
                        entry
                            .changedDomains,
                })),
            state.revisionHistory
                .map(() => ({
                    source:
                        'model_task_runtime',
                    changedDomains: [
                        'model_task_runtime',
                    ],
                })),
        );
        await assert.rejects(
            () =>
                scheduler.runLocalTask(
                    'local_pre_turn_adjudicator',
                    async () => {
                        throw new Error(
                            'local failure',
                        );
                    },
                    {
                        eventType:
                            'turn.pre_generation',
                        emittedBy:
                            'turn.local_adjudication',
                    },
                ),
            /local failure/u,
        );
        assert.equal(
            state.modelTaskRuntime
                .byTaskId
                .local_pre_turn_adjudicator
                .attempted,
            1,
        );
        assert.equal(
            state.modelTaskRuntime
                .byTaskId
                .local_pre_turn_adjudicator
                .failed,
            1,
        );
    },
);

test(
    'memory boundary guard accepts contiguous scheduler-ledger revisions only',
    () => {
        const state = {
            timelineEpoch:
                'epoch_guard',
            stateRevision: 4,
            revisionHistory: [],
            clock:
                '1991-09-03 · 10:30',
            turn: {
                count: 12,
            },
            scene: {
                id: 'library',
            },
            memoryDirector: {
                pendingEventBoundary: {
                    id:
                        'library:event:12',
                    boundaryId:
                        'library:event:12',
                    status: 'pending',
                },
            },
        };
        const guard =
            captureMemoryBoundaryGuard(
                state,
            );
        const ledgerOnly = {
            ...structuredClone(
                state,
            ),
            stateRevision: 5,
            revisionHistory: [{
                id:
                    'revision_epoch_guard_5',
                baseRevision: 4,
                revision: 5,
                source:
                    'model_task_runtime',
                committedAt:
                    '1991-09-03T10:30:00.000Z',
                changedDomains: [
                    'model_task_runtime',
                ],
                itemChanges: [],
                identityChanges: [],
            }],
        };
        assert.equal(
            isMemoryBoundaryGuardCurrent(
                ledgerOnly,
                guard,
            ),
            true,
        );
        assert.equal(
            isMemoryBoundaryGuardCurrent(
                {
                    ...ledgerOnly,
                    revisionHistory: [{
                        ...ledgerOnly
                            .revisionHistory[0],
                        source: 'metadata',
                        changedDomains: [
                            'world',
                        ],
                    }],
                },
                guard,
            ),
            false,
        );
        assert.equal(
            isMemoryBoundaryGuardCurrent(
                {
                    ...ledgerOnly,
                    revisionHistory: [],
                },
                guard,
            ),
            false,
        );
    },
);

test(
    'deferred Social work stays pending without failing committed State',
    async () => {
        const state = {
            timelineEpoch:
                'epoch_social',
            stateRevision: 4,
            clock:
                '1991-09-03 · 10:30',
            turn: {
                count: 12,
            },
            scene: {
                id: 'library',
                startedMessageId: 0,
            },
            map: {
                activeMapId:
                    'castle',
                currentLocalNodeId:
                    'library',
            },
            actors: [],
            actorLibrary: [],
            actorMemoryIndex: {
                byActorId: {},
            },
            eventKnowledge: [{
                eventId: 'event_wait',
                kind: 'observed',
                sceneId: 'library',
                clock:
                    '1991-09-03 · 10:30',
                summaryEn:
                    'The player waits in the library.',
                sourceMessageIds: [
                    0,
                ],
                participantActorIds: [],
                witnessActorIds: [],
            }],
            memorySynapse: {
                appraisals: [],
                personSchemas: [],
            },
            socialGraph: {
                extractorVersion: 3,
                lastProcessedMessageId:
                    -1,
                backfillPendingSceneId:
                    '',
                status: 'ready',
                error: '',
                relationshipEvidence: [],
                relationships: [],
            },
            memoryDirector: {
                status: 'pending',
                error: '',
            },
            modelSlots: {},
        };
        const context = {
            chat: [{
                is_user: true,
                mes:
                    'I wait in the library.',
            }],
            chatMetadata: {
                hogwartsMud: state,
            },
            saveMetadata:
                async () => {},
        };
        const normalizeGraph =
            graph => ({
                extractorVersion: 3,
                lastProcessedMessageId:
                    -1,
                backfillPendingSceneId:
                    '',
                status: 'ready',
                error: '',
                relationshipEvidence: [],
                relationships: [],
                ...(graph || {}),
            });
        const workflow =
            createSocialMemoryWorkflow({
                CONTEXT_SIZE_PRESETS: {
                    rich: 64_000,
                },
                DEFAULT_MODEL_SLOTS: {
                    medium: {
                        maxResponseLength:
                            8_000,
                    },
                },
                SOCIAL_GRAPH_EXTRACTOR_VERSION:
                    3,
                analyzeMemoryConsolidation:
                    () => ({
                        shouldReview: true,
                        actors: [],
                    }),
                applySystemPrompt:
                    () => {},
                buildSocialAudienceProjection:
                    () => ({
                        relationships: [],
                    }),
                captureMemoryBoundaryGuard:
                    () => ({
                        boundaryId:
                            'boundary_wait',
                    }),
                createContextBudgetPlan:
                    () => ({}),
                getContext:
                    () => context,
                getMudState:
                    () =>
                        context
                            .chatMetadata
                            .hogwartsMud,
                isMemoryBoundaryGuardCurrent:
                    () => true,
                jobRegistry: {
                    memory: null,
                    socialCatchupAttempts:
                        new Set(),
                },
                normalizeActorMemoryProfile:
                    actor => actor,
                normalizeSocialGraph:
                    normalizeGraph,
                renderAll:
                    () => {},
                resolveRoleSlots:
                    () => ({
                        medium: {
                            contextSize:
                                64_000,
                            maxResponseLength:
                                8_000,
                        },
                    }),
                selectSharedMemoriesForContext:
                    memories =>
                        memories,
                sendModelTaskRequest:
                    async () => {
                        const error =
                            new Error(
                                'quota used',
                            );
                        error.code =
                            'MODEL_TASK_DEFERRED';
                        throw error;
                    },
                syncLocalKnowledge:
                    async () => {},
            });
        await workflow
            .ensureMemoryConsolidation();
        assert.equal(
            state.socialGraph.status,
            'pending',
        );
        assert.equal(
            state.socialGraph.error,
            '',
        );
        assert.equal(
            state.memoryDirector
                .status,
            'pending',
        );
        assert.equal(
            state.memoryDirector
                .error,
            '',
        );
    },
);

test(
    'every catalog task has a deterministic budget and allocator trims whole oldest records',
    () => {
        for (const definition of
            MODEL_TASK_CATALOG) {
            const policy =
                getTaskPromptBudgetPolicy(
                    definition.taskId,
                );
            assert.equal(
                policy.taskId,
                definition.taskId,
            );
            assert.equal(
                Number.isSafeInteger(
                    policy
                        .maximumCharacters,
                ),
                true,
            );
        }
        const allocation =
            allocatePromptSections({
                taskId:
                    'scene_performance',
                runtimeMaximumCharacters:
                    350,
                sections: [
                    {
                        key: 'system',
                        value: 'S'.repeat(
                            100,
                        ),
                        protected: true,
                    },
                    {
                        key: 'schema',
                        value: 'Q'.repeat(
                            80,
                        ),
                        protected: true,
                    },
                    {
                        key: 'playerTurn',
                        value: 'look',
                        protected: true,
                    },
                    {
                        key:
                            'memoryActivations',
                        value: [
                            'old'.repeat(
                                20,
                            ),
                            'middle'.repeat(
                                20,
                            ),
                            'new'.repeat(
                                20,
                            ),
                        ],
                        trim:
                            'oldest_records',
                    },
                ],
            });
        assert.equal(
            allocation.characters <=
                350,
            true,
        );
        assert.equal(
            allocation.value.system
                .length,
            100,
        );
        assert.equal(
            allocation.value.schema
                .length,
            80,
        );
        assert.equal(
            allocation.value
                .memoryActivations
                .at(-1),
            'new'.repeat(20),
        );
        assert.equal(
            allocation.omitted
                .some(item =>
                    item.reason ===
                    'oldest_records'),
            true,
        );
    },
);
