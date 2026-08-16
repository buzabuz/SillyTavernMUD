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
        const checkpoint =
            getAvailableTurnRollbackCheckpoint(
                getMudState(),
                context.chat,
            ) ||
            createLegacyTurnRollbackCheckpoint(
                getMudState(),
                context.chat,
            );
        if (!checkpoint) {
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
            context.chat.splice(
                checkpoint
                    .playerMessageId,
            );
            context.chatMetadata
                .hogwartsMud =
                restored;
            await context.saveMetadata();
            await context.saveChat();
            await context.printMessages();
            await syncLocalKnowledge();
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
        } catch (error) {
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
