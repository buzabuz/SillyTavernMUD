/* eslint-disable playwright/expect-expect */
import {
    normalizeScenePerformanceActorLocations,
} from '../public/scripts/extensions/hogwarts-mud/domain/spatial-performance.js';
import {
    applyTurnTransaction,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import {
    validateSceneTemporalConsistency,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-time.js';
import {
    validateScenePerformance,
    validateTurnTransaction,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-validation.js';
import {
    guardPreTurnEvidenceRoutes,
} from '../public/scripts/extensions/hogwarts-mud/domain/pre-turn-route-guards.js';
import {
    POST_TURN_CONTEXT_SIZE,
    createPostTurnModelRequest,
    createPreTurnModelRequest,
    validatePreTurnCalendarCommitment,
} from '../src/hogwarts-mud/local-semantic-adjudicator.js';
import {
    createCurrentActorProposal,
    createCurrentPlayingState,
    normalizeCurrentActorFixtureInPlace,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('pre-turn Calendar commitment requires exact structured player evidence', () => {
    const input = {
        playerAction:
            '我答应你周末和你约会。',
    };
    assert.deepEqual(
        validatePreTurnCalendarCommitment(
            {
                requested: true,
                evidenceText:
                    '我答应你周末和你约会。',
                confidence: 0.96,
            },
            input,
        ),
        {
            valid: true,
            value: {
                requested: true,
                evidenceText:
                    '我答应你周末和你约会。',
                confidence: 0.96,
            },
            error: '',
        },
    );
    const rejected =
        validatePreTurnCalendarCommitment(
            {
                requested: true,
                evidenceText:
                    'I promise to meet tomorrow.',
                confidence: 0.96,
            },
            input,
        );
    assert.equal(
        rejected.valid,
        false,
    );
    assert.deepEqual(
        rejected.value,
        {
            requested: false,
            evidenceText: '',
            confidence: 0,
        },
    );
    assert.deepEqual(
        validatePreTurnCalendarCommitment(
            {
                requested: false,
                evidenceText: '',
                confidence: 0.8,
            },
            {
                playerAction:
                    '也许以后可以约会。',
            },
        ).value,
        {
            requested: false,
            evidenceText: '',
            confidence: 0,
        },
    );
});

test('browser pre-turn route guard rejects ungrounded Calendar evidence', () => {
    const guarded =
        guardPreTurnEvidenceRoutes(
            {
                result: {
                    calendarCommitment: {
                        requested: true,
                        evidenceText:
                            'Meet tomorrow.',
                        confidence: 0.9,
                    },
                },
                diagnostics: {},
            },
            'Open the door.',
        );
    assert.deepEqual(
        guarded.result
            .calendarCommitment,
        {
            requested: false,
            evidenceText: '',
            confidence: 0,
        },
    );
    assert.equal(
        guarded.diagnostics
            .calendarCommitmentRejected,
        true,
    );
});

test('local pre and post build-only requests expose the exact production contract', () => {
    const preInput = {
        playerAction: 'Wait.',
    };
    const postInput = {
        narrativeSegments: [],
    };
    const pre =
        createPreTurnModelRequest(
            preInput,
        );
    const post =
        createPostTurnModelRequest(
            postInput,
        );
    assert.equal(
        pre.input,
        preInput,
    );
    assert.equal(
        pre.exactContextSize,
        undefined,
    );
    assert.equal(
        post.input,
        postInput,
    );
    assert.equal(
        pre.jsonSchema.properties
            .calendarCommitment.type,
        'object',
    );
    assert.deepEqual(
        Object.keys(
            pre.jsonSchema.properties,
        ),
        [
            'schemaVersion',
            'calendarCommitment',
            'temporal',
            'check',
            'movementIntent',
        ],
    );
    assert.doesNotMatch(
        pre.system,
        /recentGuideEvidence/u,
    );
    const movementPre =
        createPreTurnModelRequest({
            ...preInput,
            room: {
                rooms: [],
            },
            movementContext: {
                mapId: 'hogwarts',
                currentRoomId:
                    'charms_classroom',
                eligibleGuideCandidates:
                    [],
                recentGuideEvidence: [],
                trigger: {
                    raw:
                        '→【Follow Hermione】',
                },
            },
        });
    assert.deepEqual(
        Object.keys(
            movementPre
                .jsonSchema
                .properties,
        ),
        [
            'schemaVersion',
            'movementIntent',
            'calendarCommitment',
            'temporal',
            'check',
        ],
    );
    assert.match(
        movementPre.system,
        /recentGuideEvidence/u,
    );
    assert.equal(
        Object.hasOwn(
            pre.jsonSchema.properties,
            'progression',
        ),
        false,
    );
    assert.equal(
        post.jsonSchema.properties
            .temporalClaims.type,
        'array',
    );
    assert.equal(
        Object.hasOwn(
            post.jsonSchema.properties,
            'eventBoundary',
        ),
        false,
    );
    assert.equal(
        post.unload,
        true,
    );
    assert.equal(
        post.exactContextSize,
        POST_TURN_CONTEXT_SIZE,
    );
    assert.equal(
        POST_TURN_CONTEXT_SIZE,
        4_096,
    );
});

test('scene performance requires substantial narration for a fifteen-minute turn', () => {
    const words = (prefix, count) => Array.from(
        { length: count },
        (_, index) => `${prefix}${index}`,
    ).join(' ');
    const state = {
        clock: '1991-07-24 · 11:15',
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'kitchen',
        },
        actors: [{
            id:
                'minerva_mcgonagall',
            mapId:
                'hogwarts_castle',
            roomId:
                'kitchen',
            locationKnown: true,
            present: true,
        }],
        actorLibrary: [{
            id: 'minerva_mcgonagall',
            nameEn:
                'Minerva McGonagall',
            impressionOfPlayerEn:
                'A difficult child with unexpected nerve.',
            impressionUpdatedTurn: 0,
        }],
        turn: {
            count: 5,
        },
    };
    normalizeCurrentActorFixtureInPlace(
        state,
    );
    const budget = {
        elapsedMinutes: 15,
        minimumWords: 240,
        maximumWords: 560,
    };
    const validPayload = {
        publicEventEn: 'Tina lets McGonagall enter, attempts to trip her, and faces the professor across the kitchen table.',
        actorPresence: {
            presentActorIdsAfterTurn: [
                'minerva_mcgonagall',
            ],
        },
        segments: [
            { type: 'narration', textEn: words('movement', 45) },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('reply', 45) },
            { type: 'narration', textEn: words('setting', 45) },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('question', 45) },
        ],
        actorUpdates: [{
            id: 'minerva_mcgonagall',
            present: true,
            currentActivityEn: 'Sitting at the kitchen table opposite Tina.',
        }],
    };
    const valid = validateScenePerformance(
        validPayload,
        state,
        budget,
    );
    assert.deepEqual(valid, { valid: true, errors: [] });
    const compactPayload =
        structuredClone(validPayload);
    compactPayload.segments = [{
        type: 'narration',
        textEn:
            'Hermione glances down at her wand.',
    }, {
        type: 'dialogue',
        actorId:
            'minerva_mcgonagall',
        textEn:
            'It is wood, not crystal.',
    }];
    assert.deepEqual(
        validateScenePerformance(
            compactPayload,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const placeholderPayload = {
        ...structuredClone(
            compactPayload,
        ),
        protocolVersion: 2,
        segments: [{
            type: 'narration',
            textEn: '...',
        }, {
            type: 'dialogue',
            actorId:
                'minerva_mcgonagall',
            textEn: '……',
        }, {
            type: 'narration',
            textEn: 'TBD',
        }],
    };
    assert.match(
        validateScenePerformance(
            placeholderPayload,
            state,
            budget,
        ).errors.join('；'),
        /省略号或占位文本/u,
    );
    const firstSightState =
        createCurrentPlayingState();
    firstSightState.actorMemoryIndex
        .byActorId
        .minerva_mcgonagall
        .firstImpressionRef = '';
    const firstSightPayload = {
        ...structuredClone(validPayload),
        actorPresence: {
            presentActorIdsAfterTurn:
                firstSightState.actors
                    .filter(actor =>
                        actor.present !== false)
                    .map(actor =>
                        actor.id),
        },
        actorUpdates: [{
            id: 'minerva_mcgonagall',
            present: true,
            currentActivityEn:
                'Watching Tina from across the kitchen.',
        }],
    };
    assert.deepEqual(
        validateScenePerformance(
            firstSightPayload,
            firstSightState,
            budget,
        ),
        { valid: true, errors: [] },
    );
    firstSightPayload.actorUpdates[0]
        .firstImpressionOfPlayerEn =
        'A small Chinese girl in careful clothes, watching adults with guarded concentration.';
    assert.deepEqual(
        validateScenePerformance(
            firstSightPayload,
            firstSightState,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const firstSightCommitted =
        applyTurnTransaction(
            firstSightState,
            {
                elapsedMinutes: 15,
                publicEventEn:
                    firstSightPayload
                        .publicEventEn,
                actorPresence:
                    firstSightPayload
                        .actorPresence,
                segments:
                    firstSightPayload
                        .segments,
                actorUpdates:
                    firstSightPayload
                        .actorUpdates,
                itemUpdates: [],
                revealedClues: [],
            },
            'I answer the professor.',
        );
    const committedFirstImpressionRef =
        firstSightCommitted
            .actorMemoryIndex
            .byActorId
            .minerva_mcgonagall
            .firstImpressionRef;
    assert.equal(
        firstSightCommitted
            .memorySynapse
            .appraisals
            .find(appraisal =>
                appraisal.id ===
                    committedFirstImpressionRef)
            .summaryEn,
        firstSightPayload
            .actorUpdates[0]
            .firstImpressionOfPlayerEn,
    );
    assert.equal(
        validateScenePerformance(
            firstSightPayload,
            firstSightCommitted,
            budget,
        ).valid,
        false,
    );
    const activityRecap =
        structuredClone(validPayload);
    activityRecap.actorUpdates[0]
        .impressionOfPlayerEn =
        'Currently annoyed by Tina at the kitchen table.';
    assert.match(
        validateScenePerformance(
            activityRecap,
            state,
            budget,
        ).errors.join('；'),
        /不得写入.*impressionOfPlayerEn/u,
    );
    delete activityRecap
        .actorUpdates[0]
        .impressionOfPlayerEn;
    const normalizedActivityRecap =
        normalizeScenePerformanceActorLocations(
            activityRecap,
            state,
        );
    assert.equal(
        normalizedActivityRecap
            .actorUpdates[0]
            .impressionOfPlayerEn,
        undefined,
    );
    assert.equal(
        normalizedActivityRecap
            .actorUpdates[0]
            .currentActivityEn,
        activityRecap.actorUpdates[0]
            .currentActivityEn,
    );
    assert.deepEqual(
        validateScenePerformance(
            normalizedActivityRecap,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const longPayload =
        structuredClone(validPayload);
    longPayload.segments[0].textEn =
        words('extended', 800);
    assert.deepEqual(
        validateScenePerformance(
            longPayload,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const movement = {
        moved: true,
        toMapId: 'diagon_alley',
        toRoomId: 'gringotts_steps',
        toRoomName: '古灵阁台阶',
        toRoomNameEn: 'Gringotts',
    };
    const missingArrival =
        validateScenePerformance(
            validPayload,
            state,
            budget,
            null,
            null,
            movement,
        );
    assert.equal(missingArrival.valid, false);
    assert.match(
        missingArrival.errors.join('；'),
        /明确抵达/,
    );
    const arrivedPayload =
        structuredClone(validPayload);
    arrivedPayload.publicEventEn +=
        ' They arrive at Gringotts.';
    assert.deepEqual(
        validateScenePerformance(
            arrivedPayload,
            state,
            budget,
            null,
            null,
            movement,
        ),
        { valid: true, errors: [] },
    );
    const localizedDestination =
        structuredClone(validPayload);
    localizedDestination.publicEventEn +=
        ' They reach the southern stretch of Diagon Alley.';
    assert.deepEqual(
        validateScenePerformance(
            localizedDestination,
            state,
            budget,
            null,
            null,
            {
                moved: true,
                toMapId: 'diagon_alley',
                toRoomId: 'diagon_south',
                toRoomName: '对角巷南段',
                toRoomNameEn: '对角巷南段',
            },
        ),
        { valid: true, errors: [] },
    );
    const possessiveDestination =
        structuredClone(validPayload);
    possessiveDestination.publicEventEn +=
        ' They enter Madam Malkin\'s robe shop.';
    assert.deepEqual(
        validateScenePerformance(
            possessiveDestination,
            state,
            budget,
            null,
            null,
            {
                moved: true,
                toMapId: 'diagon_alley',
                toRoomId: 'madam_malkins',
                toRoomName: '摩金夫人长袍店',
                toRoomNameEn: '摩金夫人长袍店',
            },
        ),
        { valid: true, errors: [] },
    );
    const playerDialogue =
        structuredClone(validPayload);
    playerDialogue.segments[1].actorId =
        'player_tina';
    const invalidPlayerDialogue =
        validateScenePerformance(
            playerDialogue,
            state,
            budget,
        );
    assert.equal(invalidPlayerDialogue.valid, false);
    assert.match(
        invalidPlayerDialogue.errors.join('；'),
        /player_tina/,
    );
    const missingCompanionUpdate =
        validateScenePerformance(
            arrivedPayload,
            state,
            budget,
            null,
            null,
            {
                ...movement,
                companionIds: [
                    'minerva_mcgonagall',
                ],
            },
        );
    assert.equal(
        missingCompanionUpdate.valid,
        false,
    );
    assert.match(
        missingCompanionUpdate.errors.join('；'),
        /同行者/,
    );
    const pacingState = {
        ...state,
        pacingDirector: {
            pendingBeat: {
                status: 'pending',
                kind: 'complication',
                beatEn: 'A delivery crashes into the doorway.',
                pressureEn: 'Someone must identify the missing parcel.',
                actorEntrances: [],
                guestActor: null,
            },
        },
    };
    const pacingPayload = {
        publicEventEn: 'A delivery crashes into the doorway and interrupts the discussion.',
        pacingBeatRealized: false,
        actorPresence: {
            presentActorIdsAfterTurn: [
                'minerva_mcgonagall',
            ],
        },
        segments: [
            { type: 'narration', textEn: words('arrival', 45) },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('reply', 45) },
            { type: 'narration', textEn: words('parcel', 45) },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('question', 45) },
        ],
        actorUpdates: [{
            id: 'minerva_mcgonagall',
            present: true,
            currentActivityEn: 'Inspecting the parcel at the doorway.',
        }],
    };
    const ignoredPacing = validateScenePerformance(
        pacingPayload,
        pacingState,
        budget,
    );
    assert.equal(ignoredPacing.valid, false);
    assert.match(ignoredPacing.errors.join('；'), /节奏转机/);
    pacingPayload.pacingBeatRealized = true;
    assert.deepEqual(
        validateScenePerformance(
            pacingPayload,
            pacingState,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const momentum = {
        required: true,
    };
    const missingProgress = validateScenePerformance(
        pacingPayload,
        pacingState,
        budget,
        momentum,
    );
    assert.equal(missingProgress.valid, false);
    assert.match(
        missingProgress.errors.join('；'),
        /sceneProgression/,
    );
    pacingPayload.sceneProgression = {
        type: 'access_change',
        summaryEn: 'McGonagall opens the brick wall and reveals the archway.',
    };
    assert.deepEqual(
        validateScenePerformance(
            pacingPayload,
            pacingState,
            budget,
            momentum,
        ),
        { valid: true, errors: [] },
    );
    const failedRequestedStep =
        structuredClone(pacingPayload);
    failedRequestedStep.checkApplied =
        true;
    failedRequestedStep
        .sceneProgression = {
            type: 'social_shift',
            summaryEn:
                'Hermione catches Tina searching her books and takes them back.',
        };
    assert.deepEqual(
        validateScenePerformance(
            failedRequestedStep,
            pacingState,
            budget,
            momentum,
            {
                id: 'failed-check',
                outcome: 'failure',
            },
        ),
        { valid: true, errors: [] },
    );
    const checkPayload = structuredClone(pacingPayload);
    const ignoredCheck = validateScenePerformance(
        checkPayload,
        pacingState,
        budget,
        momentum,
        { id: 'local-check' },
    );
    assert.equal(ignoredCheck.valid, false);
    assert.match(
        ignoredCheck.errors.join('；'),
        /本地判定结果/,
    );
    checkPayload.checkApplied = true;
    assert.deepEqual(
        validateScenePerformance(
            checkPayload,
            pacingState,
            budget,
            momentum,
            { id: 'local-check' },
        ),
        { valid: true, errors: [] },
    );
    const missingPresence =
        structuredClone(validPayload);
    delete missingPresence.actorPresence;
    assert.match(
        validateScenePerformance(
            missingPresence,
            state,
            budget,
        ).errors.join('；'),
        /完整的回合结束在场人物名单/,
    );
    const normalizedMissingPresence =
        normalizeScenePerformanceActorLocations(
            missingPresence,
            state,
        );
    assert.deepEqual(
        normalizedMissingPresence
            .actorPresence
            .presentActorIdsAfterTurn,
        state.actors
            .filter(actor =>
                actor.present !== false)
            .map(actor =>
                actor.id),
    );
    assert.deepEqual(
        validateScenePerformance(
            normalizedMissingPresence,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const exitedPayload =
        structuredClone(validPayload);
    exitedPayload.actorPresence
        .presentActorIdsAfterTurn = [];
    exitedPayload.actorUpdates[0].present =
        false;
    exitedPayload.actorUpdates[0]
        .currentActivityEn =
        'Continuing down the corridor after leaving the kitchen.';
    assert.deepEqual(
        validateScenePerformance(
            exitedPayload,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const exitedState = applyTurnTransaction(
        state,
        {
            elapsedMinutes: 15,
            publicEventEn:
                exitedPayload.publicEventEn,
            actorPresence:
                exitedPayload.actorPresence,
            segments:
                exitedPayload.segments,
            actorUpdates:
                exitedPayload.actorUpdates,
            itemUpdates: [],
            revealedClues: [],
        },
        'I wave goodbye.',
    );
    assert.equal(
        exitedState.actors[0].present,
        false,
    );
    const mismatchedPresence =
        structuredClone(exitedPayload);
    mismatchedPresence.actorUpdates[0]
        .present = true;
    assert.match(
        validateScenePerformance(
            mismatchedPresence,
            state,
            budget,
        ).errors.join('；'),
        /present 与回合结束在场名单不一致/,
    );
    const temporaryId =
        'temp_corridor_prefect_01';
    const temporaryEntrance =
        createCurrentActorProposal(
            temporaryId,
            {
                nameEn:
                    'Slytherin Prefect',
                roleEn:
                    'Passing Slytherin prefect',
                roomId:
                    state.map
                        ?.currentLocalNodeId ||
                    '',
                relationship:
                    '',
            },
        );
    temporaryEntrance.runtime
        .currentActivityEn =
        'Pausing in the corridor after Tina calls out.';
    temporaryEntrance.privateFacts = {
        secretEn: '',
        knowledgeEn: [],
    };
    temporaryEntrance
        .initialRelationshipToPlayerEn =
        '';
    temporaryEntrance
        .firstImpressionOfPlayerEn =
        '';
    const directAddressPayload =
        structuredClone(validPayload);
    directAddressPayload
        .temporaryActorEntrances = [
            temporaryEntrance,
        ];
    directAddressPayload
        .actorPresence
        .presentActorIdsAfterTurn
        .push(temporaryId);
    directAddressPayload.segments[1] = {
        type: 'dialogue',
        actorId: temporaryId,
        textEn:
            words('prefect_reply', 45),
    };
    directAddressPayload.actorUpdates
        .push({
            id: temporaryId,
            present: true,
            currentActivityEn:
                'Standing in the corridor and refusing Tina\'s order.',
        });
    assert.deepEqual(
        validateScenePerformance(
            directAddressPayload,
            state,
            budget,
        ),
        { valid: true, errors: [] },
    );
    const temporaryCommitted =
        applyTurnTransaction(
            state,
            {
                elapsedMinutes: 15,
                publicEventEn:
                    directAddressPayload
                        .publicEventEn,
                actorPresence:
                    directAddressPayload
                        .actorPresence,
                temporaryActorEntrances:
                    directAddressPayload
                        .temporaryActorEntrances,
                segments:
                    directAddressPayload
                        .segments,
                actorUpdates:
                    directAddressPayload
                        .actorUpdates,
                itemUpdates: [],
                revealedClues: [],
            },
            'I shout to the Slytherin prefect.',
        );
    assert.equal(
        temporaryCommitted
            .actors.find(actor =>
                actor.id === temporaryId)
            .temporary,
        true,
    );
    assert.equal(
        temporaryCommitted
            .actorLibrary.some(actor =>
                actor.id === temporaryId),
        true,
    );
    const localizedTemporaryTransaction = {
        protocolVersion: 2,
        elapsedMinutes: 15,
        publicEventEn:
            directAddressPayload
                .publicEventEn,
        actorPresence:
            structuredClone(
                directAddressPayload
                    .actorPresence,
            ),
        temporaryActorEntrances: [{
            ...temporaryEntrance,
            name:
                '斯莱特林级长',
            role:
                '路过的斯莱特林级长',
            publicDescription:
                '一名高个学生。',
            personality:
                '忙碌、冷淡、警觉。',
            speechStyle:
                '简短而不耐烦。',
            currentActivity:
                '被蒂娜叫住后停在走廊里。',
        }],
        segments:
            structuredClone(
                directAddressPayload
                    .segments,
            ),
        actorUpdates:
            structuredClone(
                directAddressPayload
                    .actorUpdates,
            ),
        itemUpdates: [],
        revealedClues: [],
    };
    assert.match(
        validateTurnTransaction(
            localizedTemporaryTransaction,
            state,
        ).errors.join('；'),
        /Actor creation proposal fields are invalid/u,
    );
    const missingTemporaryUpdate =
        structuredClone(
            directAddressPayload,
        );
    missingTemporaryUpdate.actorUpdates =
        missingTemporaryUpdate
            .actorUpdates
            .filter(update =>
                update.id !==
                temporaryId);
    assert.match(
        validateScenePerformance(
            missingTemporaryUpdate,
            state,
            budget,
        ).errors.join('；'),
        /临时入场人物.*最终在场状态一致/,
    );

    const invalid = validateScenePerformance({
        publicEventEn: 'The player completes the stated action and the characters respond.',
        segments: [
            { type: 'narration', textEn: 'The door opens.' },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('reply', 80) },
            { type: 'narration', textEn: 'A chair moves.' },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('answer', 80) },
        ],
        actorUpdates: [{
            id: 'minerva_mcgonagall',
            present: true,
            currentActivityEn: 'Waiting.',
            currentIntentEn: 'Learn Tina secrets.',
        }],
    }, state, budget);
    assert.equal(invalid.valid, false);
    assert.equal(
        invalid.errors.some(error =>
            error.includes(
                '摘要或一段可归纳的叙述',
            )),
        false,
    );
    assert.equal(
        invalid.errors.some(error =>
            error.includes(
                '动作与场景描写过短',
            )),
        false,
    );
    assert.ok(invalid.errors.some(error => error.includes('currentIntentEn')));
});

test('scene time authority bounds relative narration and rejects invented schedules', () => {
    const state = {
        clock: '1991-07-24 · 14:35',
    };
    const budget = {
        elapsedMinutes: 15,
    };
    const claim = overrides => ({
        kind: 'relative_duration',
        evidenceText: '',
        clock: '',
        durationMinutes: 0,
        relation: 'none',
        confidence: 0.95,
        ...overrides,
    });
    const validClock =
        validateSceneTemporalConsistency(
            [claim({
                kind:
                    'absolute_clock',
                evidenceText:
                    'at 14:50',
                clock: '14:50',
            })],
            state,
            budget,
            '',
            [
                'The group finishes at 14:50 and enters the shop.',
            ],
        );
    assert.equal(validClock.valid, true);
    assert.equal(
        validClock
            .acceptedClaims
            .length,
        1,
    );

    const boundedRelative =
        validateSceneTemporalConsistency(
            [
                claim({
                    evidenceText:
                        'Ten minutes ago',
                    durationMinutes: 10,
                    relation: 'ago',
                }),
                claim({
                    evidenceText:
                        'Five minutes later',
                    durationMinutes: 5,
                    relation: 'later',
                }),
            ],
            state,
            budget,
            '',
            [
                'Ten minutes ago, Hermione left the armchair. Five minutes later, she reached the portrait hole.',
            ],
        );
    assert.equal(
        boundedRelative.valid,
        true,
    );
    assert.equal(
        boundedRelative
            .acceptedClaims
            .length,
        2,
    );

    const overlongValidation =
        validateSceneTemporalConsistency(
            [
                claim({
                    evidenceText:
                        'Sixteen minutes later',
                    durationMinutes: 16,
                    relation: 'later',
                }),
                claim({
                    evidenceText:
                        'ten minutes before breakfast',
                    durationMinutes: 10,
                    relation: 'before',
                }),
            ],
            state,
            budget,
            '',
            [
                'Sixteen minutes later, Hermione reaches the door. They have ten minutes before breakfast.',
            ],
        );
    assert.equal(
        overlongValidation.valid,
        false,
    );
    assert.match(
        overlongValidation
            .errors.join('；'),
        /Sixteen minutes later/,
    );
    assert.match(
        overlongValidation
            .errors.join('；'),
        /ten minutes before/,
    );

    const inventedText = [
        'The filling has been hot since noon.',
        'They have twenty minutes before the shop closes.',
        'The room looks unchanged from two hours earlier.',
        'Madam Malkin says the shop closes at four o’clock.',
        'The shop closes after dusk.',
    ].join(' ');
    const validation =
        validateSceneTemporalConsistency(
            [
                claim({
                    kind: 'named_time',
                    evidenceText:
                        'since noon',
                }),
                claim({
                    evidenceText:
                        'twenty minutes before the shop closes',
                    durationMinutes: 20,
                    relation: 'before',
                }),
                claim({
                    evidenceText:
                        'two hours earlier',
                    durationMinutes: 120,
                    relation: 'earlier',
                }),
                claim({
                    kind: 'schedule',
                    evidenceText:
                        'shop closes at four o’clock',
                }),
                claim({
                    kind: 'named_time',
                    evidenceText:
                        'closes after dusk',
                }),
            ],
            state,
            budget,
            '',
            [inventedText],
        );
    assert.equal(validation.valid, false);
    assert.match(
        validation.errors.join('；'),
        /时间权威/,
    );
    assert.match(
        validation.errors.join('；'),
        /since noon/,
    );
    assert.match(
        validation.errors.join('；'),
        /twenty minutes before/,
    );
    assert.match(
        validation.errors.join('；'),
        /closes after dusk/,
    );
    assert.match(
        validation.errors.join('；'),
        /two hours earlier/,
    );
    assert.match(
        validation.errors.join('；'),
        /closes at/,
    );

    const transportText =
        'On the first of September, the train departs at eleven.';
    const transportClaims = [
        claim({
            kind: 'calendar_date',
            evidenceText:
                'first of September',
        }),
        claim({
            kind: 'schedule',
            evidenceText:
                'train departs at eleven',
        }),
    ];
    const transportValidation =
        validateSceneTemporalConsistency(
            transportClaims,
            state,
            budget,
            '',
            [transportText],
        );
    assert.equal(
        transportValidation.valid,
        false,
    );
    assert.match(
        transportValidation.errors.join('；'),
        /first of September/i,
    );
    assert.match(
        transportValidation.errors.join('；'),
        /train departs at eleven/i,
    );
    assert.deepEqual(
        validateSceneTemporalConsistency(
            transportClaims,
            state,
            budget,
            transportText,
            [transportText],
        ),
        {
            valid: true,
            errors: [],
            acceptedClaims:
                transportClaims,
            rejectedClaims: [],
        },
    );

    const requestedWaitClaim =
        claim({
            evidenceText:
                'Twenty minutes later',
            durationMinutes: 20,
            relation: 'later',
        });
    assert.deepEqual(
        validateSceneTemporalConsistency(
            [requestedWaitClaim],
            state,
            budget,
            'I wait here. Twenty minutes later, I stand up.',
            [
                'Twenty minutes later, Tina stands up.',
            ],
        ),
        {
            valid: true,
            errors: [],
            acceptedClaims: [
                requestedWaitClaim,
            ],
            rejectedClaims: [],
        },
    );
    assert.equal(
        validateSceneTemporalConsistency(
            [],
            state,
            budget,
            '',
            [inventedText],
        ).valid,
        true,
    );
});

test('low-tier actor movement is limited to reachable existing rooms', () => {
    const words = prefix => Array.from(
        { length: 45 },
        (_, index) => `${prefix}${index}`,
    ).join(' ');
    const state = createCurrentPlayingState();
    const payload = roomId => ({
        publicEventEn: 'McGonagall crosses from the kitchen into the back garden while Tina circles the lawn.',
        actorPresence: {
            presentActorIdsAfterTurn:
                state.actors
                    .filter(actor =>
                        actor.present !== false)
                    .map(actor =>
                        actor.id),
        },
        segments: [
            { type: 'narration', textEn: words('movement') },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('reply') },
            { type: 'narration', textEn: words('garden') },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: words('warning') },
        ],
        actorUpdates: [{
            id: 'minerva_mcgonagall',
            present: true,
            currentActivityEn: 'Standing at the edge of the back garden.',
            mapId: 'zhang_home',
            roomId,
        }],
    });
    const budget = {
        elapsedMinutes: 15,
        minimumWords: 240,
        maximumWords: 560,
    };

    assert.deepEqual(
        validateScenePerformance(payload('back_garden'), state, budget),
        { valid: true, errors: [] },
    );
    const invalid = validateScenePerformance(
        payload('invented_tower'),
        state,
        budget,
    );
    assert.equal(invalid.valid, false);
    assert.match(invalid.errors.join('；'), /目标房间不可达/);
});
