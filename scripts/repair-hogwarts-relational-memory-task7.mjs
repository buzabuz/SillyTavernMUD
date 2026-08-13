#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import {
    cp,
    mkdir,
    open,
    readFile,
    rename,
    rm,
    stat,
} from 'node:fs/promises';
import path from 'node:path';
import {
    fileURLToPath,
} from 'node:url';

import {
    inferDestroyedPhysicalForm,
    normalizeItem,
    validateItem,
} from '../public/scripts/extensions/hogwarts-mud/domain/item-schema.js';
import {
    prepareSaveRevisionCommit,
} from '../public/scripts/extensions/hogwarts-mud/domain/save-revision.js';
import {
    createChunkedKnowledgeRecords,
    createKnowledgeRecordV2,
    normalizeKnowledgeId,
} from '../public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js';
import {
    createJsonKnowledgeBackend,
} from '../src/hogwarts-mud/knowledge-json-backend.js';

export const TASK7_REPAIR_VERSION = 1;
export const TARGET_ITEM_ID =
    'harry_spare_brass_quill';
export const TARGET_EVIDENCE_EVENT_ID =
    'event_transfiguration_after_break_18d50cd8847574f4';
export const DEFAULT_TARGET_FILE =
    path.resolve(
        'data',
        'default-user',
        'chats',
        'Hogwarts_World_Director',
        'Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl',
    );
export const DEFAULT_BACKUP_ROOT =
    path.resolve(
        'data',
        'default-user',
        'backups',
        'hogwarts-relational-memory-task7',
    );
export const DEFAULT_KNOWLEDGE_ROOT =
    path.resolve(
        'data',
        'default-user',
        'user',
        'files',
        'hogwarts-mud',
    );

export const EXPECTED_TARGET_GUARD =
    Object.freeze({
        archiveSha256:
            '9ed44356ba56651b8f82f38d10452b551bda60a3d9ebc6f1d4c8a35db7bb0ff3',
        timelineEpoch:
            'legacy_cdf2d1047e32546a',
        stateRevision: 40,
        messages: Object.freeze([
            Object.freeze({
                lineNumber: 212,
                messageIndex: 210,
                sha256:
                    '1690c49a87700a3e236ee8a41dd8e6cc684f9fe0a642b23e7e988b1e14ef5ee6',
            }),
            Object.freeze({
                lineNumber: 213,
                messageIndex: 211,
                sha256:
                    '3e242441542fde4c13ff8f04789cdfb42fc7a3c2624d5fe7e9615049ee543c11',
            }),
            Object.freeze({
                lineNumber: 214,
                messageIndex: 212,
                sha256:
                    'e013ca1c977a4952a70080e68c3664b44e0d9656f9e23721d9ac80e9f4a9bfc3',
            }),
        ]),
    });

const REPAIR_SOURCE =
    'task7_quill_archive_repair';
const CURRENT_ITEM_RECORD_ID =
    `events_item_${TARGET_ITEM_ID}_current`;
const MAX_BOUNDED_DIFFS = 24;
const MAX_DIFF_VALUE_LENGTH = 260;
const TARGET_LINE_NUMBERS =
    Object.freeze([
        212,
        213,
        214,
    ]);

const OPENING_REPLACEMENTS =
    Object.freeze({
        english: Object.freeze([
            Object.freeze({
                before:
                    'She cast a dark look at the twisted, scorched remains of Harry Potter\'s spare brass quill that Tina was still holding.',
                after:
                    'She cast a dark look at the empty place where Harry Potter\'s spare brass quill had ceased to exist; Tina was holding nothing from it.',
            }),
            Object.freeze({
                before:
                    'Place the remnants of that poor quill on the desk, Tina.',
                after:
                    'There are no remnants of that poor quill to place on the desk, Tina.',
            }),
        ]),
        chinese: Object.freeze([
            Object.freeze({
                before:
                    '她阴沉地看了一眼哈利·波特仍握着的哈利·波特备用黄铜羽毛笔的残骸。',
                after:
                    '她阴沉地看了一眼哈利·波特的备用黄铜羽毛笔彻底消失后留下的空处；蒂娜手中没有它的任何残留物。',
            }),
            Object.freeze({
                before:
                    '将那根可怜的羽毛笔的残余物放在桌子上，蒂娜。',
                after:
                    '那根可怜的羽毛笔没有任何残余物可以放到桌上，蒂娜。',
            }),
        ]),
    });

const ABSENT_RESPONSE_PATTERN =
    /(?:gone into non-being|no longer exists in the physical realm|完全空旷|化为虚无|不再存在)/iu;
const CONTRADICTORY_REMAINS_PATTERN =
    /(?:remains? of Harry Potter's spare brass quill that Tina was still holding|destroyed quill's remains were still with Tina|place the remnants? of that poor quill|仍由蒂娜收着|蒂娜手中.*羽毛笔.*残骸|将那根可怜的羽毛笔的残余物放在桌子上)/iu;
const PLAYER_ATTEMPT_PATTERN =
    /(?:放到桌子|place .{0,80}(?:quill|remnants?).{0,40}(?:desk|table))/iu;

function sha256(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function boundedText(value) {
    const text =
        value === undefined
            ? '<undefined>'
            : JSON.stringify(value);
    return text.length >
        MAX_DIFF_VALUE_LENGTH
        ? `${text.slice(
            0,
            MAX_DIFF_VALUE_LENGTH,
        )}...`
        : text;
}

function parseArchive(source) {
    const buffer =
        Buffer.isBuffer(source)
            ? source
            : Buffer.from(source);
    const text =
        buffer.toString('utf8');
    const lines =
        text.split('\n');
    const hasTrailingNewline =
        lines.at(-1) === '';
    if (hasTrailingNewline) {
        lines.pop();
    }
    if (lines.length < 2) {
        throw new Error(
            'ARCHIVE_INVALID: expected metadata and message rows.',
        );
    }
    let header;
    const chat = [];
    try {
        header =
            JSON.parse(lines[0]);
        for (
            let index = 1;
            index < lines.length;
            index += 1
        ) {
            chat.push(
                JSON.parse(
                    lines[index],
                ),
            );
        }
    } catch (error) {
        throw new Error(
            'ARCHIVE_INVALID: malformed JSONL.',
            {
                cause: error,
            },
        );
    }
    return {
        source: buffer,
        text,
        lines,
        hasTrailingNewline,
        header,
        chat,
    };
}

function encodeArchive(
    lines,
    hasTrailingNewline,
) {
    return Buffer.from(
        `${lines.join('\n')}${
            hasTrailingNewline
                ? '\n'
                : ''
        }`,
    );
}

function getState(header) {
    const state =
        header?.chat_metadata
            ?.hogwartsMud;
    if (
        !state ||
        typeof state !== 'object' ||
        Array.isArray(state)
    ) {
        throw new Error(
            'ARCHIVE_INVALID: chat_metadata.hogwartsMud State is missing.',
        );
    }
    return state;
}

function messageAtLine(
    parsed,
    lineNumber,
) {
    const messageIndex =
        lineNumber - 2;
    const message =
        parsed.chat[
            messageIndex
        ];
    if (!message) {
        throw new Error(
            `ARCHIVE_INVALID: message line ${lineNumber} is missing.`,
        );
    }
    return {
        lineNumber,
        messageIndex,
        message,
        raw:
            parsed.lines[
                lineNumber - 1
            ],
    };
}

export function createArchiveGuard(
    source,
    {
        timelineEpoch,
        stateRevision,
        lineNumbers =
        TARGET_LINE_NUMBERS,
    } = {},
) {
    const parsed =
        parseArchive(source);
    const state =
        getState(parsed.header);
    return {
        archiveSha256:
            sha256(parsed.source),
        timelineEpoch:
            timelineEpoch ??
            state.timelineEpoch,
        stateRevision:
            stateRevision ??
            state.stateRevision,
        messages:
            lineNumbers.map(
                lineNumber => {
                    const entry =
                        messageAtLine(
                            parsed,
                            lineNumber,
                        );
                    return {
                        lineNumber,
                        messageIndex:
                            entry.messageIndex,
                        sha256:
                            sha256(entry.raw),
                    };
                },
            ),
    };
}

function inspectGuard(
    parsed,
    expectedGuard,
) {
    const state =
        getState(parsed.header);
    const actual = {
        archiveSha256:
            sha256(parsed.source),
        timelineEpoch:
            state.timelineEpoch,
        stateRevision:
            state.stateRevision,
        messages:
            expectedGuard.messages
                .map(expected => {
                    const entry =
                        messageAtLine(
                            parsed,
                            expected
                                .lineNumber,
                        );
                    return {
                        lineNumber:
                            expected
                                .lineNumber,
                        messageIndex:
                            entry
                                .messageIndex,
                        sha256:
                            sha256(
                                entry.raw,
                            ),
                    };
                }),
    };
    const checks = {
        checksum:
            actual.archiveSha256 ===
            expectedGuard
                .archiveSha256,
        timelineEpoch:
            actual.timelineEpoch ===
            expectedGuard
                .timelineEpoch,
        stateRevision:
            actual.stateRevision ===
            expectedGuard
                .stateRevision,
        targetMessageFingerprints:
            expectedGuard.messages
                .every(
                    (
                        expected,
                        index,
                    ) =>
                        actual.messages[
                            index
                        ]?.lineNumber ===
                            expected
                                .lineNumber &&
                        actual.messages[
                            index
                        ]?.messageIndex ===
                            expected
                                .messageIndex &&
                        actual.messages[
                            index
                        ]?.sha256 ===
                            expected.sha256,
                ),
    };
    return {
        matched:
            Object.values(checks)
                .every(Boolean),
        checks,
        expected:
            expectedGuard,
        actual,
    };
}

function findItem(
    items,
    itemId =
    TARGET_ITEM_ID,
) {
    return (
        Array.isArray(items)
            ? items
            : []
    ).find(item =>
        item?.id === itemId);
}

function findItemIndex(
    items,
    itemId =
    TARGET_ITEM_ID,
) {
    return (
        Array.isArray(items)
            ? items
            : []
    ).findIndex(item =>
        item?.id === itemId);
}

function assertRoundTripJson(
    raw,
    label,
) {
    assert.equal(
        JSON.stringify(
            JSON.parse(raw),
        ),
        raw,
        `${label} cannot be byte-preserved by JSON round-trip.`,
    );
}

function replaceExactly(
    value,
    replacements,
    label,
) {
    let result =
        String(value ?? '');
    for (const replacement of replacements) {
        const first =
            result.indexOf(
                replacement.before,
            );
        const last =
            result.lastIndexOf(
                replacement.before,
            );
        if (
            first < 0 ||
            first !== last
        ) {
            throw new Error(
                `OPENING_FINGERPRINT_MISMATCH: ${label}`,
            );
        }
        result =
            `${result.slice(
                0,
                first,
            )}${
                replacement.after
            }${
                result.slice(
                    first +
                    replacement
                        .before
                        .length,
                )
            }`;
    }
    return result;
}

function replaceOpeningText(
    value,
    language,
    label,
) {
    return replaceExactly(
        value,
        OPENING_REPLACEMENTS[
            language
        ],
        label,
    );
}

function patchDiagnosticItem(
    item,
) {
    if (
        !item ||
        item.id !==
            TARGET_ITEM_ID
    ) {
        throw new Error(
            'OPENING_DIAGNOSTIC_ITEM_MISSING',
        );
    }
    return {
        ...item,
        holderId: '',
        location: {
            mapId: '',
            roomId: '',
            placement: '',
        },
        state: 'destroyed',
        physicalForm: 'absent',
        isEquipped: false,
    };
}

function patchOpeningExtra(
    extra,
    label,
) {
    const next =
        structuredClone(extra);
    const mud =
        next?.hogwartsMud;
    if (
        !mud ||
        mud.role !==
            'scene_opening' ||
        mud.sceneId !==
            'evening_study_session'
    ) {
        throw new Error(
            `OPENING_ROLE_MISMATCH: ${label}`,
        );
    }
    mud.sourceEn =
        replaceOpeningText(
            mud.sourceEn,
            'english',
            `${label}.sourceEn`,
        );
    mud.translatedZh =
        replaceOpeningText(
            mud.translatedZh,
            'chinese',
            `${label}.translatedZh`,
        );
    if (
        !Array.isArray(
            mud.segments,
        ) ||
        mud.segments.length !== 6
    ) {
        throw new Error(
            `OPENING_SEGMENTS_MISMATCH: ${label}`,
        );
    }
    mud.segments[2].textEn =
        replaceExactly(
            mud.segments[2]
                .textEn,
            [
                OPENING_REPLACEMENTS
                    .english[0],
            ],
            `${label}.segments[2].textEn`,
        );
    mud.segments[2].textZh =
        replaceExactly(
            mud.segments[2]
                .textZh,
            [
                OPENING_REPLACEMENTS
                    .chinese[0],
            ],
            `${label}.segments[2].textZh`,
        );
    mud.segments[5].textEn =
        replaceExactly(
            mud.segments[5]
                .textEn,
            [
                OPENING_REPLACEMENTS
                    .english[1],
            ],
            `${label}.segments[5].textEn`,
        );
    mud.segments[5].textZh =
        replaceExactly(
            mud.segments[5]
                .textZh,
            [
                OPENING_REPLACEMENTS
                    .chinese[1],
            ],
            `${label}.segments[5].textZh`,
        );
    const authoritativeItems =
        mud.sceneTransition
            ?.diagnostics
            ?.authoritativeItems;
    const itemIndex =
        findItemIndex(
            authoritativeItems,
        );
    if (itemIndex < 0) {
        throw new Error(
            `OPENING_DIAGNOSTIC_ITEM_MISSING: ${label}`,
        );
    }
    authoritativeItems[
        itemIndex
    ] =
        patchDiagnosticItem(
            authoritativeItems[
                itemIndex
            ],
        );
    next.display_text =
        replaceOpeningText(
            next.display_text,
            'chinese',
            `${label}.display_text`,
        );
    return next;
}

function repairOpeningMessage(
    message,
) {
    const next =
        structuredClone(message);
    if (
        next.name !== 'Scene' ||
        next.is_user === true
    ) {
        throw new Error(
            'OPENING_MESSAGE_SHAPE_MISMATCH',
        );
    }
    next.mes =
        replaceOpeningText(
            next.mes,
            'english',
            'message212.mes',
        );
    next.extra =
        patchOpeningExtra(
            next.extra,
            'message212.extra',
        );
    if (
        !Array.isArray(
            next.swipes,
        ) ||
        next.swipes.length !== 1 ||
        next.swipe_id !== 0
    ) {
        throw new Error(
            'OPENING_SWIPE_SHAPE_MISMATCH',
        );
    }
    next.swipes[0] =
        replaceOpeningText(
            next.swipes[0],
            'english',
            'message212.swipes[0]',
        );
    if (
        !Array.isArray(
            next.swipe_info,
        ) ||
        next.swipe_info.length !==
            1
    ) {
        throw new Error(
            'OPENING_SWIPE_INFO_SHAPE_MISMATCH',
        );
    }
    next.swipe_info[0].extra =
        patchOpeningExtra(
            next.swipe_info[0]
                .extra,
            'message212.swipe_info[0].extra',
        );
    assert.equal(
        next.mes,
        next.swipes[0],
        'message 212 swipe text diverged from mes.',
    );
    assert.deepEqual(
        next.extra,
        next.swipe_info[0]
            .extra,
        'message 212 swipe extra diverged from extra.',
    );
    return next;
}

function normalizeAbsentItem(
    item,
    index,
    clock,
) {
    const normalized =
        normalizeItem(
            {
                ...item,
                holderId: '',
                location: {
                    mapId: '',
                    roomId: '',
                    placement: '',
                },
                mapId: '',
                roomId: '',
                state:
                    'destroyed',
                status:
                    'destroyed',
                physicalForm:
                    'absent',
                isEquipped:
                    false,
            },
            index,
            {
                clock,
            },
        );
    assert.deepEqual(
        validateItem(normalized),
        [],
        'Repaired Item violates Item V2/V3 invariants.',
    );
    return normalized;
}

function normalizeAbsentSceneItem(
    item,
) {
    return {
        ...item,
        version: 3,
        custody: 'stored',
        holderId: '',
        mapId: '',
        roomId: '',
        status: 'destroyed',
        state: 'destroyed',
        physicalForm: 'absent',
        isEquipped: false,
    };
}

function repairItemCopies(
    state,
) {
    const next =
        structuredClone(state);
    const rootItemIndex =
        findItemIndex(
            next.items,
        );
    const sceneItemIndex =
        findItemIndex(
            next.scene
                ?.itemStates,
        );
    const retryItemIndex =
        findItemIndex(
            next.turnRetry
                ?.baseState
                ?.items,
        );
    const retrySceneItemIndex =
        findItemIndex(
            next.turnRetry
                ?.baseState
                ?.scene
                ?.itemStates,
        );
    if (
        [
            rootItemIndex,
            sceneItemIndex,
            retryItemIndex,
            retrySceneItemIndex,
        ].some(index =>
            index < 0)
    ) {
        throw new Error(
            'TARGET_ITEM_COPY_MISSING',
        );
    }
    next.items[
        rootItemIndex
    ] =
        normalizeAbsentItem(
            next.items[
                rootItemIndex
            ],
            rootItemIndex,
            next.clock,
        );
    next.scene.itemStates[
        sceneItemIndex
    ] =
        normalizeAbsentSceneItem(
            next.scene
                .itemStates[
                    sceneItemIndex
                ],
        );
    const retryState =
        next.turnRetry
            .baseState;
    retryState.items[
        retryItemIndex
    ] =
        normalizeAbsentItem(
            retryState.items[
                retryItemIndex
            ],
            retryItemIndex,
            retryState.clock,
        );
    retryState.scene
        .itemStates[
            retrySceneItemIndex
        ] =
        normalizeAbsentSceneItem(
            retryState.scene
                .itemStates[
                    retrySceneItemIndex
                ],
        );
    return next;
}

function verifyDestructionEvidence(
    state,
    chat,
) {
    const event =
        (
            state.eventKnowledge ||
            []
        ).find(entry =>
            entry?.eventId ===
            TARGET_EVIDENCE_EVENT_ID);
    if (!event) {
        throw new Error(
            'DESTRUCTION_EVIDENCE_EVENT_MISSING',
        );
    }
    const sourceMessageIds =
        event.sourceMessageIds ||
        [];
    const evidence = [];
    for (const messageId of
        sourceMessageIds) {
        const message =
            chat[messageId];
        const mud =
            message?.extra
                ?.hogwartsMud;
        for (const segment of
            mud?.segments || []) {
            const text =
                String(
                    segment.textEn ||
                    '',
                );
            if (
                inferDestroyedPhysicalForm(
                    text,
                ) === 'absent'
            ) {
                evidence.push({
                    messageId,
                    physicalLine:
                        messageId + 2,
                    text,
                });
            }
        }
        for (const operation of
            mud?.turnTransaction
                ?.itemOperations ||
            []) {
            if (
                operation.id ===
                    TARGET_ITEM_ID &&
                inferDestroyedPhysicalForm(
                    operation
                        .evidenceText,
                ) === 'absent'
            ) {
                evidence.push({
                    messageId,
                    physicalLine:
                        messageId + 2,
                    text:
                        operation
                            .evidenceText,
                });
            }
        }
    }
    if (!evidence.length) {
        throw new Error(
            'DESTRUCTION_EVIDENCE_NOT_ABSENT',
        );
    }
    return {
        eventId:
            event.eventId,
        sourceMessageIds:
            [...sourceMessageIds],
        inferredPhysicalForm:
            'absent',
        evidence:
            evidence.slice(0, 4),
    };
}

function messageSegments(
    message,
) {
    return (
        message?.extra
            ?.hogwartsMud
            ?.segments ||
        []
    )
        .map(segment => {
            const text =
                String(
                    segment.textEn ||
                    '',
                ).trim();
            if (!text) return '';
            return segment.type ===
                'dialogue'
                ? `${
                    segment.actorId ||
                    'actor'
                }: ${text}`
                : text;
        })
        .filter(Boolean);
}

function projectTranscript(
    chat,
    messageIds,
    {
        currentItemAbsent =
        false,
    } = {},
) {
    const lines = [];
    const conflicts = [];
    for (const messageId of
        messageIds) {
        const message =
            chat[messageId];
        if (!message) continue;
        if (message.is_user) {
            const text =
                String(
                    message.mes ||
                    '',
                );
            const attempted =
                currentItemAbsent &&
                text.includes(
                    TARGET_ITEM_ID,
                ) &&
                PLAYER_ATTEMPT_PATTERN
                    .test(text);
            lines.push(
                `${
                    attempted
                        ? 'Player attempted action (not authoritative; current Item is physicalForm=absent)'
                        : 'Player'
                }: ${text}`,
            );
            continue;
        }
        for (const text of
            messageSegments(
                message,
            )) {
            if (
                currentItemAbsent &&
                CONTRADICTORY_REMAINS_PATTERN
                    .test(text)
            ) {
                conflicts.push({
                    messageId,
                    reason:
                        'current_item_physical_form_absent',
                });
                lines.push(
                    `[SUPERSEDED PHYSICAL CLAIM; current Item is physicalForm=absent] ${text}`,
                );
            } else {
                lines.push(text);
            }
        }
    }
    return {
        text:
            lines.join('\n\n'),
        conflicts,
    };
}

function knowledgeVisibility(
    scope = 'public',
    actorIds = [],
) {
    return {
        scope,
        actorIds,
    };
}

function addKnowledgeRecord(
    records,
    input,
    {
        chunk = false,
    } = {},
) {
    const created =
        chunk
            ? createChunkedKnowledgeRecords(
                input,
            )
            : [
                createKnowledgeRecordV2(
                    input,
                ),
            ];
    records.push(...created);
}

export function buildArchiveKnowledgeRecords(
    state,
    chat,
) {
    const records = [];
    const timelineEpoch =
        String(
            state.timelineEpoch,
        );
    const stateRevision =
        Number(
            state.stateRevision,
        );
    const base = {
        timelineEpoch,
        stateRevision,
        effectiveClock:
            state.clock || '',
    };
    const quill =
        findItem(state.items);
    if (!quill) {
        throw new Error(
            'TARGET_ITEM_MISSING_FOR_KNOWLEDGE',
        );
    }
    addKnowledgeRecord(
        records,
        {
            ...base,
            category: 'events',
            recordId:
                CURRENT_ITEM_RECORD_ID,
            nodeType: 'fact',
            title:
                'Current material state: Harry\'s Spare Brass Quill',
            text: [
                `Current authoritative Item: ${TARGET_ITEM_ID}.`,
                'state=destroyed.',
                'physicalForm=absent.',
                'holderId is empty.',
                'No current physical location or interactable remains exist.',
                'Historical claims that Tina holds or can place remnants are superseded.',
            ].join(' '),
            entityIds: [
                TARGET_ITEM_ID,
                quill.ownerId,
            ],
            tags: [
                'current',
                'item',
                'physical_absent',
                'authoritative_state',
            ],
            sourceRefs: [
                {
                    type: 'state',
                    id:
                        `item:${TARGET_ITEM_ID}`,
                    revision:
                        stateRevision,
                },
                {
                    type: 'event',
                    id:
                        quill.sourceEventId,
                },
            ],
            visibility:
                knowledgeVisibility(),
            sceneId:
                state.scene?.id ||
                '',
            data: {
                itemId:
                    TARGET_ITEM_ID,
                state:
                    quill.state,
                physicalForm:
                    quill.physicalForm,
                holderId:
                    quill.holderId,
                location:
                    quill.location,
                authority:
                    'current_state',
            },
        },
    );

    const currentActors =
        new Map(
            (
                state.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
    for (const actor of
        state.actorLibrary || []) {
        const current =
            currentActors.get(
                actor.id,
            );
        const sharedMemories =
            actor.sharedMemories ||
            actor.memories ||
            {};
        const memoryLines =
            Object.entries(
                sharedMemories,
            )
                .flatMap(
                    ([
                        tier,
                        entries,
                    ]) =>
                        (
                            Array.isArray(
                                entries,
                            )
                                ? entries
                                : []
                        ).map(memory =>
                            `${
                                tier
                            }: ${
                                memory
                                    ?.summaryEn ||
                                memory
                                    ?.summary ||
                                ''
                            }`),
                )
                .filter(Boolean);
        addKnowledgeRecord(
            records,
            {
                ...base,
                category:
                    'actors',
                recordId:
                    `actors_${actor.id}`,
                nodeType:
                    'actor',
                title:
                    actor.nameEn ||
                    actor.name ||
                    actor.id,
                text: [
                    `Actor: ${
                        actor.nameEn ||
                        actor.name ||
                        actor.id
                    }.`,
                    `Role: ${
                        actor.roleEn ||
                        actor.role ||
                        ''
                    }.`,
                    `Public background: ${
                        actor.publicBackgroundEn ||
                        actor.publicBackground ||
                        ''
                    }.`,
                    `Current room: ${
                        current?.roomId ||
                        ''
                    }.`,
                    `Current activity: ${
                        current?.currentActivityEn ||
                        current?.currentActivity ||
                        ''
                    }.`,
                    ...memoryLines,
                ].join('\n'),
                entityIds: [
                    actor.id,
                    current?.roomId,
                ].filter(Boolean),
                tags: [
                    'actor',
                    current
                        ? 'current'
                        : 'offstage',
                ],
                sourceRefs: [{
                    type: 'state',
                    id:
                        `actor:${actor.id}`,
                    revision:
                        stateRevision,
                }],
                visibility:
                    knowledgeVisibility(),
                sceneId:
                    current?.present
                        ? state.scene
                            ?.id ||
                            ''
                        : '',
                data: {
                    actorId:
                        actor.id,
                    currentState:
                        current
                            ? {
                                mapId:
                                    current.mapId,
                                roomId:
                                    current.roomId,
                                currentActivityEn:
                                    current.currentActivityEn ||
                                    '',
                            }
                            : null,
                },
            },
        );
    }

    const archivedOwners =
        new Set();
    for (const scene of
        state.sceneArchive || []) {
        for (const messageId of
            scene.messageIds ||
            []) {
            archivedOwners.add(
                messageId,
            );
        }
        const messageIds =
            (
                scene.messageIds ||
                []
            ).filter(
                messageId =>
                    Number.isSafeInteger(
                        messageId,
                    ),
            );
        const transcript =
            projectTranscript(
                chat,
                messageIds,
                {
                    currentItemAbsent:
                        quill
                            .physicalForm ===
                        'absent',
                },
            );
        const hasConflict =
            transcript.conflicts
                .length > 0;
        addKnowledgeRecord(
            records,
            {
                ...base,
                category:
                    'scenes',
                recordId:
                    `scenes_${scene.id}`,
                nodeType:
                    'scene',
                title:
                    scene.nameEn ||
                    scene.name ||
                    scene.id,
                text: [
                    `Historical Scene: ${
                        scene.nameEn ||
                        scene.name ||
                        scene.id
                    }.`,
                    `Summary: ${
                        scene.summaryEn ||
                        scene.summary ||
                        ''
                    }.`,
                    hasConflict
                        ? 'Authority notice: this Scene contains a superseded physical claim; current Item State controls.'
                        : '',
                    `Transcript:\n${
                        transcript.text
                    }`,
                ]
                    .filter(Boolean)
                    .join('\n'),
                entityIds: [
                    scene.id,
                    scene.roomId,
                    ...(
                        scene.actorIds ||
                        []
                    ),
                ].filter(Boolean),
                tags: [
                    'scene',
                    'closed',
                    ...(hasConflict
                        ? [
                            'superseded',
                            'current_state_conflict',
                        ]
                        : []),
                ],
                sourceRefs:
                    messageIds.map(
                        messageId => ({
                            type:
                                'message',
                            id:
                                String(
                                    messageId,
                                ),
                        }),
                    ),
                visibility:
                    knowledgeVisibility(
                        'witnesses',
                        [
                            'player',
                            ...(
                                scene
                                    .activeInteractionActorIds ||
                                scene
                                    .actorIds ||
                                []
                            ),
                            ...(
                                scene
                                    .witnessActorIds ||
                                []
                            ),
                        ],
                    ),
                effectiveClock:
                    scene.startedClock ||
                    base
                        .effectiveClock,
                sceneId:
                    scene.id,
                data: {
                    messageIds,
                    authorityStatus:
                        hasConflict
                            ? 'superseded_physical_claim'
                            : 'historical',
                    suppressedConflicts:
                        transcript
                            .conflicts,
                },
            },
            {
                chunk: true,
            },
        );
    }

    if (state.scene) {
        const start =
            Math.max(
                0,
                Number(
                    state.scene
                        .startedMessageId,
                ) || 0,
            );
        const messageIds =
            chat.map(
                (
                    _message,
                    messageId,
                ) => messageId,
            )
                .filter(
                    messageId =>
                        messageId >=
                            start &&
                        !archivedOwners
                            .has(
                                messageId,
                            ),
                );
        const transcript =
            projectTranscript(
                chat,
                messageIds,
                {
                    currentItemAbsent:
                        quill
                            .physicalForm ===
                        'absent',
                },
            );
        addKnowledgeRecord(
            records,
            {
                ...base,
                category:
                    'scenes',
                recordId:
                    `scenes_${state.scene.id}`,
                nodeType:
                    'scene',
                title:
                    state.scene
                        .nameEn ||
                    state.scene
                        .name ||
                    state.scene.id,
                text: [
                    `Current Scene: ${
                        state.scene
                            .nameEn ||
                        state.scene
                            .name ||
                        state.scene.id
                    }.`,
                    `Current authority: ${TARGET_ITEM_ID} is destroyed with physicalForm=absent.`,
                    `Transcript:\n${
                        transcript.text
                    }`,
                ].join('\n'),
                entityIds: [
                    state.scene.id,
                    state.scene.roomId,
                    TARGET_ITEM_ID,
                ],
                tags: [
                    'scene',
                    'current',
                    'current_state_precedence',
                ],
                sourceRefs:
                    messageIds.map(
                        messageId => ({
                            type:
                                'message',
                            id:
                                String(
                                    messageId,
                                ),
                        }),
                    ),
                visibility:
                    knowledgeVisibility(
                        'witnesses',
                        [
                            'player',
                            ...(
                                state
                                    .activeInteractionActorIds ||
                                []
                            ),
                            ...(
                                state
                                    .localPresence
                                    ?.occupantActorIds ||
                                []
                            ),
                        ],
                    ),
                sceneId:
                    state.scene.id,
                data: {
                    messageIds,
                    authorityStatus:
                        'current',
                    attemptedActionMessageIds:
                        messageIds.filter(
                            messageId => {
                                const message =
                                    chat[
                                        messageId
                                    ];
                                return Boolean(
                                    message
                                        ?.is_user &&
                                    String(
                                        message
                                            .mes ||
                                        '',
                                    ).includes(
                                        TARGET_ITEM_ID,
                                    ),
                                );
                            },
                        ),
                },
            },
            {
                chunk: true,
            },
        );
    }

    for (const event of
        state.eventKnowledge || []) {
        const messageIds =
            event
                .sourceMessageIds ||
            [];
        const transcript =
            projectTranscript(
                chat,
                messageIds,
                {
                    currentItemAbsent:
                        quill
                            .physicalForm ===
                        'absent',
                },
            );
        addKnowledgeRecord(
            records,
            {
                ...base,
                category:
                    'events',
                recordId:
                    `events_${event.eventId}`,
                nodeType:
                    'fact',
                title:
                    event.summaryEn ||
                    event.eventId,
                text: [
                    `Committed Event: ${
                        event.summaryEn ||
                        event.eventId
                    }.`,
                    `Participants: ${
                        (
                            event
                                .participantActorIds ||
                            []
                        ).join(', ')
                    }.`,
                    `Witnesses: ${
                        (
                            event
                                .witnessActorIds ||
                            []
                        ).join(', ')
                    }.`,
                    `Transcript:\n${
                        transcript.text
                    }`,
                ].join('\n'),
                entityIds: [
                    event.sceneId,
                    ...(
                        event
                            .participantActorIds ||
                        []
                    ),
                    ...(
                        event
                            .witnessActorIds ||
                        []
                    ),
                    ...(
                        event.eventId ===
                            TARGET_EVIDENCE_EVENT_ID
                            ? [
                                TARGET_ITEM_ID,
                            ]
                            : []
                    ),
                ].filter(Boolean),
                tags: [
                    'event',
                    event.sceneId,
                    event.eventId ===
                        TARGET_EVIDENCE_EVENT_ID
                        ? 'destruction_evidence'
                        : '',
                ].filter(Boolean),
                sourceRefs: [
                    {
                        type: 'event',
                        id:
                            event.eventId,
                    },
                    ...messageIds.map(
                        messageId => ({
                            type:
                                'message',
                            id:
                                String(
                                    messageId,
                                ),
                        }),
                    ),
                ],
                visibility:
                    knowledgeVisibility(
                        (
                            event
                                .witnessActorIds ||
                            []
                        ).length
                            ? 'witnesses'
                            : 'public',
                        [
                            'player',
                            ...(
                                event
                                    .participantActorIds ||
                                []
                            ),
                            ...(
                                event
                                    .witnessActorIds ||
                                []
                            ),
                        ],
                    ),
                sceneId:
                    event.sceneId ||
                    '',
                data: {
                    eventId:
                        event.eventId,
                    sourceMessageIds:
                        messageIds,
                },
            },
            {
                chunk: true,
            },
        );
    }

    const discoveredClues =
        new Map(
            (
                state.clues ||
                []
            ).map(clue => [
                clue.id,
                clue,
            ]),
        );
    for (const arc of
        state.storyArcs || []) {
        for (const clue of
            arc.cluePlan ||
            []) {
            const discovered =
                discoveredClues.get(
                    clue.id,
                );
            addKnowledgeRecord(
                records,
                {
                    ...base,
                    category:
                        'clues',
                    recordId:
                        `clues_${clue.id}`,
                    nodeType:
                        'clue',
                    title:
                        clue.labelEn ||
                        clue.id,
                    text: discovered
                        ? [
                            `Discovered clue: ${
                                clue
                                    .labelEn ||
                                clue.id
                            }.`,
                            `Discovery: ${
                                clue
                                    .playerFacingDiscoveryEn ||
                                ''
                            }.`,
                        ].join('\n')
                        : [
                            `Locked clue: ${
                                clue
                                    .labelEn ||
                                clue.id
                            }.`,
                            `Hidden fact: ${
                                clue
                                    .hiddenFactEn ||
                                ''
                            }.`,
                        ].join('\n'),
                    entityIds: [
                        clue.id,
                        ...(
                            clue
                                .sourceActorIds ||
                            []
                        ),
                        ...(
                            clue
                                .sourceLocationIds ||
                            []
                        ),
                        clue.sourceItemId,
                    ].filter(Boolean),
                    tags: [
                        'clue',
                        discovered
                            ? 'discovered'
                            : 'locked',
                    ],
                    sourceRefs: [{
                        type: 'state',
                        id:
                            `clue:${clue.id}`,
                        revision:
                            stateRevision,
                    }],
                    visibility:
                        knowledgeVisibility(
                            discovered
                                ? 'public'
                                : 'locked',
                            discovered
                                ? ['player']
                                : [],
                        ),
                    sceneId: '',
                    data: {
                        clueId:
                            clue.id,
                        discovered:
                            Boolean(
                                discovered,
                            ),
                    },
                },
            );
        }
    }

    const memorySynapse =
        state.memorySynapse ||
        {};
    for (const appraisal of
        memorySynapse.appraisals ||
        state.appraisals ||
        []) {
        addKnowledgeRecord(
            records,
            {
                ...base,
                category:
                    'appraisals',
                recordId:
                    `appraisals_${appraisal.id}`,
                nodeType:
                    'appraisal',
                title:
                    appraisal.summaryEn ||
                    appraisal.id,
                text: [
                    `Observer: ${
                        appraisal.observerId
                    }.`,
                    `Target: ${
                        appraisal.targetId
                    }.`,
                    `Interpretation: ${
                        appraisal.summaryEn
                    }.`,
                    `Confidence: ${
                        appraisal.confidence
                    }.`,
                ].join('\n'),
                entityIds: [
                    appraisal
                        .observerId,
                    appraisal.targetId,
                ],
                tags: [
                    'appraisal',
                    appraisal.status,
                ].filter(Boolean),
                sourceRefs: [
                    ...(
                        appraisal
                            .sourceEventIds ||
                        []
                    ).map(id => ({
                        type: 'event',
                        id,
                    })),
                    ...(
                        appraisal
                            .sourceMessageIds ||
                        []
                    ).map(id => ({
                        type:
                            'message',
                        id:
                            String(id),
                    })),
                ],
                visibility:
                    knowledgeVisibility(
                        'actor',
                        [
                            appraisal
                                .observerId,
                        ],
                    ),
                sceneId:
                    appraisal.sceneId ||
                    '',
                data: {
                    appraisalId:
                        appraisal.id,
                },
            },
        );
    }
    for (const schema of
        memorySynapse.personSchemas ||
        state.personSchemas ||
        []) {
        addKnowledgeRecord(
            records,
            {
                ...base,
                category:
                    'schemas',
                recordId:
                    `schemas_${schema.id}`,
                nodeType:
                    'schema',
                title:
                    schema.labelEn ||
                    schema.id,
                text: [
                    `Observer: ${
                        schema.observerId
                    }.`,
                    `Target: ${
                        schema.targetId
                    }.`,
                    `Pattern: ${
                        schema.labelEn
                    }.`,
                    `Expectation: ${
                        schema.expectationEn
                    }.`,
                    `Confidence: ${
                        schema.confidence
                    }.`,
                ].join('\n'),
                entityIds: [
                    schema.observerId,
                    schema.targetId,
                ],
                tags: [
                    'schema',
                    schema.status,
                ].filter(Boolean),
                sourceRefs: [
                    ...(
                        schema
                            .supportAppraisalIds ||
                        []
                    ).map(id => ({
                        type:
                            'appraisal',
                        id,
                    })),
                    ...(
                        schema
                            .counterAppraisalIds ||
                        []
                    ).map(id => ({
                        type:
                            'appraisal',
                        id,
                    })),
                ],
                visibility:
                    knowledgeVisibility(
                        'actor',
                        [
                            schema
                                .observerId,
                        ],
                    ),
                sceneId: '',
                data: {
                    schemaId:
                        schema.id,
                },
            },
        );
    }
    return records.sort(
        (left, right) =>
            left.recordId
                .localeCompare(
                    right.recordId,
                ),
    );
}

function countKnowledgeCategories(
    records,
) {
    return Object.fromEntries(
        [
            'actors',
            'scenes',
            'events',
            'clues',
            'appraisals',
            'schemas',
        ].map(category => [
            category,
            records.filter(record =>
                record.category ===
                category)
                .length,
        ]),
    );
}

function qdrantDiagnostics(
    qdrantUrl,
) {
    const configured =
        Boolean(
            String(
                qdrantUrl ||
                '',
            ).trim(),
        );
    return {
        backend: 'json',
        preferredBackend:
            'qdrant',
        degraded: true,
        fallback:
            'exact-only',
        qdrant: {
            configured,
            available: false,
            status: configured
                ? 'not_used_zero_model_call_contract'
                : 'not_configured',
        },
        errors: configured
            ? [
                'Qdrant rebuild requires a configured zero-model embedding source; exact JSON projection remains available.',
            ]
            : [],
    };
}

function updateKnowledgeMetadata(
    state,
    records,
    {
        committedAt,
        qdrantUrl,
    },
) {
    const next =
        structuredClone(state);
    const diagnostics =
        qdrantDiagnostics(
            qdrantUrl,
        );
    next.knowledgeBase = {
        ...(
            next.knowledgeBase ||
            {}
        ),
        timelineId:
            next.knowledgeBase
                ?.timelineId ||
            normalizeKnowledgeId(
                next.timelineEpoch,
            ),
        vectorSource:
            'json-exact',
        categories:
            countKnowledgeCategories(
                records,
            ),
        lastSyncedAt:
            committedAt,
        vectorStatus:
            'exact-only',
        vectorError: '',
        recordHashes:
            Object.fromEntries(
                records.map(record => [
                    record.recordId,
                    record
                        .contentChecksum,
                ]),
            ),
        lastError: '',
        version: 2,
        projectorVersion: 2,
        diagnostics,
    };
    return next;
}

function collectDiffs(
    before,
    after,
    currentPath = '',
    result = [],
) {
    if (
        result.length >=
        MAX_BOUNDED_DIFFS
    ) {
        return result;
    }
    if (Object.is(before, after)) {
        return result;
    }
    if (
        before === null ||
        after === null ||
        before === undefined ||
        after === undefined ||
        typeof before !==
            'object' ||
        typeof after !==
            'object'
    ) {
        result.push({
            path: currentPath,
            before:
                boundedText(before),
            after:
                boundedText(after),
        });
        return result;
    }
    if (
        Array.isArray(before) ||
        Array.isArray(after)
    ) {
        if (
            !Array.isArray(before) ||
            !Array.isArray(after)
        ) {
            result.push({
                path: currentPath,
                before:
                    boundedText(
                        before,
                    ),
                after:
                    boundedText(
                        after,
                    ),
            });
            return result;
        }
        const length =
            Math.max(
                before.length,
                after.length,
            );
        for (
            let index = 0;
            index < length &&
            result.length <
                MAX_BOUNDED_DIFFS;
            index += 1
        ) {
            collectDiffs(
                before[index],
                after[index],
                `${currentPath}[${index}]`,
                result,
            );
        }
        return result;
    }
    const keys =
        [
            ...new Set([
                ...Object.keys(
                    before,
                ),
                ...Object.keys(
                    after,
                ),
            ]),
        ].sort();
    for (const key of keys) {
        collectDiffs(
            before[key],
            after[key],
            currentPath
                ? `${currentPath}.${key}`
                : key,
            result,
        );
        if (
            result.length >=
            MAX_BOUNDED_DIFFS
        ) {
            break;
        }
    }
    return result;
}

function itemIsAbsent(
    item,
) {
    return Boolean(
        item &&
        item.state ===
            'destroyed' &&
        item.physicalForm ===
            'absent' &&
        item.holderId === '' &&
        item.isEquipped ===
            false &&
        item.custody ===
            'stored' &&
        item.status ===
            'destroyed' &&
        item.mapId === '' &&
        item.roomId === '' &&
        item.location
            ?.mapId === '' &&
        item.location
            ?.roomId === '' &&
        item.location
            ?.placement === '',
    );
}

function sceneItemIsAbsent(
    item,
) {
    return Boolean(
        item &&
        item.state ===
            'destroyed' &&
        item.physicalForm ===
            'absent' &&
        item.holderId === '' &&
        item.isEquipped ===
            false &&
        item.custody ===
            'stored' &&
        item.status ===
            'destroyed' &&
        item.mapId === '' &&
        item.roomId === '',
    );
}

function openingIsRepaired(
    message,
) {
    const serialized =
        JSON.stringify({
            mes:
                message?.mes,
            extra:
                message?.extra,
            swipes:
                message?.swipes,
            swipeInfo:
                message?.swipe_info,
        });
    return (
        OPENING_REPLACEMENTS
            .english
            .every(replacement =>
                serialized.includes(
                    replacement.after,
                ) &&
                !serialized.includes(
                    replacement.before,
                )) &&
        OPENING_REPLACEMENTS
            .chinese
            .every(replacement =>
                serialized.includes(
                    replacement.after,
                ) &&
                !serialized.includes(
                    replacement.before,
                ))
    );
}

function repairAlreadyApplied(
    parsed,
    expectedGuard,
) {
    const state =
        getState(parsed.header);
    const rootItem =
        findItem(state.items);
    const sceneItem =
        findItem(
            state.scene
                ?.itemStates,
        );
    const retryItem =
        findItem(
            state.turnRetry
                ?.baseState
                ?.items,
        );
    const retrySceneItem =
        findItem(
            state.turnRetry
                ?.baseState
                ?.scene
                ?.itemStates,
        );
    const opening =
        messageAtLine(
            parsed,
            212,
        ).message;
    const untouchedMessages =
        expectedGuard.messages
            .filter(entry =>
                [
                    213,
                    214,
                ].includes(
                    entry.lineNumber,
                ))
            .every(entry =>
                sha256(
                    messageAtLine(
                        parsed,
                        entry
                            .lineNumber,
                    ).raw,
                ) ===
                entry.sha256);
    const marker =
        (
            state.revisionHistory ||
            []
        ).find(entry =>
            entry?.source ===
                REPAIR_SOURCE &&
            entry?.revision >
                entry
                    ?.baseRevision);
    return Boolean(
        marker &&
        itemIsAbsent(
            rootItem,
        ) &&
        sceneItemIsAbsent(
            sceneItem,
        ) &&
        itemIsAbsent(
            retryItem,
        ) &&
        sceneItemIsAbsent(
            retrySceneItem,
        ) &&
        openingIsRepaired(
            opening,
        ) &&
        untouchedMessages &&
        ABSENT_RESPONSE_PATTERN
            .test(
                messageAtLine(
                    parsed,
                    214,
                ).raw,
            ),
    );
}

function domainHashes(
    state,
) {
    const identities = {
        npcIdentityVersion:
            state
                .npcIdentityVersion,
        npcIdentityObservationVersion:
            state
                .npcIdentityObservationVersion,
        actorLibrary:
            (
                state.actorLibrary ||
                []
            ).map(actor => ({
                id: actor.id,
                identity:
                    actor.identity,
            })),
        actors:
            (
                state.actors ||
                []
            ).map(actor => ({
                id: actor.id,
                identity:
                    actor.identity,
            })),
    };
    const memories = {
        memoryDirector:
            state.memoryDirector,
        memorySynapse:
            state.memorySynapse,
        eventKnowledge:
            state.eventKnowledge,
        actors:
            (
                state.actorLibrary ||
                []
            ).map(actor => ({
                id: actor.id,
                fields:
                    Object.fromEntries(
                        Object.entries(
                            actor,
                        ).filter(
                            ([
                                key,
                            ]) =>
                                /memory|knowledge/iu
                                    .test(
                                        key,
                                    ),
                        ),
                    ),
            })),
    };
    const otherItems =
        (
            state.items ||
            []
        ).filter(item =>
            item?.id !==
                TARGET_ITEM_ID);
    return {
        social:
            sha256(
                JSON.stringify(
                    state.socialGraph,
                ),
            ),
        calendar:
            sha256(
                JSON.stringify(
                    state.calendar,
                ),
            ),
        identity:
            sha256(
                JSON.stringify(
                    identities,
                ),
            ),
        memories:
            sha256(
                JSON.stringify(
                    memories,
                ),
            ),
        otherItems:
            sha256(
                JSON.stringify(
                    otherItems,
                ),
            ),
    };
}

function preservationProjection(
    state,
) {
    const next =
        structuredClone(state);
    const maskTargetItem =
        items =>
            (
                items ||
                []
            ).map(item =>
                item?.id ===
                    TARGET_ITEM_ID
                    ? {
                        id:
                            TARGET_ITEM_ID,
                        __task7Target:
                            true,
                    }
                    : item);
    next.items =
        maskTargetItem(
            next.items,
        );
    if (next.scene) {
        next.scene
            .itemStates =
            maskTargetItem(
                next.scene
                    .itemStates,
            );
    }
    if (
        next.turnRetry
            ?.baseState
    ) {
        next.turnRetry
            .baseState
            .items =
            maskTargetItem(
                next.turnRetry
                    .baseState
                    .items,
            );
        if (
            next.turnRetry
                .baseState
                .scene
        ) {
            next.turnRetry
                .baseState
                .scene
                .itemStates =
                maskTargetItem(
                    next
                        .turnRetry
                        .baseState
                        .scene
                        .itemStates,
                );
        }
    }
    delete next.stateRevision;
    delete next.revisionHistory;
    delete next.knowledgeBase;
    return next;
}

function assertPreserved(
    beforeParsed,
    afterParsed,
) {
    const beforeState =
        getState(
            beforeParsed.header,
        );
    const afterState =
        getState(
            afterParsed.header,
        );
    assert.deepEqual(
        preservationProjection(
            afterState,
        ),
        preservationProjection(
            beforeState,
        ),
        'Task 7 changed non-target State.',
    );
    for (
        let messageIndex = 0;
        messageIndex <
        beforeParsed.chat.length;
        messageIndex += 1
    ) {
        if (messageIndex === 210) {
            continue;
        }
        assert.equal(
            afterParsed.lines[
                messageIndex + 1
            ],
            beforeParsed.lines[
                messageIndex + 1
            ],
            `Task 7 changed non-target message ${messageIndex}.`,
        );
    }
    assert.deepEqual(
        domainHashes(
            afterState,
        ),
        domainHashes(
            beforeState,
        ),
        'Task 7 changed a protected domain.',
    );
}

function createRepairPlan(
    parsed,
    {
        expectedGuard,
        committedAt,
        qdrantUrl,
    },
) {
    const state =
        getState(parsed.header);
    const evidence =
        verifyDestructionEvidence(
            state,
            parsed.chat,
        );
    const message212 =
        messageAtLine(
            parsed,
            212,
        );
    const message213 =
        messageAtLine(
            parsed,
            213,
        );
    const message214 =
        messageAtLine(
            parsed,
            214,
        );
    if (
        !CONTRADICTORY_REMAINS_PATTERN
            .test(message212.raw) ||
        !message213.raw.includes(
            TARGET_ITEM_ID,
        ) ||
        !PLAYER_ATTEMPT_PATTERN
            .test(message213.raw) ||
        !ABSENT_RESPONSE_PATTERN
            .test(message214.raw)
    ) {
        throw new Error(
            'TARGET_CONTRADICTION_NOT_REPRODUCED',
        );
    }
    assertRoundTripJson(
        parsed.lines[0],
        'metadata line',
    );
    assertRoundTripJson(
        message212.raw,
        'message 212',
    );
    const repairedOpening =
        repairOpeningMessage(
            message212.message,
        );
    let candidate =
        repairItemCopies(
            state,
        );
    const predictedRevision =
        Number(
            state.stateRevision,
        ) + 1;
    candidate.stateRevision =
        predictedRevision;
    const nextChat =
        [...parsed.chat];
    nextChat[210] =
        repairedOpening;
    let records =
        buildArchiveKnowledgeRecords(
            candidate,
            nextChat,
        );
    candidate =
        updateKnowledgeMetadata(
            candidate,
            records,
            {
                committedAt,
                qdrantUrl,
            },
        );
    const commit =
        prepareSaveRevisionCommit({
            currentState:
                state,
            nextState:
                candidate,
            source:
                REPAIR_SOURCE,
            committedAt,
            entryId:
                `revision_${
                    state.timelineEpoch
                }_${
                    predictedRevision
                }`,
            changedDomains: [
                'item',
                'knowledge',
                'message',
                'migration',
                'scene',
                'world',
            ],
        });
    if (
        !commit.changed ||
        commit.state
            .stateRevision !==
            predictedRevision
    ) {
        throw new Error(
            'REVISION_COMMIT_FAILED',
        );
    }
    records =
        buildArchiveKnowledgeRecords(
            commit.state,
            nextChat,
        );
    const finalState =
        updateKnowledgeMetadata(
            commit.state,
            records,
            {
                committedAt,
                qdrantUrl,
            },
        );
    const nextHeader =
        structuredClone(
            parsed.header,
        );
    nextHeader
        .chat_metadata
        .hogwartsMud =
        finalState;
    const lines =
        [...parsed.lines];
    lines[0] =
        JSON.stringify(
            nextHeader,
        );
    lines[
        message212
            .lineNumber - 1
    ] =
        JSON.stringify(
            repairedOpening,
        );
    const output =
        encodeArchive(
            lines,
            parsed
                .hasTrailingNewline,
        );
    const afterParsed =
        parseArchive(output);
    assertPreserved(
        parsed,
        afterParsed,
    );
    assert.equal(
        afterParsed.lines[212],
        parsed.lines[212],
        'message 213 changed.',
    );
    assert.equal(
        afterParsed.lines[213],
        parsed.lines[213],
        'message 214 changed.',
    );
    return {
        status: 'ready',
        output,
        records,
        evidence,
        conflict: {
            reproduced: true,
            targetLines:
                TARGET_LINE_NUMBERS,
            openingClaimsRemains:
                true,
            playerAttemptsPlacement:
                true,
            responseSaysAbsent:
                true,
        },
        beforeHash:
            sha256(
                parsed.source,
            ),
        afterHash:
            sha256(output),
        beforeRevision:
            state.stateRevision,
        afterRevision:
            finalState
                .stateRevision,
        timelineEpoch:
            finalState
                .timelineEpoch,
        targetMessageFingerprintsBefore:
            expectedGuard
                .messages,
        targetMessageFingerprintsAfter:
            TARGET_LINE_NUMBERS
                .map(lineNumber => {
                    const entry =
                        messageAtLine(
                            afterParsed,
                            lineNumber,
                        );
                    return {
                        lineNumber,
                        messageIndex:
                            entry
                                .messageIndex,
                        sha256:
                            sha256(
                                entry.raw,
                            ),
                    };
                }),
        boundedDiff:
            collectDiffs(
                {
                    state,
                    message212:
                        message212
                            .message,
                },
                {
                    state:
                        finalState,
                    message212:
                        repairedOpening,
                },
            ),
        protectedDomainHashes:
            domainHashes(state),
        knowledge: {
            recordCount:
                records.length,
            categories:
                countKnowledgeCategories(
                    records,
                ),
            currentItemRecordId:
                CURRENT_ITEM_RECORD_ID,
            diagnostics:
                finalState
                    .knowledgeBase
                    .diagnostics,
        },
        revisionEntry:
            finalState
                .revisionHistory
                .at(-1),
    };
}

export function analyzeArchiveRepair(
    source,
    {
        expectedGuard =
        EXPECTED_TARGET_GUARD,
        committedAt =
        new Date()
            .toISOString(),
        qdrantUrl =
        process.env
            .HOGWARTS_QDRANT_URL ||
            '',
    } = {},
) {
    const parsed =
        parseArchive(source);
    if (
        repairAlreadyApplied(
            parsed,
            expectedGuard,
        )
    ) {
        const state =
            getState(
                parsed.header,
            );
        return {
            status: 'noop',
            reason:
                'task7_repair_already_applied',
            beforeHash:
                sha256(
                    parsed.source,
                ),
            afterHash:
                sha256(
                    parsed.source,
                ),
            timelineEpoch:
                state.timelineEpoch,
            beforeRevision:
                state.stateRevision,
            afterRevision:
                state.stateRevision,
            conflict: {
                reproduced: false,
                repaired: true,
                targetLines:
                    TARGET_LINE_NUMBERS,
            },
            protectedDomainHashes:
                domainHashes(state),
            modelCalls: {
                high: 0,
                medium: 0,
                low: 0,
                local: 0,
                total: 0,
            },
        };
    }
    const guard =
        inspectGuard(
            parsed,
            expectedGuard,
        );
    if (!guard.matched) {
        return {
            status: 'blocked',
            reason:
                'guard_mismatch',
            guard,
            beforeHash:
                sha256(
                    parsed.source,
                ),
            afterHash: null,
            modelCalls: {
                high: 0,
                medium: 0,
                low: 0,
                local: 0,
                total: 0,
            },
        };
    }
    return {
        ...createRepairPlan(
            parsed,
            {
                expectedGuard,
                committedAt,
                qdrantUrl,
            },
        ),
        guard,
        modelCalls: {
            high: 0,
            medium: 0,
            low: 0,
            local: 0,
            total: 0,
        },
    };
}

async function atomicWriteNewFile(
    target,
    data,
    mode = 0o600,
) {
    await mkdir(
        path.dirname(target),
        {
            recursive: true,
        },
    );
    const handle =
        await open(
            target,
            'wx',
            mode,
        );
    try {
        await handle.writeFile(
            data,
        );
        await handle.sync();
    } finally {
        await handle.close();
    }
}

async function atomicReplaceFile(
    target,
    data,
    expectedHash,
    mode,
) {
    const current =
        await readFile(target);
    if (
        sha256(current) !==
        expectedHash
    ) {
        throw new Error(
            `SOURCE_HASH_MISMATCH: ${target}`,
        );
    }
    const temporary =
        `${target}.task7-${
            process.pid
        }-${
            Date.now()
        }.tmp`;
    const handle =
        await open(
            temporary,
            'wx',
            mode,
        );
    try {
        await handle.writeFile(
            data,
        );
        await handle.sync();
    } finally {
        await handle.close();
    }
    try {
        await rename(
            temporary,
            target,
        );
    } catch (error) {
        await rm(
            temporary,
            {
                force: true,
            },
        );
        throw error;
    }
}

function runIdFromDate(date) {
    return date
        .toISOString()
        .replace(
            /[:.]/gu,
            '-',
        );
}

async function writeJsonNew(
    target,
    value,
) {
    await atomicWriteNewFile(
        target,
        Buffer.from(
            `${JSON.stringify(
                value,
                null,
                2,
            )}\n`,
        ),
    );
}

async function replaceJson(
    target,
    value,
) {
    const before =
        await readFile(target);
    await atomicReplaceFile(
        target,
        Buffer.from(
            `${JSON.stringify(
                value,
                null,
                2,
            )}\n`,
        ),
        sha256(before),
        0o600,
    );
}

async function createTimestampedBackup({
    file,
    source,
    sourceStat,
    plan,
    backupRoot,
    knowledgeTimelineRoot,
    now,
}) {
    const runDirectory =
        path.join(
            path.resolve(
                backupRoot,
            ),
            runIdFromDate(now),
        );
    const archiveDirectory =
        path.join(
            runDirectory,
            'archive',
        );
    const backupPath =
        path.join(
            archiveDirectory,
            path.basename(file),
        );
    await atomicWriteNewFile(
        backupPath,
        source,
        sourceStat.mode,
    );
    const backup =
        await readFile(
            backupPath,
        );
    if (
        sha256(backup) !==
        plan.beforeHash
    ) {
        throw new Error(
            'BACKUP_HASH_MISMATCH',
        );
    }
    let knowledgeBackupPath =
        '';
    try {
        const knowledgeStat =
            await stat(
                knowledgeTimelineRoot,
            );
        if (
            knowledgeStat
                .isDirectory()
        ) {
            knowledgeBackupPath =
                path.join(
                    runDirectory,
                    'knowledge-before',
                );
            await cp(
                knowledgeTimelineRoot,
                knowledgeBackupPath,
                {
                    recursive: true,
                    preserveTimestamps:
                        true,
                },
            );
        }
    } catch (error) {
        if (
            error?.code !==
            'ENOENT'
        ) {
            throw error;
        }
    }
    const manifestPath =
        path.join(
            runDirectory,
            'manifest.json',
        );
    const manifest = {
        version:
            TASK7_REPAIR_VERSION,
        repair:
            REPAIR_SOURCE,
        status: 'planned',
        createdAt:
            now.toISOString(),
        archive: {
            path:
                path.resolve(
                    file,
                ),
            backupPath,
            beforeSha256:
                plan.beforeHash,
            afterSha256:
                plan.afterHash,
            beforeSize:
                source.length,
            afterSize:
                plan.output.length,
            timelineEpoch:
                plan
                    .timelineEpoch,
            beforeRevision:
                plan
                    .beforeRevision,
            afterRevision:
                plan
                    .afterRevision,
            targetMessageFingerprintsBefore:
                plan
                    .targetMessageFingerprintsBefore,
            targetMessageFingerprintsAfter:
                plan
                    .targetMessageFingerprintsAfter,
        },
        knowledge: {
            timelineRoot:
                knowledgeTimelineRoot,
            backupPath:
                knowledgeBackupPath,
            recordCount:
                plan.knowledge
                    .recordCount,
        },
        modelCalls:
            plan.modelCalls,
    };
    await writeJsonNew(
        manifestPath,
        manifest,
    );
    return {
        runDirectory,
        backupPath,
        knowledgeBackupPath,
        manifestPath,
        manifest,
    };
}

async function restoreKnowledgeBackup(
    timelineRoot,
    backupPath,
) {
    await rm(
        timelineRoot,
        {
            recursive: true,
            force: true,
        },
    );
    if (backupPath) {
        await cp(
            backupPath,
            timelineRoot,
            {
                recursive: true,
                preserveTimestamps:
                    true,
            },
        );
    }
}

async function rebuildExactKnowledge({
    knowledgeRoot,
    timelineId,
    timelineEpoch,
    stateRevision,
    records,
}) {
    const backend =
        createJsonKnowledgeBackend({
            root:
                path.resolve(
                    knowledgeRoot,
                ),
        });
    const currentIndex =
        backend.readIndex(
            timelineId,
        );
    const index =
        currentIndex &&
        currentIndex.timelineEpoch ===
            timelineEpoch
            ? currentIndex
            : backend.createIndex(
                timelineId,
                timelineEpoch,
                stateRevision,
            );
    const result =
        backend.writeRecords({
            timelineId,
            timelineEpoch,
            stateRevision,
            records,
            replace: true,
            index,
        });
    const health =
        await backend.health({
            timelineId,
        });
    if (
        !health.ok ||
        health.stateRevision !==
            stateRevision ||
        health.recordCount !==
            records.length
    ) {
        throw new Error(
            'KNOWLEDGE_V2_REBUILD_VERIFICATION_FAILED',
        );
    }
    const query =
        await backend.query({
            timelineId,
            query:
                `${TARGET_ITEM_ID} physicalForm absent`,
            entityIds: [
                TARGET_ITEM_ID,
            ],
            limit: 8,
            filters: {
                timelineEpoch,
                stateRevision,
                audience: {
                    actorIds: [
                        'player',
                    ],
                },
                nodeTypes: [
                    'fact',
                    'scene',
                ],
                clock:
                    '9999-12-31 · 23:59',
            },
        });
    const currentRecord =
        query.records.find(
            record =>
                record.recordId ===
                CURRENT_ITEM_RECORD_ID,
        );
    if (
        !currentRecord ||
        currentRecord.data
            ?.physicalForm !==
            'absent'
    ) {
        throw new Error(
            'KNOWLEDGE_CURRENT_ITEM_RECORD_MISSING',
        );
    }
    if (
        query.records.some(
            record =>
                !record.tags
                    ?.includes(
                        'superseded',
                    ) &&
                CONTRADICTORY_REMAINS_PATTERN
                    .test(
                        record.text,
                    ),
        )
    ) {
        throw new Error(
            'KNOWLEDGE_UNSUPPRESSED_QUILL_CONFLICT',
        );
    }
    const manifestPath =
        backend.indexPath(
            timelineId,
        );
    const manifest =
        await readFile(
            manifestPath,
        );
    return {
        backend: 'json',
        exactOnly: true,
        root:
            result.root,
        manifestPath,
        manifestSha256:
            sha256(manifest),
        recordCount:
            health.recordCount,
        selectedRecordIds:
            query.records.map(
                record =>
                    record.recordId,
            ),
        currentItemRecordId:
            currentRecord
                .recordId,
    };
}

async function verifyExistingKnowledge(
    knowledgeRoot,
    state,
) {
    const timelineId =
        state.knowledgeBase
            ?.timelineId;
    if (!timelineId) {
        return {
            valid: false,
            reason:
                'timeline_id_missing',
        };
    }
    const backend =
        createJsonKnowledgeBackend({
            root:
                path.resolve(
                    knowledgeRoot,
                ),
        });
    const health =
        await backend.health({
            timelineId,
        });
    const manifestPath =
        backend.indexPath(
            timelineId,
        );
    if (
        !health.ok ||
        health.stateRevision !==
            state.stateRevision ||
        health.recordCount < 1
    ) {
        return {
            valid: false,
            reason:
                'manifest_invalid',
            manifestPath,
            health,
        };
    }
    const manifest =
        await readFile(
            manifestPath,
        );
    return {
        valid: true,
        manifestPath,
        manifestSha256:
            sha256(manifest),
        recordCount:
            health.recordCount,
    };
}

function summarizePlan(
    mode,
    file,
    plan,
) {
    return {
        mode,
        status:
            plan.status,
        file:
            path.resolve(file),
        reason:
            plan.reason || '',
        guard:
            plan.guard,
        conflict:
            plan.conflict,
        beforeSha256:
            plan.beforeHash,
        afterSha256:
            plan.afterHash,
        timelineEpoch:
            plan.timelineEpoch,
        beforeRevision:
            plan.beforeRevision,
        afterRevision:
            plan.afterRevision,
        targetMessageFingerprintsBefore:
            plan
                .targetMessageFingerprintsBefore,
        targetMessageFingerprintsAfter:
            plan
                .targetMessageFingerprintsAfter,
        boundedDiff:
            plan.boundedDiff ||
            [],
        destructionEvidence:
            plan.evidence ||
            null,
        protectedDomainHashes:
            plan
                .protectedDomainHashes,
        knowledge:
            plan.knowledge ||
            null,
        modelCalls:
            plan.modelCalls,
        networkCalls: 0,
        wroteArchive: false,
        wroteKnowledge: false,
        backupPath: null,
        backupManifestPath:
            null,
    };
}

export async function runArchiveRepair({
    mode = 'dry-run',
    file =
    DEFAULT_TARGET_FILE,
    backupRoot =
    DEFAULT_BACKUP_ROOT,
    knowledgeRoot =
    DEFAULT_KNOWLEDGE_ROOT,
    expectedGuard =
    EXPECTED_TARGET_GUARD,
    qdrantUrl =
    process.env
        .HOGWARTS_QDRANT_URL ||
    '',
    now =
    () => new Date(),
} = {}) {
    if (
        ![
            'dry-run',
            'apply',
        ].includes(mode)
    ) {
        throw new Error(
            `Unknown mode: ${mode}`,
        );
    }
    const absoluteFile =
        path.resolve(file);
    const [
        source,
        sourceStat,
    ] =
        await Promise.all([
            readFile(
                absoluteFile,
            ),
            stat(
                absoluteFile,
            ),
        ]);
    const currentDate =
        now();
    const committedAt =
        currentDate
            .toISOString();
    const plan =
        analyzeArchiveRepair(
            source,
            {
                expectedGuard,
                committedAt,
                qdrantUrl,
            },
        );
    const summary =
        summarizePlan(
            mode,
            absoluteFile,
            plan,
        );
    if (
        mode === 'dry-run' ||
        plan.status ===
            'blocked'
    ) {
        return summary;
    }
    if (
        plan.status ===
        'noop'
    ) {
        const parsed =
            parseArchive(source);
        const state =
            getState(
                parsed.header,
            );
        summary.knowledge =
            await verifyExistingKnowledge(
                knowledgeRoot,
                state,
            );
        return summary;
    }
    if (
        plan.status !==
        'ready'
    ) {
        throw new Error(
            `REPAIR_NOT_READY: ${plan.status}`,
        );
    }
    if (!plan.guard.matched) {
        throw new Error(
            'GUARD_MISMATCH',
        );
    }
    const state =
        getState(
            parseArchive(
                plan.output,
            ).header,
        );
    const timelineId =
        state.knowledgeBase
            ?.timelineId;
    if (!timelineId) {
        throw new Error(
            'KNOWLEDGE_TIMELINE_ID_MISSING',
        );
    }
    const knowledgeTimelineRoot =
        path.join(
            path.resolve(
                knowledgeRoot,
            ),
            normalizeKnowledgeId(
                timelineId,
                'timeline',
            ),
        );
    const backup =
        await createTimestampedBackup({
            file:
                absoluteFile,
            source,
            sourceStat,
            plan,
            backupRoot,
            knowledgeTimelineRoot,
            now:
                currentDate,
        });
    let archiveWritten =
        false;
    try {
        const latest =
            await readFile(
                absoluteFile,
            );
        if (
            sha256(latest) !==
            plan.beforeHash
        ) {
            throw new Error(
                'SOURCE_HASH_MISMATCH_BEFORE_APPLY',
            );
        }
        await atomicReplaceFile(
            absoluteFile,
            plan.output,
            plan.beforeHash,
            sourceStat.mode,
        );
        archiveWritten = true;
        const written =
            await readFile(
                absoluteFile,
            );
        if (
            sha256(written) !==
            plan.afterHash
        ) {
            throw new Error(
                'AFTER_HASH_MISMATCH',
            );
        }
        const writtenParsed =
            parseArchive(
                written,
            );
        assertPreserved(
            parseArchive(source),
            writtenParsed,
        );
        const knowledge =
            await rebuildExactKnowledge({
                knowledgeRoot,
                timelineId,
                timelineEpoch:
                    state.timelineEpoch,
                stateRevision:
                    state.stateRevision,
                records:
                    plan.records,
            });
        const completedAt =
            now().toISOString();
        const completedManifest = {
            ...backup.manifest,
            status:
                'completed',
            completedAt,
            knowledge: {
                ...backup
                    .manifest
                    .knowledge,
                ...knowledge,
                diagnostics:
                    plan.knowledge
                        .diagnostics,
            },
        };
        await replaceJson(
            backup.manifestPath,
            completedManifest,
        );
        return {
            ...summary,
            status: 'applied',
            wroteArchive: true,
            wroteKnowledge:
                true,
            backupPath:
                backup.backupPath,
            backupManifestPath:
                backup.manifestPath,
            knowledge: {
                ...plan.knowledge,
                ...knowledge,
            },
        };
    } catch (error) {
        if (archiveWritten) {
            const current =
                await readFile(
                    absoluteFile,
                );
            await atomicReplaceFile(
                absoluteFile,
                source,
                sha256(current),
                sourceStat.mode,
            );
        }
        await restoreKnowledgeBackup(
            knowledgeTimelineRoot,
            backup
                .knowledgeBackupPath,
        );
        const failedManifest = {
            ...backup.manifest,
            status: 'rolled_back',
            failedAt:
                now()
                    .toISOString(),
            error:
                String(
                    error?.message ||
                    error,
                ).slice(0, 1000),
        };
        await replaceJson(
            backup.manifestPath,
            failedManifest,
        );
        throw error;
    }
}

function parseArguments(argv) {
    const options = {
        mode: 'dry-run',
        file:
            DEFAULT_TARGET_FILE,
        backupRoot:
            DEFAULT_BACKUP_ROOT,
        knowledgeRoot:
            DEFAULT_KNOWLEDGE_ROOT,
    };
    let explicitMode = '';
    for (
        let index = 0;
        index < argv.length;
        index += 1
    ) {
        const argument =
            argv[index];
        if (
            argument ===
                '--dry-run' ||
            argument ===
                '--apply'
        ) {
            const mode =
                argument.slice(2);
            if (
                explicitMode &&
                explicitMode !==
                    mode
            ) {
                throw new Error(
                    'Choose only one of --dry-run or --apply.',
                );
            }
            explicitMode =
                mode;
            options.mode =
                mode;
        } else if (
            argument ===
            '--file'
        ) {
            options.file =
                argv[++index] ||
                '';
        } else if (
            argument ===
            '--backup-root'
        ) {
            options.backupRoot =
                argv[++index] ||
                '';
        } else if (
            argument ===
            '--knowledge-root'
        ) {
            options.knowledgeRoot =
                argv[++index] ||
                '';
        } else {
            throw new Error(
                `Unknown argument: ${argument}`,
            );
        }
    }
    if (!options.file) {
        throw new Error(
            '--file requires a path.',
        );
    }
    return options;
}

export async function runCli(
    argv,
) {
    return runArchiveRepair(
        parseArguments(argv),
    );
}

const isMain =
    process.argv[1] &&
    fileURLToPath(
        import.meta.url,
    ) ===
        path.resolve(
            process.argv[1],
        );

if (isMain) {
    runCli(
        process.argv.slice(2),
    )
        .then(result => {
            process.stdout.write(
                `${JSON.stringify(
                    result,
                    null,
                    2,
                )}\n`,
            );
        })
        .catch(error => {
            process.stderr.write(
                `${String(
                    error?.stack ||
                    error,
                )}\n`,
            );
            process.exitCode = 1;
        });
}
