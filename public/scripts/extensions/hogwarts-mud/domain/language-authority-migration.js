import {
    migrateCalendarState,
} from './calendar-migration.js';
import {
    normalizeCharacterV2,
} from './character.js';
import {
    normalizeGeneratedInteriorMapLabels,
} from './interior-map.js';
import {
    migrateItemSystemState,
} from './item-migration.js';
import {
    validateItem,
} from './item-schema.js';
import {
    migrateSpellbookState,
} from './spell-state.js';
import {
    MATERIAL_STATE_SCHEMA_VERSION,
} from '../material-schema.js';

export const LANGUAGE_AUTHORITY_VERSION =
    1;
export const MESSAGE_LANGUAGE_VERSION =
    1;

const TINA_TIMELINE_EPOCH =
    'legacy_cdf2d1047e32546a';
const TINA_PROJECTION_FINGERPRINT =
    'cyrb53-1c9fded13a8022';
const TINA_MESSAGE_ID = 6;
const TINA_MESSAGE_CLOCK =
    '1991-07-24 · 10:00';
const TINA_MESSAGE_BEFORE =
    'Legacy player action: （叹了口气）我说：“行吧行吧，你们说什么是什么吧。” 我抱着胳膊，让麦格教授进去。然后尝试伸出脚绊她一脚。';
export const TINA_MESSAGE_AFTER =
    'Tina sighs, reluctantly lets Professor McGonagall enter, folds her arms, and tries to trip her as she steps inside.';

const MATERIAL_TEXT_FIELDS =
    Object.freeze([
        'objectText',
        'sourceText',
        'targetText',
        'valueText',
        'previousValueText',
        'resultText',
    ]);

const TINA_MATERIAL_REPLACEMENTS =
    Object.freeze({
        material_f093d6101ca6300858b3: {
            valueText: {
                before: '长袍',
                after: 'robes',
            },
            evidenceText:
                '*穿上了长袍,但是把漂亮裙子穿下面了*',
        },
        material_402f3a40fe89a5d5e080: {
            targetText: {
                before:
                    '后使用变形术',
                after:
                    'after using Transfiguration',
            },
            evidenceText:
                '首先使用魅力,然后在破坏后使用变形术。',
            descriptionEn:
                'First using Charms, then using Transfiguration after the damage.',
        },
        material_a093a9125145bef0542a: {
            objectText: {
                before:
                    '他的南瓜汁并将其举在自己面前',
                after:
                    'his pumpkin juice, held up in front of himself',
            },
            evidenceText:
                '他拿起他的南瓜汁并将其举在自己面前,就像一个橙色的小盾牌。',
            descriptionEn:
                'He picked up his pumpkin juice and held it in front of himself like a small orange shield.',
        },
        material_f7c74abe0fe1eac97271: {
            objectText: {
                before: '叉子',
                after: 'fork',
            },
            evidenceText:
                '桌子下面,两个年纪较大的学生放下叉子,转过身来。',
            descriptionEn:
                'Further down the table two older students set their forks down and turned round.',
        },
        material_objectmovedmovecanonharryjamespotterfeet: {
            objectText: {
                before:
                    '南瓜汁玻璃',
                after:
                    'pumpkin juice glass',
            },
            sourceText: {
                before: '桌子边缘',
                after: 'table edge',
            },
            targetText: {
                before: '哈利',
                after: 'Harry',
            },
            valueText: {
                before:
                    '他放置的地方',
                after:
                    'where he had set it',
            },
            previousValueText: {
                before: '未放置',
                after: 'not placed',
            },
            resultText: {
                before: '移动',
                after: 'moved',
            },
            evidenceText:
                '哈利的南瓜汁玻璃在他放置的地方摇晃,并向桌子边缘滚动了三英寸,然后停在某人的肘部。',
            descriptionEn:
                'Harry\'s pumpkin juice glass rocked where he\'d set it and rolled three inches toward the table edge before stopping against someone\'s elbow.',
        },
    });

function hasHan(value) {
    return /\p{Script=Han}/u
        .test(
            String(value || ''),
        );
}

function isEnglishText(value) {
    return Boolean(
        String(value || '')
            .trim() &&
        !hasHan(value),
    );
}

function clone(value) {
    return structuredClone(
        value,
    );
}

function assertEqual(
    actual,
    expected,
    label,
) {
    if (actual !== expected) {
        throw new TypeError(
            `${label} exact-before guard failed.`,
        );
    }
}

function createCollector() {
    const candidates =
        new Map();
    const changes = [];
    let rawSegmentCount = 0;
    let skippedRecordCount = 0;

    function addCandidate({
        recordKind,
        recordId,
        fieldPath,
        sourceText,
        translatedText,
    }) {
        if (
            !isEnglishText(
                sourceText,
            ) ||
            !String(
                translatedText ||
                '',
            ).trim()
        ) {
            return;
        }
        const candidate = {
            recordKind:
                String(
                    recordKind ||
                    'state_record',
                ),
            recordId:
                String(
                    recordId ||
                    'unknown',
                ),
            fieldPath:
                String(
                    fieldPath ||
                    'textEn',
                ),
            sourceText:
                String(sourceText),
            translatedText:
                String(
                    translatedText,
                ),
            priority: 4,
        };
        const key =
            JSON.stringify([
                candidate.recordKind,
                candidate.recordId,
                candidate.fieldPath,
                candidate.sourceText,
            ]);
        if (
            !candidates.has(key)
        ) {
            candidates.set(
                key,
                candidate,
            );
        }
    }

    return {
        addCandidate,
        addChange(
            path,
            before,
            after,
        ) {
            if (
                JSON.stringify(
                    before,
                ) ===
                JSON.stringify(
                    after,
                )
            ) {
                return;
            }
            changes.push({
                path,
                before,
                after,
            });
        },
        addRawSegment() {
            rawSegmentCount += 1;
        },
        addSkippedRecord() {
            skippedRecordCount += 1;
        },
        result() {
            return {
                candidates: [
                    ...candidates
                        .values(),
                ],
                changes,
                rawSegmentCount,
                skippedRecordCount,
            };
        },
    };
}

function stripPair(
    target,
    field,
    collector,
    {
        recordKind,
        recordId,
        path,
    },
) {
    const englishField =
        `${field}En`;
    if (
        !Object.hasOwn(
            target,
            field,
        )
    ) {
        return;
    }
    const display =
        target[field];
    const source =
        target[englishField];
    if (
        Array.isArray(display) &&
        Array.isArray(source)
    ) {
        if (
            display.length !==
            source.length
        ) {
            throw new TypeError(
                `${path}.${field} locale pair length mismatch.`,
            );
        }
        source.forEach(
            (
                sourceText,
                index,
            ) =>
                collector
                    .addCandidate({
                        recordKind,
                        recordId:
                            `${recordId}:${index}`,
                        fieldPath:
                            englishField,
                        sourceText,
                        translatedText:
                            display[index],
                    }),
        );
    } else if (
        typeof display ===
            'string' &&
        typeof source ===
            'string'
    ) {
        collector.addCandidate({
            recordKind,
            recordId,
            fieldPath:
                englishField,
            sourceText:
                source,
            translatedText:
                display,
        });
    } else if (
        display !== null &&
        display !== undefined &&
        display !== ''
    ) {
        throw new TypeError(
            `${path}.${field} has no matching English authority.`,
        );
    }
    delete target[field];
}

function stripPairedFields(
    target,
    collector,
    context,
) {
    if (
        !target ||
        typeof target !==
            'object' ||
        Array.isArray(target)
    ) {
        return;
    }
    const recordId =
        String(
            target.id ||
            context.recordId,
        );
    Object.keys(
        target,
    )
        .filter(key =>
            key.endsWith('En'))
        .map(key =>
            key.slice(0, -2))
        .forEach(field =>
            stripPair(
                target,
                field,
                collector,
                {
                    ...context,
                    recordId,
                },
            ));
}

function migrateMaterialEvidence(
    evidence,
    sourceKinds,
) {
    return (
        Array.isArray(evidence)
            ? evidence
            : []
    ).map(entry => ({
        ...clone(entry),
        language:
            hasHan(entry?.text)
                ? 'zh-CN'
                : 'en',
        authority:
            sourceKinds
                ?.includes(
                    'player',
                )
                ? 'player_input_evidence'
                : 'model_output_evidence',
    }));
}

function migrateMaterialEvent(
    source,
    {
        tinaException,
    },
) {
    const event =
        clone(source);
    const replacement =
        TINA_MATERIAL_REPLACEMENTS[
            event.id
        ];
    if (
        replacement &&
        !tinaException
    ) {
        throw new TypeError(
            `Material event ${event.id} requires the Tina exception.`,
        );
    }
    if (
        replacement
            ?.evidenceText
    ) {
        assertEqual(
            event.evidence?.[0]
                ?.text,
            replacement
                .evidenceText,
            `Material event ${event.id} evidence`,
        );
    }
    for (
        const field
        of MATERIAL_TEXT_FIELDS
    ) {
        const englishField =
            `${field}En`;
        const mapped =
            replacement?.[field];
        if (mapped) {
            assertEqual(
                event[field],
                mapped.before,
                `Material event ${event.id}.${field}`,
            );
            event[englishField] =
                mapped.after;
        } else if (
            isEnglishText(
                event[englishField],
            )
        ) {
            // Already migrated.
        } else if (
            isEnglishText(
                event[field],
            )
        ) {
            event[englishField] =
                event[field];
        } else if (
            String(
                event[field] ||
                '',
            ).trim()
        ) {
            throw new TypeError(
                `Material event ${event.id}.${field} has no approved English source.`,
            );
        } else {
            event[englishField] =
                '';
        }
        delete event[field];
    }
    if (
        replacement
            ?.descriptionEn
    ) {
        event.descriptionEn =
            replacement
                .descriptionEn;
    } else if (
        isEnglishText(
            event.descriptionEn,
        )
    ) {
        // Already migrated.
    } else if (
        isEnglishText(
            event.description,
        )
    ) {
        event.descriptionEn =
            event.description;
    } else {
        delete event
            .descriptionEn;
    }
    delete event.description;
    event.evidence =
        migrateMaterialEvidence(
            event.evidence,
            event.sourceKinds,
        );
    event.schemaVersion =
        MATERIAL_STATE_SCHEMA_VERSION;
    return event;
}

function rebuildMaterialProjections(
    state,
    tinaException,
) {
    state.materialEventLog =
        (
            state.materialEventLog ||
            []
        ).map(event =>
            migrateMaterialEvent(
                event,
                {
                    tinaException,
                },
            ));
    const byId =
        new Map(
            state
                .materialEventLog
                .map(event => [
                    event.id,
                    event,
                ]),
        );
    for (
        const roomState
        of Object.values(
            state.map
                ?.roomStates ||
            {},
        )
    ) {
        roomState.materialEffects =
            (
                roomState
                    .materialEffects ||
                []
            ).map(effect => {
                const authority =
                    byId.get(
                        effect.id,
                    );
                if (!authority) {
                    throw new TypeError(
                        `Room Material effect ${effect.id} has no authoritative event.`,
                    );
                }
                return clone(
                    authority,
                );
            });
    }
    if (tinaException) {
        const lavender =
            state
                .actorPresentations
                ?.canon_lavender_brown;
        const harry =
            state
                .actorPresentations
                ?.canon_harry_james_potter;
        if (
            !lavender ||
            !harry
        ) {
            throw new TypeError(
                'Tina Presentation exception targets are missing.',
            );
        }
        lavender.outfitEn =
            'robes';
        delete lavender.outfit;
        harry.heldItems = {
            ...(
                harry.heldItems ||
                {}
            ),
            unspecified:
                'his pumpkin juice, held up in front of himself',
        };
        harry.heldObjectEn =
            'his pumpkin juice, held up in front of himself';
        delete harry.heldObject;
    }
    state.materialStateVersion =
        MATERIAL_STATE_SCHEMA_VERSION;
}

function sourceRefForTimeline(
    kind,
    id,
    suffix,
) {
    return `${kind}:${id}:${suffix}`;
}

function migrateSceneTimeline(
    scene,
    chat,
    collector,
    {
        current = false,
    } = {},
) {
    const entries =
        scene.timelineEntries ||
        [];
    if (!entries.length) {
        return 0;
    }
    const transactionSources =
        (
            current
                ? chat.map(
                    (
                        message,
                        messageId,
                    ) => ({
                        message,
                        messageId,
                    }),
                ).filter(entry =>
                    entry.message
                        ?.extra
                        ?.hogwartsMud
                        ?.sceneId ===
                    scene.id)
                : (
                    scene
                        .messageIds ||
                    []
                ).map(messageId => ({
                    message:
                        chat[
                            messageId
                        ],
                    messageId,
                }))
        )
            .map(entry => ({
                messageId:
                    entry.messageId,
                summaryEn:
                    entry.message
                        ?.extra
                        ?.hogwartsMud
                        ?.turnTransaction
                        ?.publicEventEn,
            }))
            .filter(entry =>
                isEnglishText(
                    entry.summaryEn,
                ));
    const boundedTransactions =
        current
            ? transactionSources
                .slice(
                    0,
                    Math.max(
                        0,
                        entries.length -
                            1,
                    ),
                )
            : transactionSources;
    const sources = [{
        summaryEn:
            scene.summaryEn,
        sourceRef:
            sourceRefForTimeline(
                'scene',
                scene.id,
                'opening',
            ),
    }, ...boundedTransactions.map(
        source => ({
            summaryEn:
                source.summaryEn,
            sourceRef:
                sourceRefForTimeline(
                    'message',
                    source.messageId,
                    'public_event',
                ),
        }),
    )];
    if (!current) {
        let closureIndex = 0;
        while (
            sources.length <
            entries.length
        ) {
            const entry =
                entries[
                    sources.length
                ];
            if (
                entry?.clock !==
                    scene.endedClock ||
                !isEnglishText(
                    scene
                        .closureSummaryEn,
                )
            ) {
                break;
            }
            sources.push({
                summaryEn:
                    scene
                        .closureSummaryEn,
                sourceRef:
                    sourceRefForTimeline(
                        'scene',
                        scene.id,
                        `closure_${
                            closureIndex
                        }`,
                    ),
            });
            closureIndex += 1;
        }
    }
    if (
        sources.length !==
        entries.length ||
        sources.some(source =>
            !isEnglishText(
                source.summaryEn,
            ))
    ) {
        throw new TypeError(
            `Scene ${scene.id} timeline has no complete English reconstruction.`,
        );
    }
    scene.timelineEntries =
        entries.map(
            (
                entry,
                index,
            ) => {
                const source =
                    sources[index];
                collector
                    .addCandidate({
                        recordKind:
                            'scene_timeline',
                        recordId:
                            `${scene.id}:${index}`,
                        fieldPath:
                            'summaryEn',
                        sourceText:
                            source
                                .summaryEn,
                        translatedText:
                            entry.label,
                    });
                const next = {
                    ...entry,
                    summaryEn:
                        source
                            .summaryEn,
                    sourceRef:
                        source
                            .sourceRef,
                };
                delete next.label;
                return next;
            },
        );
    return entries.length;
}

function migrateCheck(
    source,
    sourceMessageId,
    collector,
    context,
) {
    if (
        !source ||
        typeof source !==
            'object'
    ) {
        return source;
    }
    const check =
        clone(source);
    for (const field of [
        'label',
        'attributeLabel',
        'outcomeLabel',
    ]) {
        stripPair(
            check,
            field,
            collector,
            context,
        );
    }
    if (check.spell) {
        stripPair(
            check.spell,
            'name',
            collector,
            {
                ...context,
                recordId:
                    `${context.recordId}:spell`,
            },
        );
    }
    if (check.target) {
        delete check
            .target.name;
    }
    if (
        Object.hasOwn(
            check,
            'reasonEn',
        )
    ) {
        delete check.reasonEn;
        check.reasonCode =
            String(
                check.kind ||
                'action_check',
            );
        check.sourceMessageId =
            Number(
                sourceMessageId,
            );
    }
    return check;
}

function migrateSegment(
    source,
    collector,
) {
    const segment =
        clone(source);
    delete segment.textZh;
    if (
        isEnglishText(
            segment.textEn,
        )
    ) {
        delete segment.rawText;
        delete segment.language;
        delete segment.authority;
        return segment;
    }
    const rawText =
        String(
            segment.textEn ||
            segment.rawText ||
            '',
        );
    if (!rawText) {
        throw new TypeError(
            'Message segment has no text.',
        );
    }
    delete segment.textEn;
    segment.rawText =
        rawText;
    segment.language =
        hasHan(rawText)
            ? 'zh-CN'
            : 'unknown';
    segment.authority =
        'model_output_evidence';
    collector.addRawSegment();
    return segment;
}

function stripTransactionPairs(
    value,
    collector,
    context,
) {
    if (
        !value ||
        typeof value !==
            'object' ||
        Array.isArray(value)
    ) {
        return;
    }
    stripPairedFields(
        value,
        collector,
        context,
    );
    for (const field of [
        'currentActivity',
        'currentIntent',
        'lastingImpact',
        'label',
        'detail',
    ]) {
        if (
            field === 'label' &&
            context.path.endsWith(
                '.identity.gender',
            )
        ) {
            continue;
        }
        if (
            Object.hasOwn(
                value,
                field,
            ) &&
            !String(
                value[field] ||
                '',
            ).trim()
        ) {
            delete value[field];
        }
    }
    for (
        const [
            key,
            child,
        ] of Object.entries(
            value,
        )
    ) {
        if (
            [
                'turnDiagnostics',
                'modelOutputEvidence',
                'evidence',
                'perception',
                'historicalClaims',
            ].includes(key)
        ) {
            continue;
        }
        if (Array.isArray(child)) {
            child.forEach(
                (
                    entry,
                    index,
                ) =>
                    stripTransactionPairs(
                        entry,
                        collector,
                        {
                            ...context,
                            recordId:
                                entry?.id ||
                                `${context.recordId}:${key}:${index}`,
                            path:
                                `${context.path}.${key}[${index}]`,
                        },
                    ),
            );
        } else {
            stripTransactionPairs(
                child,
                collector,
                {
                    ...context,
                    recordId:
                        child?.id ||
                        `${context.recordId}:${key}`,
                    path:
                        `${context.path}.${key}`,
                },
            );
        }
    }
}

function migrateMudPayload(
    source,
    messageId,
    sourceMessageByCheckId,
    collector,
    tinaException,
) {
    const mud =
        clone(source);
    if (
        isEnglishText(
            mud.sourceEn,
        ) &&
        String(
            mud.translatedZh ||
            '',
        ).trim()
    ) {
        collector.addCandidate({
            recordKind:
                'message',
            recordId:
                messageId,
            fieldPath: 'mes',
            sourceText:
                mud.sourceEn,
            translatedText:
                mud.translatedZh,
        });
    }
    for (const key of [
        'sourceEn',
        'translatedZh',
        'provider',
        'translatedAt',
        'translationVersion',
    ]) {
        delete mud[key];
    }
    if (
        Array.isArray(
            mud.segments,
        )
    ) {
        mud.segments =
            mud.segments.map(
                segment =>
                    migrateSegment(
                        segment,
                        collector,
                    ),
            );
    }
    if (
        mud.turnTransaction
    ) {
        const transaction =
            mud.turnTransaction;
        if (
            messageId ===
                TINA_MESSAGE_ID &&
            tinaException
        ) {
            assertEqual(
                transaction
                    .publicEventEn,
                TINA_MESSAGE_BEFORE,
                'Tina message 6 publicEventEn',
            );
            assertEqual(
                transaction
                    .committedClock,
                TINA_MESSAGE_CLOCK,
                'Tina message 6 clock',
            );
            transaction
                .publicEventEn =
                TINA_MESSAGE_AFTER;
        }
        if (
            Array.isArray(
                transaction
                    .segments,
            )
        ) {
            transaction.segments =
                transaction
                    .segments
                    .map(segment =>
                        migrateSegment(
                            segment,
                            collector,
                        ));
        }
        if (
            Array.isArray(
                transaction
                    .actorUpdates,
            )
        ) {
            transaction.actorUpdates =
                transaction
                    .actorUpdates
                    .filter(update => {
                        const invalid =
                            Object.entries(
                                update,
                            ).some(([
                                key,
                                value,
                            ]) =>
                                key.endsWith(
                                    'En',
                                ) &&
                                hasHan(
                                    value,
                                ));
                        if (invalid) {
                            collector
                                .addSkippedRecord();
                        }
                        return !invalid;
                    });
        }
        if (
            Array.isArray(
                transaction
                    .materialEvents,
            )
        ) {
            transaction.materialEvents =
                transaction
                    .materialEvents
                    .flatMap(event => {
                        if (
                            !String(
                                event?.id ||
                                '',
                            ).trim()
                        ) {
                            collector
                                .addSkippedRecord();
                            return [];
                        }
                        return [
                            migrateMaterialEvent(
                                event,
                                {
                                    tinaException,
                                },
                            ),
                        ];
                    });
        }
        if (
            transaction
                .checkResolution
        ) {
            const checkId =
                transaction
                    .checkResolution
                    .id;
            transaction
                .checkResolution =
                migrateCheck(
                    transaction
                        .checkResolution,
                    sourceMessageByCheckId
                        .get(checkId) ??
                        Math.max(
                            0,
                            messageId -
                                1,
                        ),
                    collector,
                    {
                        recordKind:
                            'check',
                        recordId:
                            checkId,
                        path:
                            `message.${messageId}.turnTransaction.checkResolution`,
                    },
                );
        }
        stripTransactionPairs(
            transaction,
            collector,
            {
                recordKind:
                    'message_transaction',
                recordId:
                    messageId,
                path:
                    `message.${messageId}.turnTransaction`,
            },
        );
        delete transaction
            .publicEvent;
    }
    if (mud.checkResolution) {
        const checkId =
            mud.checkResolution.id;
        mud.checkResolution =
            migrateCheck(
                mud.checkResolution,
                messageId,
                collector,
                {
                    recordKind:
                        'check',
                    recordId:
                        checkId,
                    path:
                        `message.${messageId}.checkResolution`,
                },
            );
    }
    if (
        mud.localAdjudication
            ?.result
    ) {
        for (const key of [
            'temporal',
            'check',
        ]) {
            const result =
                mud
                    .localAdjudication
                    .result[key];
            if (
                result &&
                hasHan(
                    result
                        .reasonEn,
                )
            ) {
                delete result
                    .reasonEn;
            }
        }
    }
    if (
        mud.movement &&
        hasHan(
            mud.movement
                .toRoomNameEn,
        )
    ) {
        delete mud
            .movement
            .toRoomNameEn;
    }
    stripPair(
        mud,
        'authorQuill',
        collector,
        {
            recordKind:
                'author_quill',
            recordId:
                messageId,
            path:
                `message.${messageId}`,
        },
    );
    if (
        mud.role &&
        mud.role !==
            'player_turn'
    ) {
        mud.languageVersion =
            MESSAGE_LANGUAGE_VERSION;
    }
    return mud;
}

function migrateMessages(
    chat,
    collector,
    tinaException,
) {
    const sourceMessageByCheckId =
        new Map();
    chat.forEach(
        (
            message,
            messageId,
        ) => {
            const id =
                message
                    ?.extra
                    ?.hogwartsMud
                    ?.checkResolution
                    ?.id;
            if (id) {
                sourceMessageByCheckId
                    .set(
                        id,
                        messageId,
                    );
            }
        },
    );
    return chat.map(
        (
            source,
            messageId,
        ) => {
            const message =
                clone(source);
            if (
                message.extra
                    ?.hogwartsMud
            ) {
                message.extra
                    .hogwartsMud =
                    migrateMudPayload(
                        message.extra
                            .hogwartsMud,
                        messageId,
                        sourceMessageByCheckId,
                        collector,
                        tinaException,
                    );
            }
            if (message.extra) {
                delete message
                    .extra
                    .display_text;
            }
            if (
                Array.isArray(
                    message
                        .swipe_info,
                )
            ) {
                message.swipe_info =
                    message
                        .swipe_info
                        .map(info => {
                            const nextInfo =
                                clone(
                                    info,
                                );
                            if (
                                nextInfo
                                    .extra
                                    ?.hogwartsMud
                            ) {
                                nextInfo
                                    .extra
                                    .hogwartsMud =
                                    migrateMudPayload(
                                        nextInfo
                                            .extra
                                            .hogwartsMud,
                                        messageId,
                                        sourceMessageByCheckId,
                                        collector,
                                        tinaException,
                                    );
                            }
                            if (
                                nextInfo
                                    .extra
                            ) {
                                delete nextInfo
                                    .extra
                                    .display_text;
                            }
                            return nextInfo;
                        });
            }
            return message;
        },
    );
}

function findChapterEn(
    state,
    chat,
) {
    if (
        isEnglishText(
            state.chapterEn,
        )
    ) {
        return state.chapterEn;
    }
    const candidates = [];
    function visit(value) {
        if (
            !value ||
            typeof value !==
                'object'
        ) {
            return;
        }
        if (
            isEnglishText(
                value
                    .committedNextSceneIntent
                    ?.titleEn,
            )
        ) {
            candidates.push(
                value
                    .committedNextSceneIntent
                    .titleEn,
            );
        }
        if (Array.isArray(value)) {
            value.forEach(visit);
        } else {
            Object.values(
                value,
            ).forEach(visit);
        }
    }
    const currentSceneStart =
        Number(
            state.scene
                ?.startedMessageId,
        );
    chat.forEach(
        (
            message,
            messageId,
        ) => {
            if (
                Number.isInteger(
                    currentSceneStart,
                ) &&
                messageId >=
                    currentSceneStart
            ) {
                return;
            }
            visit(
                message
                    ?.extra
                    ?.hogwartsMud
                    ?.turnDiagnostics,
            );
        },
    );
    if (candidates.length) {
        return candidates.at(-1);
    }
    if (
        state.phase !==
            'playing' &&
        isEnglishText(
            state.opening
                ?.package
                ?.chapterEn,
        )
    ) {
        return state.opening
            .package
            .chapterEn;
    }
    throw new TypeError(
        'Current chapter has no deterministic English authority.',
    );
}

function stripStateDisplayFields(
    state,
    collector,
) {
    delete state.location;
    delete state.status;
    if (state.campaign) {
        delete state
            .campaign
            .presetName;
        delete state
            .campaign
            .difficultyName;
    }
    const records = [
        [
            state.scene,
            'scene',
            state.scene?.id,
        ],
        ...(
            state.sceneArchive ||
            []
        ).map(scene => [
            scene,
            'scene_archive',
            scene.id,
        ]),
        ...(
            state.calendar
                ?.storylines ||
            []
        ).map(record => [
            record,
            'calendar_storyline',
            record.id,
        ]),
        ...(
            state.calendar
                ?.storyBeats ||
            []
        ).map(record => [
            record,
            'calendar_story_beat',
            record.id,
        ]),
        ...(
            state.calendar
                ?.entries ||
            []
        ).map(record => [
            record,
            'calendar_entry',
            record.id,
        ]),
        ...(
            state.items ||
            []
        ).map(record => [
            record,
            'item',
            record.id,
        ]),
        ...(
            state.actors ||
            []
        ).map(record => [
            record,
            'actor_runtime',
            record.id,
        ]),
        ...(
            state.actorLibrary ||
            []
        ).map(record => [
            record,
            'actor',
            record.id,
        ]),
        [
            state.conflict,
            'conflict',
            'current',
        ],
        ...(
            state.agenda ||
            []
        ).map(
            (
                record,
                index,
            ) => [
                record,
                'agenda',
                index,
            ],
        ),
    ];
    for (
        const [
            record,
            recordKind,
            recordId,
        ] of records
    ) {
        stripTransactionPairs(
            record,
            collector,
            {
                recordKind,
                recordId,
                path:
                    `${recordKind}.${recordId}`,
            },
        );
        if (
            recordKind ===
                'scene_archive'
        ) {
            delete record.location;
        }
    }
    for (
        const map
        of state.map
            ?.customLocalMaps ||
        []
    ) {
        stripPairedFields(
            map,
            collector,
            {
                recordKind:
                    'local_map',
                recordId:
                    map.id,
                path:
                    `map.${map.id}`,
            },
        );
        for (
            const level
            of map.levels || []
        ) {
            stripPairedFields(
                level,
                collector,
                {
                    recordKind:
                        'local_map_level',
                    recordId:
                        `${map.id}:${level.id}`,
                    path:
                        `map.${map.id}.level.${level.id}`,
                },
            );
        }
        for (
            const room
            of map.nodes || []
        ) {
            stripPairedFields(
                room,
                collector,
                {
                    recordKind:
                        'local_map_room',
                    recordId:
                        `${map.id}:${room.id}`,
                    path:
                        `map.${map.id}.room.${room.id}`,
                },
            );
        }
    }
    for (
        const record
        of [
            ...(
                state.map
                    ?.generatedNodes ||
                []
            ),
            ...(
                state.map
                    ?.proposals ||
                []
            ),
        ]
    ) {
        stripPairedFields(
            record,
            collector,
            {
                recordKind:
                    'world_map_record',
                recordId:
                    record.id,
                path:
                    `world_map.${record.id}`,
            },
        );
    }
    if (
        state.opening
            ?.package
            ?.display
    ) {
        delete state
            .opening
            .package
            .display;
    }
    for (
        const known
        of state.spellbook
            ?.known ||
        []
    ) {
        delete known
            .proficiencyLabel;
        if (
            known.definition
        ) {
            delete known
                .definition
                .name;
            delete known
                .definition
                .effect;
        }
    }
}

function checkInvariants(
    before,
    after,
) {
    const itemProjection =
        state =>
            (
                state.items ||
                []
            ).map(item => ({
                id: item.id,
                state:
                    item.state,
                physicalForm:
                    item
                        .physicalForm,
                ownerId:
                    item.ownerId,
                holderId:
                    item.holderId,
                location:
                    item.location,
            }));
    const actorLife =
        state =>
            (
                state
                    .actorLibrary ||
                []
            ).map(actor => ({
                id: actor.id,
                lifeStatus:
                    actor.lifeStatus,
                lifeStatusPermanent:
                    actor
                        .lifeStatusPermanent,
            }));
    const stableIds =
        state => ({
            items:
                (
                    state.items ||
                    []
                ).map(item =>
                    item.id),
            actors:
                (
                    state
                        .actorLibrary ||
                    []
                ).map(actor =>
                    actor.id),
            calendar: [
                ...(
                    state.calendar
                        ?.storylines ||
                    []
                ),
                ...(
                    state.calendar
                        ?.storyBeats ||
                    []
                ),
                ...(
                    state.calendar
                        ?.entries ||
                    []
                ),
            ].map(record =>
                record.id),
            maps:
                (
                    state.map
                        ?.customLocalMaps ||
                    []
                ).flatMap(map => [
                    map.id,
                    ...(
                        map.levels ||
                        []
                    ).map(level =>
                        level.id),
                    ...(
                        map.nodes ||
                        []
                    ).map(room =>
                        room.id),
                ]),
            spells:
                (
                    state.spellbook
                        ?.known ||
                    []
                ).map(record =>
                    record.spellId),
            events:
                (
                    state
                        .eventKnowledge ||
                    []
                ).map(record =>
                    record.eventId),
            appraisals:
                (
                    state
                        .memorySynapse
                        ?.appraisals ||
                    []
                ).map(record =>
                    record.id),
        });
    for (
        const [
            label,
            project,
        ] of [
            [
                'Item existence/custody',
                itemProjection,
            ],
            [
                'Actor life status',
                actorLife,
            ],
            [
                'Stable IDs',
                stableIds,
            ],
        ]
    ) {
        if (
            JSON.stringify(
                project(before),
            ) !==
            JSON.stringify(
                project(after),
            )
        ) {
            throw new TypeError(
                `${label} changed during language migration.`,
            );
        }
    }
    for (
        const item
        of after.items || []
    ) {
        const errors =
            validateItem(
                item,
            );
        if (errors.length) {
            throw new TypeError(
                errors.join('；'),
            );
        }
    }
}

function assertNoCanonicalHan(
    value,
    path = [],
) {
    if (typeof value ===
        'string') {
        const key =
            String(
                path.at(-1) ||
                '',
            );
        const allowed =
            path.some(part =>
                [
                    'inputEvidence',
                    'modelOutputEvidence',
                    'turnDiagnostics',
                    'evidence',
                    'perception',
                    'historicalClaims',
                    'aliases',
                    'rawText',
                    'diagnostics',
                ].includes(
                    String(part),
                ));
        if (
            !allowed &&
            key.endsWith('En') &&
            hasHan(value)
        ) {
            throw new TypeError(
                `${path.join('.')} contains Han in English authority.`,
            );
        }
        return;
    }
    if (Array.isArray(value)) {
        value.forEach(
            (
                child,
                index,
            ) =>
                assertNoCanonicalHan(
                    child,
                    [
                        ...path,
                        index,
                    ],
                ),
        );
        return;
    }
    if (
        value &&
        typeof value ===
            'object'
    ) {
        for (
            const [
                key,
                child,
            ] of Object.entries(
                value,
            )
        ) {
            assertNoCanonicalHan(
                child,
                [
                    ...path,
                    key,
                ],
            );
        }
    }
}

function diffValues(
    before,
    after,
    collector,
    path = '',
) {
    if (
        JSON.stringify(before) ===
        JSON.stringify(after)
    ) {
        return;
    }
    const beforeObject =
        before &&
        typeof before ===
            'object';
    const afterObject =
        after &&
        typeof after ===
            'object';
    if (
        !beforeObject ||
        !afterObject ||
        Array.isArray(before) !==
            Array.isArray(after)
    ) {
        collector.addChange(
            path,
            before,
            after,
        );
        return;
    }
    if (
        Array.isArray(before)
    ) {
        if (
            before.length !==
            after.length
        ) {
            collector.addChange(
                `${path}.length`,
                before.length,
                after.length,
            );
        }
        for (
            let index = 0;
            index <
            Math.max(
                before.length,
                after.length,
            );
            index++
        ) {
            diffValues(
                before[index],
                after[index],
                collector,
                `${path}[${index}]`,
            );
        }
        return;
    }
    const keys =
        new Set([
            ...Object.keys(
                before,
            ),
            ...Object.keys(
                after,
            ),
        ]);
    for (const key of keys) {
        diffValues(
            before[key],
            after[key],
            collector,
            path
                ? `${path}.${key}`
                : key,
        );
    }
}

function migrateState(
    source,
    chat,
    collector,
    {
        tinaException,
        nested = false,
    },
) {
    if (
        source
            .languageAuthorityVersion ===
        LANGUAGE_AUTHORITY_VERSION
    ) {
        return {
            state:
                clone(source),
            timelineEntries: 0,
        };
    }
    let state =
        clone(source);
    state =
        migrateCalendarState(
            state,
        ).state;
    state =
        migrateItemSystemState(
            state,
        ).state;
    state =
        migrateSpellbookState(
            state,
            chat,
        ).state;
    state =
        normalizeGeneratedInteriorMapLabels(
            state,
        ).state;
    state.character =
        normalizeCharacterV2(
            state.character,
        );
    state.characterLanguageVersion =
        state.character.version;
    state.chapterEn =
        findChapterEn(
            state,
            chat,
        );
    collector.addCandidate({
        recordKind:
            'world_state',
        recordId: 'root',
        fieldPath:
            'chapterEn',
        sourceText:
            state.chapterEn,
        translatedText:
            state.chapter,
    });
    delete state.chapter;
    rebuildMaterialProjections(
        state,
        tinaException,
    );
    stripStateDisplayFields(
        state,
        collector,
    );
    const checkSourceIds =
        new Map();
    chat.forEach(
        (
            message,
            messageId,
        ) => {
            const id =
                message
                    ?.extra
                    ?.hogwartsMud
                    ?.checkResolution
                    ?.id;
            if (id) {
                checkSourceIds.set(
                    id,
                    messageId,
                );
            }
        },
    );
    state.checks =
        (
            state.checks ||
            []
        ).map(check =>
            migrateCheck(
                check,
                checkSourceIds.get(
                    check.id,
                ) ?? -1,
                collector,
                {
                    recordKind:
                        'check',
                    recordId:
                        check.id,
                    path:
                        `checks.${check.id}`,
                },
            ));
    let timelineEntries = 0;
    for (
        const scene
        of state.sceneArchive ||
        []
    ) {
        timelineEntries +=
            migrateSceneTimeline(
                scene,
                chat,
                collector,
            );
    }
    if (state.scene) {
        timelineEntries +=
            migrateSceneTimeline(
                state.scene,
                chat,
                collector,
                {
                    current: true,
                },
            );
    }
    if (
        Array.isArray(
            state.timeline,
        )
    ) {
        state.timeline =
            state.timeline.map(
                (
                    entry,
                    index,
                ) => {
                    if (
                        !isEnglishText(
                            entry.summaryEn,
                        )
                    ) {
                        throw new TypeError(
                            `Global timeline entry ${index} lacks summaryEn.`,
                        );
                    }
                    const next = {
                        ...entry,
                    };
                    delete next.label;
                    return next;
                },
            );
    }
    state.languageAuthorityVersion =
        LANGUAGE_AUTHORITY_VERSION;
    if (
        !nested &&
        state.turnRetry
            ?.baseState
    ) {
        const migratedBaseState =
            migrateState(
                state.turnRetry
                    .baseState,
                chat,
                collector,
                {
                    tinaException,
                    nested: true,
                },
            );
        state.turnRetry = {
            ...state.turnRetry,
            baseState:
                migratedBaseState
                    .state,
        };
    }
    return {
        state,
        timelineEntries,
    };
}

export function migrateLanguageAuthorityV1({
    worldState,
    chat,
}) {
    if (
        !worldState ||
        typeof worldState !==
            'object' ||
        !Array.isArray(chat)
    ) {
        throw new TypeError(
            'Language Authority migration requires world State and chat.',
        );
    }
    const collector =
        createCollector();
    const tinaTimeline =
        worldState
            .timelineEpoch ===
        TINA_TIMELINE_EPOCH;
    const tinaException =
        tinaTimeline &&
        worldState
            .knowledgeBase
            ?.projectionFingerprint ===
        TINA_PROJECTION_FINGERPRINT;
    if (
        tinaTimeline &&
        !tinaException
    ) {
        throw new TypeError(
            'Tina migration content identity does not match the approved allowlist.',
        );
    }
    if (
        worldState
            .languageAuthorityVersion ===
        LANGUAGE_AUTHORITY_VERSION
    ) {
        assertNoCanonicalHan(
            worldState,
        );
        assertNoCanonicalHan(
            chat,
        );
        return {
            changed: false,
            nextState:
                clone(worldState),
            nextChat:
                clone(chat),
            translationCandidates:
                [],
            report: {
                schemaVersion: 1,
                timelineEntries: 0,
                changes: [],
                rawSegmentCount: 0,
                skippedRecordCount: 0,
            },
        };
    }
    const nextChat =
        migrateMessages(
            chat,
            collector,
            tinaException,
        );
    const migrated =
        migrateState(
            worldState,
            nextChat,
            collector,
            {
                tinaException,
            },
        );
    const nextState =
        migrated.state;
    checkInvariants(
        worldState,
        nextState,
    );
    assertNoCanonicalHan(
        nextState,
    );
    assertNoCanonicalHan(
        nextChat,
    );
    diffValues(
        worldState,
        nextState,
        collector,
        'state',
    );
    diffValues(
        chat,
        nextChat,
        collector,
        'chat',
    );
    const collected =
        collector.result();
    return {
        changed:
            collected
                .changes.length >
            0,
        nextState,
        nextChat,
        translationCandidates:
            collected
                .candidates,
        report: {
            schemaVersion: 1,
            timelineEntries:
                migrated
                    .timelineEntries,
            changes:
                collected.changes,
            translationCandidateCount:
                collected
                    .candidates
                    .length,
            rawSegmentCount:
                collected
                    .rawSegmentCount,
            skippedRecordCount:
                collected
                    .skippedRecordCount,
        },
    };
}
