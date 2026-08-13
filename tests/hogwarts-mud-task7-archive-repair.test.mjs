/* eslint-disable playwright/expect-expect, playwright/no-conditional-in-test */
import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import {
    mkdtemp,
    readFile,
    readdir,
    rm,
    stat,
    writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    TARGET_ITEM_ID,
    analyzeArchiveRepair,
    createArchiveGuard,
    runArchiveRepair,
} from '../scripts/repair-hogwarts-relational-memory-task7.mjs';

const FIXED_DATE =
    new Date(
        '2026-08-11T12:34:56.789Z',
    );
const OLD_EN_REMAINS =
    'She cast a dark look at the twisted, scorched remains of Harry Potter\'s spare brass quill that Tina was still holding.';
const NEW_EN_REMAINS =
    'She cast a dark look at the empty place where Harry Potter\'s spare brass quill had ceased to exist; Tina was holding nothing from it.';
const OLD_EN_PLACE =
    'Place the remnants of that poor quill on the desk, Tina.';
const NEW_EN_PLACE =
    'There are no remnants of that poor quill to place on the desk, Tina.';
const OLD_ZH_REMAINS =
    '她阴沉地看了一眼哈利·波特仍握着的哈利·波特备用黄铜羽毛笔的残骸。';
const NEW_ZH_REMAINS =
    '她阴沉地看了一眼哈利·波特的备用黄铜羽毛笔彻底消失后留下的空处；蒂娜手中没有它的任何残留物。';
const OLD_ZH_PLACE =
    '将那根可怜的羽毛笔的残余物放在桌子上，蒂娜。';
const NEW_ZH_PLACE =
    '那根可怜的羽毛笔没有任何残余物可以放到桌上，蒂娜。';

function sha256(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function baseQuill() {
    return {
        version: 2,
        id:
            TARGET_ITEM_ID,
        type: 'tool',
        labelEn:
            'Harry\'s Spare Brass Quill',
        label:
            '哈利的备用黄铜羽毛笔',
        ownerId:
            'canon_harry_james_potter',
        holderId: 'player',
        location: {
            mapId:
                'hogwarts_castle',
            roomId:
                'gryffindor_common_room',
            placement:
                'with_holder',
        },
        appearanceEn:
            'A spare writing quill fitted with a brass nib.',
        appearance:
            '一支装有黄铜笔尖的备用羽毛笔。',
        state: 'destroyed',
        sourceEventId:
            'event_transfiguration_after_break_18d50cd8847574f4',
        sourceUrl: '',
        isEquipped: false,
        notesEn: '',
        notes: '',
        storyRoles: [
            'social',
        ],
        visibility:
            'public',
        acquiredAt: {
            value:
                '1991-09-02 · 12:00',
            precision:
                'exact',
        },
        transferMode:
            'loan',
        updatedClock:
            '1991-09-02 · 12:30',
        custody: 'carried',
        kind: 'tool',
        importance:
            'important',
        mapId:
            'hogwarts_castle',
        roomId:
            'gryffindor_common_room',
        status:
            'destroyed',
        acquiredClock:
            '1991-09-02 · 12:00',
        source:
            'event_transfiguration_after_break_18d50cd8847574f4',
        detailEn:
            'A spare writing quill fitted with a brass nib.',
        detail:
            '一支装有黄铜笔尖的备用羽毛笔。',
    };
}

function sceneQuill() {
    return {
        id:
            TARGET_ITEM_ID,
        version: 2,
        type: 'tool',
        custody:
            'carried',
        ownerId:
            'canon_harry_james_potter',
        holderId: 'player',
        mapId:
            'hogwarts_castle',
        roomId:
            'gryffindor_common_room',
        status:
            'destroyed',
        state:
            'destroyed',
        isEquipped:
            false,
    };
}

function otherItem() {
    return {
        version: 3,
        id:
            'hermione_textbook',
        type: 'book',
        labelEn:
            'Hermione\'s Textbook',
        label:
            '赫敏的课本',
        ownerId:
            'canon_hermione_jean_granger',
        holderId:
            'canon_hermione_jean_granger',
        location: {
            mapId:
                'hogwarts_castle',
            roomId:
                'gryffindor_common_room',
            placement:
                'with_holder',
        },
        appearanceEn:
            'A heavy textbook.',
        appearance:
            '一本厚重的课本。',
        state: 'intact',
        physicalForm:
            'whole',
        sourceEventId:
            'fixture',
        sourceUrl: '',
        isEquipped:
            false,
        notesEn: '',
        notes: '',
        storyRoles: [],
        visibility:
            'public',
        acquiredAt: {
            value:
                '1991-09-01 · 10:00',
            precision:
                'exact',
        },
        transferMode:
            'none',
        updatedClock:
            '1991-09-02 · 19:00',
        custody:
            'carried',
        kind: 'book',
        importance:
            'ordinary',
        mapId:
            'hogwarts_castle',
        roomId:
            'gryffindor_common_room',
        status:
            'available',
        acquiredClock:
            '1991-09-01 · 10:00',
        source: 'fixture',
        detailEn:
            'A heavy textbook.',
        detail:
            '一本厚重的课本。',
    };
}

function createSceneItem(
    item,
) {
    return {
        id: item.id,
        version:
            item.version,
        type: item.type,
        custody:
            item.custody,
        ownerId:
            item.ownerId,
        holderId:
            item.holderId,
        mapId: item.mapId,
        roomId:
            item.roomId,
        status:
            item.status,
        state: item.state,
        physicalForm:
            item.physicalForm,
        isEquipped:
            item.isEquipped,
    };
}

function createState() {
    const quill =
        baseQuill();
    const textbook =
        otherItem();
    const scene = {
        id:
            'evening_study_session',
        name:
            '课后学习会',
        nameEn:
            'After-School Study Session',
        summary:
            '赫敏监督补习。',
        summaryEn:
            'Hermione supervises remedial study.',
        startedClock:
            '1991-09-02 · 19:00',
        startedMessageId:
            210,
        mapId:
            'hogwarts_castle',
        roomId:
            'gryffindor_common_room',
        timelineEntries: [],
        itemStates: [
            createSceneItem(
                textbook,
            ),
            sceneQuill(),
        ],
    };
    const retryBase = {
        saveRevisionVersion:
            1,
        timelineEpoch:
            'fixture_epoch',
        stateRevision: 6,
        revisionHistory: [],
        clock:
            '1991-09-02 · 19:00',
        items: [
            structuredClone(
                textbook,
            ),
            structuredClone(
                quill,
            ),
        ],
        scene:
            structuredClone(
                scene,
            ),
        socialGraph: {
            relationships: [{
                id:
                    'fixture_relation',
                warmth: 2,
            }],
        },
        calendar: {
            version: 2,
            entries: [{
                id:
                    'fixture_calendar',
            }],
        },
        actorLibrary: [],
        actors: [],
        eventKnowledge: [],
        memoryDirector: {
            version: 7,
        },
        knowledgeBase: {
            timelineId:
                'fixture_timeline',
        },
    };
    return {
        saveRevisionVersion:
            1,
        timelineEpoch:
            'fixture_epoch',
        stateRevision: 7,
        revisionHistory: [],
        clock:
            '1991-09-02 · 19:15',
        items: [
            textbook,
            quill,
        ],
        scene,
        sceneArchive: [{
            id:
                'quill_repair_archive',
            nameEn:
                'Quill Repair',
            summaryEn:
                'An obsolete opening claimed remains still existed.',
            startedClock:
                '1991-09-02 · 13:35',
            mapId:
                'hogwarts_castle',
            roomId:
                'gryffindor_common_room',
            actorIds: [
                'canon_hermione_jean_granger',
            ],
            messageIds: [
                209,
            ],
        }],
        activeInteractionActorIds: [
            'canon_hermione_jean_granger',
        ],
        localPresence: {
            occupantActorIds: [
                'canon_hermione_jean_granger',
            ],
        },
        actorLibrary: [{
            id:
                'canon_hermione_jean_granger',
            nameEn:
                'Hermione Granger',
            roleEn:
                'Student',
            publicBackgroundEn:
                'A first-year Gryffindor.',
            sharedMemories: {
                core: [],
                recent: [{
                    summaryEn:
                        'McGonagall vanished the ruined quill.',
                }],
                everyday: [],
            },
            identity: {
                version: 1,
                gender: {
                    code:
                        'female',
                },
            },
        }],
        actors: [{
            id:
                'canon_hermione_jean_granger',
            present: true,
            mapId:
                'hogwarts_castle',
            roomId:
                'gryffindor_common_room',
            currentActivityEn:
                'Supervising study.',
            identity: {
                version: 1,
                gender: {
                    code:
                        'female',
                },
            },
        }],
        eventKnowledge: [{
            version: 1,
            eventId:
                'event_transfiguration_after_break_18d50cd8847574f4',
            sceneId:
                'transfiguration_after_break',
            sourceMessageIds: [
                201,
                202,
            ],
            summaryEn:
                'Tina destroyed Harry\'s quill and McGonagall vanished the ruin.',
            participantActorIds: [
                'canon_harry_james_potter',
            ],
            witnessActorIds: [
                'canon_hermione_jean_granger',
            ],
        }],
        socialGraph: {
            relationships: [{
                id:
                    'fixture_relation',
                warmth: 2,
            }],
            statements: [{
                id:
                    'fixture_statement',
                textEn:
                    'Hermione witnessed the accident.',
            }],
        },
        calendar: {
            version: 2,
            entries: [{
                id:
                    'fixture_calendar',
                titleEn:
                    'Study Session',
            }],
        },
        memoryDirector: {
            version: 7,
            pendingEventBoundary:
                null,
        },
        memorySynapse: {
            appraisals: [{
                id:
                    'appraisal_fixture',
                observerId:
                    'canon_hermione_jean_granger',
                targetId:
                    'player',
                summaryEn:
                    'Tina is reckless with borrowed property.',
                confidence:
                    0.7,
                status:
                    'accepted',
                sceneId:
                    'transfiguration_after_break',
                sourceEventIds: [
                    'event_transfiguration_after_break_18d50cd8847574f4',
                ],
                sourceMessageIds: [
                    202,
                ],
            }],
            personSchemas: [{
                id:
                    'schema_fixture',
                observerId:
                    'canon_hermione_jean_granger',
                targetId:
                    'player',
                labelEn:
                    'Reckless experimenter',
                expectationEn:
                    'Hermione expects Tina to improvise dangerously.',
                confidence:
                    0.75,
                status:
                    'active',
                supportAppraisalIds: [
                    'appraisal_fixture',
                ],
                counterAppraisalIds: [],
            }],
        },
        storyArcs: [{
            id:
                'fixture_arc',
            cluePlan: [{
                id:
                    'fixture_locked_clue',
                labelEn:
                    'Locked Fixture Clue',
                hiddenFactEn:
                    'A private fact.',
                playerFacingDiscoveryEn:
                    'A future discovery.',
                sourceActorIds: [],
                sourceLocationIds: [],
                sourceItemId: '',
            }],
        }],
        clues: [],
        knowledgeBase: {
            timelineId:
                'fixture_timeline',
            vectorSource:
                'transformers',
            categories: {},
            rootPath:
                '/user/files/hogwarts-mud/fixture_timeline',
            lastSyncedAt: '',
            vectorStatus:
                'ready',
            vectorError: '',
            recordHashes: {},
            lastError: '',
        },
        turnRetry: {
            version: 1,
            playerMessageId:
                211,
            assistantMessageId:
                212,
            playerAction:
                'Place the quill.',
            baseClock:
                '1991-09-02 · 19:00',
            createdAt:
                '2026-08-11T07:22:44.000Z',
            baseState:
                retryBase,
        },
    };
}

function renderSegments(
    segments,
    language,
) {
    const textKey =
        language === 'zh'
            ? 'textZh'
            : 'textEn';
    const names = {
        canon_hermione_jean_granger:
            language === 'zh'
                ? '赫敏·格兰杰'
                : 'Hermione Jean Granger',
        canon_lavender_brown:
            language === 'zh'
                ? '拉文德·布朗'
                : 'Lavender Brown',
    };
    return segments.map(segment =>
        segment.type ===
            'dialogue'
            ? `${
                names[
                    segment
                        .actorId
                ] ||
                segment.actorId
            }: “${
                segment[
                    textKey
                ]
            }”`
            : segment[textKey])
        .join('\n\n');
}

function openingMessage() {
    const segments = [{
        type: 'narration',
        textEn:
            'The wind rattled the high tower windows while Hermione built a textbook barricade.',
        textZh:
            '高塔窗户在风中作响，赫敏用课本筑起屏障。',
    }, {
        type: 'dialogue',
        actorId:
            'canon_hermione_jean_granger',
        textEn:
            'We are going to review the wand movement without shouting.',
        textZh:
            '我们要安静地复习魔杖动作。',
    }, {
        type: 'narration',
        textEn:
            `${OLD_EN_REMAINS} The failed spell had exhausted Hermione's patience.`,
        textZh:
            `${OLD_ZH_REMAINS}失败的咒语耗尽了赫敏的耐心。`,
    }, {
        type: 'dialogue',
        actorId:
            'canon_lavender_brown',
        textEn:
            'I think it is generous of you to try again.',
        textZh:
            '我觉得你愿意再试一次很慷慨。',
    }, {
        type: 'narration',
        textEn:
            'Hermione drew her vine wand and looked across the barricade.',
        textZh:
            '赫敏抽出藤木魔杖，越过屏障看去。',
    }, {
        type: 'dialogue',
        actorId:
            'canon_hermione_jean_granger',
        textEn:
            `${OLD_EN_PLACE} You may watch my wrist motion.`,
        textZh:
            `${OLD_ZH_PLACE}你可以观察我的手腕动作。`,
    }];
    const sourceEn =
        renderSegments(
            segments,
            'en',
        );
    const translatedZh =
        renderSegments(
            segments,
            'zh',
        );
    const diagnosticItem = {
        id:
            TARGET_ITEM_ID,
        labelEn:
            'Harry\'s Spare Brass Quill',
        ownerId:
            'canon_harry_james_potter',
        holderId: 'player',
        location: {
            mapId:
                'hogwarts_castle',
            roomId:
                'gryffindor_common_room',
            placement:
                'with_holder',
        },
        state:
            'destroyed',
        isEquipped:
            false,
        transferMode:
            'loan',
    };
    const extra = {
        hogwartsMud: {
            role:
                'scene_opening',
            sceneId:
                'evening_study_session',
            sourceEn,
            translatedZh,
            segments,
            sceneTransition: {
                diagnostics: {
                    authoritativeItems: [
                        {
                            id:
                                'hermione_textbook',
                        },
                        diagnosticItem,
                    ],
                },
            },
        },
        display_text:
            translatedZh,
    };
    return {
        name: 'Scene',
        is_user: false,
        is_system:
            false,
        send_date:
            '2026-08-11T05:53:20.600Z',
        mes: sourceEn,
        extra,
        swipe_id: 0,
        swipes: [
            sourceEn,
        ],
        swipe_info: [{
            send_date:
                '2026-08-11T05:53:20.600Z',
            extra:
                structuredClone(
                    extra,
                ),
        }],
    };
}

function evidenceMessage() {
    const evidence =
        'McGonagall raised her wand. With a lazy flick, the smoking ruin of the quill vanished entirely, leaving only a scorch mark on the desk.';
    return {
        name: 'Scene',
        is_user: false,
        mes: evidence,
        extra: {
            hogwartsMud: {
                role:
                    'scene_turn',
                sceneId:
                    'transfiguration_after_break',
                segments: [{
                    type:
                        'narration',
                    textEn:
                        evidence,
                    textZh:
                        '麦格挥动魔杖，羽毛笔的残骸彻底消失。',
                }],
                turnTransaction: {
                    itemOperations: [{
                        id:
                            TARGET_ITEM_ID,
                        operation:
                            'destroy',
                        evidenceText:
                            'the smoking ruin of the quill vanished entirely',
                    }],
                },
            },
        },
    };
}

function createFixture() {
    const messages =
        Array.from(
            {
                length: 213,
            },
            (
                _value,
                messageId,
            ) => ({
                name: 'User',
                is_user:
                    true,
                mes:
                    `fixture message ${messageId}`,
                extra: {
                    hogwartsMud: {
                        role:
                            'player_turn',
                        sceneId:
                            'fixture_scene',
                    },
                },
            }),
        );
    messages[201] = {
        name: 'User',
        is_user: true,
        mes:
            `Cast a spell at ${TARGET_ITEM_ID}.`,
        extra: {
            hogwartsMud: {
                role:
                    'player_turn',
                sceneId:
                    'transfiguration_after_break',
            },
        },
    };
    messages[202] =
        evidenceMessage();
    messages[209] = {
        name: 'Scene',
        is_user: false,
        mes:
            'The destroyed quill\'s remains were still with Tina.',
        extra: {
            hogwartsMud: {
                role:
                    'scene_opening',
                sceneId:
                    'quill_repair_archive',
                segments: [{
                    type:
                        'narration',
                    textEn:
                        'The destroyed quill\'s remains were still with Tina.',
                }],
            },
        },
    };
    messages[210] =
        openingMessage();
    messages[211] = {
        name: 'User',
        is_user: true,
        send_date:
            '2026-08-11T07:22:43.512Z',
        mes:
            `*赶紧把【物品:${TARGET_ITEM_ID}｜哈利的备用黄铜羽毛笔】放到桌子上，紧张地抓着拉文德*`,
        extra: {
            hogwartsMud: {
                role:
                    'player_turn',
                sceneId:
                    'evening_study_session',
                itemDirectiveErrors: [
                    `物品引用 ${TARGET_ITEM_ID} 缺少前置操作。`,
                ],
            },
        },
    };
    messages[212] = {
        name: 'Scene',
        is_user: false,
        send_date:
            '2026-08-11T07:24:38.028Z',
        mes:
            'Hermione tapped the empty desk. Professor McGonagall vanished it. It has gone into non-being. It no longer exists in the physical realm.',
        extra: {
            display_text:
                '赫敏敲了敲完全空旷的桌面。羽毛笔已经化为虚无，不再存在。',
            hogwartsMud: {
                role:
                    'scene_turn',
                sceneId:
                    'evening_study_session',
                sourceEn:
                    'Professor McGonagall vanished it. It has gone into non-being. It no longer exists in the physical realm.',
                translatedZh:
                    '麦格教授让它化为虚无，它不再存在。',
                segments: [{
                    type:
                        'narration',
                    textEn:
                        'The desk was empty.',
                    textZh:
                        '桌面空无一物。',
                }],
            },
        },
    };
    const header = {
        user_name:
            'Fixture User',
        character_name:
            'Hogwarts World Director',
        chat_metadata: {
            hogwartsMud:
                createState(),
            unrelatedMetadata: {
                keep:
                    'byte-stable',
            },
        },
    };
    const raw = [
        JSON.stringify(
            header,
        ),
        ...messages.map(
            message =>
                JSON.stringify(
                    message,
                ),
        ),
    ].join('\n');
    return {
        raw:
            Buffer.from(raw),
        header,
        messages,
    };
}

function parseFixture(
    raw,
) {
    const lines =
        raw.toString('utf8')
            .split('\n');
    return {
        lines,
        header:
            JSON.parse(
                lines[0],
            ),
        messages:
            lines.slice(1)
                .map(line =>
                    JSON.parse(line)),
    };
}

function getQuill(
    items,
) {
    return items.find(item =>
        item.id ===
            TARGET_ITEM_ID);
}

function assertAbsentQuill(
    item,
    {
        sceneProjection =
        false,
    } = {},
) {
    assert.equal(
        item.version,
        3,
    );
    assert.equal(
        item.state,
        'destroyed',
    );
    assert.equal(
        item.physicalForm,
        'absent',
    );
    assert.equal(
        item.holderId,
        '',
    );
    assert.equal(
        item.custody,
        'stored',
    );
    assert.equal(
        item.status,
        'destroyed',
    );
    assert.equal(
        item.mapId,
        '',
    );
    assert.equal(
        item.roomId,
        '',
    );
    assert.equal(
        item.isEquipped,
        false,
    );
    if (!sceneProjection) {
        assert.deepEqual(
            item.location,
            {
                mapId: '',
                roomId: '',
                placement: '',
            },
        );
    }
}

async function createHarness(
    t,
) {
    const root =
        await mkdtemp(
            path.join(
                os.tmpdir(),
                'hpmud-task7-',
            ),
        );
    t.after(() =>
        rm(
            root,
            {
                recursive: true,
                force: true,
            },
        ));
    const fixture =
        createFixture();
    const file =
        path.join(
            root,
            'target.jsonl',
        );
    const backupRoot =
        path.join(
            root,
            'backups',
        );
    const knowledgeRoot =
        path.join(
            root,
            'knowledge',
        );
    await writeFile(
        file,
        fixture.raw,
    );
    return {
        ...fixture,
        root,
        file,
        backupRoot,
        knowledgeRoot,
        expectedGuard:
            createArchiveGuard(
                fixture.raw,
            ),
    };
}

test('Task 7 dry-run reproduces lines 212-214 and performs zero writes or model calls', async t => {
    const harness =
        await createHarness(t);
    const beforeStat =
        await stat(
            harness.file,
        );
    const before =
        await readFile(
            harness.file,
        );

    const result =
        await runArchiveRepair({
            mode:
                'dry-run',
            file:
                harness.file,
            backupRoot:
                harness
                    .backupRoot,
            knowledgeRoot:
                harness
                    .knowledgeRoot,
            expectedGuard:
                harness
                    .expectedGuard,
            now:
                () =>
                    new Date(
                        FIXED_DATE,
                    ),
        });

    assert.equal(
        result.status,
        'ready',
    );
    assert.equal(
        result.guard.matched,
        true,
    );
    assert.deepEqual(
        result.guard.checks,
        {
            checksum: true,
            timelineEpoch:
                true,
            stateRevision:
                true,
            targetMessageFingerprints:
                true,
        },
    );
    assert.deepEqual(
        result.conflict,
        {
            reproduced: true,
            targetLines: [
                212,
                213,
                214,
            ],
            openingClaimsRemains:
                true,
            playerAttemptsPlacement:
                true,
            responseSaysAbsent:
                true,
        },
    );
    assert.equal(
        result
            .destructionEvidence
            .inferredPhysicalForm,
        'absent',
    );
    assert.ok(
        result.boundedDiff
            .length > 0 &&
        result.boundedDiff
            .length <= 24,
    );
    assert.deepEqual(
        result.modelCalls,
        {
            high: 0,
            medium: 0,
            low: 0,
            local: 0,
            total: 0,
        },
    );
    assert.equal(
        result.networkCalls,
        0,
    );
    assert.equal(
        result.wroteArchive,
        false,
    );
    assert.equal(
        result.wroteKnowledge,
        false,
    );
    assert.deepEqual(
        await readFile(
            harness.file,
        ),
        before,
    );
    const afterStat =
        await stat(
            harness.file,
        );
    assert.equal(
        afterStat.mtimeMs,
        beforeStat.mtimeMs,
    );
    await assert.rejects(
        readdir(
            harness.backupRoot,
        ),
        error =>
            error.code ===
            'ENOENT',
    );
    await assert.rejects(
        readdir(
            harness.knowledgeRoot,
        ),
        error =>
            error.code ===
            'ENOENT',
    );
});

test('Task 7 apply remains blocked unless checksum, epoch, revision and every target fingerprint match', () => {
    const fixture =
        createFixture();
    const baseline =
        createArchiveGuard(
            fixture.raw,
        );
    const cases = [
        {
            name:
                'checksum',
            guard: {
                ...baseline,
                archiveSha256:
                    '0'.repeat(64),
            },
            expectedCheck:
                'checksum',
        },
        {
            name:
                'timeline epoch',
            guard: {
                ...baseline,
                timelineEpoch:
                    'wrong_epoch',
            },
            expectedCheck:
                'timelineEpoch',
        },
        {
            name:
                'state revision',
            guard: {
                ...baseline,
                stateRevision:
                    baseline
                        .stateRevision +
                    1,
            },
            expectedCheck:
                'stateRevision',
        },
        {
            name:
                'message fingerprint',
            guard: {
                ...baseline,
                messages:
                    baseline.messages
                        .map(
                            (
                                entry,
                                index,
                            ) => ({
                                ...entry,
                                sha256:
                                    index ===
                                    1
                                        ? 'f'.repeat(
                                            64,
                                        )
                                        : entry.sha256,
                            }),
                        ),
            },
            expectedCheck:
                'targetMessageFingerprints',
        },
    ];
    for (const scenario of
        cases) {
        const result =
            analyzeArchiveRepair(
                fixture.raw,
                {
                    expectedGuard:
                        scenario
                            .guard,
                    committedAt:
                        FIXED_DATE
                            .toISOString(),
                },
            );
        assert.equal(
            result.status,
            'blocked',
            scenario.name,
        );
        assert.equal(
            result.guard
                .checks[
                    scenario
                        .expectedCheck
                ],
            false,
            scenario.name,
        );
        assert.equal(
            result.afterHash,
            null,
            scenario.name,
        );
    }
});

test('Task 7 guarded apply creates backup, performs the exact repair and rebuilds Knowledge V2 exact-only', async t => {
    const harness =
        await createHarness(t);
    const before =
        await readFile(
            harness.file,
        );
    const beforeParsed =
        parseFixture(
            before,
        );
    const line213Before =
        beforeParsed.lines[212];
    const line214Before =
        beforeParsed.lines[213];

    const result =
        await runArchiveRepair({
            mode: 'apply',
            file:
                harness.file,
            backupRoot:
                harness
                    .backupRoot,
            knowledgeRoot:
                harness
                    .knowledgeRoot,
            expectedGuard:
                harness
                    .expectedGuard,
            qdrantUrl: '',
            now:
                () =>
                    new Date(
                        FIXED_DATE,
                    ),
        });

    assert.equal(
        result.status,
        'applied',
    );
    assert.equal(
        result.wroteArchive,
        true,
    );
    assert.equal(
        result.wroteKnowledge,
        true,
    );
    assert.equal(
        result.beforeSha256,
        sha256(before),
    );
    const after =
        await readFile(
            harness.file,
        );
    assert.equal(
        result.afterSha256,
        sha256(after),
    );
    assert.notEqual(
        result.afterSha256,
        result.beforeSha256,
    );
    assert.deepEqual(
        await readFile(
            result.backupPath,
        ),
        before,
    );
    const backupManifest =
        JSON.parse(
            await readFile(
                result
                    .backupManifestPath,
                'utf8',
            ),
        );
    assert.equal(
        backupManifest.status,
        'completed',
    );
    assert.equal(
        backupManifest
            .archive
            .beforeSha256,
        result.beforeSha256,
    );
    assert.equal(
        backupManifest
            .archive
            .afterSha256,
        result.afterSha256,
    );
    assert.deepEqual(
        backupManifest
            .modelCalls,
        {
            high: 0,
            medium: 0,
            low: 0,
            local: 0,
            total: 0,
        },
    );

    const parsed =
        parseFixture(
            after,
        );
    const state =
        parsed.header
            .chat_metadata
            .hogwartsMud;
    assert.equal(
        state.timelineEpoch,
        'fixture_epoch',
    );
    assert.equal(
        state.stateRevision,
        8,
    );
    assert.equal(
        state.revisionHistory
            .at(-1)
            .source,
        'task7_quill_archive_repair',
    );
    assert.deepEqual(
        state.revisionHistory
            .at(-1)
            .changedDomains,
        [
            'item',
            'knowledge',
            'message',
            'migration',
            'scene',
            'world',
        ],
    );
    assertAbsentQuill(
        getQuill(
            state.items,
        ),
    );
    assertAbsentQuill(
        getQuill(
            state.scene
                .itemStates,
        ),
        {
            sceneProjection:
                true,
        },
    );
    assertAbsentQuill(
        getQuill(
            state.turnRetry
                .baseState
                .items,
        ),
    );
    assertAbsentQuill(
        getQuill(
            state.turnRetry
                .baseState
                .scene
                .itemStates,
        ),
        {
            sceneProjection:
                true,
        },
    );
    assert.equal(
        state.turnRetry
            .baseState
            .stateRevision,
        6,
        'historical retry revision remains unchanged',
    );

    const opening =
        parsed.messages[210];
    const openingText =
        JSON.stringify(
            opening,
        );
    assert.match(
        openingText,
        new RegExp(
            NEW_EN_REMAINS
                .replace(
                    /[.*+?^${}()|[\]\\]/gu,
                    '\\$&',
                ),
            'u',
        ),
    );
    assert.match(
        openingText,
        new RegExp(
            NEW_EN_PLACE
                .replace(
                    /[.*+?^${}()|[\]\\]/gu,
                    '\\$&',
                ),
            'u',
        ),
    );
    assert.match(
        openingText,
        new RegExp(
            NEW_ZH_REMAINS,
            'u',
        ),
    );
    assert.match(
        openingText,
        new RegExp(
            NEW_ZH_PLACE,
            'u',
        ),
    );
    assert.doesNotMatch(
        openingText,
        /twisted, scorched remains|仍握着的哈利·波特备用|Place the remnants/iu,
    );
    const diagnosticItem =
        opening.extra
            .hogwartsMud
            .sceneTransition
            .diagnostics
            .authoritativeItems
            .find(item =>
                item.id ===
                TARGET_ITEM_ID);
    assert.equal(
        diagnosticItem
            .physicalForm,
        'absent',
    );
    assert.equal(
        diagnosticItem
            .holderId,
        '',
    );
    assert.deepEqual(
        diagnosticItem
            .location,
        {
            mapId: '',
            roomId: '',
            placement: '',
        },
    );
    assert.equal(
        parsed.lines[212],
        line213Before,
        'message 213 must be byte-identical',
    );
    assert.equal(
        parsed.lines[213],
        line214Before,
        'message 214 must be byte-identical',
    );
    for (
        let messageId = 0;
        messageId <
        beforeParsed
            .messages
            .length;
        messageId += 1
    ) {
        if (messageId === 210) {
            continue;
        }
        assert.equal(
            parsed.lines[
                messageId + 1
            ],
            beforeParsed.lines[
                messageId + 1
            ],
            `non-target message ${messageId} changed`,
        );
    }
    assert.deepEqual(
        state.socialGraph,
        beforeParsed.header
            .chat_metadata
            .hogwartsMud
            .socialGraph,
    );
    assert.deepEqual(
        state.calendar,
        beforeParsed.header
            .chat_metadata
            .hogwartsMud
            .calendar,
    );
    assert.deepEqual(
        state.actorLibrary,
        beforeParsed.header
            .chat_metadata
            .hogwartsMud
            .actorLibrary,
    );
    assert.deepEqual(
        state.memoryDirector,
        beforeParsed.header
            .chat_metadata
            .hogwartsMud
            .memoryDirector,
    );
    assert.deepEqual(
        state.items.filter(
            item =>
                item.id !==
                TARGET_ITEM_ID,
        ),
        beforeParsed.header
            .chat_metadata
            .hogwartsMud
            .items
            .filter(
                item =>
                    item.id !==
                    TARGET_ITEM_ID,
            ),
    );

    const index =
        JSON.parse(
            await readFile(
                result.knowledge
                    .manifestPath,
                'utf8',
            ),
        );
    assert.equal(
        index.version,
        2,
    );
    assert.equal(
        index.projectorVersion,
        2,
    );
    assert.equal(
        index.timelineEpoch,
        'fixture_epoch',
    );
    assert.equal(
        index.stateRevision,
        8,
    );
    assert.equal(
        Object.keys(
            index.records,
        ).length,
        result.knowledge
            .recordCount,
    );
    const currentEntry =
        index.records[
            `events_item_${TARGET_ITEM_ID}_current`
        ];
    assert.ok(currentEntry);
    const currentRecord =
        JSON.parse(
            await readFile(
                path.join(
                    path.dirname(
                        result
                            .knowledge
                            .manifestPath,
                    ),
                    currentEntry
                        .category,
                    `${
                        currentEntry
                            .recordId
                    }.json`,
                ),
                'utf8',
            ),
        );
    assert.equal(
        currentRecord.version,
        2,
    );
    assert.equal(
        currentRecord
            .projectorVersion,
        2,
    );
    assert.equal(
        currentRecord.data
            .physicalForm,
        'absent',
    );
    const supersededScene =
        Object.values(
            index.records,
        ).find(entry =>
            entry.recordId
                .startsWith(
                    'scenes_quill_repair_archive',
                ));
    assert.ok(
        supersededScene
            .tags
            .includes(
                'superseded',
            ),
    );
    assert.equal(
        result.knowledge
            .diagnostics
            .fallback,
        'exact-only',
    );
    assert.equal(
        result.knowledge
            .diagnostics
            .qdrant
            .configured,
        false,
    );
    assert.equal(
        result.knowledge
            .exactOnly,
        true,
    );
    assert.deepEqual(
        result.modelCalls,
        {
            high: 0,
            medium: 0,
            low: 0,
            local: 0,
            total: 0,
        },
    );
});

test('Task 7 second apply is a no-op and archive plus Knowledge manifest remain byte-stable', async t => {
    const harness =
        await createHarness(t);
    const options = {
        mode: 'apply',
        file: harness.file,
        backupRoot:
            harness.backupRoot,
        knowledgeRoot:
            harness.knowledgeRoot,
        expectedGuard:
            harness.expectedGuard,
        now:
            () =>
                new Date(
                    FIXED_DATE,
                ),
    };
    const first =
        await runArchiveRepair(
            options,
        );
    const archiveBefore =
        await readFile(
            harness.file,
        );
    const manifestBefore =
        await readFile(
            first.knowledge
                .manifestPath,
        );
    const backupEntriesBefore =
        await readdir(
            harness.backupRoot,
        );

    const second =
        await runArchiveRepair(
            options,
        );

    assert.equal(
        second.status,
        'noop',
    );
    assert.equal(
        second.reason,
        'task7_repair_already_applied',
    );
    assert.equal(
        second.wroteArchive,
        false,
    );
    assert.equal(
        second.wroteKnowledge,
        false,
    );
    assert.deepEqual(
        await readFile(
            harness.file,
        ),
        archiveBefore,
    );
    assert.deepEqual(
        await readFile(
            first.knowledge
                .manifestPath,
        ),
        manifestBefore,
    );
    assert.deepEqual(
        await readdir(
            harness.backupRoot,
        ),
        backupEntriesBefore,
    );
    assert.equal(
        second.beforeSha256,
        second.afterSha256,
    );
    assert.deepEqual(
        second.modelCalls,
        {
            high: 0,
            medium: 0,
            low: 0,
            local: 0,
            total: 0,
        },
    );
});
