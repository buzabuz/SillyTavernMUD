import {
    assertActorContextStateV1,
} from './actor-context-runtime.js';

export function createTurnRetryCheckpoint(
    worldState,
    {
        playerMessageId,
        assistantMessageId,
        playerAction,
        forceCheck = false,
    },
) {
    assertActorContextStateV1(
        worldState,
    );
    const baseState = structuredClone(worldState);
    delete baseState.turnRetry;
    baseState.turn = {
        ...(baseState.turn || {}),
        status: 'idle',
        error: '',
    };
    assertActorContextStateV1(
        baseState,
    );
    return {
        version: 1,
        playerMessageId,
        assistantMessageId,
        playerAction: String(playerAction || ''),
        forceCheck: Boolean(forceCheck),
        baseClock: baseState.clock,
        createdAt: new Date().toISOString(),
        baseState,
    };
}

export function restoreTurnRetryCheckpoint(
    checkpoint,
) {
    if (
        checkpoint?.version !== 1 ||
        !Number.isInteger(
            checkpoint.playerMessageId,
        ) ||
        !Number.isInteger(
            checkpoint.assistantMessageId,
        ) ||
        !String(checkpoint.playerAction || '').trim() ||
        !checkpoint.baseState ||
        typeof checkpoint.baseState !== 'object'
    ) {
        throw new Error('上一回合缺少可用的状态检查点。');
    }
    assertActorContextStateV1(
        checkpoint.baseState,
    );
    const restored = structuredClone(
        checkpoint.baseState,
    );
    delete restored.turnRetry;
    restored.turn = {
        ...(restored.turn || {}),
        status: 'idle',
        error: '',
    };
    return assertActorContextStateV1(
        restored,
    );
}

export function getAvailableTurnRollbackCheckpoint(
    worldState,
    chat,
) {
    const checkpoint =
        worldState?.turnRetry;
    if (
        worldState?.turn?.status !==
            'idle' ||
        checkpoint?.version !== 1 ||
        !checkpoint.baseState ||
        !Array.isArray(chat) ||
        !Number.isInteger(
            checkpoint.playerMessageId,
        ) ||
        !Number.isInteger(
            checkpoint.assistantMessageId,
        ) ||
        checkpoint.playerMessageId !==
            chat.length - 2 ||
        checkpoint.assistantMessageId !==
            chat.length - 1
    ) {
        return null;
    }
    const playerMessage =
        chat[
            checkpoint.playerMessageId
        ];
    const assistantMessage =
        chat[
            checkpoint.assistantMessageId
        ];
    if (
        playerMessage?.is_user !== true ||
        playerMessage.extra
            ?.hogwartsMud?.role !==
            'player_turn' ||
        assistantMessage?.is_user ===
            true ||
        assistantMessage?.extra
            ?.hogwartsMud?.role !==
            'scene_turn'
    ) {
        return null;
    }
    return checkpoint;
}

export function createLegacyTurnRollbackCheckpoint(
    _worldState,
    _chat,
) {
    return null;
}

export function getFailedPlayerTurn(
    chat,
    turnState,
) {
    if (
        turnState?.status !== 'failed' ||
        !Array.isArray(chat) ||
        !chat.length
    ) {
        return null;
    }
    const messageId = chat.length - 1;
    const message = chat[messageId];
    if (
        message?.is_user !== true ||
        message.extra?.hogwartsMud?.role !==
            'player_turn'
    ) {
        return null;
    }
    return {
        messageId,
        playerAction:
            String(message.mes || ''),
        forceCheck:
            Boolean(
                message.extra.hogwartsMud
                    .requiresCheck,
            ),
        error:
            String(turnState.error || ''),
    };
}

export function findUnsettledTurn(
    chat,
    turnState,
) {
    if (
        !Array.isArray(chat) ||
        !chat.length
    ) {
        return null;
    }
    const lastMessageId =
        chat.length - 1;
    const lastMessage =
        chat[lastMessageId];
    if (
        lastMessage?.is_user ===
            true &&
        lastMessage.extra
            ?.hogwartsMud?.role ===
            'player_turn'
    ) {
        if (
            turnState?.status ===
            'failed'
        ) {
            return null;
        }
        return {
            playerMessageId:
                lastMessageId,
            assistantMessageId:
                null,
            playerAction:
                String(
                    lastMessage.mes ||
                    '',
                ),
            forceCheck:
                Boolean(
                    lastMessage.extra
                        .hogwartsMud
                        .requiresCheck,
                ),
        };
    }
    if (
        turnState?.status !==
        'resolving'
    ) {
        return null;
    }
    for (
        let messageId =
            lastMessageId;
        messageId >= 0;
        messageId--
    ) {
        const message =
            chat[messageId];
        if (message?.is_user) {
            break;
        }
        if (
            !message ||
            message.is_system ||
            message.extra
                ?.hogwartsMud?.role ===
                'opening_narrative' ||
            message.extra
                ?.hogwartsMud
                ?.turnTransaction
        ) {
            continue;
        }
        const playerMessageId =
            chat
                .slice(
                    0,
                    messageId,
                )
                .findLastIndex(
                    candidate =>
                        candidate
                            ?.is_user ===
                            true,
                );
        const playerMessage =
            chat[playerMessageId];
        if (
            playerMessage?.extra
                ?.hogwartsMud?.role !==
                'player_turn'
        ) {
            return null;
        }
        return {
            playerMessageId,
            assistantMessageId:
                messageId,
            playerAction:
                String(
                    playerMessage.mes ||
                    '',
                ),
            forceCheck:
                Boolean(
                    playerMessage.extra
                        .hogwartsMud
                        .requiresCheck,
                ),
        };
    }
    return null;
}
