import {
    SETUP_STEPS,
} from './setup-controller.js';
import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from '../domain/localized-view-model.js';

export function createUiBindings(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        DEFAULT_WORLD_PROMPT,
        DIFFICULTY_PRESETS,
        MANUAL_MODEL_VALUE,
        applyContextSizePreset,
        applySystemPrompt,
        beginNewGame,
        clearComposerAddressTarget,
        clearComposerSpell,
        clearDisplayTranslations,
        clearTemporaryProfileSecret,
        closeMovementPicker,
        closeSpellPicker,
        collectModelSlots,
        createItemOperationDirective,
        closeCalendar,
        deleteProfileEditor,
        getSelectedProfileForEditing,
        getSettings,
        getSetupControl,
        importPreset,
        importRegexFiles,
        importRoleChatPreset,
        importRoleRegexPreset,
        insertAtCursor,
        isGameStarted,
        normalizeTranslationProvider,
        openCalendar,
        openMovementPicker,
        openProfileEditor,
        openSceneTransitionDialog,
        openSpellPicker,
        persistModelSlots,
        persistPostTurnSemanticProvider,
        polishCharacterBackground,
        refreshTranslationsForProvider,
        renderComposerAddressing,
        renderComposerSpellPreview,
        renderInspector,
        renderMovementPicker,
        renderSaveLibrary,
        renderSetupMap,
        renderSpellPicker,
        rollbackLastTurn,
        runSceneTransition,
        saveInGameModelConfigAndReturn,
        saveProfileEditor,
        saveSettingsDebounced,
        saveSetupDraft,
        selectCampaign,
        setCalendarView,
        setAppScreen,
        setControlValue,
        setDisplayLocale,
        setTranslationProvider,
        showSetupStep,
        startGameFromSetup,
        submitTurn,
        syncContextPolicyUi,
        syncManualModelVisibility,
        syncProfileEndpointWarning,
        syncModelSlotControls,
        syncProfileEndpointVisibility,
        syncSettingsUi,
        testProfileConnection,
        handleCalendarDialogClose,
        handleCalendarKeyDown,
        shiftCalendarMonth,
        updateAttributeTotal,
        updateCampaign,
        updateSceneDestinationStatus,
    } = ports;

    const {
        root,
        composerInput,
        settingsDialog,
        profileEditorDialog,
        sceneTransitionDialog,
        sceneArchiveDialog,
        calendarDialog,
        workspaceElement,
        setupForm,
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

    function formatStaticText(
        staticKey,
        sourceTextEn,
        values = {},
    ) {
        return Object.entries(
            values,
        ).reduce(
            (
                text,
                [
                    key,
                    value,
                ],
            ) =>
                text.replaceAll(
                    `{${key}}`,
                    String(value),
                ),
            staticText(
                staticKey,
                sourceTextEn,
            ),
        );
    }

    function bindUi() {
        listen(root.querySelector('#hpmud_open_home'), 'click', () => setAppScreen('home'));
        listen(root.querySelector('#hpmud_new_game'), 'click', () => void beginNewGame());
        listen(root.querySelector('#hpmud_refresh_saves'), 'click', () => void renderSaveLibrary());
        root.querySelectorAll('[data-campaign]').forEach(button => {
            listen(button, 'click', () => selectCampaign(button.dataset.campaign));
        });
        listen(root.querySelector('#hpmud_campaign_year'), 'change', event => {
            updateCampaign({ startYear: Number(event.target.value) });
        });
        listen(root.querySelector('#hpmud_campaign_grade'), 'change', event => {
            updateCampaign({ grade: Number(event.target.value) });
        });
        root.querySelectorAll('[data-difficulty]').forEach(button => {
            listen(button, 'click', () => {
                if (DIFFICULTY_PRESETS[button.dataset.difficulty]) {
                    updateCampaign({ difficulty: button.dataset.difficulty });
                }
            });
        });
        listen(root.querySelector('#hpmud_reopen_setup'), 'click', () => {
            session.activeSetupStep = 'identity';
            setAppScreen('setup');
        });
        listen(root.querySelector('#hpmud_reopen_models'), 'click', () => {
            session.activeSetupStep = 'models';
            setAppScreen('setup');
        });
        listen(root.querySelector('#hpmud_open_settings'), 'click', () => {
            syncSettingsUi();
            settingsDialog.showModal();
        });
        listen(root.querySelector('#hpmud_calendar'), 'click',
            () => openCalendar());
        listen(root.querySelector('#hpmud_calendar_close'), 'click',
            closeCalendar);
        listen(root.querySelector('#hpmud_calendar_previous_month'), 'click',
            () => shiftCalendarMonth(-1));
        listen(root.querySelector('#hpmud_calendar_next_month'), 'click',
            () => shiftCalendarMonth(1));
        root.querySelectorAll('[data-calendar-view]').forEach(button => {
            listen(button, 'click',
                () => setCalendarView(button.dataset.calendarView, {
                    focus: true,
                }));
        });
        listen(calendarDialog, 'cancel', event => {
            event.preventDefault();
            closeCalendar();
        });
        listen(calendarDialog, 'close',
            handleCalendarDialogClose);
        listen(
            calendarDialog,
            'keydown',
            handleCalendarKeyDown,
            true,
        );
        listen(calendarDialog, 'click', event => {
            if (event.target === calendarDialog) {
                closeCalendar();
            }
        });
        root.querySelectorAll(
            '[data-hpmud-translation-provider]',
        ).forEach(button => {
            listen(button, 'click',
                () => setTranslationProvider(
                    button.dataset
                        .hpmudTranslationProvider,
                ),
            );
        });
        root.querySelectorAll(
            '[data-hpmud-display-locale]',
        ).forEach(button => {
            listen(
                button,
                'click',
                () =>
                    setDisplayLocale(
                        button.dataset
                            .hpmudDisplayLocale,
                    ),
            );
        });
        root.querySelectorAll('[data-hpmud-step]').forEach(button => {
            listen(button, 'click', () => {
                saveSetupDraft();
                showSetupStep(button.dataset.hpmudStep);
            });
        });
        listen(root.querySelector('#hpmud_setup_previous'), 'click', () => {
            const steps =
                SETUP_STEPS;
            saveSetupDraft();
            showSetupStep(steps[Math.max(0, steps.indexOf(session.activeSetupStep) - 1)]);
        });
        listen(root.querySelector('#hpmud_setup_next'), 'click', () => {
            const steps =
                SETUP_STEPS;
            saveSetupDraft();
            showSetupStep(steps[Math.min(steps.length - 1, steps.indexOf(session.activeSetupStep) + 1)]);
        });
        listen(root.querySelector('#hpmud_setup_return_game'), 'click', () => {
            void saveInGameModelConfigAndReturn().catch(error => {
                console.error(
                    '[Hogwarts MUD] Failed to save in-game model config',
                    error,
                );
                toastr.error(
                    String(error?.message || error),
                );
            });
        });
        root.querySelectorAll(
            '[data-hpmud-context-preset]',
        ).forEach(button => {
            listen(button, 'click', () => {
                applyContextSizePreset(
                    button.dataset.hpmudContextPreset,
                );
            });
        });
        listen(root.querySelector('#hpmud_setup_map_scope'), 'change', event => {
            session.setupMapScope = event.target.value;
            session.setupMapLevel = '';
            renderSetupMap();
        });
        listen(root.querySelector('#hpmud_setup_map_level'), 'change', event => {
            session.setupMapLevel = event.target.value;
            renderSetupMap();
        });
        listen(setupForm, 'input', event => {
            if (event.target.matches('input[type="number"][name^="attr_"]')) {
                updateAttributeTotal();
            }
            saveSetupDraft();
        });
        listen(setupForm, 'submit', event => {
            event.preventDefault();
            void startGameFromSetup().catch(error => {
                console.error('[Hogwarts MUD] Failed to start game', error);
                toastr.error(String(error?.message || error));
            });
        });
        listen(root.querySelector('#hpmud_polish_background'), 'click', () => void polishCharacterBackground());
        listen(root.querySelector('#hpmud_refresh_profiles'), 'click', syncModelSlotControls);
        listen(root.querySelector('#hpmud_create_profile'), 'click', () => {
            const role = ['low', 'medium', 'high'].find(item => !getSetupControl(`profile_${item}`)?.value) || '';
            openProfileEditor(null, role);
        });
        listen(root.querySelector('#hpmud_edit_profile'), 'click', () => {
            const { profile, role } = getSelectedProfileForEditing();
            if (!profile) {
                toastr.warning(
                    staticText(
                        'ui.bindings.profile_select_first',
                        'Select a Connection Profile in any role slot first.',
                    ),
                );
                return;
            }
            openProfileEditor(profile, role);
        });
        root.querySelectorAll('[data-hpmud-profile-slot]').forEach(select => {
            listen(select, 'change', () => {
                persistModelSlots(collectModelSlots());
                syncModelSlotControls();
            });
        });
        listen(
            root.querySelector(
                '[data-hpmud-post-semantic-provider]',
            ),
            'change',
            event => {
                persistPostTurnSemanticProvider(
                    event.currentTarget.value,
                );
                syncModelSlotControls();
            },
        );
        root.querySelectorAll('[data-hpmud-preset-slot], [data-hpmud-regex-slot]').forEach(select => {
            listen(select, 'change', () => persistModelSlots(collectModelSlots()));
        });
        for (const role of ['low', 'medium', 'high']) {
            for (const name of [`context_${role}`, `response_${role}`]) {
                listen(getSetupControl(name), 'change', () => {
                    const slots = persistModelSlots(collectModelSlots());
                    setControlValue(`context_${role}`, slots[role].contextSize);
                    setControlValue(`response_${role}`, slots[role].maxResponseLength);
                    syncContextPolicyUi(slots);
                });
            }
        }
        root.querySelectorAll('[data-hpmud-import-preset-role]').forEach(button => {
            listen(button, 'click', () => {
                session.rolePresetImportTarget = button.dataset.hpmudImportPresetRole;
                root.querySelector('#hpmud_role_preset_file').click();
            });
        });
        listen(root.querySelector('#hpmud_role_preset_file'), 'change', async event => {
            const file = event.target.files?.[0];
            const role = session.rolePresetImportTarget;
            if (!file || !role) return;
            try {
                const name = await importRoleChatPreset(file, role);
                toastr.success(
                    formatStaticText(
                        'ui.bindings.chat_preset_imported',
                        'Chat Completion Preset "{name}" imported and bound to this role.',
                        {
                            name,
                        },
                    ),
                );
            } catch (error) {
                console.error('[Hogwarts MUD] Role preset import failed', error);
                toastr.error(String(error?.message || error));
            } finally {
                session.rolePresetImportTarget = '';
                event.target.value = '';
            }
        });
        root.querySelectorAll('[data-hpmud-import-regex-role]').forEach(button => {
            listen(button, 'click', () => {
                session.roleRegexImportTarget = button.dataset.hpmudImportRegexRole;
                root.querySelector('#hpmud_role_regex_file').click();
            });
        });
        listen(root.querySelector('#hpmud_role_regex_file'), 'change', async event => {
            const file = event.target.files?.[0];
            const role = session.roleRegexImportTarget;
            if (!file || !role) return;
            try {
                const preset = await importRoleRegexPreset(file, role);
                toastr.success(
                    formatStaticText(
                        'ui.bindings.regex_preset_imported',
                        'Regex Preset "{name}" imported and bound to this role.',
                        {
                            name:
                                preset.name,
                        },
                    ),
                );
            } catch (error) {
                console.error('[Hogwarts MUD] Role regex import failed', error);
                toastr.error(String(error?.message || error));
            } finally {
                session.roleRegexImportTarget = '';
                event.target.value = '';
            }
        });
        listen(root.querySelector('#hpmud_profile_source'), 'change', syncProfileEndpointVisibility);
        listen(root.querySelector('#hpmud_profile_endpoint'), 'input', syncProfileEndpointWarning);
        listen(root.querySelector('#hpmud_profile_model'), 'change', () => {
            syncManualModelVisibility();
            if (root.querySelector('#hpmud_profile_model').value === MANUAL_MODEL_VALUE) {
                root.querySelector('#hpmud_profile_manual_model').focus();
            }
        });
        listen(root.querySelector('#hpmud_profile_cancel'), 'click', async () => {
            await clearTemporaryProfileSecret();
            profileEditorDialog.close();
        });
        listen(profileEditorDialog, 'cancel', event => {
            event.preventDefault();
            void clearTemporaryProfileSecret().finally(() => profileEditorDialog.close());
        });
        listen(root.querySelector('#hpmud_profile_form'), 'submit', event => {
            event.preventDefault();
            void saveProfileEditor().catch(error => {
                console.error('[Hogwarts MUD] Profile save failed', error);
                toastr.error(String(error?.message || error));
            });
        });
        listen(root.querySelector('#hpmud_profile_test'), 'click', () => {
            void testProfileConnection().catch(error => {
                console.error('[Hogwarts MUD] Profile test failed', error);
                root.querySelector(
                    '#hpmud_profile_test_status',
                ).textContent =
                    staticText(
                        'ui.bindings.connection_failed',
                        'Connection failed',
                    );
                toastr.error(String(error?.message || error));
            });
        });
        listen(root.querySelector('#hpmud_profile_delete'), 'click', () => {
            void deleteProfileEditor().catch(error => {
                console.error('[Hogwarts MUD] Profile deletion failed', error);
                toastr.error(String(error?.message || error));
            });
        });
        listen(root.querySelector('#hpmud_scene_collapse'), 'click', () => {
            root.classList.remove('scene-open');
            root.classList.add('scene-collapsed');
        });
        listen(root.querySelector('#hpmud_scene_restore'), 'click', () => {
            root.classList.remove('scene-collapsed');
            if (matchMedia('(max-width: 1080px)').matches) {
                root.classList.add('scene-open');
            }
        });
        listen(root.querySelector('#hpmud_end_scene'), 'click',
            openSceneTransitionDialog,
        );
        listen(root.querySelector('#hpmud_transition_destination'), 'input',
            updateSceneDestinationStatus,
        );
        for (const id of [
            '#hpmud_scene_transition_cancel',
            '#hpmud_scene_transition_back',
        ]) {
            listen(root.querySelector(id), 'click', () =>
                sceneTransitionDialog.close());
        }
        listen(root.querySelector('#hpmud_scene_transition_form'), 'submit',
            event => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const tier = form.get('scene_transition_tier') === 'high'
                    ? 'high'
                    : 'medium';
                const destinationHint = root
                    .querySelector('#hpmud_transition_destination')
                    .value
                    .trim();
                sceneTransitionDialog.close();
                void runSceneTransition({
                    tier,
                    destinationHint,
                }).catch(error => {
                    console.error('[Hogwarts MUD] Scene transition failed', error);
                    toastr.error(String(error?.cause?.message || error?.message || error));
                });
            },
        );
        listen(root.querySelector('#hpmud_archive_close'), 'click',
            () => sceneArchiveDialog.close(),
        );
        listen(root.querySelector('#hpmud_focus'), 'click', event => {
            root.classList.toggle('focus-mode');
            event.currentTarget.textContent =
                root.classList.contains(
                    'focus-mode',
                )
                    ? staticText(
                        'ui.game.focus.exit',
                        'Exit focus',
                    )
                    : staticText(
                        'ui.game.focus.enter',
                        'Focus',
                    );
        });
        listen(root.querySelector('#hpmud_character'), 'click', () => {
            if (isGameStarted() && workspaceElement.hidden === false) {
                const open =
                    root.classList.toggle(
                        'hpmud-inspector-open',
                    );
                root.querySelector(
                    '#hpmud_character',
                )?.setAttribute(
                    'aria-expanded',
                    String(open),
                );
                renderInspector('character');
            }
        });
        root.querySelectorAll('[data-hpmud-tab]').forEach(button => {
            listen(button, 'click', () => renderInspector(button.dataset.hpmudTab));
        });
        root.querySelectorAll('[data-hpmud-inspector]').forEach(button => {
            listen(button, 'click', () => {
                root.classList.add(
                    'hpmud-inspector-open',
                );
                renderInspector(
                    button.dataset
                        .hpmudInspector,
                );
            });
        });
        root.querySelectorAll('[data-hpmud-template]').forEach(button => {
            listen(button, 'click', () => {
                const templates = {
                    speech: ['“……”', 1],
                    action: ['我……', 1],
                    thought: ['我心里想：……', 5],
                };
                const [text, caret] = templates[button.dataset.hpmudTemplate];
                insertAtCursor(text, caret);
                button.closest('details').removeAttribute('open');
            });
        });
        root.querySelectorAll(
            '[data-hpmud-item-operation]',
        ).forEach(button => {
            listen(button, 'click', () => {
                const directive =
                    createItemOperationDirective(
                        button.dataset
                            .hpmudItemOperation,
                    );
                if (!directive) {
                    return;
                }
                insertAtCursor(
                    directive,
                );
                button.closest(
                    'details',
                ).removeAttribute(
                    'open',
                );
                root.classList.add(
                    'hpmud-inspector-open',
                );
                root.querySelector(
                    '#hpmud_character',
                )?.setAttribute(
                    'aria-expanded',
                    'true',
                );
                renderInspector(
                    'items',
                );
                toastr.info(
                    staticText(
                        'ui.game.item.operation_inserted',
                        'Operation inserted. Reference the target from the Item archive.',
                    ),
                );
            });
        });
        listen(root.querySelector(
            '#hpmud_insert_spell',
        ), 'click',
        openSpellPicker,
        );
        listen(root.querySelector(
            '#hpmud_close_spell',
        ), 'click',
        closeSpellPicker,
        );
        listen(root.querySelector(
            '#hpmud_spell_search',
        ), 'input',
        event =>
            renderSpellPicker(
                event.currentTarget
                    .value,
            ),
        );
        listen(root.querySelector(
            '#hpmud_spell_show_all',
        ), 'click',
        () => {
            session.spellPickerShowAll =
                    !session.spellPickerShowAll;
            renderSpellPicker(
                root.querySelector(
                    '#hpmud_spell_search',
                ).value,
            );
        },
        );
        listen(root.querySelector(
            '#hpmud_clear_spell',
        ), 'click',
        clearComposerSpell,
        );
        const movementButton =
            root.querySelector(
                '#hpmud_insert_movement',
            );
        listen(movementButton, 'click',
            openMovementPicker,
        );
        listen(root.querySelector(
            '#hpmud_close_movement',
        ), 'click',
        closeMovementPicker,
        );
        listen(root.querySelector(
            '#hpmud_custom_movement',
        ), 'click',
        () => {
            closeMovementPicker();
            insertAtCursor(
                '→【】',
                2,
            );
        },
        );
        listen(root.querySelector(
            '#hpmud_movement_search',
        ), 'input',
        event =>
            renderMovementPicker(
                event.currentTarget
                    .value,
            ),
        );
        listen(root, 'click',
            event => {
                const picker =
                    root.querySelector(
                        '#hpmud_movement_picker',
                    );
                const panel =
                    root.querySelector(
                        '#hpmud_movement_panel',
                    );
                if (
                    !panel.hidden &&
                    !picker.contains(
                        event.target,
                    )
                ) {
                    closeMovementPicker();
                }
                const spellPicker =
                    root.querySelector(
                        '#hpmud_spell_picker',
                    );
                const spellPanel =
                    root.querySelector(
                        '#hpmud_spell_panel',
                    );
                if (
                    !spellPanel.hidden &&
                    !spellPicker.contains(
                        event.target,
                    )
                ) {
                    closeSpellPicker();
                }
            },
        );
        listen(root, 'keydown',
            event => {
                if (
                    event.key ===
                        'Escape' &&
                    !root.querySelector(
                        '#hpmud_movement_panel',
                    ).hidden
                ) {
                    event.preventDefault();
                    closeMovementPicker();
                    movementButton.focus();
                } else if (
                    event.key ===
                        'Escape' &&
                    !root.querySelector(
                        '#hpmud_spell_panel',
                    ).hidden
                ) {
                    event.preventDefault();
                    closeSpellPicker();
                    root.querySelector(
                        '#hpmud_insert_spell',
                    ).focus();
                }
            },
        );
        listen(root.querySelector(
            '#hpmud_clear_address',
        ), 'click',
        clearComposerAddressTarget,
        );
        listen(root.querySelector('#hpmud_composer'), 'submit', event => {
            event.preventDefault();
            submitTurn(false);
        });
        listen(root.querySelector('#hpmud_check'), 'click', () => submitTurn(true));
        listen(root.querySelector(
            '#hpmud_rollback_turn',
        ), 'click',
        () => {
            void rollbackLastTurn();
        },
        );
        listen(composerInput, 'input', () => {
            composerInput.style.height = 'auto';
            composerInput.style.height = `${Math.min(composerInput.scrollHeight, 150)}px`;
            renderComposerAddressing();
            renderComposerSpellPreview();
        });
        listen(composerInput, 'keydown', event => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                submitTurn(false);
            }
        });

        listen(root.querySelector('#hpmud_save_settings'), 'click', () => {
            const settings = getSettings();
            settings.enabled = root.querySelector('#hpmud_prompt_enabled').checked;
            settings.translationProvider =
                normalizeTranslationProvider(
                    root.querySelector(
                        '#hpmud_translation_provider',
                    ).value,
                );
            settings.translationEnabled =
                settings.translationProvider !==
                'off';
            settings.worldPrompt = root.querySelector('#hpmud_world_prompt').value.trim() || DEFAULT_WORLD_PROMPT;
            saveSettingsDebounced();
            syncSettingsUi();
            applySystemPrompt();
            if (settings.translationEnabled) {
                void refreshTranslationsForProvider();
            } else {
                void clearDisplayTranslations();
            }
        });

        listen(root.querySelector('#hpmud_import_preset'), 'click', () => root.querySelector('#hpmud_preset_file').click());
        listen(root.querySelector('#hpmud_preset_file'), 'change', async event => {
            const file = event.target.files?.[0];
            if (!file) return;
            const status = root.querySelector('#hpmud_preset_status');
            status.textContent =
                staticText(
                    'ui.bindings.importing',
                    'Importing...',
                );
            try {
                const result = await importPreset(file);
                const stripped =
                    result.removed.length
                        ? formatStaticText(
                            'ui.bindings.sensitive_removed',
                            ' · Removed {count} sensitive fields',
                            {
                                count:
                                    result.removed.length,
                            },
                        )
                        : '';
                status.textContent = `${result.name} · ${result.apiId}${stripped}`;
                toastr.success(
                    formatStaticText(
                        'ui.bindings.preset_imported',
                        'Preset "{name}" imported.',
                        {
                            name:
                                result.name,
                        },
                    ),
                );
            } catch (error) {
                console.error('[Hogwarts MUD] Preset import failed', error);
                status.textContent =
                    staticText(
                        'ui.bindings.import_failed',
                        'Import failed',
                    );
                toastr.error(String(error?.message || error));
            } finally {
                event.target.value = '';
            }
        });

        listen(root.querySelector('#hpmud_import_regex'), 'click', () => root.querySelector('#hpmud_regex_file').click());
        listen(root.querySelector('#hpmud_regex_file'), 'change', async event => {
            const files = Array.from(event.target.files || []);
            if (!files.length) return;
            const status = root.querySelector('#hpmud_regex_status');
            status.textContent =
                staticText(
                    'ui.bindings.importing',
                    'Importing...',
                );
            try {
                const scripts = await importRegexFiles(files);
                status.textContent =
                    formatStaticText(
                        'ui.bindings.regex_count',
                        'Imported {count}',
                        {
                            count:
                                scripts.length,
                        },
                    );
                toastr.success(
                    formatStaticText(
                        'ui.bindings.regex_imported',
                        'Imported {count} Regex entries.',
                        {
                            count:
                                scripts.length,
                        },
                    ),
                );
            } catch (error) {
                console.error('[Hogwarts MUD] Regex import failed', error);
                status.textContent =
                    staticText(
                        'ui.bindings.import_failed',
                        'Import failed',
                    );
                toastr.error(String(error?.message || error));
            } finally {
                event.target.value = '';
            }
        });
    }

    const listeners = [];
    let registered = false;

    function listen(target, type, listener, options) {
        target.addEventListener(type, listener, options);
        listeners.push({
            target,
            type,
            listener,
            options,
        });
    }

    function registerUiBindings() {
        if (!registered) {
            bindUi();
            registered = true;
        }
        return unregisterUiBindings;
    }

    function unregisterUiBindings() {
        if (!registered) return;
        listeners.splice(0).forEach(({
            target,
            type,
            listener,
            options,
        }) => target.removeEventListener(
            type,
            listener,
            options,
        ));
        registered = false;
    }

    return {
        registerUiBindings,
        unregisterUiBindings,
    };
}
