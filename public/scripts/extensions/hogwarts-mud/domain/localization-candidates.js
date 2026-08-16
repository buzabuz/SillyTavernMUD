import {
    createSpellLocalizationFields,
} from './spell-localization.js';
import {
    getSceneTimelineDisplaySummary,
} from './scene-timeline-display.js';

function text(
    value,
) {
    return String(value || '')
        .trim();
}

export function createCharacterInputLocalizationField(
    fieldPath,
    value,
    {
        timelineEpoch = '',
    } = {},
) {
    const sourceText =
        text(value);
    const requiresTranslation =
        /[A-Za-z]/u.test(
            sourceText,
        );
    return {
        ...(timelineEpoch
            ? {
                timelineEpoch:
                    String(
                        timelineEpoch,
                    ),
            }
            : {}),
        recordKind:
            'character_input',
        recordId: 'player',
        fieldPath,
        sourceTextEn:
            requiresTranslation
                ? sourceText
                : '',
        rawText:
            requiresTranslation
                ? ''
                : sourceText,
    };
}

function addField(
    output,
    {
        recordKind,
        recordId,
        fieldPath,
        sourceTextEn,
        priority,
        changedAt = 0,
    },
) {
    const sourceText =
        text(sourceTextEn);
    if (
        !recordKind ||
        !recordId ||
        !fieldPath ||
        !sourceText
    ) {
        return;
    }
    output.push({
        recordKind,
        recordId:
            String(recordId),
        fieldPath,
        sourceText,
        priority,
        changedAt:
            Number(changedAt) ||
            0,
    });
}

function addFields(
    output,
    source,
    definition,
) {
    for (const fieldPath of
        definition.fieldPaths) {
        addField(
            output,
            {
                ...definition,
                fieldPath,
                sourceTextEn:
                    source?.[fieldPath],
            },
        );
    }
}

export function collectStateLocalizationCandidates(
    state = {},
) {
    const output = [];
    const characterEvidence =
        state.character
            ?.inputEvidence ||
        {};
    const addCharacterField = (
        fieldPath,
        value,
    ) => {
        const field =
            createCharacterInputLocalizationField(
                fieldPath,
                value,
            );
        if (!field.sourceTextEn) {
            return;
        }
        addField(
            output,
            {
                ...field,
                priority: 1,
            },
        );
    };
    addCharacterField(
        'identity.name',
        characterEvidence
            .identity
            ?.name,
    );
    for (const key of [
        'guardian',
        'home',
        'economy',
        'desire',
        'fear',
        'habit',
        'formativeEvent',
    ]) {
        addCharacterField(
            `background.${key}`,
            characterEvidence
                .background
                ?.[key],
        );
    }
    for (const key of [
        'learning',
        'physical',
        'observation',
        'social',
        'pressure',
    ]) {
        addCharacterField(
            `aptitudes.${key}`,
            characterEvidence
                .aptitudes
                ?.[key],
        );
    }
    const scene =
        state.scene;
    if (scene?.id) {
        addFields(
            output,
            scene,
            {
                recordKind: 'scene',
                recordId: scene.id,
                fieldPaths: [
                    'nameEn',
                    'summaryEn',
                    'explorationHookEn',
                    'crowdDirectionEn',
                ],
                priority: 1,
            },
        );
        addField(
            output,
            {
                recordKind:
                    'world_state',
                recordId: 'root',
                fieldPath:
                    'chapterEn',
                sourceTextEn:
                    state.chapterEn,
                priority: 1,
            },
        );
        if (
            scene.nextSceneIntent
        ) {
            addFields(
                output,
                scene
                    .nextSceneIntent,
                {
                    recordKind:
                        'scene_intent',
                    recordId:
                        scene.id,
                    fieldPaths: [
                        'titleEn',
                        'summaryEn',
                        'triggerEn',
                    ],
                    priority: 1,
                },
            );
        }
        (
            scene.timelineEntries ||
            []
        ).forEach((
            entry,
            index,
        ) =>
            addField(
                output,
                {
                    recordKind:
                        'scene_timeline',
                    recordId:
                        `${scene.id}:${index}`,
                    fieldPath:
                        'summaryEn',
                    sourceTextEn:
                        getSceneTimelineDisplaySummary(
                            entry
                                ?.summaryEn,
                        ),
                    priority: 1,
                },
            ));
    }

    const runtimeById =
        new Map(
            (state.actors || [])
                .map(actor => [
                    actor.id,
                    actor,
                ]),
        );
    for (const actor of
        state.actorLibrary || []) {
        addFields(
            output,
            actor,
            {
                recordKind:
                    'actor_core',
                recordId: actor.id,
                fieldPaths: [
                    'nameEn',
                    'roleEn',
                ],
                priority: 1,
            },
        );
        addField(
            output,
            {
                recordKind:
                    'actor_core',
                recordId: actor.id,
                fieldPath:
                    'publicProfile.descriptionEn',
                sourceTextEn:
                    actor
                        .publicProfile
                        ?.descriptionEn,
                priority: 1,
            },
        );
        addField(
            output,
            {
                recordKind:
                    'actor_core',
                recordId: actor.id,
                fieldPath:
                    'publicProfile.backgroundEn',
                sourceTextEn:
                    actor
                        .publicProfile
                        ?.backgroundEn,
                priority: 1,
            },
        );
        addField(
            output,
            {
                recordKind:
                    'actor_core',
                recordId: actor.id,
                fieldPath:
                    'performanceCore.temperamentEn',
                sourceTextEn:
                    actor
                        .performanceCore
                        ?.temperamentEn,
                priority: 1,
            },
        );
        addField(
            output,
            {
                recordKind:
                    'actor_core',
                recordId: actor.id,
                fieldPath:
                    'performanceCore.speechStyleEn',
                sourceTextEn:
                    actor
                        .performanceCore
                        ?.speechStyleEn,
                priority: 1,
            },
        );
        const runtime =
            runtimeById.get(
                actor.id,
            );
        if (runtime) {
            addFields(
                output,
                runtime,
                {
                    recordKind:
                        'actor_runtime',
                    recordId:
                        actor.id,
                    fieldPaths: [
                        'currentActivityEn',
                        'currentIntentEn',
                        'lifeStatusDetailEn',
                    ],
                    priority: 1,
                },
            );
        }
        const presentation =
            state.actorPresentations
                ?.[actor.id];
        addField(
            output,
            {
                recordKind:
                    'actor_presentation',
                recordId: actor.id,
                fieldPath:
                    'outfitEn',
                sourceTextEn:
                    presentation
                        ?.outfitEn,
                priority: 1,
            },
        );
        Object.values(
            presentation
                ?.accessories ||
            {},
        ).forEach((
            value,
            index,
        ) =>
            addField(
                output,
                {
                    recordKind:
                        'actor_presentation',
                    recordId: actor.id,
                    fieldPath:
                        `accessories[${index}]`,
                    sourceTextEn:
                        typeof value ===
                            'string'
                            ? value
                            : value
                                ?.valueEn ||
                                value
                                    ?.descriptionEn,
                    priority: 1,
                },
            ));
        (
            presentation
                ?.visibleConditions ||
            []
        ).forEach((
            condition,
            index,
        ) =>
            addField(
                output,
                {
                    recordKind:
                        'actor_presentation',
                    recordId: actor.id,
                    fieldPath:
                        `visibleConditions[${index}]`,
                    sourceTextEn:
                        typeof condition ===
                            'string'
                            ? condition
                            : condition
                                ?.valueEn ||
                                condition
                                    ?.resultTextEn ||
                                condition
                                    ?.descriptionEn,
                    priority: 1,
                },
            ));
    }

    for (const item of
        state.items || []) {
        addFields(
            output,
            item,
            {
                recordKind: 'item',
                recordId: item.id,
                fieldPaths: [
                    'labelEn',
                    'appearanceEn',
                    'detailEn',
                    'notesEn',
                ],
                priority: 1,
            },
        );
    }
    for (const cohort of
        state.cohorts || []) {
        addField(
            output,
            {
                recordKind:
                    'cohort',
                recordId:
                    cohort.id,
                fieldPath:
                    'labelEn',
                sourceTextEn:
                    cohort.labelEn ||
                    cohort.label,
                priority: 1,
            },
        );
    }

    const spellDefinitions =
        [
            ...(
                state.spellbook
                    ?.known ||
                []
            ).map(entry =>
                entry?.definition),
            ...(
                state
                    .pendingSpellProposals ||
                []
            ).map(proposal =>
                proposal?.definition),
        ]
            .filter(spell =>
                spell?.custom);
    for (const spell of
        spellDefinitions) {
        createSpellLocalizationFields(
            spell,
        ).forEach(field =>
            addField(
                output,
                {
                    ...field,
                    priority: 1,
                },
            ));
    }

    for (const node of
        state.map?.generatedNodes ||
        []) {
        addFields(
            output,
            node,
            {
                recordKind:
                    'world_map_node',
                recordId: node.id,
                fieldPaths: [
                    'nameEn',
                    'summaryEn',
                ],
                priority: 1,
            },
        );
    }
    for (const map of
        state.map?.customLocalMaps ||
        []) {
        addField(
            output,
            {
                recordKind:
                    'local_map',
                recordId: map.id,
                fieldPath: 'nameEn',
                sourceTextEn:
                    map.nameEn,
                priority: 1,
            },
        );
        (map.levels || [])
            .forEach(level =>
                addField(
                    output,
                    {
                        recordKind:
                            'local_map_level',
                        recordId:
                            `${map.id}:${level.id}`,
                        fieldPath:
                            'nameEn',
                        sourceTextEn:
                            level.nameEn,
                        priority: 1,
                    },
                ));
        (map.nodes || [])
            .forEach(room => {
                addField(
                    output,
                    {
                        recordKind:
                            'local_map_room',
                        recordId:
                            `${map.id}:${room.id}`,
                        fieldPath:
                            'nameEn',
                        sourceTextEn:
                            room.nameEn,
                        priority: 1,
                    },
                );
                addField(
                    output,
                    {
                        recordKind:
                            'local_map_room',
                        recordId:
                            `${map.id}:${room.id}`,
                        fieldPath:
                            'descriptionEn',
                        sourceTextEn:
                            room
                                .descriptionEn,
                        priority: 1,
                    },
                );
            });
    }

    const calendar =
        state.calendar || {};
    for (const storyline of
        calendar.storylines || []) {
        addFields(
            output,
            storyline,
            {
                recordKind:
                    'calendar_storyline',
                recordId:
                    storyline.id,
                fieldPaths: [
                    'titleEn',
                    'summaryEn',
                ],
                priority: 1,
            },
        );
    }
    for (const beat of
        calendar.storyBeats || []) {
        addFields(
            output,
            beat,
            {
                recordKind:
                    'calendar_story_beat',
                recordId: beat.id,
                fieldPaths: [
                    'titleEn',
                    'summaryEn',
                ],
                priority: 1,
            },
        );
    }
    for (const entry of
        calendar.entries || []) {
        addFields(
            output,
            entry,
            {
                recordKind:
                    'calendar_entry',
                recordId: entry.id,
                fieldPaths: [
                    'titleEn',
                    'summaryEn',
                ],
                priority: 1,
            },
        );
    }

    for (const appraisal of (
        state.memorySynapse
            ?.appraisals ||
        []
    ).slice(-100)) {
        addField(
            output,
            {
                recordKind:
                    'appraisal',
                recordId:
                    appraisal.id,
                fieldPath:
                    'summaryEn',
                sourceTextEn:
                    appraisal.summaryEn,
                priority: 2,
            },
        );
    }
    for (const event of (
        state.eventKnowledge ||
        []
    ).slice(-100)) {
        addField(
            output,
            {
                recordKind: 'event',
                recordId:
                    event.eventId ||
                    event.id,
                fieldPath:
                    'summaryEn',
                sourceTextEn:
                    event.summaryEn,
                priority: 2,
            },
        );
    }
    for (const schema of
        state.memorySynapse
            ?.personSchemas ||
        []) {
        addFields(
            output,
            schema,
            {
                recordKind:
                    'person_schema',
                recordId: schema.id,
                fieldPaths: [
                    'interpretationEn',
                    'expectationEn',
                ],
                priority: 2,
            },
        );
    }

    (
        state.clues ||
        []
    ).forEach((
        clue,
        index,
    ) => {
        if (
            typeof clue ===
                'string'
        ) {
            addField(
                output,
                {
                    recordKind:
                        'clue',
                    recordId:
                        `clue:${index}`,
                    fieldPath: 'textEn',
                    sourceTextEn: clue,
                    priority: 2,
                },
            );
            return;
        }
        addFields(
            output,
            clue,
            {
                recordKind: 'clue',
                recordId:
                    clue.id ||
                    `clue:${index}`,
                fieldPaths: [
                    'nameEn',
                    'titleEn',
                    'summaryEn',
                    'descriptionEn',
                    'detailEn',
                ],
                priority: 2,
            },
        );
    });
    (
        state.status ||
        []
    ).forEach((
        status,
        index,
    ) => {
        if (
            typeof status ===
                'string'
        ) {
            addField(
                output,
                {
                    recordKind:
                        'status',
                    recordId:
                        `status:${index}`,
                    fieldPath: 'textEn',
                    sourceTextEn:
                        status,
                    priority: 2,
                },
            );
            return;
        }
        addFields(
            output,
            status,
            {
                recordKind:
                    'status',
                recordId:
                    status.id ||
                    `status:${index}`,
                fieldPaths: [
                    'nameEn',
                    'labelEn',
                    'summaryEn',
                    'descriptionEn',
                    'detailEn',
                ],
                priority: 2,
            },
        );
    });

    const archive = [
        ...(state.sceneArchive ||
            []),
    ].reverse();
    archive.forEach((
        record,
        archiveIndex,
    ) => {
        const priority =
            archiveIndex === 0
                ? 3
                : 4;
        addFields(
            output,
            record,
            {
                recordKind:
                    'scene_archive',
                recordId: record.id,
                fieldPaths: [
                    'nameEn',
                    'summaryEn',
                    'closureSummaryEn',
                    'authorQuillEn',
                ],
                priority,
            },
        );
        (
            record
                .unresolvedThreadsEn ||
            []
        ).forEach((
            thread,
            threadIndex,
        ) =>
            addField(
                output,
                {
                    recordKind:
                        'scene_archive',
                    recordId:
                        record.id,
                    fieldPath:
                        `unresolvedThreadsEn[${threadIndex}]`,
                    sourceTextEn:
                        thread,
                    priority,
                },
            ));
        (
            record
                .timelineEntries ||
            []
        ).forEach((
            entry,
            entryIndex,
        ) =>
            addField(
                output,
                {
                    recordKind:
                        'scene_timeline',
                    recordId:
                        `${record.id}:${entryIndex}`,
                    fieldPath:
                        'summaryEn',
                    sourceTextEn:
                        getSceneTimelineDisplaySummary(
                            entry
                                ?.summaryEn,
                        ),
                    priority,
                },
            ));
    });

    return output;
}

export function collectChatLocalizationCandidates(
    chat = [],
) {
    const output = [];
    (
        Array.isArray(chat)
            ? chat
            : []
    ).forEach((
        message,
        messageId,
    ) => {
        const mud =
            message?.extra
                ?.hogwartsMud ||
            {};
        const segments =
            Array.isArray(
                mud.segments,
            )
                ? mud.segments
                : [];
        if (
            !message?.is_user &&
            !message?.is_system &&
            !segments.length
        ) {
            addField(
                output,
                {
                    recordKind:
                        'message',
                    recordId:
                        String(
                            messageId,
                        ),
                    fieldPath: 'mes',
                    sourceTextEn:
                        message.mes,
                    priority: 3,
                },
            );
        }
        if (
            message?.is_system
        ) {
            addField(
                output,
                {
                    recordKind:
                        'system_message',
                    recordId:
                        String(
                            messageId,
                        ),
                    fieldPath: 'mes',
                    sourceTextEn:
                        message.mes,
                    priority: 3,
                },
            );
        }
        segments.forEach((
            segment,
            segmentIndex,
        ) =>
            addField(
                output,
                {
                    recordKind:
                        'message_segment',
                    recordId:
                        `message:${messageId}:segment:${segmentIndex}`,
                    fieldPath: 'textEn',
                    sourceTextEn:
                        segment.textEn,
                    priority: 3,
                },
            ));
        addField(
            output,
            {
                recordKind:
                    'author_quill',
                recordId:
                    String(
                        messageId,
                    ),
                fieldPath:
                    'authorQuillEn',
                sourceTextEn:
                    mud.authorQuillEn,
                priority: 3,
            },
        );
        (
            mud.turnTransaction
                ?.itemCandidates ||
            []
        ).forEach(candidate =>
            addFields(
                output,
                candidate.item,
                {
                    recordKind:
                        'item',
                    recordId:
                        candidate.item
                            ?.id,
                    fieldPaths: [
                        'labelEn',
                        'appearanceEn',
                        'detailEn',
                        'notesEn',
                    ],
                    priority: 3,
                },
            ));
        (
            mud.turnTransaction
                ?.spellCandidates ||
            []
        ).forEach(candidate =>
            createSpellLocalizationFields(
                candidate.definition,
            ).forEach(field =>
                addField(
                    output,
                    {
                        ...field,
                        priority: 3,
                    },
                )));
    });
    return output;
}

export function createLocalizationField(
    recordKind,
    recordId,
    fieldPath,
    sourceTextEn,
) {
    return {
        recordKind,
        recordId:
            String(recordId || ''),
        fieldPath,
        sourceTextEn:
            String(
                sourceTextEn ||
                '',
            ),
    };
}
