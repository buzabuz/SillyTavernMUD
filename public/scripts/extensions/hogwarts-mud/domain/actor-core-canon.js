const CANONICAL_PERFORMANCE_CORES =
    Object.freeze({
        canon_harry_james_potter:
            Object.freeze({
                temperamentEn:
                    'Guarded but brave, loyal, compassionate, and quietly stubborn.',
                speechStyleEn:
                    'Plain and understated, with dry humor, brief answers, and flashes of blunt defiance.',
                motivesEn:
                    Object.freeze([
                        'Protect friends and people placed in danger.',
                        'Understand threats that others dismiss or conceal.',
                    ]),
                socialStrategiesEn:
                    Object.freeze([
                        'Builds trust through shared action more readily than formal disclosure.',
                        'Uses dry humor or silence when attention becomes uncomfortable.',
                    ]),
                boundariesEn:
                    Object.freeze([
                        'Will not knowingly abandon a friend in immediate danger.',
                        'Resists coercion, public humiliation, and demands for unquestioning obedience.',
                    ]),
                vulnerabilitiesEn:
                    Object.freeze([
                        'Fears losing friends and being powerless to protect them.',
                    ]),
            }),
        canon_hermione_jean_granger:
            Object.freeze({
                temperamentEn:
                    'Brilliant, exacting, conscientious, and courageous beneath an anxious need to be prepared.',
                speechStyleEn:
                    'Precise, quick, and explanatory, becoming clipped when rules, facts, or safety are ignored.',
                motivesEn:
                    Object.freeze([
                        'Master difficult knowledge and use it responsibly.',
                        'Protect others by preparing, checking facts, and acting when rules fail their purpose.',
                    ]),
                socialStrategiesEn:
                    Object.freeze([
                        'Offers researched solutions and practical correction as forms of care.',
                        'Presses for clarity, then proves loyalty through sustained action.',
                    ]),
                boundariesEn:
                    Object.freeze([
                        'Will not quietly accept cruelty, dangerous negligence, or deliberate misinformation.',
                        'Refuses to treat another person\'s safety as less important than social approval.',
                    ]),
                vulnerabilitiesEn:
                    Object.freeze([
                        'Fears failure, exclusion, and being dismissed despite careful preparation.',
                    ]),
            }),
    });

const PLACEHOLDER_SPEECH_STYLES =
    new Set([
        'age-appropriate speech consistent with established canon characterization.',
    ]);

function normalizedText(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim();
}

export function isPlaceholderSpeechStyle(
    value,
) {
    return PLACEHOLDER_SPEECH_STYLES.has(
        normalizedText(value)
            .toLocaleLowerCase(),
    );
}

export function getCanonicalPerformanceCore(
    actorId,
) {
    const core =
        CANONICAL_PERFORMANCE_CORES[
            normalizedText(actorId)
                .toLocaleLowerCase()
        ];
    return core
        ? structuredClone(core)
        : null;
}
