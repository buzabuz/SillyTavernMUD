/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    migrateCalendarState,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-migration.js';
import {
    CALENDAR_ENTRY_FIELDS,
    CALENDAR_STORY_BEAT_FIELDS,
    CALENDAR_STORYLINE_FIELDS,
    CALENDAR_VERSION,
    createInitialCalendarState,
    normalizeCalendarEntry,
    normalizeCalendarStoryBeat,
    normalizeCalendarStoryline,
    validateCalendarState,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-schema.js';
import {
    applyOpeningWorldPackage,
    createInitialWorldState,
} from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import {
    createMandatorySceneStateProjector,
} from '../public/scripts/extensions/hogwarts-mud/domain/mandatory-projection.js';
import {
    createLifecycleRuntime,
} from '../public/scripts/extensions/hogwarts-mud/runtime/lifecycle.js';
import {
    createAppController,
} from '../public/scripts/extensions/hogwarts-mud/ui/app-controller.js';
import {
    createOpeningWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/opening.js';

const CLOCK =
    '1991-09-02 · 11:30';
const LATER_CLOCK =
    '1991-09-02 · 12:30';

function createAuthorityState() {
    return {
        clock: CLOCK,
        actorLibrary: [{
            id:
                'canon_harry_james_potter',
        }, {
            id:
                'canon_hermione_jean_granger',
        }],
        map: {
            customLocalMaps: [{
                id:
                    'hogwarts_castle',
                nodes: [{
                    id:
                        'charms_classroom',
                }, {
                    id:
                        'great_hall',
                }],
            }, {
                id:
                    'hogsmeade',
                nodes: [{
                    id:
                        'three_broomsticks',
                }],
            }],
            generatedLocalNodes: [],
        },
        sceneArchive: [{
            id:
                'scene_charms_intro',
            transcript:
                'Archived prose must remain here.',
        }, {
            id:
                'scene_great_hall',
            authorsQuill:
                'Private archive text.',
        }],
    };
}

function createEntry(
    patch = {},
) {
    return {
        id:
            'first_flying_lesson',
        parentId: '',
        entryType: 'event',
        title: '第一次飞行课',
        titleEn:
            'First Flying Lesson',
        summary:
            '在草坪参加第一次飞行课。',
        summaryEn:
            'Attend the first flying lesson on the grounds.',
        tags: [
            'class',
        ],
        startClock:
            CLOCK,
        endClock:
            LATER_CLOCK,
        participantIds: [
            'canon_harry_james_potter',
        ],
        mapId:
            'hogwarts_castle',
        roomId:
            'charms_classroom',
        status: 'planned',
        planningTier: 'medium',
        relatedSceneIds: [
            'scene_charms_intro',
        ],
        createdClock:
            CLOCK,
        updatedClock:
            CLOCK,
        sourceBeatId: '',
        beatSlot: null,
        scheduleKind: 'class',
        ...patch,
    };
}

function createLegacyEntry(
    patch = {},
) {
    const entry =
        createEntry(
            patch,
        );
    delete entry.sourceBeatId;
    delete entry.beatSlot;
    delete entry.scheduleKind;
    return entry;
}

function createStoryline(
    patch = {},
) {
    return {
        id:
            'house_cup_storyline',
        title: '学院杯故事线',
        titleEn:
            'House Cup Storyline',
        summary:
            '学院积分竞争持续推进。',
        summaryEn:
            'The house-point contest continues.',
        tags: [
            'school',
        ],
        startClock:
            CLOCK,
        endClock:
            '1992-06-30 · 18:00',
        participantIds: [
            'canon_harry_james_potter',
        ],
        status: 'active',
        createdClock:
            CLOCK,
        updatedClock:
            CLOCK,
        ...patch,
    };
}

function createStoryBeat(
    patch = {},
) {
    return {
        id:
            'house_cup_1991_autumn',
        storylineId:
            'house_cup_storyline',
        title: '秋季积分竞争',
        titleEn:
            'Autumn House Point Race',
        summary:
            '第一学期通过四个场景推进学院竞争。',
        summaryEn:
            'Four scenes advance the first-term house competition.',
        tags: [
            'school',
        ],
        termKey:
            '1991_autumn',
        sequence: 1,
        windowStartClock:
            CLOCK,
        windowEndClock:
            '1991-12-20 · 18:00',
        sceneTarget: 4,
        status: 'active',
        relatedSceneIds: [],
        createdClock:
            CLOCK,
        updatedClock:
            CLOCK,
        ...patch,
    };
}

function createCalendar(
    entries = [
        createEntry(),
    ],
    patch = {},
) {
    return {
        version:
            CALENDAR_VERSION,
        storylines: [],
        storyBeats: [],
        entries,
        horizon:
            '1991-09-12 · 11:30',
        ...patch,
    };
}

function validationErrors(
    calendar,
    worldState =
    createAuthorityState(),
) {
    return validateCalendarState(
        calendar,
        worldState,
    ).errors.join('\n');
}

test('Calendar V2 schedule normalization keeps only approved fields and ordinary tags', () => {
    const normalized =
        normalizeCalendarEntry(
            createEntry({
                parentId: null,
                entryType:
                    ' EVENT ',
                title:
                    '  第一次   飞行课 ',
                tags: [
                    ' Canon ',
                    'canon',
                    'Exam',
                    'exam',
                    'date',
                    'class',
                    'quidditch',
                ],
                participantIds: [
                    'canon_harry_james_potter',
                    'canon_harry_james_potter',
                    'canon_hermione_jean_granger',
                ],
                status:
                    ' PLANNED ',
                planningTier:
                    ' MEDIUM ',
                sourceBeatId: null,
                beatSlot: null,
                scheduleKind:
                    ' CLASS ',
                relatedSceneIds: [
                    'scene_charms_intro',
                    'scene_charms_intro',
                    'scene_great_hall',
                ],
            }),
        );

    assert.deepEqual(
        Object.keys(normalized),
        CALENDAR_ENTRY_FIELDS,
    );
    assert.equal(
        normalized.parentId,
        '',
    );
    assert.equal(
        normalized.entryType,
        'event',
    );
    assert.equal(
        normalized.title,
        '第一次 飞行课',
    );
    assert.deepEqual(
        normalized.tags,
        [
            'canon',
            'exam',
            'date',
            'class',
            'quidditch',
        ],
    );
    assert.deepEqual(
        normalized.participantIds,
        [
            'canon_harry_james_potter',
            'canon_hermione_jean_granger',
        ],
    );
    assert.deepEqual(
        normalized.relatedSceneIds,
        [
            'scene_charms_intro',
            'scene_great_hall',
        ],
    );
    assert.equal(
        normalized.status,
        'planned',
    );
    assert.equal(
        normalized.planningTier,
        'medium',
    );
    assert.equal(
        normalized.sourceBeatId,
        '',
    );
    assert.equal(
        normalized.beatSlot,
        null,
    );
    assert.equal(
        normalized.scheduleKind,
        'class',
    );
    assert.equal(
        validateCalendarState(
            createCalendar([
                normalized,
            ]),
            createAuthorityState(),
        ).valid,
        true,
    );
});

test('Calendar Schema rejects unknown fields, missing fields and unstable IDs', () => {
    const unknownCalendar =
        validateCalendarState(
            {
                ...createCalendar(),
                hiddenDirectorPayload:
                    'never persist',
            },
            createAuthorityState(),
        );
    assert.equal(
        unknownCalendar.valid,
        false,
    );
    assert.match(
        unknownCalendar
            .errors.join('\n'),
        /未知字段.*hiddenDirectorPayload/u,
    );

    const unknownEntry =
        validateCalendarState(
            createCalendar([
                {
                    ...createEntry(),
                    privateMotive:
                        'never persist',
                },
            ]),
            createAuthorityState(),
        );
    assert.equal(
        unknownEntry.valid,
        false,
    );
    assert.match(
        unknownEntry
            .errors.join('\n'),
        /未知字段.*privateMotive/u,
    );

    const unknownStoryline =
        validateCalendarState(
            createCalendar([], {
                storylines: [{
                    ...createStoryline(),
                    mapId:
                        'hogwarts_castle',
                }],
            }),
            createAuthorityState(),
        );
    assert.match(
        unknownStoryline
            .errors.join('\n'),
        /storyline.*未知字段.*mapId/u,
    );

    const unknownStoryBeat =
        validateCalendarState(
            createCalendar([], {
                storylines: [
                    createStoryline(),
                ],
                storyBeats: [{
                    ...createStoryBeat(),
                    privateOutcome:
                        'never persist',
                }],
            }),
            createAuthorityState(),
        );
    assert.match(
        unknownStoryBeat
            .errors.join('\n'),
        /storyBeat.*未知字段.*privateOutcome/u,
    );

    const missingField =
        createEntry();
    delete missingField.summaryEn;
    assert.match(
        validationErrors(
            createCalendar([
                missingField,
            ]),
        ),
        /缺少字段.*summaryEn/u,
    );
    assert.match(
        validationErrors(
            createCalendar([
                createEntry({
                    id:
                        'Generated ID!',
                }),
            ]),
        ),
        /稳定 snake_case ID/u,
    );
});

test('Calendar V2 normalizes independent strict storyline and storyBeat schemas', () => {
    const storyline =
        normalizeCalendarStoryline(
            createStoryline({
                title:
                    '  学院杯   故事线 ',
                tags: [
                    ' School ',
                    'school',
                ],
            }),
        );
    const storyBeat =
        normalizeCalendarStoryBeat(
            createStoryBeat({
                termKey:
                    ' 1991_AUTUMN ',
                tags: [
                    ' School ',
                    'school',
                ],
            }),
        );

    assert.deepEqual(
        Object.keys(
            storyline,
        ),
        CALENDAR_STORYLINE_FIELDS,
    );
    assert.deepEqual(
        Object.keys(
            storyBeat,
        ),
        CALENDAR_STORY_BEAT_FIELDS,
    );
    assert.equal(
        storyline.title,
        '学院杯 故事线',
    );
    assert.deepEqual(
        storyline.tags,
        [
            'school',
        ],
    );
    assert.equal(
        storyBeat.termKey,
        '1991_autumn',
    );
    assert.equal(
        Object.hasOwn(
            storyline,
            'mapId',
        ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            storyBeat,
            'roomId',
        ),
        false,
    );
});

test('Calendar V2 validates clocks, cross-collection references and unique beat slots', () => {
    const storyline =
        createStoryline();
    const storyBeat =
        createStoryBeat();
    const event =
        createEntry({
            id:
                'house_cup_dinner',
            parentId:
                storyline.id,
            sourceBeatId:
                storyBeat.id,
            beatSlot: 1,
            scheduleKind:
                'story',
            participantIds: [
                'canon_harry_james_potter',
                'canon_hermione_jean_granger',
            ],
            roomId:
                'great_hall',
        });
    assert.equal(
        validateCalendarState(
            createCalendar([
                event,
            ], {
                storylines: [
                    storyline,
                ],
                storyBeats: [
                    storyBeat,
                ],
            }),
            createAuthorityState(),
        ).valid,
        true,
    );

    const invalidCases = [{
        calendar:
            createCalendar([
                event,
            ], {
                storylines: [],
                storyBeats: [
                    storyBeat,
                ],
            }),
        pattern:
            /不存在的 storyline/u,
    }, {
        calendar:
            createCalendar([
                {
                    ...event,
                    participantIds: [
                        'unadmitted_actor',
                    ],
                },
            ], {
                storylines: [
                    storyline,
                ],
                storyBeats: [
                    storyBeat,
                ],
            }),
        pattern:
            /不存在的 Actor/u,
    }, {
        calendar:
            createCalendar([
                {
                    ...event,
                    sourceBeatId:
                        'missing_beat',
                    mapId:
                        'missing_map',
                },
            ], {
                storylines: [
                    storyline,
                ],
                storyBeats: [
                    storyBeat,
                ],
            }),
        pattern:
            /不存在的 storyBeat/u,
    }, {
        calendar:
            createCalendar([
                {
                    ...event,
                    beatSlot: 5,
                },
            ], {
                storylines: [
                    storyline,
                ],
                storyBeats: [
                    storyBeat,
                ],
            }),
        pattern:
            /beatSlot 必须是 1\.\.4/u,
    }, {
        calendar:
            createCalendar([
                {
                    ...event,
                    sourceBeatId: '',
                    beatSlot: 1,
                },
            ], {
                storylines: [
                    storyline,
                ],
                storyBeats: [
                    storyBeat,
                ],
            }),
        pattern:
            /没有 sourceBeatId.*beatSlot.*null/u,
    }, {
        calendar:
            createCalendar([
                event,
                {
                    ...event,
                    id:
                        'house_cup_second_dinner',
                },
            ], {
                storylines: [
                    storyline,
                ],
                storyBeats: [
                    storyBeat,
                ],
            }),
        pattern:
            /beatSlot 1 重复/u,
    }, {
        calendar:
            createCalendar([
                createEntry({
                    mapId:
                        'missing_map',
                }),
            ]),
        pattern:
            /不存在的地图/u,
    }, {
        calendar:
            createCalendar([
                createEntry({
                    mapId:
                        'hogsmeade',
                    roomId:
                        'charms_classroom',
                }),
            ]),
        pattern:
            /不属于地图/u,
    }, {
        calendar:
            createCalendar([
                createEntry({
                    relatedSceneIds: [
                        'missing_scene',
                    ],
                }),
            ]),
        pattern:
            /不存在的封存 Scene/u,
    }, {
        calendar:
            createCalendar([
                createEntry(),
                createEntry(),
            ]),
        pattern:
            /schedule ID .* 重复/u,
    }, {
        calendar:
            createCalendar([
                createEntry({
                    endClock:
                        '1991-09-02 · 10:30',
                }),
            ]),
        pattern:
            /endClock 早于 startClock/u,
    }, {
        calendar:
            createCalendar([
                createEntry({
                    updatedClock:
                        '1991-09-02 · 10:30',
                }),
            ]),
        pattern:
            /updatedClock 早于 createdClock/u,
    }, {
        calendar:
            createCalendar([
                createEntry({
                    startClock:
                        '1991-02-30 · 10:30',
                }),
            ]),
        pattern:
            /startClock 不是绝对世界时钟/u,
    }, {
        calendar:
            createCalendar([
                createEntry({
                    status: 'active',
                    startClock:
                        LATER_CLOCK,
                    endClock:
                        LATER_CLOCK,
                }),
            ]),
        pattern:
            /active.*开始时钟.*当前世界时钟/u,
    }, {
        calendar:
            createCalendar([], {
                storylines: [
                    {
                        ...storyline,
                        participantIds: [
                            'unadmitted_actor',
                        ],
                    },
                ],
            }),
        pattern:
            /storyline.*不存在的 Actor/u,
    }, {
        calendar:
            createCalendar([], {
                storylines: [
                    storyline,
                ],
                storyBeats: [{
                    ...storyBeat,
                    relatedSceneIds: [
                        'missing_scene',
                    ],
                }],
            }),
        pattern:
            /storyBeat.*不存在的封存 Scene/u,
    }, {
        calendar:
            createCalendar([], {
                storylines: [
                    storyline,
                ],
                storyBeats: [
                    storyBeat,
                    {
                        ...storyBeat,
                        id:
                            'house_cup_second_beat',
                        termKey:
                            '1992_spring',
                    },
                ],
            }),
        pattern:
            /sequence 必须严格递增/u,
    }, {
        calendar:
            createCalendar([], {
                storylines: [
                    storyline,
                ],
                storyBeats: [
                    {
                        ...storyBeat,
                        sceneTarget: 3,
                    },
                ],
            }),
        pattern:
            /sceneTarget 必须固定为 4/u,
    }, {
        calendar:
            createCalendar([], {
                storylines: [
                    storyline,
                ],
                storyBeats: [
                    storyBeat,
                    {
                        ...storyBeat,
                        id:
                            'house_cup_second_beat',
                        sequence: 2,
                    },
                ],
            }),
        pattern:
            /termKey .* 重复/u,
    }, {
        calendar:
            createCalendar([], {
                storylines: [
                    storyline,
                ],
                storyBeats: [
                    {
                        ...storyBeat,
                        storylineId:
                            'missing_storyline',
                    },
                ],
            }),
        pattern:
            /不存在的 storyline/u,
    }];
    invalidCases.forEach(
        ({
            calendar,
            pattern,
        }) => {
            assert.match(
                validationErrors(
                    calendar,
                ),
                pattern,
            );
        },
    );
});

test('Calendar migration is zero-model, idempotent and changes no existing domain', () => {
    const authority =
        createAuthorityState();
    const agenda = [{
        timeLabel:
            'Yesterday',
        label:
            'Stale legacy agenda',
    }];
    const sceneArchive = [{
        id:
            'scene_charms_intro',
        transcript:
            'ARCHIVE_BODY_MUST_NOT_COPY',
        messages: [{
            mes:
                'Archived message',
        }],
        timelineEntries: [{
            clock:
                CLOCK,
            label:
                'Archive timeline',
        }],
        authorsQuill:
            'Archive-only quill text',
    }];
    const worldState = {
        ...authority,
        agenda,
        sceneArchive,
        actors: [{
            id:
                'canon_harry_james_potter',
            present: true,
        }],
        items: [{
            id:
                'borrowed_quill',
        }],
        identityState: {
            version: 1,
        },
        socialGraph: {
            version: 2,
        },
        memoryDirector: {
            status: 'idle',
        },
        location:
            'Charms Classroom',
        messages: [{
            mes:
                'Current message',
        }],
    };

    const first =
        migrateCalendarState(
            worldState,
        );
    assert.equal(
        first.changed,
        true,
    );
    assert.deepEqual(
        first.state.calendar,
        createInitialCalendarState(
            CLOCK,
        ),
    );
    for (const field of [
        'agenda',
        'sceneArchive',
        'actors',
        'items',
        'identityState',
        'socialGraph',
        'memoryDirector',
        'messages',
    ]) {
        assert.equal(
            first.state[field],
            worldState[field],
            field,
        );
    }
    assert.equal(
        first.state.clock,
        worldState.clock,
    );
    assert.equal(
        first.state.location,
        worldState.location,
    );
    assert.doesNotMatch(
        JSON.stringify(
            first.state.calendar,
        ),
        /ARCHIVE_BODY_MUST_NOT_COPY|Stale legacy agenda/u,
    );

    const repeated =
        migrateCalendarState(
            first.state,
        );
    assert.equal(
        repeated.changed,
        false,
    );
    assert.equal(
        repeated.state,
        first.state,
    );
    assert.equal(
        JSON.stringify(
            repeated.state,
        ),
        JSON.stringify(
            first.state,
        ),
    );
});

test('Calendar migration normalizes an existing V2 once and rejects unknown persisted fields', () => {
    const state =
        createAuthorityState();
    state.calendar =
        createCalendar([
            createEntry({
                tags: [
                    ' Canon ',
                    'canon',
                ],
                participantIds: [
                    'canon_harry_james_potter',
                    'canon_harry_james_potter',
                ],
            }),
        ]);

    const normalized =
        migrateCalendarState(
            state,
        );
    assert.equal(
        normalized.changed,
        true,
    );
    assert.deepEqual(
        normalized.state
            .calendar.entries[0]
            .tags,
        [
            'canon',
        ],
    );
    assert.deepEqual(
        normalized.state
            .calendar.entries[0]
            .participantIds,
        [
            'canon_harry_james_potter',
        ],
    );
    assert.equal(
        migrateCalendarState(
            normalized.state,
        ).changed,
        false,
    );

    const invalid =
        structuredClone(
            normalized.state,
        );
    invalid.calendar.entries[0]
        .hiddenDirectorPayload =
        'reject me';
    assert.throws(
        () =>
            migrateCalendarState(
                invalid,
            ),
        /未知字段.*hiddenDirectorPayload/u,
    );
});

function createOpeningPackage() {
    return {
        version: 1,
        chapterEn:
            'Letters From Nowhere',
        clock:
            '1991-07-24 · 08:00',
        scene: {
            id:
                'family_kitchen_opening',
            nameEn:
                'Family Kitchen',
            summaryEn:
                'A Hogwarts letter waits on the table.',
            worldAnchorId: '',
            map: {
                id:
                    'family_home',
                nameEn:
                    'Family Home',
                currentLevelId:
                    'ground_floor',
                levels: [{
                    id:
                        'ground_floor',
                    nameEn:
                        'Ground Floor',
                    z: 0,
                }],
                rooms: [{
                    id:
                        'kitchen',
                    nameEn:
                        'Kitchen',
                    levelId:
                        'ground_floor',
                    kind: 'room',
                    descriptionEn:
                        'A small family kitchen.',
                    x: 50,
                    y: 50,
                    access: 'private',
                }],
                exits: [],
                currentRoomId:
                    'kitchen',
            },
        },
        actors: [{
            id:
                'tina_guardian',
            nameEn:
                'Tina Guardian',
            roleEn: 'Guardian',
            relationshipToPlayerEn:
                'Protective guardian',
            firstImpressionOfPlayerEn:
                'Watches Tina closely.',
            impressionOfPlayerEn:
                'Knows Tina is curious.',
            publicDescriptionEn:
                'A tired adult.',
            currentActivityEn:
                'Holding the letter.',
            currentIntentEn:
                'Ask Tina what she wants.',
            roomId: 'kitchen',
            present: true,
        }],
        actorLibrary: [{
            id:
                'tina_guardian',
            nameEn:
                'Tina Guardian',
            roleEn: 'Guardian',
            relationshipToPlayerEn:
                'Protective guardian',
            firstImpressionOfPlayerEn:
                'Watches Tina closely.',
            impressionOfPlayerEn:
                'Knows Tina is curious.',
            publicDescriptionEn:
                'A tired adult.',
            publicBackgroundEn:
                'Tina family guardian.',
            personalityEn:
                'Practical and observant.',
            speechStyleEn:
                'Short direct questions.',
            privateGoalEn:
                'Keep Tina safe.',
            fearEn:
                'Losing Tina.',
            secretEn: 'None.',
            knowledgeEn: [],
        }],
        storyArc: null,
        conflict: {
            titleEn:
                'An Unexpected Letter',
            premiseEn:
                'Magic has reached the family.',
            immediatePressureEn:
                'The owl waits.',
            stakesEn:
                'Tina must answer.',
            incitingEventEn:
                'The letter is opened.',
        },
        agenda: [{
            timeLabelEn: 'Later',
            labelEn:
                'This legacy value must be ignored.',
        }],
        clues: [],
        items: [],
        openingBriefEn:
            'Begin with the letter.',
    };
}

test('a playable new world initializes Calendar at its committed clock without agenda', () => {
    const initial =
        createInitialWorldState(
            {
                identity: {
                    name: 'Tina Zhang',
                    age: 11,
                },
                background: {},
                storyPreferences: {},
            },
            {},
        );
    assert.equal(
        Object.prototype
            .hasOwnProperty.call(
                initial,
                'calendar',
            ),
        false,
    );
    assert.equal(
        Object.prototype
            .hasOwnProperty.call(
                initial,
                'agenda',
            ),
        false,
    );

    const opening =
        createOpeningPackage();
    const world =
        applyOpeningWorldPackage(
            initial,
            opening,
        );
    assert.deepEqual(
        world.calendar,
        {
            version:
                CALENDAR_VERSION,
            storylines: [],
            storyBeats: [],
            entries: [],
            horizon:
                opening.clock,
        },
    );
    assert.equal(
        validateCalendarState(
            world.calendar,
            world,
        ).valid,
        true,
    );
    assert.deepEqual(
        world.scene
            .calendarEntryIds,
        [],
    );
    assert.equal(
        Object.prototype
            .hasOwnProperty.call(
                world,
                'agenda',
            ),
        false,
    );
    assert.equal(
        Object.prototype
            .hasOwnProperty.call(
                world.opening.package,
                'agenda',
            ),
        false,
    );
});

function unchanged(value) {
    return {
        state: value,
        changed: false,
    };
}

test('lifecycle submits Calendar migration through the existing save port once', () => {
    const state = {
        ...createAuthorityState(),
        modelSlots: {},
        actors: [],
        cohorts: [],
        localPresence: null,
        scene: null,
        checks: [],
        timeline: [],
        turn: {
            count: 0,
        },
        causalCollapse: {},
        socialGraph: {},
        sceneTransition: {
            status: 'idle',
        },
        pacingDirector: {
            status: 'idle',
        },
        memoryDirector: {
            status: 'idle',
            reviewAfterTurns: 10,
            lastReviewedTurn: 0,
        },
    };
    const saveRequests = [];
    const context = {
        chat: [],
        chatMetadata: {
            hogwartsMud:
                state,
        },
    };
    const lifecycle =
        createLifecycleRuntime({
            createFallbackNextSceneIntent:
                () => null,
            getContext: () =>
                context,
            getMudState: () =>
                state,
            getRoomName: () => '',
            jobRegistry: {},
            migrateActorKnowledgeBoundaries:
                unchanged,
            migrateActorMovementHistory:
                unchanged,
            migrateActorPresentationState:
                unchanged,
            migrateItemSystemState:
                unchanged,
            migrateLoadedSocialGraph:
                value => ({
                    graph: value,
                    changed: false,
                }),
            migrateNpcIdentityObservations:
                unchanged,
            migrateNpcIdentityState:
                unchanged,
            migrateObservedInventoryState:
                unchanged,
            migrateRelationshipMemoryState:
                unchanged,
            migrateSpellbookState:
                unchanged,
            normalizeCausalCollapseState:
                value => value,
            normalizeModelSlots:
                value => value,
            projectActorSocialRelationships:
                value => value,
            reconcileCanonActorDisplayNames:
                unchanged,
            reconcileTemporaryActorDisplayNames:
                unchanged,
            saveMetadataDebounced:
                options =>
                    saveRequests.push(
                        options,
                    ),
            validateNextSceneIntent:
                () => ({
                    valid: true,
                }),
        });

    assert.equal(
        lifecycle
            .ensureSceneLifecycleState(
                state,
            ),
        true,
    );
    assert.deepEqual(
        state.calendar,
        createInitialCalendarState(
            CLOCK,
        ),
    );
    assert.deepEqual(
        saveRequests,
        [{
            source:
                'calendar_migration',
            changedDomains: [
                'calendar',
            ],
        }],
    );
    assert.equal(
        lifecycle
            .ensureSceneLifecycleState(
                state,
            ),
        false,
    );
    assert.equal(
        saveRequests.length,
        1,
    );
});

test('[defect-probing] legacy agenda does not enter prompt, opening Schema or UI state', () => {
    const project =
        createMandatorySceneStateProjector({
            buildBehavioralEnvironment:
                () => ({}),
            buildCurrentMaterialState:
                () => ({
                    roomEffects: [],
                }),
            getActorKnownRumors:
                () => [],
            normalizeActorMemoryProfile:
                value => value,
        });
    const promptProjection =
        project({
            ...createAuthorityState(),
            agenda: [{
                label:
                    'STALE_AGENDA_PROMPT',
            }],
            actors: [],
            chapter: 'Charms',
            location:
                'Charms Classroom',
            items: [],
            clues: [],
            spellbook: {
                known: [],
            },
        });
    assert.doesNotMatch(
        JSON.stringify(
            promptProjection,
        ),
        /agenda|STALE_AGENDA_PROMPT/u,
    );

    const openingWorkflow =
        createOpeningWorkflow({
            PRESET_WORLD_MAP: {
                nodes: [],
            },
        });
    assert.doesNotMatch(
        openingWorkflow
            .createOpeningDirectorPrompt({
                campaign: {
                    grade: 1,
                },
                character: {},
            })[0].content,
        /"agenda"/u,
    );

    const uiState = {
        phase: 'playing',
        agenda: [{
            label:
                'STALE_AGENDA_UI',
        }],
        socialGraph: {},
    };
    const app =
        createAppController({
            refs: {
                root: {},
                homeElement: {},
                setupElement: {},
                workspaceElement: {},
            },
            session: {},
            getContext: () => ({
                chatMetadata: {
                    hogwartsMud:
                        uiState,
                },
            }),
            getSettings: () => ({
                modelSlots: {},
            }),
            normalizeSocialGraph:
                value => value,
        });
    const projectedUiState =
        app.getWorldState();
    assert.equal(
        Object.prototype
            .hasOwnProperty.call(
                projectedUiState,
                'agenda',
            ),
        false,
    );
    assert.doesNotMatch(
        JSON.stringify(
            projectedUiState,
        ),
        /STALE_AGENDA_UI/u,
    );
});

test('[defect-probing] Calendar V2 accepts strict storyline, storyBeat and schedule collections', () => {
    const storyline = {
        id: 'tina_secret_storyline',
        title: '蒂娜的秘密',
        titleEn: 'Tina Secret',
        summary: '一条横跨学年的秘密剧情线。',
        summaryEn:
            'A secret storyline spanning school years.',
        tags: ['mystery'],
        startClock: CLOCK,
        endClock:
            '1992-06-30 · 18:00',
        participantIds: [
            'canon_harry_james_potter',
        ],
        status: 'active',
        createdClock: CLOCK,
        updatedClock: CLOCK,
    };
    const storyBeat = {
        id: 'tina_secret_1991_autumn',
        storylineId:
            storyline.id,
        title: '第一学期疑点',
        titleEn:
            'First-term Doubts',
        summary:
            '四个可观察场景逐步暴露疑点。',
        summaryEn:
            'Four observable scenes reveal the doubts.',
        tags: ['mystery'],
        termKey: '1991_autumn',
        sequence: 1,
        windowStartClock: CLOCK,
        windowEndClock:
            '1991-12-20 · 18:00',
        sceneTarget: 4,
        status: 'active',
        relatedSceneIds: [],
        createdClock: CLOCK,
        updatedClock: CLOCK,
    };
    const schedule = {
        ...createEntry({
            id:
                'tina_secret_first_clue',
            parentId:
                storyline.id,
        }),
        sourceBeatId:
            storyBeat.id,
        beatSlot: 1,
        scheduleKind: 'story',
    };

    const result =
        validateCalendarState(
            {
                version: 2,
                storylines: [
                    storyline,
                ],
                storyBeats: [
                    storyBeat,
                ],
                entries: [
                    schedule,
                ],
                horizon:
                    '1991-09-12 · 11:30',
            },
            createAuthorityState(),
        );

    assert.equal(
        result.valid,
        true,
        result.errors.join('\n'),
    );
});

test('[defect-probing] Calendar migration moves V1 storylines and preserves grandfathered schedules without fake beats', () => {
    const authority =
        createAuthorityState();
    const storyline =
        createLegacyEntry({
            id:
                'tina_magic_legacy',
            entryType:
                'storyline',
            title:
                '蒂娜的魔法遗产与秘密',
            titleEn:
                'Tina Magical Legacy and Secrets',
            planningTier: 'high',
            relatedSceneIds: [],
        });
    const highEvent =
        createLegacyEntry({
            id:
                'staff_initial_assessment',
            parentId:
                storyline.id,
            title:
                '教职员初步评估',
            titleEn:
                'Initial Staff Assessment',
            planningTier: 'high',
            status: 'completed',
            relatedSceneIds: [
                'scene_charms_intro',
            ],
        });
    const source = {
        ...authority,
        scene: {
            id: 'current_scene',
            calendarEntryIds: [
                highEvent.id,
            ],
        },
        calendar: {
            version: 1,
            entries: [
                storyline,
                highEvent,
            ],
            horizon:
                '1991-09-12 · 11:30',
        },
    };

    const first =
        migrateCalendarState(
            source,
        );
    const second =
        migrateCalendarState(
            first.state,
        );

    assert.equal(
        first.state.calendar.version,
        2,
    );
    assert.deepEqual(
        first.state.calendar
            .storylines.map(entry =>
                entry.id),
        [
            storyline.id,
        ],
    );
    assert.deepEqual(
        first.state.calendar
            .storyBeats,
        [],
    );
    assert.deepEqual(
        first.state.calendar
            .entries.map(entry =>
                entry.id),
        [
            highEvent.id,
        ],
    );
    const migratedEvent =
        first.state.calendar
            .entries[0];
    for (const field of [
        'id',
        'parentId',
        'entryType',
        'title',
        'titleEn',
        'summary',
        'summaryEn',
        'tags',
        'startClock',
        'endClock',
        'participantIds',
        'mapId',
        'roomId',
        'status',
        'planningTier',
        'relatedSceneIds',
        'createdClock',
        'updatedClock',
    ]) {
        assert.deepEqual(
            migratedEvent[field],
            highEvent[field],
            field,
        );
    }
    assert.deepEqual(
        migratedEvent
            .relatedSceneIds,
        highEvent.relatedSceneIds,
    );
    assert.equal(
        migratedEvent
            .sourceBeatId,
        '',
    );
    assert.equal(
        migratedEvent
            .beatSlot,
        null,
    );
    assert.deepEqual(
        first.state.scene
            .calendarEntryIds,
        source.scene
            .calendarEntryIds,
    );
    assert.equal(
        second.changed,
        false,
    );
    assert.equal(
        second.state,
        first.state,
    );
    const sourceOutsideCalendar = {
        ...source,
    };
    const migratedOutsideCalendar = {
        ...first.state,
    };
    delete sourceOutsideCalendar.calendar;
    delete migratedOutsideCalendar
        .calendar;
    assert.equal(
        JSON.stringify(
            migratedOutsideCalendar,
        ),
        JSON.stringify(
            sourceOutsideCalendar,
        ),
    );

    const invalidLegacy =
        structuredClone(
            source,
        );
    invalidLegacy.calendar
        .entries[0]
        .privateOutcome =
        'never persist';
    assert.throws(
        () =>
            migrateCalendarState(
                invalidLegacy,
            ),
        /Calendar V1 entries\[0\].*未知字段.*privateOutcome/u,
    );
});
