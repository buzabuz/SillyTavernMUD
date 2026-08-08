export function createTurnController(ports) {
    const {
        refs,
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
                '当前没有可回滚的已完成回合。',
            );
            renderAll();
            return;
        }
        if (
            jobRegistry.turnActive ||
            jobRegistry.sceneTransitionActive
        ) {
            toastr.warning(
                '世界状态仍在结算，请稍候。',
            );
            return;
        }
        if (
            !window.confirm(
                '回滚上一轮会删除对应的玩家消息与场景回复，并恢复提交前的世界状态。继续吗？',
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
                '已回滚上一轮；原输入已放回编辑框。',
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
            toastr.warning('首幕尚未完成，当前不能提交行动。');
            return;
        }
        if (
            getFailedPlayerTurn(
                getContext().chat,
                getMudState()?.turn,
            )
        ) {
            toastr.warning(
                '上一条玩家消息已经保存但尚未生成回复，请先重试本回合。',
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
            );
        if (!addressing.valid) {
            toastr.warning(
                addressing.error,
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
            getMudState()?.sceneTransition?.status === 'resolving' ||
            getMudState()?.directorFoundation?.status === 'building') {
            toastr.warning('世界状态仍在结算，请稍候。');
            return;
        }
        composerInput.value = '';
        composerInput.style.height = '';
        renderComposerAddressing();
        const context = getContext();
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
        await context.saveChat();
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
