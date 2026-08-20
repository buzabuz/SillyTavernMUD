import {
    applyStaticUiLocale,
} from '../locales/ui-static.js';

export function createSettingsProfileController(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        CONTEXT_SIZE_PRESETS,
        MANUAL_MODEL_VALUE,
        PROFILE_SECRET_KEYS,
        RegexProvider,
        SCRIPT_TYPES,
        allowPresetScripts,
        applySystemPrompt,
        assertImportSize,
        clearDisplayTranslations,
        collectModelSlots,
        createContextBudgetPlan,
        deleteSecret,
        detectPresetApi,
        eventSource,
        event_types,
        extension_settings,
        getContext,
        getCurrentPresetAPI,
        getCurrentPresetName,
        getLocalizedField =
        field => ({
            text:
                field.sourceTextEn ||
                '',
        }),
        getMudState,
        getPresetManager,
        getRequestHeaders,
        getScriptsByType,
        getSettings,
        getSetupControl,
        isGameStarted,
        normalizeModelSlots,
        normalizePostTurnSemanticProvider,
        normalizeRegexScripts,
        normalizeTranslationProvider,
        refreshTranslationsForProvider,
        sanitizePresetData,
        saveMetadataDebounced,
        saveScriptsByType,
        saveSettingsDebounced,
        setAppScreen,
        setControlValue,
        uuidv4,
        writeSecret,
    } = ports;

    const {
        root,
        profileEditorDialog,
    } = refs;

    function staticText(
        staticKey,
        sourceTextEn,
    ) {
        return getLocalizedField({
            staticKey,
            sourceTextEn,
        }).text ||
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

    function getConnectionProfiles() {
        const manager = getContext().extensionSettings?.connectionManager;
        return Array.isArray(manager?.profiles) ? manager.profiles : [];
    }

    function getProfileEditorModel() {
        const select = root.querySelector('#hpmud_profile_model');
        return select.value === MANUAL_MODEL_VALUE
            ? root.querySelector('#hpmud_profile_manual_model').value.trim()
            : select.value.trim();
    }

    function syncManualModelVisibility() {
        const select = root.querySelector('#hpmud_profile_model');
        const row = root.querySelector('#hpmud_profile_manual_model_row');
        const input = root.querySelector('#hpmud_profile_manual_model');
        const isManual = select.value === MANUAL_MODEL_VALUE;
        row.hidden = !isManual;
        input.required = isManual;
    }

    function populateProfileModels(models = [], selectedModel = '') {
        const select = root.querySelector('#hpmud_profile_model');
        const normalized = Array.from(new Set(models.map(model => String(model).trim()).filter(Boolean)))
            .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
        select.replaceChildren();
        if (selectedModel && !normalized.includes(selectedModel)) {
            select.add(
                new Option(
                    formatStaticText(
                        'ui.profile.current_model',
                        'Current · {model}',
                        {
                            model:
                                selectedModel,
                        },
                    ),
                    selectedModel,
                ),
            );
        }
        normalized.forEach(model => select.add(new Option(model, model)));
        select.add(
            new Option(
                staticText(
                    'ui.profile.manual_model',
                    'Enter Model ID manually...',
                ),
                MANUAL_MODEL_VALUE,
            ),
        );
        if (selectedModel) {
            select.value = selectedModel;
        } else if (normalized.length) {
            select.value = normalized[0];
        } else {
            select.value = MANUAL_MODEL_VALUE;
        }
        syncManualModelVisibility();
    }

    function populateProfilePresetOptions(selectedPreset = '') {
        const select = root.querySelector('#hpmud_profile_preset');
        select.replaceChildren(
            new Option(
                staticText(
                    'ui.profile.use_default_preset',
                    'Use current/default Preset',
                ),
                '',
            ),
        );
        const manager = getPresetManager('openai');
        const nativeSelect = manager?.select?.[0] || manager?.select;
        if (nativeSelect instanceof HTMLSelectElement) {
            const names = new Set();
            Array.from(nativeSelect.options).forEach(option => {
                const name = String(option.textContent || '').trim();
                if (name && !names.has(name)) {
                    names.add(name);
                    select.add(new Option(name, name));
                }
            });
        }
        select.value = selectedPreset;
    }

    function syncProfileEndpointVisibility() {
        const source = root.querySelector('#hpmud_profile_source').value;
        const row = root.querySelector('#hpmud_profile_endpoint_row');
        const endpoint = root.querySelector('#hpmud_profile_endpoint');
        const requiresEndpoint = source === 'custom';
        row.hidden = !requiresEndpoint;
        endpoint.required = requiresEndpoint;
    }

    async function clearTemporaryProfileSecret() {
        if (!session.profileEditorTempSecret) {
            return;
        }
        await deleteSecret(session.profileEditorTempSecret.key, session.profileEditorTempSecret.id);
        session.profileEditorTempSecret = null;
    }

    function getSelectedProfileForEditing() {
        for (const role of ['low', 'medium', 'high']) {
            const profileId = String(getSetupControl(`profile_${role}`)?.value || '');
            const profile = getConnectionProfiles().find(item => item.id === profileId);
            if (profile) {
                return { profile, role };
            }
        }
        return { profile: null, role: '' };
    }

    function openProfileEditor(profile = null, targetRole = '') {
        session.profileEditorTargetRole = targetRole;
        session.profileEditorTempSecret = null;
        root.querySelector('#hpmud_profile_editor_title').textContent = profile
            ? staticText(
                'ui.profile.title.edit',
                'Edit Connection Profile',
            )
            : staticText(
                'ui.profile.title.new',
                'New Connection Profile',
            );
        root.querySelector('#hpmud_profile_id').value = profile?.id || '';
        root.querySelector('#hpmud_profile_name').value = profile?.name || '';
        root.querySelector('#hpmud_profile_api_type').value = 'openai';
        root.querySelector('#hpmud_profile_source').value = profile?.api || 'custom';
        root.querySelector('#hpmud_profile_endpoint').value = profile?.['api-url'] || '';
        root.querySelector('#hpmud_profile_api_key').value = '';
        root.querySelector('#hpmud_profile_manual_model').value = profile?.model || '';
        populateProfileModels([], profile?.model || '');
        root.querySelector('#hpmud_profile_post_processing').value = profile?.['prompt-post-processing'] || '';
        root.querySelector('#hpmud_profile_test_status').textContent = profile?.['secret-id']
            ? staticText(
                'ui.profile.key_existing',
                'A Tavern key is linked. Leave API Key blank to keep using it.',
            )
            : staticText(
                'ui.profile.test_before_save',
                'You can test the connection and fetch models before saving.',
            );
        root.querySelector('#hpmud_profile_delete').hidden = !profile;
        populateProfilePresetOptions(profile?.preset || '');
        syncProfileEndpointVisibility();
        profileEditorDialog.showModal();
        root.querySelector('#hpmud_profile_name').focus();
        if (profile?.['secret-id']) {
            void testProfileConnection().catch(error => {
                console.warn('[Hogwarts MUD] Could not preload profile models', error);
                root.querySelector('#hpmud_profile_test_status').textContent =
                    staticText(
                        'ui.profile.models_failed',
                        'Automatic model loading failed. Use the button on the right to retry.',
                    );
            });
        }
    }

    function ensureNativeProfileOption(profile) {
        const select = document.querySelector('#connection_profiles');
        if (!(select instanceof HTMLSelectElement)) {
            return;
        }
        let option = Array.from(select.options).find(item => item.value === profile.id);
        if (!option) {
            option = new Option(profile.name, profile.id);
            select.add(option);
        } else {
            option.textContent = profile.name;
        }
    }

    async function writeProfileSecretIfNeeded(existingProfile) {
        if (session.profileEditorTempSecret) {
            const id = session.profileEditorTempSecret.id;
            session.profileEditorTempSecret = null;
            return id;
        }
        const value = root.querySelector('#hpmud_profile_api_key').value.trim();
        if (!value) {
            return existingProfile?.['secret-id'] || '';
        }
        const source = root.querySelector('#hpmud_profile_source').value;
        const key = PROFILE_SECRET_KEYS[source];
        if (!key) {
            throw new Error(
                formatStaticText(
                    'ui.profile.error.secret_type',
                    'Source "{source}" has no matching Tavern secret type.',
                    {
                        source,
                    },
                ),
            );
        }
        const label = `${root.querySelector('#hpmud_profile_name').value.trim()} · Hogwarts MUD`;
        const id = await writeSecret(key, value, label);
        if (!id) {
            throw new Error(
                staticText(
                    'ui.profile.error.secret_write',
                    'Failed to write API Key to SillyTavern Secret Storage.',
                ),
            );
        }
        return id;
    }

    function bindSavedProfile(profile) {
        const targetRole = session.profileEditorTargetRole ||
            (getSetupControl('profile_low')?.value ? '' : 'low');
        if (targetRole) {
            getSettings().modelSlots[targetRole].profileId = profile.id;
        }
        syncModelSlotControls();
        if (targetRole) {
            setControlValue(`profile_${targetRole}`, profile.id);
            renderProfileDetail(targetRole, profile.id, getConnectionProfiles());
        }
        saveSettingsDebounced();
    }

    async function saveProfileEditor() {
        const settings = getContext().extensionSettings;
        settings.connectionManager ??= { profiles: [], selectedProfile: null };
        settings.connectionManager.profiles ??= [];
        const profiles = settings.connectionManager.profiles;
        const id = root.querySelector('#hpmud_profile_id').value;
        const index = profiles.findIndex(item => item.id === id);
        const existing = index >= 0 ? profiles[index] : null;
        const name = root.querySelector('#hpmud_profile_name').value.trim();
        const source = root.querySelector('#hpmud_profile_source').value;
        const endpoint = root.querySelector('#hpmud_profile_endpoint').value.trim();
        const model = getProfileEditorModel();
        if (!name || !model) {
            throw new Error(
                staticText(
                    'ui.profile.error.required',
                    'Profile name and Model ID are required.',
                ),
            );
        }
        if (source === 'custom' && !endpoint) {
            throw new Error(
                staticText(
                    'ui.profile.error.endpoint',
                    'Custom Source requires a Base URL.',
                ),
            );
        }
        const duplicate = profiles.some(item => item.name === name && item.id !== id);
        if (duplicate) {
            throw new Error(
                staticText(
                    'ui.profile.error.duplicate',
                    'A Connection Profile with this name already exists.',
                ),
            );
        }
        const secretId = await writeProfileSecretIfNeeded(existing);
        const profile = {
            ...(existing || {}),
            id: existing?.id || uuidv4(),
            mode: 'cc',
            name,
            api: source,
            model,
            preset: root.querySelector('#hpmud_profile_preset').value,
            'api-url': source === 'custom' ? endpoint : '',
            'secret-id': secretId,
            'prompt-post-processing': root.querySelector('#hpmud_profile_post_processing').value,
            exclude: [],
        };
        if (index >= 0) {
            const oldProfile = structuredClone(profiles[index]);
            profiles[index] = profile;
            await eventSource.emit(event_types.CONNECTION_PROFILE_UPDATED, oldProfile, profile);
        } else {
            profiles.push(profile);
            await eventSource.emit(event_types.CONNECTION_PROFILE_CREATED, profile);
        }
        ensureNativeProfileOption(profile);
        bindSavedProfile(profile);
        saveSettingsDebounced();
        profileEditorDialog.close();
        toastr.success(
            formatStaticText(
                'ui.profile.saved',
                'Connection Profile "{name}" saved.',
                {
                    name:
                        profile.name,
                },
            ),
        );
    }

    async function getOrCreateEditorSecretId() {
        const existing = getConnectionProfiles().find(item => item.id === root.querySelector('#hpmud_profile_id').value);
        const value = root.querySelector('#hpmud_profile_api_key').value.trim();
        if (!value) {
            return existing?.['secret-id'] || '';
        }
        await clearTemporaryProfileSecret();
        const source = root.querySelector('#hpmud_profile_source').value;
        const key = PROFILE_SECRET_KEYS[source];
        if (!key) {
            throw new Error(
                staticText(
                    'ui.profile.error.secret_unsupported',
                    'This Source does not support saving a key.',
                ),
            );
        }
        const id = await writeSecret(
            key,
            value,
            staticText(
                'ui.profile.secret_test_label',
                'Hogwarts MUD · Connection test',
            ),
        );
        if (!id) {
            throw new Error(
                staticText(
                    'ui.profile.error.test_key',
                    'Failed to write the test key.',
                ),
            );
        }
        session.profileEditorTempSecret = { key, id };
        return id;
    }

    async function testProfileConnection() {
        const status = root.querySelector('#hpmud_profile_test_status');
        const button = root.querySelector('#hpmud_profile_test');
        const source = root.querySelector('#hpmud_profile_source').value;
        const endpoint = root.querySelector('#hpmud_profile_endpoint').value.trim();
        if (source === 'custom' && !endpoint) {
            throw new Error(
                staticText(
                    'ui.profile.error.custom_endpoint',
                    'Enter a Custom Endpoint first.',
                ),
            );
        }
        button.disabled = true;
        status.textContent =
            staticText(
                'ui.profile.connecting',
                'Connecting and fetching models...',
            );
        try {
            const secretId = await getOrCreateEditorSecretId();
            const response = await fetch('/api/backends/chat-completions/status', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    chat_completion_source: source,
                    custom_url: source === 'custom' ? endpoint : undefined,
                    secret_id: secretId || undefined,
                }),
            });
            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error?.message || data.error || response.statusText);
            }
            const models = Array.isArray(data.data)
                ? data.data.map(item => typeof item === 'string' ? item : item.id).filter(Boolean)
                : [];
            const currentModel = getProfileEditorModel();
            populateProfileModels(models, currentModel || models[0] || '');
            status.textContent = models.length
                ? formatStaticText(
                    'ui.profile.connected_models',
                    'Connected. Fetched {count} models.',
                    {
                        count:
                            models.length,
                    },
                )
                : staticText(
                    'ui.profile.connected_manual',
                    'Connected. The service returned no model list; enter a Model ID manually.',
                );
        } finally {
            button.disabled = false;
        }
    }

    async function deleteProfileEditor() {
        const id = root.querySelector('#hpmud_profile_id').value;
        const settings = getContext().extensionSettings.connectionManager;
        const index = settings?.profiles?.findIndex(item => item.id === id) ?? -1;
        if (index < 0) {
            return;
        }
        const target = settings.profiles[index];
        if (
            !window.confirm(
                formatStaticText(
                    'ui.profile.delete_confirm',
                    'Delete Connection Profile "{name}"?',
                    {
                        name:
                            target.name,
                    },
                ),
            )
        ) {
            return;
        }
        const [profile] = settings.profiles.splice(index, 1);
        for (const role of ['low', 'medium', 'high']) {
            if (getSettings().modelSlots[role].profileId === id) {
                getSettings().modelSlots[role].profileId = '';
            }
        }
        document.querySelector(`#connection_profiles option[value="${CSS.escape(id)}"]`)?.remove();
        await eventSource.emit(event_types.CONNECTION_PROFILE_DELETED, profile);
        saveSettingsDebounced();
        syncModelSlotControls();
        profileEditorDialog.close();
        toastr.success(
            formatStaticText(
                'ui.profile.deleted',
                'Connection Profile "{name}" deleted.',
                {
                    name:
                        profile.name,
                },
            ),
        );
    }

    function renderProfileDetail(role, profileId, profiles) {
        const detail = root.querySelector(`#hpmud_profile_detail_${role}`);
        const profile = profiles.find(item => item.id === profileId);
        if (!profile) {
            const fallback = role === 'low'
                ? staticText(
                    'ui.setup.profile.low_empty',
                    'No Connection Profile selected',
                )
                : role === 'medium'
                    ? staticText(
                        'ui.setup.profile.medium_empty',
                        'Leave empty to reuse the low-tier connection; medium-tier responsibility and parameters remain independent.',
                    )
                    : staticText(
                        'ui.setup.profile.high_empty',
                        'Leave empty to reuse the Actor and Scene Director.',
                    );
            detail.textContent = fallback;
            detail.classList.remove('configured');
            return;
        }
        const values = [
            profile.api && `API · ${profile.api}`,
            profile.model &&
                `${staticText(
                    'ui.setup.profile.model',
                    'Model',
                )} · ${profile.model}`,
            profile.preset && `Preset · ${profile.preset}`,
            profile.instruct && `Instruct · ${profile.instruct}`,
        ].filter(Boolean);
        detail.textContent =
            values.join(' · ') ||
            staticText(
                'ui.profile.configured',
                'Profile configured',
            );
        detail.classList.add('configured');
    }

    function getChatCompletionPresetNames() {
        const manager = getPresetManager('openai');
        return Array.from(new Set(manager?.getAllPresets?.() || []))
            .map(name => String(name).trim())
            .filter(Boolean);
    }

    function populateRolePresetControl(role, slot, profile) {
        const presetSelect = getSetupControl(`preset_${role}`);
        presetSelect.replaceChildren(new Option(
            profile?.preset
                ? `Profile Preset · ${profile.preset}`
                : staticText(
                    'ui.setup.profile.default_preset',
                    'Use Profile/default Preset',
                ),
            '',
        ));
        getChatCompletionPresetNames().forEach(name => presetSelect.add(new Option(name, name)));
        presetSelect.value = slot.presetName;

        const regexSelect = getSetupControl(`regex_${role}`);
        regexSelect.replaceChildren(new Option(
            staticText(
                'ui.setup.profile.no_regex',
                'Do not override Regex Preset',
            ),
            '',
        ));
        const regexPresets = Array.isArray(extension_settings.regex_presets)
            ? extension_settings.regex_presets
            : [];
        regexPresets.forEach(preset => regexSelect.add(new Option(preset.name, preset.id)));
        regexSelect.value = slot.regexPresetId;
    }

    function syncModelSlotControls() {
        const settings = getSettings();
        const slots = normalizeModelSlots(isGameStarted() ? getMudState().modelSlots : settings.modelSlots);
        const provider = normalizePostTurnSemanticProvider(
            isGameStarted()
                ? getMudState()
                    ?.postTurnSemanticProvider
                : settings
                    .postTurnSemanticProvider,
        );
        const profiles = getConnectionProfiles();
        root.querySelector('#hpmud_profile_count').textContent = profiles.length
            ? `${profiles.length} ${staticText(
                'ui.setup.profiles.loaded',
                'tavern Connection Profiles loaded',
            )}`
            : staticText(
                'ui.setup.profiles.none',
                'No Connection Profiles exist in the tavern; create one first.',
            );
        root.querySelectorAll('[data-hpmud-profile-slot]').forEach(select => {
            const role = select.dataset.hpmudProfileSlot;
            const selected = slots?.[role]?.profileId || '';
            const emptyLabel = role === 'low'
                ? staticText(
                    'ui.setup.profile.select',
                    'Select Profile',
                )
                : role === 'medium'
                    ? staticText(
                        'ui.setup.profile.reuse_low',
                        'Reuse low-tier Profile',
                    )
                    : staticText(
                        'ui.setup.profile.reuse_medium',
                        'Reuse medium-tier Profile',
                    );
            select.replaceChildren(new Option(emptyLabel, ''));
            profiles.forEach(profile => {
                const detail = [profile.name, profile.model].filter(Boolean).join(' · ');
                select.add(new Option(detail, profile.id));
            });
            select.value = selected;
            const profile = profiles.find(item => item.id === selected);
            populateRolePresetControl(role, slots[role], profile);
            setControlValue(`context_${role}`, slots[role].contextSize);
            setControlValue(`response_${role}`, slots[role].maxResponseLength);
            renderProfileDetail(role, selected, profiles);
        });
        const providerControl = root.querySelector(
            '[data-hpmud-post-semantic-provider]',
        );
        if (providerControl) {
            providerControl.value = provider;
        }
        const providerDetail = root.querySelector(
            '#hpmud_post_semantic_provider_detail',
        );
        if (providerDetail) {
            const lowProfile = profiles.find(
                profile =>
                    profile.id ===
                    slots.low.profileId,
            );
            providerDetail.textContent =
                provider === 'low'
                    ? lowProfile
                        ? `${staticText(
                            'ui.setup.post_semantic.low_detail',
                            'Uses the Low Connection Profile',
                        )} · ${
                            [
                                lowProfile.name,
                                lowProfile.model,
                            ].filter(Boolean).join(' · ')
                        }`
                        : staticText(
                            'ui.setup.post_semantic.low_missing',
                            'Choose a Low Connection Profile before using it for post-turn semantics.',
                        )
                    : staticText(
                        'ui.setup.post_semantic.local_detail',
                        'Uses the local Ollama post-turn model.',
                    );
        }
        syncContextPolicyUi(slots);
    }

    function formatTokenCount(value) {
        const amount = Math.max(0, Number(value) || 0);
        return amount >= 1000
            ? `${Number((amount / 1000).toFixed(1))}K`
            : String(amount);
    }

    function syncContextPolicyUi(slots = collectModelSlots()) {
        for (const role of ['low', 'medium', 'high']) {
            const plan = createContextBudgetPlan(
                slots[role].contextSize,
                slots[role].maxResponseLength,
            );
            const summary = root.querySelector(
                `#hpmud_context_summary_${role}`,
            );
            if (summary) {
                summary.textContent = [
                    `${staticText(
                        `ui.setup.context.${plan.mode}`,
                        plan.mode,
                    )} ${staticText(
                        'ui.setup.context.mode',
                        'mode',
                    )}`,
                    `${staticText(
                        'ui.setup.context.input',
                        'Input',
                    )} ${formatTokenCount(plan.inputBudget)}`,
                    `${staticText(
                        'ui.setup.context.output',
                        'Output headroom',
                    )} ${formatTokenCount(plan.maxResponseLength)}`,
                    `${staticText(
                        'ui.setup.context.system',
                        'System reserve',
                    )} ${formatTokenCount(plan.mandatoryReserveTokens)}`,
                    `RAG ${plan.ragLimit}`,
                    `${staticText(
                        'ui.setup.context.memory',
                        'Memory',
                    )} ${plan.memoryLimits.core}/${plan.memoryLimits.recent}/${plan.memoryLimits.everyday}`,
                ].join(' · ');
            }
        }
        root.querySelectorAll(
            '[data-hpmud-context-preset]',
        ).forEach(button => {
            const target =
                CONTEXT_SIZE_PRESETS[
                    button.dataset.hpmudContextPreset
                ];
            button.classList.toggle(
                'active',
                Boolean(target) &&
                ['low', 'medium', 'high'].every(role =>
                    slots[role].contextSize === target),
            );
        });
    }

    function applyContextSizePreset(presetId) {
        const contextSize =
            CONTEXT_SIZE_PRESETS[presetId];
        if (!contextSize) return;
        const slots = collectModelSlots();
        for (const role of ['low', 'medium', 'high']) {
            slots[role].contextSize = contextSize;
        }
        const normalized = persistModelSlots(slots);
        syncModelSlotControls();
        toastr.success(
            formatStaticText(
                'ui.profile.context_changed',
                'All three context tiers changed to {size}.',
                {
                    size:
                        formatTokenCount(
                            contextSize,
                        ),
                },
            ),
        );
        return normalized;
    }

    async function saveInGameModelConfigAndReturn() {
        const slots = persistModelSlots(
            collectModelSlots(),
        );
        if (!slots.low.profileId) {
            toastr.warning(
                staticText(
                    'ui.profile.low_required',
                    'The low-tier Scene Performer requires a Connection Profile.',
                ),
            );
            return;
        }
        await applyNativeRoleSettings(slots.low);
        await getContext().saveMetadata();
        applySystemPrompt();
        setAppScreen('game');
        toastr.success(
            staticText(
                'ui.profile.timeline_saved',
                'Three-tier AI and context policy saved to the current timeline.',
            ),
        );
    }

    async function applySelectedConnectionProfile(profileId) {
        if (!profileId) {
            return;
        }
        const nativeSelect = document.querySelector('#connection_profiles');
        if (!(nativeSelect instanceof HTMLSelectElement)) {
            throw new Error(
                staticText(
                    'ui.profile.error.extension_missing',
                    'The Connection Profiles extension is not loaded.',
                ),
            );
        }
        if (!Array.from(nativeSelect.options).some(option => option.value === profileId)) {
            throw new Error(
                staticText(
                    'ui.profile.error.missing',
                    'The selected Connection Profile no longer exists.',
                ),
            );
        }
        await new Promise((resolve, reject) => {
            let settled = false;
            eventSource.once(event_types.CONNECTION_PROFILE_LOADED, () => {
                settled = true;
                resolve();
            });
            nativeSelect.value = profileId;
            nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            setTimeout(() => {
                if (!settled) {
                    reject(
                        new Error(
                            staticText(
                                'ui.profile.error.timeout',
                                'Applying the Connection Profile timed out.',
                            ),
                        ),
                    );
                }
            }, 15000);
        });
    }

    function selectChatCompletionPreset(presetName) {
        if (!presetName) {
            return;
        }
        const manager = getPresetManager('openai');
        const value = manager?.findPreset(presetName);
        if (value !== undefined && value !== null) {
            manager.selectPreset(value);
        }
    }

    async function applyRegexPresetById(presetId) {
        if (!presetId) {
            return;
        }
        const preset = extension_settings.regex_presets?.find(item => item.id === presetId);
        if (!preset) {
            return;
        }
        const presetLists = {
            [SCRIPT_TYPES.GLOBAL]: preset.global || [],
            [SCRIPT_TYPES.SCOPED]: preset.scoped || [],
            [SCRIPT_TYPES.PRESET]: preset.preset || [],
        };
        for (const scriptType of Object.values(SCRIPT_TYPES)) {
            const scripts = getScriptsByType(scriptType);
            const enabledIds = new Set(presetLists[scriptType].map(item => item.id));
            scripts.forEach(script => {
                script.disabled = !enabledIds.has(script.id);
            });
            scripts.sort((left, right) => {
                const leftIndex = presetLists[scriptType].findIndex(item => item.id === left.id);
                const rightIndex = presetLists[scriptType].findIndex(item => item.id === right.id);
                return leftIndex - rightIndex;
            });
            await saveScriptsByType(scripts, scriptType);
        }
        extension_settings.regex_presets.forEach(item => {
            item.isSelected = item.id === presetId;
        });
        RegexProvider.instance.clear();
        saveSettingsDebounced();
    }

    function applyNativeRoleLengths(slot) {
        const contextSize = Number(slot.contextSize);
        const responseLength = Number(slot.maxResponseLength);
        const unlocked = document.querySelector('#oai_max_context_unlocked');
        if (unlocked instanceof HTMLInputElement) {
            unlocked.checked = contextSize > Number(document.querySelector('#openai_max_context')?.getAttribute('max') || 0);
            unlocked.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const context = document.querySelector('#openai_max_context');
        const contextCounter = document.querySelector('#openai_max_context_counter');
        if (context instanceof HTMLInputElement) {
            context.max = String(Math.max(contextSize, Number(context.max || 0)));
            context.value = String(contextSize);
            context.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (contextCounter instanceof HTMLInputElement) {
            contextCounter.max = String(Math.max(contextSize, Number(contextCounter.max || 0)));
            contextCounter.value = String(contextSize);
            contextCounter.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const response = document.querySelector('#openai_max_tokens');
        if (response instanceof HTMLInputElement) {
            response.max = String(
                Math.max(
                    responseLength,
                    Number(response.max || 0),
                ),
            );
            response.value = String(responseLength);
            response.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    async function applyNativeRoleSettings(slot) {
        await applySelectedConnectionProfile(slot.profileId);
        selectChatCompletionPreset(slot.presetName);
        applyNativeRoleLengths(slot);
        await applyRegexPresetById(slot.regexPresetId);
    }

    async function importPreset(file) {
        assertImportSize(file.size);
        const raw = JSON.parse(await file.text());
        const { clean, removed } = sanitizePresetData(raw);
        const selected = root.querySelector('#hpmud_preset_target').value;
        const fallback = getContext().mainApi || 'openai';
        const apiId = selected === 'auto' ? detectPresetApi(clean, fallback) : selected;
        const manager = getPresetManager(apiId);
        if (!manager) {
            throw new Error(
                formatStaticText(
                    'ui.profile.error.preset_manager',
                    'No {apiId} Preset Manager is available in the Tavern.',
                    {
                        apiId,
                    },
                ),
            );
        }

        const fileName = file.name.replace(/\.(json|settings)$/i, '');
        const name = String(clean.name || fileName || 'Imported Preset');
        clean.name = name;
        await manager.savePreset(name, clean);
        const option = manager.findPreset(name);
        if (option) {
            manager.selectPreset(option);
        }
        return { name, apiId, removed };
    }

    function persistModelConfiguration(
        slots,
        provider,
    ) {
        const normalized = normalizeModelSlots(slots);
        const normalizedProvider =
            normalizePostTurnSemanticProvider(
                provider,
            );
        getSettings().modelSlots = structuredClone(normalized);
        getSettings().postTurnSemanticProvider =
            normalizedProvider;
        const state = getMudState();
        if (isGameStarted() && state) {
            state.modelSlots = structuredClone(normalized);
            state.postTurnSemanticProvider =
                normalizedProvider;
            saveMetadataDebounced();
        }
        saveSettingsDebounced();
        return {
            slots: normalized,
            provider: normalizedProvider,
        };
    }

    function persistModelSlots(slots) {
        const provider = isGameStarted()
            ? getMudState()
                ?.postTurnSemanticProvider
            : getSettings()
                .postTurnSemanticProvider;
        return persistModelConfiguration(
            slots,
            provider,
        ).slots;
    }

    function persistPostTurnSemanticProvider(
        provider,
    ) {
        const slots = isGameStarted()
            ? getMudState()
                ?.modelSlots
            : getSettings()
                .modelSlots;
        return persistModelConfiguration(
            slots,
            provider,
        ).provider;
    }

    async function importRoleChatPreset(file, role) {
        assertImportSize(file.size);
        const raw = JSON.parse(await file.text());
        const { clean } = sanitizePresetData(raw);
        const manager = getPresetManager('openai');
        if (!manager) {
            throw new Error(
                staticText(
                    'ui.profile.error.chat_preset_manager',
                    'No Chat Completion Preset Manager is available in the Tavern.',
                ),
            );
        }
        const fileName = file.name.replace(/\.(json|settings)$/i, '');
        const name = String(clean.name || fileName || `Imported ${role} Preset`);
        clean.name = name;
        await manager.savePreset(name, clean);
        const slots = collectModelSlots();
        slots[role].presetName = name;
        if (clean.openai_max_context !== undefined) {
            slots[role].contextSize = Number(clean.openai_max_context);
        }
        if (clean.openai_max_tokens !== undefined) {
            slots[role].maxResponseLength = Number(clean.openai_max_tokens);
        }
        persistModelSlots(slots);
        syncModelSlotControls();
        setControlValue(`preset_${role}`, name);
        return name;
    }

    function normalizeRegexPresetItems(value) {
        return Array.isArray(value)
            ? value.map(item => typeof item === 'string' ? { id: item } : { id: item.id }).filter(item => item.id)
            : [];
    }

    async function importRoleRegexPreset(file, role) {
        assertImportSize(file.size);
        const raw = JSON.parse(await file.text());
        extension_settings.regex_presets ??= [];
        let preset;
        if (
            raw &&
            typeof raw === 'object' &&
            !Array.isArray(raw) &&
            (Array.isArray(raw.global) || Array.isArray(raw.scoped) || Array.isArray(raw.preset))
        ) {
            preset = {
                id: uuidv4(),
                name: String(raw.name || file.name.replace(/\.json$/i, '') || 'Imported Regex Preset'),
                isSelected: false,
                global: normalizeRegexPresetItems(raw.global),
                scoped: normalizeRegexPresetItems(raw.scoped),
                preset: normalizeRegexPresetItems(raw.preset),
            };
        } else {
            const scripts = normalizeRegexScripts(raw, uuidv4);
            const current = getScriptsByType(SCRIPT_TYPES.GLOBAL);
            await saveScriptsByType([...current, ...scripts], SCRIPT_TYPES.GLOBAL);
            preset = {
                id: uuidv4(),
                name: file.name.replace(/\.json$/i, '') || `Imported ${role} Regex`,
                isSelected: false,
                global: scripts.map(script => ({ id: script.id })),
                scoped: [],
                preset: [],
            };
        }
        extension_settings.regex_presets.push(preset);
        const slots = collectModelSlots();
        slots[role].regexPresetId = preset.id;
        persistModelSlots(slots);
        RegexProvider.instance.clear();
        syncModelSlotControls();
        setControlValue(`regex_${role}`, preset.id);
        return preset;
    }

    async function importRegexFiles(files) {
        const targetValue = root.querySelector('#hpmud_regex_target').value;
        const target = targetValue === 'preset' ? SCRIPT_TYPES.PRESET : SCRIPT_TYPES.GLOBAL;
        const imported = [];

        for (const file of files) {
            assertImportSize(file.size);
            const raw = JSON.parse(await file.text());
            imported.push(...normalizeRegexScripts(raw, uuidv4));
        }

        const current = getScriptsByType(target);
        await saveScriptsByType([...current, ...imported], target);
        RegexProvider.instance.clear();

        if (target === SCRIPT_TYPES.PRESET) {
            allowPresetScripts(getCurrentPresetAPI(), getCurrentPresetName());
        }
        const context = getContext();
        if (context.getCurrentChatId()) {
            await context.reloadCurrentChat();
        }
        return imported;
    }

    function syncSettingsUi() {
        const settings = getSettings();
        if (root.dataset) {
            root.dataset
                .hpmudDisplayLocale =
                session.displayLocale;
        }
        applyStaticUiLocale(
            root,
            getLocalizedField,
        );
        root.querySelector('#hpmud_prompt_enabled').checked = settings.enabled;
        root.querySelector(
            '#hpmud_translation_provider',
        ).value =
            settings.translationProvider;
        root.querySelector('#hpmud_world_prompt').value = settings.worldPrompt;
        const labels = {
            local:
                getLocalizedField({
                    staticKey:
                        'ui.translation.local',
                    sourceTextEn:
                        'Local 4B',
                }).text,
            google: 'Google',
            bing: 'Bing',
            off:
                getLocalizedField({
                    staticKey:
                        'ui.translation.off',
                    sourceTextEn:
                        'Off',
                }).text,
        };
        root.querySelector(
            '#hpmud_translation_provider_status',
        ).textContent =
            labels[settings.translationProvider];
        root.querySelectorAll(
            '[data-hpmud-translation-provider]',
        ).forEach(button => {
            const selected =
                button.dataset
                    .hpmudTranslationProvider ===
                settings.translationProvider;
            button.classList.toggle(
                'active',
                selected,
            );
            button.setAttribute(
                'aria-checked',
                String(selected),
            );
        });
        root.querySelectorAll(
            '[data-hpmud-display-locale]',
        ).forEach(button => {
            const selected =
                button.dataset
                    .hpmudDisplayLocale ===
                session.displayLocale;
            button.classList.toggle(
                'active',
                selected,
            );
            button.setAttribute(
                'aria-checked',
                String(selected),
            );
        });
    }

    function setTranslationProvider(provider) {
        const settings = getSettings();
        settings.translationProvider =
            normalizeTranslationProvider(provider);
        settings.translationEnabled =
            settings.translationProvider !== 'off';
        saveSettingsDebounced();
        syncSettingsUi();
        if (settings.translationEnabled) {
            void refreshTranslationsForProvider();
        } else {
            void clearDisplayTranslations();
        }
    }

    return {
        getConnectionProfiles,
        getProfileEditorModel,
        syncManualModelVisibility,
        populateProfileModels,
        populateProfilePresetOptions,
        syncProfileEndpointVisibility,
        clearTemporaryProfileSecret,
        getSelectedProfileForEditing,
        openProfileEditor,
        ensureNativeProfileOption,
        writeProfileSecretIfNeeded,
        bindSavedProfile,
        saveProfileEditor,
        getOrCreateEditorSecretId,
        testProfileConnection,
        deleteProfileEditor,
        renderProfileDetail,
        getChatCompletionPresetNames,
        populateRolePresetControl,
        syncModelSlotControls,
        formatTokenCount,
        syncContextPolicyUi,
        applyContextSizePreset,
        saveInGameModelConfigAndReturn,
        applySelectedConnectionProfile,
        selectChatCompletionPreset,
        applyRegexPresetById,
        applyNativeRoleLengths,
        applyNativeRoleSettings,
        importPreset,
        persistModelSlots,
        persistPostTurnSemanticProvider,
        importRoleChatPreset,
        normalizeRegexPresetItems,
        importRoleRegexPreset,
        importRegexFiles,
        syncSettingsUi,
        setTranslationProvider,
    };
}
