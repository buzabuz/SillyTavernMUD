const ROUTE_CONFIGS =
    Object.freeze([
        {
            field:
                'calendarCommitment',
            diagnosticPrefix:
                'calendarCommitment',
            label:
                'Calendar commitment',
        },
    ]);

function neutralRoute() {
    return {
        requested: false,
        evidenceText: '',
        confidence: 0,
    };
}

function guardEvidenceRoute(
    route,
    playerAction,
    label,
) {
    if (!route) {
        return {
            value: neutralRoute(),
            rejected: false,
            error: '',
        };
    }
    if (
        route.requested !== true
    ) {
        return {
            value:
                route.requested ===
                    false
                    ? route
                    : neutralRoute(),
            rejected: false,
            error: '',
        };
    }
    const evidenceText =
        String(
            route.evidenceText ||
            '',
        );
    if (
        evidenceText &&
        String(
            playerAction ||
            '',
        ).includes(evidenceText)
    ) {
        return {
            value: route,
            rejected: false,
            error: '',
        };
    }
    return {
        value: neutralRoute(),
        rejected: true,
        error:
            `${label} evidenceText is not grounded in the player action.`,
    };
}

export function guardPreTurnEvidenceRoutes(
    adjudication,
    playerAction,
) {
    const result = {
        ...(adjudication
            ?.result ||
        {}),
    };
    const diagnostics = {
        ...(adjudication
            ?.diagnostics ||
        {}),
    };
    for (const config of
        ROUTE_CONFIGS) {
        const guarded =
            guardEvidenceRoute(
                result[
                    config.field
                ],
                playerAction,
                config.label,
            );
        result[config.field] =
            guarded.value;
        if (guarded.rejected) {
            diagnostics[
                `${config.diagnosticPrefix}Rejected`
            ] = true;
            diagnostics[
                `${config.diagnosticPrefix}Error`
            ] = guarded.error;
        }
    }
    return {
        ...adjudication,
        result,
        diagnostics,
    };
}
