export function createDynamicObservationAdapter({
    fetchRequest,
    getRequestHeaders,
    runLocalModelTask,
}) {
    async function requestDynamicIdentityObservation(
        narrativeSegments,
        actors,
        checkResolution,
    ) {
        const targetActorId =
            String(
                checkResolution?.target
                    ?.actorId ||
                '',
            ).trim();
        if (
            !targetActorId ||
            !actors.some(actor =>
                actor.id ===
                targetActorId)
        ) {
            return {
                identityObservations: [],
                diagnostics: {
                    routed: false,
                    modelCalls: 0,
                },
            };
        }
        const inspectionTargetActorIds =
            checkResolution?.kind ===
                'perception'
                ? [targetActorId]
                : [];
        try {
            const response =
                await runLocalModelTask(
                    'local_dynamic_identity_observer',
                    () =>
                        fetchRequest(
                            '/api/hogwarts-mud/local/identity/observe',
                            {
                                method: 'POST',
                                headers:
                                    getRequestHeaders(),
                                body:
                                    JSON.stringify({
                                        input: {
                                            narrativeSegments,
                                            actors,
                                            identityTargetActorIds: [
                                                targetActorId,
                                            ],
                                            inspectionTargetActorIds,
                                        },
                                    }),
                            },
                        ),
                    {
                        eventType:
                            'turn.post_commit',
                        emittedBy:
                            'turn.dynamic_identity_observation',
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
            return {
                identityObservations:
                    Array.isArray(
                        payload?.result
                            ?.identityObservations,
                    )
                        ? payload.result
                            .identityObservations
                        : [],
                diagnostics:
                    payload?.diagnostics ||
                    {},
            };
        } catch (error) {
            console.warn(
                '[Hogwarts MUD] Dynamic Identity observation unavailable; omitting injury proposal',
                error,
            );
            return {
                identityObservations: [],
                diagnostics: {
                    routed: true,
                    modelCalls: 1,
                    error:
                        String(
                            error?.message ||
                            error,
                        ).slice(0, 500),
                },
            };
        }
    }

    async function requestDynamicInventoryObservation(
        playerAction,
        narrativeSegments,
        inventory,
        inventoryObservationRequired,
    ) {
        if (
            inventoryObservationRequired !==
            true
        ) {
            return {
                inventoryUpdates: [],
                diagnostics: {
                    routed: false,
                    modelCalls: 0,
                },
            };
        }
        try {
            const response =
                await runLocalModelTask(
                    'local_inventory_observer',
                    () =>
                        fetchRequest(
                            '/api/hogwarts-mud/local/inventory/observe',
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
                                            narrativeSegments,
                                            inventory,
                                        },
                                    }),
                            },
                        ),
                    {
                        eventType:
                            'turn.post_commit',
                        emittedBy:
                            'turn.dynamic_inventory_observation',
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
            return {
                inventoryUpdates:
                    Array.isArray(
                        payload?.result
                            ?.inventoryUpdates,
                    )
                        ? payload.result
                            .inventoryUpdates
                        : [],
                diagnostics:
                    payload?.diagnostics ||
                    {},
            };
        } catch (error) {
            console.warn(
                '[Hogwarts MUD] Dynamic Inventory observation unavailable; omitting Item proposals',
                error,
            );
            return {
                inventoryUpdates: [],
                diagnostics: {
                    routed: true,
                    modelCalls: 1,
                    error:
                        String(
                            error?.message ||
                            error,
                        ).slice(0, 500),
                },
            };
        }
    }

    async function requestDynamicTurnObservation(
        playerAction,
        narrativeSegments,
        actors,
        inventory,
        checkResolution,
        inventoryObservationRequired,
    ) {
        const targetActorId =
            String(
                checkResolution
                    ?.target
                    ?.actorId ||
                '',
            ).trim();
        const identityRouted =
            Boolean(
                targetActorId &&
                actors.some(actor =>
                    actor.id ===
                    targetActorId),
            );
        const inventoryRouted =
            inventoryObservationRequired ===
            true;
        if (
            !identityRouted &&
            !inventoryRouted
        ) {
            return {
                identityObservations: [],
                inventoryUpdates: [],
                diagnostics: {
                    routed: false,
                    requestedTasks: [],
                    modelCalls: 0,
                    identity: {},
                    inventory: {},
                },
            };
        }
        const inspectionTargetActorIds =
            checkResolution?.kind ===
                'perception' &&
            identityRouted
                ? [targetActorId]
                : [];
        try {
            const response =
                await runLocalModelTask(
                    'local_dynamic_turn_observer',
                    () =>
                        fetchRequest(
                            '/api/hogwarts-mud/local/dynamic/observe',
                            {
                                method: 'POST',
                                headers:
                                    getRequestHeaders(),
                                body:
                                    JSON.stringify({
                                        input: {
                                            identity:
                                                identityRouted
                                                    ? {
                                                        narrativeSegments,
                                                        actors,
                                                        identityTargetActorIds: [
                                                            targetActorId,
                                                        ],
                                                        inspectionTargetActorIds,
                                                    }
                                                    : null,
                                            inventory:
                                                inventoryRouted
                                                    ? {
                                                        playerAction:
                                                            String(
                                                                playerAction ||
                                                                '',
                                                            ),
                                                        narrativeSegments,
                                                        inventory,
                                                    }
                                                    : null,
                                        },
                                    }),
                            },
                        ),
                    {
                        eventType:
                            'turn.post_commit',
                        emittedBy:
                            'turn.dynamic_observation',
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
            return {
                identityObservations:
                    Array.isArray(
                        payload?.result
                            ?.identityObservations,
                    )
                        ? payload.result
                            .identityObservations
                        : [],
                inventoryUpdates:
                    Array.isArray(
                        payload?.result
                            ?.inventoryUpdates,
                    )
                        ? payload.result
                            .inventoryUpdates
                        : [],
                diagnostics:
                    payload?.diagnostics ||
                    {},
            };
        } catch (error) {
            console.warn(
                '[Hogwarts MUD] Shared dynamic Turn observation unavailable; omitting routed proposals',
                error,
            );
            return {
                identityObservations: [],
                inventoryUpdates: [],
                diagnostics: {
                    routed: true,
                    requestedTasks: [
                        ...(inventoryRouted
                            ? ['inventory']
                            : []),
                        ...(identityRouted
                            ? ['identity']
                            : []),
                    ],
                    modelCalls: 1,
                    identity: {},
                    inventory: {},
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
        requestDynamicIdentityObservation,
        requestDynamicInventoryObservation,
        requestDynamicTurnObservation,
    };
}
