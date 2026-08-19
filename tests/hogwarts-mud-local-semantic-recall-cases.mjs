import {
    parseExplicitMovementDirective,
} from '../public/scripts/extensions/hogwarts-mud/domain/movement.js';

const ACTORS = Object.freeze([
    {
        id: 'canon_harry_james_potter',
        nameEn: 'Harry Potter',
        roleEn: 'student',
        mapId: 'hogwarts',
        roomId: 'charms_classroom',
        present: true,
    },
    {
        id: 'canon_hermione_jean_granger',
        nameEn: 'Hermione Granger',
        roleEn: 'student',
        mapId: 'hogwarts',
        roomId: 'charms_classroom',
        present: true,
    },
    {
        id: 'canon_ronald_bilius_weasley',
        nameEn: 'Ron Weasley',
        roleEn: 'student',
        mapId: 'hogwarts',
        roomId: 'charms_classroom',
        present: true,
    },
]);
const PLAYER_ACTOR =
    Object.freeze({
        id: 'player',
        nameEn: 'Tina',
        aliases: [
            'Tina',
        ],
        roleEn:
            'Player character',
        mapId: 'hogwarts',
        roomId:
            'charms_classroom',
        present: true,
    });

const ROOM = Object.freeze({
    id: 'charms_classroom',
    nameEn: 'Charms Classroom',
    mapId: 'hogwarts',
    connectedRoomIds: [
        'entrance_hall',
        'courtyard',
    ],
});

function preInput(
    playerAction,
    type = 'action',
    movementResolution = null,
) {
    return {
        playerAction,
        playerTurnSequence: [{
            type,
            text: playerAction
                .replaceAll('*', ''),
        }],
        forcedCheck: false,
        clock: '1991-09-02 · 13:20',
        scene: {
            id: 'charms_lesson',
            summaryEn:
                'A Charms lesson is underway.',
            nextSceneIntent: null,
            recentSceneEvents: [],
        },
        room: ROOM,
        actors: ACTORS,
        movementResolution,
        timePolicy: {
            minimumTurnMinutes: 15,
        },
    };
}

function postInput(
    playerAction,
    narrativeSegments,
) {
    return {
        clock: '1991-09-02 · 13:20',
        elapsedMinutes: 15,
        playerAction,
        playerTurnSequence: [{
            type: 'action',
            text: playerAction
                .replaceAll('*', ''),
        }],
        targetActorIds: [],
        narrativeSegments,
        room: ROOM,
        actors: [
            PLAYER_ACTOR,
            ...ACTORS,
        ].map(actor => ({
            id: actor.id,
            nameEn: actor.nameEn,
            roleEn: actor.roleEn,
            mapId: actor.mapId,
            roomId: actor.roomId,
        })),
        localPresence: {
            occupantActorIds:
                ACTORS.map(actor =>
                    actor.id),
            cohortIds: [
                'charms_class',
            ],
        },
        existingActorPresence: {
            presentActorIdsAfterTurn:
                ACTORS.map(actor =>
                    actor.id),
        },
    };
}

function narration(textEn) {
    return [{
        type: 'narration',
        actorId: '',
        textEn,
    }];
}

function dialogue(actorId, textEn) {
    return [{
        type: 'dialogue',
        actorId,
        textEn,
    }];
}

function preCase({
    id,
    family,
    polarity,
    language,
    holdout = false,
    action,
    type,
    movementResolution,
    expected,
}) {
    return Object.freeze({
        id: `pre_${id}`,
        stage: 'pre',
        family,
        polarity,
        language,
        holdout,
        input:
            preInput(
                action,
                type,
                movementResolution,
            ),
        expected:
            Object.freeze({
                calendarCommitment:
                    false,
                checkRequired: false,
                ruleId: 'none',
                targetActorId: '',
                elapsedMinutes: 15,
                ...expected,
            }),
    });
}

const MOVEMENT_ROOMS =
    Object.freeze([
        {
            id: 'charms_classroom',
            nameEn: 'Charms Classroom',
            mapId: 'hogwarts',
        },
        {
            id: 'entrance_hall',
            nameEn: 'Entrance Hall',
            mapId: 'hogwarts',
        },
        {
            id: 'courtyard',
            nameEn: 'Courtyard',
            mapId: 'hogwarts',
        },
    ]);

function movementContext({
    candidates,
    evidence = [],
}) {
    return {
        mapId: 'hogwarts',
        currentRoomId:
            'charms_classroom',
        eligibleGuideCandidates:
            candidates,
        recentGuideEvidence:
            evidence,
    };
}

function movementCandidate({
    id,
    nameEn,
    aliases = [],
    eligibility = 'current',
    roomId = '',
}) {
    return {
        id,
        nameEn,
        aliases,
        eligibility,
        locationKnown:
            Boolean(roomId),
        mapId:
            roomId
                ? 'hogwarts'
                : '',
        roomId,
    };
}

function movementCase({
    id,
    polarity,
    language,
    action,
    context,
    expected,
}) {
    const input =
        preInput(
            action,
            'action',
        );
    input.room = {
        ...ROOM,
        rooms:
            MOVEMENT_ROOMS,
    };
    const directive =
        parseExplicitMovementDirective(
            action,
        );
    input.movementContext =
        context
            ? {
                ...context,
                trigger:
                    directive,
            }
            : null;
    return Object.freeze({
        id:
            `pre_movement_${id}`,
        stage: 'pre',
        family:
            'movement_intent',
        polarity,
        language,
        holdout: true,
        input:
            Object.freeze(input),
        expected:
            Object.freeze({
                movementIntent:
                    Object.freeze(
                        expected,
                    ),
            }),
    });
}

const hermioneKnown =
    movementCandidate({
        id:
            'canon_hermione_jean_granger',
        nameEn:
            'Hermione Granger',
        aliases: ['Hermione', '赫敏'],
        roomId: 'entrance_hall',
    });
const harryKnown =
    movementCandidate({
        id:
            'canon_harry_james_potter',
        nameEn:
            'Harry Potter',
        aliases: ['Harry', '哈利'],
        roomId: 'courtyard',
    });
const ronKnownPrior =
    movementCandidate({
        id:
            'canon_ronald_bilius_weasley',
        nameEn:
            'Ron Weasley',
        aliases: ['Ron', '罗恩'],
        eligibility:
            'prior_departure',
        roomId: 'entrance_hall',
    });
const hermioneUnknown =
    movementCandidate({
        id:
            'canon_hermione_jean_granger',
        nameEn:
            'Hermione Granger',
        aliases: ['Hermione', '赫敏'],
    });
const hermioneUnknownPrior =
    movementCandidate({
        id:
            'canon_hermione_jean_granger',
        nameEn:
            'Hermione Granger',
        aliases: ['Hermione', '赫敏'],
        eligibility:
            'prior_departure',
    });
const harryUnknown =
    movementCandidate({
        id:
            'canon_harry_james_potter',
        nameEn:
            'Harry Potter',
        aliases: ['Harry', '哈利'],
        eligibility:
            'prior_departure',
    });

const knownGuideMovementCases = [
    ['hermione_zh_1', 'zh', '→【跟随赫敏】\n我立即跟着赫敏离开。', hermioneKnown],
    ['hermione_zh_2', 'zh', '→【跟着赫敏走】\n我起身跟上她。', hermioneKnown],
    ['hermione_en_1', 'en', '→【Follow Hermione】\nI follow Hermione now.', hermioneKnown],
    ['hermione_mixed_1', 'mixed', '→【Follow 赫敏】\nI immediately 跟上赫敏。', hermioneKnown],
    ['harry_zh_1', 'zh', '→【跟随哈利】\n我马上跟哈利走。', harryKnown],
    ['harry_en_1', 'en', '→【Follow Harry】\nI leave with Harry at once.', harryKnown],
    ['harry_en_2', 'en', '→【Go with Harry】\nI follow Harry out.', harryKnown],
    ['harry_mixed_1', 'mixed', '→【跟 Harry 走】\nI follow 哈利 immediately.', harryKnown],
].map(([
    id,
    language,
    action,
    candidate,
]) =>
    movementCase({
        id,
        polarity: 'positive',
        language,
        action,
        context:
            movementContext({
                candidates: [
                    candidate,
                ],
            }),
        expected: {
            requested: true,
            guideActorId:
                candidate.id,
            destinationRoomId:
                candidate.roomId,
        },
    }));

const priorDepartureMovementCases = [
    ['ron_prior_zh_1', 'zh', '→【跟随罗恩】\n我追上刚离开的罗恩。'],
    ['ron_prior_zh_2', 'zh', '→【跟罗恩走】\n我立刻跟在罗恩后面。'],
    ['ron_prior_en_1', 'en', '→【Follow Ron】\nI follow Ron after he leaves.'],
    ['ron_prior_mixed_1', 'mixed', '→【Follow 罗恩】\nI hurry after Ron。'],
].map(([
    id,
    language,
    action,
]) =>
    movementCase({
        id,
        polarity: 'positive',
        language,
        action,
        context:
            movementContext({
                candidates: [
                    ronKnownPrior,
                ],
            }),
        expected: {
            requested: true,
            guideActorId:
                ronKnownPrior.id,
            destinationRoomId:
                ronKnownPrior.roomId,
        },
    }));

const evidenceMovementCases = [
    {
        id: 'evidence_hermione_en_1',
        language: 'en',
        action:
            '→【Follow Hermione】\nI follow Hermione through the doors.',
        candidate:
            hermioneUnknownPrior,
        roomId: 'entrance_hall',
        sourceRef:
            'message:18:publicEventEn',
        evidence:
            'Hermione went through the doors into the Entrance Hall.',
    },
    {
        id: 'evidence_hermione_zh_1',
        language: 'zh',
        action:
            '→【跟随赫敏】\n我跟着赫敏穿过门厅。',
        candidate:
            hermioneUnknownPrior,
        roomId: 'entrance_hall',
        sourceRef:
            'message:20:publicEventEn',
        evidence:
            'Hermione crossed into the Entrance Hall and looked back.',
    },
    {
        id: 'evidence_harry_en_1',
        language: 'en',
        action:
            '→【Follow Harry】\nI go after Harry.',
        candidate:
            harryUnknown,
        roomId: 'courtyard',
        sourceRef:
            'message:22:publicEventEn',
        evidence:
            'Harry stepped into the Courtyard and waited beside the fountain.',
    },
    {
        id: 'evidence_harry_mixed_1',
        language: 'mixed',
        action:
            '→【跟 Harry 走】\nI follow 哈利出去。',
        candidate:
            harryUnknown,
        roomId: 'courtyard',
        sourceRef:
            'message:24:publicEventEn',
        evidence:
            'Harry left the classroom for the Courtyard.',
    },
].map(item =>
    movementCase({
        id: item.id,
        polarity: 'positive',
        language:
            item.language,
        action: item.action,
        context:
            movementContext({
                candidates: [
                    item.candidate,
                ],
                evidence: [{
                    sourceRef:
                        item.sourceRef,
                    textEn:
                        item.evidence,
                }],
            }),
        expected: {
            requested: true,
            guideActorId:
                item.candidate.id,
            destinationRoomId:
                item.roomId,
            destinationEvidenceSourceRef:
                item.sourceRef,
        },
    }));

const unknownDestinationMovementCases = [
    ['unknown_hermione_zh_1', 'zh', '→【跟随赫敏】\n我立刻跟着赫敏走。', hermioneUnknown],
    ['unknown_hermione_en_1', 'en', '→【Follow Hermione】\nI follow Hermione now.', hermioneUnknown],
    ['unknown_harry_zh_1', 'zh', '→【跟随哈利】\n我追着哈利离开。', harryUnknown],
    ['unknown_harry_mixed_1', 'mixed', '→【Follow 哈利】\nI hurry after Harry。', harryUnknown],
].map(([
    id,
    language,
    action,
    candidate,
]) =>
    movementCase({
        id,
        polarity: 'positive',
        language,
        action,
        context:
            movementContext({
                candidates: [
                    candidate,
                ],
            }),
        expected: {
            requested: true,
            guideActorId:
                candidate.id,
            destinationRoomId: '',
        },
    }));

const negativeMovementCases = [
    {
        id: 'untagged_hypothetical_zh',
        language: 'zh',
        action:
            '如果赫敏走了，我以后会跟着她。',
        context: null,
    },
    {
        id: 'untagged_recollection_en',
        language: 'en',
        action:
            'I remember following Hermione yesterday.',
        context: null,
    },
    {
        id: 'untagged_quote_mixed',
        language: 'mixed',
        action:
            '我读出纸条：“Follow Harry when he leaves.”',
        context: null,
    },
    {
        id: 'direct_room_zh',
        language: 'zh',
        action:
            '→【礼堂】\n我前往礼堂。',
        context: null,
    },
    {
        id: 'direct_room_en',
        language: 'en',
        action:
            '→【Entrance Hall】\nI go to the Entrance Hall.',
        context: null,
    },
    {
        id: 'ineligible_ron_zh',
        language: 'zh',
        action:
            '→【跟随罗恩】\n我跟着罗恩走。',
        context:
            movementContext({
                candidates: [
                    hermioneKnown,
                ],
            }),
    },
    {
        id: 'ineligible_draco_en',
        language: 'en',
        action:
            '→【Follow Draco】\nI follow Draco now.',
        context:
            movementContext({
                candidates: [
                    harryKnown,
                ],
            }),
    },
    {
        id: 'older_departure_mixed',
        language: 'mixed',
        action:
            '→【Follow 罗恩】\nI follow Ron now.',
        context:
            movementContext({
                candidates: [
                    hermioneKnown,
                    harryKnown,
                ],
            }),
    },
    {
        id: 'ambiguous_guides_zh',
        language: 'zh',
        action:
            '→【跟随赫敏或哈利】\n我跟着他们中的一个走。',
        context:
            movementContext({
                candidates: [
                    hermioneKnown,
                    harryKnown,
                ],
            }),
    },
    {
        id: 'wait_for_guide_en',
        language: 'en',
        action:
            '→【Wait for Hermione】\nI stay here and wait.',
        context: null,
    },
].map(item =>
    movementCase({
        id: item.id,
        polarity: 'negative',
        language:
            item.language,
        action: item.action,
        context:
            item.context,
        expected: {
            requested: false,
            guideActorId: '',
            destinationRoomId: '',
        },
    }));

export const REVISION_17_MOVEMENT_RECALL_CASES =
    Object.freeze([
        ...knownGuideMovementCases,
        ...priorDepartureMovementCases,
        ...evidenceMovementCases,
        ...unknownDestinationMovementCases,
        ...negativeMovementCases,
    ]);

function postCase({
    id,
    family,
    polarity,
    language,
    holdout = false,
    action,
    segments,
    expected,
}) {
    return Object.freeze({
        id: `post_${id}`,
        stage: 'post',
        family,
        polarity,
        language,
        holdout,
        input:
            postInput(
                action,
                segments,
            ),
        expected:
            Object.freeze(expected),
    });
}

const calendarCases = [
    ['calendar_promise_en', 'positive', 'en', false, 'I promise to meet you for training on Saturday.'],
    ['calendar_accept_zh', 'positive', 'zh', true, '我保证会参加周五晚上的练习。'],
    ['calendar_agree_mixed', 'positive', 'mixed', false, 'Deal，我会参加 Wednesday 的魔咒练习。'],
    ['calendar_count_me_in_en', 'positive', 'en', true, 'I shall be present at the Wednesday study meeting.'],
    ['calendar_attend_zh', 'positive', 'zh', false, '我会准时参加周三下午的复习会。'],
    ['calendar_confirm_mixed', 'positive', 'mixed', true, 'I undertake to participate in 周二的 training。'],
    ['calendar_question_en', 'negative', 'en', false, 'Will you meet me for training on Saturday?'],
    ['calendar_invitation_zh', 'negative', 'zh', true, '周五晚上一起练习，好不好？'],
    ['calendar_wish_mixed', 'negative', 'mixed', false, 'I wish 我周日能参加 practice。'],
    ['calendar_hypothetical_en', 'negative', 'en', true, 'Had things been different, I could attend Wednesday study.'],
    ['calendar_quoted_zh', 'negative', 'zh', false, '我复述她的话：“我答应周六训练。”'],
    ['calendar_vague_plan_mixed', 'negative', 'mixed', true, 'One day 也许我会去 training。'],
].map(([
    id,
    polarity,
    language,
    holdout,
    action,
]) => preCase({
    id,
    family: 'calendar',
    polarity,
    language,
    holdout,
    action,
    type: 'direct_speech',
    expected: {
        calendarCommitment:
            polarity === 'positive',
    },
}));

const checkCases = [
    ['check_force_en', 'positive', 'en', false, '*I shove Harry hard enough to knock him down.*', 'physical_force', 'canon_harry_james_potter'],
    ['check_stealth_zh', 'positive', 'zh', true, '*我藏住身形，趁哈利没有注意时绕过去。*', 'agility', 'canon_harry_james_potter'],
    ['check_theft_mixed', 'positive', 'mixed', false, '*I try to 偷走 Ron 的钥匙而不被发现。*', 'agility', 'canon_ronald_bilius_weasley'],
    ['check_persuade_en', 'positive', 'en', true, '*I talk Hermione into giving up the guarded phrase although she objects.*', 'charisma', 'canon_hermione_jean_granger'],
    ['check_investigate_zh', 'positive', 'zh', false, '*我在昏暗中辨认赫敏藏起来的模糊咒语。*', 'perception', 'canon_hermione_jean_granger'],
    ['check_will_mixed', 'positive', 'mixed', true, '*I push back against Harry 的思想控制。*', 'willpower', 'canon_harry_james_potter'],
    ['check_chat_en', 'negative', 'en', false, 'I ask Harry how his lesson went.', 'none', ''],
    ['check_question_zh', 'negative', 'zh', true, '我问赫敏愿不愿意一起吃午饭。', 'none', ''],
    ['check_sit_mixed', 'negative', 'mixed', false, '*I sit beside Ron 然后等老师继续。*', 'none', ''],
    ['check_move_en', 'negative', 'en', true, '*I follow the clear, unlocked route at an ordinary pace.*', 'none', ''],
    ['check_handover_zh', 'negative', 'zh', false, '*我把纸条递给哈利。*', 'none', ''],
    ['check_quoted_mixed', 'negative', 'mixed', true, '我朗读道：“Slip past the guard unseen.”', 'none', ''],
].map(([
    id,
    polarity,
    language,
    holdout,
    action,
    ruleId,
    targetActorId,
]) => preCase({
    id,
    family: 'check',
    polarity,
    language,
    holdout,
    action,
    type:
        action.startsWith('*')
            ? 'action'
            : 'direct_speech',
    expected: {
        checkRequired:
            polarity === 'positive',
        ruleId,
        targetActorId,
    },
}));

const timeCases = [
    ['time_two_hours_en', 'positive', 'en', false, '*I sit here and wait for two hours.*', 120],
    ['time_eight_hours_zh', 'positive', 'zh', true, '*我持续休息了十八个小时。*', 1080],
    ['time_forty_five_mixed', 'positive', 'mixed', false, '*Wait 四十五 minutes without leaving.*', 45],
    ['time_ninety_en', 'positive', 'en', true, '*I remain here for sixty-seven minutes.*', 67],
    ['time_thirty_zh', 'positive', 'zh', false, '*我在门口等了三十分钟。*', 30],
    ['time_three_hours_mixed', 'positive', 'mixed', true, '*I stay and study for 十九个小时。*', 1140],
    ['time_might_wait_en', 'negative', 'en', false, 'I might wait for two hours tomorrow.', 15],
    ['time_quoted_zh', 'negative', 'zh', true, '我说：“你最好休息十八个小时。”', 15],
    ['time_question_mixed', 'negative', 'mixed', false, 'Should we wait 一个小时?', 15],
    ['time_future_class_en', 'negative', 'en', true, 'The timetable lists a sixty-seven-minute lecture tomorrow.', 15],
    ['time_recollection_zh', 'negative', 'zh', false, '我记得昨天等了三十分钟。', 15],
    ['time_ordinary_mixed', 'negative', 'mixed', true, '*I listen for the current moment，并未跳过任何时段。*', 15],
].map(([
    id,
    polarity,
    language,
    holdout,
    action,
    elapsedMinutes,
]) => preCase({
    id,
    family: 'time',
    polarity,
    language,
    holdout,
    action,
    type:
        action.startsWith('*')
            ? 'action'
            : 'direct_speech',
    expected: {
        elapsedMinutes,
    },
}));

export const PRE_RECALL_CASES =
    Object.freeze([
        ...calendarCases,
        ...checkCases,
        ...timeCases,
    ]);

const itemRouteCases = [
    ['item_place_en', 'positive', 'en', false, 'I place the signed note on the desk.', narration('Tina placed the signed note on the desk.')],
    ['item_give_zh', 'positive', 'zh', true, '我把签名纸条交给哈利。', narration('Tina gave the signed note to Harry.')],
    ['item_carry_mixed', 'positive', 'mixed', false, 'I keep the old key 随身带着。', narration('Tina tucked the old key into her pocket and kept it.')],
    ['item_equip_en', 'positive', 'en', true, 'I put on the silver scarf.', narration('Tina put on the silver scarf.')],
    ['item_unequip_zh', 'positive', 'zh', false, '我摘下银色围巾。', narration('Tina removed the silver scarf and folded it.')],
    ['item_lend_mixed', 'positive', 'mixed', true, 'I lend Hermione 我的羽毛笔。', narration('Tina lent her quill to Hermione.')],
    ['item_damage_en', 'positive', 'en', false, 'I snap the old wand in half.', narration('The old wand snapped in half in Tina’s hands.')],
    ['item_clean_zh', 'positive', 'zh', true, '我把沾满墨水的校袍洗干净。', narration('Tina cleaned the ink-stained school robe.')],
    ['item_lose_mixed', 'positive', 'mixed', false, 'I realize the brass key 丢了。', narration('The brass key was no longer in Tina’s possession.')],
    ['item_destroy_en', 'positive', 'en', true, 'I burn the signed letter to ash.', narration('The signed letter burned to ash.')],
    ['item_mention_en', 'negative', 'en', false, 'I ask whether Harry still has the note.', dialogue('canon_harry_james_potter', 'Do you still have the note?')],
    ['item_hypothetical_zh', 'negative', 'zh', true, '如果我把纸条给哈利，他也许会收下。', dialogue('canon_harry_james_potter', 'If Tina gave me the note, I might keep it.')],
    ['item_question_mixed', 'negative', 'mixed', false, 'Should I give Hermione 这支羽毛笔？', dialogue('canon_hermione_jean_granger', 'Should Tina give me the quill?')],
    ['item_incidental_en', 'negative', 'en', true, 'I finish my pumpkin juice.', narration('Tina finished the pumpkin juice and left the ordinary cup on the table.')],
    ['item_unchanged_zh', 'negative', 'zh', false, '我确认钥匙还在口袋里。', narration('The key remained safely in Tina’s pocket.')],
    ['item_negated_mixed', 'negative', 'mixed', true, 'I do not give Harry 那张纸条。', narration('Tina kept the signed note and did not hand it over.')],
    ['item_recollection_en', 'negative', 'en', false, 'I remember giving Harry a note last year.', narration('Tina remembered a note she had given Harry last year.')],
    ['item_quoted_zh', 'negative', 'zh', true, '我复述：“她把钥匙给了罗恩。”', dialogue('canon_hermione_jean_granger', 'She gave Ron the key.')],
    ['item_metaphor_mixed', 'negative', 'mixed', false, 'That promise is a key to trust.', narration('The promise felt like a key to trust.')],
    ['item_future_plan_en', 'negative', 'en', true, 'I plan to lend Hermione the quill tomorrow.', narration('Tina planned to lend Hermione the quill tomorrow.')],
].map(([
    id,
    polarity,
    language,
    holdout,
    action,
    segments,
]) => postCase({
    id,
    family: 'inventory_route',
    polarity,
    language,
    holdout,
    action,
    segments,
    expected: {
        inventoryObservationRequired:
            polarity === 'positive',
    },
}));

const actorCases = [
    ['actor_harry_leaves_en', 'positive', 'en', false, 'I watch Harry leave.', narration('Harry walked through the great doors into the Entrance Hall and left the lesson.'), 'canon_harry_james_potter', 'absent', 'entrance_hall'],
    ['actor_hermione_enters_zh', 'positive', 'zh', true, '我看向门口。', narration('Hermione entered the classroom and joined the group.'), 'canon_hermione_jean_granger', 'present', 'charms_classroom'],
    ['actor_ron_courtyard_mixed', 'positive', 'mixed', false, 'I follow Ron with my eyes.', narration('Ron crossed into the courtyard and left the classroom interaction.'), 'canon_ronald_bilius_weasley', 'absent', 'courtyard'],
    ['actor_harry_paces_en', 'positive', 'en', true, 'I wait.', narration('Harry began pacing beside the classroom windows.'), 'canon_harry_james_potter', 'unchanged', 'charms_classroom'],
    ['actor_hermione_writes_zh', 'positive', 'zh', false, '我等赫敏。', narration('Hermione sat down and began writing the answer.'), 'canon_hermione_jean_granger', 'unchanged', 'charms_classroom'],
    ['actor_ron_exits_mixed', 'positive', 'mixed', true, 'I stop talking.', narration('Ron exited through the side door and disappeared into the Entrance Hall.'), 'canon_ronald_bilius_weasley', 'absent', 'entrance_hall'],
    ['actor_name_mention_en', 'negative', 'en', false, 'I mention Harry.', narration('Harry’s name was written at the top of the note.'), '', '', ''],
    ['actor_item_belongs_zh', 'negative', 'zh', true, '我看那张纸条。', narration('The note belonged to Hermione.'), '', '', ''],
    ['actor_injury_mixed', 'negative', 'mixed', false, 'I inspect Harry.', narration('A bleeding cut was visible across Harry’s palm.'), '', '', ''],
    ['actor_hypothetical_leave_en', 'negative', 'en', true, 'I wonder what happens next.', dialogue('canon_harry_james_potter', 'If I left now, the lesson would continue.') , '', '', ''],
    ['actor_quoted_departure_zh', 'negative', 'zh', false, '我引用书里的句子。', dialogue('canon_hermione_jean_granger', 'Harry left through the doors in the story.') , '', '', ''],
    ['actor_existing_context_mixed', 'negative', 'mixed', true, 'I listen.', narration('Harry remained beside his desk, exactly where he had been.'), '', '', ''],
].map(([
    id,
    polarity,
    language,
    holdout,
    action,
    segments,
    actorId,
    presence,
    roomId,
]) => postCase({
    id,
    family: 'actor_update',
    polarity,
    language,
    holdout,
    action,
    segments,
    expected: {
        actorUpdates:
            polarity === 'positive'
                ? [{
                    actorId,
                    presence,
                    roomId,
                }]
                : [],
    },
}));

const materialCases = [
    ['material_place_en', 'positive', 'en', false, '*I arrange three books on the desk.*', narration('Tina arranged three books on the desk.'), 'object_placed', 'add', 'player'],
    ['material_move_zh', 'positive', 'zh', true, '*我把黄铜灯从书架移到窗台。*', narration('Tina moved the brass lamp from the shelf to the windowsill.'), 'object_moved', 'move', 'player'],
    ['material_damage_mixed', 'positive', 'mixed', false, '*I crack 教室里的镜子。*', narration('Tina cracked the classroom mirror.'), 'scene_damaged', 'damage', 'player'],
    ['material_clean_en', 'positive', 'en', true, '*I wipe the ink from the desk until it is clean.*', narration('Tina wiped the ink from the desk until the surface was clean.'), 'scene_cleaned', 'clean', 'player'],
    ['material_outfit_zh', 'positive', 'zh', false, '*我换上蓝色校袍。*', narration('Tina changed into a blue school robe.'), 'outfit_changed', 'set', 'player'],
    ['material_hair_mixed', 'positive', 'mixed', true, 'I watch Hermione 整理头发。', narration('Hermione braided her hair into a neat plait.'), 'hairstyle_changed', 'set', 'canon_hermione_jean_granger'],
    ['material_dialogue_en', 'negative', 'en', false, 'I ask about the books on the desk.', dialogue('canon_harry_james_potter', 'Are those books staying on the desk?'), '', '', ''],
    ['material_hypothetical_zh', 'negative', 'zh', true, '如果我把灯移到窗台，房间会更亮。', narration('Tina considered moving the lamp but left it untouched.'), '', '', ''],
    ['material_quoted_mixed', 'negative', 'mixed', false, '我朗读：“Break the mirror.”', dialogue('canon_hermione_jean_granger', 'The sentence says to break the mirror.'), '', '', ''],
    ['material_unchanged_en', 'negative', 'en', true, 'I inspect the desk.', narration('The desk remained exactly as it was.'), '', '', ''],
    ['material_actor_move_zh', 'negative', 'zh', false, '我看着罗恩离开。', narration('Ron crossed into the courtyard and left the classroom interaction.'), '', '', ''],
    ['material_metaphor_mixed', 'negative', 'mixed', true, 'Her words cleaned the air between us.', narration('The apology eased the tension, but nothing physical changed.'), '', '', ''],
].map(([
    id,
    polarity,
    language,
    holdout,
    action,
    segments,
    type,
    operation,
    actorId,
]) => postCase({
    id,
    family: 'material_event',
    polarity,
    language,
    holdout,
    action,
    segments,
    expected: {
        materialEvents:
            polarity === 'positive'
                ? [{
                    type,
                    operation,
                    actorId,
                }]
                : [],
    },
}));

const eventCases = [
    ['event_departure_en', 'positive', 'en', false, 'I watch Harry go.', narration('Harry left through the great doors and the private exchange ended.')],
    ['event_procedure_zh', 'positive', 'zh', true, '我完成登记。', narration('The clerk stamped the final form; the registration procedure was complete.')],
    ['event_disengage_mixed', 'positive', 'mixed', false, 'I step back.', narration('Both students lowered their wands and disengaged from the duel.')],
    ['event_ceremony_en', 'positive', 'en', true, 'I wait for the end.', narration('The ceremony concluded and the assembled students dispersed.')],
    ['event_exam_zh', 'positive', 'zh', false, '我等检查结束。', narration('Madam Pomfrey completed the examination and dismissed Harry.')],
    ['event_adjourn_mixed', 'positive', 'mixed', true, 'I close my notes.', narration('Professor Flitwick adjourned the meeting and everyone left.')],
    ['event_one_action_en', 'negative', 'en', false, 'I move one book.', narration('Tina moved one book to the other side of the desk.')],
    ['event_item_place_zh', 'negative', 'zh', true, '我放下纸条。', narration('Tina placed the signed note on the desk.')],
    ['event_sentence_en', 'negative', 'en', false, 'I answer.', dialogue('canon_hermione_jean_granger', 'That is the first step.')],
    ['event_outfit_zh', 'negative', 'zh', true, '我换上校袍。', narration('Tina changed into her school robe.')],
    ['event_intermediate_mixed', 'negative', 'mixed', false, 'I continue.', narration('The clerk checked the first page and reached for the second form.')],
    ['event_future_plan_en', 'negative', 'en', true, 'I suggest ending later.', dialogue('canon_harry_james_potter', 'We can end the meeting after dinner.')],
].map(([
    id,
    polarity,
    language,
    holdout,
    action,
    segments,
]) => postCase({
    id,
    family: 'event_boundary',
    polarity,
    language,
    holdout,
    action,
    segments,
    expected: {
        eventEnded:
            polarity === 'positive',
    },
}));

export const RETIRED_IMMEDIATE_EVENT_RECALL_CASES =
    Object.freeze([
        ...eventCases,
    ]);

const temporalCases = [
    postCase({
        id: 'temporal_exact_clock',
        family: 'temporal',
        polarity: 'positive',
        language: 'en',
        holdout: false,
        action: 'I look at the clock.',
        segments:
            narration(
                'At 14:50 the shop door opened.',
            ),
        expected: {
            temporalClaims: [{
                kind: 'absolute_clock',
                clock: '14:50',
            }],
        },
    }),
    postCase({
        id: 'temporal_relative_mixed',
        family: 'temporal',
        polarity: 'positive',
        language: 'mixed',
        holdout: true,
        action: 'I wait.',
        segments:
            narration(
                'Five minutes later，门再次打开。',
            ),
        expected: {
            temporalClaims: [{
                kind:
                    'relative_duration',
                durationMinutes: 5,
                relation: 'later',
            }],
        },
    }),
    postCase({
        id: 'temporal_vague',
        family: 'temporal',
        polarity: 'negative',
        language: 'en',
        holdout: false,
        action: 'I wait.',
        segments:
            narration(
                'The door opened later that afternoon.',
            ),
        expected: {
            temporalClaims: [],
        },
    }),
    postCase({
        id: 'temporal_player_only',
        family: 'temporal',
        polarity: 'negative',
        language: 'zh',
        holdout: true,
        action: '我说现在是14:50。',
        segments:
            narration(
                'Tina made a claim about the time.',
            ),
        expected: {
            temporalClaims: [],
        },
    }),
];

export const POST_RECALL_CASES =
    Object.freeze([
        ...itemRouteCases,
        ...actorCases,
        ...materialCases,
        ...temporalCases,
    ]);

export const ALL_RECALL_CASES =
    Object.freeze([
        ...PRE_RECALL_CASES,
        ...POST_RECALL_CASES,
    ]);
