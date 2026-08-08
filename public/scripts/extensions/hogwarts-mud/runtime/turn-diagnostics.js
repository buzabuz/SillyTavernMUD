export const TURN_DIAGNOSTICS_VERSION = 1;
export const TURN_DIAGNOSTIC_HISTORY_LIMIT = 8;
export const TURN_DIAGNOSTIC_EVENT_LIMIT = 32;
export const TURN_DIAGNOSTIC_STRING_LIMIT = 32_000;

let fallbackTraceSequence = 0;

function sanitizeDiagnosticValue(
    value,
    {
        depth = 0,
        seen = new WeakSet(),
    } = {},
) {
    if (
        value === null ||
        typeof value === 'boolean' ||
        typeof value === 'number'
    ) {
        return value;
    }
    if (typeof value === 'string') {
        return value.slice(
            0,
            TURN_DIAGNOSTIC_STRING_LIMIT,
        );
    }
    if (value === undefined) {
        return undefined;
    }
    if (depth >= 8) {
        return '[depth limit]';
    }
    if (typeof value !== 'object') {
        return String(value).slice(
            0,
            TURN_DIAGNOSTIC_STRING_LIMIT,
        );
    }
    if (seen.has(value)) {
        return '[circular]';
    }
    seen.add(value);
    if (Array.isArray(value)) {
        return value.slice(0, 64).map(item =>
            sanitizeDiagnosticValue(
                item,
                {
                    depth: depth + 1,
                    seen,
                },
            ));
    }
    return Object.fromEntries(
        Object.entries(value)
            .slice(0, 96)
            .map(([key, item]) => [
                key,
                sanitizeDiagnosticValue(
                    item,
                    {
                        depth: depth + 1,
                        seen,
                    },
                ),
            ])
            .filter(([, item]) =>
                item !== undefined),
    );
}

export function createTurnDiagnosticsRecorder({
    createId = () =>
        `local-${Date.now()}-${++fallbackTraceSequence}`,
    now = () =>
        Date.now(),
} = {}) {
    let active = null;

    function beginTurnDiagnostics({
        playerAction = '',
        sceneId = '',
        turnCount = 0,
        assistantMessageId = null,
    } = {}) {
        active = {
            version:
                TURN_DIAGNOSTICS_VERSION,
            traceId:
                `turn-${String(createId())}`,
            startedAt:
                new Date(now()).toISOString(),
            sceneId:
                String(sceneId || ''),
            turnCount:
                Math.max(
                    0,
                    Number(turnCount) || 0,
                ),
            assistantMessageId:
                Number.isInteger(
                    assistantMessageId,
                )
                    ? assistantMessageId
                    : null,
            playerAction:
                String(playerAction || '')
                    .slice(
                        0,
                        TURN_DIAGNOSTIC_STRING_LIMIT,
                    ),
            events: [],
        };
        return active.traceId;
    }

    function recordTurnDiagnostic(
        stage,
        data = {},
    ) {
        if (!active) {
            return null;
        }
        active.events.push({
            sequence:
                active.events.length,
            at:
                new Date(now()).toISOString(),
            stage:
                String(stage || 'unknown')
                    .slice(0, 96),
            data:
                sanitizeDiagnosticValue(data),
        });
        active.events =
            active.events.slice(
                -TURN_DIAGNOSTIC_EVENT_LIMIT,
            );
        active.events.forEach(
            (event, index) => {
                event.sequence = index;
            },
        );
        return active.traceId;
    }

    function finalizeTurnDiagnostics(
        status,
        data = {},
    ) {
        if (!active) {
            return null;
        }
        recordTurnDiagnostic(
            'final',
            {
                status:
                    String(status || 'unknown'),
                ...data,
            },
        );
        const completed = {
            ...active,
            status:
                String(status || 'unknown'),
            finishedAt:
                new Date(now()).toISOString(),
        };
        active = null;
        return structuredClone(completed);
    }

    function discardTurnDiagnostics() {
        active = null;
    }

    return {
        beginTurnDiagnostics,
        recordTurnDiagnostic,
        finalizeTurnDiagnostics,
        discardTurnDiagnostics,
    };
}

export function attachTurnDiagnostics(
    chat,
    message,
    diagnostics,
    {
        historyLimit =
        TURN_DIAGNOSTIC_HISTORY_LIMIT,
    } = {},
) {
    if (
        !message ||
        !diagnostics ||
        !Array.isArray(chat)
    ) {
        return {
            attached: false,
            removed: 0,
        };
    }
    message.extra =
        message.extra &&
        typeof message.extra ===
            'object'
            ? message.extra
            : {};
    message.extra.hogwartsMud = {
        ...(
            message.extra
                .hogwartsMud ||
            {}
        ),
        turnDiagnostics:
            structuredClone(
                diagnostics,
            ),
    };
    let retained = 0;
    let removed = 0;
    const limit =
        Math.max(
            1,
            Number(historyLimit) ||
                TURN_DIAGNOSTIC_HISTORY_LIMIT,
        );
    for (
        let index = chat.length - 1;
        index >= 0;
        index--
    ) {
        const hogwartsMud =
            chat[index]
                ?.extra
                ?.hogwartsMud;
        if (!hogwartsMud?.turnDiagnostics) {
            continue;
        }
        retained++;
        if (retained > limit) {
            delete hogwartsMud
                .turnDiagnostics;
            removed++;
        }
    }
    return {
        attached: true,
        removed,
    };
}
