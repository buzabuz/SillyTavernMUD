export function createKnowledgeAdapter(ports) {
    const {
        getContext,
        getMudState,
        retrieveKnowledge,
        syncKnowledgeBase,
    } = ports;

    async function syncLocalKnowledge() {
        const context = getContext();
        const state = getMudState();
        if (!state?.character?.confirmed) return;
        try {
            await syncKnowledgeBase(context, state);
            state.knowledgeBase.lastError = '';
            await context.saveMetadata();
        } catch (error) {
            state.knowledgeBase ??= {};
            state.knowledgeBase.lastError = String(error?.message || error);
            console.error('[Hogwarts MUD] Local knowledge sync failed', error);
            await context.saveMetadata();
        }
    }

    async function retrieveLocalKnowledge(query, entityIds = [], options = {}) {
        const context = getContext();
        const state = getMudState();
        if (!state?.character?.confirmed) return [];
        try {
            const {
                limit = 6,
                ...retrieveOptions
            } = options;
            return await retrieveKnowledge(
                context,
                state,
                query,
                entityIds,
                Math.max(1, Number(limit) || 6),
                retrieveOptions,
            );
        } catch (error) {
            console.warn('[Hogwarts MUD] Local knowledge retrieval failed', error);
            return [];
        }
    }

    return {
        syncLocalKnowledge,
        retrieveLocalKnowledge,
    };
}
