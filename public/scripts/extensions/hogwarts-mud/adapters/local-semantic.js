import {
    getLegalAppraisalObserverIds,
} from '../domain/memory-synapse-schema.js';
import {
    createModelLanguageMismatch,
    isEnglishAuthorityText,
} from '../domain/model-language-adoption.js';
import {
    getDeterministicTimePolicy,
    validateSceneTemporalConsistency,
} from '../domain/turn-time.js';
import {
    guardPreTurnEvidenceRoutes,
} from '../domain/pre-turn-route-guards.js';
import {
    buildDynamicInventoryContext,
} from '../domain/inventory-observation-context.js';
import {
    createPostTurnSemanticMessages,
    POST_TURN_JSON_SCHEMA,
} from '../domain/post-turn-semantic-contract.js';
import {
    createDynamicObservationAdapter,
} from './dynamic-observation.js';

export function createLocalSemanticAdapter(ports) {
    const {
        buildLocalMapModel,
        buildStructuredPlayerTurnSequence,
        fetchImpl = null,
        findLocalRoomPath,
        getRequestHeaders,
        normalizePostTurnSemanticProvider =
        value =>
            value === 'local'
                ? 'local'
                : 'low',
        projectObservedInventoryUpdates,
        resolveRoleSlots =
        slots =>
            slots || {},
        runLocalModelTask =
        async (
            _taskId,
            invoke,
        ) =>
            invoke(),
        sendPostTurnSemanticRequest =
        null,
        validatePerceptionContract,
    } = ports;
    const fetchRequest =
        (...args) =>
            (
                fetchImpl ||
                fetch
            )(
                ...args,
            );
    const {
        requestDynamicIdentityObservation,
        requestDynamicInventoryObservation,
        requestDynamicTurnObservation,
    } = createDynamicObservationAdapter({
        fetchRequest,
        getRequestHeaders,
        runLocalModelTask,
    });

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
        forceCheck,
        error = '',
    ) {
        return {
            result: {
                schemaVersion: 1,
                temporal: {
                    mode: 'ordinary',
                    elapsedMinutes: 15,
                    basis: 'fallback',
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
                    rollMode: 'normal',
                    reasonEn:
                    forceCheck
                        ? 'The player explicitly requested a check.'
                        : 'Automatic checks are skipped while the local semantic adjudicator is unavailable.',
                    confidence: 0,
                },
                calendarCommitment: {
                    requested: false,
                    evidenceText: '',
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
        forceCheck,
    ) {
        try {
            const response =
            await runLocalModelTask(
                'local_pre_turn_adjudicator',
                () =>
                    fetchRequest(
                        '/api/hogwarts-mud/local/adjudicate',
                        {
                            method: 'POST',
                            headers:
                                getRequestHeaders(),
                            body:
                                JSON.stringify({
                                    input: {
                                        playerAction:
                                    String(
                                        playerAction ||
                                        '',
                                    ),
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
            const guardedAdjudication =
                guardPreTurnEvidenceRoutes(
                    adjudication,
                    playerAction,
                );
            adjudication.result =
                guardedAdjudication
                    .result;
            adjudication.diagnostics =
                guardedAdjudication
                    .diagnostics;
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
                            'post_turn_semantic_proposal',
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
        state,
    ) {
        const profile =
            (
                state.actorLibrary ||
                []
            ).find(candidate =>
                candidate.id ===
                    actor.id) ||
            {};
        const profileNames = [
            actor.id,
            actor.name,
            actor.nameEn,
            ...(actor.aliases || []),
            profile.nameEn,
            ...(profile.aliases || []),
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
                            'post_turn_semantic_proposal',
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
                    state,
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
            const observedRoomId =
                String(
                    observed.roomId ||
                    '',
                );
            const unknownDeparture =
                observed.presence ===
                    'absent' &&
                !observedRoomId;
            if (
                observedRoomId &&
                !roomIds.has(
                    observedRoomId,
                )
            ) {
                continue;
            }
            const requestedRoomId =
                unknownDeparture
                    ? ''
                    : observedRoomId ||
                        actor.roomId ||
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
            unknownDeparture ||
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
            unknownDeparture
                ? ''
                : hasTargetRoomEvidence
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
                unknownDeparture
                    ? ''
                    : actor.mapId ||
                        roomContext.mapId,
                roomId:
                targetRoomId,
                locationKnown:
                    !unknownDeparture,
            };
            const leftInteraction =
            unknownDeparture ||
            targetRoomId !==
                roomContext
                    .currentRoomId;
            if (
                observed.presence ===
                    'absent' ||
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

    async function requestPostTurnSemanticObservation(
        state,
        playerAction,
        transaction,
        {
            addressing = {},
            movementOnly = false,
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
        const inventory =
            buildDynamicInventoryContext(
                state,
            );
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
        const input = {
            clock:
                state.clock,
            elapsedMinutes:
                transaction.elapsedMinutes,
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
                state.localPresence ||
                null,
            existingActorPresence:
                transaction.actorPresence ||
                null,
            movementPreflight:
                transaction
                    .movementPreflight ||
                null,
        };
        const provider =
            normalizePostTurnSemanticProvider(
                state.postTurnSemanticProvider,
            );
        try {
            let observation;
            if (provider === 'local') {
                const response =
                    await runLocalModelTask(
                        'post_turn_semantic_proposal',
                        () =>
                            fetchRequest(
                                '/api/hogwarts-mud/local/observe',
                                {
                                    method: 'POST',
                                    headers:
                                        getRequestHeaders(),
                                    body:
                                        JSON.stringify({
                                            input,
                                        }),
                                },
                            ),
                        {
                            eventType:
                                'turn.post_commit',
                            emittedBy:
                                'turn.post_semantic_provider',
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
                observation =
                    await response.json();
            } else {
                const lowSlot =
                    resolveRoleSlots(
                        state.modelSlots,
                    ).low;
                if (
                    !lowSlot?.profileId ||
                    typeof sendPostTurnSemanticRequest !==
                        'function'
                ) {
                    throw new Error(
                        'Low post semantic provider is unavailable.',
                    );
                }
                const roleResponse =
                    await sendPostTurnSemanticRequest(
                        lowSlot,
                        createPostTurnSemanticMessages(
                            input,
                        ),
                        {
                            json: true,
                            jsonSchema:
                                POST_TURN_JSON_SCHEMA,
                            stream: false,
                            skipRegexPreset: true,
                        },
                    );
                const raw =
                    roleResponse?.content;
                if (
                    raw === undefined ||
                    raw === null
                ) {
                    throw new Error(
                        'Low post semantic provider returned no content.',
                    );
                }
                const settled =
                    await fetchRequest(
                        '/api/hogwarts-mud/post/observe/settle',
                        {
                            method: 'POST',
                            headers:
                                getRequestHeaders(),
                            body:
                                JSON.stringify({
                                    input,
                                    raw,
                                }),
                        },
                    );
                if (!settled.ok) {
                    throw new Error(
                        (
                            await settled.text()
                        ).slice(0, 1_000) ||
                        `HTTP ${settled.status}`,
                    );
                }
                observation =
                    await settled.json();
            }
            observation.result ??= {};
            observation.result.playerMovement ??=
                null;
            const temporalValidation =
            validateSceneTemporalConsistency(
                observation
                    ?.result
                    ?.temporalClaims,
                state,
                {
                    elapsedMinutes:
                        transaction
                            .elapsedMinutes,
                },
                playerAction,
                narrativeSegments,
            );
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
                    'successful';
            const sourceRejected =
                Boolean(
                    observation
                        ?.diagnostics
                        ?.perceptionRejected,
                ) ||
                Number(
                    observation
                        ?.diagnostics
                        ?.temporalClaimsRejected ||
                    0,
                ) > 0 ||
                !perceptionValidation.valid ||
                rejectedFailedConcealment ||
                !temporalValidation.valid;
            if (sourceRejected) {
                throw new Error(
                    'Post-turn semantic proposal was rejected by a deterministic guard.',
                );
            }
            const perception =
                perceptionValidation.value;
            observation.result
                .perception =
            perception;
            observation.result
                .temporalClaims =
            temporalValidation
                .acceptedClaims;
            observation.diagnostics ??= {};
            observation.diagnostics
                .temporalClaims = {
                    valid:
                    temporalValidation
                        .valid,
                    accepted:
                    temporalValidation
                        .acceptedClaims
                        .length,
                    rejected:
                    temporalValidation
                        .rejectedClaims
                        .length,
                    errors:
                    temporalValidation
                        .errors,
                    rejectedClaims:
                    temporalValidation
                        .rejectedClaims,
                };
            observation.diagnostics.provider =
                provider;
            recoverObservedActorMovements(
                observation,
                state,
                narrativeText,
            );
            if (movementOnly) {
                return {
                    observation,
                    narrativeText,
                    materialEvents: [],
                    itemUpdates: [],
                    identityObservations: [],
                    identityDiagnostics: {
                        routed: false,
                        modelCalls: 0,
                    },
                    inventoryDiagnostics: {
                        routed: false,
                        modelCalls: 0,
                    },
                    temporalClaims: [],
                    temporalDiagnostics:
                        observation
                            .diagnostics
                            .temporalClaims,
                    perception: null,
                    targetActorIds,
                };
            }
            const dynamicObservation =
                await requestDynamicTurnObservation(
                    playerAction,
                    narrativeSegments,
                    actors,
                    inventory,
                    transaction
                        .checkResolution,
                    observation
                        ?.result
                        ?.inventoryObservationRequired,
                );
            observation.diagnostics ??= {};
            observation.diagnostics
                .inventory =
                dynamicObservation
                    .diagnostics
                    .inventory;
            const observedInventoryUpdates =
                dynamicObservation
                    .inventoryUpdates
                    .filter((update, index) =>
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
                identityObservations:
                    dynamicObservation
                        .identityObservations,
                identityDiagnostics:
                    dynamicObservation
                        .diagnostics,
                inventoryDiagnostics:
                    dynamicObservation
                        .diagnostics,
                temporalClaims:
                    temporalValidation
                        .acceptedClaims,
                temporalDiagnostics:
                    observation
                        .diagnostics
                        .temporalClaims,
                perception,
                targetActorIds,
            };
        } catch (error) {
            const movementSettlementFailure =
                transaction
                    ?.movementPreflight
                    ?.triggered ===
                true;
            console.warn(
                '[Hogwarts MUD] Post-turn semantic provider failed; committing narrative without observations',
                error,
            );
            return {
                observation: {
                    result: {
                        schemaVersion: 1,
                        materialEvents:
                        [],
                        inventoryObservationRequired:
                        false,
                        actorUpdates:
                        [],
                        temporalClaims:
                        [],
                        playerMovement:
                        null,
                        perception:
                        null,
                    },
                    diagnostics: {
                        provider,
                        providerFailure: true,
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
                identityDiagnostics: {
                    routed: false,
                    modelCalls: 0,
                },
                inventoryDiagnostics: {
                    routed: false,
                    modelCalls: 0,
                },
                temporalClaims: [],
                temporalDiagnostics: {
                    valid: false,
                    accepted: 0,
                    rejected: 0,
                    errors: [
                        'Post-turn semantic provider unavailable; temporal claims omitted.',
                    ],
                    rejectedClaims: [],
                    provider,
                    providerFailure: true,
                },
                perception:
                null,
                targetActorIds,
                movementSettlementFailure,
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
        requestDynamicIdentityObservation,
        requestDynamicInventoryObservation,
        requestDynamicTurnObservation,
        findActorObservationEvidence,
        recoverObservedActorMovements,
        applyObservedActorUpdates,
        requestPostTurnSemanticObservation,
        requestLocalTurnAppraisals,
    };
}
