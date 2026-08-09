export function reconcileObservedPerceptionWithFallback(
    observed,
    fallback,
) {
    if (!observed) {
        return fallback ||
            null;
    }
    if (!fallback) {
        return observed;
    }
    const fallbackPublic =
        fallback.concealment !==
            'successful' &&
        [
            'notable',
            'major',
        ].includes(
            fallback.salience,
        ) &&
        (
            [
                'room',
                'area',
            ].includes(
                fallback.visualScope,
            ) ||
            [
                'room',
                'adjacent',
            ].includes(
                fallback.audibleScope,
            )
        );
    if (!fallbackPublic) {
        return observed;
    }
    const visualRank = {
        none: 0,
        target: 1,
        nearby: 2,
        room: 3,
        area: 4,
    };
    const audibleRank = {
        none: 0,
        target: 1,
        nearby: 2,
        room: 3,
        adjacent: 4,
    };
    const observedIsAtLeastAsPublic =
        observed.concealment !==
            'successful' &&
        (
            (
                visualRank[
                    observed.visualScope
                ] ||
                0
            ) >=
            (
                visualRank[
                    fallback.visualScope
                ] ||
                0
            ) ||
            (
                audibleRank[
                    observed.audibleScope
                ] ||
                0
            ) >=
            (
                audibleRank[
                    fallback.audibleScope
                ] ||
                0
            )
        );
    return observedIsAtLeastAsPublic
        ? observed
        : fallback;
}
