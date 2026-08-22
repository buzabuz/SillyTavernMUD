import {
    isStateRevisionCurrentOrModelTaskRuntimeOnly,
} from './save-revision.js';

export const PENDING_POST_SETTLEMENT_VERSION = 1;

function isPostPendingRevisionCurrent(
    state,
    expectedRevision,
) {
    if (
        isStateRevisionCurrentOrModelTaskRuntimeOnly(
            state,
            expectedRevision,
        )
    ) {
        return true;
    }
    const expected =
        Number(expectedRevision || 0);
    const current =
        Number(
            state?.stateRevision ||
            0,
        );
    if (
        !Number.isInteger(expected) ||
        !Number.isInteger(current) ||
        current <= expected
    ) {
        return false;
    }
    const entries =
        (
            state.revisionHistory ||
            []
        )
            .filter(entry =>
                Number(entry?.revision) >
                    expected &&
                Number(entry?.revision) <=
                    current,
            )
            .sort((left, right) =>
                Number(left.revision) -
                Number(right.revision),
            );
    if (entries.length !== current - expected) {
        return false;
    }
    let revision =
        expected;
    return entries.every(entry => {
        const domains =
            Array.isArray(
                entry?.changedDomains,
            )
                ? entry.changedDomains
                : [];
        const source =
            String(entry?.source || '');
        const valid =
            Number(entry?.baseRevision) ===
                revision &&
            Number(entry?.revision) ===
                revision + 1 &&
            (
                source ===
                    'model_task_runtime' ||
                source ===
                    'lifecycle_migration' ||
                (
                    source === 'metadata' &&
                    domains.length === 0
                )
            );
        revision += 1;
        return valid;
    });
}

function compactPromptDiagnostics(
    diagnostics,
) {
    const assembly =
        diagnostics ||
        {};
    return {
        provider:
            String(
                assembly.provider ||
                '',
            ),
        capacity:
            structuredClone(
                assembly.capacity ||
                {},
            ),
        fullMeasurement:
            structuredClone(
                assembly.fullMeasurement ||
                {},
            ),
        finalMeasurement:
            structuredClone(
                assembly.finalMeasurement ||
                {},
            ),
        compactedSections:
            structuredClone(
                assembly.compactedSections ||
                [],
            ),
    };
}

export function createPendingPostSettlement({
    state,
    playerMessageId,
    sceneMessageId,
    transactionDraft,
    movementPreflight = null,
    preTurnCheckpoint = null,
    provider = '',
    failureCode,
    promptAssembly = null,
    retryCount = 0,
    retryable = true,
    discardable = Boolean(
        preTurnCheckpoint,
    ),
}) {
    return {
        version: PENDING_POST_SETTLEMENT_VERSION,
        status: 'post_failed',
        playerMessageId,
        sceneMessageId,
        timelineEpoch:
            String(
                state?.timelineEpoch ||
                '',
            ),
        stateRevision:
            Number(
                state?.stateRevision ||
                0,
            ),
        sceneId:
            String(
                state?.scene?.id ||
                '',
            ),
        provider:
            String(provider || ''),
        transactionDraft:
            structuredClone(
                transactionDraft,
            ),
        movementPreflight:
            movementPreflight
                ? structuredClone(
                    movementPreflight,
                )
                : null,
        preTurnCheckpoint:
            preTurnCheckpoint
                ? structuredClone(
                    preTurnCheckpoint,
                )
                : null,
        promptAssembly:
            compactPromptDiagnostics(
                promptAssembly,
            ),
        retryCount:
            Math.max(
                0,
                Number(retryCount) || 0,
            ),
        retryable:
            retryable !== false,
        discardable:
            discardable === true,
        failureCode:
            String(
                failureCode ||
                'post_provider_failed',
            ),
    };
}

export function isPendingPostSettlementCurrent(
    state,
    pending,
) {
    return Boolean(
        pending &&
        pending.version ===
            PENDING_POST_SETTLEMENT_VERSION &&
        pending.timelineEpoch ===
            String(
                state?.timelineEpoch ||
                '',
            ) &&
        pending.sceneId ===
            String(
                state?.scene?.id ||
                '',
            ) &&
        isPostPendingRevisionCurrent(
            state,
            Number(
                pending.stateRevision ||
                0,
            ),
        ),
    );
}

export function isPendingPostSettlementTail(
    chat,
    pending,
) {
    if (
        !Array.isArray(chat) ||
        !pending ||
        !Number.isInteger(
            pending.playerMessageId,
        ) ||
        !Number.isInteger(
            pending.sceneMessageId,
        ) ||
        pending.playerMessageId !==
            chat.length - 2 ||
        pending.sceneMessageId !==
            chat.length - 1
    ) {
        return false;
    }
    const playerMessage =
        chat[pending.playerMessageId];
    const sceneMessage =
        chat[pending.sceneMessageId];
    return Boolean(
        playerMessage?.is_user === true &&
        playerMessage.extra
            ?.hogwartsMud?.role ===
            'player_turn' &&
        sceneMessage?.is_user !== true &&
        sceneMessage.extra
            ?.hogwartsMud?.role ===
            'scene_turn',
    );
}

export function findPendingPostSettlement(
    chat,
) {
    if (!Array.isArray(chat)) {
        return null;
    }
    const sceneMessageId =
        chat.findLastIndex(message =>
            message?.is_user !== true &&
            message?.extra
                ?.hogwartsMud
                ?.pendingPostSettlement
                ?.version ===
                PENDING_POST_SETTLEMENT_VERSION,
        );
    if (sceneMessageId < 0) {
        return null;
    }
    const sceneMessage =
        chat[sceneMessageId];
    return {
        sceneMessageId,
        sceneMessage,
        pending:
            sceneMessage.extra
                .hogwartsMud
                .pendingPostSettlement,
    };
}

function hasOnlyLifecycleOrRuntimeRevisions(
    state,
    expectedRevision,
) {
    const expected =
        Number(expectedRevision || 0);
    const current =
        Number(
            state?.stateRevision ||
            0,
        );
    if (
        !Number.isInteger(expected) ||
        !Number.isInteger(current) ||
        current <= expected
    ) {
        return false;
    }
    const entries =
        (
            state.revisionHistory ||
            []
        )
            .filter(entry =>
                Number(entry?.revision) >
                    expected &&
                Number(entry?.revision) <=
                    current,
            )
            .sort((left, right) =>
                Number(left.revision) -
                Number(right.revision),
            );
    if (entries.length !== current - expected) {
        return false;
    }
    let revision =
        expected;
    return entries.every(entry => {
        const source =
            String(entry?.source || '');
        const valid =
            Number(entry?.baseRevision) ===
                revision &&
            Number(entry?.revision) ===
                revision + 1 &&
            (
                [
                    'lifecycle_migration',
                    'model_task_runtime',
                ].includes(source) ||
                (
                    source === 'metadata' &&
                    Array.isArray(
                        entry?.changedDomains,
                    ) &&
                    entry.changedDomains.length === 0
                )
            );
        revision += 1;
        return valid;
    });
}

export function synchronizePendingPostSettlementRevision(
    state,
    chat,
) {
    const saved =
        findPendingPostSettlement(chat);
    const pending =
        saved?.pending;
    if (
        state?.turn?.status !==
            'post_unsettled' ||
        !pending ||
        !isPendingPostSettlementTail(
            chat,
            pending,
        ) ||
        !hasOnlyLifecycleOrRuntimeRevisions(
            state,
            pending.stateRevision,
        )
    ) {
        return false;
    }
    pending.stateRevision =
        Number(
            state.stateRevision ||
            0,
        );
    return true;
}

export function migrateLegacyPendingMovementSettlement(
    state,
    chat,
) {
    if (
        !state?.turn ||
        !Array.isArray(chat)
    ) {
        return {
            changed: false,
            state,
        };
    }
    const sceneMessageId =
        chat.findLastIndex(message =>
            message?.is_user !== true &&
            message?.extra
                ?.hogwartsMud
                ?.pendingTurnSettlement
                ?.version ===
                1,
        );
    if (sceneMessageId < 0) {
        return {
            changed: false,
            state,
        };
    }
    const sceneMessage =
        chat[sceneMessageId];
    const legacy =
        sceneMessage.extra
            .hogwartsMud
            .pendingTurnSettlement;
    const playerMessageId =
        Number.isInteger(
            legacy.playerMessageId,
        )
            ? legacy.playerMessageId
            : sceneMessageId - 1;
    const playerMessage =
        chat[playerMessageId];
    const isTailPair =
        playerMessageId ===
            chat.length - 2 &&
        sceneMessageId ===
            chat.length - 1 &&
        playerMessage?.is_user === true &&
        playerMessage.extra
            ?.hogwartsMud?.role ===
            'player_turn' &&
        sceneMessage?.is_user !== true &&
        sceneMessage.extra
            ?.hogwartsMud?.role ===
            'scene_turn';
    const baseState =
        structuredClone(state);
    delete baseState.turnRetry;
    baseState.turn = {
        ...(baseState.turn || {}),
        status: 'idle',
        error: '',
    };
    const preTurnCheckpoint =
        legacy.preTurnCheckpoint ||
        (
            isTailPair
                ? {
                    version: 1,
                    playerMessageId,
                    assistantMessageId:
                        sceneMessageId,
                    playerAction:
                        String(
                            playerMessage.mes ||
                            '',
                        ),
                    forceCheck:
                        Boolean(
                            playerMessage.extra
                                ?.hogwartsMud
                                ?.requiresCheck,
                        ),
                    baseClock: baseState.clock,
                    createdAt:
                        new Date().toISOString(),
                    baseState,
                }
                : null
        );
    sceneMessage.extra.hogwartsMud
        .pendingPostSettlement =
        createPendingPostSettlement({
            state,
            playerMessageId,
            sceneMessageId,
            transactionDraft:
                legacy.transactionDraft ||
                {},
            movementPreflight:
                legacy.movementPreflight ||
                null,
            preTurnCheckpoint,
            provider:
                state.postTurnSemanticProvider ||
                '',
            failureCode:
                legacy.failureCode ||
                'post_provider_failed',
            retryCount:
                legacy.retryCount ||
                0,
            retryable:
                isTailPair &&
                Boolean(
                    legacy.transactionDraft &&
                    typeof legacy
                        .transactionDraft ===
                        'object',
                ),
            discardable:
                Boolean(
                    isTailPair &&
                    preTurnCheckpoint,
                ),
        });
    delete sceneMessage.extra
        .hogwartsMud
        .pendingTurnSettlement;
    state.turn = {
        ...(state.turn || {}),
        status: 'post_unsettled',
        error: '',
    };
    return {
        changed: true,
        state,
    };
}
