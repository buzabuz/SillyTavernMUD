/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    projectPeoplePanel,
} from '../public/scripts/extensions/hogwarts-mud/people-projection.js';
import {
    normalizeActorCore,
    normalizeActorRuntime,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-schema.js';
import {
    createDefaultMemorySynapse,
} from '../public/scripts/extensions/hogwarts-mud/domain/memory-synapse-schema.js';
import {
    normalizeNpcIdentity,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js';

const actors = [
    {
        id: 'ron',
        present: true,
        mapId: 'hogwarts_castle',
        roomId: 'charms_classroom',
    },
    {
        id: 'hermione',
        present: false,
        mapId: 'hogwarts_castle',
        roomId: 'charms_classroom',
        introducedClock:
            '1991 · 09:00',
    },
    {
        id: 'secret_student',
        present: false,
        mapId: 'hogwarts_castle',
        roomId: 'charms_classroom',
    },
    {
        id: 'dean',
        present: false,
        mapId: 'hogwarts_castle',
        roomId: 'great_hall',
        introducedClock: '1991 · 08:00',
    },
];

function createState(overrides = {}) {
    return {
        actors:
            actors.map(actor =>
                normalizeActorRuntime({
                    ...actor,
                    lifeStatus: 'alive',
                    lifeStatusPermanent:
                        false,
                    lifeStatusDetailEn:
                        'Alive.',
                    lifeStatusSinceClock:
                        '',
                    currentActivityEn:
                        '',
                    currentIntentEn:
                        '',
                    currentGoalEn:
                        '',
                    temporary: false,
                })),
        actorLibrary:
            actors.map(actor =>
                normalizeActorCore({
                    id: actor.id,
                    canonCatalogId: '',
                    nameEn: actor.id,
                    aliases: [],
                    roleEn: 'Student',
                    cast: {
                        origin:
                            'foundation',
                        introducedClock:
                            actor
                                .introducedClock ||
                            '',
                        introducedTurn:
                            actor
                                .introducedClock
                                ? 1
                                : null,
                    },
                    publicProfile: {
                        descriptionEn:
                            '',
                        backgroundEn:
                            '',
                    },
                    performanceCore: {
                        temperamentEn:
                            '',
                        speechStyleEn:
                            '',
                        motivesEn: [],
                        socialStrategiesEn:
                            [],
                        boundariesEn: [],
                        vulnerabilitiesEn:
                            [],
                    },
                    identity:
                        normalizeNpcIdentity(
                            {},
                        ),
                    privateFacts: {
                        secretEn: '',
                        knowledgeEn: [],
                    },
                })),
        actorMemoryIndex: {
            version: 1,
            byActorId:
                Object.fromEntries(
                    actors.map(actor => [
                        actor.id,
                        {
                            firstImpressionRef:
                                '',
                            core: [],
                            recent: [],
                            everyday: [],
                        },
                    ]),
                ),
        },
        memorySynapse:
            createDefaultMemorySynapse(),
        socialGraph: {
            relationships: [],
        },
        map: {
            activeMapId: 'hogwarts_castle',
            currentLocalNodeId:
                'charms_classroom',
        },
        activeInteractionActorIds: [
            'ron',
        ],
        localPresence: {
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
            occupantActorIds: [
                'ron',
                'hermione',
                'secret_student',
                'dean',
            ],
            cohortIds: [
                'gryffindor_charms',
            ],
        },
        cohorts: [{
            id: 'gryffindor_charms',
            labelEn:
                'Gryffindor first-years',
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
        }],
        ...overrides,
    };
}

test('projects active people separately from known local-only occupants', () => {
    const projection =
        projectPeoplePanel(createState());

    assert.deepEqual(
        projection.activePeople.map(
            person => person.id,
        ),
        ['ron'],
    );
    assert.deepEqual(
        projection.localPeople.map(
            person => person.id,
        ),
        ['hermione'],
    );
    assert.deepEqual(projection.cohorts, [{
        id: 'gryffindor_charms',
        label: 'Gryffindor first-years',
    }]);
});

test('fails closed for a mismatched local-presence room', () => {
    const state = createState({
        localPresence: {
            mapId: 'hogwarts_castle',
            roomId: 'great_hall',
            occupantActorIds: [
                'hermione',
            ],
            cohortIds: [
                'gryffindor_charms',
            ],
        },
    });
    const projection =
        projectPeoplePanel(state);

    assert.equal(
        projection.localPresenceValid,
        false,
    );
    assert.deepEqual(
        projection.localPeople,
        [],
    );
    assert.deepEqual(
        projection.cohorts,
        [],
    );
});

test('fails closed when the authoritative player room is unavailable', () => {
    const state = createState({
        map: {},
        scene: {
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
        },
    });
    const projection =
        projectPeoplePanel(state);

    assert.equal(
        projection.localPresenceValid,
        false,
    );
    assert.deepEqual(
        projection.localPeople,
        [],
    );
    assert.deepEqual(
        projection.cohorts,
        [],
    );
});

test('falls back to actor.present only when the active field is absent', () => {
    const legacy = createState();
    delete legacy
        .activeInteractionActorIds;

    assert.deepEqual(
        projectPeoplePanel(legacy)
            .activePeople
            .map(person => person.id),
        ['ron'],
    );
    assert.deepEqual(
        projectPeoplePanel(createState({
            activeInteractionActorIds: [],
        })).activePeople,
        [],
    );
    assert.deepEqual(
        projectPeoplePanel(createState({
            activeInteractionActorIds:
                null,
        })).activePeople,
        [],
    );
});

test('the panel uses native details and separate render targets', async () => {
    const panel = await readFile(
        new URL(
            '../public/scripts/extensions/hogwarts-mud/panel.html',
            import.meta.url,
        ),
        'utf8',
    );

    assert.match(
        panel,
        /<span>当前互动人物<\/span>/u,
    );
    assert.match(
        panel,
        /<details[^>]+class="hpmud-local-people"/u,
    );
    assert.match(
        panel,
        /<summary>[\s\S]*当前地点人物/u,
    );
    assert.match(
        panel,
        /id="hpmud_local_people"/u,
    );
    assert.match(
        panel,
        /id="hpmud_local_cohorts"/u,
    );
});

test('people-panel styles cover narrow screens, focus, and reduced motion', async () => {
    const css = await readFile(
        new URL(
            '../public/scripts/extensions/hogwarts-mud/style.css',
            import.meta.url,
        ),
        'utf8',
    );

    assert.match(
        css,
        /\.hpmud-local-people summary:focus-visible/u,
    );
    assert.match(
        css,
        /@media \(max-width: 420px\)[\s\S]*?\.hpmud-app\.scene-open \.hpmud-scene-panel/u,
    );
    assert.match(
        css,
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.hpmud-local-people summary::before/u,
    );
});
