function text(
    value,
    maximumLength = 2_000,
) {
    return String(value ?? '')
        .normalize('NFKC')
        .trim()
        .slice(0, maximumLength);
}

export function validateBackgroundEventBoundary(
    result,
    input,
) {
    const ended =
        result?.ended === true;
    const evidenceTurn =
        Number(
            result?.evidenceTurn,
        );
    const evidenceText =
        text(
            result?.evidenceText,
        );
    const confidence =
        Number(
            result?.confidence,
        );
    if (!ended) {
        const valid =
            result?.ended === false &&
            evidenceTurn === 0 &&
            evidenceText === '' &&
            confidence === 0;
        return {
            valid,
            value:
                valid
                    ? {
                        ended: false,
                        evidenceTurn: 0,
                        evidenceText: '',
                        confidence: 0,
                    }
                    : null,
            error:
                valid
                    ? ''
                    : 'A not-ended background Event result must have empty evidence.',
        };
    }
    const source =
        (
            input?.turns ||
            []
        ).find(turn =>
            turn.turn ===
                evidenceTurn);
    const valid =
        Number.isInteger(
            evidenceTurn,
        ) &&
        confidence >= 0.55 &&
        confidence <= 1 &&
        Boolean(
            evidenceText &&
            source &&
            (
                String(
                    source.publicEventEn ||
                    '',
                ).includes(
                    evidenceText,
                ) ||
                String(
                    source
                        .closingNarrationEn ||
                    '',
                ).includes(
                    evidenceText,
                )
            ),
        );
    return {
        valid,
        value:
            valid
                ? {
                    ended: true,
                    evidenceTurn,
                    evidenceText,
                    confidence,
                }
                : null,
        error:
            valid
                ? ''
                : 'Background Event evidence is not grounded in the selected committed turn.',
    };
}

export function settleBackgroundEventBoundary(
    worldState,
    input,
    result,
    guard,
    {
        hasUnreviewedMemory =
            false,
    } = {},
) {
    const validation =
        validateBackgroundEventBoundary(
            result,
            input,
        );
    if (!validation.valid) {
        return {
            state: worldState,
            changed: false,
            reason:
                'invalid_result',
        };
    }
    if (!validation.value.ended) {
        return {
            state: worldState,
            changed: false,
            reason:
                'not_ended',
        };
    }
    const checkpointTurn =
        Number(
            input?.checkpointTurn,
        );
    const runtimeRow =
        worldState
            ?.modelTaskRuntime
            ?.byTaskId
            ?.local_event_boundary_observer;
    const stale =
        text(
            worldState
                ?.timelineEpoch,
            160,
        ) !==
            text(
                guard
                    ?.timelineEpoch,
                160,
            ) ||
        Number(
            worldState
                ?.stateRevision,
        ) !==
            Number(
                guard
                    ?.stateRevision,
            ) ||
        Number(
            worldState
                ?.turn?.count,
        ) !==
            checkpointTurn ||
        Number(
            runtimeRow?.lastTurn,
        ) !==
            checkpointTurn ||
        text(
            runtimeRow
                ?.lastTriggerKey,
            240,
        ) !==
            text(
                guard
                    ?.triggerKey,
                240,
            );
    if (stale) {
        return {
            state: worldState,
            changed: false,
            reason: 'stale',
        };
    }
    if (
        worldState
            ?.memoryDirector
            ?.pendingEventBoundary
            ?.status ===
        'pending'
    ) {
        return {
            state: worldState,
            changed: false,
            reason:
                'pending_boundary_exists',
        };
    }
    const evidenceTurn =
        input.turns.find(turn =>
            turn.turn ===
                validation.value
                    .evidenceTurn);
    const next =
        structuredClone(
            worldState,
        );
    const sceneId =
        text(
            next.scene?.id ||
            evidenceTurn?.sceneId ||
            'scene',
            160,
        );
    const boundaryId =
        `${sceneId}:event:${checkpointTurn}`;
    next.memoryDirector = {
        ...(next.memoryDirector ||
            {}),
        status: 'idle',
        error: '',
        triggerMode:
            'event_boundary',
        pendingEventBoundary: {
            id: boundaryId,
            boundaryId,
            timelineEpoch:
                text(
                    next.timelineEpoch,
                    160,
                ),
            stateRevision:
                Number(
                    next.stateRevision ||
                    0,
                ),
            status: 'pending',
            sceneId,
            turn:
                checkpointTurn,
            clock:
                text(
                    next.clock,
                    80,
                ),
            publicEventEn:
                text(
                    evidenceTurn
                        ?.publicEventEn,
                    2_000,
                ),
            hasUnreviewedMemory:
                hasUnreviewedMemory ===
                true,
            intentRefreshed:
                false,
            intentRefreshStatus:
                'pending',
        },
    };
    delete next.memoryDirector
        .reviewAfterTurns;
    return {
        state: next,
        changed: true,
        reason: 'committed',
    };
}
