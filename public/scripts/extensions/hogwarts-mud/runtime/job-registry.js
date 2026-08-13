export function createJobRegistry() {
    return {
        opening: null,
        foundation: null,
        daily: null,
        mediumCalendarDirector:
            null,
        pacing: null,
        memory: null,
        sceneTransition: null,
        calendarMoment: null,
        calendarMomentPhase:
            'idle',
        interiorMap: null,
        turnActive: false,
        sceneTransitionActive: false,
        translation: new Map(),
        turnSettlement: new Map(),
        socialCatchupAttempts: new Set(),
    };
}
