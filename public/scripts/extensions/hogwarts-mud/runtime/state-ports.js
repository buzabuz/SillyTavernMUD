export function createStatePorts(ports) {
    const {
        DEFAULT_SETTINGS,
        DEFAULT_WORLD_PROMPT,
        extension_settings,
        getContext,
        normalizeModelSlots,
        normalizeTranslationProvider,
    } = ports;

    function getSettings() {
        if (!extension_settings.hogwartsMud || typeof extension_settings.hogwartsMud !== 'object') {
            extension_settings.hogwartsMud = structuredClone(DEFAULT_SETTINGS);
        }
        const legacyTranslationEnabled =
        extension_settings.hogwartsMud
            .translationEnabled;
        if (
            extension_settings.hogwartsMud
                .translationProvider ===
        undefined
        ) {
            extension_settings.hogwartsMud
                .translationProvider =
            legacyTranslationEnabled === false
                ? 'off'
                : 'local';
        }
        if (!extension_settings.hogwartsMud.promptVersion) {
            extension_settings.hogwartsMud.worldPrompt = DEFAULT_WORLD_PROMPT;
            extension_settings.hogwartsMud.promptVersion = DEFAULT_SETTINGS.promptVersion;
        }
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
            if (extension_settings.hogwartsMud[key] === undefined) {
                extension_settings.hogwartsMud[key] = value;
            }
        }
        extension_settings.hogwartsMud.modelSlots = normalizeModelSlots(extension_settings.hogwartsMud.modelSlots);
        extension_settings.hogwartsMud
            .translationProvider =
        normalizeTranslationProvider(
            extension_settings.hogwartsMud
                .translationProvider,
        );
        extension_settings.hogwartsMud
            .translationEnabled =
        extension_settings.hogwartsMud
            .translationProvider !==
        'off';
        return extension_settings.hogwartsMud;
    }

    function resolveRoleSlots(slots) {
        const resolved = normalizeModelSlots(slots);
        resolved.medium.profileId ||= resolved.low.profileId;
        resolved.high.profileId ||= resolved.medium.profileId;
        for (const tier of [
            'high',
            'medium',
            'low',
        ]) {
            resolved[tier].diagnosticTier =
                tier;
        }
        return resolved;
    }

    function getMudState() {
        return getContext().chatMetadata?.hogwartsMud ?? null;
    }

    return {
        getSettings,
        resolveRoleSlots,
        getMudState,
    };
}
