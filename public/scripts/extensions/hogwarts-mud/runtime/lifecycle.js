export function createLifecycleRuntime(ports) {
    const {
        createFallbackNextSceneIntent,
        getContext,
        getLocalMapDefinition =
        () => null,
        getMudState,
        getRoomName,
        jobRegistry,
        migrateActorKnowledgeBoundaries,
        migrateActorMovementHistory,
        migrateActorPresentationState,
        migrateLoadedSocialGraph,
        migrateObservedInventoryState,
        migrateItemSystemState =
        state => ({
            state,
            changed: false,
        }),
        migrateRelationshipMemoryState,
        migrateSpellbookState,
        normalizeCausalCollapseState,
        normalizeModelSlots,
        projectActorSocialRelationships,
        projectSceneTransitionPresence =
        null,
        reconcileCanonActorDisplayNames,
        reconcileTemporaryActorDisplayNames,
        reduceLocalPresence =
        state =>
            state.localPresence,
        saveMetadataDebounced,
        validateNextSceneIntent,
    } = ports;

    function ensureSceneLifecycleState(state = getMudState()) {
        if (!state) return false;
        let changed = false;
        const normalizedModelSlots =
        normalizeModelSlots(
            state.modelSlots,
        );
        if (
            JSON.stringify(
                state.modelSlots || {},
            ) !==
        JSON.stringify(
            normalizedModelSlots,
        )
        ) {
            state.modelSlots =
            normalizedModelSlots;
            changed = true;
        }
        const relationshipMigration =
        migrateRelationshipMemoryState(
            state,
            getContext().chat,
        );
        if (relationshipMigration.changed) {
            Object.assign(state, relationshipMigration.state);
            saveMetadataDebounced();
            changed = true;
        }
        const knowledgeMigration =
        migrateActorKnowledgeBoundaries(
            state,
        );
        if (knowledgeMigration.changed) {
            Object.assign(
                state,
                knowledgeMigration.state,
            );
            saveMetadataDebounced();
            changed = true;
        }
        const presentationMigration =
        migrateActorPresentationState(
            state,
        );
        if (
            presentationMigration.changed
        ) {
            Object.assign(
                state,
                presentationMigration.state,
            );
            saveMetadataDebounced();
            changed = true;
        }
        const actorMovementMigration =
        migrateActorMovementHistory(
            state,
            getContext().chat,
        );
        if (
            actorMovementMigration.changed
        ) {
            Object.assign(
                state,
                actorMovementMigration.state,
            );
            saveMetadataDebounced();
            changed = true;
        }
        const inventoryMigration =
        migrateObservedInventoryState(
            state,
            getContext().chat,
        );
        if (
            inventoryMigration.changed
        ) {
            Object.assign(
                state,
                inventoryMigration.state,
            );
            saveMetadataDebounced();
            changed = true;
        }
        const itemSystemMigration =
            migrateItemSystemState(
                state,
            );
        if (
            itemSystemMigration.changed
        ) {
            Object.assign(
                state,
                itemSystemMigration
                    .state,
            );
            saveMetadataDebounced();
            changed = true;
        }
        const spellbookMigration =
        migrateSpellbookState(
            state,
            getContext().chat,
        );
        if (
            spellbookMigration.changed
        ) {
            Object.assign(
                state,
                spellbookMigration.state,
            );
            saveMetadataDebounced();
            changed = true;
        }
        const canonNameMigration =
        reconcileCanonActorDisplayNames(
            state,
        );
        if (canonNameMigration.changed) {
            Object.assign(
                state,
                canonNameMigration.state,
            );
            saveMetadataDebounced();
            changed = true;
        }
        const temporaryNameMigration =
        reconcileTemporaryActorDisplayNames(
            state,
            getContext().chat,
        );
        if (temporaryNameMigration.changed) {
            Object.assign(
                state,
                temporaryNameMigration.state,
            );
            changed = true;
        }
        const normalizedCausalCollapse =
        normalizeCausalCollapseState(
            state.causalCollapse,
        );
        if (
            JSON.stringify(
                state.causalCollapse ||
            {},
            ) !==
        JSON.stringify(
            normalizedCausalCollapse,
        )
        ) {
            state.causalCollapse =
            normalizedCausalCollapse;
            changed = true;
        }
        const socialGraphMigration =
        migrateLoadedSocialGraph(
            state.socialGraph,
            {
                chatLength:
                    getContext().chat
                        .length,
                sceneId:
                    state.scene?.id ||
                    '',
            },
        );
        if (socialGraphMigration.changed) {
            state.socialGraph =
            socialGraphMigration
                .graph;
            changed = true;
        }
        const projectedActorLibrary =
        projectActorSocialRelationships(
            state.actorLibrary,
            state.socialGraph,
        );
        if (
            JSON.stringify(
                state.actorLibrary || [],
            ) !==
        JSON.stringify(
            projectedActorLibrary,
        )
        ) {
            state.actorLibrary =
            projectedActorLibrary;
            changed = true;
        }
        const presenceMapId =
            state.map?.activeMapId ||
            state.scene?.mapId ||
            '';
        const presenceRoomId =
            state.map
                ?.currentLocalNodeId ||
            state.scene?.roomId ||
            '';
        const staleLocalPresence =
            Boolean(
                presenceMapId &&
                presenceRoomId &&
                state.localPresence &&
                (
                    state
                        .localPresence
                        .mapId !==
                        presenceMapId ||
                    state
                        .localPresence
                        .roomId !==
                        presenceRoomId
                ),
            );
        const archivedClassCohortIds =
            new Set(
                state
                    .sceneArchive
                    ?.at(-1)
                    ?.localCohortIds ||
                [],
            );
        const missingClassCohort =
            /_classroom$/u.test(
                presenceRoomId,
            ) &&
            !(
                state.localPresence
                    ?.cohortIds ||
                []
            ).length &&
            (
                state.cohorts ||
                []
            ).some(cohort =>
                cohort.source ===
                    'class_roster' &&
                archivedClassCohortIds
                    .has(
                        cohort.id,
                    ));
        if (
            (
                staleLocalPresence ||
                missingClassCohort
            ) &&
            projectSceneTransitionPresence
        ) {
            const map =
                getLocalMapDefinition(
                    presenceMapId,
                    state.map,
                );
            const room =
                [
                    ...(map?.nodes ||
                        []),
                    ...(
                        state.map
                            ?.generatedLocalNodes ||
                        []
                    ).filter(candidate =>
                        candidate.mapId ===
                            presenceMapId),
                ].find(candidate =>
                    candidate.id ===
                        presenceRoomId) ||
                {
                    id:
                        presenceRoomId,
                    kind:
                        /_classroom$/u
                            .test(
                                presenceRoomId,
                            )
                            ? 'classroom'
                            : '',
                };
            const transitionPresence =
                projectSceneTransitionPresence(
                    state,
                    state,
                    {
                        ...state.scene,
                        mapId:
                            presenceMapId,
                        roomId:
                            presenceRoomId,
                        actorStates:
                            (
                                state.actors ||
                                []
                            )
                                .filter(actor =>
                                    actor.present ===
                                        true)
                                .map(actor => ({
                                    id:
                                        actor.id,
                                    present:
                                        true,
                                })),
                    },
                    room,
                    Number(
                        state.turn
                            ?.count ||
                        0,
                    ),
                );
            state.actors =
                transitionPresence
                    .actors;
            state.cohorts =
                transitionPresence
                    .cohorts;
            state
                .activeInteractionActorIds =
                transitionPresence
                    .activeInteractionActorIds;
            state.localPresence =
                transitionPresence
                    .localPresence;
            changed = true;
        }
        const activeInteractionActorIds =
            (
                state.actors ||
                []
            )
                .filter(actor =>
                    actor.present ===
                        true)
                .map(actor =>
                    actor.id);
        if (
            JSON.stringify(
                state
                    .activeInteractionActorIds ||
                [],
            ) !==
            JSON.stringify(
                activeInteractionActorIds,
            )
        ) {
            state
                .activeInteractionActorIds =
            activeInteractionActorIds;
            changed = true;
        }
        if (
            presenceMapId &&
            presenceRoomId
        ) {
            const localPresence =
                reduceLocalPresence(
                    state,
                    {
                        mapId:
                            presenceMapId,
                        roomId:
                            presenceRoomId,
                        updatedTurn:
                            Number(
                                state.turn
                                    ?.count ||
                                0,
                            ),
                    },
                );
            if (
                JSON.stringify(
                    state.localPresence ||
                    {},
                ) !==
                JSON.stringify(
                    localPresence ||
                    {},
                )
            ) {
                state.localPresence =
                    localPresence;
                changed = true;
            }
        }
        if (!Array.isArray(state.sceneArchive)) {
            state.sceneArchive = [];
            changed = true;
        }
        if (!Array.isArray(state.checks)) {
            state.checks = [];
            changed = true;
        }
        const timeline = Array.isArray(state.timeline)
            ? state.timeline
            : [];
        state.sceneArchive.forEach(scene => {
            if (Array.isArray(scene.timelineEntries)) {
                return;
            }
            scene.timelineEntries = timeline.filter(entry =>
                (!scene.startedClock || entry.clock >= scene.startedClock) &&
            (!scene.endedClock || entry.clock <= scene.endedClock),
            );
            if (!scene.timelineEntries.length) {
                scene.timelineEntries = [{
                    clock: scene.endedClock || scene.startedClock || state.clock,
                    label: scene.closureSummary || scene.summary || '场景已封存',
                }];
            }
            changed = true;
        });
        if (!state.sceneTransition || typeof state.sceneTransition !== 'object') {
            state.sceneTransition = {
                status: 'idle',
                tier: 'medium',
                error: '',
                requestedAt: null,
                settledAt: null,
            };
            changed = true;
        } else if (state.sceneTransition.status === 'resolving' &&
        !jobRegistry.sceneTransitionActive &&
        !jobRegistry.sceneTransition) {
            state.sceneTransition = {
                ...state.sceneTransition,
                status: 'failed',
                error: '上一次场景切换在提交前中断，请重新发起。',
            };
            changed = true;
        }
        if (!state.pacingDirector ||
        typeof state.pacingDirector !== 'object') {
            state.pacingDirector = {
                status: 'idle',
                error: '',
                lastAssessedTurn: null,
                lastAssessedSceneId: '',
                reassessAfterTurns: 3,
                assessment: null,
                pendingBeat: null,
            };
            changed = true;
        } else if (state.pacingDirector.status === 'assessing' &&
        !jobRegistry.pacing) {
            state.pacingDirector = {
                ...state.pacingDirector,
                status: 'failed',
                error: '上一次节奏评估在提交前中断，将在冷却后重试。',
                lastAssessedTurn: Number(state.turn?.count || 0),
                lastAssessedSceneId: state.scene?.id || '',
                reassessAfterTurns: 2,
            };
            changed = true;
        }
        if (!state.memoryDirector ||
        typeof state.memoryDirector !== 'object') {
            state.memoryDirector = {
                status: 'idle',
                error: '',
                lastReviewedTurn: 0,
                reviewAfterTurns: 10,
                reviewedActorIds: [],
                reviewedAt: null,
            };
            changed = true;
        } else if (
            state.memoryDirector.status === 'consolidating' &&
        !jobRegistry.memory
        ) {
            state.memoryDirector = {
                ...state.memoryDirector,
                status: 'failed',
                error:
                '上一次共同记忆整理在提交前中断，将在冷却后重试。',
                lastReviewedTurn:
                Number(state.turn?.count || 0),
                reviewAfterTurns: 10,
            };
            changed = true;
        }
        if (state.memoryDirector &&
        (
            Number(
                state.memoryDirector.reviewAfterTurns ||
                0,
            ) < 10 ||
            Number(
                state.memoryDirector.reviewAfterTurns ||
                0,
            ) > 20
        )) {
            state.memoryDirector.reviewAfterTurns = 10;
            if (!Number(
                state.memoryDirector.lastReviewedTurn || 0,
            )) {
                state.memoryDirector.lastReviewedTurn =
                Number(state.turn?.count || 0);
            }
            saveMetadataDebounced();
            changed = true;
        }
        if (state.sceneTransition?.status === 'failed' &&
        !state.sceneTransition.destinationHint) {
            const match = String(state.sceneTransition.error || '').match(
                /地图\s+([a-z0-9_.-]+)[\s\S]*?房间\s+([a-z0-9_.-]+)/i,
            );
            if (match) {
                state.sceneTransition.destinationHint =
                `前往${getRoomName(state, match[1], match[2])}`;
                state.sceneTransition.expectedDestination = {
                    mapId: match[1],
                    roomId: match[2],
                };
                changed = true;
            }
        }
        if (state.scene) {
            if (
                state.scene.id ===
                'settling_in_gryffindor_dormitory' &&
            /Gryffindor Common Room|格兰芬多公共休息室/iu
                .test(
                    `${state.scene.nameEn || ''} ${state.scene.name || ''}`,
                )
            ) {
                state.scene.nameEn =
                'Gryffindor Girls\' Dormitory — Settling In';
                state.scene.name =
                '格兰芬多女生宿舍 — 安顿下来';
                changed = true;
            }
            if (!state.scene.startedClock) {
                state.scene.startedClock = state.opening?.package?.clock ||
                state.timeline?.[0]?.clock ||
                state.clock;
                changed = true;
            }
            if (!Number.isInteger(state.scene.startedMessageId)) {
                const messageId = getContext().chat.findIndex(message =>
                    message.extra?.hogwartsMud?.sceneId === state.scene.id,
                );
                state.scene.startedMessageId = Math.max(0, messageId);
                changed = true;
            }
            if (!Array.isArray(state.scene.timelineEntries)) {
                state.scene.timelineEntries = timeline.filter(entry =>
                    !state.scene.startedClock ||
                entry.clock >= state.scene.startedClock,
                );
                if (!state.scene.timelineEntries.length) {
                    state.scene.timelineEntries = [{
                        clock: state.scene.startedClock || state.clock,
                        label: state.scene.summary || state.chapter || '当前场景',
                    }];
                }
                changed = true;
            }
            if (!state.sceneArchive.length &&
            state.scene.startedMessageId !== 0) {
                state.scene.startedMessageId = 0;
                changed = true;
            }
            if (!state.scene.mapId && state.map?.activeMapId) {
                state.scene.mapId = state.map.activeMapId;
                changed = true;
            }
            if (!state.scene.roomId && state.map?.currentLocalNodeId) {
                state.scene.roomId = state.map.currentLocalNodeId;
                changed = true;
            }
            if (!validateNextSceneIntent(
                state.scene.nextSceneIntent,
                state,
            ).valid) {
                state.scene.nextSceneIntent =
                createFallbackNextSceneIntent(state);
                changed = true;
            }
        }
        return changed;
    }

    return {
        ensureSceneLifecycleState,
    };
}
