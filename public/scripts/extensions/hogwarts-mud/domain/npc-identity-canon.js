import {
    CANON_CHARACTER_CATALOG,
    CANON_CHARACTER_CATALOG_VERSION,
    findCanonCharacter,
} from '../canon-characters.js';
import {
    normalizeNpcIdentity,
} from './npc-identity-schema.js';

export const CANON_IDENTITY_REGISTRY_VERSION = 1;

const MONTH_NUMBER = Object.freeze({
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
});

const CORE_BODY_BASELINES = Object.freeze({
    canon_harry_james_potter: {
        body: {
            height: {
                category: 'short',
                precision: 'category',
                asOfClock: '1991-09-01',
            },
            build: 'slight',
            naturalHairColor: 'black',
            hairColor: 'black',
            hairStyle: 'untidy',
            eyeColor: 'green',
            features: [{
                type: 'scar',
                description:
                    'Lightning-shaped scar on the forehead.',
                status: 'permanent',
                asOfClock:
                    '1991-09-01',
            }],
            form: {
                code: 'human',
                label: 'human',
                asOfClock:
                    '1991-09-01',
            },
            asOfClock:
                '1991-09-01',
        },
        sourceRef:
            'book:philosophers_stone',
        fields: [
            'body.height',
            'body.build',
            'body.naturalHairColor',
            'body.hairColor',
            'body.hairStyle',
            'body.eyeColor',
            'body.features',
            'body.form',
        ],
    },
    canon_ronald_bilius_weasley: {
        body: {
            height: {
                category: 'tall',
                precision: 'category',
                asOfClock: '1991-09-01',
            },
            build: 'lanky',
            naturalHairColor: 'red',
            hairColor: 'red',
            hairStyle: 'unknown',
            eyeColor: 'blue',
            features: [{
                type: 'freckles',
                description: 'Freckled face.',
                status: 'permanent',
                asOfClock:
                    '1991-09-01',
            }],
            form: {
                code: 'human',
                label: 'human',
                asOfClock:
                    '1991-09-01',
            },
            asOfClock:
                '1991-09-01',
        },
        sourceRef:
            'book:philosophers_stone',
        fields: [
            'body.height',
            'body.build',
            'body.naturalHairColor',
            'body.hairColor',
            'body.eyeColor',
            'body.features',
            'body.form',
        ],
    },
    canon_hermione_jean_granger: {
        body: {
            height: {
                category: 'unknown',
                precision: 'unknown',
                asOfClock: '1991-09-01',
            },
            build: 'unknown',
            naturalHairColor: 'brown',
            hairColor: 'brown',
            hairStyle: 'bushy',
            eyeColor: 'brown',
            features: [{
                type: 'teeth',
                description:
                    'Large front teeth.',
                status: 'active',
                asOfClock:
                    '1991-09-01',
            }],
            form: {
                code: 'human',
                label: 'human',
                asOfClock:
                    '1991-09-01',
            },
            asOfClock:
                '1991-09-01',
        },
        sourceRef:
            'book:philosophers_stone',
        fields: [
            'body.naturalHairColor',
            'body.hairColor',
            'body.hairStyle',
            'body.eyeColor',
            'body.features',
            'body.form',
        ],
    },
    canon_draco_malfoy: {
        body: {
            height: {
                category: 'unknown',
                precision: 'unknown',
                asOfClock: '1991-09-01',
            },
            build: 'slim',
            naturalHairColor:
                'white-blond',
            hairColor:
                'white-blond',
            hairStyle: 'sleek',
            eyeColor: 'grey',
            features: [{
                type: 'complexion',
                description:
                    'Pale, pointed face.',
                status: 'permanent',
                asOfClock:
                    '1991-09-01',
            }],
            form: {
                code: 'human',
                label: 'human',
                asOfClock:
                    '1991-09-01',
            },
            asOfClock:
                '1991-09-01',
        },
        sourceRef:
            'book:philosophers_stone',
        fields: [
            'body.build',
            'body.naturalHairColor',
            'body.hairColor',
            'body.hairStyle',
            'body.eyeColor',
            'body.features',
            'body.form',
        ],
    },
    canon_neville_longbottom: {
        body: {
            height: {
                category: 'short',
                precision: 'category',
                asOfClock: '1991-09-01',
            },
            build: 'plump',
            naturalHairColor: 'blond',
            hairColor: 'blond',
            hairStyle: 'unknown',
            eyeColor: 'unknown',
            features: [{
                type: 'face',
                description: 'Round face.',
                status: 'permanent',
                asOfClock:
                    '1991-09-01',
            }],
            form: {
                code: 'human',
                label: 'human',
                asOfClock:
                    '1991-09-01',
            },
            asOfClock:
                '1991-09-01',
        },
        sourceRef:
            'book:philosophers_stone',
        fields: [
            'body.height',
            'body.build',
            'body.naturalHairColor',
            'body.hairColor',
            'body.features',
            'body.form',
        ],
    },
    canon_minerva_mcgonagall: {
        body: {
            height: {
                category: 'tall',
                precision: 'category',
                asOfClock: '1991-09-01',
            },
            build: 'slim',
            naturalHairColor: 'black',
            hairColor: 'black',
            hairStyle:
                'drawn into a tight bun',
            eyeColor: 'unknown',
            form: {
                code: 'human',
                label: 'human',
                asOfClock:
                    '1991-09-01',
            },
            asOfClock:
                '1991-09-01',
        },
        sourceRef:
            'book:philosophers_stone',
        fields: [
            'body.height',
            'body.build',
            'body.naturalHairColor',
            'body.hairColor',
            'body.hairStyle',
            'body.form',
        ],
    },
    canon_rubeus_hagrid: {
        body: {
            height: {
                category: 'very_tall',
                precision: 'category',
                asOfClock: '1991-07-31',
            },
            build: 'very_broad',
            naturalHairColor: 'black',
            hairColor: 'black',
            hairStyle:
                'long and wild, with a full beard',
            eyeColor: 'black',
            form: {
                code:
                    'half_human_half_giant',
                label:
                    'half-human, half-giant',
                asOfClock:
                    '1991-07-31',
            },
            asOfClock:
                '1991-07-31',
        },
        sourceRef:
            'book:philosophers_stone',
        fields: [
            'body.height',
            'body.build',
            'body.naturalHairColor',
            'body.hairColor',
            'body.hairStyle',
            'body.eyeColor',
            'body.form',
        ],
    },
});

function pad(
    value,
) {
    return String(value)
        .padStart(2, '0');
}

function isoDate(
    year,
    month,
    day,
) {
    return [
        String(year)
            .padStart(4, '0'),
        pad(month),
        pad(day),
    ].join('-');
}

function daysInMonth(
    year,
    month,
) {
    return new Date(
        Date.UTC(
            year,
            month,
            0,
        ),
    ).getUTCDate();
}

function exactFullDate(
    value,
) {
    const match =
        String(value || '')
            .match(
                /^(\d{1,2})\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(\d{4})$/iu,
            );
    if (!match) return null;
    const date = {
        year: Number(match[3]),
        month:
            MONTH_NUMBER[
                match[2]
                    .toLocaleLowerCase()
            ],
        day: Number(match[1]),
    };
    return (
        date.day >= 1 &&
        date.day <=
            daysInMonth(
                date.year,
                date.month,
            )
    )
        ? date
        : null;
}

function unknownBirth() {
    return {
        date: '',
        year: null,
        precision: 'unknown',
    };
}

export function mapCanonBirth(
    value,
) {
    const text =
        String(value || '')
            .normalize('NFKC')
            .trim();
    if (!text) {
        return unknownBirth();
    }
    const fullDate =
        exactFullDate(text);
    if (fullDate) {
        const date = isoDate(
            fullDate.year,
            fullDate.month,
            fullDate.day,
        );
        return {
            date,
            year: null,
            precision: 'exact',
        };
    }
    const exactYear =
        text.match(
            /^(\d{4})$/u,
        );
    if (exactYear) {
        return {
            date: '',
            year:
                Number(
                    exactYear[1],
                ),
            precision: 'year',
        };
    }
    const monthYear =
        text.match(
            /^(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(\d{4})$/iu,
        );
    if (monthYear) {
        return {
            date: '',
            year:
                Number(
                    monthYear[2],
                ),
            precision: 'year',
        };
    }
    return unknownBirth();
}

function mapGender(
    value,
) {
    const normalized =
        String(value || '')
            .trim()
            .toLocaleLowerCase();
    const code =
        normalized === 'female'
            ? 'female'
            : normalized === 'male'
                ? 'male'
                : 'unknown';
    return {
        code,
        label:
            code === 'unknown'
                ? ''
                : String(value)
                    .trim(),
    };
}

function mapLineage(
    value,
) {
    const normalized =
        String(value || '')
            .normalize('NFKC')
            .toLocaleLowerCase()
            .replace(
                /[^a-z]+/gu,
                '_',
            )
            .replace(
                /^_+|_+$/gu,
                '',
            );
    const exact = {
        pure_blood: 'pure_blood',
        half_blood: 'half_blood',
        muggle_born: 'muggle_born',
        muggle: 'muggle',
    }[normalized];
    return {
        status:
            exact || 'unknown',
        basis:
            String(value || '')
                .trim(),
    };
}

function deriveHogwartsEntryYear(
    birth,
) {
    if (
        birth.precision !==
            'exact' ||
        !birth.date
    ) {
        return null;
    }
    const [
        year,
        month,
    ] = birth.date
        .split('-')
        .map(Number);
    return year +
        (
            month >= 9
                ? 12
                : 11
        );
}

function mapHouseId(
    value,
) {
    const normalized =
        String(value || '')
            .trim()
            .toLocaleLowerCase();
    return [
        'gryffindor',
        'hufflepuff',
        'ravenclaw',
        'slytherin',
    ].includes(normalized)
        ? normalized
        : 'unknown';
}

function provenanceRecord(
    fieldPath,
    sourceTier,
    sourceRef,
    effectiveFrom = '',
    effectiveTo = '',
) {
    return {
        fieldPath,
        sourceTier,
        sourceRef,
        effectiveFrom,
        effectiveTo,
    };
}

function buildCatalogProvenance(
    character,
    education,
) {
    const sourceRef =
        `canon-character-catalog:v${CANON_CHARACTER_CATALOG_VERSION}`;
    const records = [];
    if (character.gender) {
        records.push(
            provenanceRecord(
                'gender',
                'canon_catalog',
                sourceRef,
            ),
        );
    }
    if (character.born) {
        records.push(
            provenanceRecord(
                'birth',
                'canon_catalog',
                sourceRef,
            ),
        );
    }
    if (
        character.ancestry &&
        mapLineage(
            character.ancestry,
        ).status !== 'unknown'
    ) {
        records.push(
            provenanceRecord(
                'lineage',
                'canon_catalog',
                sourceRef,
            ),
        );
    }
    if (education.length) {
        records.push(
            provenanceRecord(
                'education',
                'canon_catalog',
                sourceRef,
            ),
        );
    }
    if (character.species) {
        records.push(
            provenanceRecord(
                'body.form',
                'canon_catalog',
                sourceRef,
            ),
        );
    }
    return records;
}

function mapCatalogForm(
    species,
) {
    const normalized =
        String(species || '')
            .trim()
            .toLocaleLowerCase();
    if (normalized === 'human') {
        return {
            code: 'human',
            label: 'human',
            asOfClock: '',
        };
    }
    if (!normalized) {
        return {
            code: 'unknown',
            label: '',
            asOfClock: '',
        };
    }
    return {
        code:
            normalized
                .replace(
                    /[^a-z0-9]+/gu,
                    '_',
                )
                .replace(
                    /^_+|_+$/gu,
                    '',
                ) ||
            'unknown',
        label:
            String(species)
                .trim(),
        asOfClock: '',
    };
}

function buildCanonIdentity(
    character,
) {
    const birth =
        mapCanonBirth(
            character.born,
        );
    const houseId =
        mapHouseId(
            character.house,
        );
    const entryYear =
        houseId === 'unknown'
            ? null
            : deriveHogwartsEntryYear(
                birth,
            );
    const education =
        houseId === 'unknown'
            ? []
            : [{
                schoolId:
                    'hogwarts',
                houseId,
                entryYear,
                exitYear:
                    entryYear === null
                        ? null
                        : entryYear + 7,
                status: 'unknown',
                yearOverride: null,
            }];
    const baseline =
        CORE_BODY_BASELINES[
            character.id
        ];
    const body = {
        form:
            mapCatalogForm(
                character.species,
            ),
        ...(baseline?.body || {}),
    };
    const provenance = [
        ...buildCatalogProvenance(
            character,
            education,
        ),
        ...(baseline?.fields || [])
            .map(fieldPath =>
                provenanceRecord(
                    fieldPath,
                    'canon_book',
                    baseline.sourceRef,
                    baseline.body
                        .asOfClock ||
                    '',
                )),
    ];
    return normalizeNpcIdentity({
        gender:
            mapGender(
                character.gender,
            ),
        birth,
        education,
        lineage:
            mapLineage(
                character.ancestry,
            ),
        body,
        provenance: {
            registryVersion:
                CANON_IDENTITY_REGISTRY_VERSION,
            generatedBy:
                'offline_canon_identity_registry',
            records: provenance,
        },
    });
}

function deepFreeze(
    value,
) {
    if (
        !value ||
        typeof value !== 'object' ||
        Object.isFrozen(value)
    ) {
        return value;
    }
    Object.values(value)
        .forEach(deepFreeze);
    return Object.freeze(value);
}

export const CANON_IDENTITY_REGISTRY =
    deepFreeze(
        Object.fromEntries(
            CANON_CHARACTER_CATALOG
                .map(character => [
                    character.id,
                    buildCanonIdentity(
                        character,
                    ),
                ]),
        ),
    );

function resolveCanonCharacter(
    value,
) {
    if (
        value &&
        typeof value === 'object'
    ) {
        return (
            findCanonCharacter(
                value
                    .canonCatalogId,
            ) ||
            findCanonCharacter(
                value.id,
            ) ||
            findCanonCharacter(
                value.nameEn,
            )
        );
    }
    return findCanonCharacter(
        value,
    );
}

export function getCanonIdentity(
    value,
) {
    const character =
        resolveCanonCharacter(
            value,
        );
    const identity =
        character &&
        CANON_IDENTITY_REGISTRY[
            character.id
        ];
    return identity
        ? structuredClone(
            identity,
        )
        : null;
}

export function hydrateCanonActorIdentity(
    actor,
) {
    const identity =
        getCanonIdentity(
            actor,
        );
    if (!identity) {
        return {
            actor,
            hydrated: false,
            identity: null,
        };
    }
    return {
        actor: {
            ...actor,
            canonCatalogId:
                resolveCanonCharacter(
                    actor,
                ).id,
            identity,
        },
        hydrated: true,
        identity:
            structuredClone(
                identity,
            ),
    };
}
