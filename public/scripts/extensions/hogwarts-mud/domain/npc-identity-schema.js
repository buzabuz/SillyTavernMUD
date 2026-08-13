export const NPC_IDENTITY_VERSION = 1;

export const NPC_GENDER_VALUES = Object.freeze([
    'female',
    'male',
    'nonbinary',
    'other',
    'unknown',
]);

export const NPC_BIRTH_PRECISION_VALUES = Object.freeze([
    'exact',
    'year',
    'unknown',
]);

export const NPC_EDUCATION_STATUS_VALUES = Object.freeze([
    'prospective',
    'enrolled',
    'graduated',
    'left',
    'expelled',
    'unknown',
]);

export const NPC_LINEAGE_VALUES = Object.freeze([
    'pure_blood',
    'half_blood',
    'muggle_born',
    'muggle',
    'unknown',
]);

export const NPC_HEIGHT_CATEGORY_VALUES = Object.freeze([
    'very_short',
    'short',
    'average',
    'tall',
    'very_tall',
    'unknown',
]);

export const NPC_HEIGHT_PRECISION_VALUES = Object.freeze([
    'exact',
    'approximate',
    'category',
    'unknown',
]);

export const NPC_FEATURE_STATUS_VALUES = Object.freeze([
    'active',
    'resolved',
    'permanent',
    'unknown',
]);

export const NPC_INJURY_STATUS_VALUES = Object.freeze([
    'active',
    'resolved',
    'chronic',
    'unknown',
]);

export const NPC_INJURY_ASSESSMENT_VALUES = Object.freeze([
    'visible_injury',
    'no_visible_injury',
    'unknown',
]);

export const NPC_PROVENANCE_SOURCE_TIER_VALUES = Object.freeze([
    'canon_official',
    'canon_book',
    'canon_catalog',
    'user_confirmed',
    'direct_observation',
    'authorized_reducer',
    'legacy_migration',
    'unknown',
]);

function compactText(
    value,
    maximumLength = 500,
) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

function enumValue(
    value,
    allowed,
    fallback = 'unknown',
) {
    const normalized = compactText(
        value,
        80,
    ).toLocaleLowerCase();
    return allowed.includes(normalized)
        ? normalized
        : fallback;
}

function nullableInteger(
    value,
    minimum,
    maximum,
) {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return null;
    }
    const number = Number(value);
    return (
        Number.isInteger(number) &&
        number >= minimum &&
        number <= maximum
    )
        ? number
        : null;
}

function parseIsoDate(
    value,
) {
    const text = compactText(
        value,
        40,
    );
    const match = text.match(
        /^(-?\d{4,6})-(\d{2})-(\d{2})$/u,
    );
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (
        !Number.isInteger(year) ||
        month < 1 ||
        month > 12
    ) {
        return null;
    }
    const daysInMonth =
        new Date(
            Date.UTC(
                year,
                month,
                0,
            ),
        ).getUTCDate();
    if (
        day < 1 ||
        day > daysInMonth
    ) {
        return null;
    }
    return {
        text,
        year,
        month,
        day,
    };
}

function stableUnique(
    values,
    fingerprint,
) {
    const seen = new Set();
    return values.filter(value => {
        const key =
            fingerprint(value);
        if (
            !key ||
            seen.has(key)
        ) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

export function normalizeNpcGender(
    source = {},
) {
    const record =
        typeof source === 'string'
            ? {
                code: source,
                label: source,
            }
            : source || {};
    const code = enumValue(
        record.code,
        NPC_GENDER_VALUES,
    );
    return {
        code,
        label:
            compactText(
                record.label,
                120,
            ) ||
            (
                code === 'unknown'
                    ? ''
                    : code
            ),
    };
}

export function normalizeNpcBirth(
    source = {},
) {
    const record =
        source || {};
    const date =
        parseIsoDate(
            record.date,
        )?.text || '';
    const year =
        nullableInteger(
            record.year,
            -10000,
            10000,
        );
    const precision = enumValue(
        record.precision,
        NPC_BIRTH_PRECISION_VALUES,
    );
    if (
        precision === 'exact' &&
        date
    ) {
        return {
            date,
            year: null,
            precision: 'exact',
        };
    }
    if (
        precision === 'year' &&
        year !== null
    ) {
        return {
            date: '',
            year,
            precision: 'year',
        };
    }
    return {
        date: '',
        year: null,
        precision: 'unknown',
    };
}

export function normalizeNpcEducation(
    source = {},
) {
    const record =
        source || {};
    const entryYear =
        nullableInteger(
            record.entryYear,
            -10000,
            10000,
        );
    let exitYear =
        nullableInteger(
            record.exitYear,
            -10000,
            10000,
        );
    if (
        entryYear !== null &&
        exitYear !== null &&
        exitYear < entryYear
    ) {
        exitYear = null;
    }
    return {
        schoolId:
            compactText(
                record.schoolId,
                120,
            ) || 'unknown',
        houseId:
            compactText(
                record.houseId,
                120,
            ) || 'unknown',
        entryYear,
        exitYear,
        status: enumValue(
            record.status,
            NPC_EDUCATION_STATUS_VALUES,
        ),
        yearOverride:
            nullableInteger(
                record.yearOverride,
                1,
                20,
            ),
    };
}

export function normalizeNpcLineage(
    source = {},
) {
    const record =
        typeof source === 'string'
            ? {
                status: source,
            }
            : source || {};
    return {
        status: enumValue(
            record.status,
            NPC_LINEAGE_VALUES,
        ),
        basis:
            compactText(
                record.basis,
                500,
            ),
    };
}

function normalizeNpcFeature(
    source,
    defaultClock,
) {
    const record =
        typeof source === 'string'
            ? {
                description: source,
            }
            : source || {};
    const description =
        compactText(
            record.description ??
            record.value ??
            record.resultText,
            500,
        );
    if (!description) return null;
    return {
        type:
            compactText(
                record.type,
                80,
            ).toLocaleLowerCase() ||
            'other',
        description,
        status: enumValue(
            record.status,
            NPC_FEATURE_STATUS_VALUES,
        ),
        asOfClock:
            compactText(
                record.asOfClock ??
                record.committedClock ??
                defaultClock,
                80,
            ),
    };
}

function normalizeNpcInjury(
    source,
    defaultClock,
) {
    const record =
        typeof source === 'string'
            ? {
                description: source,
                status: 'active',
            }
            : source || {};
    const description =
        compactText(
            record.description ??
            record.value ??
            record.resultText,
            500,
        );
    if (!description) return null;
    const status = enumValue(
        record.status,
        NPC_INJURY_STATUS_VALUES,
        'active',
    );
    return {
        type:
            compactText(
                record.type,
                80,
            ).toLocaleLowerCase() ||
            'unknown',
        description,
        status,
        startedClock:
            compactText(
                record.startedClock ??
                record.committedClock ??
                defaultClock,
                80,
            ),
        resolvedClock:
            status === 'resolved'
                ? compactText(
                    record.resolvedClock,
                    80,
                )
                : '',
    };
}

function normalizeNpcInjuryAssessment(
    source = {},
    defaultClock = '',
) {
    const record =
        source || {};
    const status =
        enumValue(
            record.status,
            NPC_INJURY_ASSESSMENT_VALUES,
        );
    if (status === 'unknown') {
        return {
            status,
            summary: '',
            asOfClock: '',
        };
    }
    return {
        status,
        summary:
            compactText(
                record.summary,
                500,
            ),
        asOfClock:
            compactText(
                record.asOfClock ??
                defaultClock,
                80,
            ),
    };
}

export function normalizeNpcBody(
    source = {},
) {
    const record =
        source || {};
    const asOfClock =
        compactText(
            record.asOfClock,
            80,
        );
    const height =
        record.height || {};
    const centimeters =
        Number(
            height.centimeters,
        );
    const validCentimeters =
        Number.isFinite(centimeters) &&
        centimeters >= 20 &&
        centimeters <= 300
            ? Math.round(
                centimeters * 10,
            ) / 10
            : null;
    let heightPrecision =
        enumValue(
            height.precision,
            NPC_HEIGHT_PRECISION_VALUES,
        );
    let heightCategory =
        enumValue(
            height.category,
            NPC_HEIGHT_CATEGORY_VALUES,
        );
    if (
        validCentimeters === null &&
        heightCategory === 'unknown'
    ) {
        heightPrecision = 'unknown';
    } else if (
        validCentimeters === null &&
        ![
            'category',
            'unknown',
        ].includes(heightPrecision)
    ) {
        heightPrecision = 'category';
    }
    if (
        validCentimeters !== null &&
        heightPrecision === 'unknown'
    ) {
        heightPrecision =
            'approximate';
    }
    if (
        heightPrecision === 'unknown'
    ) {
        heightCategory = 'unknown';
    }
    const form =
        typeof record.form ===
            'string'
            ? {
                code: record.form,
                label: record.form,
            }
            : record.form || {};
    const formCode =
        compactText(
            form.code,
            80,
        ).toLocaleLowerCase()
            .replace(
                /[^a-z0-9_]+/gu,
                '_',
            )
            .replace(
                /^_+|_+$/gu,
                '',
            ) ||
        'unknown';
    const features =
        stableUnique(
            (
                Array.isArray(
                    record.features,
                )
                    ? record.features
                    : []
            )
                .map(feature =>
                    normalizeNpcFeature(
                        feature,
                        asOfClock,
                    ))
                .filter(Boolean),
            feature =>
                [
                    feature.type,
                    feature.description
                        .toLocaleLowerCase(),
                    feature.asOfClock,
                ].join(':'),
        );
    const injuries =
        stableUnique(
            (
                Array.isArray(
                    record.injuries,
                )
                    ? record.injuries
                    : []
            )
                .map(injury =>
                    normalizeNpcInjury(
                        injury,
                        asOfClock,
                    ))
                .filter(Boolean),
            injury =>
                [
                    injury.type,
                    injury.description
                        .toLocaleLowerCase(),
                    injury.startedClock,
                ].join(':'),
        ).slice(-24);
    return {
        height: {
            category:
                heightCategory,
            centimeters:
                validCentimeters,
            precision:
                heightPrecision,
            asOfClock:
                compactText(
                    height.asOfClock ??
                    asOfClock,
                    80,
                ),
        },
        build:
            compactText(
                record.build,
                120,
            ) || 'unknown',
        naturalHairColor:
            compactText(
                record.naturalHairColor,
                120,
            ) || 'unknown',
        hairColor:
            compactText(
                record.hairColor,
                120,
            ) || 'unknown',
        hairStyle:
            compactText(
                record.hairStyle,
                240,
            ) || 'unknown',
        eyeColor:
            compactText(
                record.eyeColor,
                120,
            ) || 'unknown',
        features,
        injuries,
        injuryAssessment:
            normalizeNpcInjuryAssessment(
                record.injuryAssessment,
                asOfClock,
            ),
        form: {
            code: formCode,
            label:
                compactText(
                    form.label,
                    120,
                ) ||
                (
                    formCode ===
                        'unknown'
                        ? ''
                        : formCode
                ),
            asOfClock:
                compactText(
                    form.asOfClock ??
                    asOfClock,
                    80,
                ),
        },
        asOfClock,
    };
}

function normalizeNpcProvenanceRecord(
    source = {},
) {
    const fieldPath =
        compactText(
            source.fieldPath,
            240,
        );
    const sourceRef =
        compactText(
            source.sourceRef,
            500,
        );
    if (
        !fieldPath ||
        !sourceRef
    ) {
        return null;
    }
    return {
        fieldPath,
        sourceTier:
            enumValue(
                source.sourceTier,
                NPC_PROVENANCE_SOURCE_TIER_VALUES,
            ),
        sourceRef,
        effectiveFrom:
            compactText(
                source.effectiveFrom,
                80,
            ),
        effectiveTo:
            compactText(
                source.effectiveTo,
                80,
            ),
    };
}

export function normalizeNpcProvenance(
    source = {},
) {
    const records =
        stableUnique(
            (
                Array.isArray(
                    source.records,
                )
                    ? source.records
                    : []
            )
                .map(
                    normalizeNpcProvenanceRecord,
                )
                .filter(Boolean),
            record =>
                [
                    record.fieldPath,
                    record.sourceTier,
                    record.sourceRef,
                    record.effectiveFrom,
                    record.effectiveTo,
                ].join(':'),
        );
    return {
        registryVersion:
            Math.max(
                0,
                nullableInteger(
                    source.registryVersion,
                    0,
                    1000000,
                ) || 0,
            ),
        generatedBy:
            compactText(
                source.generatedBy,
                120,
            ) ||
            'unknown',
        records,
    };
}

export function normalizeNpcIdentity(
    source = {},
) {
    const record =
        source || {};
    const education =
        stableUnique(
            (
                Array.isArray(
                    record.education,
                )
                    ? record.education
                    : []
            ).map(
                normalizeNpcEducation,
            ),
            item =>
                [
                    item.schoolId,
                    item.houseId,
                    item.entryYear ?? '',
                    item.exitYear ?? '',
                ].join(':'),
        );
    return {
        version:
            NPC_IDENTITY_VERSION,
        gender:
            normalizeNpcGender(
                record.gender,
            ),
        birth:
            normalizeNpcBirth(
                record.birth,
            ),
        education,
        lineage:
            normalizeNpcLineage(
                record.lineage,
            ),
        body:
            normalizeNpcBody(
                record.body,
            ),
        provenance:
            normalizeNpcProvenance(
                record.provenance,
            ),
    };
}

export function validateNpcIdentity(
    source,
) {
    const errors = [];
    if (
        !source ||
        typeof source !== 'object' ||
        Array.isArray(source)
    ) {
        return {
            valid: false,
            errors: [
                'identity must be an object',
            ],
        };
    }
    if (
        source.version !==
        NPC_IDENTITY_VERSION
    ) {
        errors.push(
            'identity.version must be 1',
        );
    }
    if (
        !source.gender ||
        !NPC_GENDER_VALUES.includes(
            source.gender.code,
        ) ||
        typeof source.gender.label !==
            'string'
    ) {
        errors.push(
            'identity.gender is invalid',
        );
    }
    if (
        !source.birth ||
        typeof source.birth !==
            'object' ||
        Array.isArray(
            source.birth,
        ) ||
        !NPC_BIRTH_PRECISION_VALUES
            .includes(
                source.birth
                    .precision,
            )
    ) {
        errors.push(
            'identity.birth is invalid',
        );
    } else {
        const allowedKeys =
            new Set([
                'date',
                'year',
                'precision',
            ]);
        if (
            Object.keys(
                source.birth,
            ).some(key =>
                !allowedKeys.has(key))
        ) {
            errors.push(
                'identity.birth has unsupported fields',
            );
        }
        const validDate =
            typeof source.birth
                .date === 'string' &&
            (
                !source.birth.date ||
                parseIsoDate(
                    source.birth.date,
                )
            );
        const validYear =
            source.birth.year ===
                null ||
            (
                Number.isInteger(
                    source.birth.year,
                ) &&
                source.birth.year >=
                    -10000 &&
                source.birth.year <=
                    10000
            );
        if (
            !validDate ||
            !validYear ||
            (
                source.birth
                    .precision ===
                    'exact' &&
                (
                    !source.birth.date ||
                    source.birth.year !==
                        null
                )
            ) ||
            (
                source.birth
                    .precision ===
                    'year' &&
                (
                    source.birth.date !==
                        '' ||
                    !Number.isInteger(
                        source.birth.year,
                    )
                )
            ) ||
            (
                source.birth
                    .precision ===
                    'unknown' &&
                (
                    source.birth.date !==
                        '' ||
                    source.birth.year !==
                        null
                )
            )
        ) {
            errors.push(
                'identity.birth value does not match precision',
            );
        }
    }
    if (
        !Array.isArray(
            source.education,
        )
    ) {
        errors.push(
            'identity.education must be an array',
        );
    } else {
        source.education
            .forEach(
                (
                    education,
                    index,
                ) => {
                    if (
                        !education ||
                        typeof education
                            .schoolId !==
                            'string' ||
                        typeof education
                            .houseId !==
                            'string' ||
                        !NPC_EDUCATION_STATUS_VALUES
                            .includes(
                                education
                                    .status,
                            )
                    ) {
                        errors.push(
                            `identity.education[${index}] is invalid`,
                        );
                    }
                    for (
                        const key
                        of [
                            'entryYear',
                            'exitYear',
                            'yearOverride',
                        ]
                    ) {
                        if (
                            education?.[
                                key
                            ] !== null &&
                            !Number.isInteger(
                                education?.[
                                    key
                                ],
                            )
                        ) {
                            errors.push(
                                `identity.education[${index}].${key} is invalid`,
                            );
                        }
                    }
                },
            );
    }
    if (
        !source.lineage ||
        !NPC_LINEAGE_VALUES
            .includes(
                source.lineage
                    .status,
            ) ||
        typeof source.lineage
            .basis !== 'string'
    ) {
        errors.push(
            'identity.lineage is invalid',
        );
    }
    const body =
        source.body;
    if (
        !body ||
        typeof body !== 'object' ||
        !body.height ||
        !NPC_HEIGHT_CATEGORY_VALUES
            .includes(
                body.height.category,
            ) ||
        !NPC_HEIGHT_PRECISION_VALUES
            .includes(
                body.height.precision,
            ) ||
        (
            body.height.centimeters !==
                null &&
            !Number.isFinite(
                body.height
                    .centimeters,
            )
        ) ||
        !Array.isArray(
            body.features,
        ) ||
        !Array.isArray(
            body.injuries,
        ) ||
        !body.injuryAssessment ||
        !NPC_INJURY_ASSESSMENT_VALUES
            .includes(
                body.injuryAssessment
                    .status,
            ) ||
        typeof body.injuryAssessment
            .summary !== 'string' ||
        typeof body.injuryAssessment
            .asOfClock !== 'string' ||
        !body.form ||
        typeof body.form.code !==
            'string'
    ) {
        errors.push(
            'identity.body is invalid',
        );
    } else {
        body.features
            .forEach(
                (
                    feature,
                    index,
                ) => {
                    if (
                        !feature
                            ?.description ||
                        !NPC_FEATURE_STATUS_VALUES
                            .includes(
                                feature
                                    .status,
                            )
                    ) {
                        errors.push(
                            `identity.body.features[${index}] is invalid`,
                        );
                    }
                },
            );
        body.injuries
            .forEach(
                (
                    injury,
                    index,
                ) => {
                    if (
                        !injury
                            ?.description ||
                        !NPC_INJURY_STATUS_VALUES
                            .includes(
                                injury
                                    .status,
                            )
                    ) {
                        errors.push(
                            `identity.body.injuries[${index}] is invalid`,
                        );
                    }
                },
            );
    }
    if (
        !source.provenance ||
        !Number.isInteger(
            source.provenance
                .registryVersion,
        ) ||
        typeof source.provenance
            .generatedBy !==
            'string' ||
        !Array.isArray(
            source.provenance.records,
        )
    ) {
        errors.push(
            'identity.provenance is invalid',
        );
    } else {
        source.provenance.records
            .forEach(
                (
                    record,
                    index,
                ) => {
                    if (
                        !record
                            ?.fieldPath ||
                        !record
                            ?.sourceRef ||
                        !NPC_PROVENANCE_SOURCE_TIER_VALUES
                            .includes(
                                record
                                    .sourceTier,
                            )
                    ) {
                        errors.push(
                            `identity.provenance.records[${index}] is invalid`,
                        );
                    }
                },
            );
    }
    return {
        valid:
            errors.length === 0,
        errors,
    };
}

function parseWorldClockDate(
    clock,
) {
    const match =
        compactText(
            clock,
            120,
        ).match(
            /(-?\d{4,6})-(\d{2})-(\d{2})/u,
        );
    return match
        ? parseIsoDate(
            `${match[1]}-${match[2]}-${match[3]}`,
        )
        : null;
}

function ageOnDate(
    birthDate,
    currentDate,
) {
    if (
        !birthDate ||
        !currentDate
    ) {
        return null;
    }
    let age =
        currentDate.year -
        birthDate.year;
    if (
        currentDate.month <
            birthDate.month ||
        (
            currentDate.month ===
                birthDate.month &&
            currentDate.day <
                birthDate.day
        )
    ) {
        age -= 1;
    }
    return Math.max(
        0,
        age,
    );
}

export function deriveNpcAgeAtClock(
    birth,
    clock,
) {
    const normalized =
        normalizeNpcBirth(
            birth,
        );
    const currentDate =
        parseWorldClockDate(
            clock,
        );
    if (
        !currentDate ||
        normalized.precision !==
            'exact'
    ) {
        return {
            years: null,
            minimumYears: null,
            maximumYears: null,
            precision: 'unknown',
        };
    }
    const exactBirth =
        parseIsoDate(
            normalized.date,
        );
    if (!exactBirth) {
        return {
            years: null,
            minimumYears: null,
            maximumYears: null,
            precision: 'unknown',
        };
    }
    const years =
        ageOnDate(
            exactBirth,
            currentDate,
        );
    return {
        years,
        minimumYears: years,
        maximumYears: years,
        precision: 'exact',
    };
}

export function deriveNpcAgeBand(
    age,
) {
    const record =
        typeof age === 'number'
            ? {
                years: age,
                minimumYears: age,
                maximumYears: age,
            }
            : age || {};
    const minimum =
        Number.isFinite(
            record.years,
        )
            ? record.years
            : record.minimumYears;
    const maximum =
        Number.isFinite(
            record.years,
        )
            ? record.years
            : record.maximumYears;
    if (
        !Number.isFinite(minimum) ||
        !Number.isFinite(maximum)
    ) {
        return 'unknown';
    }
    const bandFor = years => {
        if (years <= 10) {
            return 'child';
        }
        if (years <= 17) {
            return 'adolescent';
        }
        if (years <= 24) {
            return 'young_adult';
        }
        if (years <= 44) {
            return 'adult';
        }
        if (years <= 64) {
            return 'middle_aged';
        }
        return 'older_adult';
    };
    const minimumBand =
        bandFor(minimum);
    const maximumBand =
        bandFor(maximum);
    return minimumBand ===
        maximumBand
        ? minimumBand
        : 'unknown';
}

export function deriveNpcRelativeAge(
    age,
    referenceAge,
) {
    const actorYears =
        typeof age === 'number'
            ? age
            : age?.years;
    const referenceYears =
        typeof referenceAge ===
            'number'
            ? referenceAge
            : referenceAge?.years;
    if (
        !Number.isFinite(
            actorYears,
        ) ||
        !Number.isFinite(
            referenceYears,
        )
    ) {
        return {
            band: 'unknown',
            years: null,
        };
    }
    const difference =
        actorYears -
        referenceYears;
    return {
        band:
            difference <= -6
                ? 'much_younger'
                : difference <= -2
                    ? 'younger_peer'
                    : difference <= 1
                        ? 'same_age'
                        : difference <= 5
                            ? 'older_peer'
                            : 'older_generation',
        years: difference,
    };
}

export function deriveNpcEducationAtClock(
    education,
    clock,
) {
    const record =
        normalizeNpcEducation(
            education,
        );
    const currentDate =
        parseWorldClockDate(
            clock,
        );
    if (!currentDate) {
        return {
            status:
                record.status,
            currentYear: null,
            isEnrolled:
                record.status ===
                'enrolled',
            academicYear: null,
        };
    }
    const academicYear =
        currentDate.month >= 9
            ? currentDate.year
            : currentDate.year - 1;
    if (
        record.entryYear === null
    ) {
        return {
            status:
                record.status,
            currentYear:
                record.status ===
                    'enrolled'
                    ? record
                        .yearOverride
                    : null,
            isEnrolled:
                record.status ===
                'enrolled',
            academicYear,
        };
    }
    if (
        academicYear <
        record.entryYear
    ) {
        return {
            status:
                'prospective',
            currentYear: null,
            isEnrolled: false,
            academicYear,
        };
    }
    if (
        record.exitYear !== null &&
        academicYear >=
            record.exitYear
    ) {
        const terminalStatus =
            [
                'left',
                'expelled',
            ].includes(
                record.status,
            )
                ? record.status
                : 'graduated';
        return {
            status:
                terminalStatus,
            currentYear: null,
            isEnrolled: false,
            academicYear,
        };
    }
    if (
        [
            'left',
            'expelled',
        ].includes(record.status)
    ) {
        return {
            status:
                record.status,
            currentYear: null,
            isEnrolled: false,
            academicYear,
        };
    }
    const calculatedYear =
        academicYear -
        record.entryYear +
        1;
    return {
        status: 'enrolled',
        currentYear:
            record.yearOverride ??
            calculatedYear,
        isEnrolled: true,
        academicYear,
    };
}

export function projectNpcIdentity(
    source,
    {
        clock = '',
        referenceAge = null,
        referenceIdentity = null,
        includeProvenance = false,
    } = {},
) {
    const identity =
        normalizeNpcIdentity(
            source,
        );
    const age =
        deriveNpcAgeAtClock(
            identity.birth,
            clock,
        );
    const resolvedReferenceAge =
        referenceIdentity
            ? deriveNpcAgeAtClock(
                normalizeNpcIdentity(
                    referenceIdentity,
                ).birth,
                clock,
            )
            : referenceAge;
    const projection = {
        version:
            identity.version,
        gender:
            structuredClone(
                identity.gender,
            ),
        birth:
            structuredClone(
                identity.birth,
            ),
        education:
            identity.education
                .map(record => ({
                    ...structuredClone(
                        record,
                    ),
                    current:
                        deriveNpcEducationAtClock(
                            record,
                            clock,
                        ),
                })),
        lineage:
            structuredClone(
                identity.lineage,
            ),
        body:
            structuredClone(
                identity.body,
            ),
        derived: {
            age,
            ageBand:
                deriveNpcAgeBand(
                    age,
                ),
            relativeAge:
                deriveNpcRelativeAge(
                    age,
                    resolvedReferenceAge,
                ),
        },
    };
    if (includeProvenance) {
        projection.provenance =
            structuredClone(
                identity.provenance,
            );
    }
    return projection;
}
