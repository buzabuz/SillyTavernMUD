/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
    CANON_CHARACTER_CATALOG,
} from '../public/scripts/extensions/hogwarts-mud/canon-characters.js';
import {
    createInitialWorldState,
} from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import {
    CANON_IDENTITY_REGISTRY,
    CANON_IDENTITY_REGISTRY_VERSION,
    getCanonIdentity,
    hydrateCanonActorIdentity,
    mapCanonBirth,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-canon.js';
import {
    migrateNpcIdentityState,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-migration.js';
import {
    NPC_BIRTH_PRECISION_VALUES,
    deriveNpcAgeAtClock,
    deriveNpcAgeBand,
    deriveNpcEducationAtClock,
    deriveNpcRelativeAge,
    normalizeNpcBirth,
    normalizeNpcIdentity,
    projectNpcIdentity,
    validateNpcIdentity,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js';
import {
    createLifecycleRuntime,
} from '../public/scripts/extensions/hogwarts-mud/runtime/lifecycle.js';

const CANON_IDENTITY_URL =
    new URL(
        '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-canon.js',
        import.meta.url,
    );

test('Identity V1 normalization is complete, unknown-safe, valid and idempotent', () => {
    const identity =
        normalizeNpcIdentity({
            body: {
                height: {
                    centimeters:
                        171.26,
                },
            },
        });

    assert.equal(
        identity.version,
        1,
    );
    assert.deepEqual(
        identity.gender,
        {
            code: 'unknown',
            label: '',
        },
    );
    assert.deepEqual(
        identity.birth,
        {
            date: '',
            year: null,
            precision: 'unknown',
        },
    );
    assert.deepEqual(
        NPC_BIRTH_PRECISION_VALUES,
        [
            'exact',
            'year',
            'unknown',
        ],
    );
    assert.deepEqual(
        identity.education,
        [],
    );
    assert.equal(
        identity.lineage.status,
        'unknown',
    );
    assert.equal(
        identity.body
            .height.centimeters,
        171.3,
    );
    assert.equal(
        identity.body
            .height.precision,
        'approximate',
    );
    assert.equal(
        identity.body.hairStyle,
        'unknown',
    );
    assert.equal(
        identity.body.form.code,
        'unknown',
    );
    assert.deepEqual(
        validateNpcIdentity(
            identity,
        ),
        {
            valid: true,
            errors: [],
        },
    );
    assert.deepEqual(
        normalizeNpcIdentity(
            identity,
        ),
        identity,
    );
    assert.equal(
        validateNpcIdentity({
            version: 1,
        }).valid,
        false,
    );
});

test('new worlds start on the Identity V1 migration boundary', () => {
    const state =
        createInitialWorldState(
            {
                identity: {
                    age: 11,
                },
                background: {},
                storyPreferences: {},
            },
            {},
            {
                presetId:
                    'canon_1991',
                startYear: 1991,
                grade: 1,
                difficulty:
                    'standard',
            },
        );

    assert.equal(
        state.npcIdentityVersion,
        1,
    );
    assert.deepEqual(
        state.actorLibrary,
        [],
    );
});

test('age, age band and relative age derive from the world date without persistence', () => {
    const birth = {
        date: '1980-07-31',
        year: null,
        precision: 'exact',
    };
    const beforeBirthday =
        deriveNpcAgeAtClock(
            birth,
            '1991-07-30 · 12:00',
        );
    const onBirthday =
        deriveNpcAgeAtClock(
            birth,
            '1991-07-31 · 00:00',
        );

    assert.equal(
        beforeBirthday.years,
        10,
    );
    assert.equal(
        deriveNpcAgeBand(
            beforeBirthday,
        ),
        'child',
    );
    assert.equal(
        onBirthday.years,
        11,
    );
    assert.equal(
        deriveNpcAgeBand(
            onBirthday,
        ),
        'adolescent',
    );
    assert.deepEqual(
        deriveNpcRelativeAge(
            onBirthday,
            11,
        ),
        {
            band: 'same_age',
            years: 0,
        },
    );
    assert.equal(
        deriveNpcAgeAtClock(
            {
                date: '',
                year: 1980,
                precision: 'year',
            },
            '1991-09-01',
        ).years,
        null,
    );
    assert.deepEqual(
        deriveNpcAgeAtClock(
            {
                date: '',
                year: 1980,
                precision: 'year',
            },
            '1991-09-01',
        ),
        {
            years: null,
            minimumYears: null,
            maximumYears: null,
            precision: 'unknown',
        },
    );
});

test('[defect-probing] Birth normalization only emits exact date, exact year or unknown', () => {
    assert.deepEqual(
        normalizeNpcBirth({
            date: '1980-07-31',
            year: 1979,
            precision: 'exact',
            earliest: '1979-09-01',
            latest: '1980-08-31',
        }),
        {
            date: '1980-07-31',
            year: null,
            precision: 'exact',
        },
    );
    assert.deepEqual(
        normalizeNpcBirth({
            year: 1980,
            precision: 'year',
        }),
        {
            date: '',
            year: 1980,
            precision: 'year',
        },
    );
    assert.deepEqual(
        normalizeNpcBirth({
            precision: 'range',
            earliest: '1979-09-01',
            latest: '1980-08-31',
        }),
        {
            date: '',
            year: null,
            precision: 'unknown',
        },
    );

    const invalid =
        normalizeNpcIdentity();
    invalid.birth = {
        date: '',
        year: null,
        precision: 'unknown',
        earliest: '1979-09-01',
    };
    assert.equal(
        validateNpcIdentity(
            invalid,
        ).valid,
        false,
    );
});

test('Hogwarts year and enrollment status derive across academic-year boundaries', () => {
    const education = {
        schoolId: 'hogwarts',
        houseId: 'gryffindor',
        entryYear: 1991,
        exitYear: 1998,
        status: 'unknown',
        yearOverride: null,
    };

    assert.deepEqual(
        deriveNpcEducationAtClock(
            education,
            '1991-08-31 · 23:59',
        ),
        {
            status:
                'prospective',
            currentYear: null,
            isEnrolled: false,
            academicYear: 1990,
        },
    );
    assert.equal(
        deriveNpcEducationAtClock(
            education,
            '1991-09-01 · 09:00',
        ).currentYear,
        1,
    );
    assert.equal(
        deriveNpcEducationAtClock(
            education,
            '1992-08-31 · 09:00',
        ).currentYear,
        1,
    );
    assert.equal(
        deriveNpcEducationAtClock(
            education,
            '1992-09-01 · 09:00',
        ).currentYear,
        2,
    );
    assert.deepEqual(
        deriveNpcEducationAtClock(
            education,
            '1998-09-01 · 09:00',
        ),
        {
            status:
                'graduated',
            currentYear: null,
            isEnrolled: false,
            academicYear: 1998,
        },
    );
    assert.equal(
        deriveNpcEducationAtClock(
            {
                ...education,
                yearOverride: 3,
            },
            '1991-09-01',
        ).currentYear,
        3,
    );
});

test('Identity projection includes temporal derivation but hides provenance by default', () => {
    const harry =
        getCanonIdentity(
            'canon_harry_james_potter',
        );
    const projection =
        projectNpcIdentity(
            harry,
            {
                clock:
                    '1991-09-02 · 11:00',
                referenceAge: 11,
            },
        );

    assert.equal(
        projection
            .derived.age.years,
        11,
    );
    assert.equal(
        projection
            .derived.relativeAge
            .band,
        'same_age',
    );
    assert.equal(
        projection.education[0]
            .current.currentYear,
        1,
    );
    assert.equal(
        projection.education[0]
            .current.isEnrolled,
        true,
    );
    assert.equal(
        Object.hasOwn(
            projection,
            'provenance',
        ),
        false,
    );
    assert.equal(
        projectNpcIdentity(
            harry,
            {
                clock:
                    '1991-09-02',
                includeProvenance:
                    true,
            },
        ).provenance
            .registryVersion,
        CANON_IDENTITY_REGISTRY_VERSION,
    );
});

test('[defect-probing] Canon birth mapping preserves exact facts and rejects academic-year ranges', () => {
    assert.deepEqual(
        mapCanonBirth(
            '31 July 1980',
        ),
        {
            date: '1980-07-31',
            year: null,
            precision: 'exact',
        },
    );
    assert.deepEqual(
        mapCanonBirth(
            '1 September1979-31 August1980',
        ),
        {
            date: '',
            year: null,
            precision: 'unknown',
        },
    );
    assert.deepEqual(
        mapCanonBirth(
            '1980',
        ),
        {
            date: '',
            year: 1980,
            precision: 'year',
        },
    );
    assert.deepEqual(
        mapCanonBirth(
            'April, 1998',
        ),
        {
            date: '',
            year: 1998,
            precision: 'year',
        },
    );
    assert.deepEqual(
        mapCanonBirth(
            '4 October',
        ),
        {
            date: '',
            year: null,
            precision: 'unknown',
        },
    );
});

test('offline Canon Registry covers every catalog actor with a valid complete schema', () => {
    const catalogIds =
        new Set(
            CANON_CHARACTER_CATALOG
                .map(character =>
                    character.id),
        );
    assert.equal(
        Object.keys(
            CANON_IDENTITY_REGISTRY,
        ).length,
        catalogIds.size,
    );
    for (
        const actorId
        of catalogIds
    ) {
        const identity =
            CANON_IDENTITY_REGISTRY[
                actorId
            ];
        assert.ok(
            identity,
            actorId,
        );
        assert.equal(
            validateNpcIdentity(
                identity,
            ).valid,
            true,
            actorId,
        );
        assert.deepEqual(
            Object.keys(
                identity.birth,
            ).sort(),
            [
                'date',
                'precision',
                'year',
            ],
            actorId,
        );
        assert.doesNotMatch(
            JSON.stringify(
                identity.birth,
            ),
            /range|earliest|latest/u,
            actorId,
        );
    }

    const unknown =
        getCanonIdentity(
            'canon_abernathy',
        );
    assert.equal(
        unknown.gender.code,
        'unknown',
    );
    assert.equal(
        unknown.birth.precision,
        'unknown',
    );
    assert.equal(
        unknown.body.eyeColor,
        'unknown',
    );
    assert.deepEqual(
        unknown.education,
        [],
    );
});

test('core Canon hydration uses book baselines and performs no model work', async () => {
    const harry =
        getCanonIdentity(
            'Harry James Potter',
        );
    assert.equal(
        harry.gender.code,
        'male',
    );
    assert.equal(
        harry.birth.date,
        '1980-07-31',
    );
    assert.equal(
        harry.lineage.status,
        'half_blood',
    );
    assert.equal(
        harry.body
            .naturalHairColor,
        'black',
    );
    assert.equal(
        harry.body.hairStyle,
        'untidy',
    );
    assert.equal(
        harry.body.eyeColor,
        'green',
    );
    assert.equal(
        harry.body.features[0]
            .type,
        'scar',
    );
    assert.equal(
        harry.provenance.records
            .some(record =>
                record.sourceTier ===
                    'canon_book'),
        true,
    );
    const source =
        await readFile(
            CANON_IDENTITY_URL,
            'utf8',
        );
    assert.doesNotMatch(
        source,
        /\b(?:Daniel Radcliffe|Emma Watson|Rupert Grint)\b/iu,
    );
    assert.doesNotMatch(
        source,
        /\b(?:fetch|ollama|generateText|modelCall)\s*\(/iu,
    );

    const actor = {
        id: 'legacy_harry',
        nameEn:
            'Harry James Potter',
        memory: {
            recent: ['unchanged'],
        },
    };
    const hydrated =
        hydrateCanonActorIdentity(
            actor,
        );
    assert.equal(
        hydrated.hydrated,
        true,
    );
    assert.equal(
        hydrated.actor
            .canonCatalogId,
        'canon_harry_james_potter',
    );
    assert.deepEqual(
        hydrated.actor.memory,
        actor.memory,
    );
    assert.equal(
        actor.identity,
        undefined,
        'hydration must not mutate its input',
    );
});

function createMigrationFixture() {
    return {
        clock:
            '1991-09-02 · 11:30',
        actorLibrary: [
            {
                id:
                    'canon_harry_james_potter',
                nameEn:
                    'Harry James Potter',
                roleEn: 'Student',
                sharedMemories: {
                    core: [{
                        id: 'memory_harry',
                    }],
                },
                relationshipTags: [
                    'classmate',
                ],
            },
            {
                id: 'original_ivy',
                nameEn: 'Ivy Green',
                gender: 'Female',
                birthDate:
                    '1980-10-01',
                roleEn: 'Student',
                house: 'Hufflepuff',
                ancestry:
                    'Muggle-born',
                currentPresentation: {
                    hairstyle:
                        'single braid',
                    visibleInjury: {
                        type: 'bruise',
                        description:
                            'Bruised left arm.',
                        status: 'active',
                        startedClock:
                            '1991-09-02 · 10:00',
                    },
                    currentForm:
                        'human',
                    outfit:
                        'Hufflepuff robes',
                    heldItemIds: [
                        'ivy_book',
                    ],
                },
                knowledgeEn: [
                    'Keep this.',
                ],
            },
        ],
        actors: [
            {
                id:
                    'canon_harry_james_potter',
                nameEn:
                    'Harry James Potter',
                present: true,
                mapId:
                    'hogwarts_castle',
                roomId:
                    'charms_classroom',
            },
            {
                id: 'original_ivy',
                nameEn: 'Ivy Green',
                present: true,
                mapId:
                    'hogwarts_castle',
                roomId:
                    'charms_classroom',
            },
        ],
        actorPresentations: {
            canon_harry_james_potter: {
                outfit:
                    'Hogwarts robes',
                accessories: {
                    hat:
                        'pointed black hat',
                },
                wornItemIds: [
                    'round_spectacles',
                ],
                heldItemIds: [
                    'holly_wand',
                ],
                hair:
                    'slicked flat',
                hairColor: 'green',
                visibleConditions: [
                    {
                        type: 'scar',
                        description:
                            'Lightning-shaped forehead scar.',
                    },
                    {
                        type: 'injury',
                        description:
                            'Cut on right palm.',
                        committedClock:
                            '1991-09-02 · 11:00',
                    },
                    'ink-stained sleeve',
                ],
                updatedClock:
                    '1991-09-02 · 11:30',
            },
        },
        socialGraph: {
            relationships: [{
                id: 'relationship_1',
            }],
        },
        items: [{
            id: 'holly_wand',
            holderId:
                'canon_harry_james_potter',
        }],
    };
}

test('migration preserves state while moving body facts out of current presentation', () => {
    const fixture =
        createMigrationFixture();
    const preserved = {
        socialGraph:
            structuredClone(
                fixture.socialGraph,
            ),
        items:
            structuredClone(
                fixture.items,
            ),
        harryMemory:
            structuredClone(
                fixture
                    .actorLibrary[0]
                    .sharedMemories,
            ),
        ivyKnowledge:
            structuredClone(
                fixture
                    .actorLibrary[1]
                    .knowledgeEn,
            ),
    };
    const migration =
        migrateNpcIdentityState(
            fixture,
        );
    const state =
        migration.state;
    const harry =
        state.actorLibrary[0];
    const ivy =
        state.actorLibrary[1];
    const harryPresentation =
        state.actorPresentations[
            harry.id
        ];

    assert.equal(
        migration.changed,
        true,
    );
    assert.equal(
        state.npcIdentityVersion,
        1,
    );
    assert.equal(
        harry.identity
            .body.naturalHairColor,
        'black',
        'Canon baseline must survive a dye or presentation change',
    );
    assert.equal(
        harry.identity
            .body.hairColor,
        'green',
    );
    assert.equal(
        harry.identity
            .body.hairStyle,
        'slicked flat',
    );
    assert.equal(
        harry.identity
            .body.injuries
            .some(injury =>
                injury.description ===
                    'Cut on right palm.'),
        true,
    );
    assert.equal(
        harry.identity
            .body.features
            .some(feature =>
                feature.type ===
                    'scar'),
        true,
    );
    assert.equal(
        Object.hasOwn(
            harryPresentation,
            'hair',
        ),
        false,
    );
    assert.equal(
        Object.hasOwn(
            harryPresentation,
            'hairColor',
        ),
        false,
    );
    assert.deepEqual(
        harryPresentation
            .visibleConditions,
        [
            'ink-stained sleeve',
        ],
    );
    assert.equal(
        harryPresentation.outfit,
        'Hogwarts robes',
    );
    assert.deepEqual(
        harryPresentation
            .accessories,
        {
            hat:
                'pointed black hat',
        },
    );
    assert.deepEqual(
        harryPresentation
            .wornItemIds,
        [
            'round_spectacles',
        ],
    );
    assert.deepEqual(
        harryPresentation
            .heldItemIds,
        [
            'holly_wand',
        ],
    );

    assert.equal(
        ivy.identity.gender.code,
        'female',
    );
    assert.equal(
        ivy.identity
            .birth.date,
        '1980-10-01',
    );
    assert.equal(
        ivy.identity
            .education[0]
            .entryYear,
        1992,
    );
    assert.equal(
        ivy.identity
            .lineage.status,
        'muggle_born',
    );
    assert.equal(
        ivy.identity
            .body.hairStyle,
        'single braid',
    );
    assert.equal(
        ivy.identity
            .body.injuries[0]
            .description,
        'Bruised left arm.',
    );
    assert.equal(
        ivy.identity
            .body.form.code,
        'human',
    );
    assert.equal(
        Object.hasOwn(
            ivy.currentPresentation,
            'hairstyle',
        ),
        false,
    );
    assert.equal(
        ivy.currentPresentation
            .outfit,
        'Hufflepuff robes',
    );
    assert.deepEqual(
        ivy.currentPresentation
            .heldItemIds,
        ['ivy_book'],
    );
    assert.deepEqual(
        state.actors.find(
            actor =>
                actor.id ===
                harry.id,
        ).identity,
        harry.identity,
    );
    assert.deepEqual(
        state.socialGraph,
        preserved.socialGraph,
    );
    assert.deepEqual(
        state.items,
        preserved.items,
    );
    assert.deepEqual(
        harry.sharedMemories,
        preserved.harryMemory,
    );
    assert.deepEqual(
        ivy.knowledgeEn,
        preserved.ivyKnowledge,
    );
});

test('migration leaves original unknowns unknown and is byte-stable on replay', () => {
    const fixture = {
        clock:
            '1991-09-02 · 11:30',
        actorLibrary: [{
            id: 'original_unknown',
            nameEn:
                'Unknown Student',
            roleEn: 'Student',
            settingTags: [
                'mysterious',
            ],
            memory: {
                exact: 'preserve',
            },
        }],
        actors: [{
            id: 'original_unknown',
            nameEn:
                'Unknown Student',
            present: true,
        }],
        actorPresentations: {},
    };
    const first =
        migrateNpcIdentityState(
            fixture,
        );
    const identity =
        first.state
            .actorLibrary[0]
            .identity;

    assert.equal(
        identity.gender.code,
        'unknown',
    );
    assert.equal(
        identity.birth.precision,
        'unknown',
    );
    assert.deepEqual(
        identity.education,
        [],
        'role and personality tags alone must not invent school facts',
    );
    assert.equal(
        identity.lineage.status,
        'unknown',
    );
    assert.equal(
        identity.body.eyeColor,
        'unknown',
    );
    assert.deepEqual(
        first.state
            .actorLibrary[0]
            .memory,
        {
            exact: 'preserve',
        },
    );

    const serialized =
        JSON.stringify(
            first.state,
        );
    const second =
        migrateNpcIdentityState(
            first.state,
        );
    assert.equal(
        second.changed,
        false,
    );
    assert.equal(
        second.state,
        first.state,
    );
    assert.equal(
        JSON.stringify(
            second.state,
        ),
        serialized,
    );
});

test('[defect-probing] migration writes no Birth ranges and cleans already-migrated V1 identities', () => {
    const legacy =
        migrateNpcIdentityState({
            clock:
                '1991-09-02 · 11:30',
            actorLibrary: [{
                id: 'legacy_year',
                birthYear: 1980,
            }, {
                id:
                    'legacy_academic_range',
                fixedBirthText:
                    '1 September 1979-31 August 1980',
            }],
            actors: [],
            actorPresentations: {},
        }).state;
    assert.deepEqual(
        legacy.actorLibrary[0]
            .identity.birth,
        {
            date: '',
            year: 1980,
            precision: 'year',
        },
    );
    assert.deepEqual(
        legacy.actorLibrary[1]
            .identity.birth,
        {
            date: '',
            year: null,
            precision: 'unknown',
        },
    );

    const oldIdentity =
        normalizeNpcIdentity();
    oldIdentity.birth = {
        date: '',
        precision: 'range',
        earliest: '1979-09-01',
        latest: '1980-08-31',
    };
    const oldState = {
        npcIdentityVersion: 1,
        clock:
            '1991-09-02 · 11:30',
        actorLibrary: [{
            id: 'old_v1_range',
            identity: oldIdentity,
        }],
        actors: [],
        actorPresentations: {},
    };
    const cleaned =
        migrateNpcIdentityState(
            oldState,
        );
    assert.equal(
        cleaned.changed,
        true,
    );
    assert.deepEqual(
        cleaned.state
            .actorLibrary[0]
            .identity.birth,
        {
            date: '',
            year: null,
            precision: 'unknown',
        },
    );
    assert.doesNotMatch(
        JSON.stringify(
            cleaned.state
                .actorLibrary.map(
                    actor =>
                        actor.identity.birth,
                ),
        ),
        /range|earliest|latest/u,
    );
    assert.equal(
        migrateNpcIdentityState(
            cleaned.state,
        ).changed,
        false,
    );
});

test('lifecycle applies Identity migration before a loaded world resumes', () => {
    const state =
        createMigrationFixture();
    state.modelSlots = {};
    state.sceneArchive = [];
    state.checks = [];
    state.sceneTransition = {
        status: 'idle',
    };
    state.pacingDirector = {
        status: 'idle',
        reassessAfterTurns: 6,
    };
    state.memoryDirector = {
        status: 'idle',
        reviewAfterTurns: 10,
    };
    state.causalCollapse = {};
    const context = {
        chat: [],
        chatMetadata: {
            hogwartsMud: state,
        },
    };
    const unchanged =
        value => ({
            state: value,
            changed: false,
        });
    let saveRequests = 0;
    const lifecycle =
        createLifecycleRuntime({
            createFallbackNextSceneIntent:
                () => null,
            getContext: () =>
                context,
            getMudState: () =>
                context
                    .chatMetadata
                    .hogwartsMud,
            getRoomName: () => '',
            jobRegistry: {},
            migrateActorKnowledgeBoundaries:
                unchanged,
            migrateActorMovementHistory:
                unchanged,
            migrateActorPresentationState:
                unchanged,
            migrateItemSystemState:
                unchanged,
            migrateLoadedSocialGraph:
                value => ({
                    graph: value,
                    changed: false,
                }),
            migrateNpcIdentityState,
            migrateObservedInventoryState:
                unchanged,
            migrateRelationshipMemoryState:
                unchanged,
            migrateSpellbookState:
                unchanged,
            migrateTimelineAppraisalState:
                unchanged,
            normalizeCausalCollapseState:
                value => value,
            normalizeModelSlots:
                value => value,
            projectActorSocialRelationships:
                value => value,
            reconcileCanonActorDisplayNames:
                unchanged,
            reconcileTemporaryActorDisplayNames:
                unchanged,
            saveMetadataDebounced:
                () => {
                    saveRequests += 1;
                },
            validateNextSceneIntent:
                () => ({
                    valid: true,
                }),
        });

    const changed =
        lifecycle
            .ensureSceneLifecycleState(
                state,
            );

    assert.equal(changed, true);
    assert.equal(
        state.npcIdentityVersion,
        1,
    );
    assert.equal(
        state.actorLibrary
            .every(actor =>
                actor.identity
                    ?.version === 1),
        true,
    );
    assert.equal(
        state.actors.every(actor =>
            actor.identity
                ?.version === 1),
        true,
    );
    assert.equal(
        saveRequests > 0,
        true,
    );
});
