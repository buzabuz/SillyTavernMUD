export function createLocalSemanticAdapter(ports) {
    const {
        buildLocalMapModel,
        buildStructuredPlayerTurnSequence,
        createDeterministicPerceptionFallback,
        findLocalRoomPath,
        getRequestHeaders,
        projectObservedInventoryUpdates,
        validatePerceptionContract,
    } = ports;

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
                    ?.identity
                    ?.name ||
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
                        room.name ||
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
            await fetch(
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
                                    recentTimeline:
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
                                    state
                                        .dailyDirector
                                        ?.plan
                                        ?.timePolicy ||
                                    {},
                            },
                        }),
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
        sourceText,
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
        String(sourceText || '')
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
                        ?.identity
                        ?.name,
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
            .filter(event =>
                Number(
                    event.confidence ||
                0,
                ) >= 0.55)
            .map(event => {
                const sourceText =
                event.sourceKind ===
                    'player'
                    ? playerAction
                    : narrativeText;
                const evidence =
                findObservationEvidence(
                    sourceText,
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
                                .objectText ||
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
                                    .targetText ||
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
            const actor =
            actors.get(
                observed.actorId,
            );
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
            !findActorObservationEvidence(
                narrativeText,
                observed,
                actor,
                roomContext,
            )
            ) {
                continue;
            }
            const targetRoomId =
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
            await fetch(
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
                                narrativeText,
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
                                            detailEn:
                                                item
                                                    .detailEn ||
                                                '',
                                            importance:
                                                item
                                                    .importance ||
                                                'ordinary',
                                            custody:
                                                item
                                                    .custody ||
                                                'stored',
                                            ownerId:
                                                item
                                                    .ownerId ||
                                                'player',
                                        }),
                                    ),
                                existingActorPresence:
                                    transaction
                                        .actorPresence ||
                                    null,
                            },
                        }),
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
            const perception =
            perceptionValidation.valid &&
            !rejectedFailedConcealment
                ? perceptionValidation
                    .value
                : createFallbackPerception();
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
                    observation
                        ?.result
                        ?.inventoryUpdates,
                    state,
                    playerAction,
                    narrativeText,
                ),
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
                perception:
                createFallbackPerception(),
                targetActorIds,
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
        findActorObservationEvidence,
        recoverObservedActorMovements,
        isObservedEventBoundary,
        applyObservedActorUpdates,
        requestLocalTurnObservation,
    };
}
