/* eslint-disable playwright/expect-expect */
/* global globalThis */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createLocalizedViewModel,
    getStaticLocaleText,
    normalizeDisplayLocale,
} from '../public/scripts/extensions/hogwarts-mud/domain/localized-view-model.js';
import {
    createTranslationRowKey,
    hashTranslationSource,
} from '../public/scripts/extensions/hogwarts-mud/domain/localization-contract.js';
import {
    EN_STATIC_LOCALE,
} from '../public/scripts/extensions/hogwarts-mud/locales/en.js';
import {
    ZH_CN_STATIC_LOCALE,
} from '../public/scripts/extensions/hogwarts-mud/locales/zh-cn.js';
import {
    SPELL_CATALOG,
    SPELL_PROFICIENCY_RANKS,
} from '../public/scripts/extensions/hogwarts-mud/spell-catalog.js';
import {
    createTranslationController,
} from '../public/scripts/extensions/hogwarts-mud/ui/translation-controller.js';
import {
    createUiSessionState,
} from '../public/scripts/extensions/hogwarts-mud/ui/session-state.js';
import {
    createSaveLibrary,
} from '../public/scripts/extensions/hogwarts-mud/runtime/save-library.js';
import {
    normalizeCharacterCode,
} from '../public/scripts/extensions/hogwarts-mud/domain/character.js';
import {
    SETUP_STEPS,
} from '../public/scripts/extensions/hogwarts-mud/ui/setup-controller.js';
import {
    createMapRenderer,
} from '../public/scripts/extensions/hogwarts-mud/ui/map-renderer.js';
import {
    getActorDisplayName,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-display-name.js';
import {
    buildCalendarViewModel,
} from '../public/scripts/extensions/hogwarts-mud/ui/calendar-view-model.js';
import {
    TRANSLATION_TERM_GLOSSARY,
    applyTranslationGlossaryTargets,
} from '../public/scripts/extensions/hogwarts-mud/domain/translation.js';

test('English and Chinese static locale resources have exact key parity', () => {
    assert.deepEqual(
        Object.keys(
            EN_STATIC_LOCALE,
        ).sort(),
        Object.keys(
            ZH_CN_STATIC_LOCALE,
        ).sort(),
    );
});

test('display locale defaults to Chinese and resolves static keys without world data', () => {
    assert.equal(
        normalizeDisplayLocale(
            'unknown',
        ),
        'zh-CN',
    );
    assert.equal(
        getStaticLocaleText(
            'item.physical_form.remains',
        ),
        '残骸',
    );
    assert.equal(
        getStaticLocaleText(
            'item.physical_form.remains',
            'en',
        ),
        'Remains',
    );
    assert.equal(
        getStaticLocaleText(
            'ui.message.translation.english_short',
        ),
        '英',
    );
    assert.equal(
        getStaticLocaleText(
            'ui.message.translation.english_short',
            'en',
        ),
        'EN',
    );
});

test('Canon Actor names use the authoritative Chinese display catalog without a model row', () => {
    let dynamicReads = 0;
    assert.equal(
        getActorDisplayName({
            actorId:
                'canon_harry_james_potter',
            nameEn:
                'Harry James Potter',
            displayLocale:
                'zh-CN',
            getLocalizedField:
                () => {
                    dynamicReads++;
                    return {
                        text:
                            'wrong dynamic value',
                    };
                },
        }),
        '哈利·波特',
    );
    assert.equal(dynamicReads, 0);
    assert.equal(
        getActorDisplayName({
            actorId:
                'canon_charles_weasley',
            nameEn:
                'Charles Weasley',
            displayLocale:
                'zh-CN',
            getLocalizedField:
                () => {
                    dynamicReads++;
                    return {
                        text:
                            'wrong dynamic value',
                    };
                },
        }),
        '查理·韦斯莱',
    );
    assert.equal(dynamicReads, 0);
});

test('translation glossary prelocalizes all four Hogwarts houses', () => {
    assert.equal(
        applyTranslationGlossaryTargets(
            'Gryffindor, Slytherin, Ravenclaw, Hufflepuff',
            TRANSLATION_TERM_GLOSSARY,
        ),
        '格兰芬多, 斯莱特林, 拉文克劳, 赫奇帕奇',
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            'Professor of Charms and Head of Ravenclaw',
            TRANSLATION_TERM_GLOSSARY,
        ),
        '魔咒课教授兼拉文克劳院长',
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            'Dear Player, Minmin won the Most Creative Misuse of Stationery award. Zhang ate Yorkshire puddings.',
            TRANSLATION_TERM_GLOSSARY,
        ),
        'Dear 玩家, 敏敏 won the 最具创意文具误用奖 award. 张 ate 约克郡布丁.',
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            'aggressively winking at Lavender Brown',
            TRANSLATION_TERM_GLOSSARY,
        ),
        '拼命地眨眼 at 拉文德·布朗',
    );
});

test('Calendar participant projection uses localized Canon names', () => {
    const view =
        buildCalendarViewModel(
            {
                clock:
                    '1991-09-04 · 12:00',
                actorLibrary: [{
                    id:
                        'canon_harry_james_potter',
                    nameEn:
                        'Harry James Potter',
                }],
                actors: [],
                calendar: {
                    version: 3,
                    horizon:
                        '1991-09-08 · 23:59',
                    storylines: [],
                    storyBeats: [],
                    entries: [{
                        id:
                            'routine_lunch_great_hall',
                        parentId: '',
                        entryType:
                            'event',
                        titleEn:
                            'Lunch in the Great Hall',
                        summaryEn:
                            'Lunch.',
                        tags: [],
                        startClock:
                            '1991-09-04 · 12:00',
                        endClock:
                            '1991-09-04 · 13:00',
                        participantIds: [
                            'canon_harry_james_potter',
                        ],
                        mapId:
                            'hogwarts_castle',
                        roomId:
                            'great_hall',
                        status:
                            'planned',
                        planningTier:
                            'medium',
                        relatedSceneIds: [],
                        createdClock:
                            '1991-09-02 · 19:45',
                        updatedClock:
                            '1991-09-02 · 19:45',
                        sourceBeatId: '',
                        beatSlot: '',
                        scheduleKind: '',
                    }],
                },
                sceneArchive: [],
            },
            {
                selectedDate:
                    '1991-09-04',
                selectedEntryId:
                    'routine_lunch_great_hall',
                displayLocale:
                    'zh-CN',
                getLocalizedField:
                    field => ({
                        text:
                            field
                                .sourceTextEn,
                    }),
            },
        );

    assert.equal(
        view.entries[0]
            .participants[0]
            .name,
        '哈利·波特',
    );
});

test('built-in Spell semantics are English-only while Chinese names remain static resources and aliases', () => {
    assert.ok(
        SPELL_CATALOG.length > 50,
    );
    for (const spell of
        SPELL_CATALOG) {
        assert.equal(
            Object.hasOwn(
                spell,
                'name',
            ),
            false,
        );
        assert.equal(
            Object.hasOwn(
                spell,
                'effect',
            ),
            false,
        );
        assert.ok(
            EN_STATIC_LOCALE[
                `spell.${spell.id}.name`
            ],
        );
        assert.ok(
            ZH_CN_STATIC_LOCALE[
                `spell.${spell.id}.name`
            ],
        );
    }
    assert.ok(
        SPELL_CATALOG
            .find(spell =>
                spell.id ===
                'wingardium_leviosa')
            .aliases.includes(
                '悬浮咒',
            ),
    );
    assert.ok(
        SPELL_PROFICIENCY_RANKS
            .every(rank =>
                !Object.hasOwn(
                    rank,
                    'label',
                )),
    );
});

test('known Character setup selections normalize to stable language-neutral codes', () => {
    assert.deepEqual(
        [
            '麻瓜出身',
            'muggle_born',
            '魔咒',
            'charms',
            '蛇佬腔',
            'parseltongue',
        ].map(
            normalizeCharacterCode,
        ),
        [
            'muggle_born',
            'muggle_born',
            'charms',
            'charms',
            'parseltongue',
            'parseltongue',
        ],
    );
    assert.deepEqual(
        SETUP_STEPS,
        [
            'identity',
            'background',
            'aptitudes',
            'story',
            'models',
            'review',
        ],
    );
});

test('Map and Review controls localize static labels without changing stable option values', () => {
    const previousOption =
        globalThis.Option;
    globalThis.Option =
        class FakeOption {
            constructor(
                text,
                value,
            ) {
                this.text = text;
                this.value = value;
            }
        };
    const createSelect =
        () => ({
            options: [],
            value: '',
            replaceChildren() {
                this.options = [];
            },
            add(option) {
                this.options.push(
                    option,
                );
            },
        });
    const createRenderer =
        locale =>
            createMapRenderer({
                refs: {
                    root: {},
                    inspectorElement: {},
                },
                session: {},
                getLocalizedField:
                    field => ({
                        text:
                            field.staticKey
                                ? getStaticLocaleText(
                                    field.staticKey,
                                    locale,
                                ) ||
                                    field
                                        .sourceTextEn
                                : field
                                    .sourceTextEn,
                    }),
            });
    try {
        const english =
            createSelect();
        createRenderer('en')
            .populateMapScopeSelect(
                english,
                'world',
                true,
            );
        assert.deepEqual(
            english.options
                .slice(0, 2)
                .map(option => [
                    option.value,
                    option.text,
                ]),
            [
                [
                    'auto',
                    'Follow current location',
                ],
                [
                    'world',
                    'British Wizarding World Overview',
                ],
            ],
        );
        assert.equal(
            english.options
                .some(option =>
                    /[\u3400-\u9fff]/u
                        .test(
                            option.text,
                        )),
            false,
        );

        const chinese =
            createSelect();
        createRenderer('zh-CN')
            .populateMapScopeSelect(
                chinese,
                'world',
                true,
            );
        assert.deepEqual(
            chinese.options
                .slice(0, 2)
                .map(option => [
                    option.value,
                    option.text,
                ]),
            [
                [
                    'auto',
                    '跟随当前位置',
                ],
                [
                    'world',
                    '英国魔法世界总览',
                ],
            ],
        );
        assert.equal(
            getStaticLocaleText(
                'ui.setup.review.map_scope_aria',
                'en',
            ),
            'Preview location map',
        );
        assert.equal(
            getStaticLocaleText(
                'ui.setup.review.map_aria',
                'zh-CN',
            ),
            '预设世界地图',
        );
    } finally {
        globalThis.Option =
            previousOption;
    }
});

test('English display reads canonical text directly and ignores translation rows', () => {
    const view =
        createLocalizedViewModel(
            {
                recordKind: 'message',
                recordId: 'message_1',
                fields: [{
                    fieldPath:
                        'segments[0].textEn',
                    sourceTextEn:
                        'Hermione closes the book.',
                    translationKey:
                        'row_one',
                }],
            },
            {
                displayLocale: 'en',
                translationRows: {
                    row_one: {
                        status: 'ready',
                        targetLocale:
                            'zh-CN',
                        translatedText:
                            '赫敏合上书。',
                    },
                },
            },
        );

    assert.equal(
        view.fields[0]
            .displayText,
        'Hermione closes the book.',
    );
    assert.equal(
        view.fields[0].status,
        'source',
    );
});

test('English display resolves static keys instead of exposing internal codes', () => {
    const view =
        createLocalizedViewModel(
            {
                recordKind: 'item',
                recordId: 'item_one',
                fields: [{
                    fieldPath:
                        'state',
                    sourceTextEn:
                        'destroyed',
                    staticKey:
                        'item.state.destroyed',
                }],
            },
            {
                displayLocale: 'en',
            },
        );

    assert.equal(
        view.fields[0]
            .displayText,
        'Destroyed',
    );
    assert.equal(
        view.fields[0].status,
        'static',
    );
});

test('Chinese display prefers static resources, then ready server rows, then English fallback', () => {
    const view =
        createLocalizedViewModel(
            {
                recordKind: 'mixed',
                recordId: 'record_1',
                fields: [
                    {
                        fieldPath:
                            'item.state',
                        sourceTextEn:
                            'Destroyed',
                        staticKey:
                            'item.state.destroyed',
                    },
                    {
                        fieldPath:
                            'summaryEn',
                        sourceTextEn:
                            'Hermione closes the book.',
                        translationKey:
                            'ready_row',
                    },
                    {
                        fieldPath:
                            'detailEn',
                        sourceTextEn:
                            'English fallback.',
                        translationKey:
                            'missing_row',
                    },
                ],
            },
            {
                translationRows: {
                    ready_row: {
                        status: 'ready',
                        targetLocale:
                            'zh-CN',
                        translatedText:
                            '赫敏合上书。',
                    },
                },
            },
        );

    assert.deepEqual(
        view.fields.map(field => [
            field.displayText,
            field.status,
        ]),
        [
            [
                '已毁坏',
                'static',
            ],
            [
                '赫敏合上书。',
                'translated',
            ],
            [
                'English fallback.',
                'pending',
            ],
        ],
    );
});

test('raw model evidence remains displayable without becoming English source text', () => {
    const view =
        createLocalizedViewModel({
            recordKind: 'message',
            recordId: 'message_raw',
            fields: [{
                fieldPath:
                    'segments[0].rawText',
                rawText:
                    '先别碰它。',
            }],
        });

    assert.deepEqual(
        view.fields[0],
        {
            fieldPath:
                'segments[0].rawText',
            displayText:
                '先别碰它。',
            sourceTextEn: '',
            status: 'raw_evidence',
            errorCode: '',
        },
    );
});

test('locale projection never mutates canonical world or chat bytes', () => {
    const canonical = {
        recordKind: 'scene',
        recordId: 'scene_one',
        fields: [{
            fieldPath: 'summaryEn',
            sourceTextEn:
                'The room is quiet.',
            translationKey:
                'scene_summary',
        }],
    };
    const before =
        JSON.stringify(canonical);

    createLocalizedViewModel(
        canonical,
        {
            displayLocale: 'zh-CN',
            translationRows: {},
        },
    );
    createLocalizedViewModel(
        canonical,
        {
            displayLocale: 'en',
            translationRows: {},
        },
    );

    assert.equal(
        JSON.stringify(canonical),
        before,
    );
});

test('locale controller stores only the preference and never writes world or chat', async () => {
    const stored =
        new Map();
    const session =
        createUiSessionState();
    const world = {
        timelineEpoch:
            'timeline_one',
        scene: {
            summaryEn:
                'English authority.',
        },
    };
    const before =
        JSON.stringify(world);
    let schedules = 0;
    let queries = 0;
    const controller =
        createTranslationController({
            getMudState:
                () => world,
            idleLocalizationScheduler: {
                schedule: () => {
                    schedules++;
                },
            },
            localizationQueue: {
                raisePriority:
                    () => {},
            },
            localizationTable: {
                queryRows:
                    async () => {
                        queries++;
                        return {
                            rows: [],
                        };
                    },
                requestRetranslation:
                    async () => {},
            },
            renderAll: () => {},
            scheduleRender: () => {},
            session,
            storage: {
                getItem:
                    key =>
                        stored.get(key) ||
                        null,
                setItem:
                    (
                        key,
                        value,
                    ) =>
                        stored.set(
                            key,
                            value,
                        ),
            },
        });

    assert.equal(
        session.displayLocale,
        'zh-CN',
    );
    controller.setDisplayLocale(
        'en',
    );
    await controller
        .queryLocalizedRows([
            'row_one',
        ]);
    assert.equal(queries, 0);
    controller.setDisplayLocale(
        'zh-CN',
    );
    await controller
        .queryLocalizedRows([
            'row_one',
        ]);

    assert.equal(queries, 1);
    assert.equal(
        stored.get(
            'hogwartsMud.displayLocale',
        ),
        'zh-CN',
    );
    assert.equal(
        JSON.stringify(world),
        before,
    );
    assert.ok(schedules >= 1);
});

test('visible fields derive the exact server key, batch query once, and survive a fresh browser session', async () => {
    const sourceTextEn =
        'Hermione closes the book.';
    const sourceHash =
        await hashTranslationSource(
            sourceTextEn,
        );
    const expectedKey =
        await createTranslationRowKey({
            timelineEpoch:
                'timeline_one',
            recordKind:
                'message_segment',
            recordId:
                'message:12:segment:0',
            fieldPath: 'textEn',
            sourceHash,
            sourceLocale: 'en',
            targetLocale: 'zh-CN',
            providerId: 'local',
            translatorVersion: 1,
            glossaryVersion: 1,
        });
    const row = {
        schemaVersion: 1,
        timelineEpoch:
            'timeline_one',
        recordKind:
            'message_segment',
        recordId:
            'message:12:segment:0',
        fieldPath: 'textEn',
        sourceHash,
        sourceLocale: 'en',
        status: 'ready',
        targetLocale: 'zh-CN',
        providerId: 'local',
        translatorVersion: 1,
        glossaryVersion: 1,
        translatedText:
            '赫敏合上书。',
        errorCode: '',
    };
    const queries = [];
    const priorities = [];
    const createController =
        session =>
            createTranslationController({
                getMudState:
                    () => ({
                        timelineEpoch:
                            'timeline_one',
                    }),
                getSettings:
                    () => ({
                        translationProvider:
                            'local',
                    }),
                idleLocalizationScheduler: {
                    schedule:
                        () => {},
                },
                localizationQueue: {
                    raisePriority:
                        (
                            keys,
                            priority,
                        ) =>
                            priorities.push({
                                keys,
                                priority,
                            }),
                },
                localizationTable: {
                    queryRows:
                        async (
                            _epoch,
                            keys,
                        ) => {
                            queries.push(keys);
                            return {
                                rows: [row],
                            };
                        },
                    requestRetranslation:
                        async () => {},
                },
                renderAll: () => {},
                scheduleRender:
                    () => {},
                session,
                storage: {
                    getItem:
                        () => 'zh-CN',
                    setItem:
                        () => {},
                },
            });
    const field = {
        recordKind:
            'message_segment',
        recordId:
            'message:12:segment:0',
        fieldPath: 'textEn',
        sourceTextEn,
    };

    const firstSession =
        createUiSessionState();
    const first =
        createController(
            firstSession,
        );
    const keys =
        await first
            .ensureLocalizedFields(
                [
                    field,
                ],
                {
                    priority: 0,
                },
            );

    assert.deepEqual(
        keys,
        [
            expectedKey,
        ],
    );
    assert.equal(
        first.getLocalizedField(
            field,
        ).text,
        '赫敏合上书。',
    );
    assert.equal(
        queries.length,
        1,
    );
    assert.equal(
        priorities[0]
            .priority,
        0,
    );

    const freshSession =
        createUiSessionState();
    const fresh =
        createController(
            freshSession,
        );
    await fresh
        .ensureLocalizedFields([
            field,
        ]);
    assert.equal(
        fresh.getLocalizedField(
            field,
        ).text,
        '赫敏合上书。',
    );
    assert.equal(
        queries.length,
        2,
    );
});

test('a visible TranslationTable miss enters the idle queue instead of staying pending forever', async () => {
    const session =
        createUiSessionState();
    const enqueued = [];
    let schedules = 0;
    const controller =
        createTranslationController({
            getMudState:
                () => ({
                    timelineEpoch:
                        'timeline_one',
                }),
            getSettings:
                () => ({
                    translationProvider:
                        'local',
                }),
            idleLocalizationScheduler: {
                schedule() {
                    schedules++;
                },
            },
            localizationQueue: {
                enqueue(candidates) {
                    enqueued.push(
                        ...candidates,
                    );
                },
                raisePriority:
                    () => {},
            },
            localizationTable: {
                queryRows:
                    async () => ({
                        rows: [],
                    }),
            },
            renderAll: () => {},
            scheduleRender:
                () => {},
            session,
            storage: {
                getItem:
                    () => 'zh-CN',
                setItem:
                    () => {},
            },
        });
    const field = {
        recordKind:
            'message_segment',
        recordId:
            'message:210:segment:0',
        fieldPath: 'textEn',
        sourceTextEn:
            'The wind rattled the tower windows.',
    };

    await controller
        .ensureLocalizedFields(
            [
                field,
            ],
            {
                priority: 0,
            },
        );

    assert.equal(
        enqueued.length,
        1,
    );
    assert.equal(
        enqueued[0]
            .recordId,
        field.recordId,
    );
    assert.equal(
        enqueued[0]
            .sourceText,
        field.sourceTextEn,
    );
    assert.equal(
        enqueued[0]
            .priority,
        0,
    );
    assert.equal(
        controller
            .getLocalizedField(
                field,
            ).status,
        'pending',
    );
    assert.ok(schedules >= 1);
});

test('persisted error rows stay dormant until explicit field retranslation', async () => {
    const session =
        createUiSessionState();
    const enqueued = [];
    const retranslateCalls =
        [];
    let returnError = true;
    const sourceTextEn =
        'Enjoying lunch in the Great Hall.';
    const sourceHash =
        await hashTranslationSource(
            sourceTextEn,
        );
    const row = {
        schemaVersion: 1,
        timelineEpoch:
            'timeline_one',
        recordKind:
            'calendar_entry',
        recordId:
            'routine_lunch_great_hall',
        fieldPath:
            'summaryEn',
        sourceHash,
        sourceLocale: 'en',
        targetLocale: 'zh-CN',
        providerId: 'local',
        translatorVersion: 1,
        glossaryVersion: 1,
        translatedText: '',
        status: 'error',
        errorCode:
            'TARGET_LOCALE_MISMATCH',
    };
    const controller =
        createTranslationController({
            getMudState:
                () => ({
                    timelineEpoch:
                        'timeline_one',
                }),
            getSettings:
                () => ({
                    translationProvider:
                        'local',
                }),
            idleLocalizationScheduler: {
                schedule:
                    () => {},
            },
            localizationQueue: {
                enqueue(candidates) {
                    enqueued.push(
                        ...candidates,
                    );
                },
                raisePriority:
                    () => {},
            },
            localizationTable: {
                queryRows:
                    async () => ({
                        rows:
                            returnError
                                ? [row]
                                : [],
                    }),
                async requestRetranslation(
                    timelineEpoch,
                    keys,
                ) {
                    retranslateCalls
                        .push({
                            timelineEpoch,
                            keys,
                        });
                    returnError = false;
                },
            },
            renderAll: () => {},
            scheduleRender:
                () => {},
            session,
            storage: {
                getItem:
                    () => 'zh-CN',
                setItem:
                    () => {},
            },
        });
    const field = {
        recordKind:
            row.recordKind,
        recordId:
            row.recordId,
        fieldPath:
            row.fieldPath,
        sourceTextEn,
    };

    await controller
        .ensureLocalizedFields([
            field,
        ]);
    assert.equal(
        controller
            .getLocalizedField(
                field,
            ).status,
        'error',
    );
    assert.equal(
        enqueued.length,
        0,
    );

    const keys =
        await controller
            .requestFieldRetranslation(
                [
                    field,
                ],
            );

    assert.equal(
        retranslateCalls.length,
        1,
    );
    assert.deepEqual(
        retranslateCalls[0]
            .keys,
        keys,
    );
    assert.equal(
        enqueued.length,
        1,
    );
    assert.equal(
        controller
            .getLocalizedField(
                field,
            ).status,
        'pending',
    );
});

test('provider off and TranslationTable failures expose distinct fallback states', async () => {
    const session =
        createUiSessionState();
    let providerId = 'local';
    const controller =
        createTranslationController({
            getMudState:
                () => ({
                    timelineEpoch:
                        'timeline_one',
                }),
            getSettings:
                () => ({
                    translationProvider:
                        providerId,
                }),
            idleLocalizationScheduler: {
                schedule:
                    () => {},
            },
            localizationQueue: {
                raisePriority:
                    () => {},
            },
            localizationTable: {
                queryRows:
                    async () => {
                        const error =
                            new Error(
                                'table unavailable',
                            );
                        error.code =
                            'TABLE_UNAVAILABLE';
                        throw error;
                    },
                requestRetranslation:
                    async () => {},
            },
            renderAll: () => {},
            scheduleRender:
                () => {},
            session,
            storage: {
                getItem:
                    () => 'zh-CN',
                setItem:
                    () => {},
            },
        });
    const field = {
        recordKind:
            'local_map_room',
        recordId:
            'map_one:room_one',
        fieldPath:
            'nameEn',
        sourceTextEn:
            'Reading Room',
    };

    await controller
        .ensureLocalizedFields([
            field,
        ]);
    const failed =
        controller
            .getLocalizedField(
                field,
            );
    assert.equal(
        failed.text,
        'Reading Room',
    );
    assert.equal(
        failed.status,
        'error',
    );
    assert.equal(
        failed.errorCode,
        'TABLE_UNAVAILABLE',
    );
    assert.ok(failed.key);

    providerId = 'off';
    assert.deepEqual(
        controller
            .getLocalizedField(
                field,
            ),
        {
            text: 'Reading Room',
            status: 'source',
            errorCode: '',
            key: '',
        },
    );
});

test('explicit retranslation deletes exact rows, rehydrates candidates, then raises approved keys', async () => {
    const session =
        createUiSessionState();
    const calls = [];
    session.localizationRows.set(
        'failed_key',
        {
            status: 'error',
        },
    );
    const controller =
        createTranslationController({
            enqueueLocalizationCandidates:
                async () => {
                    calls.push(
                        'hydrate',
                    );
                },
            getMudState:
                () => ({
                    timelineEpoch:
                        'timeline',
                }),
            getSettings:
                () => ({
                    translationProvider:
                        'local',
                }),
            idleLocalizationScheduler: {
                schedule() {
                    calls.push(
                        'schedule',
                    );
                },
            },
            localizationQueue: {
                raisePriority(
                    keys,
                    priority,
                ) {
                    calls.push({
                        keys,
                        priority,
                    });
                },
            },
            localizationTable: {
                async requestRetranslation(
                    timelineEpoch,
                    keys,
                ) {
                    calls.push({
                        timelineEpoch,
                        keys,
                    });
                },
            },
            renderAll:
                () => {},
            scheduleRender:
                () => {},
            session,
            storage: {
                getItem:
                    () => 'zh-CN',
                setItem:
                    () => {},
            },
        });

    await controller
        .requestRetranslation([
            'failed_key',
        ]);

    assert.deepEqual(
        calls,
        [
            {
                timelineEpoch:
                    'timeline',
                keys: [
                    'failed_key',
                ],
            },
            'hydrate',
            {
                keys: [
                    'failed_key',
                ],
                priority: 0,
            },
            'schedule',
        ],
    );
    assert.equal(
        session.localizationRows
            .has('failed_key'),
        false,
    );
});

test('visible save fields query and cache rows under their own timeline epochs', async () => {
    const sourceTextEn =
        'Kitchen';
    const sourceHash =
        await hashTranslationSource(
            sourceTextEn,
        );
    const queries = [];
    const session =
        createUiSessionState();
    const controller =
        createTranslationController({
            getMudState:
                () => ({
                    timelineEpoch:
                        'active_timeline',
                }),
            getSettings:
                () => ({
                    translationProvider:
                        'local',
                }),
            idleLocalizationScheduler: {
                schedule:
                    () => {},
            },
            localizationQueue: {
                raisePriority:
                    () => {},
            },
            localizationTable: {
                queryRows:
                    async (
                        timelineEpoch,
                        requestedKeys,
                    ) => {
                        queries.push({
                            timelineEpoch,
                            requestedKeys,
                        });
                        return {
                            rows: [{
                                schemaVersion: 1,
                                timelineEpoch,
                                recordKind:
                                    'local_map_room',
                                recordId:
                                    'home:kitchen',
                                fieldPath:
                                    'nameEn',
                                sourceHash,
                                sourceLocale:
                                    'en',
                                targetLocale:
                                    'zh-CN',
                                providerId:
                                    'local',
                                translatorVersion:
                                    1,
                                glossaryVersion:
                                    1,
                                status:
                                    'ready',
                                translatedText:
                                    timelineEpoch ===
                                        'timeline_one'
                                        ? '厨房一'
                                        : '厨房二',
                                errorCode: '',
                            }],
                        };
                    },
                requestRetranslation:
                    async () => {},
            },
            renderAll: () => {},
            scheduleRender:
                () => {},
            session,
            storage: {
                getItem:
                    () => 'zh-CN',
                setItem:
                    () => {},
            },
        });
    const fields = [
        'timeline_one',
        'timeline_two',
    ].map(timelineEpoch => ({
        timelineEpoch,
        recordKind:
            'local_map_room',
        recordId:
            'home:kitchen',
        fieldPath:
            'nameEn',
        sourceTextEn,
    }));

    await controller
        .ensureLocalizedFields(
            fields,
        );
    assert.deepEqual(
        queries.map(query =>
            query.timelineEpoch)
            .sort(),
        [
            'timeline_one',
            'timeline_two',
        ],
    );
    assert.deepEqual(
        fields.map(field =>
            controller
                .getLocalizedField(
                    field,
                ).text),
        [
            '厨房一',
            '厨房二',
        ],
    );
});

test('Save Library projects chapter and room from each save timeline instead of legacy root display fields', async () => {
    const state = {
        timelineEpoch:
            'save_timeline',
        character: {
            confirmed: true,
            inputEvidence: {
                identity: {
                    name: '蒂娜',
                },
            },
            canonicalEn: {
                identity: {
                    nameEn: 'Tina',
                },
            },
        },
        campaign: {
            presetId:
                'canon_1991',
            startYear: 1991,
            grade: 1,
            difficulty:
                'standard',
        },
        chapterEn:
            'The Letter',
        scene: {
            id: 'scene_one',
            mapId: 'home',
            roomId: 'kitchen',
        },
        map: {
            customLocalMaps: [{
                id: 'home',
                nameEn: 'Home',
                defaultLevelId:
                    'ground',
                levels: [{
                    id: 'ground',
                    nameEn:
                        'Ground Floor',
                }],
                nodes: [{
                    id: 'kitchen',
                    nameEn: 'Kitchen',
                    levelId:
                        'ground',
                }],
                exits: [],
            }],
            generatedLocalNodes:
                [],
        },
        clock:
            '1991-07-24 · 11:15',
    };
    const ensured = [];
    const previousFetch =
        globalThis.fetch;
    globalThis.fetch =
        async () => ({
            ok: true,
            json:
                async () => [{
                    file_name:
                        'save.jsonl',
                    chat_metadata: {
                        hogwartsMud:
                            state,
                    },
                    chat_items: 4,
                    mes: 'Preview',
                    last_mes:
                        '2026-08-15T00:00:00.000Z',
                }],
        });
    try {
        const library =
            createSaveLibrary({
                refs: {
                    root: {},
                },
                session: {},
                ensureLocalizedFields:
                    async fields =>
                        ensured.push(
                            ...fields,
                        ),
                getContext:
                    () => ({
                        characters: [{
                            avatar:
                                'world.png',
                        }],
                    }),
                getLocalizedField:
                    field => ({
                        text:
                            field.fieldPath ===
                                'chapterEn'
                                ? '那封信'
                                : field.recordKind ===
                                    'local_map_room'
                                    ? '厨房'
                                    : field
                                        .rawText ||
                                        field
                                            .sourceTextEn,
                        status:
                            'translated',
                    }),
                getRequestHeaders:
                    () => ({}),
                normalizeCampaign:
                    campaign =>
                        campaign,
            });
        const saves =
            await library
                .getHogwartsSaves();

        assert.equal(
            saves[0].chapter,
            '那封信',
        );
        assert.equal(
            saves[0].location,
            '厨房',
        );
        assert.equal(
            saves[0]
                .characterName,
            '蒂娜',
        );
        assert.deepEqual(
            ensured.map(field => [
                field.timelineEpoch,
                field.recordKind,
                field.recordId,
                field.fieldPath,
            ]),
            [
                [
                    'save_timeline',
                    'world_state',
                    'root',
                    'chapterEn',
                ],
                [
                    'save_timeline',
                    'local_map_room',
                    'home:kitchen',
                    'nameEn',
                ],
                [
                    'save_timeline',
                    'save_preview',
                    'save.jsonl',
                    'textEn',
                ],
                [
                    'save_timeline',
                    'character_input',
                    'player',
                    'identity.name',
                ],
            ],
        );
        assert.equal(
            Object.hasOwn(
                saves[0],
                'localizationFields',
            ),
            false,
        );
    } finally {
        globalThis.fetch =
            previousFetch;
    }
});

test('settings locale switch reprojects the active screen without starting automatic model work', () => {
    const session =
        createUiSessionState();
    Object.assign(
        session,
        {
            activeScreen: 'home',
            displayLocale:
                'zh-CN',
        },
    );
    const screens = [];
    let settingsSyncs = 0;
    let modelSyncs = 0;
    let schedules = 0;
    const controller =
        createTranslationController({
            getMudState:
                () => ({
                    timelineEpoch:
                        'timeline',
                }),
            getSettings:
                () => ({
                    translationProvider:
                        'local',
                }),
            idleLocalizationScheduler: {
                schedule() {
                    schedules++;
                },
            },
            localizationQueue: {
                raisePriority:
                    () => {},
            },
            localizationTable: {
                queryRows:
                    async () => ({
                        rows: [],
                    }),
            },
            renderAll:
                () => {
                    throw new Error(
                        'setAppScreen owns reprojection',
                    );
                },
            scheduleRender:
                () => {},
            session,
            setAppScreen:
                (
                    screen,
                    options,
                ) =>
                    screens.push({
                        screen,
                        options,
                    }),
            storage: {
                getItem:
                    () => null,
                setItem:
                    () => {},
            },
            syncModelSlotControls:
                () => {
                    modelSyncs++;
                },
            syncSettingsUi:
                () => {
                    settingsSyncs++;
                },
        });

    controller.setDisplayLocale(
        'en',
    );
    assert.deepEqual(
        screens.at(-1),
        {
            screen: 'home',
            options: {
                allowAutomaticModelWork:
                    false,
            },
        },
    );
    assert.equal(settingsSyncs, 1);
    assert.equal(modelSyncs, 0);
    assert.equal(schedules, 0);

    session.activeScreen =
        'setup';
    controller.setDisplayLocale(
        'zh-CN',
    );
    assert.deepEqual(
        screens.at(-1),
        {
            screen: 'setup',
            options: {
                allowAutomaticModelWork:
                    false,
            },
        },
    );
    assert.equal(settingsSyncs, 2);
    assert.equal(modelSyncs, 1);
    assert.equal(schedules, 1);
});
