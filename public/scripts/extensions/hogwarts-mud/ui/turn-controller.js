import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from '../domain/localized-view-model.js';

export function createTurnController(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        applySystemPrompt,
        createLegacyTurnRollbackCheckpoint,
        getActiveAddressingState,
        getAvailableTurnRollbackCheckpoint,
        getContext,
        getFailedPlayerTurn,
        getMudState,
        jobRegistry,
        parseSpellCastDirectives,
        renderAll,
        renderComposerAddressing,
        resolvePlayerAddressing,
        restoreTurnRetryCheckpoint,
        runStructuredTurn,
        syncLocalKnowledge,
    } = ports;

    const {
        composerInput,
    } = refs;

    function staticText(
        staticKey,
        sourceTextEn,
    ) {
        return getStaticLocaleText(
            staticKey,
            normalizeDisplayLocale(
                session.displayLocale,
            ),
        ) ||
            sourceTextEn;
    }

    async function rollbackLastTurn() {
        const context = getContext();
        const stateBefore = getMudState();
        const checkpoint =
            getAvailableTurnRollbackCheckpoint(
                stateBefore,
                context.chat,
            ) ||
            createLegacyTurnRollbackCheckpoint(
                stateBefore,
                context.chat,
            );
        const debugTraceId =
            `rollback-${Date.now()}`;
        // #region debug-point A:checkpoint-resolution
        void fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'rollback-latest-failure', runId: 'post-fix', hypothesisId: 'A', location: 'ui/turn-controller.js:rollbackLastTurn', msg: '[DEBUG] rollback checkpoint resolution', data: { turnStatus: stateBefore?.turn?.status || '', stateRevision: Number(stateBefore?.stateRevision || 0), timelineEpoch: String(stateBefore?.timelineEpoch || ''), chatLength: context.chat.length, rawCheckpointPresent: Boolean(stateBefore?.turnRetry), rawPlayerMessageId: stateBefore?.turnRetry?.playerMessageId ?? null, rawAssistantMessageId: stateBefore?.turnRetry?.assistantMessageId ?? null, checkpointAvailable: Boolean(checkpoint), checkpointVersion: checkpoint?.version ?? null }, traceId: debugTraceId, ts: Date.now() }) }).catch(() => {});
        // #endregion
        if (!checkpoint) {
            // #region debug-point D:no-checkpoint
            void fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'rollback-latest-failure', runId: 'post-fix', hypothesisId: 'D', location: 'ui/turn-controller.js:rollbackLastTurn', msg: '[DEBUG] rollback rejected without an eligible checkpoint', data: { turnStatus: stateBefore?.turn?.status || '', chatLength: context.chat.length, rawCheckpointPresent: Boolean(stateBefore?.turnRetry) }, traceId: debugTraceId, ts: Date.now() }) }).catch(() => {});
            // #endregion
            toastr.info(
                staticText(
                    'ui.turn.rollback.none',
                    'There is no completed turn to roll back.',
                ),
            );
            renderAll();
            return;
        }
        if (
            jobRegistry.turnActive ||
            jobRegistry.sceneTransitionActive
        ) {
            toastr.warning(
                staticText(
                    'ui.story.world_settling',
                    'World State is still settling. Please wait.',
                ),
            );
            return;
        }
        if (
            !window.confirm(
                staticText(
                    'ui.turn.rollback.confirm',
                    'Rolling back deletes the matching player message and Scene reply, then restores world State from before the turn. Continue?',
                ),
            )
        ) {
            return;
        }
        jobRegistry.turnActive = true;
        renderAll();
        try {
            const restored =
                restoreTurnRetryCheckpoint(
                    checkpoint,
                );
            const chatLengthBefore =
                context.chat.length;
            context.chat.splice(
                checkpoint
                    .playerMessageId,
            );
            // #region debug-point B:restore-and-splice
            void fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'rollback-latest-failure', runId: 'post-fix', hypothesisId: 'B', location: 'ui/turn-controller.js:rollbackLastTurn', msg: '[DEBUG] rollback restored checkpoint and removed tail messages', data: { priorRevision: Number(stateBefore?.stateRevision || 0), restoredRevision: Number(restored?.stateRevision || 0), priorEpoch: String(stateBefore?.timelineEpoch || ''), restoredEpoch: String(restored?.timelineEpoch || ''), playerMessageId: checkpoint.playerMessageId, assistantMessageId: checkpoint.assistantMessageId, chatLengthBefore, chatLengthAfter: context.chat.length }, traceId: debugTraceId, ts: Date.now() }) }).catch(() => {});
            // #endregion
            context.chatMetadata
                .hogwartsMud =
                restored;
            await context.saveMetadata();
            // #region debug-point E:metadata-save
            void fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'rollback-latest-failure', runId: 'post-fix', hypothesisId: 'E', location: 'ui/turn-controller.js:rollbackLastTurn', msg: '[DEBUG] rollback metadata save completed', data: { restoredRevision: Number(restored?.stateRevision || 0), chatLength: context.chat.length }, traceId: debugTraceId, ts: Date.now() }) }).catch(() => {});
            // #endregion
            await context.saveChat();
            // #region debug-point E:chat-save
            void fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'rollback-latest-failure', runId: 'post-fix', hypothesisId: 'E', location: 'ui/turn-controller.js:rollbackLastTurn', msg: '[DEBUG] rollback chat save completed', data: { chatLength: context.chat.length, restoredRevision: Number(restored?.stateRevision || 0) }, traceId: debugTraceId, ts: Date.now() }) }).catch(() => {});
            // #endregion
            // #region debug-point E:print-messages-start
            void fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'rollback-latest-failure', runId: 'post-fix', hypothesisId: 'E', location: 'ui/turn-controller.js:rollbackLastTurn', msg: '[DEBUG] rollback printMessages starting', data: { chatLength: context.chat.length }, traceId: debugTraceId, ts: Date.now() }) }).catch(() => {});
            // #endregion
            await context.printMessages();
            // #region debug-point E:print-messages-complete
            void fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'rollback-latest-failure', runId: 'post-fix', hypothesisId: 'E', location: 'ui/turn-controller.js:rollbackLastTurn', msg: '[DEBUG] rollback printMessages completed', data: { chatLength: context.chat.length }, traceId: debugTraceId, ts: Date.now() }) }).catch(() => {});
            // #endregion
            // #region debug-point E:knowledge-sync-start
            void fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'rollback-latest-failure', runId: 'post-fix', hypothesisId: 'E', location: 'ui/turn-controller.js:rollbackLastTurn', msg: '[DEBUG] rollback Knowledge sync starting', data: { stateRevision: Number(getMudState()?.stateRevision || 0) }, traceId: debugTraceId, ts: Date.now() }) }).catch(() => {});
            // #endregion
            await syncLocalKnowledge();
            // #region debug-point E:knowledge-sync-complete
            void fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'rollback-latest-failure', runId: 'post-fix', hypothesisId: 'E', location: 'ui/turn-controller.js:rollbackLastTurn', msg: '[DEBUG] rollback Knowledge sync completed', data: { stateRevision: Number(getMudState()?.stateRevision || 0) }, traceId: debugTraceId, ts: Date.now() }) }).catch(() => {});
            // #endregion
            applySystemPrompt();
            composerInput.value =
                checkpoint.playerAction;
            composerInput.dispatchEvent(
                new Event('input'),
            );
            toastr.success(
                staticText(
                    'ui.turn.rollback.done',
                    'Previous turn rolled back. The original input was restored to the editor.',
                ),
            );
            // #region debug-point E:rollback-complete
            void fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'rollback-latest-failure', runId: 'post-fix', hypothesisId: 'E', location: 'ui/turn-controller.js:rollbackLastTurn', msg: '[DEBUG] rollback completed through render and composer restore', data: { chatLength: context.chat.length, composerLength: composerInput.value.length, stateRevision: Number(getMudState()?.stateRevision || 0) }, traceId: debugTraceId, ts: Date.now() }) }).catch(() => {});
            // #endregion
        } catch (error) {
            // #region debug-point E:rollback-failure
            void fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'rollback-latest-failure', runId: 'post-fix', hypothesisId: 'E', location: 'ui/turn-controller.js:rollbackLastTurn', msg: '[DEBUG] rollback threw after checkpoint resolution', data: { errorName: String(error?.name || ''), errorMessage: String(error?.cause?.message || error?.message || error).slice(0, 500), chatLength: context.chat.length, stateRevision: Number(getMudState()?.stateRevision || 0) }, traceId: debugTraceId, ts: Date.now() }) }).catch(() => {});
            // #endregion
            toastr.error(
                String(
                    error?.cause?.message ||
                    error?.message ||
                    error,
                ),
            );
        } finally {
            jobRegistry.turnActive = false;
            renderAll();
        }
    }

    async function submitTurn(requireCheck = false) {
        if (getMudState()?.phase !== 'playing') {
            toastr.warning(
                staticText(
                    'ui.turn.opening_incomplete',
                    'The opening is not complete. Actions cannot be submitted yet.',
                ),
            );
            return;
        }
        if (
            getMudState()?.turn?.status ===
            'movement_unsettled'
        ) {
            toastr.warning(
                staticText(
                    'ui.story.movement_unsettled.blocked',
                    'Settle the saved movement before submitting another action.',
                ),
            );
            return;
        }
        if (
            getMudState()?.turn?.status ===
            'post_unsettled'
        ) {
            toastr.warning(
                staticText(
                    'ui.story.post_unsettled.blocked',
                    'Settle or discard the saved Scene before submitting another action.',
                ),
            );
            return;
        }
        if (
            getFailedPlayerTurn(
                getContext().chat,
                getMudState()?.turn,
            )
        ) {
            toastr.warning(
                staticText(
                    'ui.turn.reply_missing',
                    'The previous player message was saved without a reply. Retry that turn first.',
                ),
            );
            return;
        }
        const text = composerInput.value.trim();
        if (!text) {
            composerInput.focus();
            return;
        }
        const addressing =
            resolvePlayerAddressing(
                getActiveAddressingState(
                    getMudState(),
                ),
                text,
            );
        const spellCasts =
            parseSpellCastDirectives(
                text,
                getMudState(),
            );
        if (!addressing.valid) {
            toastr.warning(
                staticText(
                    'ui.game.address.invalid_detail',
                    'Put each directed line on its own line using the "@Character: dialogue" format.',
                ),
            );
            composerInput.focus();
            return;
        }
        if (jobRegistry.turnActive ||
            jobRegistry.sceneTransitionActive ||
            jobRegistry.interiorMap ||
            getMudState()?.map
                ?.interiorMapGeneration
                ?.status ===
                'generating' ||
            getMudState()?.sceneTransition?.status === 'resolving') {
            toastr.warning(
                staticText(
                    'ui.story.world_settling',
                    'World State is still settling. Please wait.',
                ),
            );
            return;
        }
        composerInput.value = '';
        composerInput.style.height = '';
        renderComposerAddressing();
        const context = getContext();
        const playerMessageId =
            context.chat.length;
        context.chat.push({
            name: context.name1 || 'User',
            is_user: true,
            is_system: false,
            send_date: new Date().toISOString(),
            mes: text,
            extra: {
                hogwartsMud: {
                    role: 'player_turn',
                    requiresCheck:
                        requireCheck ||
                        spellCasts.length >
                            0,
                    sceneId: getMudState()?.scene?.id,
                    spellCasts:
                        structuredClone(
                            spellCasts,
                        ),
                    addressing:
                        structuredClone(
                            addressing,
                        ),
                },
            },
        });
        try {
            await context.saveChat({
                source: 'turn_input',
            });
        } catch (error) {
            if (
                error?.name !==
                'SaveRevisionConflictError'
            ) {
                throw error;
            }
            context.chat.splice(
                playerMessageId,
                1,
            );
            composerInput.value =
                text;
            composerInput.dispatchEvent(
                new Event('input'),
            );
            renderAll();
            return;
        }
        renderAll();
        try {
            await runStructuredTurn(
                text,
                null,
                requireCheck,
            );
        } catch (error) {
            console.error('[Hogwarts MUD] Structured turn failed', error);
            toastr.error(String(error?.cause?.message || error?.message || error));
        }
    }

    return {
        rollbackLastTurn,
        submitTurn,
    };
}
