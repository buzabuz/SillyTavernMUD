/* global document, window */
/* eslint-disable playwright/expect-expect, playwright/no-conditional-in-test */
import {
    existsSync,
    readFileSync,
} from 'node:fs';
import {
    extname,
    resolve,
} from 'node:path';
import {
    fileURLToPath,
} from 'node:url';

import {
    expect,
    test,
} from '@playwright/test';

const EXTENSION_URL = new URL(
    '../public/scripts/extensions/hogwarts-mud/',
    import.meta.url,
);
const EXTENSION_PATH =
    fileURLToPath(EXTENSION_URL);
const MODULE_ORIGIN =
    'http://hpmud.test';
const SAVE_GUARD_ORIGIN =
    'http://127.0.0.1:8000';
const MODULE_PREFIX =
    '/scripts/extensions/hogwarts-mud/';
const CURRENT_CLOCK =
    '1991-09-02 · 13:35';
const FREE_CLOCK =
    '1991-09-02 · 15:00';
const TARGET_CLOCK =
    '1991-09-02 · 19:00';
const ACCEPTANCE_DATE =
    '1991-09-06';
const ACCEPTANCE_CLOCK =
    '1991-09-06 · 19:00';
const STORYLINE_ID =
    'tina_secret_storyline';
const BEAT_ID =
    'tina_secret_autumn_beat';
const MEETING_ID =
    'staff_background_meeting';
const STUDY_ID =
    'evening_study';
const ACCEPTANCE_MEETING_ID =
    'friday_staff_background_meeting';
const ACCEPTANCE_CONCURRENT_ID =
    'friday_evening_transfiguration';
const ACTIVE_ID =
    'afternoon_corridor_rounds';
const CANCELLED_ID =
    'cancelled_flying_practice';
const ACCEPTANCE_SCHEDULE_IDS = [
    'friday_great_hall_breakfast',
    'friday_potions_class',
    'friday_great_hall_lunch',
    ACCEPTANCE_CONCURRENT_ID,
    ACCEPTANCE_MEETING_ID,
];
const HISTORY_ID =
    'morning_archive';
const MULTI_ARCHIVE_ID =
    'explicit_multi_plan_archive';
const LEGACY_ARCHIVE_ID =
    'legacy_archive_without_claims';
const CURRENT_SCENE_ID =
    'afternoon_corridor';

const styles =
    readFileSync(
        new URL(
            '../public/scripts/extensions/hogwarts-mud/style.css',
            import.meta.url,
        ),
        'utf8',
    );
const panel =
    readFileSync(
        new URL(
            '../public/scripts/extensions/hogwarts-mud/panel.html',
            import.meta.url,
        ),
        'utf8',
    );

function createEntry(
    id,
    patch = {},
) {
    return {
        id,
        parentId: '',
        entryType: 'event',
        title: id,
        titleEn: id,
        summary:
            `${id} 的公开安排。`,
        summaryEn:
            `Public schedule for ${id}.`,
        tags: [],
        startClock:
            TARGET_CLOCK,
        endClock:
            '1991-09-02 · 20:00',
        participantIds: [
            'canon_hermione_jean_granger',
        ],
        mapId:
            'hogwarts_castle',
        roomId:
            'gryffindor_common_room',
        status: 'planned',
        planningTier:
            'medium',
        relatedSceneIds: [],
        createdClock:
            CURRENT_CLOCK,
        updatedClock:
            CURRENT_CLOCK,
        sourceBeatId: '',
        beatSlot: null,
        scheduleKind:
            'personal',
        ...patch,
    };
}

function createWorldState() {
    return {
        saveRevisionVersion: 1,
        timelineEpoch:
            'calendar_e2e_timeline',
        stateRevision: 26,
        revisionHistory: [],
        phase: 'playing',
        clock: CURRENT_CLOCK,
        chapter: '第一学年',
        location: '二楼走廊',
        calendar: {
            version: 2,
            storylines: [{
                id:
                    STORYLINE_ID,
                title:
                    '蒂娜的秘密',
                titleEn:
                    'Tina Secret',
                summary:
                    '教师们逐步理解蒂娜背景中尚未解释的线索。',
                summaryEn:
                    'The staff gradually understand the unexplained threads in Tina background.',
                tags: [
                    'heritage',
                    'school_year',
                ],
                startClock:
                    CURRENT_CLOCK,
                endClock:
                    '1995-06-30 · 18:00',
                participantIds: [
                    'minerva_mcgonagall',
                    'severus_snape',
                ],
                status: 'active',
                createdClock:
                    CURRENT_CLOCK,
                updatedClock:
                    CURRENT_CLOCK,
            }],
            storyBeats: [{
                id:
                    BEAT_ID,
                storylineId:
                    STORYLINE_ID,
                title:
                    '秋季线索',
                titleEn:
                    'Autumn Clues',
                summary:
                    '教职员从公开表现中建立第一批可验证线索。',
                summaryEn:
                    'Staff establish the first verifiable clues from public conduct.',
                tags: [
                    'autumn',
                    'staff',
                ],
                termKey:
                    'year_1_autumn',
                sequence: 1,
                windowStartClock:
                    CURRENT_CLOCK,
                windowEndClock:
                    '1991-12-20 · 18:00',
                sceneTarget: 4,
                status: 'active',
                relatedSceneIds: [],
                createdClock:
                    CURRENT_CLOCK,
                updatedClock:
                    CURRENT_CLOCK,
            }],
            entries: [
                createEntry(
                    'great_hall_breakfast',
                    {
                        title:
                            '格兰芬多早餐',
                        titleEn:
                            'Gryffindor Breakfast',
                        summary:
                            '礼堂早餐已经结束。',
                        summaryEn:
                            'Breakfast in the Great Hall has ended.',
                        tags: [
                            'breakfast',
                            'routine',
                        ],
                        participantIds: [
                            'canon_harry_james_potter',
                            'canon_hermione_jean_granger',
                        ],
                        startClock:
                            '1991-09-02 · 08:00',
                        endClock:
                            '1991-09-02 · 08:30',
                        roomId:
                            'great_hall',
                        status:
                            'completed',
                        scheduleKind:
                            'routine',
                    },
                ),
                createEntry(
                    'morning_charms_class',
                    {
                        title:
                            '一年级魔咒课',
                        titleEn:
                            'First-Year Charms',
                        summary:
                            '上午课程已经结束。',
                        summaryEn:
                            'The morning lesson has ended.',
                        tags: [
                            'class',
                            'charms',
                        ],
                        startClock:
                            '1991-09-02 · 10:00',
                        endClock:
                            '1991-09-02 · 11:00',
                        roomId:
                            'history_classroom',
                        status:
                            'completed',
                        scheduleKind:
                            'class',
                    },
                ),
                createEntry(
                    'great_hall_lunch',
                    {
                        title:
                            '礼堂午餐',
                        titleEn:
                            'Great Hall Lunch',
                        summary:
                            '午餐时段已经结束。',
                        summaryEn:
                            'The lunch period has ended.',
                        tags: [
                            'lunch',
                            'routine',
                        ],
                        startClock:
                            '1991-09-02 · 12:30',
                        endClock:
                            '1991-09-02 · 13:15',
                        roomId:
                            'great_hall',
                        status:
                            'completed',
                        scheduleKind:
                            'routine',
                    },
                ),
                createEntry(
                    ACTIVE_ID,
                    {
                        title:
                            '午后走廊巡查',
                        titleEn:
                            'Afternoon Corridor Rounds',
                        summary:
                            '当前正在进行的走廊巡查。',
                        summaryEn:
                            'The current corridor rounds are in progress.',
                        tags: [
                            'routine',
                            'corridor',
                        ],
                        startClock:
                            '1991-09-02 · 13:10',
                        endClock:
                            '1991-09-02 · 14:00',
                        roomId:
                            'second_floor_corridor',
                        status:
                            'active',
                        scheduleKind:
                            'routine',
                    },
                ),
                createEntry(
                    CANCELLED_ID,
                    {
                        title:
                            '取消的飞行练习',
                        titleEn:
                            'Cancelled Flying Practice',
                        summary:
                            '这项下午练习已经取消。',
                        summaryEn:
                            'This afternoon practice has been cancelled.',
                        tags: [
                            'flying',
                        ],
                        startClock:
                            '1991-09-02 · 16:00',
                        endClock:
                            '1991-09-02 · 17:00',
                        roomId:
                            'black_lake_shore',
                        status:
                            'cancelled',
                        scheduleKind:
                            'class',
                    },
                ),
                createEntry(
                    MEETING_ID,
                    {
                        parentId:
                            STORYLINE_ID,
                        title:
                            '麦格与斯内普讨论蒂娜背景',
                        titleEn:
                            'McGonagall and Snape Discuss Tina Background',
                        summary:
                            '两位教授在办公室复核已公开的入学表现。',
                        summaryEn:
                            'The professors review public evidence from the first school days.',
                        tags: [
                            'meeting',
                            'story',
                        ],
                        participantIds: [
                            'minerva_mcgonagall',
                            'severus_snape',
                        ],
                        roomId:
                            'mcgonagall_office',
                        sourceBeatId:
                            BEAT_ID,
                        beatSlot: 1,
                        scheduleKind:
                            'story',
                    },
                ),
                createEntry(
                    STUDY_ID,
                    {
                        title:
                            '与赫敏的课后补习',
                        titleEn:
                            'After-class Study with Hermione',
                        summary:
                            '同一时刻在公共休息室进行的独立学习安排。',
                        summaryEn:
                            'An independent study schedule in the common room at the same time.',
                        tags: [
                            'study',
                            'social',
                        ],
                        participantIds: [
                            'canon_harry_james_potter',
                            'canon_hermione_jean_granger',
                        ],
                        scheduleKind:
                            'social',
                    },
                ),
                createEntry(
                    ACCEPTANCE_SCHEDULE_IDS[0],
                    {
                        title:
                            '星期五礼堂早餐',
                        titleEn:
                            'Friday Great Hall Breakfast',
                        tags: [
                            'breakfast',
                            'routine',
                        ],
                        startClock:
                            '1991-09-06 · 08:00',
                        endClock:
                            '1991-09-06 · 08:45',
                        participantIds: [
                            'canon_harry_james_potter',
                            'canon_hermione_jean_granger',
                        ],
                        roomId:
                            'great_hall',
                        scheduleKind:
                            'routine',
                    },
                ),
                createEntry(
                    ACCEPTANCE_SCHEDULE_IDS[1],
                    {
                        title:
                            '星期五魔药课',
                        titleEn:
                            'Friday Potions Class',
                        tags: [
                            'class',
                            'potions',
                        ],
                        startClock:
                            '1991-09-06 · 09:00',
                        endClock:
                            '1991-09-06 · 10:30',
                        participantIds: [
                            'canon_harry_james_potter',
                            'canon_hermione_jean_granger',
                            'severus_snape',
                        ],
                        roomId:
                            'potions_classroom',
                        scheduleKind:
                            'class',
                    },
                ),
                createEntry(
                    ACCEPTANCE_SCHEDULE_IDS[2],
                    {
                        title:
                            '星期五礼堂午餐',
                        titleEn:
                            'Friday Great Hall Lunch',
                        tags: [
                            'lunch',
                            'routine',
                        ],
                        startClock:
                            '1991-09-06 · 12:30',
                        endClock:
                            '1991-09-06 · 13:15',
                        participantIds: [
                            'canon_harry_james_potter',
                            'canon_hermione_jean_granger',
                        ],
                        roomId:
                            'great_hall',
                        scheduleKind:
                            'routine',
                    },
                ),
                createEntry(
                    ACCEPTANCE_CONCURRENT_ID,
                    {
                        title:
                            '星期五晚间变形术课',
                        titleEn:
                            'Friday Evening Transfiguration',
                        tags: [
                            'class',
                            'transfiguration',
                        ],
                        startClock:
                            '1991-09-06 · 18:30',
                        endClock:
                            '1991-09-06 · 19:30',
                        participantIds: [
                            'canon_harry_james_potter',
                            'canon_hermione_jean_granger',
                            'minerva_mcgonagall',
                        ],
                        roomId:
                            'transfiguration_classroom',
                        scheduleKind:
                            'class',
                    },
                ),
                createEntry(
                    ACCEPTANCE_MEETING_ID,
                    {
                        parentId:
                            STORYLINE_ID,
                        title:
                            '麦格与斯内普讨论 Tina 背景会议',
                        titleEn:
                            'McGonagall and Snape Discuss Tina Background',
                        tags: [
                            'meeting',
                            'story',
                        ],
                        startClock:
                            ACCEPTANCE_CLOCK,
                        endClock:
                            '1991-09-06 · 20:00',
                        participantIds: [
                            'minerva_mcgonagall',
                            'severus_snape',
                        ],
                        roomId:
                            'mcgonagall_office',
                        sourceBeatId:
                            BEAT_ID,
                        beatSlot: 2,
                        scheduleKind:
                            'story',
                    },
                ),
            ],
            horizon:
                '1991-09-16 · 13:35',
        },
        actorLibrary: [{
            id:
                'canon_harry_james_potter',
            name: '哈利·波特',
            nameEn: 'Harry Potter',
        }, {
            id:
                'canon_hermione_jean_granger',
            name: '赫敏·格兰杰',
            nameEn:
                'Hermione Granger',
        }, {
            id:
                'minerva_mcgonagall',
            name: '米勒娃·麦格',
            nameEn:
                'Minerva McGonagall',
        }, {
            id:
                'severus_snape',
            name: '西弗勒斯·斯内普',
            nameEn:
                'Severus Snape',
        }],
        actors: [],
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'second_floor_corridor',
            customLocalMaps: [{
                id:
                    'hogwarts_castle',
                name: '霍格沃茨城堡',
                defaultLevelId:
                    'level_two',
                nodes: [{
                    id:
                        'second_floor_corridor',
                    name: '二楼走廊',
                    levelId:
                        'level_two',
                }, {
                    id:
                        'gryffindor_common_room',
                    name:
                        '格兰芬多公共休息室',
                    levelId:
                        'tower',
                }, {
                    id:
                        'history_classroom',
                    name: '魔法史教室',
                    levelId:
                        'level_one',
                }, {
                    id:
                        'great_hall',
                    name: '霍格沃茨礼堂',
                    levelId:
                        'ground_floor',
                }, {
                    id:
                        'mcgonagall_office',
                    name: '麦格办公室',
                    levelId:
                        'level_two',
                }, {
                    id:
                        'potions_classroom',
                    name: '地下魔药课教室',
                    levelId:
                        'dungeons',
                }, {
                    id:
                        'transfiguration_classroom',
                    name: '变形术教室',
                    levelId:
                        'level_one',
                }, {
                    id:
                        'black_lake_shore',
                    name: '黑湖湖畔',
                    levelId:
                        'grounds',
                }],
            }],
            generatedLocalNodes: [],
            discoveredLocalNodeIds: [
                'hogwarts_castle:second_floor_corridor',
                'hogwarts_castle:gryffindor_common_room',
                'hogwarts_castle:history_classroom',
                'hogwarts_castle:great_hall',
                'hogwarts_castle:mcgonagall_office',
                'hogwarts_castle:potions_classroom',
                'hogwarts_castle:transfiguration_classroom',
                'hogwarts_castle:black_lake_shore',
            ],
        },
        sceneArchive: [{
            id: HISTORY_ID,
            name: '魔法史上午档案',
            nameEn:
                'Morning History Archive',
            summary:
                '宾斯教授的课堂已封存。',
            summaryEn:
                'Professor Binns has closed the lesson.',
            closureSummary:
                '课堂在午前结束。',
            authorQuill:
                '这堂课证明幽灵也能把时间讲得比石像还慢。',
            authorQuillEn:
                'The lesson proved a ghost can make time move slower than stone.',
            messageIds: [
                0,
                1,
            ],
            startedClock:
                '1991-09-02 · 10:00',
            endedClock:
                '1991-09-02 · 11:00',
            location: '魔法史教室',
            mapId:
                'hogwarts_castle',
            roomId:
                'history_classroom',
            calendarEntryIds: [],
            timelineEntries: [{
                clock:
                    '1991-09-02 · 10:00',
                label:
                    '宾斯教授开始讲授妖精叛乱。',
            }, {
                clock:
                    '1991-09-02 · 10:35',
                label:
                    '羽毛笔在第三次年份列表前集体停顿。',
            }, {
                clock:
                    '1991-09-02 · 11:00',
                label:
                    '课堂结束并封存。',
            }],
            status: 'closed',
        }, {
            id:
                MULTI_ARCHIVE_ID,
            name:
                '明确认领的四态场景',
            nameEn:
                'Explicit Four-state Archive',
            summary:
                '场景只展示存档字段明确认领的计划。',
            summaryEn:
                'The archive shows only explicitly claimed schedules.',
            messageIds: [],
            startedClock:
                '1991-09-02 · 13:20',
            endedClock:
                '1991-09-02 · 13:30',
            location: '二楼走廊',
            mapId:
                'hogwarts_castle',
            roomId:
                'second_floor_corridor',
            calendarEntryIds: [
                'great_hall_breakfast',
                ACTIVE_ID,
                CANCELLED_ID,
                MEETING_ID,
            ],
            timelineEntries: [],
            status: 'closed',
        }, {
            id:
                LEGACY_ARCHIVE_ID,
            name:
                '缺少认领字段的旧场景',
            nameEn:
                'Legacy Archive Without Claims',
            summary:
                '旧档与上午课程重叠，但没有认领字段。',
            summaryEn:
                'The legacy archive overlaps a morning class but has no claim field.',
            messageIds: [],
            startedClock:
                '1991-09-02 · 10:00',
            endedClock:
                '1991-09-02 · 10:20',
            location: '魔法史教室',
            mapId:
                'hogwarts_castle',
            roomId:
                'history_classroom',
            timelineEntries: [],
            status: 'closed',
        }],
        scene: {
            id: CURRENT_SCENE_ID,
            name: '午后的二楼走廊',
            nameEn:
                'Second-floor Corridor',
            summary:
                '学生们在下一项安排前穿过走廊。',
            summaryEn:
                'Students cross the corridor before the next schedule.',
            startedClock:
                '1991-09-02 · 13:10',
            startedMessageId: 2,
            timelineEntries: [{
                clock:
                    '1991-09-02 · 13:10',
                label:
                    '午后走廊场景开始。',
            }],
            mapId:
                'hogwarts_castle',
            roomId:
                'second_floor_corridor',
            calendarEntryIds: [],
            nextSceneIntent: {
                tier: 'medium',
                mapId:
                    'hogwarts_castle',
                roomId:
                    'mcgonagall_office',
            },
        },
        sceneTransition: {
            status: 'idle',
            tier: 'medium',
        },
        modelSlots: {},
        turn: {
            count: 12,
            status: 'idle',
        },
    };
}

function contentType(
    filePath,
) {
    return {
        '.js': 'text/javascript; charset=utf-8',
        '.jpg': 'image/jpeg',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
    }[extname(filePath)] ||
        'application/octet-stream';
}

async function installModuleRouter(
    page,
) {
    const postRequests = [];
    await page.route(
        '**/*',
        async route => {
            const request =
                route.request();
            const url =
                new URL(
                    request.url(),
                );
            if (
                request.method() ===
                'POST'
            ) {
                postRequests.push({
                    method:
                        request.method(),
                    url:
                        request.url(),
                    body:
                        request.postData(),
                });
                await route.fulfill({
                    status: 503,
                    contentType:
                        'application/json',
                    body:
                        '{"error":"POST blocked by isolated Calendar fixture"}',
                });
                return;
            }
            if (
                (
                    url.origin ===
                        MODULE_ORIGIN ||
                    url.origin ===
                        SAVE_GUARD_ORIGIN
                ) &&
                url.pathname ===
                    '/save-guard-fixture'
            ) {
                await route.fulfill({
                    status: 200,
                    contentType:
                        'text/html; charset=utf-8',
                    body:
                        '<!doctype html><title>Save Guard Fixture</title>',
                });
                return;
            }
            if (
                url.origin ===
                    MODULE_ORIGIN &&
                url.pathname.startsWith(
                    MODULE_PREFIX,
                )
            ) {
                const relative =
                    decodeURIComponent(
                        url.pathname.slice(
                            MODULE_PREFIX.length,
                        ),
                    );
                const filePath =
                    resolve(
                        EXTENSION_PATH,
                        relative,
                    );
                if (
                    filePath.startsWith(
                        EXTENSION_PATH,
                    ) &&
                    existsSync(filePath)
                ) {
                    await route.fulfill({
                        status: 200,
                        headers: {
                            'access-control-allow-origin':
                                '*',
                            'content-type':
                                contentType(
                                    filePath,
                                ),
                        },
                        body:
                            readFileSync(
                                filePath,
                            ),
                    });
                    return;
                }
            }
            await route.fulfill({
                status: 204,
                headers: {
                    'access-control-allow-origin':
                        '*',
                },
                body: '',
            });
        },
    );
    return postRequests;
}

async function installSaveGuardFixture(
    page,
    pageId,
) {
    const postRequests =
        await installModuleRouter(
            page,
        );
    await page.goto(
        `${SAVE_GUARD_ORIGIN}/save-guard-fixture?page=${pageId}`,
    );
    await page.evaluate(
        async ({
            moduleOrigin,
            modulePrefix,
            ownerId,
        }) => {
            const {
                createSaveRevisionStorageAdapter,
                createSaveRevisionGuard,
            } = await import(
                `${moduleOrigin}${modulePrefix}runtime/save-revision-guard.js`
            );
            const {
                createGuardedSavePorts,
            } = await import(
                `${moduleOrigin}${modulePrefix}runtime/guarded-save-ports.js`
            );
            window.__runSaveGuardRace =
                async round => {
                    const timelineEpoch =
                        `chromium_storage_race_${round}`;
                    const current = {
                        saveRevisionVersion:
                            1,
                        timelineEpoch,
                        stateRevision:
                            0,
                        revisionHistory:
                            [],
                        clock:
                            '1991-09-02 · 11:30',
                        items: [],
                        actorLibrary: [],
                    };
                    const next =
                        structuredClone(
                            current,
                        );
                    next.clock =
                        ownerId ===
                        'page_a'
                            ? '1991-09-02 · 11:45'
                            : '1991-09-02 · 11:50';
                    const guard =
                        createSaveRevisionGuard({
                            storage:
                                window
                                    .localStorage,
                            lockManager:
                                null,
                            createClaimId:
                                () =>
                                    `${ownerId}_${round}`,
                            now:
                                () =>
                                    '1991-09-02T12:00:00.000Z',
                        });
                    guard.registerHead(
                        current,
                    );
                    const barrierPrefix =
                        `hpmud.saveGuardStress.ready:${round}:`;
                    window.localStorage
                        .setItem(
                            `${barrierPrefix}${ownerId}`,
                            '1',
                        );
                    const peerId =
                        ownerId ===
                        'page_a'
                            ? 'page_b'
                            : 'page_a';
                    const deadline =
                        Date.now() +
                        5_000;
                    while (
                        window
                            .localStorage
                            .getItem(
                                `${barrierPrefix}${peerId}`,
                            ) !== '1'
                    ) {
                        if (
                            Date.now() >
                            deadline
                        ) {
                            throw new Error(
                                `Timed out waiting for ${peerId}.`,
                            );
                        }
                        await new Promise(
                            resolve =>
                                setTimeout(
                                    resolve,
                                    0,
                                ),
                        );
                    }
                    let saveCalls = 0;
                    const result =
                        await guard
                            .guardedSave({
                                currentState:
                                    current,
                                nextState:
                                    next,
                                source:
                                    ownerId,
                                async save() {
                                    saveCalls +=
                                        1;
                                    await new Promise(
                                        resolve =>
                                            setTimeout(
                                                resolve,
                                                2,
                                            ),
                                    );
                                    return {
                                        durable:
                                            true,
                                    };
                                },
                            });
                    return {
                        ok: result.ok,
                        saveCalls,
                        status:
                            result.status,
                    };
                };
            window.__runSaveGuardRecovery =
                async ({
                    failPersistence,
                    hostRevision = 0,
                    hostSaveBehavior =
                    'durable',
                    timelineEpoch,
                    useWebLocks = false,
                }) => {
                    const current = {
                        saveRevisionVersion:
                            1,
                        timelineEpoch,
                        stateRevision:
                            hostRevision,
                        revisionHistory:
                            [],
                        clock:
                            '1991-09-02 · 11:30',
                        items: [],
                        actorLibrary: [],
                    };
                    const guard =
                        createSaveRevisionGuard({
                            storage:
                                window
                                    .localStorage,
                            lockManager:
                                useWebLocks
                                    ? window
                                        .navigator
                                        .locks
                                    : null,
                            createClaimId:
                                () =>
                                    `${ownerId}_recovery`,
                            now:
                                () =>
                                    '1991-09-02T12:00:00.000Z',
                        });
                    let saveCalls = 0;
                    const context = {
                        chatId:
                            `${timelineEpoch}.jsonl`,
                        chatMetadata: {
                            hogwartsMud:
                                current,
                        },
                        saveMetadata() {
                            saveCalls += 1;
                            if (
                                failPersistence ||
                                hostSaveBehavior ===
                                    'resolved_failure'
                            ) {
                                return {
                                    durable:
                                        false,
                                    confirmedFailure:
                                        true,
                                };
                            }
                            if (
                                hostSaveBehavior ===
                                'swallowed_error'
                            ) {
                                return {
                                    durable:
                                        false,
                                };
                            }
                            if (
                                hostSaveBehavior ===
                                'persist_then_throw'
                            ) {
                                window
                                    .localStorage
                                    .setItem(
                                        `hpmud.saveGuardHostState:${timelineEpoch}`,
                                        JSON.stringify(
                                            context
                                                .chatMetadata
                                                .hogwartsMud,
                                        ),
                                    );
                                throw new Error(
                                    'host persisted then threw',
                                );
                            }
                            return {
                                durable: true,
                            };
                        },
                    };
                    const conflicts = [];
                    const conflictStatus =
                        document
                            .createElement(
                                'div',
                            );
                    conflictStatus
                        .setAttribute(
                            'role',
                            'status',
                        );
                    document.body
                        .replaceChildren(
                            conflictStatus,
                        );
                    const ports =
                        createGuardedSavePorts({
                            getContext:
                                () => context,
                            guard,
                            onConflict:
                                (
                                    conflict,
                                    message,
                                ) => {
                                    conflicts
                                        .push(
                                            conflict,
                                        );
                                    conflictStatus
                                        .textContent =
                                        message;
                                },
                        });
                    const guardedContext =
                        ports.getContext();
                    const observed = {
                        blocked:
                            ports
                                .isSaveRevisionBlocked(),
                        conflictCode:
                            ports
                                .getSaveRevisionConflict()
                                ?.code ||
                            '',
                        conflictCount:
                            conflicts
                                .length,
                        firstPaintText:
                            conflictStatus
                                .textContent,
                    };
                    let result = null;
                    let registration = null;
                    let errorMessage = '';
                    try {
                        registration =
                            await ports
                                .registerSaveRevisionHead();
                        guardedContext
                            .chatMetadata
                            .hogwartsMud
                            .clock =
                            '1991-09-02 · 11:45';
                        result =
                            await guardedContext
                                .saveMetadata({
                                    source:
                                        `${ownerId}_recovery`,
                                });
                    } catch (error) {
                        errorMessage =
                            String(
                                error
                                    ?.message ||
                                error,
                            );
                    }
                    const headKey =
                        `hogwartsMud.saveRevision:${
                            encodeURIComponent(
                                timelineEpoch,
                            )
                        }`;
                    return {
                        blocked:
                            ports
                                .isSaveRevisionBlocked(),
                        conflictCount:
                            conflicts
                                .length,
                        errorMessage,
                        head:
                            JSON.parse(
                                window
                                    .localStorage
                                    .getItem(
                                        headKey,
                                    ),
                            ),
                        mutexKeys:
                            Array.from(
                                {
                                    length:
                                        window
                                            .localStorage
                                            .length,
                                },
                                (_, index) =>
                                    window
                                        .localStorage
                                        .key(index),
                            ).filter(key =>
                                key
                                    ?.includes(
                                        `.mutex:${
                                            encodeURIComponent(
                                                timelineEpoch,
                                            )
                                        }:`,
                                    )),
                        nativeWebLocksAvailable:
                            typeof window
                                .navigator
                                .locks
                                ?.request ===
                            'function',
                        ok:
                            result?.ok ||
                            false,
                        persistedHostState:
                            JSON.parse(
                                window
                                    .localStorage
                                    .getItem(
                                        `hpmud.saveGuardHostState:${timelineEpoch}`,
                                    ) ||
                                'null',
                            ),
                        registrationConflictCode:
                            registration
                                ?.conflict
                                ?.code ||
                            '',
                        observed,
                        saveCalls,
                        status:
                            result
                                ?.status ||
                            'save_error',
                    };
                };
            window.__runFencedLeaseSave =
                async ({
                    pauseBeforeHostFence =
                    false,
                    pauseInHostSave =
                    false,
                    timelineEpoch,
                }) => {
                    const current = {
                        saveRevisionVersion:
                            1,
                        timelineEpoch,
                        stateRevision: 0,
                        revisionHistory:
                            [],
                        clock:
                            '1991-09-02 · 11:30',
                        items: [],
                        actorLibrary: [],
                    };
                    const next =
                        structuredClone(
                            current,
                        );
                    next.clock =
                        ownerId ===
                        'page_a'
                            ? '1991-09-02 · 11:45'
                            : '1991-09-02 · 11:50';
                    const clockKey =
                        `hpmud.saveGuardFence.clock:${timelineEpoch}`;
                    const callbackKey =
                        `hpmud.saveGuardFence.callbacks:${timelineEpoch}`;
                    const startedKey =
                        `hpmud.saveGuardFence.started:${timelineEpoch}:${ownerId}`;
                    const preHostPausedKey =
                        `hpmud.saveGuardFence.preHostPaused:${timelineEpoch}:${ownerId}`;
                    const releaseKey =
                        `hpmud.saveGuardFence.release:${timelineEpoch}`;
                    const baseStorageAdapter =
                        createSaveRevisionStorageAdapter(
                            window
                                .localStorage,
                            {
                                now: () =>
                                    Number(
                                        window
                                            .localStorage
                                            .getItem(
                                                clockKey,
                                            ) ||
                                        0,
                                    ),
                                leaseDurationMs:
                                    100,
                                heartbeatIntervalMs:
                                    25,
                                setIntervalFn:
                                    () => ({
                                        unref() {},
                                    }),
                                clearIntervalFn:
                                    () => {},
                            },
                        );
                    const storageAdapter =
                        pauseBeforeHostFence
                            ? {
                                ...baseStorageAdapter,
                                async beginHostSave(
                                    ...args
                                ) {
                                    window
                                        .localStorage
                                        .setItem(
                                            preHostPausedKey,
                                            '1',
                                        );
                                    while (
                                        window
                                            .localStorage
                                            .getItem(
                                                releaseKey,
                                            ) !==
                                        '1'
                                    ) {
                                        await new Promise(
                                            resolve =>
                                                setTimeout(
                                                    resolve,
                                                    0,
                                                ),
                                        );
                                    }
                                    return baseStorageAdapter
                                        .beginHostSave(
                                            ...args,
                                        );
                                },
                            }
                            : baseStorageAdapter;
                    const guard =
                        createSaveRevisionGuard({
                            storageAdapter,
                            lockManager: null,
                            createClaimId:
                                () =>
                                    `${ownerId}_fence`,
                            now:
                                () =>
                                    '1991-09-02T12:00:00.000Z',
                        });
                    guard.registerHead(
                        current,
                    );
                    let saveCalls = 0;
                    const result =
                        await guard
                            .guardedSave({
                                currentState:
                                    current,
                                nextState:
                                    next,
                                source:
                                    `${ownerId}_fence`,
                                async save() {
                                    saveCalls +=
                                        1;
                                    const callbacks =
                                        JSON.parse(
                                            window
                                                .localStorage
                                                .getItem(
                                                    callbackKey,
                                                ) ||
                                            '[]',
                                        );
                                    callbacks.push(
                                        ownerId,
                                    );
                                    window
                                        .localStorage
                                        .setItem(
                                            callbackKey,
                                            JSON.stringify(
                                                callbacks,
                                            ),
                                        );
                                    window
                                        .localStorage
                                        .setItem(
                                            startedKey,
                                            '1',
                                        );
                                    while (
                                        pauseInHostSave &&
                                        window
                                            .localStorage
                                            .getItem(
                                                releaseKey,
                                            ) !==
                                            '1'
                                    ) {
                                        await new Promise(
                                            resolve =>
                                                setTimeout(
                                                    resolve,
                                                    0,
                                                ),
                                        );
                                    }
                                    return {
                                        durable:
                                            true,
                                    };
                                },
                            });
                    return {
                        ok: result.ok,
                        saveCalls,
                        status:
                            result.status,
                    };
                };
        },
        {
            moduleOrigin:
                MODULE_ORIGIN,
            modulePrefix:
                MODULE_PREFIX,
            ownerId: pageId,
        },
    );
    return postRequests;
}

async function installCalendarFixture(
    page,
) {
    const postRequests =
        await installModuleRouter(
            page,
        );
    await page.setContent(`
        <base href="${MODULE_ORIGIN}/">
        <style>
            ${styles}
            html, body {
                width: 100%;
                min-width: 0;
                margin: 0;
                overflow-x: hidden;
            }
            #chat {
                width: 100%;
                height: 420px;
                overflow: auto;
            }
            #hpmud_story {
                height: 240px;
                min-height: 240px;
                overflow: auto;
            }
            .calendar-fixture-spacer {
                height: 900px;
            }
        </style>
        <div id="chat">
            <div class="calendar-fixture-spacer"></div>
            ${panel}
            <div class="calendar-fixture-spacer"></div>
        </div>
    `);
    const worldState =
        createWorldState();
    await page.evaluate(
        async ({
            beatId,
            currentClock,
            currentSceneId,
            freeClock,
            historyId,
            meetingId,
            moduleOrigin,
            modulePrefix,
            state,
            storylineId,
            studyId,
        }) => {
            const moduleUrl =
                path =>
                    `${moduleOrigin}${modulePrefix}${path}`;
            const [
                {
                    archiveSceneWithCalendarLinks,
                },
                {
                    createSaveRevisionGuard,
                },
                {
                    createGuardedSavePorts,
                },
                {
                    createCalendarMomentWorkflow,
                },
                {
                    createMessageRenderer,
                },
                {
                    createStoryRenderer,
                },
                {
                    createCalendarController,
                },
            ] = await Promise.all([
                import(
                    moduleUrl(
                        'domain/calendar-scene.js',
                    )
                ),
                import(
                    moduleUrl(
                        'runtime/save-revision-guard.js',
                    )
                ),
                import(
                    moduleUrl(
                        'runtime/guarded-save-ports.js',
                    )
                ),
                import(
                    moduleUrl(
                        'workflows/calendar-moment.js',
                    )
                ),
                import(
                    moduleUrl(
                        'ui/message-renderer.js',
                    )
                ),
                import(
                    moduleUrl(
                        'ui/story-renderer.js',
                    )
                ),
                import(
                    moduleUrl(
                        'ui/calendar-controller.js',
                    )
                ),
            ]);

            const root =
                document.querySelector(
                    '#hpmud_app',
                );
            const workspace =
                root.querySelector(
                    '#hpmud_workspace',
                );
            root.querySelector(
                '#hpmud_home',
            ).hidden = true;
            workspace.hidden = false;
            const storyElement =
                root.querySelector(
                    '#hpmud_story',
                );
            storyElement.replaceChildren(
                ...Array.from(
                    {
                        length: 30,
                    },
                    (_, index) => {
                        const paragraph =
                            document.createElement(
                                'p',
                            );
                        paragraph.textContent =
                            `主故事滚动锚点 ${index + 1}`;
                        return paragraph;
                    },
                ),
            );

            const calls = {
                director: 0,
                opening: 0,
                translation: 0,
                hostSaves: 0,
                renderAll: 0,
                lastDirectorKind: '',
                lastDirectorEntries: [],
                lastOpeningEntries: [],
            };
            const context = {
                chatId:
                    'calendar-e2e-memory',
                chatMetadata: {
                    hogwartsMud:
                        structuredClone(
                            state,
                        ),
                },
                chat: [{
                    name: 'Player',
                    is_user: true,
                    is_system: false,
                    mes:
                        '宾斯教授，这个年份还会考吗？',
                }, {
                    name: 'Scene',
                    is_user: false,
                    is_system: false,
                    mes:
                        'Professor Binns continued without acknowledging the question.',
                    extra: {
                        hogwartsMud: {
                            sourceEn:
                                'Professor Binns continued without acknowledging the question.',
                            translatedZh:
                                '宾斯教授没有理会问题，继续讲课。',
                            provider:
                                'local',
                            translationVersion:
                                1,
                        },
                    },
                }, {
                    name: 'Player',
                    is_user: true,
                    is_system: false,
                    mes:
                        '我沿着二楼走廊前进。',
                    extra: {
                        hogwartsMud: {
                            sceneId:
                                currentSceneId,
                        },
                    },
                }],
                messageFormatting(
                    text,
                ) {
                    return String(
                        text,
                    )
                        .replaceAll(
                            '&',
                            '&amp;',
                        )
                        .replaceAll(
                            '<',
                            '&lt;',
                        )
                        .replaceAll(
                            '>',
                            '&gt;',
                        )
                        .replaceAll(
                            '\n',
                            '<br>',
                        );
                },
                async saveMetadata() {
                    calls.hostSaves +=
                        1;
                    return {
                        durable: true,
                    };
                },
            };

            const storageValues =
                new Map();
            const guard =
                createSaveRevisionGuard({
                    storage: {
                        get length() {
                            return storageValues
                                .size;
                        },
                        key(index) {
                            return [
                                ...storageValues
                                    .keys(),
                            ][index] ??
                                null;
                        },
                        getItem(key) {
                            return storageValues
                                .get(key) ??
                                null;
                        },
                        setItem(
                            key,
                            value,
                        ) {
                            storageValues.set(
                                key,
                                String(value),
                            );
                        },
                        removeItem(key) {
                            storageValues
                                .delete(key);
                        },
                    },
                    lockManager: null,
                    createClaimId:
                        () =>
                            'calendar_e2e_claim',
                    now:
                        () =>
                            '1991-09-02T19:00:00.000Z',
                });
            const savePorts =
                createGuardedSavePorts({
                    getContext:
                        () =>
                            context,
                    guard,
                });
            await savePorts
                .registerSaveRevisionHead(
                    context,
                    {
                        persistMigration:
                            false,
                    },
                );

            const session = {
                archiveTranscriptLimit: 1,
                calendarSelectedDate: '',
                calendarDisplayMonth: '',
                calendarSelectedEntryId: '',
                calendarSelectedSceneId: '',
                calendarSelectedStorylineId:
                    '',
                calendarTimelineEpoch: '',
                calendarViewMode:
                    'agenda',
                calendarFreeStartTime:
                    '',
                calendarFreeMapId:
                    '',
                calendarFreeRoomId:
                    '',
                calendarMomentBusy: false,
                calendarMomentError: '',
            };
            const getWorldState =
                () =>
                    context
                        .chatMetadata
                        .hogwartsMud;
            const getRoomName =
                (
                    current,
                    mapId,
                    roomId,
                ) =>
                    current.map
                        .customLocalMaps
                        .find(map =>
                            map.id ===
                            mapId)
                        ?.nodes
                        .find(room =>
                            room.id ===
                            roomId)
                        ?.name ||
                    roomId;
            const settings = {
                translationEnabled:
                    true,
                translationProvider:
                    'local',
            };
            const messageRenderer =
                createMessageRenderer({
                    session,
                    LIVE_STREAM_PHASE_LABELS:
                        {},
                    MAX_RENDERED_MESSAGES:
                        100,
                    acceptItemCandidate:
                        () => {},
                    acceptSpellCandidate:
                        () => {},
                    getContext:
                        () =>
                            context,
                    getItemProposalDecision:
                        () => '',
                    getSettings:
                        () =>
                            settings,
                    getSpellProposalDecision:
                        () => '',
                    getWorldState,
                    ignoreItemCandidate:
                        () => {},
                    ignoreSpellCandidate:
                        () => {},
                    initials:
                        name =>
                            String(
                                name ||
                                '?',
                            ).slice(
                                0,
                                2,
                            ),
                    normalizeTranslationProvider:
                        provider =>
                            provider ||
                            'off',
                    projectItemCard:
                        item =>
                            item,
                    async translateMessage() {
                        calls.translation +=
                            1;
                    },
                });
            const storyRenderer =
                createStoryRenderer({
                    refs: {
                        root,
                        storyElement,
                    },
                    session,
                    ARCHIVE_TRANSCRIPT_PAGE_SIZE:
                        1,
                    getContext:
                        () =>
                            context,
                    renderAuthorQuillCard:
                        messageRenderer
                            .renderAuthorQuillCard,
                    renderMessage:
                        messageRenderer
                            .renderMessage,
                });

            const jobRegistry = {};
            let controller = null;
            const workflow =
                createCalendarMomentWorkflow({
                    CONTEXT_SIZE_PRESETS: {
                        rich: 120000,
                    },
                    DEFAULT_MODEL_SLOTS: {
                        medium: {
                            maxResponseLength:
                                12000,
                        },
                    },
                    applySceneTransition(
                        current,
                        payload,
                        archiveEntry,
                        options,
                    ) {
                        const archived =
                            archiveSceneWithCalendarLinks(
                                current,
                                archiveEntry,
                            );
                        return {
                            ...archived,
                            clock:
                                payload
                                    .nextClock,
                            location:
                                getRoomName(
                                    archived,
                                    payload
                                        .nextScene
                                        .mapId,
                                    payload
                                        .nextScene
                                        .roomId,
                                ),
                            map: {
                                ...archived
                                    .map,
                                activeMapId:
                                    payload
                                        .nextScene
                                        .mapId,
                                currentLocalNodeId:
                                    payload
                                        .nextScene
                                        .roomId,
                            },
                            scene: {
                                id:
                                    payload
                                        .nextScene
                                        .id,
                                name:
                                    payload
                                        .nextScene
                                        .name,
                                nameEn:
                                    payload
                                        .nextScene
                                        .nameEn,
                                summary:
                                    payload
                                        .nextScene
                                        .summary,
                                summaryEn:
                                    payload
                                        .nextScene
                                        .summaryEn,
                                startedClock:
                                    payload
                                        .nextClock,
                                startedMessageId:
                                    options
                                        .startedMessageId,
                                timelineEntries: [{
                                    clock:
                                        payload
                                            .nextClock,
                                    label:
                                        payload
                                            .nextScene
                                            .summary,
                                }],
                                mapId:
                                    payload
                                        .nextScene
                                        .mapId,
                                roomId:
                                    payload
                                        .nextScene
                                        .roomId,
                                calendarEntryIds:
                                    options
                                        .calendarEntryIds,
                                nextSceneIntent:
                                    payload
                                        .nextScene
                                        .followingSceneIntent,
                            },
                            sceneTransition: {
                                status:
                                    'idle',
                                tier:
                                    options
                                        .tier,
                            },
                        };
                    },
                    applySystemPrompt:
                        () => {},
                    buildSceneArchiveEntry(
                        current,
                        payload,
                        tier,
                    ) {
                        return {
                            id:
                                current
                                    .scene
                                    .id,
                            name:
                                current
                                    .scene
                                    .name,
                            nameEn:
                                current
                                    .scene
                                    .nameEn,
                            summary:
                                current
                                    .scene
                                    .summary,
                            summaryEn:
                                current
                                    .scene
                                    .summaryEn,
                            closureSummary:
                                payload
                                    .closureSummary,
                            closureSummaryEn:
                                payload
                                    .closureSummaryEn,
                            authorQuill:
                                payload
                                    .authorQuill,
                            authorQuillEn:
                                payload
                                    .authorQuillEn,
                            messageIds: [
                                2,
                            ],
                            startedClock:
                                current
                                    .scene
                                    .startedClock,
                            endedClock:
                                currentClock,
                            mapId:
                                current
                                    .scene
                                    .mapId,
                            roomId:
                                current
                                    .scene
                                    .roomId,
                            calendarEntryIds:
                                current
                                    .scene
                                    .calendarEntryIds,
                            timelineEntries:
                                structuredClone(
                                    current
                                        .scene
                                        .timelineEntries,
                                ),
                            tier,
                            status:
                                'closed',
                        };
                    },
                    buildSceneTransitionMessage(
                        payload,
                    ) {
                        return {
                            name: 'Scene',
                            is_user: false,
                            is_system: false,
                            mes:
                                payload
                                    .nextScene
                                    .openingSegments[0]
                                    .textEn,
                            extra: {
                                hogwartsMud: {
                                    role:
                                        'scene_opening',
                                    sceneId:
                                        payload
                                            .nextScene
                                            .id,
                                },
                            },
                        };
                    },
                    createContextBudgetPlan:
                        () => ({
                            ragLimit: 4,
                        }),
                    async generateSceneTransitionOpening(
                        _slot,
                        _state,
                        payload,
                        _expectedDestination,
                        _contextPlan,
                        transitionContext,
                    ) {
                        calls.opening +=
                            1;
                        calls.lastOpeningEntries =
                            transitionContext
                                .calendarEntries
                                .map(entry =>
                                    entry.id);
                        return payload;
                    },
                    async generateSceneTransitionPackage(
                        _slot,
                        _state,
                        _tier,
                        _destinationHint,
                        _expectedDestination,
                        _intentOverride,
                        _retrievedKnowledge,
                        _contextPlan,
                        transitionContext,
                    ) {
                        calls.director +=
                            1;
                        calls.lastDirectorKind =
                            transitionContext
                                .kind;
                        calls.lastDirectorEntries =
                            transitionContext
                                .calendarEntries
                                .map(entry =>
                                    entry.id);
                        const free =
                            transitionContext
                                .kind ===
                            'timeline_moment';
                        const destination =
                            transitionContext
                                .suggestedDestination;
                        return {
                            transitionMinutes:
                                325,
                            nextClock:
                                transitionContext
                                    .fixedClock,
                            closureSummary:
                                '午后走廊场景结束。',
                            closureSummaryEn:
                                'The afternoon corridor scene closes.',
                            authorQuill:
                                free
                                    ? '玩家从时间线自由选择了下一幕。'
                                    : '日历只认领玩家明确选择的会面。',
                            authorQuillEn:
                                free
                                    ? 'The player chose the next scene freely from the timeline.'
                                    : 'The Calendar claimed only the meeting the player selected.',
                            unresolvedThreadsEn:
                                [],
                            relationshipUpdates:
                                [],
                            nextScene: {
                                id:
                                    free
                                        ? 'black_lake_free_scene'
                                        : 'staff_calendar_meeting',
                                name:
                                    free
                                        ? '黑湖湖畔自由场景'
                                        : '麦格办公室教职员会议',
                                nameEn:
                                    free
                                        ? 'Free Scene at the Black Lake'
                                        : 'Staff Meeting in McGonagall Office',
                                summary:
                                    free
                                        ? '玩家在所选时间地点自由开始，不认领日程。'
                                        : '玩家进入所选教职员会议，其他日程继续并发。',
                                summaryEn:
                                    free
                                        ? 'The player begins freely at the selected time and location without claiming a schedule.'
                                        : 'The selected staff meeting begins while other schedules remain concurrent.',
                                chapterEn:
                                    free
                                        ? 'Lakeside Afternoon'
                                        : 'Staff Review',
                                mapId:
                                    destination
                                        .mapId,
                                roomId:
                                    destination
                                        .roomId,
                                actorStates:
                                    [],
                                openingSegments: [{
                                    type:
                                        'narration',
                                    textEn:
                                        free
                                            ? 'The Black Lake receives an unclaimed afternoon scene.'
                                            : 'Only the selected staff meeting enters the observed scene.',
                                }],
                                followingSceneIntent: {
                                    tier:
                                        'medium',
                                    mapId:
                                        destination
                                            .mapId,
                                    roomId:
                                        destination
                                            .roomId,
                                },
                            },
                        };
                    },
                    getContext:
                        () =>
                            context,
                    getMudState:
                        getWorldState,
                    guardedSaveTransaction:
                        savePorts
                            .guardedSaveTransaction,
                    jobRegistry,
                    localizeSceneTransitionPackage:
                        async payload =>
                            payload,
                    renderAll() {
                        calls.renderAll +=
                            1;
                        controller
                            ?.renderCalendar();
                    },
                    resolveRoleSlots:
                        () => ({
                            low: {
                                profileId:
                                    'memory-low',
                                contextSize:
                                    120000,
                                maxResponseLength:
                                    12000,
                            },
                            medium: {
                                profileId:
                                    'memory-medium',
                                contextSize:
                                    120000,
                                maxResponseLength:
                                    12000,
                            },
                            high: {
                                profileId:
                                    'memory-high',
                                contextSize:
                                    120000,
                                maxResponseLength:
                                    12000,
                            },
                        }),
                    retrieveLocalKnowledge:
                        async () =>
                            [],
                });

            const calendarDialog =
                root.querySelector(
                    '#hpmud_calendar_dialog',
                );
            controller =
                createCalendarController({
                    refs: {
                        root,
                        calendarDialog,
                        storyElement,
                    },
                    session,
                    ARCHIVE_TRANSCRIPT_PAGE_SIZE:
                        1,
                    getRoomName,
                    getWorldState,
                    renderSceneArchiveTranscript:
                        storyRenderer
                            .renderSceneArchiveTranscript,
                    runCalendarMoment:
                        workflow
                            .runCalendarMoment,
                    runTimelineMoment:
                        workflow
                            .runTimelineMoment,
                });
            const trigger =
                root.querySelector(
                    '#hpmud_calendar',
                );
            trigger.addEventListener(
                'click',
                () =>
                    controller
                        .openCalendar(),
            );
            root.querySelector(
                '#hpmud_calendar_close',
            ).addEventListener(
                'click',
                controller
                    .closeCalendar,
            );
            root.querySelector(
                '#hpmud_calendar_previous_month',
            ).addEventListener(
                'click',
                () =>
                    controller
                        .shiftCalendarMonth(
                            -1,
                        ),
            );
            root.querySelector(
                '#hpmud_calendar_next_month',
            ).addEventListener(
                'click',
                () =>
                    controller
                        .shiftCalendarMonth(
                            1,
                        ),
            );
            root.querySelectorAll(
                '[data-calendar-view]',
            ).forEach(tab => {
                tab.addEventListener(
                    'click',
                    () =>
                        controller
                            .setCalendarView(
                                tab.dataset
                                    .calendarView,
                                {
                                    focus:
                                        true,
                                },
                            ),
                );
            });
            calendarDialog
                .addEventListener(
                    'keydown',
                    controller
                        .handleCalendarKeyDown,
                    true,
                );
            calendarDialog
                .addEventListener(
                    'cancel',
                    event => {
                        event
                            .preventDefault();
                        controller
                            .closeCalendar();
                    },
                );
            calendarDialog
                .addEventListener(
                    'close',
                    controller
                        .handleCalendarDialogClose,
                );

            const hostChat =
                document.querySelector(
                    '#chat',
                );
            hostChat.scrollTop = 260;
            storyElement.scrollTop =
                180;
            window.__calendarFixture = {
                calls,
                context,
                controller,
                ids: {
                    currentSceneId,
                    beatId,
                    freeClock,
                    historyId,
                    meetingId,
                    storylineId,
                    studyId,
                },
                initialState:
                    JSON.stringify(
                        getWorldState(),
                    ),
                read() {
                    return {
                        activeTag:
                            document
                                .activeElement
                                ?.tagName ||
                            '',
                        activeDate:
                            document
                                .activeElement
                                ?.dataset
                                ?.calendarDate ||
                            '',
                        activeEntry:
                            document
                                .activeElement
                                ?.dataset
                                ?.calendarEntryId ||
                            '',
                        calls:
                            structuredClone(
                                calls,
                            ),
                        chatScrollTop:
                            hostChat
                                .scrollTop,
                        dialogOpen:
                            calendarDialog
                                .open,
                        selectedDate:
                            session
                                .calendarSelectedDate,
                        selectedEntryId:
                            session
                                .calendarSelectedEntryId,
                        selectedSceneId:
                            session
                                .calendarSelectedSceneId,
                        state:
                            structuredClone(
                                getWorldState(),
                            ),
                        stateJson:
                            JSON.stringify(
                                getWorldState(),
                            ),
                        storyScrollTop:
                            storyElement
                                .scrollTop,
                        tabStops:
                            [
                                ...document
                                    .querySelectorAll(
                                        '#hpmud_calendar_items [role="option"][tabindex="0"]',
                                    ),
                            ].map(option =>
                                option.dataset
                                    .calendarItem),
                    };
                },
                replaceTimeline() {
                    const current =
                        getWorldState();
                    const entry =
                        structuredClone(
                            current
                                .calendar
                                .entries
                                .find(candidate =>
                                    candidate.id ===
                                    studyId),
                        );
                    const nextClock =
                        '1991-10-05 · 09:00';
                    entry.id =
                        'new_timeline_class';
                    entry.parentId = '';
                    entry.title =
                        '新时间线课程';
                    entry.titleEn =
                        'New Timeline Class';
                    entry.startClock =
                        '1991-10-05 · 10:00';
                    entry.endClock =
                        '1991-10-05 · 11:00';
                    entry.createdClock =
                        nextClock;
                    entry.updatedClock =
                        nextClock;
                    context
                        .chatMetadata
                        .hogwartsMud = {
                            ...structuredClone(
                                current,
                            ),
                            timelineEpoch:
                                'calendar_e2e_timeline_two',
                            stateRevision: 1,
                            revisionHistory: [],
                            clock:
                                nextClock,
                            calendar: {
                                version: 2,
                                storylines: [],
                                storyBeats: [],
                                entries: [
                                    entry,
                                ],
                                horizon:
                                    '1991-10-19 · 09:00',
                            },
                            sceneArchive: [],
                        };
                },
            };
        },
        {
            currentClock:
                CURRENT_CLOCK,
            currentSceneId:
                CURRENT_SCENE_ID,
            beatId:
                BEAT_ID,
            freeClock:
                FREE_CLOCK,
            historyId:
                HISTORY_ID,
            meetingId:
                MEETING_ID,
            moduleOrigin:
                MODULE_ORIGIN,
            modulePrefix:
                MODULE_PREFIX,
            state:
                worldState,
            storylineId:
                STORYLINE_ID,
            studyId:
                STUDY_ID,
        },
    );
    return {
        postRequests,
    };
}

async function openCalendar(
    page,
) {
    const trigger =
        page.locator(
            '#hpmud_calendar',
        );
    await trigger.click();
    await expect(
        page.locator(
            '#hpmud_calendar_dialog',
        ),
    ).toBeVisible();
}

async function readFixture(
    page,
) {
    return page.evaluate(
        () =>
            window
                .__calendarFixture
                .read(),
    );
}

async function expectBackgroundScroll(
    page,
    expected,
) {
    await expect.poll(
        async () => {
            const current =
                await readFixture(
                    page,
                );
            return {
                chat:
                    current
                        .chatScrollTop,
                story:
                    current
                        .storyScrollTop,
            };
        },
    ).toEqual({
        chat:
            expected
                .chatScrollTop,
        story:
            expected
                .storyScrollTop,
    });
}

async function assertViewportContract(
    page,
    width,
) {
    const metrics =
        await page.evaluate(() => {
            const rect =
                selector =>
                    document
                        .querySelector(
                            selector,
                        )
                        .getBoundingClientRect();
            const visibleDates = [
                ...document
                    .querySelectorAll(
                        '[data-calendar-date]',
                    ),
            ].filter(node => {
                const bounds =
                    node
                        .getBoundingClientRect();
                return (
                    bounds.width >
                        0 &&
                    bounds.height >
                        0
                );
            }).map(node => {
                const bounds =
                    node
                        .getBoundingClientRect();
                return {
                    height:
                        bounds.height,
                    width:
                        bounds.width,
                };
            });
            const dialog =
                document.querySelector(
                    '#hpmud_calendar_dialog',
                );
            const layout =
                rect(
                    '.hpmud-calendar-layout',
                );
            const preview =
                rect(
                    '.hpmud-calendar-preview',
                );
            const sidebar =
                rect(
                    '.hpmud-calendar-sidebar',
                );
            const day =
                rect(
                    '.hpmud-calendar-day',
                );
            const interactionTargets = [
                ...document.querySelectorAll([
                    '#hpmud_calendar_close',
                    '.hpmud-calendar-view-tabs > button',
                    '.hpmud-calendar-date',
                    '.hpmud-calendar-plan-card',
                    '.hpmud-calendar-scene-summary',
                    '#hpmud_calendar_free_toggle',
                ].join(', ')),
            ].filter(node => {
                const bounds =
                    node.getBoundingClientRect();
                return (
                    bounds.width > 0 &&
                    bounds.height > 0
                );
            }).map(node => {
                const bounds =
                    node.getBoundingClientRect();
                return {
                    height:
                        bounds.height,
                    width:
                        bounds.width,
                };
            });
            const planStyle =
                window.getComputedStyle(
                    document.querySelector(
                        '.hpmud-calendar-plan-card',
                    ),
                );
            return {
                dateTargets:
                    visibleDates,
                day,
                dialogClientWidth:
                    dialog.clientWidth,
                dialogScrollWidth:
                    dialog.scrollWidth,
                documentClientWidth:
                    document
                        .documentElement
                        .clientWidth,
                documentScrollWidth:
                    document
                        .documentElement
                        .scrollWidth,
                interactionTargets,
                layout,
                layoutOrder: [
                    ...document.querySelector(
                        '.hpmud-calendar-layout',
                    ).children,
                ].map(node =>
                    node.className),
                planAnimationName:
                    planStyle.animationName,
                planTransitionDuration:
                    planStyle.transitionDuration,
                preview,
                reducedMotion:
                    window.matchMedia(
                        '(prefers-reduced-motion: reduce)',
                    ).matches,
                sidebar,
                viewportWidth:
                    window.innerWidth,
            };
        });
    expect(metrics.viewportWidth)
        .toBe(width);
    expect(metrics.documentScrollWidth)
        .toBeLessThanOrEqual(
            metrics.documentClientWidth,
        );
    expect(metrics.dialogScrollWidth)
        .toBeLessThanOrEqual(
            metrics.dialogClientWidth,
        );
    expect(metrics.dateTargets.length)
        .toBeGreaterThan(0);
    expect(metrics.layoutOrder)
        .toEqual([
            'hpmud-calendar-sidebar',
            'hpmud-calendar-day',
            'hpmud-calendar-preview',
        ]);
    for (const target of [
        ...metrics.dateTargets,
        ...metrics.interactionTargets,
    ]) {
        expect(target.width)
            .toBeGreaterThanOrEqual(
                43.99,
            );
        expect(target.height)
            .toBeGreaterThanOrEqual(
                43.99,
            );
    }
    if (width > 820) {
        expect(metrics.day.left)
            .toBeGreaterThanOrEqual(
                metrics.sidebar.right -
                    1,
            );
        expect(metrics.preview.left)
            .toBeGreaterThanOrEqual(
                metrics.day.right -
                    1,
            );
        expect(
            Math.abs(
                metrics.preview.top -
                metrics.sidebar.top,
            ),
        ).toBeLessThanOrEqual(1);
        expect(
            Math.abs(
                metrics.day.top -
                metrics.sidebar.top,
            ),
        ).toBeLessThanOrEqual(1);
    } else if (width === 820) {
        expect(metrics.day.left)
            .toBeGreaterThanOrEqual(
                metrics.sidebar.right -
                    1,
            );
        expect(metrics.preview.top)
            .toBeGreaterThanOrEqual(
                Math.max(
                    metrics.sidebar.bottom,
                    metrics.day.bottom,
                ) - 1,
            );
    } else {
        expect(metrics.day.top)
            .toBeGreaterThanOrEqual(
                metrics.sidebar.bottom -
                    1,
            );
        expect(metrics.preview.top)
            .toBeGreaterThanOrEqual(
                metrics.day.bottom -
                    1,
            );
    }
    expect(metrics.reducedMotion)
        .toBe(true);
    expect(metrics.planAnimationName)
        .toBe('none');
    expect(metrics.planTransitionDuration)
        .toBe('0s');
}

async function assertV21FixtureContract(
    page,
) {
    const hourLabels =
        await page.locator(
            '.hpmud-calendar-hour-scale time',
        ).allTextContents();
    expect(hourLabels)
        .toContain('08:00');
    expect(hourLabels)
        .toContain('20:00');

    const meeting =
        page.locator(
            `.hpmud-calendar-plan-card[data-calendar-entry-id="${MEETING_ID}"]`,
        );
    const study =
        page.locator(
            `.hpmud-calendar-plan-card[data-calendar-entry-id="${STUDY_ID}"]`,
        );
    const overlapLayout =
        await Promise.all([
            meeting.evaluate(node => ({
                duration:
                    Number(
                        node.dataset
                            .calendarDurationHeight,
                    ),
                laneCount:
                    Number(
                        node.dataset
                            .calendarLaneCount,
                    ),
                laneIndex:
                    Number(
                        node.dataset
                            .calendarLaneIndex,
                    ),
                top:
                    Number(
                        node.dataset
                            .calendarGridTop,
                    ),
            })),
            study.evaluate(node => ({
                duration:
                    Number(
                        node.dataset
                            .calendarDurationHeight,
                    ),
                laneCount:
                    Number(
                        node.dataset
                            .calendarLaneCount,
                    ),
                laneIndex:
                    Number(
                        node.dataset
                            .calendarLaneIndex,
                    ),
                top:
                    Number(
                        node.dataset
                            .calendarGridTop,
                    ),
            })),
        ]);
    expect(overlapLayout[0].top)
        .toBe(overlapLayout[1].top);
    expect(overlapLayout[0].duration)
        .toBe(60);
    expect(overlapLayout[1].duration)
        .toBe(60);
    expect(overlapLayout.map(item =>
        item.laneCount))
        .toEqual([
            2,
            2,
        ]);
    expect(new Set(overlapLayout.map(item =>
        item.laneIndex)).size)
        .toBe(2);

    await meeting.click();
    await expect(
        page.locator(
            '#hpmud_calendar_preview',
        ),
    ).toContainText(
        '麦格与斯内普讨论蒂娜背景',
    );
    await study.click();
    await expect(
        page.locator(
            '#hpmud_calendar_preview',
        ),
    ).toContainText(
        '与赫敏的课后补习',
    );

    const sceneButtons =
        page.locator(
            '.hpmud-calendar-scene-summary',
        );
    await expect(sceneButtons)
        .toHaveCount(3);
    expect(
        await sceneButtons.evaluateAll(nodes =>
            nodes.map(node => ({
                controls:
                    node.getAttribute(
                        'aria-controls',
                    ),
                expanded:
                    node.getAttribute(
                        'aria-expanded',
                    ),
            }))),
    ).toEqual([
        expect.objectContaining({
            expanded: 'false',
        }),
        expect.objectContaining({
            expanded: 'false',
        }),
        expect.objectContaining({
            expanded: 'false',
        }),
    ]);

    const multiButton =
        page.locator(
            `[data-calendar-scene-id="${MULTI_ARCHIVE_ID}"]`,
        );
    await expect(multiButton)
        .toHaveAttribute(
            'aria-controls',
            /hpmud_calendar_scene_links_/u,
        );
    const multiControls =
        await multiButton.evaluate(node =>
            node.getAttribute(
                'aria-controls',
            ));
    expect(multiControls)
        .toBeTruthy();
    await expect(
        page.locator(
            `#${multiControls}`,
        ),
    ).toBeHidden();
    await multiButton.click();
    await expect(multiButton)
        .toHaveAttribute(
            'aria-expanded',
            'true',
        );
    await expect(
        page.locator(
            `#${multiControls}`,
        ),
    ).toBeVisible();
    const multiCard =
        page.locator(
            `[data-calendar-scene-card="${MULTI_ARCHIVE_ID}"]`,
        );
    await expect(
        multiCard.locator(
            '.hpmud-calendar-scene-plan',
        ),
    ).toHaveCount(4);
    await expect(multiCard)
        .toContainText(
            '格兰芬多早餐',
        );
    await expect(multiCard)
        .toContainText(
            '已完成时间段',
        );
    await expect(multiCard)
        .toContainText(
            '午后走廊巡查',
        );
    await expect(multiCard)
        .toContainText(
            '进行中',
        );
    await expect(multiCard)
        .toContainText(
            '取消的飞行练习',
        );
    await expect(multiCard)
        .toContainText(
            '已取消',
        );
    await expect(multiCard)
        .toContainText(
            '麦格与斯内普讨论蒂娜背景',
        );
    await expect(multiCard)
        .toContainText(
            '计划中',
        );
    await expect(multiCard)
        .not.toContainText(
            '与赫敏的课后补习',
        );

    for (const archiveId of [
        HISTORY_ID,
        LEGACY_ARCHIVE_ID,
    ]) {
        const button =
            page.locator(
                `[data-calendar-scene-id="${archiveId}"]`,
            );
        await button.click();
        const card =
            page.locator(
                `[data-calendar-scene-card="${archiveId}"]`,
            );
        await expect(card)
            .toContainText(
                '未关联计划',
            );
        await expect(card)
            .not.toContainText(
                '一年级魔咒课',
            );
    }

    const preview =
        page.locator(
            '#hpmud_calendar_preview',
        );
    await expect(preview)
        .not.toContainText(
            '开始时刻的全部安排',
        );
    await expect(
        preview.locator(
            '.hpmud-calendar-free-form',
        ),
    ).toHaveCount(0);
    await expect(
        page.locator(
            '#hpmud_calendar_dialog',
        ),
    ).not.toContainText(
        /\bScene\b|attendance|去了|没去/u,
    );

    await meeting.click();
    const freeToggle =
        page.locator(
            '#hpmud_calendar_free_toggle',
        );
    await expect(freeToggle)
        .toHaveAttribute(
            'aria-expanded',
            'false',
        );
    await freeToggle.click();
    await expect(freeToggle)
        .toHaveAttribute(
            'aria-expanded',
            'true',
        );
    await expect(
        page.locator(
            '.hpmud-calendar-scenes .hpmud-calendar-free-form',
        ),
    ).toBeVisible();
    await expect(
        preview.locator(
            '.hpmud-calendar-free-form',
        ),
    ).toHaveCount(0);
    await page.keyboard.press(
        'Escape',
    );
    await expect(
        page.locator(
            '#hpmud_calendar_dialog',
        ),
    ).toBeVisible();
    await expect(freeToggle)
        .toHaveAttribute(
            'aria-expanded',
            'false',
        );
    await expect(freeToggle)
        .toBeFocused();
}

test.use({
    browserName: 'chromium',
    launchOptions: {
        args: [
            '--disable-breakpad',
            '--disable-crash-reporter',
        ],
    },
});

const calendarViewports = [{
    width: 1280,
    height: 900,
}, {
    width: 820,
    height: 900,
}, {
    width: 560,
    height: 900,
}, {
    width: 390,
    height: 844,
}];

test('desktop, 820px, 560px, and 390px Calendar layouts preserve responsive and narrow-history contracts', async ({
    context,
}) => {
    for (
        const viewport of
        calendarViewports
    ) {
        const page =
            await context.newPage();
        try {
            await page.setViewportSize(
                viewport,
            );
            await page.emulateMedia({
                reducedMotion:
                    'reduce',
            });
            const {
                postRequests,
            } = await installCalendarFixture(
                page,
            );
            const before =
                viewport.width === 390
                    ? await readFixture(
                        page,
                    )
                    : null;

            await openCalendar(page);
            await assertViewportContract(
                page,
                viewport.width,
            );
            if (
                viewport.width ===
                1280
            ) {
                await assertV21FixtureContract(
                    page,
                );
            }
            if (before) {
                await assertNarrowHistoryContract(
                    page,
                    before,
                );
            }
            expect(postRequests)
                .toEqual([]);
        } finally {
            await page.close();
        }
    }
});

test('ordinary open after a timeline epoch change uses the new current date without auto-selecting a schedule', async ({
    page,
}) => {
    await page.setViewportSize({
        width: 1280,
        height: 900,
    });
    const {
        postRequests,
    } = await installCalendarFixture(
        page,
    );

    await openCalendar(page);
    await page.locator(
        `[data-calendar-scene-id="${HISTORY_ID}"]`,
    ).first().click();
    await page.locator(
        '#hpmud_calendar_close',
    ).click();
    await page.evaluate(
        () =>
            window
                .__calendarFixture
                .replaceTimeline(),
    );

    await openCalendar(page);
    await expect(
        page.locator(
            '#hpmud_calendar_month_label',
        ),
    ).toHaveText('1991 年 10 月');
    await expect(
        page.locator(
            '#hpmud_calendar_date_label',
        ),
    ).toContainText('1991 年 10 月 5 日');
    const newEntry =
        page.locator(
            '[data-calendar-entry-id="new_timeline_class"]',
        ).first();
    await expect(newEntry)
        .toHaveAttribute(
            'aria-selected',
            'false',
        );
    await expect(newEntry)
        .toHaveAttribute(
            'tabindex',
            '0',
        );
    await expect(
        page.locator(
            '.hpmud-calendar-enter',
        ),
    ).toHaveCount(0);
    await expect(
        page.locator(
            '#hpmud_calendar_preview',
        ),
    ).toContainText(
        '尚未选择',
    );
    const current =
        await readFixture(
            page,
        );
    expect(current.selectedDate)
        .toBe('1991-10-05');
    expect(current.selectedEntryId)
        .toBe('');
    expect(current.selectedSceneId)
        .toBe('');
    expect(current.tabStops)
        .toEqual([
            'new_timeline_class',
        ]);
    expect(postRequests)
        .toEqual([]);
});

test('desktop history uses the real archive renderer and stays model-free, write-free, keyboard-safe, and scroll-stable', async ({
    page,
}) => {
    await page.setViewportSize({
        width: 1280,
        height: 900,
    });
    const {
        postRequests,
    } = await installCalendarFixture(
        page,
    );
    const before =
        await readFixture(
            page,
        );

    await openCalendar(page);
    await expectBackgroundScroll(
        page,
        before,
    );
    await page.locator(
        `[data-calendar-scene-id="${HISTORY_ID}"]`,
    ).click();
    await expectBackgroundScroll(
        page,
        before,
    );
    const preview =
        page.locator(
            '#hpmud_calendar_preview',
        );
    await expect(preview)
        .toContainText(
            '时间线 · 3 条',
        );
    await expect(preview)
        .toContainText(
            '羽毛笔在第三次年份列表前集体停顿。',
        );
    await expect(preview)
        .toContainText(
            '宾斯教授没有理会问题，继续讲课。',
        );
    await expect(preview)
        .toContainText(
            '作者的羽毛笔',
        );
    await expect(preview)
        .toContainText(
            '这堂课证明幽灵也能把时间讲得比石像还慢。',
        );
    await expect(
        preview.getByRole(
            'button',
            {
                name:
                    /重新翻译/u,
            },
        ),
    ).toHaveCount(0);
    await expect(
        preview.locator(
            '.hpmud-calendar-enter',
        ),
    ).toHaveCount(0);

    const selectedDate =
        page.locator(
            '[data-calendar-date="1991-09-02"]:visible',
        ).first();
    await selectedDate.focus();
    await page.keyboard.press(
        'ArrowRight',
    );
    await expect.poll(
        async () =>
            (
                await readFixture(
                    page,
                )
            ).activeDate,
    ).toBe('1991-09-03');
    await page.keyboard.press(
        'ArrowLeft',
    );
    await expect.poll(
        async () =>
            (
                await readFixture(
                    page,
                )
            ).activeDate,
    ).toBe('1991-09-02');

    const storylineTab =
        page.getByRole(
            'tab',
            {
                name:
                    '剧情线',
            },
        );
    await storylineTab.click();
    const storyline =
        page.locator(
            `[data-calendar-storyline-id="${STORYLINE_ID}"]`,
        ).first();
    await expect(storyline)
        .toHaveAttribute(
            'tabindex',
            '0',
        );
    await storyline.click();
    await expect(preview)
        .toContainText(
            '蒂娜的秘密',
        );
    await expect(preview)
        .toContainText(
            '秋季线索',
        );
    await expect(preview)
        .toContainText(
            '0 / 4 场景',
        );
    await expect(
        preview.locator(
            '.hpmud-calendar-enter',
        ),
    ).toHaveCount(0);
    await page.getByRole(
        'tab',
        {
            name:
                '日期视图',
        },
    ).click();
    await expect(
        page.locator(
            `[data-calendar-entry-id="${STORYLINE_ID}"]`,
        ),
    ).toHaveCount(0);
    const orderedScheduleIds =
        await page.locator(
            '#hpmud_calendar_plan_grid .hpmud-calendar-plan-card',
        ).evaluateAll(nodes =>
            nodes.map(node =>
                node.dataset
                    .calendarEntryId));
    expect(
        orderedScheduleIds,
    ).toEqual([
        'great_hall_breakfast',
        'morning_charms_class',
        'great_hall_lunch',
        ACTIVE_ID,
        CANCELLED_ID,
        STUDY_ID,
        MEETING_ID,
    ]);
    const meeting =
        page.locator(
            `[data-calendar-entry-id="${MEETING_ID}"]`,
        ).first();
    const study =
        page.locator(
            `[data-calendar-entry-id="${STUDY_ID}"]`,
        ).first();
    await meeting.click();
    await page.keyboard.press(
        'ArrowUp',
    );
    await expect.poll(
        async () =>
            (
                await readFixture(
                    page,
                )
            ).activeEntry,
    ).toBe(STUDY_ID);
    const options =
        page.locator(
            '#hpmud_calendar_plan_grid [role="option"]',
        );
    await expect(meeting)
        .toHaveAttribute(
            'aria-selected',
            'true',
        );
    await expect(meeting)
        .toHaveAttribute(
            'tabindex',
            '-1',
        );
    await expect(study)
        .toHaveAttribute(
            'aria-selected',
            'false',
        );
    await expect(study)
        .toHaveAttribute(
            'tabindex',
            '0',
        );
    await expect.poll(
        () =>
            options.evaluateAll(nodes =>
                nodes.filter(node =>
                    node.tabIndex === 0).length),
    ).toBe(1);
    await page.keyboard.press(
        'Enter',
    );
    await expect(
        page.locator(
            `[data-calendar-entry-id="${STUDY_ID}"][aria-selected="true"]`,
        ).first(),
    ).toBeFocused();
    await expect(study)
        .toHaveAttribute(
            'tabindex',
            '0',
        );
    await expect.poll(
        () =>
            options.evaluateAll(nodes =>
                nodes.filter(node =>
                    node.tabIndex === 0).length),
    ).toBe(1);
    await page.keyboard.press(
        'Tab',
    );
    await expect(study)
        .not.toBeFocused();
    await page.keyboard.press(
        'Shift+Tab',
    );
    await expect(study)
        .toBeFocused();
    await expectBackgroundScroll(
        page,
        before,
    );

    await page.keyboard.press(
        'Escape',
    );
    await expect(
        page.locator(
            '#hpmud_calendar_dialog',
        ),
    ).toBeHidden();
    await expect(
        page.locator(
            '#hpmud_calendar',
        ),
    ).toBeFocused();
    await expectBackgroundScroll(
        page,
        before,
    );
    const after =
        await readFixture(
            page,
        );
    expect(after.stateJson)
        .toBe(before.stateJson);
    expect(after.calls.director)
        .toBe(0);
    expect(after.calls.opening)
        .toBe(0);
    expect(after.calls.translation)
        .toBe(0);
    expect(after.calls.hostSaves)
        .toBe(0);
    expect(after.storyScrollTop)
        .toBe(
            before.storyScrollTop,
        );
    expect(after.chatScrollTop)
        .toBe(
            before.chatScrollTop,
        );
    expect(postRequests)
        .toEqual([]);
});

test('1991-09-06 keeps five schedules ordered and enters only the selected staff meeting', async ({
    page,
}) => {
    await page.setViewportSize({
        width: 1280,
        height: 900,
    });
    const {
        postRequests,
    } = await installCalendarFixture(
        page,
    );

    await openCalendar(page);
    await page.locator(
        `[data-calendar-date="${ACCEPTANCE_DATE}"]:visible`,
    ).first().click();
    await expect(
        page.locator(
            '#hpmud_calendar_date_summary',
        ),
    ).toHaveText(
        '5 项计划 · 0 个场景',
    );
    const scheduleRows =
        page.locator(
            '#hpmud_calendar_items [data-calendar-entry-id]',
        );
    await expect(scheduleRows)
        .toHaveCount(5);
    const orderedSchedules =
        await scheduleRows
            .evaluateAll(nodes =>
                nodes.map(node => ({
                    id:
                        node.dataset
                            .calendarEntryId,
                    startClock:
                        node.querySelector(
                            'time',
                        )?.dateTime ||
                        '',
                })));
    expect(orderedSchedules)
        .toEqual(
            ACCEPTANCE_SCHEDULE_IDS
                .map((id, index) => ({
                    id,
                    startClock: [
                        '1991-09-06T08:00',
                        '1991-09-06T09:00',
                        '1991-09-06T12:30',
                        '1991-09-06T18:30',
                        '1991-09-06T19:00',
                    ][index],
                })),
        );
    expect(
        orderedSchedules
            .some(schedule =>
                [
                    STORYLINE_ID,
                    BEAT_ID,
                ].includes(
                    schedule.id,
                )),
    ).toBe(false);

    await page.locator(
        `[data-calendar-entry-id="${ACCEPTANCE_MEETING_ID}"]`,
    ).click();
    await expect(
        page.locator(
            '#hpmud_calendar_preview',
        ),
    ).toContainText(
        '麦格办公室',
    );
    await page.locator(
        '.hpmud-calendar-enter',
    ).click();
    await expect(
        page.locator(
            '#hpmud_calendar_dialog',
        ),
    ).toBeHidden();

    const result =
        await readFixture(
            page,
        );
    const meeting =
        result.state.calendar.entries
            .find(entry =>
                entry.id ===
                ACCEPTANCE_MEETING_ID);
    const concurrentClass =
        result.state.calendar.entries
            .find(entry =>
                entry.id ===
                ACCEPTANCE_CONCURRENT_ID);
    expect(result.state.clock)
        .toBe(ACCEPTANCE_CLOCK);
    expect(
        result.state.scene
            .calendarEntryIds,
    ).toEqual([
        ACCEPTANCE_MEETING_ID,
    ]);
    expect(result.state.scene.roomId)
        .toBe('mcgonagall_office');
    expect(meeting.status)
        .toBe('active');
    expect(concurrentClass.status)
        .toBe('active');
    expect(
        result.state.scene
            .calendarEntryIds,
    ).not.toContain(
        ACCEPTANCE_CONCURRENT_ID,
    );
    expect(
        result.state.calendar.entries
            .filter(entry =>
                ACCEPTANCE_SCHEDULE_IDS
                    .includes(
                        entry.id,
                    ))
            .some(entry =>
                entry.status ===
                'cancelled'),
    ).toBe(false);
    expect(
        result.calls
            .lastDirectorEntries,
    ).toEqual([
        ACCEPTANCE_MEETING_ID,
    ]);
    expect(
        result.calls
            .lastOpeningEntries,
    ).toEqual([
        ACCEPTANCE_MEETING_ID,
    ]);
    expect(result.calls.hostSaves)
        .toBe(1);
    expect(postRequests)
        .toEqual([]);
});

async function assertNarrowHistoryContract(
    page,
    before,
) {
    await page.locator(
        `[data-calendar-scene-id="${HISTORY_ID}"]`,
    ).click();
    const preview =
        page.locator(
            '#hpmud_calendar_preview',
        );
    await expect(preview)
        .toContainText(
            '宾斯教授没有理会问题，继续讲课。',
        );
    await expect(
        preview.locator(
            '.hpmud-calendar-enter',
        ),
    ).toHaveCount(0);
    await expect(
        preview.locator(
            'button, [role="button"], [role="menuitem"]',
        ).filter({
            hasText:
                /重新翻译|模型/u,
        }),
    ).toHaveCount(0);

    const languageToggle =
        preview.locator(
            '.hpmud-message-translation > summary',
        );
    const loadEarlier =
        preview.locator(
            '.hpmud-load-earlier',
        );
    await expect(languageToggle)
        .toBeVisible();
    await expect(loadEarlier)
        .toBeVisible();
    await languageToggle.click();
    const languageButtons =
        preview.locator(
            '.hpmud-message-translation-menu button',
        );
    await expect(languageButtons)
        .toHaveCount(2);

    const targetMetrics =
        await preview.locator(
            [
                '.hpmud-message-translation > summary',
                '.hpmud-message-translation-menu button',
                '.hpmud-load-earlier',
            ].join(', '),
        ).evaluateAll(nodes =>
            nodes.map(node => {
                const bounds =
                    node.getBoundingClientRect();
                return {
                    height:
                        bounds.height,
                    width:
                        bounds.width,
                };
            }));
    for (
        const target of
        targetMetrics
    ) {
        expect(target.width)
            .toBeGreaterThanOrEqual(
                43.99,
            );
        expect(target.height)
            .toBeGreaterThanOrEqual(
                43.99,
            );
    }

    await languageButtons.nth(1)
        .click();
    await loadEarlier.click();
    await expect(preview)
        .toContainText(
            '宾斯教授，这个年份还会考吗？',
        );
    const overflow =
        await page.evaluate(() => {
            const dialog =
                document.querySelector(
                    '#hpmud_calendar_dialog',
                );
            const previewNode =
                document.querySelector(
                    '#hpmud_calendar_preview',
                );
            const transcript =
                document.querySelector(
                    '#hpmud_calendar_transcript',
                );
            return {
                dialog:
                    dialog.scrollWidth -
                    dialog.clientWidth,
                document:
                    document.documentElement
                        .scrollWidth -
                    document.documentElement
                        .clientWidth,
                preview:
                    previewNode.scrollWidth -
                    previewNode.clientWidth,
                transcript:
                    transcript.scrollWidth -
                    transcript.clientWidth,
            };
        });
    expect(overflow)
        .toEqual({
            dialog: 0,
            document: 0,
            preview: 0,
            transcript: 0,
        });

    const after =
        await readFixture(
            page,
        );
    expect(after.stateJson)
        .toBe(before.stateJson);
    expect(after.calls.director)
        .toBe(0);
    expect(after.calls.opening)
        .toBe(0);
    expect(after.calls.translation)
        .toBe(0);
    expect(after.calls.hostSaves)
        .toBe(0);
}

test('Calendar entry claims only the selected meeting while concurrent schedules settle through one guarded commit', async ({
    page,
}) => {
    await page.setViewportSize({
        width: 1280,
        height: 900,
    });
    const {
        postRequests,
    } = await installCalendarFixture(
        page,
    );
    const before =
        await readFixture(
            page,
        );
    expect(before.state.stateRevision)
        .toBe(26);
    await openCalendar(page);
    await page.locator(
        `[data-calendar-entry-id="${MEETING_ID}"]`,
    ).first().click();
    await page.locator(
        '.hpmud-calendar-enter',
    ).click();
    await expect(
        page.locator(
            '#hpmud_calendar_dialog',
        ),
    ).toBeHidden();

    const result =
        await readFixture(
            page,
        );
    const entries =
        result.state
            .calendar
            .entries;
    const selected =
        entries.filter(entry =>
            [
                MEETING_ID,
                STUDY_ID,
            ].includes(
                entry.id,
            ));
    expect(result.state.clock)
        .toBe(TARGET_CLOCK);
    expect(result.state.stateRevision)
        .toBe(27);
    expect(
        result.state
            .scene
            .calendarEntryIds,
    ).toEqual([
        MEETING_ID,
    ]);
    expect(
        selected.map(entry => [
            entry.id,
            entry.status,
        ]),
    ).toEqual([
        [
            MEETING_ID,
            'active',
        ],
        [
            STUDY_ID,
            'active',
        ],
    ]);
    expect(
        result.state
            .scene.roomId,
    ).toBe(
        'mcgonagall_office',
    );
    expect(
        result.state
            .calendar
            .storylines[0]
            .status,
    ).toBe('active');
    expect(
        result.state
            .calendar
            .storyBeats[0]
            .relatedSceneIds,
    ).toEqual([]);
    expect(
        entries
            .filter(entry =>
                [
                    MEETING_ID,
                    STUDY_ID,
                ].includes(
                    entry.id,
                ))
            .some(entry =>
                entry.status ===
                'cancelled'),
    ).toBe(false);
    expect(
        result.state
            .sceneArchive
            .filter(record =>
                record.id ===
                CURRENT_SCENE_ID),
    ).toHaveLength(1);
    expect(result.calls.hostSaves)
        .toBe(1);
    expect(result.calls.director)
        .toBe(1);
    expect(result.calls.opening)
        .toBe(1);
    expect(
        result.calls
            .lastDirectorEntries,
    ).toEqual([
        MEETING_ID,
    ]);
    expect(
        result.calls
            .lastOpeningEntries,
    ).toEqual([
        MEETING_ID,
    ]);
    expect(postRequests)
        .toEqual([]);
});

test('free opening creates an unclaimed Scene at the selected authoritative time and location', async ({
    page,
}) => {
    await page.setViewportSize({
        width: 1280,
        height: 900,
    });
    const {
        postRequests,
    } = await installCalendarFixture(
        page,
    );
    await openCalendar(page);
    const freeToggle =
        page.locator(
            '#hpmud_calendar_free_toggle',
        );
    await expect(freeToggle)
        .toHaveAttribute(
            'aria-controls',
            'hpmud_calendar_free_panel',
        );
    await expect(freeToggle)
        .toHaveAttribute(
            'aria-expanded',
            'false',
        );
    await expect(
        page.locator(
            '#hpmud_calendar_preview .hpmud-calendar-free-form',
        ),
    ).toHaveCount(0);
    await freeToggle.click();
    await expect(freeToggle)
        .toHaveAttribute(
            'aria-expanded',
            'true',
        );
    const form =
        page.locator(
            '.hpmud-calendar-scenes .hpmud-calendar-free-form',
        ).first();
    await expect(form)
        .toBeVisible();
    await expect(
        page.locator(
            '#hpmud_calendar_preview .hpmud-calendar-free-form',
        ),
    ).toHaveCount(0);
    const time =
        form.locator(
            'input[type="time"]',
        );
    await time.fill('15:00');
    await time.press('Tab');
    await form.locator(
        'select',
    ).nth(1).selectOption(
        'black_lake_shore',
    );
    await expect(
        form.locator(
            '.hpmud-calendar-free-feedback',
        ),
    ).toContainText(
        FREE_CLOCK,
    );
    await form.locator(
        '.hpmud-calendar-free-submit',
    ).click();
    await expect(
        page.locator(
            '#hpmud_calendar_dialog',
        ),
    ).toBeHidden();

    const result =
        await readFixture(
            page,
        );
    expect(result.state.clock)
        .toBe(FREE_CLOCK);
    expect(result.state.stateRevision)
        .toBe(27);
    expect(
        result.state
            .scene.roomId,
    ).toBe(
        'black_lake_shore',
    );
    expect(
        result.state
            .scene
            .calendarEntryIds,
    ).toEqual([]);
    expect(
        result.state
            .calendar
            .entries
            .filter(entry =>
                [
                    MEETING_ID,
                    STUDY_ID,
                ].includes(
                    entry.id,
                ))
            .map(entry =>
                entry.status),
    ).toEqual([
        'planned',
        'planned',
    ]);
    expect(
        result.calls
            .lastDirectorKind,
    ).toBe(
        'timeline_moment',
    );
    expect(
        result.calls
            .lastDirectorEntries,
    ).toEqual([]);
    expect(
        result.calls
            .lastOpeningEntries,
    ).toEqual([]);
    expect(result.calls.hostSaves)
        .toBe(1);
    expect(postRequests)
        .toEqual([]);
});

test('native Web Locks recover an expired fallback claim before first-paint conflict UI', async ({
    page,
}) => {
    const postRequests =
        await installSaveGuardFixture(
            page,
            'native_web_locks',
        );
    const timelineEpoch =
        'chrome_native_lock_first_paint';
    await page.evaluate(
        currentTimelineEpoch => {
            window.localStorage
                .clear();
            const encodedEpoch =
                encodeURIComponent(
                    currentTimelineEpoch,
                );
            const mutexPrefix =
                `hogwartsMud.saveRevision.mutex:${encodedEpoch}:`;
            window.localStorage
                .setItem(
                    `hogwartsMud.saveRevision:${encodedEpoch}`,
                    JSON.stringify({
                        saveRevisionVersion:
                            1,
                        timelineEpoch:
                            currentTimelineEpoch,
                        stateRevision: 1,
                        claimId:
                            'crashed_fallback_page',
                        claimBaseRevision:
                            0,
                    }),
                );
            for (const suffix of [
                'ticket:crashed_fallback_page',
                'owner',
            ]) {
                window.localStorage
                    .setItem(
                        `${mutexPrefix}${suffix}`,
                        JSON.stringify({
                            ticket: 1,
                            claimId:
                                'crashed_fallback_page',
                            expiresAt: 0,
                        }),
                    );
            }
        },
        timelineEpoch,
    );

    const result =
        await page.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                failPersistence: false,
                timelineEpoch,
                useWebLocks: true,
            },
        );

    expect(result)
        .toMatchObject({
            blocked: false,
            conflictCount: 0,
            errorMessage: '',
            head: {
                timelineEpoch,
                stateRevision: 1,
                claimId: '',
            },
            nativeWebLocksAvailable:
                true,
            observed: {
                blocked: false,
                conflictCode: '',
                conflictCount: 0,
                firstPaintText: '',
            },
            ok: true,
            registrationConflictCode:
                '',
            saveCalls: 1,
            status: 'saved',
        });
    await expect(
        page.getByRole(
            'status',
        ),
    ).not.toHaveText(
        '时间线已在其他页面更新，请刷新后继续。',
    );
    expect(postRequests)
        .toEqual([]);
});

test('persistent fallback fence prevents a second host callback after heartbeat lease expiry', async ({
    context,
    page,
}) => {
    const peer =
        await context.newPage();
    const [
        pagePosts,
        peerPosts,
    ] = await Promise.all([
        installSaveGuardFixture(
            page,
            'page_a',
        ),
        installSaveGuardFixture(
            peer,
            'page_b',
        ),
    ]);
    const timelineEpoch =
        'chrome_fenced_lease_expiry';
    const clockKey =
        `hpmud.saveGuardFence.clock:${timelineEpoch}`;
    const callbackKey =
        `hpmud.saveGuardFence.callbacks:${timelineEpoch}`;
    const startedKey =
        `hpmud.saveGuardFence.started:${timelineEpoch}:page_a`;
    const releaseKey =
        `hpmud.saveGuardFence.release:${timelineEpoch}`;
    await page.evaluate(
        ({
            callbacks,
            clock,
        }) => {
            window.localStorage
                .clear();
            window.localStorage
                .setItem(
                    clock,
                    '0',
                );
            window.localStorage
                .setItem(
                    callbacks,
                    '[]',
                );
        },
        {
            callbacks:
                callbackKey,
            clock:
                clockKey,
        },
    );
    const pendingA =
        page.evaluate(
            options =>
                window
                    .__runFencedLeaseSave(
                        options,
                    ),
            {
                pauseInHostSave: true,
                timelineEpoch,
            },
        );
    await expect.poll(
        () =>
            peer.evaluate(
                key =>
                    window
                        .localStorage
                        .getItem(
                            key,
                        ),
                startedKey,
            ),
    ).toBe('1');
    await peer.evaluate(
        ({
            clock,
            value,
        }) =>
            window.localStorage
                .setItem(
                    clock,
                    value,
                ),
        {
            clock:
                clockKey,
            value: '101',
        },
    );
    const resultB =
        await peer.evaluate(
            options =>
                window
                    .__runFencedLeaseSave(
                        options,
                    ),
            {
                pauseInHostSave:
                    false,
                timelineEpoch,
            },
        );
    expect(resultB.ok)
        .toBe(false);
    expect(resultB.saveCalls)
        .toBe(0);
    await peer.evaluate(
        key =>
            window.localStorage
                .setItem(
                    key,
                    '1',
                ),
        releaseKey,
    );
    const resultA =
        await pendingA;
    expect(resultA)
        .toEqual({
            ok: true,
            saveCalls: 1,
            status: 'saved',
        });
    const finalStorage =
        await peer.evaluate(
            ({
                callbacks,
                currentTimelineEpoch,
            }) => {
                const encodedEpoch =
                    encodeURIComponent(
                        currentTimelineEpoch,
                    );
                const headKey =
                    `hogwartsMud.saveRevision:${encodedEpoch}`;
                const mutexPrefix =
                    `hogwartsMud.saveRevision.mutex:${encodedEpoch}:`;
                return {
                    callbacks:
                        JSON.parse(
                            window
                                .localStorage
                                .getItem(
                                    callbacks,
                                ),
                        ),
                    head:
                        JSON.parse(
                            window
                                .localStorage
                                .getItem(
                                    headKey,
                                ),
                        ),
                    mutexKeys:
                        Array.from(
                            {
                                length:
                                    window
                                        .localStorage
                                        .length,
                            },
                            (_, index) =>
                                window
                                    .localStorage
                                    .key(index),
                        ).filter(key =>
                            key
                                ?.startsWith(
                                    mutexPrefix,
                                )),
                };
            },
            {
                callbacks:
                    callbackKey,
                currentTimelineEpoch:
                    timelineEpoch,
            },
        );
    expect(finalStorage)
        .toEqual({
            callbacks: [
                'page_a',
            ],
            head: {
                saveRevisionVersion:
                    1,
                timelineEpoch,
                stateRevision: 1,
                claimId: '',
            },
            mutexKeys: [],
        });
    expect(pagePosts)
        .toEqual([]);
    expect(peerPosts)
        .toEqual([]);
    await peer.close();
});

test('fallback CAS fences a resumed pre-host page after its heartbeat lease expires', async ({
    context,
    page,
}) => {
    const peer =
        await context.newPage();
    const [
        pagePosts,
        peerPosts,
    ] = await Promise.all([
        installSaveGuardFixture(
            page,
            'page_a',
        ),
        installSaveGuardFixture(
            peer,
            'page_b',
        ),
    ]);
    const timelineEpoch =
        'chrome_pre_host_takeover';
    const clockKey =
        `hpmud.saveGuardFence.clock:${timelineEpoch}`;
    const callbackKey =
        `hpmud.saveGuardFence.callbacks:${timelineEpoch}`;
    const pausedKey =
        `hpmud.saveGuardFence.preHostPaused:${timelineEpoch}:page_a`;
    const releaseKey =
        `hpmud.saveGuardFence.release:${timelineEpoch}`;
    await page.evaluate(
        ({
            callbacks,
            clock,
        }) => {
            window.localStorage
                .clear();
            window.localStorage
                .setItem(
                    clock,
                    '0',
                );
            window.localStorage
                .setItem(
                    callbacks,
                    '[]',
                );
        },
        {
            callbacks:
                callbackKey,
            clock:
                clockKey,
        },
    );
    const pendingA =
        page.evaluate(
            options =>
                window
                    .__runFencedLeaseSave(
                        options,
                    ),
            {
                pauseBeforeHostFence:
                    true,
                timelineEpoch,
            },
        );
    await expect.poll(
        () =>
            peer.evaluate(
                key =>
                    window
                        .localStorage
                        .getItem(
                            key,
                        ),
                pausedKey,
            ),
    ).toBe('1');
    await peer.evaluate(
        ({
            clock,
            value,
        }) =>
            window.localStorage
                .setItem(
                    clock,
                    value,
                ),
        {
            clock:
                clockKey,
            value: '101',
        },
    );
    const resultB =
        await peer.evaluate(
            options =>
                window
                    .__runFencedLeaseSave(
                        options,
                    ),
            {
                timelineEpoch,
            },
        );
    expect(resultB)
        .toEqual({
            ok: true,
            saveCalls: 1,
            status: 'saved',
        });
    await peer.evaluate(
        key =>
            window.localStorage
                .setItem(
                    key,
                    '1',
                ),
        releaseKey,
    );
    const resultA =
        await pendingA;
    expect(resultA)
        .toEqual({
            ok: false,
            saveCalls: 0,
            status:
                'save_claim_lost',
        });
    const finalStorage =
        await peer.evaluate(
            ({
                callbacks,
                currentTimelineEpoch,
            }) => {
                const encodedEpoch =
                    encodeURIComponent(
                        currentTimelineEpoch,
                    );
                const headKey =
                    `hogwartsMud.saveRevision:${encodedEpoch}`;
                const fenceKey =
                    `hogwartsMud.saveRevision.fence:${encodedEpoch}`;
                const mutexPrefix =
                    `hogwartsMud.saveRevision.mutex:${encodedEpoch}:`;
                return {
                    callbacks:
                        JSON.parse(
                            window
                                .localStorage
                                .getItem(
                                    callbacks,
                                ),
                        ),
                    fence:
                        window
                            .localStorage
                            .getItem(
                                fenceKey,
                            ),
                    head:
                        JSON.parse(
                            window
                                .localStorage
                                .getItem(
                                    headKey,
                                ),
                        ),
                    mutexKeys:
                        Array.from(
                            {
                                length:
                                    window
                                        .localStorage
                                        .length,
                            },
                            (_, index) =>
                                window
                                    .localStorage
                                    .key(index),
                        ).filter(key =>
                            key
                                ?.startsWith(
                                    mutexPrefix,
                                )),
                };
            },
            {
                callbacks:
                    callbackKey,
                currentTimelineEpoch:
                    timelineEpoch,
            },
        );
    expect(finalStorage)
        .toEqual({
            callbacks: [
                'page_b',
            ],
            fence: '2',
            head: {
                saveRevisionVersion:
                    1,
                timelineEpoch,
                stateRevision: 1,
                claimId: '',
            },
            mutexKeys: [],
        });
    expect(pagePosts)
        .toEqual([]);
    expect(peerPosts)
        .toEqual([]);
    await peer.close();
});

test('durable acknowledgement separates resolved failure from a persisted-then-thrown host save across pages', async ({
    context,
    page,
}) => {
    const peer =
        await context.newPage();
    const [
        pagePosts,
        peerPosts,
    ] = await Promise.all([
        installSaveGuardFixture(
            page,
            'durability_a',
        ),
        installSaveGuardFixture(
            peer,
            'durability_b',
        ),
    ]);
    await page.evaluate(() =>
        window.localStorage
            .clear());

    const resolvedFailureEpoch =
        'chrome_resolved_failure';
    const resolvedFailure =
        await page.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                hostSaveBehavior:
                    'resolved_failure',
                timelineEpoch:
                    resolvedFailureEpoch,
            },
        );
    expect(resolvedFailure)
        .toMatchObject({
            blocked: false,
            conflictCount: 0,
            errorMessage:
                'Host save durability was not acknowledged',
            head: {
                timelineEpoch:
                    resolvedFailureEpoch,
                stateRevision: 0,
                claimId: '',
            },
            mutexKeys: [],
            ok: false,
            saveCalls: 1,
            status: 'save_error',
        });
    const resolvedRetry =
        await peer.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                timelineEpoch:
                    resolvedFailureEpoch,
            },
        );
    expect(resolvedRetry)
        .toMatchObject({
            blocked: false,
            conflictCount: 0,
            errorMessage: '',
            head: {
                timelineEpoch:
                    resolvedFailureEpoch,
                stateRevision: 1,
                claimId: '',
            },
            mutexKeys: [],
            ok: true,
            saveCalls: 1,
            status: 'saved',
        });

    const persistedThrowEpoch =
        'chrome_persisted_throw';
    const persistedThrow =
        await page.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                hostSaveBehavior:
                    'persist_then_throw',
                timelineEpoch:
                    persistedThrowEpoch,
            },
        );
    expect(persistedThrow)
        .toMatchObject({
            blocked: true,
            conflictCount: 1,
            errorMessage:
                'Host save durability was not acknowledged: host persisted then threw',
            head: {
                timelineEpoch:
                    persistedThrowEpoch,
                stateRevision: 1,
                claimId:
                    'durability_a_recovery',
                claimBaseRevision: 0,
                claimPhase:
                    'host_save_started',
            },
            mutexKeys: [],
            ok: false,
            persistedHostState: {
                timelineEpoch:
                    persistedThrowEpoch,
                stateRevision: 1,
            },
            saveCalls: 1,
            status: 'save_error',
        });

    const oldPage =
        await peer.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                hostRevision: 0,
                timelineEpoch:
                    persistedThrowEpoch,
            },
        );
    expect(oldPage)
        .toMatchObject({
            blocked: true,
            conflictCount: 1,
            head: {
                timelineEpoch:
                    persistedThrowEpoch,
                stateRevision: 1,
                claimId:
                    'durability_a_recovery',
                claimBaseRevision: 0,
                claimPhase:
                    'host_save_started',
            },
            ok: false,
            observed: {
                blocked: true,
                conflictCode:
                    'save_in_progress',
                conflictCount: 1,
            },
            registrationConflictCode:
                'save_in_progress',
            saveCalls: 0,
            status: 'save_error',
        });

    const reloaded =
        await page.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                hostRevision:
                    persistedThrow
                        .persistedHostState
                        .stateRevision,
                timelineEpoch:
                    persistedThrowEpoch,
            },
        );
    expect(reloaded)
        .toMatchObject({
            blocked: false,
            conflictCount: 0,
            errorMessage: '',
            head: {
                timelineEpoch:
                    persistedThrowEpoch,
                stateRevision: 2,
                claimId: '',
            },
            mutexKeys: [],
            ok: true,
            observed: {
                blocked: false,
                conflictCode: '',
                conflictCount: 0,
            },
            registrationConflictCode:
                '',
            saveCalls: 1,
            status: 'saved',
        });
    expect([
        resolvedFailure
            .head
            .stateRevision,
        resolvedRetry
            .head
            .stateRevision,
        persistedThrow
            .head
            .stateRevision,
        oldPage
            .head
            .stateRevision,
        reloaded
            .head
            .stateRevision,
    ]).toEqual([
        0,
        1,
        1,
        1,
        2,
    ]);
    expect(pagePosts)
        .toEqual([]);
    expect(peerPosts)
        .toEqual([]);
    await peer.close();
});

test('a swallowed host error that resolves non-durable stays fenced across pages', async ({
    context,
    page,
}) => {
    const peer =
        await context.newPage();
    const [
        pagePosts,
        peerPosts,
    ] = await Promise.all([
        installSaveGuardFixture(
            page,
            'swallowed_a',
        ),
        installSaveGuardFixture(
            peer,
            'swallowed_b',
        ),
    ]);
    await page.evaluate(() =>
        window.localStorage
            .clear());
    const timelineEpoch =
        'chrome_swallowed_host_error';
    const swallowed =
        await page.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                hostSaveBehavior:
                    'swallowed_error',
                timelineEpoch,
            },
        );
    expect(swallowed)
        .toMatchObject({
            blocked: true,
            conflictCount: 1,
            errorMessage:
                'Host save durability was not acknowledged',
            head: {
                timelineEpoch,
                stateRevision: 1,
                claimId:
                    'swallowed_a_recovery',
                claimBaseRevision: 0,
                claimPhase:
                    'host_save_started',
                claimFence: 1,
            },
            mutexKeys: [],
            ok: false,
            saveCalls: 1,
            status: 'save_error',
        });

    const oldPage =
        await peer.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                hostRevision: 0,
                timelineEpoch,
            },
        );
    expect(oldPage)
        .toMatchObject({
            blocked: true,
            conflictCount: 1,
            head: {
                timelineEpoch,
                stateRevision: 1,
                claimId:
                    'swallowed_a_recovery',
                claimBaseRevision: 0,
                claimPhase:
                    'host_save_started',
                claimFence: 1,
            },
            ok: false,
            observed: {
                blocked: true,
                conflictCode:
                    'save_in_progress',
                conflictCount: 1,
            },
            registrationConflictCode:
                'save_in_progress',
            saveCalls: 0,
            status: 'save_error',
        });
    expect([
        swallowed
            .head
            .stateRevision,
        oldPage
            .head
            .stateRevision,
    ]).toEqual([
        1,
        1,
    ]);
    expect(pagePosts)
        .toEqual([]);
    expect(peerPosts)
        .toEqual([]);
    await peer.close();
});

test('post-host crash reload finalizes the persisted fence without revision rollback', async ({
    page,
}) => {
    const postRequests =
        await installSaveGuardFixture(
            page,
            'post_host_reload',
        );
    const timelineEpoch =
        'chrome_post_host_monotonic';
    const initialRevision = 5;
    await page.evaluate(
        ({
            revision,
            timeline,
        }) => {
            window.localStorage
                .clear();
            const encodedEpoch =
                encodeURIComponent(
                    timeline,
                );
            window.localStorage
                .setItem(
                    `hogwartsMud.saveRevision:${encodedEpoch}`,
                    JSON.stringify({
                        saveRevisionVersion:
                            1,
                        timelineEpoch:
                            timeline,
                        stateRevision:
                            revision,
                        claimId:
                            'crashed_after_host',
                        claimBaseRevision:
                            revision - 1,
                        claimPhase:
                            'host_save_started',
                        claimFence: 7,
                    }),
                );
            window.localStorage
                .setItem(
                    `hogwartsMud.saveRevision.fence:${encodedEpoch}`,
                    '7',
                );
        },
        {
            revision:
                initialRevision,
            timeline:
                timelineEpoch,
        },
    );
    const result =
        await page.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                hostRevision:
                    initialRevision,
                timelineEpoch,
            },
        );

    expect(result)
        .toMatchObject({
            blocked: false,
            conflictCount: 0,
            errorMessage: '',
            head: {
                timelineEpoch,
                stateRevision: 6,
                claimId: '',
            },
            mutexKeys: [],
            observed: {
                blocked: false,
                conflictCode: '',
                conflictCount: 0,
            },
            ok: true,
            registrationConflictCode:
                '',
            saveCalls: 1,
            status: 'saved',
        });
    expect(
        result.head
            .stateRevision,
    ).toBeGreaterThan(
        initialRevision - 1,
    );
    expect(postRequests)
        .toEqual([]);
});

test('two same-origin Chromium pages complete 100 zero-double-save races and recover crashed storage tickets', async ({
    context,
    page,
}) => {
    const peer =
        await context.newPage();
    const [
        pagePosts,
        peerPosts,
    ] = await Promise.all([
        installSaveGuardFixture(
            page,
            'page_a',
        ),
        installSaveGuardFixture(
            peer,
            'page_b',
        ),
    ]);
    await page.evaluate(() => {
        window.localStorage
            .clear();
        window.localStorage
            .setItem(
                'hpmud.saveGuardStress.shared',
                'visible',
            );
    });
    await expect.poll(
        () =>
            peer.evaluate(() =>
                window.localStorage
                    .getItem(
                        'hpmud.saveGuardStress.shared',
                    )),
    ).toBe('visible');

    const rounds = 100;
    for (
        let round = 0;
        round < rounds;
        round += 1
    ) {
        const [
            pageResult,
            peerResult,
        ] = await Promise.all([
            page.evaluate(
                currentRound =>
                    window
                        .__runSaveGuardRace(
                            currentRound,
                        ),
                round,
            ),
            peer.evaluate(
                currentRound =>
                    window
                        .__runSaveGuardRace(
                            currentRound,
                        ),
                round,
            ),
        ]);
        const results = [
            pageResult,
            peerResult,
        ];
        expect(
            results.reduce(
                (
                    count,
                    result,
                ) =>
                    count +
                    result.saveCalls,
                0,
            ),
            `round ${round} save callback count`,
        ).toBe(1);
        expect(
            results.filter(
                result =>
                    result.ok,
            ),
            `round ${round} successful guard count`,
        ).toHaveLength(1);
    }

    const recoveryEpoch =
        'chromium_storage_recovery';
    await page.evaluate(
        timelineEpoch => {
            const encodedEpoch =
                encodeURIComponent(
                    timelineEpoch,
                );
            const headKey =
                `hogwartsMud.saveRevision:${encodedEpoch}`;
            const mutexPrefix =
                `hogwartsMud.saveRevision.mutex:${encodedEpoch}:`;
            window.localStorage
                .setItem(
                    headKey,
                    JSON.stringify({
                        saveRevisionVersion:
                            1,
                        timelineEpoch,
                        stateRevision:
                            1,
                        claimId:
                            'crashed_page',
                        claimBaseRevision:
                            0,
                    }),
                );
            window.localStorage
                .setItem(
                    `${mutexPrefix}choosing:crashed_page`,
                    '{"claimId":',
                );
            window.localStorage
                .setItem(
                    `${mutexPrefix}ticket:crashed_page`,
                    JSON.stringify({
                        ticket: 1,
                        claimId:
                            'crashed_page',
                        expiresAt: 0,
                    }),
                );
            window.localStorage
                .setItem(
                    `${mutexPrefix}owner`,
                    JSON.stringify({
                        ticket: 1,
                        claimId:
                            'crashed_page',
                        expiresAt: 0,
                    }),
                );
        },
        recoveryEpoch,
    );
    const failedRecovery =
        await peer.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                failPersistence:
                    true,
                timelineEpoch:
                    recoveryEpoch,
            },
        );
    expect(failedRecovery)
        .toMatchObject({
            blocked: false,
            conflictCount: 0,
            errorMessage:
                'Host save durability was not acknowledged',
            head: {
                timelineEpoch:
                    recoveryEpoch,
                stateRevision: 0,
                claimId: '',
            },
            mutexKeys: [],
            ok: false,
            observed: {
                blocked: false,
                conflictCode: '',
                conflictCount: 0,
            },
            registrationConflictCode:
                '',
            saveCalls: 1,
            status: 'save_error',
        });

    const recovered =
        await page.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                failPersistence:
                    false,
                timelineEpoch:
                    recoveryEpoch,
            },
        );
    expect(recovered)
        .toMatchObject({
            blocked: false,
            conflictCount: 0,
            errorMessage: '',
            head: {
                timelineEpoch:
                    recoveryEpoch,
                stateRevision: 1,
                claimId: '',
            },
            mutexKeys: [],
            ok: true,
            observed: {
                blocked: false,
                conflictCode: '',
                conflictCount: 0,
            },
            registrationConflictCode:
                '',
            saveCalls: 1,
            status: 'saved',
        });

    const postHostCrashEpoch =
        'chromium_storage_post_host_crash';
    await page.evaluate(
        timelineEpoch => {
            const encodedEpoch =
                encodeURIComponent(
                    timelineEpoch,
                );
            const mutexPrefix =
                `hogwartsMud.saveRevision.mutex:${encodedEpoch}:`;
            window.localStorage.setItem(
                `hogwartsMud.saveRevision:${encodedEpoch}`,
                JSON.stringify({
                    saveRevisionVersion: 1,
                    timelineEpoch,
                    stateRevision: 1,
                    claimId:
                        'post_host_crash',
                    claimBaseRevision: 0,
                    claimPhase:
                        'host_save_started',
                }),
            );
            window.localStorage.setItem(
                `${mutexPrefix}choosing:post_host_crash`,
                '{"claimId":',
            );
            window.localStorage.setItem(
                `${mutexPrefix}ticket:post_host_crash`,
                JSON.stringify({
                    ticket: 1,
                    claimId:
                        'post_host_crash',
                    expiresAt: 0,
                }),
            );
            window.localStorage.setItem(
                `${mutexPrefix}owner`,
                '{"claimId":',
            );
        },
        postHostCrashEpoch,
    );
    const postHostRecovered =
        await peer.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                failPersistence: false,
                hostRevision: 1,
                timelineEpoch:
                    postHostCrashEpoch,
            },
        );
    expect(postHostRecovered)
        .toMatchObject({
            blocked: false,
            conflictCount: 0,
            errorMessage: '',
            head: {
                timelineEpoch:
                    postHostCrashEpoch,
                stateRevision: 2,
                claimId: '',
            },
            mutexKeys: [],
            ok: true,
            observed: {
                blocked: false,
                conflictCode: '',
                conflictCount: 0,
            },
            registrationConflictCode:
                '',
            saveCalls: 1,
            status: 'saved',
        });

    for (
        const scenario of [
            'no_records',
            'half_written',
        ]
    ) {
        const timelineEpoch =
            `chromium_storage_${scenario}`;
        await page.evaluate(
            ({
                currentScenario,
                currentTimelineEpoch,
            }) => {
                const encodedEpoch =
                    encodeURIComponent(
                        currentTimelineEpoch,
                    );
                const mutexPrefix =
                    `hogwartsMud.saveRevision.mutex:${encodedEpoch}:`;
                window.localStorage
                    .setItem(
                        `hogwartsMud.saveRevision:${encodedEpoch}`,
                        JSON.stringify({
                            saveRevisionVersion:
                                1,
                            timelineEpoch:
                                currentTimelineEpoch,
                            stateRevision:
                                1,
                            claimId:
                                currentScenario,
                            claimBaseRevision:
                                0,
                        }),
                    );
                if (
                    currentScenario ===
                    'half_written'
                ) {
                    window.localStorage
                        .setItem(
                            `${mutexPrefix}ticket:half_written`,
                            JSON.stringify({
                                ticket: 1,
                                claimId:
                                    'half_written',
                                expiresAt:
                                    4_102_444_800_000,
                            }),
                        );
                    window.localStorage
                        .setItem(
                            `${mutexPrefix}owner`,
                            '{"claimId":',
                        );
                }
            },
            {
                currentScenario:
                    scenario,
                currentTimelineEpoch:
                    timelineEpoch,
            },
        );
        const scenarioResult =
            await peer.evaluate(
                options =>
                    window
                        .__runSaveGuardRecovery(
                            options,
                        ),
                {
                    failPersistence:
                        false,
                    timelineEpoch,
                },
            );
        expect(
            scenarioResult,
            scenario,
        ).toMatchObject({
            blocked: false,
            conflictCount: 0,
            errorMessage: '',
            head: {
                timelineEpoch,
                stateRevision: 1,
                claimId: '',
            },
            mutexKeys: [],
            observed: {
                blocked: false,
                conflictCode: '',
                conflictCount: 0,
            },
            ok: true,
            registrationConflictCode:
                '',
            saveCalls: 1,
            status: 'saved',
        });
    }

    const activeEpoch =
        'chromium_storage_active_claim';
    await page.evaluate(
        timelineEpoch => {
            const encodedEpoch =
                encodeURIComponent(
                    timelineEpoch,
                );
            const mutexPrefix =
                `hogwartsMud.saveRevision.mutex:${encodedEpoch}:`;
            const activeMutex = {
                ticket: 1,
                claimId: 'active_page',
                expiresAt:
                    4_102_444_800_000,
            };
            window.localStorage.setItem(
                `hogwartsMud.saveRevision:${encodedEpoch}`,
                JSON.stringify({
                    saveRevisionVersion: 1,
                    timelineEpoch,
                    stateRevision: 1,
                    claimId: 'active_page',
                    claimBaseRevision: 0,
                }),
            );
            window.localStorage.setItem(
                `${mutexPrefix}choosing:active_page`,
                JSON.stringify({
                    claimId: 'active_page',
                    expiresAt: 0,
                }),
            );
            window.localStorage.setItem(
                `${mutexPrefix}ticket:active_page`,
                JSON.stringify(
                    activeMutex,
                ),
            );
            window.localStorage.setItem(
                `${mutexPrefix}owner`,
                JSON.stringify(
                    activeMutex,
                ),
            );
        },
        activeEpoch,
    );
    const activeBlocked =
        await peer.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                failPersistence: false,
                hostRevision: 0,
                timelineEpoch:
                    activeEpoch,
            },
        );
    expect(activeBlocked)
        .toMatchObject({
            blocked: true,
            conflictCount: 1,
            head: {
                timelineEpoch:
                    activeEpoch,
                stateRevision: 1,
                claimId: 'active_page',
            },
            ok: false,
            observed: {
                blocked: true,
                conflictCode:
                    'save_in_progress',
                conflictCount: 1,
            },
            registrationConflictCode:
                'save_in_progress',
            saveCalls: 0,
            status: 'save_error',
        });
    expect(activeBlocked.mutexKeys)
        .toEqual(expect.arrayContaining([
            `hogwartsMud.saveRevision.mutex:${encodeURIComponent(activeEpoch)}:ticket:active_page`,
            `hogwartsMud.saveRevision.mutex:${encodeURIComponent(activeEpoch)}:owner`,
        ]));
    const activeMutexes =
        await page.evaluate(
            timelineEpoch => {
                const mutexPrefix =
                    `hogwartsMud.saveRevision.mutex:${
                        encodeURIComponent(
                            timelineEpoch,
                        )
                    }:`;
                return [
                    'ticket:active_page',
                    'owner',
                ].map(suffix =>
                    JSON.parse(
                        window.localStorage
                            .getItem(
                                `${mutexPrefix}${suffix}`,
                            ),
                    ));
            },
            activeEpoch,
        );
    expect(activeMutexes)
        .toEqual([
            expect.objectContaining({
                claimId: 'active_page',
                expiresAt:
                    4_102_444_800_000,
            }),
            expect.objectContaining({
                claimId: 'active_page',
                expiresAt:
                    4_102_444_800_000,
            }),
        ]);

    await page.evaluate(
        timelineEpoch => {
            const mutexPrefix =
                `hogwartsMud.saveRevision.mutex:${
                    encodeURIComponent(
                        timelineEpoch,
                    )
                }:`;
            for (const suffix of [
                'ticket:active_page',
                'owner',
            ]) {
                const key =
                    `${mutexPrefix}${suffix}`;
                const mutex =
                    JSON.parse(
                        window.localStorage
                            .getItem(key),
                    );
                mutex.expiresAt = 0;
                window.localStorage.setItem(
                    key,
                    JSON.stringify(mutex),
                );
            }
        },
        activeEpoch,
    );
    const activeRecovered =
        await page.evaluate(
            options =>
                window
                    .__runSaveGuardRecovery(
                        options,
                    ),
            {
                failPersistence: false,
                hostRevision: 0,
                timelineEpoch:
                    activeEpoch,
            },
        );
    expect(activeRecovered)
        .toMatchObject({
            blocked: false,
            conflictCount: 0,
            errorMessage: '',
            head: {
                timelineEpoch:
                    activeEpoch,
                stateRevision: 1,
                claimId: '',
            },
            mutexKeys: [],
            ok: true,
            observed: {
                blocked: false,
                conflictCode: '',
                conflictCount: 0,
            },
            registrationConflictCode:
                '',
            saveCalls: 1,
            status: 'saved',
        });

    const remainingMutexKeys =
        await page.evaluate(() =>
            Array.from(
                {
                    length:
                        window
                            .localStorage
                            .length,
                },
                (_, index) =>
                    window
                        .localStorage
                        .key(index),
            ).filter(key =>
                key?.includes(
                    '.mutex:',
                )));
    expect(remainingMutexKeys)
        .toEqual([]);
    expect(pagePosts)
        .toEqual([]);
    expect(peerPosts)
        .toEqual([]);
    await peer.close();
});
