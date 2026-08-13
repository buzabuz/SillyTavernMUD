/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    migrateActorContextV1,
    validateActorContextStateV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-cutover.js';
import {
    markActorIntroducedV1,
    updateActorLifeStateV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-runtime.js';
import {
    buildStoryCastPolicy,
} from '../public/scripts/extensions/hogwarts-mud/domain/cast.js';
import {
    normalizeNpcIdentity,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js';

const CLOCK =
    '1991-09-02 · 16:20';

function legacyState() {
    return {
        clock: CLOCK,
        turn: {
            count: 9,
        },
        actorLibrary: [{
            id: 'generated_guest',
            nameEn: 'Nora Pike',
            roleEn: 'Courier',
            source:
                'pacing_public_guest',
            introducedClock:
                '1991-09-02 · 15:00',
            introducedTurn: 8,
            identity:
                normalizeNpcIdentity({}),
            sharedMemories: {
                core: [],
                recent: [],
                everyday: [],
            },
        }],
        actors: [{
            id: 'generated_guest',
            nameEn: 'Nora Pike',
            source:
                'pacing_public_guest',
            introducedClock:
                '1991-09-02 · 15:00',
            introducedTurn: 8,
            mapId: 'hogwarts',
            roomId: 'great_hall',
            present: true,
            lifeStatus: 'injured',
            lifeStatusPermanent: false,
            lifeStatusDetailEn:
                'A sprained wrist.',
            lifeStatusSinceClock:
                '1991-09-02 · 15:30',
            currentActivityEn:
                'Holding her wrist.',
            currentIntentEn:
                'Find the matron.',
            temporary: false,
        }, {
            id: 'temporary_attendant',
            nameEn:
                'Trolley Attendant',
            roleEn: 'Attendant',
            source:
                'scene_temporary_actor',
            introducedClock:
                '1991-09-02 · 16:00',
            introducedTurn: 9,
            mapId: 'hogwarts',
            roomId: 'great_hall',
            present: false,
            lifeStatus: 'alive',
            lifeStatusPermanent: false,
            lifeStatusDetailEn:
                'Alive.',
            lifeStatusSinceClock: '',
            currentActivityEn:
                'Moving to the next room.',
            currentIntentEn: '',
            temporary: true,
            temporaryMemories: [{
                id: 'temporary_memory',
                summaryEn:
                    'Tina helped recover the trolley.',
                clock: CLOCK,
                turn: 9,
            }],
        }],
        eventKnowledge: [],
        socialGraph: {
            relationships: [],
        },
        sceneArchive: [],
    };
}

test('cutover preserves cast provenance, life state, and temporary memory without counting temporary cast', () => {
    const result =
        migrateActorContextV1(
            legacyState(),
        );
    const state = result.state;
    const guest =
        state.actorLibrary.find(actor =>
            actor.id ===
                'generated_guest');
    const temporaryCore =
        state.actorLibrary.find(actor =>
            actor.id ===
                'temporary_attendant');
    const guestRuntime =
        state.actors.find(actor =>
            actor.id ===
                'generated_guest');
    const policy =
        buildStoryCastPolicy(state);

    assert.deepEqual(
        guest.cast,
        {
            origin:
                'generated_guest',
            introducedClock:
                '1991-09-02 · 15:00',
            introducedTurn: 8,
        },
    );
    assert.equal(
        temporaryCore.cast.origin,
        'scene_temporary',
    );
    assert.equal(
        policy.storyActorCount,
        1,
    );
    assert.equal(
        policy.generatedGuestCount,
        1,
    );
    assert.deepEqual(
        {
            lifeStatus:
                guestRuntime.lifeStatus,
            permanent:
                guestRuntime
                    .lifeStatusPermanent,
            detail:
                guestRuntime
                    .lifeStatusDetailEn,
            since:
                guestRuntime
                    .lifeStatusSinceClock,
        },
        {
            lifeStatus: 'injured',
            permanent: false,
            detail:
                'A sprained wrist.',
            since:
                '1991-09-02 · 15:30',
        },
    );
    assert.equal(
        state.actorMemoryIndex
            .byActorId
            .temporary_attendant
            .everyday.length,
        1,
    );
    assert.equal(
        validateActorContextStateV1(
            state,
        ).valid,
        true,
    );
});

test('cutover rejects conflicting lifecycle authority atomically', () => {
    const state = legacyState();
    state.actorLibrary[0]
        .lifeStatus = 'alive';
    const before =
        structuredClone(state);

    assert.throws(
        () =>
            migrateActorContextV1(
                state,
            ),
        /Conflicting Actor lifecycle field lifeStatus/u,
    );
    assert.deepEqual(
        state,
        before,
    );
});

test('life reducer allows reversible medium state and only high permanent death', () => {
    const state =
        migrateActorContextV1(
            legacyState(),
        ).state;
    const actorId =
        'generated_guest';

    updateActorLifeStateV1(
        state,
        actorId,
        {
            lifeStatus:
                'incapacitated',
            lifeStatusPermanent:
                false,
            lifeStatusDetailEn:
                'Unconscious but stable.',
        },
        {
            tier: 'medium',
            clock:
                '1991-09-02 · 17:00',
        },
    );
    assert.equal(
        state.actors[0]
            .lifeStatusSinceClock,
        '1991-09-02 · 17:00',
    );
    assert.throws(
        () =>
            updateActorLifeStateV1(
                state,
                actorId,
                {
                    lifeStatus:
                        'dead',
                    lifeStatusPermanent:
                        true,
                    lifeStatusDetailEn:
                        'Dead.',
                },
                {
                    tier: 'medium',
                },
            ),
        /Only high tier/u,
    );
    const dead =
        updateActorLifeStateV1(
            state,
            actorId,
            {
                lifeStatus: 'dead',
                lifeStatusPermanent:
                    true,
                lifeStatusDetailEn:
                    'Killed by the committed consequence.',
                present: true,
            },
            {
                tier: 'high',
                clock:
                    '1991-09-02 · 18:00',
            },
        );
    assert.equal(dead.present, false);
    assert.throws(
        () =>
            updateActorLifeStateV1(
                state,
                actorId,
                {
                    lifeStatus:
                        'alive',
                    lifeStatusPermanent:
                        false,
                    lifeStatusDetailEn:
                        'Alive.',
                },
                {
                    tier: 'high',
                },
            ),
        /cannot be changed/u,
    );
});

test('introduced lifecycle is write-once', () => {
    const state =
        migrateActorContextV1(
            legacyState(),
        ).state;
    const actorId =
        'temporary_attendant';
    const before =
        structuredClone(
            state.actorLibrary.find(
                actor =>
                    actor.id === actorId,
            ).cast,
        );

    markActorIntroducedV1(
        state,
        actorId,
        {
            clock:
                '1991-09-03 · 09:00',
            turn: 12,
        },
    );
    assert.deepEqual(
        state.actorLibrary.find(
            actor =>
                actor.id === actorId,
        ).cast,
        before,
    );
});
