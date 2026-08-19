export function settlePreTurnCheck(
    check,
) {
    if (check?.required === true) {
        return {
            valid: true,
            value: check,
            normalized: false,
        };
    }
    return {
        valid: true,
        value: {
            required: false,
            ruleId: 'none',
            targetActorId: '',
            rollMode: 'normal',
            reasonEn: '',
            confidence: 0,
        },
        normalized:
            check?.ruleId !==
                'none' ||
            Boolean(
                check?.targetActorId,
            ),
    };
}
