export function resolveNewAssistantStoryMessageId(
    previousMessageId,
    latestEntry,
) {
    const latestMessageId =
        Number(
            latestEntry?.messageId,
        );
    if (
        !Number.isInteger(
            previousMessageId,
        ) ||
        !Number.isInteger(
            latestMessageId,
        ) ||
        latestMessageId <=
            previousMessageId ||
        latestEntry?.message
            ?.is_user !== false ||
        latestEntry?.message
            ?.is_system === true
    ) {
        return null;
    }
    return latestMessageId;
}

export function resolveStoryScrollMode({
    preserveScrollAnchor,
    newAssistantMessageId,
    wasNearBottom,
    turnActive,
    sceneTransitionActive,
}) {
    if (preserveScrollAnchor) {
        return 'preserve';
    }
    if (
        Number.isInteger(
            newAssistantMessageId,
        )
    ) {
        return 'new-assistant-top';
    }
    if (
        wasNearBottom ||
        turnActive ||
        sceneTransitionActive
    ) {
        return 'bottom';
    }
    return 'retain';
}
