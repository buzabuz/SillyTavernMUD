import {
    isStateRevisionCurrentOrModelTaskRuntimeOnly,
} from './save-revision.js';
import { createPostRecovery, emptyPostObservation, narrativeSourceIdentity } from './post-recovery.js';
import { validateTurnTransaction } from './turn-validation.js';

export const PENDING_POST_SETTLEMENT_VERSION = 2;

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
    recovery = null,
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
        recovery: recovery || createPostRecovery({
            ...emptyPostObservation(transactionDraft),
            postSettlementFailure: true,
            failureCode,
        }, transactionDraft),
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

export function upgradePendingPostSettlement(state, chat, pending) {
    if (pending?.version !== 1) return pending;
    if (!isPendingPostSettlementTail(chat, pending)
        || !isPendingPostSettlementCurrent(state, { ...pending, version: PENDING_POST_SETTLEMENT_VERSION })
        || !pending.preTurnCheckpoint
        || !Array.isArray(pending.transactionDraft?.segments)
        || !pending.transactionDraft.segments.length) {
        throw new Error('Legacy Post recovery lacks an authoritative source or checkpoint.');
    }
    const draft = structuredClone(pending.transactionDraft);
    const source = chat[pending.sceneMessageId]?.extra?.hogwartsMud?.segments;
    if (!Array.isArray(source) || narrativeSourceIdentity(source) !== narrativeSourceIdentity(draft.segments)) {
        throw new Error('Legacy Post recovery narrative changed.');
    }
    draft.narrativeFirst = true;
    draft.protocolVersion = 3;
    const fields = ['temporaryActorEntrances', 'actorUpdates', 'itemUpdates',
        'itemOperations', 'itemCandidates', 'materialEvents', 'identityObservations'];
    const candidates = Object.fromEntries(fields.map(field => [field, draft[field]]));
    for (const field of fields) draft[field] = [];
    // Legacy summaries may be synthesized excerpts, not evidence-bound Post proposals.
    draft.publicEventEn = '';
    draft.sceneProgression = null;
    draft.pacingBeatRealized = false;
    delete draft.eventKnowledge;
    delete draft.actorPresence;
    delete draft.perception;
    delete draft.participantActorIds;
    delete draft.witnessActorIds;
    for (const segment of draft.segments) delete segment.historicalClaims;
    const playerAction = String(chat[pending.playerMessageId]?.mes || '');
    for (const field of fields) {
        const limit = field === 'temporaryActorEntrances' ? 2 : 16;
        for (const candidate of (Array.isArray(candidates[field]) ? candidates[field] : []).slice(0, limit)) {
            const trial = { ...draft, [field]: [...draft[field], candidate] };
            if (validateTurnTransaction(trial, state, playerAction).valid) draft[field].push(candidate);
        }
    }
    const accepted = emptyPostObservation(draft);
    accepted.materialEvents = structuredClone(draft.materialEvents);
    accepted.identityObservations = structuredClone(draft.identityObservations);
    accepted.observation.result.temporaryActors = structuredClone(draft.temporaryActorEntrances);
    accepted.observation.result.actorUpdates = draft.actorUpdates.map(update => ({
        actorId: update.id, currentActivityEn: update.currentActivityEn,
    }));
    accepted.observation.result.inventoryUpdates = structuredClone([
        ...draft.itemUpdates, ...draft.itemOperations, ...draft.itemCandidates,
    ]);
    accepted.observation.result.materialEvents = structuredClone(draft.materialEvents);
    accepted.observation.result.identityObservations = structuredClone(draft.identityObservations);
    const recovery = createPostRecovery({
        ...accepted,
        postSettlementFailure: true,
        failureCode: 'legacy_candidates_unverified',
    }, draft);
    if (pending.retryCount > 0) recovery.supplement.status = 'spent';
    return {
        ...structuredClone(pending),
        version: PENDING_POST_SETTLEMENT_VERSION,
        transactionDraft: draft,
        recovery,
    };
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
                && [1, PENDING_POST_SETTLEMENT_VERSION].includes(
                    message.extra.hogwartsMud.pendingPostSettlement.version),
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
    const preTurnCheckpoint = legacy.preTurnCheckpoint || null;
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
                isTailPair && Boolean(preTurnCheckpoint) &&
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
    // Keep legacy candidates behind the same explicit V1 revalidation gate.
    sceneMessage.extra.hogwartsMud.pendingPostSettlement.version = 1;
    delete sceneMessage.extra.hogwartsMud.pendingPostSettlement.recovery;
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
