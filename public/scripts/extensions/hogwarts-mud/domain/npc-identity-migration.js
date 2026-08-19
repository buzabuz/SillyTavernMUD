import {
    getCanonIdentity,
} from './npc-identity-canon.js';
import {
    NPC_IDENTITY_VERSION,
    normalizeNpcIdentity,
} from './npc-identity-schema.js';

export const NPC_IDENTITY_MIGRATION_VERSION = 1;

const LEGACY_PRESENTATION_BODY_KEYS =
    Object.freeze([
        'hair',
        'hairstyle',
        'hairStyle',
        'hairColor',
        'dyedHairColor',
        'naturalHairColor',
        'injury',
        'injuries',
        'visibleInjury',
        'visibleInjuries',
        'scar',
        'scars',
        'bodyCondition',
        'bodyConditions',
        'form',
        'bodyForm',
        'currentForm',
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

function lineageStatus(
    value,
) {
    const normalized =
        compactText(
            value,
            120,
        ).toLocaleLowerCase()
            .replace(
                /[^a-z]+/gu,
                '_',
            )
            .replace(
                /^_+|_+$/gu,
                '',
            );
    return {
        pure_blood: 'pure_blood',
        half_blood: 'half_blood',
        muggle_born: 'muggle_born',
        muggle: 'muggle',
    }[normalized] || 'unknown';
}

function legacyBirth(
    actor,
) {
    const birthDate =
        compactText(
            actor.birthDate,
            40,
        );
    if (
        /^\d{4}-\d{2}-\d{2}$/u
            .test(birthDate)
    ) {
        return {
            date: birthDate,
            year: null,
            precision: 'exact',
        };
    }
    const birthYear =
        Number(
            actor.birthYear,
        );
    if (
        Number.isInteger(
            birthYear,
        )
    ) {
        return {
            date: '',
            year: birthYear,
            precision: 'year',
        };
    }
    const fixedBirthText =
        compactText(
            actor.fixedBirthText,
            160,
        );
    const yearMatch =
        fixedBirthText.match(
            /^(\d{4})$/u,
        );
    if (yearMatch) {
        const year =
            Number(yearMatch[1]);
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

function knownHouseId(
    value,
) {
    const houseId =
        compactText(
            value,
            80,
        ).toLocaleLowerCase();
    return [
        'gryffindor',
        'hufflepuff',
        'ravenclaw',
        'slytherin',
    ].includes(houseId)
        ? houseId
        : 'unknown';
}

function deriveEntryYear(
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

function provenanceRecord(
    fieldPath,
    actor,
) {
    return {
        fieldPath,
        sourceTier:
            'legacy_migration',
        sourceRef:
            `legacy-actor:${compactText(actor.id, 160) || 'unknown'}`,
        effectiveFrom: '',
        effectiveTo: '',
    };
}

function buildLegacyIdentity(
    actor,
    clock,
) {
    const birth =
        legacyBirth(actor);
    const houseId =
        knownHouseId(
            actor.house ??
            actor.houseId,
        );
    const isStudent =
        Number.isInteger(
            Number(
                actor.entryYear,
            ),
        );
    const entryYear =
        isStudent &&
        houseId !== 'unknown'
            ? (
                Number.isInteger(
                    Number(
                        actor.entryYear,
                    ),
                )
                    ? Number(
                        actor.entryYear,
                    )
                    : deriveEntryYear(
                        birth,
                    )
            )
            : null;
    const lineageValue =
        actor.lineage ??
        actor.ancestry ??
        actor.bloodStatus;
    const lineage =
        lineageStatus(
            lineageValue,
        );
    const gender =
        compactText(
            actor.gender,
            80,
        );
    const bodySource =
        actor.body || {};
    const bodyClock =
        compactText(
            bodySource.asOfClock ??
            actor.bodyAsOfClock ??
            clock,
            80,
        );
    const body = {
        ...bodySource,
        height:
            bodySource.height ??
            (
                Number.isFinite(
                    Number(
                        actor.heightCentimeters,
                    ),
                )
                    ? {
                        category:
                            'unknown',
                        centimeters:
                            Number(
                                actor
                                    .heightCentimeters,
                            ),
                        precision:
                            'approximate',
                        asOfClock:
                            bodyClock,
                    }
                    : undefined
            ),
        build:
            bodySource.build ??
            actor.build,
        naturalHairColor:
            bodySource
                .naturalHairColor ??
            actor.naturalHairColor,
        hairColor:
            bodySource.hairColor ??
            actor.hairColor,
        hairStyle:
            bodySource.hairStyle ??
            actor.hairStyle ??
            actor.hairstyle,
        eyeColor:
            bodySource.eyeColor ??
            actor.eyeColor,
        injuries:
            bodySource.injuries ??
            actor.injuries,
        form:
            bodySource.form ??
            actor.currentForm ??
            actor.form,
        asOfClock:
            bodyClock,
    };
    const provenance = [];
    if (gender) {
        provenance.push(
            provenanceRecord(
                'gender',
                actor,
            ),
        );
    }
    if (
        birth.precision !==
        'unknown'
    ) {
        provenance.push(
            provenanceRecord(
                'birth',
                actor,
            ),
        );
    }
    if (entryYear !== null) {
        provenance.push(
            provenanceRecord(
                'education',
                actor,
            ),
        );
    }
    if (lineage !== 'unknown') {
        provenance.push(
            provenanceRecord(
                'lineage',
                actor,
            ),
        );
    }
    for (const [
        key,
        value,
    ] of Object.entries(body)) {
        if (
            value !== undefined &&
            value !== null &&
            value !== ''
        ) {
            provenance.push(
                provenanceRecord(
                    `body.${key}`,
                    actor,
                ),
            );
        }
    }
    return normalizeNpcIdentity({
        gender:
            gender || 'unknown',
        birth,
        education:
            entryYear === null
                ? []
                : [{
                    schoolId:
                        'hogwarts',
                    houseId,
                    entryYear,
                    exitYear:
                        entryYear + 7,
                    status:
                        'unknown',
                    yearOverride:
                        actor.yearOverride,
                }],
        lineage: {
            status: lineage,
            basis:
                lineage === 'unknown'
                    ? ''
                    : compactText(
                        lineageValue,
                        240,
                    ),
        },
        body,
        provenance: {
            registryVersion: 0,
            generatedBy:
                'npc_identity_v1_migration',
            records: provenance,
        },
    });
}

function identityForActor(
    actor,
    clock,
) {
    if (
        actor.identity?.version ===
        NPC_IDENTITY_VERSION
    ) {
        return normalizeNpcIdentity(
            actor.identity,
        );
    }
    return (
        getCanonIdentity(actor) ||
        buildLegacyIdentity(
            actor,
            clock,
        )
    );
}

function conditionKind(
    condition,
) {
    if (
        !condition ||
        typeof condition ===
            'string'
    ) {
        return '';
    }
    return compactText(
        condition.kind ??
        condition.type ??
        condition.category,
        80,
    ).toLocaleLowerCase();
}

function conditionText(
    condition,
) {
    return compactText(
        typeof condition ===
            'string'
            ? condition
            : condition
                ?.description ??
                condition?.value ??
                condition
                    ?.resultText,
        500,
    );
}

function isScarCondition(
    condition,
) {
    return conditionKind(condition) ===
        'scar';
}

function isInjuryCondition(
    condition,
) {
    return (
        [
            'injury',
            'wound',
            'body_injury',
        ].includes(
            conditionKind(
                condition,
            ),
        )
    );
}

function asArray(
    value,
) {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return [];
    }
    return Array.isArray(value)
        ? value
        : [value];
}

function injuryRecord(
    source,
    clock,
) {
    const text =
        conditionText(source);
    if (!text) return null;
    const statusText =
        compactText(
            source?.status,
            40,
        ).toLocaleLowerCase();
    const status = [
        'active',
        'resolved',
        'chronic',
    ].includes(statusText)
        ? statusText
        : 'active';
    return {
        type:
            conditionKind(source) ||
            'unknown',
        description: text,
        status,
        startedClock:
            compactText(
                source
                    ?.startedClock ??
                source
                    ?.committedClock ??
                clock,
                80,
            ),
        resolvedClock:
            status === 'resolved'
                ? compactText(
                    source
                        ?.resolvedClock,
                    80,
                )
                : '',
    };
}

function featureRecord(
    source,
    type,
    clock,
) {
    const text =
        conditionText(source);
    if (!text) return null;
    return {
        type,
        description: text,
        status:
            type === 'scar'
                ? 'permanent'
                : 'active',
        asOfClock:
            compactText(
                source
                    ?.asOfClock ??
                source
                    ?.committedClock ??
                clock,
                80,
            ),
    };
}

function migratePresentation(
    identity,
    source,
    fallbackClock,
) {
    if (
        !source ||
        typeof source !== 'object' ||
        Array.isArray(source)
    ) {
        return {
            identity,
            presentation: source,
            changed: false,
        };
    }
    const presentation =
        structuredClone(source);
    const body =
        structuredClone(
            identity.body,
        );
    const clock =
        compactText(
            presentation
                .updatedClock ??
            fallbackClock,
            80,
        );
    let changed = false;
    const hairStyle =
        compactText(
            presentation
                .hairStyle ??
            presentation
                .hairstyle ??
            presentation.hair,
            240,
        );
    if (hairStyle) {
        body.hairStyle =
            hairStyle;
        changed = true;
    }
    const hairColor =
        compactText(
            presentation
                .hairColor ??
            presentation
                .dyedHairColor,
            120,
        );
    if (hairColor) {
        body.hairColor =
            hairColor;
        changed = true;
    }
    const naturalHairColor =
        compactText(
            presentation
                .naturalHairColor,
            120,
        );
    if (naturalHairColor) {
        body.naturalHairColor =
            naturalHairColor;
        changed = true;
    }
    const featureSources = [
        ...asArray(
            presentation.scar,
        ),
        ...asArray(
            presentation.scars,
        ),
        ...asArray(
            presentation
                .bodyCondition,
        ),
        ...asArray(
            presentation
                .bodyConditions,
        ),
    ];
    const injurySources = [
        ...asArray(
            presentation.injury,
        ),
        ...asArray(
            presentation.injuries,
        ),
        ...asArray(
            presentation
                .visibleInjury,
        ),
        ...asArray(
            presentation
                .visibleInjuries,
        ),
    ];
    const retainedConditions = [];
    for (
        const condition
        of asArray(
            presentation
                .visibleConditions,
        )
    ) {
        if (
            isScarCondition(
                condition,
            )
        ) {
            featureSources.push(
                condition,
            );
            changed = true;
        } else if (
            isInjuryCondition(
                condition,
            )
        ) {
            injurySources.push(
                condition,
            );
            changed = true;
        } else {
            retainedConditions
                .push(condition);
        }
    }
    if (
        Array.isArray(
            presentation
                .visibleConditions,
        ) &&
        retainedConditions.length !==
            presentation
                .visibleConditions
                .length
    ) {
        presentation
            .visibleConditions =
            retainedConditions;
    }
    const features = [
        ...(body.features || []),
        ...featureSources
            .map(sourceItem =>
                featureRecord(
                    sourceItem,
                    isScarCondition(
                        sourceItem,
                    )
                        ? 'scar'
                        : 'body_condition',
                    clock,
                ))
            .filter(Boolean),
    ];
    const injuries = [
        ...(body.injuries || []),
        ...injurySources
            .map(sourceItem =>
                injuryRecord(
                    sourceItem,
                    clock,
                ))
            .filter(Boolean),
    ];
    if (
        featureSources.length ||
        injurySources.length
    ) {
        body.features = features;
        body.injuries = injuries;
        changed = true;
    }
    const formValue =
        presentation
            .currentForm ??
        presentation.bodyForm ??
        presentation.form;
    if (formValue) {
        body.form =
            typeof formValue ===
                'object'
                ? {
                    ...formValue,
                    asOfClock:
                        formValue
                            .asOfClock ||
                        clock,
                }
                : {
                    code:
                        compactText(
                            formValue,
                            80,
                        ),
                    label:
                        compactText(
                            formValue,
                            120,
                        ),
                    asOfClock:
                        clock,
                };
        changed = true;
    }
    if (changed) {
        body.asOfClock =
            clock ||
            body.asOfClock;
    }
    for (
        const key
        of LEGACY_PRESENTATION_BODY_KEYS
    ) {
        if (
            Object.hasOwn(
                presentation,
                key,
            )
        ) {
            delete presentation[key];
            changed = true;
        }
    }
    if (!changed) {
        return {
            identity,
            presentation:
                source,
            changed: false,
        };
    }
    const migrated =
        normalizeNpcIdentity({
            ...identity,
            body,
            provenance: {
                ...identity
                    .provenance,
                generatedBy:
                    identity
                        .provenance
                        .generatedBy ===
                        'unknown'
                        ? 'npc_identity_v1_migration'
                        : identity
                            .provenance
                            .generatedBy,
                records: [
                    ...(
                        identity
                            .provenance
                            .records ||
                        []
                    ),
                    {
                        fieldPath:
                            'body',
                        sourceTier:
                            'legacy_migration',
                        sourceRef:
                            'legacy-current-presentation',
                        effectiveFrom:
                            clock,
                        effectiveTo:
                            '',
                    },
                ],
            },
        });
    return {
        identity: migrated,
        presentation,
        changed: true,
    };
}

function hasLegacyPresentationBody(
    source,
) {
    if (
        !source ||
        typeof source !== 'object'
    ) {
        return false;
    }
    if (
        LEGACY_PRESENTATION_BODY_KEYS
            .some(key =>
                Object.hasOwn(
                    source,
                    key,
                ))
    ) {
        return true;
    }
    return asArray(
        source.visibleConditions,
    ).some(condition =>
        isScarCondition(
            condition,
        ) ||
        isInjuryCondition(
            condition,
        ));
}

function needsMigration(
    worldState,
) {
    if (
        Number(
            worldState
                .npcIdentityVersion ||
            0,
        ) <
        NPC_IDENTITY_MIGRATION_VERSION
    ) {
        return true;
    }
    const actors = [
        ...(worldState
            .actorLibrary || []),
        ...(worldState.actors || []),
    ];
    if (
        actors.some(actor =>
            actor.identity?.version !==
                NPC_IDENTITY_VERSION ||
            JSON.stringify(
                normalizeNpcIdentity(
                    actor.identity,
                ),
            ) !==
                JSON.stringify(
                    actor.identity,
                ) ||
            hasLegacyPresentationBody(
                actor
                    .currentPresentation,
            ) ||
            hasLegacyPresentationBody(
                actor.presentation,
            ))
    ) {
        return true;
    }
    return Object.values(
        worldState
            .actorPresentations ||
        {},
    ).some(
        hasLegacyPresentationBody,
    );
}

function migrateEmbeddedPresentations(
    actor,
    identity,
    clock,
) {
    let nextActor =
        actor;
    let nextIdentity =
        identity;
    let changed = false;
    for (const key of [
        'presentation',
        'currentPresentation',
    ]) {
        const result =
            migratePresentation(
                nextIdentity,
                nextActor[key],
                clock,
            );
        nextIdentity =
            result.identity;
        if (result.changed) {
            if (nextActor === actor) {
                nextActor = {
                    ...actor,
                };
            }
            nextActor[key] =
                result.presentation;
            changed = true;
        }
    }
    return {
        actor: nextActor,
        identity: nextIdentity,
        changed,
    };
}

export function migrateNpcIdentityState(
    worldState,
) {
    if (
        !worldState ||
        worldState
            .actorContextVersion ===
            1 ||
        !needsMigration(
            worldState,
        )
    ) {
        return {
            state: worldState,
            changed: false,
            diagnostics: {
                actorLibraryMigrated: 0,
                runtimeActorsMigrated: 0,
                presentationsMigrated: 0,
            },
        };
    }
    const next =
        structuredClone(
            worldState,
        );
    const clock =
        compactText(
            next.clock,
            80,
        );
    const runtimeById =
        new Map(
            (next.actors || [])
                .map(actor => [
                    actor.id,
                    actor,
                ]),
        );
    const authorityById =
        new Map();
    let actorLibraryMigrated = 0;
    let runtimeActorsMigrated = 0;
    let presentationsMigrated = 0;
    next.actorPresentations ??= {};
    next.actorLibrary = (
        next.actorLibrary || []
    ).map(profile => {
        let identity =
            identityForActor(
                profile,
                clock,
            );
        let migrated =
            migrateEmbeddedPresentations(
                profile,
                identity,
                clock,
            );
        let migratedProfile =
            migrated.actor;
        identity =
            migrated.identity;
        if (migrated.changed) {
            presentationsMigrated += 1;
        }
        const runtimeActor =
            runtimeById.get(
                profile.id,
            );
        for (const presentation of [
            runtimeActor
                ?.presentation,
            runtimeActor
                ?.currentPresentation,
            next.actorPresentations[
                profile.id
            ],
        ]) {
            const result =
                migratePresentation(
                    identity,
                    presentation,
                    clock,
                );
            identity =
                result.identity;
        }
        if (
            JSON.stringify(
                profile.identity,
            ) !==
            JSON.stringify(identity)
        ) {
            actorLibraryMigrated += 1;
        }
        migratedProfile = {
            ...migratedProfile,
            identity,
        };
        authorityById.set(
            profile.id,
            identity,
        );
        return migratedProfile;
    });
    next.actors = (
        next.actors || []
    ).map(actor => {
        let identity =
            authorityById.get(
                actor.id,
            ) ||
            identityForActor(
                actor,
                clock,
            );
        const migrated =
            migrateEmbeddedPresentations(
                actor,
                identity,
                clock,
            );
        identity =
            migrated.identity;
        if (migrated.changed) {
            presentationsMigrated += 1;
        }
        const globalResult =
            migratePresentation(
                identity,
                next.actorPresentations[
                    actor.id
                ],
                clock,
            );
        identity =
            globalResult.identity;
        if (
            JSON.stringify(
                actor.identity,
            ) !==
            JSON.stringify(identity)
        ) {
            runtimeActorsMigrated += 1;
        }
        return {
            ...migrated.actor,
            identity:
                structuredClone(
                    identity,
                ),
        };
    });
    for (const [
        actorId,
        presentation,
    ] of Object.entries(
            next.actorPresentations,
        )) {
        const identity =
            authorityById.get(
                actorId,
            ) ||
            next.actors.find(
                actor =>
                    actor.id ===
                    actorId,
            )?.identity ||
            normalizeNpcIdentity();
        const result =
            migratePresentation(
                identity,
                presentation,
                clock,
            );
        if (result.changed) {
            next.actorPresentations[
                actorId
            ] = result.presentation;
            presentationsMigrated += 1;
        }
    }
    next.npcIdentityVersion =
        NPC_IDENTITY_MIGRATION_VERSION;
    return {
        state: next,
        changed: true,
        diagnostics: {
            actorLibraryMigrated,
            runtimeActorsMigrated,
            presentationsMigrated,
        },
    };
}
