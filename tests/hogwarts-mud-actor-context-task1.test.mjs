/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    existsSync,
    readFileSync,
} from 'node:fs';
import test from 'node:test';

import {
    actorContextVersion,
    actorDossierProjectionVersion,
    memoryReferenceVersion,
    normalizeActorCore,
    normalizeActorMemoryIndex,
    normalizeActorRuntime,
    normalizeMemoryRef,
    projectActorCore,
    projectActorMemoryIndex,
    projectActorRuntime,
    projectMemoryRef,
    validateActorCore,
    validateActorMemoryIndex,
    validateActorRuntime,
    validateMemoryRef,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-schema.js';
import {
    createInitialWorldState,
} from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import {
    normalizeNpcIdentity,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js';
import * as helpers from '../public/scripts/extensions/hogwarts-mud/helpers.js';

const TINA_CHAT_URL =
    new URL(
        '../data/default-user/backups/chat_hogwarts_world_director_20260812-183453.jsonl',
        import.meta.url,
    );

function actorCoreFixture(
    overrides = {},
) {
    return {
        id:
            'canon_harry_james_potter',
        canonCatalogId:
            'canon_harry_james_potter',
        nameEn:
            'Harry Potter',
        aliases: [
            'Harry',
        ],
        roleEn:
            'Student',
        cast: {
            origin:
                'canon_catalog',
            introducedClock:
                '1991-09-01 · 19:00',
            introducedTurn: 12,
        },
        publicProfile: {
            descriptionEn:
                'A slight boy with untidy black hair and round glasses.',
            backgroundEn:
                'A first-year Gryffindor student.',
        },
        performanceCore: {
            temperamentEn:
                'Guarded, brave, and quick to defend other people.',
            speechStyleEn:
                'Direct, understated, and dryly funny.',
            motivesEn: [
                'Protect friends from danger.',
            ],
            socialStrategiesEn: [
                'Deflect attention with understatement.',
            ],
            boundariesEn: [
                'Will not tolerate deliberate cruelty.',
            ],
            vulnerabilitiesEn: [
                'Fears losing newly found friends.',
            ],
        },
        identity:
            normalizeNpcIdentity({}),
        privateFacts: {
            secretEn: '',
            knowledgeEn: [],
        },
        ...overrides,
    };
}

function actorRuntimeFixture(
    overrides = {},
) {
    return {
        id:
            'canon_harry_james_potter',
        mapId:
            'hogwarts',
        roomId:
            'gryffindor_common_room',
        present: true,
        lifeStatus:
            'alive',
        lifeStatusPermanent:
            false,
        lifeStatusDetailEn:
            'Alive.',
        lifeStatusSinceClock:
            '',
        currentActivityEn:
            'Finishing homework.',
        currentIntentEn:
            'Ask Tina about the lesson.',
        currentGoalEn:
            'Understand what went wrong.',
        temporary: false,
        ...overrides,
    };
}

function memoryRefFixture(
    overrides = {},
) {
    return {
        recordType: 'event',
        recordId:
            'event_quill_backfire',
        addedClock:
            '1991-09-02 · 16:20',
        ...overrides,
    };
}

function sharedMemoryEntries(
    actorLibrary,
) {
    return actorLibrary.flatMap(actor =>
        Object.values(
            actor?.sharedMemories ||
            {},
        ).flatMap(entries =>
            Array.isArray(entries)
                ? entries
                : []));
}

function eventRecords(
    eventKnowledge,
) {
    if (Array.isArray(eventKnowledge)) {
        return eventKnowledge;
    }
    return Object.values(
        eventKnowledge || {},
    ).flatMap(entries =>
        Array.isArray(entries)
            ? entries
            : []);
}

function actorFieldCount(
    actors,
) {
    return new Set(
        actors.flatMap(actor =>
            Object.keys(actor || {})),
    ).size;
}

function sameTopLevelFieldCounts(
    actorLibrary,
    actors,
) {
    const runtimeById =
        new Map(
            actors.map(actor => [
                actor.id,
                actor,
            ]),
        );
    return Object.fromEntries(
        actorLibrary
            .map(profile => {
                const runtime =
                    runtimeById.get(
                        profile.id,
                    );
                if (!runtime) {
                    return null;
                }
                return [
                    profile.id,
                    Object.keys(profile)
                        .filter(key =>
                            Object.hasOwn(
                                runtime,
                                key,
                            ) &&
                            JSON.stringify(
                                profile[key],
                            ) ===
                            JSON.stringify(
                                runtime[key],
                            ))
                        .length,
                ];
            })
            .filter(Boolean),
    );
}

function measureActorContextBaseline(
    state,
) {
    const actorLibrary =
        Array.isArray(state.actorLibrary)
            ? state.actorLibrary
            : [];
    const actors =
        Array.isArray(state.actors)
            ? state.actors
            : [];
    const actorLibraryJson =
        JSON.stringify(actorLibrary);
    const actorsJson =
        JSON.stringify(actors);
    const events =
        new Map(
            eventRecords(
                state.eventKnowledge,
            )
                .filter(event =>
                    event?.eventId)
                .map(event => [
                    event.eventId,
                    event,
                ]),
        );
    const sharedEventCopies =
        sharedMemoryEntries(
            actorLibrary,
        ).filter(memory => {
            const event =
                events.get(
                    memory?.eventId,
                );
            if (!event) {
                return false;
            }
            return (
                memory.summaryEn ||
                memory.summary ||
                ''
            ) === (
                event.summaryEn ||
                event.summary ||
                ''
            );
        });
    const referencedEventIds =
        new Set(
            sharedEventCopies.map(memory =>
                memory.eventId),
        );
    return {
        actorLibraryCharacters:
            actorLibraryJson.length,
        actorLibraryBytes:
            Buffer.byteLength(
                actorLibraryJson,
                'utf8',
            ),
        actorRuntimeCharacters:
            actorsJson.length,
        actorRuntimeBytes:
            Buffer.byteLength(
                actorsJson,
                'utf8',
            ),
        actorLibraryCount:
            actorLibrary.length,
        actorRuntimeCount:
            actors.length,
        actorLibraryFieldCount:
            actorFieldCount(
                actorLibrary,
            ),
        actorRuntimeFieldCount:
            actorFieldCount(
                actors,
            ),
        actorLibraryFieldInstances:
            actorLibrary.reduce(
                (total, actor) =>
                    total +
                    Object.keys(
                        actor || {},
                    ).length,
                0,
            ),
        actorRuntimeFieldInstances:
            actors.reduce(
                (total, actor) =>
                    total +
                    Object.keys(
                        actor || {},
                    ).length,
                0,
            ),
        sharedEventFactCopies:
            sharedEventCopies.length,
        referencedCanonicalEventCount:
            referencedEventIds.size,
        extraSharedCopies:
            sharedEventCopies.length -
            referencedEventIds.size,
        sameTopLevelFieldCounts:
            sameTopLevelFieldCounts(
                actorLibrary,
                actors,
            ),
    };
}

function syntheticBaselineFixture() {
    const eventOne = {
        eventId: 'event_one',
        summaryEn:
            'Tina returned the borrowed quill.',
    };
    const eventTwo = {
        eventId: 'event_two',
        summaryEn:
            'Harry warned Tina about the stairs.',
    };
    return {
        actorLibrary: [{
            id: 'harry',
            nameEn: 'Harry Potter',
            roleEn: 'Student',
            sharedMemories: {
                core: [{
                    eventId:
                        eventOne.eventId,
                    summaryEn:
                        eventOne.summaryEn,
                }],
                recent: [{
                    eventId:
                        eventTwo.eventId,
                    summaryEn:
                        eventTwo.summaryEn,
                }],
            },
        }, {
            id: 'hermione',
            nameEn: 'Hermione Granger',
            roleEn: 'Student',
            sharedMemories: {
                recent: [{
                    eventId:
                        eventOne.eventId,
                    summaryEn:
                        eventOne.summaryEn,
                }],
            },
        }],
        actors: [{
            id: 'harry',
            nameEn: 'Harry Potter',
            roleEn: 'Student',
            present: true,
        }, {
            id: 'hermione',
            nameEn: 'Hermione Granger',
            roleEn: 'Student',
            present: true,
        }],
        eventKnowledge: [
            eventOne,
            eventTwo,
        ],
    };
}

test('Task 1 Actor Core and Runtime APIs enforce exact V1 projections', () => {
    const core =
        actorCoreFixture();
    const runtime =
        actorRuntimeFixture();

    assert.deepEqual(
        Object.keys(core),
        [
            'id',
            'canonCatalogId',
            'nameEn',
            'aliases',
            'roleEn',
            'cast',
            'publicProfile',
            'performanceCore',
            'identity',
            'privateFacts',
        ],
    );
    assert.equal(
        validateActorCore(core).valid,
        true,
    );
    assert.equal(
        validateActorRuntime(runtime)
            .valid,
        true,
    );
    assert.deepEqual(
        normalizeActorCore(core),
        core,
    );
    assert.deepEqual(
        normalizeActorRuntime(runtime),
        runtime,
    );
    assert.deepEqual(
        projectActorCore({
            ...core,
            sharedMemories: {
                core: ['forbidden'],
            },
            socialRelationships: [],
        }),
        core,
    );
    assert.deepEqual(
        projectActorRuntime({
            ...runtime,
            identity: core.identity,
            impressionOfPlayerEn:
                'Legacy copy.',
        }),
        runtime,
    );
    assert.equal(
        validateActorCore({
            ...core,
            sharedMemories: {},
        }).valid,
        false,
    );
    assert.equal(
        validateActorRuntime({
            ...runtime,
            personalityEn:
                'Legacy copy.',
        }).valid,
        false,
    );
});

test('Task 1 Memory Ref and Actor Memory Index never project text copies', () => {
    const reference =
        memoryRefFixture();
    const index = {
        version:
            memoryReferenceVersion,
        byActorId: {
            canon_harry_james_potter: {
                firstImpressionRef:
                    'appraisal_first_harry',
                core: [
                    reference,
                ],
                recent: [
                    memoryRefFixture({
                        recordType:
                            'appraisal',
                        recordId:
                            'appraisal_quill_reaction',
                    }),
                ],
                everyday: [],
            },
        },
    };

    assert.deepEqual(
        normalizeMemoryRef({
            ...reference,
            summaryEn:
                'Must not survive.',
        }),
        reference,
    );
    assert.deepEqual(
        projectMemoryRef(reference),
        reference,
    );
    assert.equal(
        validateMemoryRef(reference)
            .valid,
        true,
    );
    assert.equal(
        validateMemoryRef({
            ...reference,
            summary:
                'Forbidden copy.',
        }).valid,
        false,
    );
    assert.equal(
        validateActorMemoryIndex(
            index,
        ).valid,
        true,
    );
    assert.deepEqual(
        normalizeActorMemoryIndex(
            index,
        ),
        index,
    );
    assert.deepEqual(
        projectActorMemoryIndex({
            ...index,
            legacyMemories: [],
        }),
        index,
    );
    assert.doesNotMatch(
        JSON.stringify(
            projectActorMemoryIndex(
                index,
            ),
        ),
        /summary(?:En)?/u,
    );
});

test('Task 1 versions initialize new worlds and are exported by the facade', () => {
    assert.equal(
        actorContextVersion,
        1,
    );
    assert.equal(
        memoryReferenceVersion,
        2,
    );
    assert.equal(
        actorDossierProjectionVersion,
        1,
    );
    for (
        const name of [
            'actorContextVersion',
            'memoryReferenceVersion',
            'actorDossierProjectionVersion',
            'normalizeActorCore',
            'validateActorCore',
            'projectActorCore',
            'normalizeActorRuntime',
            'validateActorRuntime',
            'projectActorRuntime',
            'normalizeMemoryRef',
            'validateMemoryRef',
            'projectMemoryRef',
            'normalizeActorMemoryIndex',
            'validateActorMemoryIndex',
            'projectActorMemoryIndex',
        ]
    ) {
        assert.notEqual(
            helpers[name],
            undefined,
            `${name} must be exported by helpers.js`,
        );
    }
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
    assert.deepEqual(
        {
            actorContextVersion:
                state.actorContextVersion,
            memoryReferenceVersion:
                state.memoryReferenceVersion,
            actorDossierProjectionVersion:
                state
                    .actorDossierProjectionVersion,
        },
        {
            actorContextVersion: 1,
            memoryReferenceVersion: 2,
            actorDossierProjectionVersion: 1,
        },
    );
});

test('Task 1 synthetic fixture locks field and duplicate-fact metrics', () => {
    const baseline =
        measureActorContextBaseline(
            syntheticBaselineFixture(),
        );

    assert.deepEqual(
        {
            actorLibraryCount:
                baseline.actorLibraryCount,
            actorRuntimeCount:
                baseline.actorRuntimeCount,
            actorLibraryFieldCount:
                baseline
                    .actorLibraryFieldCount,
            actorRuntimeFieldCount:
                baseline
                    .actorRuntimeFieldCount,
            sharedEventFactCopies:
                baseline
                    .sharedEventFactCopies,
            referencedCanonicalEventCount:
                baseline
                    .referencedCanonicalEventCount,
            extraSharedCopies:
                baseline.extraSharedCopies,
            sameTopLevelFieldCounts:
                baseline
                    .sameTopLevelFieldCounts,
        },
        {
            actorLibraryCount: 2,
            actorRuntimeCount: 2,
            actorLibraryFieldCount: 4,
            actorRuntimeFieldCount: 4,
            sharedEventFactCopies: 3,
            referencedCanonicalEventCount: 2,
            extraSharedCopies: 1,
            sameTopLevelFieldCounts: {
                harry: 3,
                hermione: 3,
            },
        },
    );
    assert.ok(
        baseline.actorLibraryCharacters >
            0,
    );
    assert.ok(
        baseline.actorRuntimeBytes >
            0,
    );
});

test(
    'Task 1 Tina fixture locks the current pre-unification baseline',
    {
        skip:
            !existsSync(TINA_CHAT_URL),
    },
    () => {
        const firstLine =
            readFileSync(
                TINA_CHAT_URL,
                'utf8',
            ).split('\n', 1)[0];
        const state =
            JSON.parse(firstLine)
                .chat_metadata
                .hogwartsMud;
        const baseline =
            measureActorContextBaseline(
                state,
            );

        assert.deepEqual(
            baseline,
            {
                actorLibraryCharacters:
                    218_243,
                actorLibraryBytes:
                    239_297,
                actorRuntimeCharacters:
                    75_863,
                actorRuntimeBytes:
                    79_844,
                actorLibraryCount: 21,
                actorRuntimeCount: 23,
                actorLibraryFieldCount: 58,
                actorRuntimeFieldCount: 52,
                actorLibraryFieldInstances:
                    994,
                actorRuntimeFieldInstances:
                    875,
                sharedEventFactCopies: 31,
                referencedCanonicalEventCount:
                    5,
                extraSharedCopies: 26,
                sameTopLevelFieldCounts: {
                    alex_zhang: 24,
                    minerva_mcgonagall: 24,
                    hogwarts_owl: 24,
                    mirena_vance: 26,
                    severus_snape: 26,
                    tom_leaky_bartender: 26,
                    eddie_cooper: 26,
                    diagon_passerby_doris: 26,
                    madam_malkin: 26,
                    eddie_grandmother_cooper:
                        26,
                    diagon_food_cart_vendor:
                        26,
                    malkins_next_customer: 26,
                    garrick_ollivander: 29,
                    canon_hermione_jean_granger:
                        35,
                    canon_ronald_bilius_weasley:
                        35,
                    canon_dean_thomas: 35,
                    canon_seamus_finnigan: 35,
                    canon_neville_longbottom:
                        35,
                    canon_lavender_brown: 35,
                    canon_harry_james_potter:
                        35,
                    canon_filius_flitwick: 30,
                },
            },
        );
    },
);
