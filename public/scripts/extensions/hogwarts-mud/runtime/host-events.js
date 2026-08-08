export function createHostEventBindings(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        applySystemPrompt,
        eventSource,
        event_types,
        getMudState,
        renderSaveLibrary,
        scheduleRender,
        setUiVisible,
        shouldTranslateRenderedMessage,
        syncModelSlotControls,
        translateMessage,
    } = ports;

    const {
        root,
    } = refs;

    let toolbarDisposer = null;

    function addToolbarButton() {
        if (toolbarDisposer) {
            return toolbarDisposer;
        }
        if (document.querySelector('#hpmud_toolbar_button')) {
            return () => {};
        }
        const target = document.querySelector('#extensionsMenu');
        if (!target) {
            return () => {};
        }
        const item = document.createElement('div');
        item.className = 'list-group-item hpmud-toolbar-item';
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'hpmud_toolbar_button';
        button.className = 'hpmud-toolbar-button';
        button.setAttribute('aria-label', 'Hogwarts MUD');
        button.innerHTML = '<div class="fa-solid fa-hat-wizard extensionsMenuExtensionButton"></div><span>Hogwarts MUD</span>';
        const onClick = () => setUiVisible(true);
        button.addEventListener('click', onClick);
        item.append(button);
        target.append(item);
        toolbarDisposer = () => {
            button.removeEventListener(
                'click',
                onClick,
            );
            item.remove();
            toolbarDisposer = null;
        };
        return toolbarDisposer;
    }

    function registerEvents() {
        const listeners = [];
        const on = (
            event,
            listener,
            makeLast = false,
        ) => {
            eventSource[
                makeLast ? 'makeLast' : 'on'
            ](event, listener);
            listeners.push({
                event,
                listener,
            });
        };
        on(event_types.APP_READY, () => {
            if (session.activeScreen === 'home') {
                void renderSaveLibrary();
            }
        });
        on(event_types.CHAT_CHANGED, () => {
            applySystemPrompt();
            syncModelSlotControls();
            scheduleRender();
        });
        for (const event of [
            event_types.CONNECTION_PROFILE_CREATED,
            event_types.CONNECTION_PROFILE_DELETED,
            event_types.CONNECTION_PROFILE_UPDATED,
        ]) {
            on(event, () => {
                if (root && !root.hidden) {
                    syncModelSlotControls();
                }
            });
        }
        on(event_types.CHARACTER_MESSAGE_RENDERED, async messageId => {
            scheduleRender();
            const normalizedMessageId =
                Number(messageId);
            if (
                !shouldTranslateRenderedMessage(
                    normalizedMessageId,
                    getMudState(),
                )
            ) {
                return;
            }
            await translateMessage(
                normalizedMessageId,
            );
        }, true);
        on(event_types.USER_MESSAGE_RENDERED, scheduleRender);
        on(event_types.MESSAGE_UPDATED, messageId => {
            scheduleRender();
            void translateMessage(Number(messageId));
        });
        on(event_types.MESSAGE_SWIPED, messageId => {
            scheduleRender();
            void translateMessage(Number(messageId));
        });
        on(event_types.MESSAGE_DELETED, scheduleRender);
        return () => {
            listeners.splice(0).forEach(({
                event,
                listener,
            }) => eventSource.removeListener(
                event,
                listener,
            ));
            hostEventsDisposer = null;
        };
    }

    let hostEventsDisposer = null;

    function registerHostEvents() {
        if (!hostEventsDisposer) {
            hostEventsDisposer =
                registerEvents();
        }
        return hostEventsDisposer;
    }

    return {
        addToolbarButton,
        registerHostEvents,
        unregisterHostEvents() {
            hostEventsDisposer?.();
        },
        removeToolbarButton() {
            toolbarDisposer?.();
        },
    };
}
