export function createUiSessionState({
    campaign,
    currentScenePageSize = 20,
    archiveListPageSize = 6,
    archiveTranscriptPageSize = 8,
} = {}) {
    return {
        displayLocale: 'zh-CN',
        localizationRows:
            new Map(),
        localizationFieldKeys:
            new Map(),
        localizationQueriedKeys:
            new Set(),
        localizationPendingFields:
            new Set(),
        localizationVisiblePending:
            new Set(),
        localizationPriorityKeys:
            new Set(),
        localizationTableErrors:
            new Map(),
        localizationLastErrorCode:
            '',
        activeSetupStep: 'identity',
        activeScreen: 'home',
        activeCampaign: campaign,
        setupMapScope: 'world',
        setupMapLevel: '',
        inspectorMapScope: 'auto',
        inspectorMapLevel: '',
        saveListRequest: 0,
        profileEditorTargetRole: '',
        profileEditorTempSecret: null,
        rolePresetImportTarget: '',
        roleRegexImportTarget: '',
        selectedActorId: '',
        liveSceneStream: null,
        renderedSceneId: '',
        latestStoryMessageId: null,
        currentSceneMessageLimit:
            currentScenePageSize,
        archiveListLimit:
            archiveListPageSize,
        archiveTranscriptLimit:
            archiveTranscriptPageSize,
        calendarSelectedDate: '',
        calendarDisplayMonth: '',
        calendarSelectedEntryId: '',
        calendarSelectedSceneId: '',
        calendarSelectedStorylineId: '',
        calendarTimelineEpoch: '',
        calendarViewMode: 'agenda',
        calendarFreeStartTime: '',
        calendarFreeMapId: '',
        calendarFreeRoomId: '',
        calendarFreePanelOpen: false,
        calendarExpandedSceneIds: [],
        calendarMomentBusy: false,
        calendarMomentError: '',
        spellPickerShowAll: false,
        renderTimer: null,
    };
}
