import {
    getLegalAppraisalObserverIds,
} from '../domain/memory-synapse-schema.js';
import {
    createModelLanguageMismatch,
    isEnglishAuthorityText,
} from '../domain/model-language-adoption.js';
import {
    getDeterministicTimePolicy,
} from '../domain/turn-time.js';

export function createLocalSemanticAdapter(ports) {
    const {
        buildLocalMapModel,
        buildStructuredPlayerTurnSequence,
        createDeterministicPerceptionFallback,
        findLocalRoomPath,
        getRequestHeaders,
        projectObservedInventoryUpdates,
        reconcileObservedPerceptionWithFallback =
        (
            observed,
            fallback,
        ) =>
            observed ||
            fallback,
        runLocalModelTask =
        async (
            _taskId,
            invoke,
        ) =>
            invoke(),
        validatePerceptionContract,
    } = ports;
    const OBSERVED_ACTOR_DEPARTURE_PATTERN =
        /(?:\b(?:left|departed|exited|walked (?:out|away|through|into)|went (?:out|away|into)|moved into|crossed into)\b|离开|走出|退场|走进|进入了)/iu;
    const INJURY_INSPECTION_PATTERN =
        /(?:\b(?:inspect|check|examine|look(?:ed|ing)? (?:for|at)).{0,80}\b(?:injur|wound|bruise|burn|damage|hurt)\w*\b|(?:仔细观察|检查).{0,40}(?:伤痕|伤势|受伤|伤口))/iu;
    const NO_VISIBLE_INJURY_PATTERN =
        /(?:\b(?:no|without|nonexistent)\s+(?:visible\s+)?(?:spell\s+)?(?:injur|wound|bruise|burn|damage)\w*\b|\b(?:perfectly|visibly)\s+un(?:injured|hurt|harmed)\b|没有(?:发现|看到|观察到)?(?:明显|可见)?(?:伤痕|伤势|伤口|损伤)|未(?:发现|看到|观察到)(?:明显|可见)?(?:伤痕|伤势|伤口|损伤))/iu;
    const VISIBLE_INJURY_PATTERN =
        /(?:\b(?:injur|wound|bruise|cut|burn|fracture|sprain|bleed|swollen|gash)\w*\b|受伤|伤口|伤势|擦伤|割伤|烧伤|骨折|扭伤|淤青|流血|肿胀)/iu;

    function rejectNonEnglishObservation(
        observation,
        source,
        fields,
        {
            taskId,
            fieldPrefix,
            recordId,
        },
    ) {
        const rejectedFields =
            fields.filter(field => {
                const value =
                    String(
                        source?.[field] ||
                        '',
                    ).trim();
                return value &&
                    !isEnglishAuthorityText(
                        value,
                    );
            });
        if (!rejectedFields.length) {
            return false;
        }
        observation.diagnostics ??= {};
        observation.diagnostics
            .languageMismatches ??= [];
        observation.diagnostics
            .languageMismatches.push(
                ...rejectedFields.map(field =>
                    createModelLanguageMismatch({
                        taskId,
                        fieldPath:
                            `${fieldPrefix}.${field}`,
                        recordId,
                    })),
            );
        observation.diagnostics
            .languageMismatchCount =
            observation.diagnostics
                .languageMismatches
                .length;
        return true;
    }

    function buildLocalSemanticActorContext(
        state,
    ) {
        const profiles =
        new Map(
            (
                state.actorLibrary ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
        const localOccupantIds =
        new Set(
            state.localPresence
                ?.occupantActorIds ||
            [],
        );
        return [
            {
                id: 'player',
                nameEn:
                state.character
                    ?.canonicalEn
                    ?.identity
                    ?.nameEn ||
                'Player',
                roleEn:
                'Player character',
                currentActivityEn: '',
                mapId:
                state.map
                    ?.activeMapId ||
                '',
                roomId:
                state.map
                    ?.currentLocalNodeId ||
                '',
            },
            ...(
                state.actors ||
            []
            )
                .filter(actor =>
                    actor.present !==
                    false ||
                localOccupantIds
                    .has(actor.id))
                .map(actor => {
                    const profile =
                    profiles.get(
                        actor.id,
                    ) ||
                    {};
                    return {
                        id: actor.id,
                        nameEn:
                        actor.nameEn ||
                        profile.nameEn ||
                        '',
                        roleEn:
                        actor.roleEn ||
                        profile.roleEn ||
                        '',
                        currentActivityEn:
                        actor
                            .currentActivityEn ||
                        '',
                        mapId:
                        actor.mapId ||
                        state.map
                            ?.activeMapId ||
                        '',
                        roomId:
                        actor.roomId ||
                        state.map
                            ?.currentLocalNodeId ||
                        '',
                    };
                }),
        ];
    }

    function buildLocalSemanticRoomContext(
        state,
    ) {
        const map =
        buildLocalMapModel(
            state.map?.activeMapId,
            state.map,
            state.map?.currentLevelId,
        );
        return {
            mapId:
            state.map?.activeMapId ||
            state.scene?.mapId ||
            '',
            currentRoomId:
            state.map
                ?.currentLocalNodeId ||
            state.scene?.roomId ||
            '',
            rooms:
            (map?.nodes || [])
                .map(room => ({
                    id: room.id,
                    nameEn:
                        room.nameEn ||
                        room.id,
                    kind:
                        room.kind ||
                        '',
                })),
            exits:
            (map?.exits || [])
                .map(exit => ({
                    from:
                        exit.from,
                    to: exit.to,
                    minutes:
                        Number(
                            exit.minutes ||
                            1,
                        ),
                })),
        };
    }

    function createFallbackLocalAdjudication(
        movementResolution,
        forceCheck,
        error = '',
    ) {
        const routeMinutes =
        movementResolution?.moved
            ? Math.max(
                15,
                Number(
                    movementResolution
                        .minutes ||
                    0,
                ) ||
                15,
            )
            : 15;
        return {
            result: {
                schemaVersion: 1,
                temporal: {
                    mode:
                    movementResolution
                        ?.moved
                        ? 'travel'
                        : 'ordinary',
                    elapsedMinutes:
                    routeMinutes,
                    basis:
                    movementResolution
                        ?.moved
                        ? 'route'
                        : 'fallback',
                    evidenceText: '',
                    reasonEn:
                    'Narrative-first fallback uses one ordinary short turn.',
                    confidence: 0,
                },
                check: {
                    required:
                    Boolean(
                        forceCheck,
                    ),
                    ruleId:
                    forceCheck
                        ? 'forced_general'
                        : 'none',
                    targetActorId: '',
                    reasonEn:
                    forceCheck
                        ? 'The player explicitly requested a check.'
                        : 'Automatic checks are skipped while the local semantic adjudicator is unavailable.',
                    confidence: 0,
                },
            },
            diagnostics: {
                fallback: true,
                error:
                String(
                    error || '',
                ).slice(0, 500),
            },
        };
    }

    async function requestLocalTurnAdjudication(
        state,
        playerAction,
        addressing,
        movementResolution,
        forceCheck,
    ) {
        try {
            const response =
            await runLocalModelTask(
                'local_pre_turn_adjudicator',
                () =>
                    fetch(
                        '/api/hogwarts-mud/local/adjudicate',
                        {
                            method: 'POST',
                            headers:
                                getRequestHeaders(),
                            body:
                                JSON.stringify({
                                    input: {
                                        playerTurnSequence:
                                    buildStructuredPlayerTurnSequence(
                                        playerAction,
                                        addressing,
                                    ),
                                        forcedCheck:
                                    Boolean(
                                        forceCheck,
                                    ),
                                        clock:
                                    state.clock,
                                        scene: {
                                            id:
                                        state.scene
                                            ?.id ||
                                        '',
                                            summaryEn:
                                        state.scene
                                            ?.summaryEn ||
                                        '',
                                            nextSceneIntent:
                                        state.scene
                                            ?.nextSceneIntent ||
                                        null,
                                            recentSceneEvents:
                                        (
                                            state.scene
                                                ?.timelineEntries ||
                                            []
                                        ).slice(-4),
                                        },
                                        room:
                                    buildLocalSemanticRoomContext(
                                        state,
                                    ),
                                        actors:
                                    buildLocalSemanticActorContext(
                                        state,
                                    ),
                                        movementResolution:
                                    movementResolution ||
                                    null,
                                        timePolicy:
                                    getDeterministicTimePolicy(),
                                    },
                                }),
                        },
                    ),
                {
                    eventType:
                        'turn.pre_generation',
                    emittedBy:
                        'turn.local_adjudication',
                },
            );
            if (!response.ok) {
                throw new Error(
                    (
                        await response.text()
                    ).slice(0, 1_000) ||
                `HTTP ${response.status}`,
                );
            }
            const adjudication =
            await response.json();
            const temporal =
            adjudication
                ?.result
                ?.temporal;
            if (
                !temporal ||
            !Number.isInteger(
                temporal
                    .elapsedMinutes,
            )
            ) {
                throw new Error(
                    'Local adjudicator returned no temporal decision.',
                );
            }
            if (
                temporal.mode !==
                'instantaneous' &&
            temporal.elapsedMinutes <
                15
            ) {
                temporal.elapsedMinutes =
                15;
            }
            for (
                const [
                    fieldPath,
                    decision,
                ] of [
                    [
                        'temporal.reasonEn',
                        temporal,
                    ],
                    [
                        'check.reasonEn',
                        adjudication
                            ?.result
                            ?.check,
                    ],
                ]
            ) {
                if (
                    decision
                        ?.reasonEn &&
                    !isEnglishAuthorityText(
                        decision
                            .reasonEn,
                    )
                ) {
                    delete decision
                        .reasonEn;
                    adjudication
                        .diagnostics ??= {};
                    adjudication
                        .diagnostics
                        .languageMismatches ??=
                        [];
                    adjudication
                        .diagnostics
                        .languageMismatches
                        .push(
                            createModelLanguageMismatch({
                                taskId:
                                    'local_pre_turn_adjudicator',
                                fieldPath,
                                recordId:
                                    state
                                        .scene
                                        ?.id ||
                                    'current_turn',
                            }),
                        );
                }
            }
            return adjudication;
        } catch (error) {
            console.warn(
                '[Hogwarts MUD] Local semantic adjudication failed; using narrative-first fallback',
                error,
            );
            return createFallbackLocalAdjudication(
                movementResolution,
                forceCheck,
                error?.message ||
            error,
            );
        }
    }

    function findObservationEvidence(
        sourceTextEn,
        evidenceText,
    ) {
        const evidence =
        String(
            evidenceText || '',
        ).trim();
        if (!evidence) {
            return null;
        }
        const start =
        String(sourceTextEn || '')
            .indexOf(evidence);
        if (start < 0) {
            return null;
        }
        return {
            text: evidence,
            start,
            end:
            start +
            evidence.length,
        };
    }

    function findNarrationEvidence(
        segments,
        evidenceText,
    ) {
        const evidence =
            String(
                evidenceText || '',
            ).trim();
        if (!evidence) return null;
        for (const segment of (
            segments || []
        )) {
            if (
                segment?.type !==
                    'narration'
            ) {
                continue;
            }
            const match =
                findObservationEvidence(
                    segment.textEn,
                    evidence,
                );
            if (match) {
                return {
                    ...match,
                    segment,
                };
            }
        }
        return null;
    }

    function actorObservationIsGrounded(
        actor,
        evidenceText,
        targetActorIds,
    ) {
        if (
            (
                targetActorIds ||
                []
            ).includes(
                actor.id,
            )
        ) {
            return true;
        }
        const normalizedEvidence =
            String(
                evidenceText || '',
            ).toLocaleLowerCase();
        return [
            actor.name,
            actor.nameEn,
            ...(actor.aliases ||
                []),
        ]
            .filter(Boolean)
            .some(name =>
                normalizedEvidence
                    .includes(
                        String(name)
                            .toLocaleLowerCase(),
                    ));
    }

    function findNegativeInjuryEvidence(
        narrativeSegments,
    ) {
        for (const segment of (
            narrativeSegments ||
            []
        )) {
            if (
                segment?.type !==
                    'narration'
            ) {
                continue;
            }
            const sentences =
                String(
                    segment.textEn ||
                    '',
                ).match(
                    /[^.!?\n]+(?:[.!?]+|$)/gu,
                ) || [];
            const sentence =
                sentences.find(value =>
                    NO_VISIBLE_INJURY_PATTERN
                        .test(value));
            if (sentence) {
                return sentence.trim();
            }
        }
        return '';
    }

    function projectObservedIdentityObservations(
        observation,
        state,
        playerAction,
        narrativeSegments,
        targetActorIds,
    ) {
        const actorById =
            new Map(
                (
                    state.actors ||
                    []
                ).map(actor => [
                    actor.id,
                    actor,
                ]),
            );
        const localOccupantIds =
            new Set(
                state.localPresence
                    ?.occupantActorIds ||
                [],
            );
        const accepted = (
            observation?.result
                ?.identityObservations ||
            []
        )
            .map((source, index) => {
                if (
                    rejectNonEnglishObservation(
                        observation,
                        source,
                        [
                            'injuryType',
                            'description',
                        ],
                        {
                            taskId:
                                'local_post_turn_observer',
                            fieldPrefix:
                                `identityObservations[${index}]`,
                            recordId:
                                String(
                                    source
                                        ?.actorId ||
                                    index,
                                ),
                        },
                    )
                ) {
                    return null;
                }
                const actor =
                    actorById.get(
                        source.actorId,
                    );
                const evidence =
                    findNarrationEvidence(
                        narrativeSegments,
                        source
                            .evidenceText,
                    );
                const status =
                    String(
                        source.status ||
                        '',
                    );
                const statusGrounded =
                    status ===
                        'no_visible_injury'
                        ? NO_VISIBLE_INJURY_PATTERN
                            .test(
                                evidence
                                    ?.text ||
                                '',
                            )
                        : status ===
                            'visible_injury'
                            ? VISIBLE_INJURY_PATTERN
                                .test(
                                    evidence
                                        ?.text ||
                                    '',
                                )
                            : false;
                if (
                    !actor ||
                    (
                        actor.present ===
                            false &&
                        !localOccupantIds
                            .has(
                                actor.id,
                            )
                    ) ||
                    Number(
                        source.confidence ||
                        0,
                    ) < 0.7 ||
                    !evidence ||
                    !statusGrounded ||
                    !actorObservationIsGrounded(
                        actor,
                        evidence.text,
                        targetActorIds,
                    )
                ) {
                    return null;
                }
                return {
                    version: 1,
                    actorId:
                        actor.id,
                    kind:
                        'injury_assessment',
                    status,
                    injuryType:
                        status ===
                            'visible_injury'
                            ? String(
                                source
                                    .injuryType ||
                                'unknown',
                            )
                            : '',
                    description:
                        status ===
                            'visible_injury'
                            ? String(
                                source
                                    .description ||
                                '',
                            ).trim()
                            : '',
                    evidenceText:
                        evidence.text,
                    confidence:
                        Number(
                            source
                                .confidence,
                        ),
                };
            })
            .filter(observation =>
                observation &&
                (
                    observation.status !==
                        'visible_injury' ||
                    observation.description
                ));
        if (
            accepted.length ||
            !INJURY_INSPECTION_PATTERN
                .test(
                    String(
                        playerAction ||
                        '',
                    ))
        ) {
            return accepted;
        }
        const uniqueTargetActorIds = [
            ...new Set(
                (
                    targetActorIds ||
                    []
                ).filter(actorId =>
                    actorById.has(
                        actorId,
                    )),
            ),
        ];
        const evidence =
            findNegativeInjuryEvidence(
                narrativeSegments,
            );
        if (
            uniqueTargetActorIds
                .length !== 1 ||
            !evidence
        ) {
            return accepted;
        }
        return [{
            version: 1,
            actorId:
                uniqueTargetActorIds[0],
            kind:
                'injury_assessment',
            status:
                'no_visible_injury',
            injuryType: '',
            description: '',
            evidenceText:
                evidence,
            confidence: 0.95,
        }];
    }

    function resolveObservedMaterialActorId(
        event,
        state,
        evidenceText,
    ) {
        if (
            event.sourceKind ===
            'player'
        ) {
            return 'player';
        }
        const evidence =
        String(
            evidenceText || '',
        ).toLocaleLowerCase();
        const candidates = [
            {
                id: 'player',
                names: [
                    state.character
                        ?.canonicalEn
                        ?.identity
                        ?.nameEn,
                    'Tina',
                    '蒂娜',
                ],
            },
            ...(
                state.actors ||
            []
            ).map(actor => ({
                id: actor.id,
                names: [
                    actor.name,
                    actor.nameEn,
                    ...(actor.aliases ||
                    []),
                ],
            })),
        ]
            .flatMap(candidate =>
                candidate.names
                    .filter(Boolean)
                    .map(name => ({
                        id:
                        candidate.id,
                        name:
                        String(name)
                            .toLocaleLowerCase(),
                    })))
            .sort((left, right) =>
                right.name.length -
            left.name.length);
        const matched =
        candidates.find(candidate =>
            candidate.name.length >=
                2 &&
            evidence.includes(
                candidate.name,
            ));
        if (matched) {
            return matched.id;
        }
        const validIds =
        new Set([
            'player',
            ...(
                state.actors ||
                []
            ).map(actor =>
                actor.id),
        ]);
        return validIds.has(
            event.actorId,
        )
            ? event.actorId
            : '';
    }

    function projectObservedMaterialEvents(
        observation,
        state,
        playerAction,
        narrativeText,
    ) {
        return (
            observation?.result
                ?.materialEvents ||
        []
        )
            .filter((event, index) =>
                !rejectNonEnglishObservation(
                    observation,
                    event,
                    [
                        'objectTextEn',
                        'sourceTextEn',
                        'targetTextEn',
                        'valueTextEn',
                        'previousValueTextEn',
                        'resultTextEn',
                    ],
                    {
                        taskId:
                            'local_post_turn_observer',
                        fieldPrefix:
                            `materialEvents[${index}]`,
                        recordId:
                            String(
                                event?.id ||
                                index,
                            ),
                    },
                ))
            .filter(event =>
                Number(
                    event.confidence ||
                0,
                ) >= 0.55)
            .map(event => {
                const sourceTextEn =
                event.sourceKind ===
                    'player'
                    ? playerAction
                    : narrativeText;
                const evidence =
                findObservationEvidence(
                    sourceTextEn,
                    event.evidenceText,
                );
                if (!evidence) {
                    return null;
                }
                const actorId =
                resolveObservedMaterialActorId(
                    event,
                    state,
                    evidence.text,
                );
                const actor =
                (
                    state.actors ||
                    []
                ).find(item =>
                    item.id ===
                        actorId);
                const objectIsActor =
                event.type ===
                    'object_moved' &&
                actor &&
                [
                    actor.name,
                    actor.nameEn,
                    ...(actor.aliases ||
                        []),
                ]
                    .filter(Boolean)
                    .some(name =>
                        String(
                            event
                                .objectTextEn ||
                            '',
                        )
                            .toLocaleLowerCase()
                            .includes(
                                String(name)
                                    .toLocaleLowerCase(),
                            ));
                if (objectIsActor) {
                    return null;
                }
                return {
                    ...event,
                    actorId:
                    actorId,
                    id: '',
                    mapId:
                    state.map
                        ?.activeMapId ||
                    state.scene
                        ?.mapId ||
                    '',
                    roomId:
                    state.map
                        ?.currentLocalNodeId ||
                    state.scene
                        ?.roomId ||
                    '',
                    sceneId:
                    state.scene
                        ?.id ||
                    '',
                    sourceKinds: [
                        event
                            .sourceKind,
                    ],
                    evidence: [
                        evidence,
                    ],
                };
            })
            .filter(Boolean);
    }

    function findActorObservationEvidence(
        narrativeText,
        observed,
        actor,
        roomContext,
    ) {
        const profileNames = [
            actor.name,
            actor.nameEn,
            ...(actor.aliases || []),
        ]
            .filter(Boolean)
            .map(name =>
                String(name)
                    .toLocaleLowerCase());
        const exact =
        findObservationEvidence(
            narrativeText,
            observed.evidenceText,
        );
        if (
            exact &&
        profileNames.some(name =>
            exact.text
                .toLocaleLowerCase()
                .includes(name))
        ) {
            return exact;
        }
        const targetRoom =
        roomContext.rooms.find(
            room =>
                room.id ===
                    observed.roomId,
        );
        const roomNames = [
            observed.roomId,
            targetRoom?.nameEn,
        ]
            .filter(Boolean)
            .map(name =>
                String(name)
                    .replace(/_/gu, ' ')
                    .toLocaleLowerCase());
        const sentences =
        String(narrativeText || '')
            .match(
                /[^.!?\n]+(?:[.!?]+|$)/gu,
            ) ||
        [];
        const sentence =
        sentences.find(value => {
            const normalized =
                value
                    .toLocaleLowerCase();
            return profileNames
                .some(name =>
                    normalized.includes(
                        name,
                    )) &&
                (
                    !roomNames.length ||
                    roomNames.some(name =>
                        normalized.includes(
                            name,
                        ))
                );
        });
        return sentence
            ? findObservationEvidence(
                narrativeText,
                sentence.trim(),
            )
            : null;
    }

    function recoverObservedActorMovements(
        observation,
        state,
        narrativeText,
    ) {
        const result =
        observation?.result;
        if (!result) {
            return;
        }
        const roomContext =
        buildLocalSemanticRoomContext(
            state,
        );
        const boundary =
        result.eventBoundary;
        const boundaryEvidence =
        findObservationEvidence(
            narrativeText,
            boundary?.evidenceText,
        );
        const recovered =
        [];
        for (
            const event
            of result.materialEvents ||
        []
        ) {
            if (
                event.type !==
                'object_moved' ||
            event.sourceKind !==
                'narrative'
            ) {
                continue;
            }
            const evidence =
            findObservationEvidence(
                narrativeText,
                event.evidenceText,
            );
            if (!evidence) {
                continue;
            }
            const actorId =
            resolveObservedMaterialActorId(
                event,
                state,
                evidence.text,
            );
            const actor =
            (
                state.actors ||
                []
            ).find(item =>
                item.id ===
                    actorId);
            if (!actor) {
                continue;
            }
            const targetRoom =
            roomContext.rooms.find(
                room =>
                    [
                        room.id,
                        room.nameEn,
                    ]
                        .filter(Boolean)
                        .some(name =>
                            String(
                                event
                                    .targetTextEn ||
                                '',
                            )
                                .replace(
                                    /_/gu,
                                    ' ',
                                )
                                .toLocaleLowerCase()
                                .includes(
                                    String(name)
                                        .replace(
                                            /_/gu,
                                            ' ',
                                        )
                                        .toLocaleLowerCase(),
                                )),
            );
            if (!targetRoom) {
                continue;
            }
            recovered.push({
                actorId:
                actor.id,
                currentActivityEn:
                evidence.text,
                presence:
                boundary?.ended &&
                boundaryEvidence &&
                targetRoom.id !==
                    roomContext
                        .currentRoomId
                    ? 'absent'
                    : 'present',
                roomId:
                targetRoom.id,
                evidenceText:
                evidence.text,
                confidence:
                Math.max(
                    0.75,
                    Number(
                        event.confidence ||
                        0,
                    ),
                ),
            });
        }
        const byActor =
        new Map(
            (
                result.actorUpdates ||
                []
            ).map(update => [
                update.actorId,
                update,
            ]),
        );
        for (const update of recovered) {
            byActor.set(
                update.actorId,
                update,
            );
        }
        result.actorUpdates =
        [...byActor.values()];
    }

    function isObservedEventBoundary(
        observation,
        narrativeText,
    ) {
        const boundary =
        observation?.result
            ?.eventBoundary;
        if (
            !boundary?.ended ||
        Number(
            boundary.confidence ||
            0,
        ) < 0.55
        ) {
            return false;
        }
        const evidence =
        findObservationEvidence(
            narrativeText,
            boundary.evidenceText,
        );
        if (!evidence) {
            return false;
        }
        return /(?:\bleft\b|\bwalked (?:out|away|through)\b|\bdeparted\b|\bwas gone\b|\bfinished\b|\bcompleted\b|\bended\b|\bclosed\b|离开|走出|完成|结束|告一段落)/iu
            .test(evidence.text);
    }

    function applyObservedActorUpdates(
        transaction,
        observation,
        state,
        narrativeText,
    ) {
        const actors =
        new Map(
            (
                state.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
        const roomContext =
        buildLocalSemanticRoomContext(
            state,
        );
        const roomIds =
        new Set(
            roomContext.rooms
                .map(room =>
                    room.id),
        );
        const presentIds =
        new Set(
            Array.isArray(
                transaction
                    ?.actorPresence
                    ?.presentActorIdsAfterTurn,
            )
                ? transaction
                    .actorPresence
                    .presentActorIdsAfterTurn
                : (
                    state.actors ||
                    []
                )
                    .filter(actor =>
                        actor.present !==
                            false)
                    .map(actor =>
                        actor.id),
        );
        const updates =
        new Map(
            (
                transaction
                    .actorUpdates ||
                []
            ).map(update => [
                update.id,
                update,
            ]),
        );
        const localOccupantIds =
        new Set(
            state.localPresence
                ?.occupantActorIds ||
            [],
        );
        for (
            const observed
            of (
                observation?.result
                    ?.actorUpdates ||
            []
            )
        ) {
            if (
                rejectNonEnglishObservation(
                    observation,
                    observed,
                    [
                        'currentActivityEn',
                    ],
                    {
                        taskId:
                            'local_post_turn_observer',
                        fieldPrefix:
                            `actorUpdates[${observed.actorId || 'unknown'}]`,
                        recordId:
                            String(
                                observed
                                    .actorId ||
                                '',
                            ),
                    },
                )
            ) {
                continue;
            }
            const actor =
            actors.get(
                observed.actorId,
            );
            const observedEvidence =
            actor
                ? findActorObservationEvidence(
                    narrativeText,
                    observed,
                    actor,
                    roomContext,
                )
                : null;
            if (
                !actor ||
            (
                actor.present ===
                    false &&
                !localOccupantIds
                    .has(actor.id)
            ) ||
            Number(
                observed.confidence ||
                0,
            ) < 0.65 ||
            !observedEvidence
            ) {
                continue;
            }
            const requestedRoomId =
            roomIds.has(
                observed.roomId,
            )
                ? observed.roomId
                : actor.roomId ||
                    roomContext
                        .currentRoomId;
            const fromRoomId =
            actor.roomId ||
            roomContext
                .currentRoomId;
            const targetRoom =
            roomContext.rooms.find(
                room =>
                    room.id ===
                    requestedRoomId,
            );
            const normalizedEvidence =
            String(
                observedEvidence
                    .text ||
                '',
            )
                .replace(/_/gu, ' ')
                .toLocaleLowerCase();
            const hasTargetRoomEvidence =
            requestedRoomId ===
                fromRoomId ||
            [
                requestedRoomId,
                targetRoom?.nameEn,
            ]
                .filter(Boolean)
                .map(value =>
                    String(value)
                        .replace(/_/gu, ' ')
                        .toLocaleLowerCase())
                .some(value =>
                    normalizedEvidence
                        .includes(value));
            const targetRoomId =
            hasTargetRoomEvidence
                ? requestedRoomId
                : fromRoomId;
            if (
                targetRoomId !==
                fromRoomId &&
            !findLocalRoomPath(
                actor.mapId ||
                    roomContext.mapId,
                fromRoomId,
                targetRoomId,
                state.map,
            )
            ) {
                continue;
            }
            const nextUpdate = {
                ...(
                    updates.get(
                        actor.id,
                    ) ||
                {
                    id:
                        actor.id,
                }
                ),
                currentActivityEn:
                observed
                    .currentActivityEn,
                mapId:
                actor.mapId ||
                roomContext.mapId,
                roomId:
                targetRoomId,
            };
            const boundary =
            observation?.result
                ?.eventBoundary;
            const boundaryEnded =
            Boolean(
                boundary?.ended &&
                Number(
                    boundary
                        .confidence ||
                    0,
                ) >= 0.55 &&
                findObservationEvidence(
                    narrativeText,
                    boundary
                        .evidenceText,
                ),
            );
            const leftInteraction =
            boundaryEnded &&
            targetRoomId !==
                roomContext
                    .currentRoomId;
            const departureGrounded =
            OBSERVED_ACTOR_DEPARTURE_PATTERN
                .test(
                    observedEvidence
                        .text,
                );
            if (
                (
                    observed.presence ===
                    'absent' &&
                    departureGrounded
                ) ||
            leftInteraction
            ) {
                nextUpdate.present =
                false;
                presentIds.delete(
                    actor.id,
                );
            } else if (
                observed.presence ===
                'present'
            ) {
                nextUpdate.present =
                true;
                presentIds.add(
                    actor.id,
                );
            }
            updates.set(
                actor.id,
                nextUpdate,
            );
        }
        transaction.actorUpdates =
        [...updates.values()];
        transaction.actorPresence = {
            presentActorIdsAfterTurn:
            [...presentIds],
        };
    }

    async function requestLocalTurnObservation(
        state,
        playerAction,
        transaction,
        {
            addressing = {},
        } = {},
    ) {
        const narrativeText = (
            transaction.segments || []
        )
            .map(segment =>
                segment.textEn ||
            '')
            .filter(Boolean)
            .join('\n');
        const narrativeSegments =
        (
            transaction.segments ||
            []
        ).map(segment => ({
            type:
                segment.type,
            actorId:
                segment.actorId ||
                '',
            textEn:
                segment.textEn ||
                '',
        }));
        const actors =
        buildLocalSemanticActorContext(
            state,
        ).map(actor => ({
            id:
                actor.id,
            nameEn:
                actor.nameEn,
            roleEn:
                actor.roleEn,
            mapId:
                actor.mapId,
            roomId:
                actor.roomId,
        }));
        const playerTurnSequence =
        buildStructuredPlayerTurnSequence(
            playerAction,
            addressing,
        );
        const targetActorIds = [
            ...(
                addressing.actorIds ||
            []
            ),
            transaction
                .checkResolution
                ?.target
                ?.actorId,
        ].filter(Boolean);
        const createFallbackPerception =
        () =>
            createDeterministicPerceptionFallback({
                playerAction,
                narrativeText,
                narrativeSegments,
                playerTurnSequence,
                spellCasts:
                    transaction
                        .spellCasts ||
                    [],
                checkResolution:
                    transaction
                        .checkResolution,
                targetActorIds,
                actors:
                    state.actors ||
                    [],
                knownActorIds: (
                    state.actorLibrary ||
                    []
                ).map(actor =>
                    actor.id),
            });
        try {
            const response =
            await runLocalModelTask(
                'local_post_turn_observer',
                () =>
                    fetch(
                        '/api/hogwarts-mud/local/observe',
                        {
                            method: 'POST',
                            headers:
                                getRequestHeaders(),
                            body:
                                JSON.stringify({
                                    input: {
                                        clock:
                                    state.clock,
                                        playerAction:
                                    String(
                                        playerAction ||
                                        '',
                                    ),
                                        playerTurnSequence,
                                        targetActorIds,
                                        narrativeSegments,
                                        room:
                                    buildLocalSemanticRoomContext(
                                        state,
                                    ),
                                        actors,
                                        localPresence:
                                    state
                                        .localPresence ||
                                    null,
                                        inventory:
                                    (
                                        state.items ||
                                        []
                                    ).map(
                                        item => ({
                                            id:
                                                item.id,
                                            labelEn:
                                                item
                                                    .labelEn ||
                                                '',
                                            label:
                                                item
                                                    .label ||
                                                item
                                                    .labelEn ||
                                                '',
                                            appearanceEn:
                                                item
                                                    .appearanceEn ||
                                                item
                                                    .detailEn ||
                                                '',
                                            type:
                                                item
                                                    .type ||
                                                item
                                                    .kind ||
                                                'other',
                                            ownerId:
                                                item
                                                    .ownerId ||
                                                'player',
                                            holderId:
                                                item
                                                    .holderId ||
                                                (
                                                    [
                                                        'carried',
                                                        'equipped',
                                                    ].includes(
                                                        item
                                                            .custody,
                                                    )
                                                        ? item
                                                            .ownerId ||
                                                            'player'
                                                        : ''
                                                ),
                                            state:
                                                item
                                                    .state ||
                                                item
                                                    .status ||
                                                'intact',
                                            isEquipped:
                                                item
                                                    .isEquipped ===
                                                    true ||
                                                item
                                                    .custody ===
                                                    'equipped',
                                        }),
                                    ),
                                        existingActorPresence:
                                    transaction
                                        .actorPresence ||
                                    null,
                                    },
                                }),
                        },
                    ),
                {
                    eventType:
                        'turn.post_commit',
                    emittedBy:
                        'turn.local_observation',
                },
            );
            if (!response.ok) {
                throw new Error(
                    (
                        await response.text()
                    ).slice(0, 1_000) ||
                `HTTP ${response.status}`,
                );
            }
            const observation =
            await response.json();
            const perceptionValidation =
            validatePerceptionContract(
                observation
                    ?.result
                    ?.perception,
                {
                    actors:
                        state.actors ||
                        [],
                    knownActorIds: (
                        state
                            .actorLibrary ||
                        []
                    ).map(actor =>
                        actor.id),
                    sourceTexts: [
                        playerAction,
                        ...narrativeSegments
                            .map(segment =>
                                segment
                                    .textEn),
                    ],
                },
            );
            const rejectedFailedConcealment =
            [
                'failure',
                'critical_failure',
            ].includes(
                transaction
                    .checkResolution
                    ?.outcome,
            ) &&
            observation
                ?.result
                ?.perception
                ?.concealment ===
                    'successful' &&
            /(?:\b(?:secretly|stealth|sneak|hide|conceal)\w*\b|偷偷|悄悄|隐蔽|隐藏)/iu
                .test(playerAction);
            const fallbackPerception =
            createFallbackPerception();
            const perception =
            perceptionValidation.valid &&
            !rejectedFailedConcealment
                ? reconcileObservedPerceptionWithFallback(
                    perceptionValidation
                        .value,
                    fallbackPerception,
                )
                : fallbackPerception;
            observation.result ??= {};
            observation.result
                .perception =
            perception;
            if (
                perception?.source ===
                'deterministic_fallback'
            ) {
                observation
                    .diagnostics ??= {};
                observation
                    .diagnostics
                    .perceptionFallback =
                true;
            }
            recoverObservedActorMovements(
                observation,
                state,
                narrativeText,
            );
            const identityObservations =
                projectObservedIdentityObservations(
                    observation,
                    state,
                    playerAction,
                    narrativeSegments,
                    targetActorIds,
                );
            const observedInventoryUpdates =
                (
                    observation
                        ?.result
                        ?.inventoryUpdates ||
                    []
                ).filter((update, index) =>
                    !rejectNonEnglishObservation(
                        observation,
                        update,
                        [
                            'labelEn',
                            'appearanceEn',
                        ],
                        {
                            taskId:
                                'local_inventory_observer',
                            fieldPrefix:
                                `inventoryUpdates[${index}]`,
                            recordId:
                                String(
                                    update?.id ||
                                    index,
                                ),
                        },
                    ));
            return {
                observation,
                narrativeText,
                materialEvents:
                projectObservedMaterialEvents(
                    observation,
                    state,
                    playerAction,
                    narrativeText,
                ),
                itemUpdates:
                projectObservedInventoryUpdates(
                    observedInventoryUpdates,
                    state,
                    playerAction,
                    narrativeText,
                ),
                identityObservations,
                perception,
                targetActorIds,
            };
        } catch (error) {
            console.warn(
                '[Hogwarts MUD] Local semantic observation failed; committing narrative without optional observations',
                error,
            );
            return {
                observation: {
                    result: {
                        schemaVersion: 1,
                        materialEvents:
                        [],
                        inventoryUpdates:
                        [],
                        eventBoundary: {
                            ended: false,
                            reasonEn:
                            'Narrative-first fallback omits uncertain event boundaries.',
                            evidenceText:
                            '',
                            confidence: 0,
                        },
                        actorUpdates:
                        [],
                        identityObservations:
                        [],
                        perception:
                        createFallbackPerception(),
                    },
                    diagnostics: {
                        fallback: true,
                        error:
                        String(
                            error?.message ||
                            error,
                        ).slice(
                            0,
                            500,
                        ),
                    },
                },
                narrativeText,
                materialEvents: [],
                itemUpdates: [],
                identityObservations:
                [],
                perception:
                createFallbackPerception(),
                targetActorIds,
            };
        }
    }

    async function requestLocalTurnAppraisals(
        state,
        event,
    ) {
        const observerIds =
            getLegalAppraisalObserverIds(
                state,
                event,
            );
        if (
            !event?.eventId ||
            !observerIds.length
        ) {
            return {
                appraisalProposals: [],
                diagnostics: {
                    called: false,
                    fallback: false,
                    observerCount:
                        observerIds.length,
                },
            };
        }
        const profiles = new Map(
            (
                state.actorLibrary ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
        const runtime = new Map(
            (
                state.actors ||
                []
            ).map(actor => [
                actor.id,
                actor,
            ]),
        );
        const observers =
            observerIds.map(id => {
                const profile =
                    profiles.get(id) ||
                    {};
                const actor =
                    runtime.get(id) ||
                    {};
                return {
                    id,
                    nameEn:
                        profile.nameEn ||
                        actor.nameEn ||
                        id,
                    roleEn:
                        profile.roleEn ||
                        actor.roleEn ||
                        '',
                };
            });
        const targetActorIds = [
            'player',
            ...new Set([
                ...(event
                    .participantActorIds ||
                    []),
                ...(event
                    .witnessActorIds ||
                    []),
            ]),
        ];
        try {
            const response =
                await runLocalModelTask(
                    'local_appraisal_proposer',
                    () =>
                        fetch(
                            '/api/hogwarts-mud/local/appraise',
                            {
                                method: 'POST',
                                headers:
                                    getRequestHeaders(),
                                body:
                                    JSON.stringify({
                                        input: {
                                            clock:
                                        state.clock,
                                            event: {
                                                eventId:
                                            event
                                                .eventId,
                                                summaryEn:
                                            event
                                                .summaryEn ||
                                            '',
                                            },
                                            observers,
                                            targetActorIds,
                                        },
                                    }),
                            },
                        ),
                    {
                        eventType:
                            'memory.event_boundary_committed',
                        emittedBy:
                            'turn.local_appraisal',
                    },
                );
            if (!response.ok) {
                throw new Error(
                    (
                        await response.text()
                    ).slice(0, 1_000) ||
                    `HTTP ${response.status}`,
                );
            }
            const payload =
                await response.json();
            const proposals =
                Array.isArray(
                    payload?.result
                        ?.appraisalProposals,
                )
                    ? payload.result
                        .appraisalProposals
                    : [];
            const languageMismatches = [
                ...(
                    payload
                        ?.diagnostics
                        ?.languageMismatches ||
                    []
                ),
            ];
            const adoptedProposals =
                proposals.filter((
                    proposal,
                    index,
                ) => {
                    if (
                        isEnglishAuthorityText(
                            proposal
                                ?.summaryEn,
                        )
                    ) {
                        return true;
                    }
                    if (
                        String(
                            proposal
                                ?.summaryEn ||
                            '',
                        ).trim()
                    ) {
                        languageMismatches
                            .push(
                                createModelLanguageMismatch({
                                    taskId:
                                        'local_appraisal_proposer',
                                    fieldPath:
                                        `appraisalProposals[${index}].summaryEn`,
                                    recordId:
                                        String(
                                            proposal
                                                ?.observerId ||
                                            index,
                                        ),
                                }),
                            );
                    }
                    return false;
                });
            return {
                appraisalProposals:
                    adoptedProposals,
                diagnostics: {
                    called: true,
                    fallback: false,
                    observerCount:
                        observerIds.length,
                    proposalCount:
                        adoptedProposals
                            .length,
                    languageMismatches,
                    languageMismatchCount:
                        languageMismatches
                            .length,
                    model:
                        String(
                            payload
                                ?.diagnostics
                                ?.model ||
                            '',
                        ),
                },
            };
        } catch (error) {
            console.warn(
                '[Hogwarts MUD] Local Appraisal proposal failed; continuing without subjective memory',
                error,
            );
            return {
                appraisalProposals: [],
                diagnostics: {
                    called: true,
                    fallback: true,
                    observerCount:
                        observerIds.length,
                    proposalCount: 0,
                    error:
                        String(
                            error?.message ||
                            error,
                        ).slice(0, 500),
                },
            };
        }
    }

    return {
        buildLocalSemanticActorContext,
        buildLocalSemanticRoomContext,
        createFallbackLocalAdjudication,
        requestLocalTurnAdjudication,
        findObservationEvidence,
        resolveObservedMaterialActorId,
        projectObservedMaterialEvents,
        projectObservedIdentityObservations,
        findActorObservationEvidence,
        recoverObservedActorMovements,
        isObservedEventBoundary,
        applyObservedActorUpdates,
        requestLocalTurnObservation,
        requestLocalTurnAppraisals,
    };
}
