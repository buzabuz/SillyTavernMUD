#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';

import {
    setConfigFilePath,
} from '../src/util.js';

setConfigFilePath(
    path.resolve('config.yaml'),
);

const {
    adjudicateTurn,
    observeTurn,
} = await import(
    '../src/hogwarts-mud/local-semantic-adjudicator.js'
);

const model =
    process.argv[2] ||
    'qwen3:1.7b';

const baseInput = {
    forcedCheck: false,
    clock:
        '1991-09-02 · 09:20',
    scene: {
        id:
            'first_morning_gryffindor_dormitory',
        summaryEn:
            'First-year Gryffindors are eating breakfast before Charms.',
        nextSceneIntent: {
            titleEn:
                'Attend the first Charms lesson',
            triggerEn:
                'After breakfast',
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
        },
        recentTimeline: [{
            clock:
                '1991-09-02 · 09:20',
            label:
                'Harry refused an autograph.',
        }],
    },
    room: {
        mapId:
            'hogwarts_castle',
        currentRoomId:
            'great_hall',
        rooms: [
            {
                id:
                    'great_hall',
                nameEn:
                    'Great Hall',
                kind: 'hall',
            },
            {
                id:
                    'entrance_hall',
                nameEn:
                    'Entrance Hall',
                kind: 'hall',
            },
            {
                id:
                    'charms_classroom',
                nameEn:
                    'Charms Classroom',
                kind: 'classroom',
            },
        ],
        exits: [
            {
                from:
                    'great_hall',
                to:
                    'entrance_hall',
                minutes: 1,
            },
        ],
    },
    actors: [
        {
            id: 'player',
            nameEn:
                'Tina Zhang',
            roleEn:
                'Player character',
            currentActivityEn: '',
            mapId:
                'hogwarts_castle',
            roomId:
                'great_hall',
        },
        {
            id:
                'canon_harry_james_potter',
            nameEn:
                'Harry James Potter',
            roleEn: 'Student',
            currentActivityEn:
                'Eating breakfast at the Gryffindor table.',
            mapId:
                'hogwarts_castle',
            roomId:
                'great_hall',
        },
        {
            id:
                'canon_lavender_brown',
            nameEn:
                'Lavender Brown',
            roleEn: 'Student',
            currentActivityEn:
                'Watching the autograph request.',
            mapId:
                'hogwarts_castle',
            roomId:
                'great_hall',
        },
    ],
    movementResolution: null,
    timePolicy: {
        defaultMinutes: 15,
        movementMinutes: 15,
        investigationMinutes: 30,
        extendedActionMinutes: 60,
        instantaneousMagicMinutes: 1,
    },
};

const preCases = [
    {
        id:
            'future_class_question',
        sequence: [
            {
                type: 'action',
                lineIndex: 0,
                text:
                    '*挤在哈利旁边坐下，把纸笔塞给他*',
            },
            {
                type:
                    'direct_speech',
                lineIndex: 1,
                speechOrder: 0,
                targetLabel:
                    '哈利·波特',
                targetActorId:
                    'canon_harry_james_potter',
                speechText:
                    '你等下一起上课吗？你有女朋友吗？',
            },
        ],
        expected: {
            min: 15,
            max: 15,
            check: 'none',
        },
    },
    {
        id:
            'continue_class_slice',
        sequence: [{
            type: 'action',
            lineIndex: 0,
            text:
                '*继续和同学们一起上课*',
        }],
        expected: {
            min: 15,
            max: 15,
            check: 'none',
        },
    },
    {
        id:
            'finish_class_boundary',
        sequence: [{
            type: 'action',
            lineIndex: 0,
            text:
                '*一直上完这节课，再收拾书包离开*',
        }],
        expected: {
            min: 30,
            max: 120,
            check: 'none',
        },
    },
    {
        id:
            'explicit_wait',
        sequence: [{
            type: 'action',
            lineIndex: 0,
            text:
                '*坐在这里等了两个小时*',
        }],
        expected: {
            min: 120,
            max: 120,
            check: 'none',
        },
    },
    {
        id:
            'physical_contest',
        sequence: [{
            type: 'action',
            lineIndex: 0,
            text:
                '*用力把面前的男孩推倒*',
        }],
        expected: {
            min: 15,
            max: 15,
            check:
                'physical_force',
        },
    },
    {
        id:
            'quoted_reasoning',
        sequence: [{
            type:
                'direct_speech',
            lineIndex: 0,
            speechOrder: 0,
            targetLabel:
                '哈利·波特',
            targetActorId:
                'canon_harry_james_potter',
            speechText:
                '我要推理一下你为什么不肯签名。',
        }],
        expected: {
            min: 15,
            max: 15,
            check: 'none',
        },
    },
    {
        id:
            'sleep_eight_hours',
        sequence: [{
            type: 'action',
            lineIndex: 0,
            text:
                '*睡了八个小时，第二天早上醒来*',
        }],
        expected: {
            min: 480,
            max: 480,
            check: 'none',
        },
    },
];

const preResults = [];
for (const testCase of preCases) {
    const response =
        await adjudicateTurn(
            {
                ...baseInput,
                playerTurnSequence:
                    testCase.sequence,
            },
            { model },
        );
    const temporal =
        response.result.temporal;
    const check =
        response.result.check;
    const elapsedPass =
        temporal.elapsedMinutes >=
            testCase.expected.min &&
        temporal.elapsedMinutes <=
            testCase.expected.max;
    const checkPass =
        testCase.expected.check ===
            'none'
            ? check.required ===
                false
            : (
                check.required ===
                    true &&
                check.ruleId ===
                    testCase
                        .expected
                        .check
            );
    preResults.push({
        id: testCase.id,
        pass:
            elapsedPass &&
            checkPass,
        temporal,
        check,
        diagnostics:
            response.diagnostics,
    });
}

const postCases = [
    {
        id:
            'actor_exit',
        input: {
            ...baseInput,
            actors:
                baseInput.actors
                    .map(({
                        currentActivityEn,
                        ...actor
                    }) => actor),
            playerAction:
                '我继续问哈利问题。',
            narrativeSegments: [{
                type:
                    'narration',
                actorId: '',
                textEn:
                    'Harry turned and walked through the great doors into the Entrance Hall, leaving the breakfast table behind.',
            }],
            narrativeText:
                'Harry turned and walked through the great doors into the Entrance Hall, leaving the breakfast table behind.',
            existingActorPresence: {
                presentActorIdsAfterTurn: [
                    'canon_harry_james_potter',
                    'canon_lavender_brown',
                ],
            },
        },
        verify: result => {
            const actorUpdate =
                result.actorUpdates
                    .some(update =>
                        update.actorId ===
                            'canon_harry_james_potter' &&
                        update.roomId ===
                            'entrance_hall');
            const recoverableMove =
                result.materialEvents
                    .some(event =>
                        event.type ===
                            'object_moved' &&
                        event.actorId ===
                            'canon_harry_james_potter' &&
                        /entrance.?hall/iu
                            .test(
                                event
                                    .targetText,
                            ));
            return result
                .eventBoundary
                .ended === true &&
                result
                    .eventBoundary
                    .evidenceText ===
                        'Harry turned and walked through the great doors into the Entrance Hall, leaving the breakfast table behind.' &&
                (
                    actorUpdate ||
                    recoverableMove
                );
        },
    },
    {
        id:
            'material_changes',
        input: {
            ...baseInput,
            actors:
                baseInput.actors
                    .map(({
                        currentActivityEn,
                        ...actor
                    }) => actor),
            playerAction:
                'Tina把二十八只玩具熊排列在床头，然后换上条纹睡衣。',
            narrativeSegments: [{
                type:
                    'narration',
                actorId: '',
                textEn:
                    'Tina arranged twenty-eight toy bears along the headboard, then changed into striped pyjamas.',
            }],
            narrativeText:
                'Tina arranged twenty-eight toy bears along the headboard, then changed into striped pyjamas.',
            existingActorPresence: {
                presentActorIdsAfterTurn: [],
            },
        },
        verify: result => {
            const types =
                new Set(
                    result
                        .materialEvents
                        .map(event =>
                            event.type),
                );
            return types.has(
                'object_placed',
            ) &&
                types.has(
                    'outfit_changed',
                );
        },
    },
];

const postResults = [];
for (const testCase of postCases) {
    const response =
        await observeTurn(
            testCase.input,
            { model },
        );
    postResults.push({
        id: testCase.id,
        pass:
            testCase.verify(
                response.result,
            ),
        result:
            response.result,
        diagnostics:
            response.diagnostics,
    });
}

const results = [
    ...preResults,
    ...postResults,
];
const passed =
    results.filter(item =>
        item.pass).length;

process.stdout.write(
    JSON.stringify(
        {
            model,
            passed,
            total:
                results.length,
            passRate:
                passed /
                results.length,
            results,
        },
        null,
        2,
    ) +
    '\n',
);

process.exitCode =
    passed === results.length
        ? 0
        : 1;
