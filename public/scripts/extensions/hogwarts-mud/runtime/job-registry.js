export function createJobRegistry() {
    return {
        opening: null,
        foundation: null,
        daily: null,
        pacing: null,
        memory: null,
        sceneTransition: null,
        interiorMap: null,
        turnActive: false,
        sceneTransitionActive: false,
        translation: new Map(),
        turnSettlement: new Map(),
        socialCatchupAttempts: new Set(),
    };
}
