export function createTranslationController(ports) {
    const {
        TRANSLATION_FORMAT_VERSION,
        automaticWork,
        composeSceneSegments,
        getContext,
        getMudState,
        getSettings,
        jobRegistry,
        localizeTurnTransaction,
        renderAll,
        scheduleRender,
        shouldTranslateToChinese,
        translateOpeningValues,
        translateWithProvider,
        updateNativeMessageBlock,
    } = ports;

    async function translateMessage(
        messageId,
        {
            force = false,
        } = {},
    ) {
        if (automaticWork.suppressed) {
            return;
        }
        const settings = getSettings();
        if (!settings.translationEnabled) {
            return;
        }
        const provider =
            settings.translationProvider;
        const context = getContext();
        const message = context.chat[messageId];
        if (!message || message.is_user || message.is_system || !message.mes) {
            return;
        }

        message.extra = message.extra && typeof message.extra === 'object' ? message.extra : {};
        if (!shouldTranslateToChinese(message.mes)) {
            if (message.extra.hogwartsMud?.sourceEn !== message.mes) {
                delete message.extra.hogwartsMud;
                delete message.extra.display_text;
                await context.saveChat();
                updateNativeMessageBlock(messageId, message);
                scheduleRender();
            }
            return;
        }
        const existing = message.extra.hogwartsMud;
        if (!force &&
            existing?.sourceEn === message.mes &&
            existing?.translatedZh &&
            existing?.provider === provider &&
            existing?.translationVersion === TRANSLATION_FORMAT_VERSION) {
            if (message.extra.display_text !== existing.translatedZh) {
                message.extra.display_text = existing.translatedZh;
                await context.saveChat();
                updateNativeMessageBlock(messageId, message);
                scheduleRender();
            }
            return;
        }
        if (jobRegistry.translation.has(messageId)) {
            return jobRegistry.translation.get(messageId);
        }

        const job = (async () => {
            try {
                const segments = message.extra.hogwartsMud?.segments;
                let translatedZh;
                if (Array.isArray(segments) && segments.length) {
                    const transaction = message.extra.hogwartsMud?.turnTransaction;
                    const localizedTransaction = transaction &&
                        !force
                        ? await localizeTurnTransaction(transaction)
                        : null;
                    const localizedSegments = localizedTransaction?.segments ||
                        (await translateOpeningValues(
                            segments.map(segment => segment.textEn),
                        )).map((textZh, index) => ({
                            ...segments[index],
                            textZh,
                        }));
                    translatedZh = composeSceneSegments(
                        localizedSegments,
                        [
                            ...(
                                getMudState()
                                    ?.actorLibrary ||
                                []
                            ),
                            ...(
                                getMudState()
                                    ?.actors ||
                                []
                            ),
                        ],
                        'zh',
                    );
                    message.extra.hogwartsMud = {
                        ...message.extra.hogwartsMud,
                        sourceEn: message.mes,
                        translatedZh,
                        provider,
                        translatedAt: Date.now(),
                        translationVersion: TRANSLATION_FORMAT_VERSION,
                        segments: localizedSegments,
                        ...(localizedTransaction
                            ? { turnTransaction: localizedTransaction }
                            : {}),
                    };
                } else {
                    translatedZh =
                        await translateWithProvider(
                            message.mes,
                            provider,
                        );
                    message.extra.hogwartsMud = {
                        ...message.extra.hogwartsMud,
                        sourceEn: message.mes,
                        translatedZh,
                        provider,
                        translatedAt: Date.now(),
                        translationVersion: TRANSLATION_FORMAT_VERSION,
                    };
                }
                message.extra.display_text = translatedZh;
                const swipeId = Number(message.swipe_id || 0);
                const activeSwipe = message.swipe_info?.[swipeId];
                if (activeSwipe?.extra && message.swipes?.[swipeId] === message.mes) {
                    activeSwipe.extra = {
                        ...activeSwipe.extra,
                        hogwartsMud: structuredClone(message.extra.hogwartsMud),
                        display_text: translatedZh,
                    };
                }
                await context.saveChat();
                updateNativeMessageBlock(messageId, message);
            } catch (error) {
                if (
                    error?.name ===
                    'SaveRevisionConflictError'
                ) {
                    return;
                }
                console.error('[Hogwarts MUD] Translation failed', error);
                message.extra.hogwartsMud = {
                    ...message.extra.hogwartsMud,
                    sourceEn: message.mes,
                    error: String(error?.message || error),
                    provider,
                };
                await context.saveChat();
            } finally {
                jobRegistry.translation.delete(messageId);
                scheduleRender();
            }
        })();

        jobRegistry.translation.set(messageId, job);
        scheduleRender();
        return job;
    }

    async function translateExistingMessages() {
        if (automaticWork.suppressed) {
            return;
        }
        const context = getContext();
        const state =
            getMudState();
        const startIndex =
            Math.max(
                0,
                Number(
                    state?.scene
                        ?.startedMessageId ??
                    0,
                ),
                context.chat.length -
                    12,
            );
        for (
            let index = startIndex;
            index <
                context.chat.length;
            index++
        ) {
            await translateMessage(index);
        }
    }

    async function translateCurrentStateAndLatestArchive() {
        const context =
            getContext();
        const state =
            getMudState();
        if (
            !state ||
            !getSettings()
                .translationEnabled
        ) {
            return;
        }
        const values = [];
        const setters = [];
        const add = (
            value,
            setter,
        ) => {
            if (
                String(
                    value || '',
                ).trim()
            ) {
                values.push(value);
                setters.push(setter);
            }
        };
        const scene =
            state.scene;
        if (scene) {
            add(
                scene.nameEn,
                value => {
                    scene.name =
                        value;
                },
            );
            add(
                scene.summaryEn,
                value => {
                    scene.summary =
                        value;
                },
            );
            add(
                scene.explorationHookEn,
                value => {
                    scene.explorationHook =
                        value;
                },
            );
            add(
                scene.crowdDirectionEn,
                value => {
                    scene.crowdDirection =
                        value;
                },
            );
            const intent =
                scene.nextSceneIntent;
            if (intent) {
                add(
                    intent.titleEn,
                    value => {
                        intent.title =
                            value;
                    },
                );
                add(
                    intent.summaryEn,
                    value => {
                        intent.summary =
                            value;
                    },
                );
                add(
                    intent.triggerEn,
                    value => {
                        intent.trigger =
                            value;
                    },
                );
            }
        }
        (
            state.actors ||
            []
        )
            .filter(actor =>
                actor.present !==
                    false)
            .forEach(actor =>
                add(
                    actor
                        .currentActivityEn,
                    value => {
                        actor.currentActivity =
                            value;
                    },
                ));
        const archive =
            state.sceneArchive
                ?.at(-1);
        if (archive) {
            archive.unresolvedThreads ??=
                [];
            add(
                archive.nameEn,
                value => {
                    archive.name =
                        value;
                },
            );
            add(
                archive.summaryEn,
                value => {
                    archive.summary =
                        value;
                },
            );
            add(
                archive.closureSummaryEn,
                value => {
                    archive.closureSummary =
                        value;
                },
            );
            add(
                archive.authorQuillEn,
                value => {
                    archive.authorQuill =
                        value;
                },
            );
            (
                archive
                    .unresolvedThreadsEn ||
                []
            ).forEach(
                (thread, index) =>
                    add(
                        thread,
                        value => {
                            archive
                                .unresolvedThreads[
                                    index
                                ] = value;
                        },
                    ),
            );
        }
        if (!values.length) {
            return;
        }
        const translated =
            await translateOpeningValues(
                values,
            );
        translated.forEach(
            (value, index) =>
                setters[index](
                    value,
                ),
        );
        if (
            scene &&
            scene.timelineEntries
                ?.length === 1
        ) {
            scene.timelineEntries[0]
                .label =
                scene.summary ||
                scene.summaryEn;
        }
        if (archive) {
            archive.translationProvider =
                getSettings()
                    .translationProvider;
            archive.translationVersion =
                TRANSLATION_FORMAT_VERSION;
            archive.translatedAt =
                Date.now();
        }
        await context.saveMetadata();
        renderAll();
    }

    async function refreshTranslationsForProvider() {
        await translateCurrentStateAndLatestArchive();
        await translateExistingMessages();
    }

    async function clearDisplayTranslations() {
        const context = getContext();
        let changed = false;
        context.chat.forEach((message, messageId) => {
            if (!message.extra?.hogwartsMud) {
                return;
            }
            delete message.extra.display_text;
            updateNativeMessageBlock(messageId, message);
            changed = true;
        });
        if (changed) {
            await context.saveChat();
        }
        scheduleRender();
    }

    return {
        translateMessage,
        translateExistingMessages,
        translateCurrentStateAndLatestArchive,
        refreshTranslationsForProvider,
        clearDisplayTranslations,
    };
}
