import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from './localized-view-model.js';

export const IDENTITY_SOURCE_LABELS =
    Object.freeze({
        authority:
            'ui.dossier.source.authority',
        derived:
            'ui.dossier.source.derived',
        observation:
            'ui.dossier.source.observation',
        self:
            'ui.dossier.source.self',
        other:
            'ui.dossier.source.other',
    });

const GENDER_LABELS = Object.freeze({
    female: 'Female',
    male: 'Male',
    nonbinary: 'Nonbinary',
    other: 'Other',
    unknown: 'Unknown',
});

const LINEAGE_LABELS = Object.freeze({
    pure_blood: 'Pure-blood',
    half_blood: 'Half-blood',
    muggle_born: 'Muggle-born',
    muggle: 'Muggle',
    unknown: 'Unknown',
});

const EDUCATION_STATUS_LABELS =
    Object.freeze({
        prospective:
            'Prospective student',
        enrolled: 'Enrolled',
        graduated: 'Graduated',
        left: 'Left school',
        expelled: 'Expelled',
        unknown: 'Unknown',
    });

const HEIGHT_LABELS = Object.freeze({
    very_short: 'Very short',
    short: 'Short',
    average: 'Average',
    tall: 'Tall',
    very_tall: 'Very tall',
    unknown: 'Unknown',
});

const FEATURE_STATUS_LABELS =
    Object.freeze({
        active: 'Current',
        resolved: 'Resolved',
        permanent: 'Permanent',
        unknown: 'Status unknown',
    });

const INJURY_STATUS_LABELS =
    Object.freeze({
        active: 'Unhealed',
        resolved: 'Resolved',
        chronic: 'Chronic',
        unknown: 'Status unknown',
    });

const SCHOOL_LABELS = Object.freeze({
    hogwarts: 'Hogwarts',
    beauxbatons: 'Beauxbatons',
    durmstrang: 'Durmstrang',
    unknown: 'Unknown',
});

const HOUSE_LABELS = Object.freeze({
    gryffindor: 'Gryffindor',
    slytherin: 'Slytherin',
    ravenclaw: 'Ravenclaw',
    hufflepuff: 'Hufflepuff',
    unknown: 'Unknown',
});

const RELATIONSHIP_LABELS =
    Object.freeze({
        family: 'Family',
        parent: 'Parent',
        child: 'Child',
        sibling: 'Sibling',
        brother: 'Brother',
        sister: 'Sister',
        guardian: 'Guardian',
        ward: 'Ward',
        spouse: 'Spouse',
        partner: 'Partner',
        relative: 'Relative',
        cousin: 'Cousin',
        grandparent: 'Grandparent',
        grandchild: 'Grandchild',
        aunt: 'Aunt',
        uncle: 'Uncle',
        niece: 'Niece',
        nephew: 'Nephew',
    });

function asArray(value) {
    return Array.isArray(value)
        ? value
        : [];
}

function text(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim();
}

function knownText(value) {
    const normalized = text(value);
    return normalized &&
        normalized.toLocaleLowerCase() !==
            'unknown'
        ? normalized
        : '';
}

function staticText(
    displayLocale,
    staticKey,
    sourceTextEn,
) {
    return getStaticLocaleText(
        staticKey,
        normalizeDisplayLocale(
            displayLocale,
        ),
    ) ||
        sourceTextEn;
}

function formatStaticText(
    displayLocale,
    staticKey,
    sourceTextEn,
    values = {},
) {
    return Object.entries(
        values,
    ).reduce(
        (
            output,
            [
                key,
                value,
            ],
        ) =>
            output.replaceAll(
                `{${key}}`,
                String(value),
            ),
        staticText(
            displayLocale,
            staticKey,
            sourceTextEn,
        ),
    );
}

export function getIdentitySourceLabel(
    sourceKind,
    displayLocale = 'zh-CN',
) {
    const staticKey =
        IDENTITY_SOURCE_LABELS[
            sourceKind
        ];
    return staticKey
        ? staticText(
            displayLocale,
            staticKey,
            sourceKind,
        )
        : '';
}

function localizedValue(
    value,
    labels,
    keyPrefix,
    displayLocale,
) {
    const normalized =
        knownText(value);
    if (!normalized) return '';
    const code =
        normalized
            .toLocaleLowerCase();
    const sourceTextEn =
        labels[
            code
        ] ||
        normalized;
    return labels[code]
        ? staticText(
            displayLocale,
            `${keyPrefix}.${code}`,
            sourceTextEn,
        )
        : normalized;
}

function viewEntry(
    label,
    value,
    {
        detail = '',
        sourceKind =
        'authority',
        displayLocale =
        'zh-CN',
    } = {},
) {
    const normalized =
        knownText(value);
    return {
        label,
        value:
            normalized ||
            staticText(
                displayLocale,
                'ui.dossier.unknown',
                'Unknown',
            ),
        detail: text(detail),
        sourceKind:
            normalized
                ? sourceKind
                : '',
        unknown: !normalized,
    };
}

function actorDirectory(
    worldState,
    displayLocale,
) {
    const directory =
        new Map();
    for (const actor of [
        ...asArray(
            worldState?.actors,
        ),
        ...asArray(
            worldState
                ?.actorLibrary,
        ),
    ]) {
        if (!actor?.id) continue;
        directory.set(
            actor.id,
            {
                ...(directory.get(
                    actor.id,
                ) || {}),
                ...actor,
            },
        );
    }
    directory.set('player', {
        id: 'player',
        name:
            worldState?.character
                ?.identity?.name ||
            staticText(
                displayLocale,
                'ui.dossier.you',
                'You',
            ),
    });
    return directory;
}

function actorName(
    directory,
    actorId,
    displayLocale,
) {
    const actor =
        directory.get(actorId);
    return actor?.name ||
        actor?.nameEn ||
        actorId ||
        staticText(
            displayLocale,
            'ui.dossier.unknown_actor',
            'Unknown character',
        );
}

function formatBirth(birth) {
    if (
        birth?.precision ===
            'exact'
    ) {
        return knownText(
            birth.date,
        );
    }
    if (
        birth?.precision ===
            'year' &&
        Number.isInteger(
            birth.year,
        )
    ) {
        return String(
            birth.year,
        );
    }
    return '';
}

function formatAge(
    age,
    displayLocale,
) {
    if (
        Number.isFinite(
            age?.years,
        )
    ) {
        return formatStaticText(
            displayLocale,
            'ui.dossier.age',
            '{age} years old',
            {
                age:
                    age.years,
            },
        );
    }
    return '';
}

function formatHeight(
    height,
    displayLocale,
) {
    if (
        Number.isFinite(
            height?.centimeters,
        )
    ) {
        const prefix =
            height.precision ===
                'approximate'
                ? staticText(
                    displayLocale,
                    'ui.dossier.approximate',
                    'approximately ',
                )
                : '';
        return `${prefix}${height.centimeters} cm`;
    }
    return localizedValue(
        height?.category,
        HEIGHT_LABELS,
        'ui.dossier.height',
        displayLocale,
    );
}

function formatFeature(
    feature,
    displayLocale,
) {
    const description =
        knownText(
            feature?.description,
        );
    if (!description) return '';
    const status =
        localizedValue(
            feature?.status,
            FEATURE_STATUS_LABELS,
            'ui.dossier.feature_status',
            displayLocale,
        );
    return status
        ? formatStaticText(
            displayLocale,
            'ui.dossier.status_parenthetical',
            '{description} ({status})',
            {
                description,
                status,
            },
        )
        : description;
}

function formatInjury(
    injury,
    displayLocale,
) {
    const description =
        knownText(
            injury?.description,
        );
    if (!description) return '';
    const status =
        localizedValue(
            injury?.status,
            INJURY_STATUS_LABELS,
            'ui.dossier.injury_status',
            displayLocale,
        );
    return status
        ? formatStaticText(
            displayLocale,
            'ui.dossier.status_parenthetical',
            '{description} ({status})',
            {
                description,
                status,
            },
        )
        : description;
}

function formatEducationStatus(
    record,
    displayLocale,
) {
    const current =
        record?.current || {};
    if (
        Number.isInteger(
            current.currentYear,
        )
    ) {
        return formatStaticText(
            displayLocale,
            'ui.dossier.grade_enrolled',
            'Year {year} · Enrolled',
            {
                year:
                    current
                        .currentYear,
            },
        );
    }
    return localizedValue(
        current.status ||
            record?.status,
        EDUCATION_STATUS_LABELS,
        'ui.dossier.education_status',
        displayLocale,
    );
}

function educationEntries(
    education,
    displayLocale,
) {
    if (!education.length) {
        return [
            viewEntry(
                staticText(
                    displayLocale,
                    'ui.dossier.field.school',
                    'School',
                ),
                '',
                {
                    displayLocale,
                },
            ),
            viewEntry(
                staticText(
                    displayLocale,
                    'ui.dossier.field.house',
                    'House',
                ),
                '',
                {
                    displayLocale,
                },
            ),
            viewEntry(
                staticText(
                    displayLocale,
                    'ui.dossier.field.enrollment',
                    'Current enrollment',
                ),
                '',
                {
                    displayLocale,
                },
            ),
        ];
    }
    return education.flatMap(
        (record, index) => {
            const suffix =
                education.length > 1
                    ? ` ${index + 1}`
                    : '';
            return [
                viewEntry(
                    `${staticText(
                        displayLocale,
                        'ui.dossier.field.school',
                        'School',
                    )}${suffix}`,
                    localizedValue(
                        record.schoolId,
                        SCHOOL_LABELS,
                        'ui.dossier.school',
                        displayLocale,
                    ),
                    {
                        displayLocale,
                    },
                ),
                viewEntry(
                    `${staticText(
                        displayLocale,
                        'ui.dossier.field.house',
                        'House',
                    )}${suffix}`,
                    localizedValue(
                        record.houseId,
                        HOUSE_LABELS,
                        'ui.dossier.house',
                        displayLocale,
                    ),
                    {
                        displayLocale,
                    },
                ),
                viewEntry(
                    `${staticText(
                        displayLocale,
                        'ui.dossier.field.enrollment',
                        'Current enrollment',
                    )}${suffix}`,
                    formatEducationStatus(
                        record,
                        displayLocale,
                    ),
                    {
                        sourceKind:
                            'derived',
                        displayLocale,
                    },
                ),
            ];
        },
    );
}

function bodyEntries(
    body = {},
    displayLocale,
) {
    const features =
        asArray(body.features);
    const scars =
        features
            .filter(feature =>
                feature.type ===
                    'scar')
            .map(feature =>
                formatFeature(
                    feature,
                    displayLocale,
                ))
            .filter(Boolean);
    const otherFeatures =
        features
            .filter(feature =>
                feature.type !==
                    'scar')
            .map(feature =>
                formatFeature(
                    feature,
                    displayLocale,
                ))
            .filter(Boolean);
    const injuries =
        asArray(body.injuries)
            .map(injury =>
                formatInjury(
                    injury,
                    displayLocale,
                ))
            .filter(Boolean);
    const listSeparator =
        staticText(
            displayLocale,
            'ui.dossier.list_separator',
            '; ',
        );
    const injuryAssessment =
        body.injuryAssessment ||
        {};
    const injuryValue =
        injuries.join(
            listSeparator,
        ) ||
        (
            injuryAssessment
                .status ===
                'no_visible_injury'
                ? staticText(
                    displayLocale,
                    'ui.dossier.no_visible_injury',
                    'No visible injury observed',
                )
                : ''
        );
    const injuryObserved =
        injuryAssessment.status ===
            'no_visible_injury' ||
        injuryAssessment.status ===
            'visible_injury';
    return [
        viewEntry(
            staticText(
                displayLocale,
                'ui.dossier.field.height',
                'Height',
            ),
            formatHeight(
                body.height,
                displayLocale,
            ),
            {
                displayLocale,
            },
        ),
        viewEntry(
            staticText(
                displayLocale,
                'ui.dossier.field.build',
                'Build',
            ),
            knownText(
                body.build,
            ),
            {
                displayLocale,
            },
        ),
        viewEntry(
            staticText(
                displayLocale,
                'ui.dossier.field.natural_hair',
                'Natural hair color',
            ),
            knownText(
                body
                    .naturalHairColor,
            ),
            {
                displayLocale,
            },
        ),
        viewEntry(
            staticText(
                displayLocale,
                'ui.dossier.field.current_hair',
                'Current hair color / dye',
            ),
            knownText(
                body.hairColor,
            ),
            {
                displayLocale,
            },
        ),
        viewEntry(
            staticText(
                displayLocale,
                'ui.dossier.field.hair_style',
                'Hair style',
            ),
            knownText(
                body.hairStyle,
            ),
            {
                displayLocale,
            },
        ),
        viewEntry(
            staticText(
                displayLocale,
                'ui.dossier.field.eyes',
                'Eyes',
            ),
            knownText(
                body.eyeColor,
            ),
            {
                displayLocale,
            },
        ),
        viewEntry(
            staticText(
                displayLocale,
                'ui.dossier.field.scars',
                'Scars',
            ),
            scars.join(
                listSeparator,
            ),
            {
                displayLocale,
            },
        ),
        viewEntry(
            staticText(
                displayLocale,
                'ui.dossier.field.injuries',
                'Injuries',
            ),
            injuryValue,
            injuryObserved
                ? {
                    sourceKind:
                        'observation',
                    detail:
                        knownText(
                            injuryAssessment
                                .asOfClock,
                        )
                            ? formatStaticText(
                                displayLocale,
                                'ui.dossier.as_of',
                                'As of {clock}',
                                {
                                    clock:
                                        injuryAssessment
                                            .asOfClock,
                                },
                            )
                            : '',
                    displayLocale,
                }
                : {
                    displayLocale,
                },
        ),
        viewEntry(
            staticText(
                displayLocale,
                'ui.dossier.field.other_features',
                'Other physical features',
            ),
            otherFeatures.join(
                listSeparator,
            ),
            {
                displayLocale,
            },
        ),
        viewEntry(
            staticText(
                displayLocale,
                'ui.dossier.field.form',
                'Current form',
            ),
            knownText(
                body.form?.label,
            ) ||
            knownText(
                body.form?.code,
            ),
            {
                displayLocale,
            },
        ),
    ];
}

function claimFieldLabel(
    fieldPath,
    displayLocale,
) {
    const path =
        text(fieldPath)
            .replace(
                /^identity\./u,
                '',
            );
    if (
        path.startsWith(
            'gender',
        )
    ) {
        return staticText(
            displayLocale,
            'ui.dossier.field.gender',
            'Gender',
        );
    }
    if (
        path.startsWith(
            'birth',
        )
    ) {
        return staticText(
            displayLocale,
            'ui.dossier.field.birth',
            'Birth',
        );
    }
    if (
        path.startsWith(
            'education',
        )
    ) {
        return staticText(
            displayLocale,
            'ui.dossier.field.education',
            'Education',
        );
    }
    if (
        path.startsWith(
            'lineage',
        )
    ) {
        return staticText(
            displayLocale,
            'ui.dossier.field.lineage',
            'Lineage',
        );
    }
    if (
        path.includes(
            'hairStyle',
        )
    ) {
        return staticText(
            displayLocale,
            'ui.dossier.field.hair_style',
            'Hair style',
        );
    }
    if (
        path.includes(
            'hairColor',
        )
    ) {
        return staticText(
            displayLocale,
            'ui.dossier.field.hair_color',
            'Hair color',
        );
    }
    if (
        path.includes(
            'injur',
        )
    ) {
        return staticText(
            displayLocale,
            'ui.dossier.field.injuries',
            'Injuries',
        );
    }
    if (
        path.includes(
            'feature',
        )
    ) {
        return staticText(
            displayLocale,
            'ui.dossier.field.body_features',
            'Physical features',
        );
    }
    if (
        path.includes(
            'form',
        )
    ) {
        return staticText(
            displayLocale,
            'ui.dossier.field.form',
            'Current form',
        );
    }
    if (
        path.startsWith(
            'body',
        )
    ) {
        return staticText(
            displayLocale,
            'ui.dossier.field.body_status',
            'Physical status',
        );
    }
    return staticText(
        displayLocale,
        'ui.dossier.field.identity',
        'Identity',
    );
}

function objectClaimValue(
    value,
) {
    if (!value) return '';
    const preferred = [
        value.label,
        value.description,
        value.status,
        value.code,
        value.schoolId,
        value.houseId,
        value.date,
    ]
        .map(knownText)
        .filter(Boolean);
    return [
        ...new Set(preferred),
    ].join(' · ');
}

function formatClaimValue(
    claim,
    displayLocale,
) {
    const path =
        text(claim.fieldPath);
    const value =
        claim.value;
    const raw =
        typeof value ===
            'object'
            ? objectClaimValue(
                value,
            )
            : knownText(value);
    if (
        path.startsWith(
            'gender',
        )
    ) {
        return localizedValue(
            value?.code ||
                raw,
            GENDER_LABELS,
            'ui.dossier.gender',
            displayLocale,
        );
    }
    if (
        path.startsWith(
            'lineage',
        )
    ) {
        return localizedValue(
            value?.status ||
                raw,
            LINEAGE_LABELS,
            'ui.dossier.lineage',
            displayLocale,
        );
    }
    if (
        path.startsWith(
            'birth',
        ) &&
        typeof value ===
            'object'
    ) {
        return formatBirth(value);
    }
    return raw;
}

function identityClaimEntries(
    claims,
    directory,
    displayLocale,
) {
    if (!claims.length) {
        return [];
    }
    return claims.map(claim =>
        viewEntry(
            claimFieldLabel(
                claim.fieldPath,
                displayLocale,
            ),
            formatClaimValue(
                claim,
                displayLocale,
            ),
            {
                sourceKind:
                    claim.sourceKind,
                detail:
                    claim.sourceKind ===
                        'self'
                        ? staticText(
                            displayLocale,
                            'ui.dossier.claim.self',
                            'Said by the character',
                        )
                        : formatStaticText(
                            displayLocale,
                            'ui.dossier.claim.other',
                            'Mentioned by {actor}',
                            {
                                actor:
                                    actorName(
                                        directory,
                                        claim
                                            .speakerId,
                                        displayLocale,
                                    ),
                            },
                        ),
                displayLocale,
            },
        ));
}

function relationshipClaimEntries(
    claims,
    references,
    directory,
    displayLocale,
) {
    const referenceById =
        new Map(
            references.map(
                reference => [
                    reference.id,
                    reference,
                ],
            ),
        );
    return claims.map(claim => {
        const reference =
            referenceById.get(
                claim.targetRefId,
            );
        const target =
            knownText(
                reference?.label,
            ) ||
            staticText(
                displayLocale,
                'ui.dossier.unnamed_person',
                'Unnamed person',
            );
        const relationshipKind =
            claim.relationshipKind;
        return {
            label: [
                RELATIONSHIP_LABELS[
                    relationshipKind
                ]
                    ? staticText(
                        displayLocale,
                        `ui.dossier.relationship.${relationshipKind}`,
                        RELATIONSHIP_LABELS[
                            relationshipKind
                        ],
                    )
                    : relationshipKind ||
                        staticText(
                            displayLocale,
                            'ui.dossier.relationship.generic',
                            'Relationship',
                        ),
                target,
            ].join(' · '),
            detail:
                claim.sourceKind ===
                    'self'
                    ? staticText(
                        displayLocale,
                        'ui.dossier.claim.self',
                        'Said by the character',
                    )
                    : claim.sourceKind ===
                        'other'
                        ? formatStaticText(
                            displayLocale,
                            'ui.dossier.claim.other',
                            'Mentioned by {actor}',
                            {
                                actor:
                                    actorName(
                                        directory,
                                        claim
                                            .speakerId,
                                        displayLocale,
                                    ),
                            },
                        )
                        : staticText(
                            displayLocale,
                            'ui.dossier.claim.confirmed',
                            'Confirmed relationship record',
                        ),
            sourceKind:
                claim.sourceKind,
        };
    });
}

function emptyAuthorityProjection() {
    return {
        gender: {
            code: 'unknown',
            label: '',
        },
        birth: {
            date: '',
            year: null,
            precision: 'unknown',
        },
        education: [],
        lineage: {
            status: 'unknown',
        },
        body: {
            height: {
                category: 'unknown',
            },
            build: 'unknown',
            naturalHairColor:
                'unknown',
            hairColor: 'unknown',
            hairStyle: 'unknown',
            eyeColor: 'unknown',
            features: [],
            injuries: [],
            injuryAssessment: {
                status: 'unknown',
                summary: '',
                asOfClock: '',
            },
            form: {
                code: 'unknown',
                label: '',
            },
        },
        derived: {
            age: {
                years: null,
                minimumYears: null,
                maximumYears: null,
            },
        },
    };
}

export function buildNpcIdentityDossierViewModel({
    worldState = {},
    actorId,
    buildIdentityProjection,
    displayLocale =
    'zh-CN',
}) {
    const locale =
        normalizeDisplayLocale(
            displayLocale,
        );
    const directory =
        actorDirectory(
            worldState,
            locale,
        );
    const actor =
        directory.get(actorId) ||
        {};
    const clock =
        worldState.clock || '';
    const authorityCapsule =
        typeof buildIdentityProjection ===
            'function'
            ? buildIdentityProjection(
                worldState,
                actorId,
                'authority',
                {
                    clock,
                },
            )
            : null;
    const playerCapsule =
        typeof buildIdentityProjection ===
            'function'
            ? buildIdentityProjection(
                worldState,
                actorId,
                'player',
                {
                    clock,
                },
            )
            : null;
    const authority =
        authorityCapsule
            ?.authority ||
        emptyAuthorityProjection();
    const claims =
        playerCapsule?.claims ||
        {
            identityClaims: [],
            relationshipClaims:
                [],
            personReferences: [],
        };
    const name =
        actorName(
            directory,
            actorId,
            locale,
        );
    const subtitle = [
        actor.role ||
            actor.roleEn,
        actor
            .relationshipToPlayer,
    ].filter(Boolean).join(' · ');

    return {
        actorId:
            text(actorId),
        displayLocale:
            locale,
        name,
        subtitle:
            subtitle ||
            staticText(
                locale,
                'ui.dossier.subtitle',
                'Character identity dossier',
            ),
        groups: [
            {
                id: 'basic',
                title:
                    staticText(
                        locale,
                        'ui.dossier.group.basic',
                        'Basic identity',
                    ),
                entries: [
                    viewEntry(
                        staticText(
                            locale,
                            'ui.dossier.field.gender',
                            'Gender',
                        ),
                        localizedValue(
                            authority
                                .gender
                                ?.code,
                            GENDER_LABELS,
                            'ui.dossier.gender',
                            locale,
                        ) ||
                        knownText(
                            authority
                                .gender
                                ?.label,
                        ),
                        {
                            displayLocale:
                                locale,
                        },
                    ),
                    viewEntry(
                        staticText(
                            locale,
                            'ui.dossier.field.birth',
                            'Birth',
                        ),
                        formatBirth(
                            authority
                                .birth,
                        ),
                        {
                            displayLocale:
                                locale,
                        },
                    ),
                    viewEntry(
                        staticText(
                            locale,
                            'ui.dossier.field.age',
                            'Current age',
                        ),
                        formatAge(
                            authority
                                .derived
                                ?.age,
                            locale,
                        ),
                        {
                            sourceKind:
                                'derived',
                            displayLocale:
                                locale,
                        },
                    ),
                ],
            },
            {
                id: 'education',
                title:
                    staticText(
                        locale,
                        'ui.dossier.group.education',
                        'Education',
                    ),
                entries:
                    educationEntries(
                        authority
                            .education ||
                        [],
                        locale,
                    ),
            },
            {
                id: 'lineage',
                title:
                    staticText(
                        locale,
                        'ui.dossier.group.lineage',
                        'Lineage',
                    ),
                entries: [
                    viewEntry(
                        staticText(
                            locale,
                            'ui.dossier.field.lineage_status',
                            'Lineage status',
                        ),
                        localizedValue(
                            authority
                                .lineage
                                ?.status,
                            LINEAGE_LABELS,
                            'ui.dossier.lineage',
                            locale,
                        ),
                        {
                            displayLocale:
                                locale,
                        },
                    ),
                ],
            },
            {
                id: 'body',
                title:
                    staticText(
                        locale,
                        'ui.dossier.group.body',
                        'Physical status',
                    ),
                entries:
                    bodyEntries(
                        authority.body,
                        locale,
                    ),
            },
            {
                id: 'claims',
                title:
                    staticText(
                        locale,
                        'ui.dossier.group.claims',
                        'Known claims',
                    ),
                emptyText:
                    staticText(
                        locale,
                        'ui.dossier.no_known_claims',
                        'No known claims',
                    ),
                entries:
                    identityClaimEntries(
                        claims
                            .identityClaims ||
                        [],
                        directory,
                        locale,
                    ),
            },
        ],
        relationshipClaims:
            relationshipClaimEntries(
                claims
                    .relationshipClaims ||
                [],
                claims
                    .personReferences ||
                [],
                directory,
                locale,
            ),
    };
}

function createSourceTag(
    documentRef,
    sourceKind,
    displayLocale,
) {
    const label =
        getIdentitySourceLabel(
            sourceKind,
            displayLocale,
        );
    if (!label) return null;
    const tag =
        documentRef.createElement(
            'span',
        );
    tag.className =
        `hpmud-identity-source is-${sourceKind}`;
    tag.textContent = label;
    return tag;
}

function initials(value) {
    const parts =
        text(value)
            .split(/\s+/u)
            .filter(Boolean);
    if (parts.length > 1) {
        return parts
            .slice(0, 2)
            .map(part =>
                [...part][0])
            .join('')
            .toLocaleUpperCase();
    }
    return [...(
        parts[0] || '?'
    )].slice(0, 2)
        .join('')
        .toLocaleUpperCase();
}

export function createNpcIdentityDossierElement(
    viewModel,
    documentRef =
    globalThis.document,
) {
    const displayLocale =
        normalizeDisplayLocale(
            viewModel
                ?.displayLocale,
        );
    const dossier =
        documentRef.createElement(
            'section',
        );
    dossier.className =
        'hpmud-inspector-card hpmud-identity-dossier';
    dossier.setAttribute(
        'tabindex',
        '0',
    );
    dossier.setAttribute(
        'aria-label',
        formatStaticText(
            displayLocale,
            'ui.dossier.aria',
            '{name} read-only identity dossier',
            {
                name:
                    viewModel.name,
            },
        ),
    );

    const header =
        documentRef.createElement(
            'header',
        );
    header.className =
        'hpmud-identity-header';
    const sigil =
        documentRef.createElement(
            'span',
        );
    sigil.className =
        'hpmud-identity-sigil';
    sigil.textContent =
        initials(
            viewModel.name,
        );
    sigil.setAttribute(
        'aria-hidden',
        'true',
    );
    const copy =
        documentRef.createElement(
            'span',
        );
    const eyebrow =
        documentRef.createElement(
            'small',
        );
    eyebrow.textContent =
        'IDENTITY DOSSIER';
    const title =
        documentRef.createElement(
            'h2',
        );
    title.textContent =
        viewModel.name;
    const subtitle =
        documentRef.createElement(
            'p',
        );
    subtitle.textContent =
        viewModel.subtitle;
    copy.append(
        eyebrow,
        title,
        subtitle,
    );
    header.append(
        sigil,
        copy,
    );

    const grid =
        documentRef.createElement(
            'div',
        );
    grid.className =
        'hpmud-identity-grid';
    for (
        const group
        of viewModel.groups
    ) {
        const section =
            documentRef.createElement(
                'section',
            );
        section.className =
            `hpmud-identity-group is-${group.id}`;
        section.setAttribute(
            'data-identity-group',
            group.id,
        );
        const groupHeader =
            documentRef.createElement(
                'header',
            );
        const groupTitle =
            documentRef.createElement(
                'h3',
            );
        groupTitle.textContent =
            group.title;
        groupHeader.append(
            groupTitle,
        );
        const fields =
            documentRef.createElement(
                group.entries.length
                    ? 'dl'
                    : 'p',
            );
        if (!group.entries.length) {
            fields.className =
                'hpmud-identity-empty';
            fields.textContent =
                group.emptyText ||
                staticText(
                    displayLocale,
                    'ui.inspector.empty',
                    'None yet',
                );
        }
        for (
            const entry
            of group.entries
        ) {
            const field =
                documentRef.createElement(
                    'div',
                );
            field.className = [
                'hpmud-identity-field',
                entry.unknown
                    ? 'is-unknown'
                    : '',
                entry.sourceKind
                    ? `source-${entry.sourceKind}`
                    : '',
            ].filter(Boolean).join(' ');
            if (entry.sourceKind) {
                field.setAttribute(
                    'data-identity-source',
                    entry.sourceKind,
                );
            }
            const term =
                documentRef.createElement(
                    'dt',
                );
            term.textContent =
                entry.label;
            const description =
                documentRef.createElement(
                    'dd',
                );
            const value =
                documentRef.createElement(
                    'span',
                );
            value.textContent =
                entry.value;
            description.append(
                value,
            );
            const entrySource =
                createSourceTag(
                    documentRef,
                    entry.sourceKind,
                    displayLocale,
                );
            if (entrySource) {
                description.append(
                    entrySource,
                );
            }
            if (entry.detail) {
                const detail =
                    documentRef.createElement(
                        'small',
                    );
                detail.textContent =
                    entry.detail;
                description.append(
                    detail,
                );
            }
            field.append(
                term,
                description,
            );
            fields.append(field);
        }
        section.append(
            groupHeader,
            fields,
        );
        grid.append(section);
    }

    dossier.append(
        header,
        grid,
    );
    return dossier;
}
