import {
    SOCIAL_GRAPH_EXTRACTOR_VERSION,
    SOCIAL_GRAPH_VERSION,
} from '../domain/social-schema.js';

export function canOpenCurrentSocialSaveReadOnly(
    save,
    {
        currentChatId = '',
        characterId = '',
        chatLength = 0,
        state = null,
    } = {},
) {
    const saveChatId =
        String(save?.fileName || '')
            .replace(/\.jsonl$/i, '');
    const normalizedCurrentChatId =
        String(currentChatId || '')
            .replace(/\.jsonl$/i, '');
    const graph = state?.socialGraph;
    return Boolean(
        saveChatId &&
        saveChatId ===
            normalizedCurrentChatId &&
        String(save?.storageCharacterId) ===
            String(characterId) &&
        Number(graph?.version) ===
            SOCIAL_GRAPH_VERSION &&
        Number(graph?.extractorVersion) >=
            SOCIAL_GRAPH_EXTRACTOR_VERSION &&
        Number(graph?.lastProcessedMessageId) >=
            Math.max(
                -1,
                Number(chatLength) - 1,
            ),
    );
}

export function shouldTranslateRenderedMessage(
    messageId,
    state,
) {
    const normalizedMessageId =
        Number(messageId);
    const graph =
        state?.socialGraph;
    if (
        !Number.isInteger(
            normalizedMessageId,
        ) ||
        normalizedMessageId < 0
    ) {
        return false;
    }
    if (
        Number(graph?.version) !==
            SOCIAL_GRAPH_VERSION ||
        Number(
            graph?.extractorVersion,
        ) <
            SOCIAL_GRAPH_EXTRACTOR_VERSION
    ) {
        return true;
    }
    const cursor =
        Number(
            graph
                ?.lastProcessedMessageId,
        );
    return (
        !Number.isInteger(cursor) ||
        normalizedMessageId > cursor
    );
}
