/* eslint-disable playwright/expect-expect */
import {
    applySceneTransition,
} from '../public/scripts/extensions/hogwarts-mud/domain/archive-projection.js';
import {
    migrateCalendarState,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-migration.js';
import {
    getSceneDestinationAuthority,
    validateSceneDestinationGrounding,
} from '../public/scripts/extensions/hogwarts-mud/domain/scene-destination.js';
import {
    normalizeSceneTransitionPackage,
    stripSyntheticSceneOpeningActorSegments,
    validateSceneTransitionPackage,
} from '../public/scripts/extensions/hogwarts-mud/domain/scene-transition.js';
import {
    createCurrentKingsCrossState,
    createCurrentPlayingState,
    createCurrentTransitionPackage,
    normalizeCurrentActorFixtureInPlace,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

function createCurrentCalendarEntry(
    id,
    startClock,
    endClock,
) {
    return {
        id,
        parentId: '',
        entryType: 'event',
        title: id,
        titleEn: id,
        summary:
            `${id} 的公开安排。`,
        summaryEn:
            `Public schedule for ${id}.`,
        tags: [],
        startClock,
        endClock,
        participantIds: [],
        mapId: 'zhang_home',
        roomId: 'kitchen',
        status: 'planned',
        planningTier: 'medium',
        relatedSceneIds: [],
        createdClock:
            '1991-07-24 · 09:15',
        updatedClock:
            '1991-07-24 · 09:15',
    };
}

function migrateCurrentCalendarFixture(
    state,
    entries,
) {
    const migration =
        migrateCalendarState({
            ...state,
            calendar: {
                version: 1,
                entries,
                horizon:
                    state.clock,
            },
        });
    return migration.state;
}

function addCurrentExpiredStoryBeat(
    state,
    id,
) {
    const next =
        structuredClone(state);
    const storylineId =
        `${id}_storyline`;
    next.calendar.storylines.push({
        id: storylineId,
        title: storylineId,
        titleEn: storylineId,
        summary:
            '用于统一时钟结算回归的公开故事线。',
        summaryEn:
            'A public storyline for shared clock-settlement regression.',
        tags: [],
        startClock:
            '1991-07-24 · 09:00',
        endClock:
            '1992-06-30 · 23:59',
        participantIds: [],
        status: 'active',
        createdClock:
            '1991-07-24 · 09:15',
        updatedClock:
            '1991-07-24 · 09:15',
    });
    next.calendar.storyBeats.push({
        id,
        storylineId,
        title: id,
        titleEn: id,
        summary:
            '正文错误地宣称四个场景已经全部完成。',
        summaryEn:
            'The prose incorrectly claims that all four Scenes are complete.',
        tags: [],
        termKey:
            `${id}_term`,
        sequence: 1,
        windowStartClock:
            '1991-07-24 · 09:00',
        windowEndClock:
            '1991-07-24 · 09:45',
        sceneTarget: 4,
        status: 'active',
        relatedSceneIds: [],
        createdClock:
            '1991-07-24 · 09:15',
        updatedClock:
            '1991-07-24 · 09:15',
    });
    return next;
}

function createEntranceHallTransitionCase() {
    const state =
        createCurrentPlayingState();
    const destination = {
        mapId: 'hogwarts_castle',
        roomId: 'entrance_hall',
    };
    const payload =
        createCurrentTransitionPackage();
    payload.nextScene.id =
        'hogwarts_entrance_hall_arrival';
    payload.nextScene.mapId =
        destination.mapId;
    payload.nextScene.roomId =
        destination.roomId;
    payload.nextScene.nameEn =
        'Hogwarts Castle — Entrance Hall';
    payload.nextScene.summaryEn =
        'The first-years stand in the Entrance Hall beside the marble staircase; McGonagall will lead them into the Great Hall for the Sorting.';
    payload.nextScene.explorationHookEn =
        'In the Entrance Hall, a suit of armour keeps turning its helmet toward the closed doors and may be inspected or ignored.';
    payload.nextScene.actorStates[0]
        .mapId = destination.mapId;
    payload.nextScene.actorStates[0]
        .roomId = destination.roomId;
    payload.nextScene.actorStates[0]
        .currentActivityEn =
        'Waiting beside the closed doors, staring at the marble staircase with parchment in hand.';
    payload.nextScene.openingSegments[0]
        .textEn =
        'Entrance Hall: torchlight reaches the marble staircase and the closed doors to the Great Hall.';
    payload.nextScene.followingSceneIntent
        .mapId = destination.mapId;
    payload.nextScene.followingSceneIntent
        .roomId = destination.roomId;
    return {
        destination,
        payload,
        state,
    };
}

test('scene transition duration is not locally capped', () => {
    const state =
        createCurrentPlayingState();
    state.clock =
        '1991-07-24 · 02:50';
    const source =
        createCurrentTransitionPackage(
            'kitchen',
        );
    delete source.nextClock;

    const oldMaximum =
        normalizeSceneTransitionPackage({
            ...structuredClone(
                source,
            ),
            transitionMinutes: 180,
        }, state);
    assert.equal(
        oldMaximum.nextClock,
        '1991-07-24 · 05:50',
    );
    assert.equal(
        validateSceneTransitionPackage(
            oldMaximum,
            state,
            {
                expectedMapId:
                    'zhang_home',
                expectedRoomId:
                    'kitchen',
            },
        ).valid,
        true,
    );

    const overnight =
        normalizeSceneTransitionPackage({
            ...structuredClone(
                source,
            ),
            transitionMinutes: 280,
        }, state);
    assert.equal(
        overnight.nextClock,
        '1991-07-24 · 07:30',
    );
    assert.equal(
        validateSceneTransitionPackage(
            overnight,
            state,
            {
                expectedMapId:
                    'zhang_home',
                expectedRoomId:
                    'kitchen',
            },
        ).valid,
        true,
    );

    const longSkip =
        normalizeSceneTransitionPackage({
            ...structuredClone(
                source,
            ),
            transitionMinutes:
                20000,
        }, state);
    assert.equal(
        longSkip.transitionMinutes,
        20000,
    );
});

test('scene transition validation locks an explicit player destination', () => {
    const state = createCurrentPlayingState();
    const valid = validateSceneTransitionPackage(
        createCurrentTransitionPackage(),
        state,
        {
            expectedMapId: 'zhang_home',
            expectedRoomId: 'back_garden',
        },
    );
    assert.deepEqual(valid, { valid: true, errors: [] });

    const wrongRoom = validateSceneTransitionPackage(
        createCurrentTransitionPackage('kitchen'),
        state,
        {
            expectedMapId: 'zhang_home',
            expectedRoomId: 'back_garden',
        },
    );
    assert.equal(wrongRoom.valid, false);
    assert.match(wrongRoom.errors.join('；'), /back_garden/);

    const shortQuill =
        createCurrentTransitionPackage();
    shortQuill.authorQuillEn =
        'Tina did very well and everyone laughed.';
    const invalidQuill =
        validateSceneTransitionPackage(
            shortQuill,
            state,
        );
    assert.equal(invalidQuill.valid, false);
    assert.match(
        invalidQuill.errors.join('；'),
        /作者的羽毛笔/,
    );

    const missingHook =
        createCurrentTransitionPackage();
    delete missingHook.nextScene
        .explorationHookEn;
    const invalidHook =
        validateSceneTransitionPackage(
            missingHook,
            state,
        );
    assert.equal(invalidHook.valid, false);
    assert.match(
        invalidHook.errors.join('；'),
        /explorationHookEn/,
    );

    const unrepresentedActor =
        createCurrentTransitionPackage();
    unrepresentedActor.nextScene.actorStates
        .push({
            id: 'tina_mother',
            present: true,
            currentActivityEn:
                'Standing silently by the garden door.',
            currentIntentEn: '',
            lifeStatus: 'alive',
            lifeStatusPermanent: false,
            lifeStatusDetailEn:
                'Alive and unharmed.',
            mapId: 'zhang_home',
            roomId: 'kitchen',
        });
    const invisiblePresence =
        validateSceneTransitionPackage(
            unrepresentedActor,
            state,
        );
    assert.equal(
        invisiblePresence.valid,
        true,
    );
    const locallyRepresented =
        normalizeSceneTransitionPackage(
            unrepresentedActor,
            state,
        );
    assert.equal(
        validateSceneTransitionPackage(
            locallyRepresented,
            state,
        ).valid,
        true,
    );
    assert.doesNotMatch(
        locallyRepresented.nextScene
            .openingSegments
            .map(segment => segment.textEn)
            .join(' '),
        /Mei Zhang/,
    );

    assert.deepEqual(
        stripSyntheticSceneOpeningActorSegments([
            {
                type: 'narration',
                textEn:
                    'The Charms Classroom fills with first-years.',
            },
            {
                type: 'narration',
                textEn:
                    'Hermione Jean Granger remains visible in the scene, seated with her book open.',
            },
        ]),
        [{
            type: 'narration',
            textEn:
                'The Charms Classroom fills with first-years.',
        }],
    );

});

test('compact scene-seal core normalizes into a valid transition without optional prose or enrichments', () => {
    const state =
        createCurrentPlayingState();
    const core =
        createCurrentTransitionPackage();
    delete core.worldChanges;
    delete core.socialStatements;
    delete core
        .socialRelationshipEvidence;
    delete core.nextScene
        .openingSegments;

    const normalized =
        normalizeSceneTransitionPackage(
            core,
            state,
            {
                tier: 'medium',
                deferWorldChanges:
                    true,
            },
        );
    assert.equal(
        Object.hasOwn(
            normalized,
            'worldChanges',
        ),
        false,
    );
    assert.equal(
        normalized.nextScene
            .openingSegments.length >=
            2,
        true,
    );
    assert.equal(
        normalized.nextScene
            .openingSegments.some(
                segment =>
                    segment.type ===
                    'narration',
            ),
        true,
    );
    assert.equal(
        validateSceneTransitionPackage(
            normalized,
            state,
            {
                tier: 'medium',
                deferWorldChanges:
                    true,
            },
        ).valid,
        true,
    );
});

test('scene transitions capture but never overwrite a new actor first impression', () => {
    const state =
        createCurrentPlayingState();
    state.actorMemoryIndex
        .byActorId
        .old_archivist
        .firstImpressionRef = '';
    const payload =
        createCurrentTransitionPackage();
    payload.nextScene.actorStates.push({
        id: 'old_archivist',
        present: true,
        currentActivityEn:
            'Standing beside the dry patch in the Back Garden.',
        currentIntentEn: '',
        lifeStatus: 'alive',
        lifeStatusPermanent: false,
        lifeStatusDetailEn:
            'Alive and unharmed.',
        mapId: 'zhang_home',
        roomId: 'back_garden',
    });
    payload.nextScene.openingSegments[0]
        .textEn +=
        ' Miriam Strout stands beside the dry patch.';

    assert.match(
        validateSceneTransitionPackage(
            payload,
            state,
        ).errors.join('；'),
        /初见印象/,
    );
    payload.nextScene.actorStates[1]
        .firstImpressionOfPlayerEn =
        'A carefully dressed Chinese child whose stillness looks more watchful than shy.';
    assert.deepEqual(
        validateSceneTransitionPackage(
            payload,
            state,
        ),
        { valid: true, errors: [] },
    );
    const committed =
        applySceneTransition(
            state,
            payload,
            {
                id: state.scene.id,
                startedClock:
                    state.scene.startedClock,
                endedClock:
                    state.clock,
                closureSummary:
                    payload.closureSummaryEn,
            },
        );
    const committedRef =
        committed.actorMemoryIndex
            .byActorId
            .old_archivist
            .firstImpressionRef;
    const committedArchivist =
        committed.memorySynapse
            .appraisals.find(
                appraisal =>
                    appraisal.id ===
                    committedRef,
            );
    assert.equal(
        committedArchivist
            .summaryEn,
        payload.nextScene.actorStates[1]
            .firstImpressionOfPlayerEn,
    );
    const overwrite =
        structuredClone(payload);
    overwrite.nextScene.id =
        'another_new_scene';
    overwrite.nextScene.actorStates[1]
        .firstImpressionOfPlayerEn =
        'A different first impression that must not replace the original.';
    assert.match(
        validateSceneTransitionPackage(
            overwrite,
            committed,
        ).errors.join('；'),
        /不得覆盖/,
    );
});

test('scene transition checkpoints settle a pending first impression for an actor who was already present', () => {
    const state =
        createCurrentPlayingState();
    state.actorMemoryIndex
        .byActorId
        .minerva_mcgonagall
        .firstImpressionRef = '';

    const payload =
        createCurrentTransitionPackage();
    payload.nextScene.actorStates[0]
        .roomId = 'back_garden';
    delete payload.nextScene
        .actorStates[0]
        .firstImpressionOfPlayerEn;

    assert.match(
        validateSceneTransitionPackage(
            payload,
            state,
        ).errors.join('；'),
        /初见印象/,
    );

    payload.nextScene.actorStates[0]
        .firstImpressionOfPlayerEn =
        'A lake-drenched first-year girl with dark hair and bright blue eyes who studies every stone arch as though comparing the castle against a private property checklist.';
    const normalized =
        normalizeSceneTransitionPackage(
            payload,
            state,
        );
    const normalizedFirstImpression =
        normalized.nextScene.actorStates[0]
            .firstImpressionOfPlayerEn;
    assert.equal(
        normalizedFirstImpression
            .split(/\s+/)
            .filter(Boolean)
            .length,
        24,
    );
    assert.equal(
        validateSceneTransitionPackage(
            normalized,
            state,
        ).valid,
        true,
    );

    payload.nextScene.actorStates[0]
        .firstImpressionOfPlayerEn =
        'A small, striking girl whose bright eyes make every new rule look negotiable.';
    assert.deepEqual(
        validateSceneTransitionPackage(
            payload,
            state,
        ),
        { valid: true, errors: [] },
    );

    const committed =
        applySceneTransition(
            state,
            payload,
            {
                id: state.scene.id,
                startedClock:
                    state.scene.startedClock,
                endedClock:
                    state.clock,
                closureSummary:
                    payload
                        .closureSummaryEn,
            },
        );
    const settledRef =
        committed.actorMemoryIndex
            .byActorId
            .minerva_mcgonagall
            .firstImpressionRef;
    const settled =
        committed.memorySynapse
            .appraisals.find(
                appraisal =>
                    appraisal.id ===
                    settledRef,
            );
    assert.equal(
        settled.summaryEn,
        payload.nextScene.actorStates[0]
            .firstImpressionOfPlayerEn,
    );
});

test('scene transition normalization never hides a wrong model destination', () => {
    const state = createCurrentPlayingState();
    const payload = createCurrentTransitionPackage();
    const normalized = normalizeSceneTransitionPackage(payload, state);
    const expected = {
        mapId: 'diagon_alley',
        roomId: 'leaky_cauldron',
    };

    assert.equal(normalized.nextScene.mapId, 'zhang_home');
    assert.equal(normalized.nextScene.roomId, 'back_garden');
    const validation = validateSceneTransitionPackage(normalized, state, {
        expectedMapId: expected.mapId,
        expectedRoomId: expected.roomId,
        requireDestinationGrounding: true,
    });
    assert.equal(validation.valid, false);
    assert.match(validation.errors.join('；'), /diagon_alley/);
    assert.match(validation.errors.join('；'), /leaky_cauldron/);
});

test('unbound transition normalization resolves a known room on its authoritative map', () => {
    const state = createCurrentPlayingState();
    const profile =
        state.actorLibrary.find(actor =>
            actor.id ===
            'minerva_mcgonagall');
    profile.firstImpressionOfPlayerEn =
        'A visibly wilful child who treats every boundary as negotiable.';
    const payload =
        createCurrentTransitionPackage();
    payload.nextScene.mapId =
        'hogwarts_grounds';
    payload.nextScene.roomId =
        'hogsmeade_station';
    payload.nextScene.nameEn =
        'Arrival at Hogsmeade Station';
    payload.nextScene.summaryEn =
        'The Hogwarts Express has stopped at Hogsmeade Station and the first-years are gathering on the platform.';
    payload.nextScene.explorationHookEn =
        'At Hogsmeade Station, a lantern-bearing figure is calling for first-years beside a narrow path into the dark.';
    payload.nextScene.actorStates[0] = {
        ...payload.nextScene
            .actorStates[0],
        mapId: 'hogwarts_grounds',
        roomId: 'hogsmeade_station',
        currentActivityEn:
            'Waiting with the first-years at Hogsmeade Station.',
        firstImpressionOfPlayerEn:
            'This duplicate must not overwrite committed history.',
    };
    payload.nextScene.openingSegments[0]
        .textEn =
        'Steam drifts across Hogsmeade Station as the first-years step down onto the dark platform.';
    payload.nextScene.followingSceneIntent = {
        titleEn: 'Across the Black Lake',
        summaryEn:
            'Follow the first-years from the station toward the boats.',
        triggerEn:
            'When the player follows the lantern-bearing guide.',
        mapId: 'hogwarts_grounds',
        roomId: 'great_lake_dock',
        tier: 'medium',
    };

    const normalized =
        normalizeSceneTransitionPackage(
            payload,
            state,
            {
                tier: 'medium',
                repairUnboundDestination:
                    true,
                destinationHint:
                    'Arrive at Hogwarts for the Sorting.',
            },
        );
    assert.equal(
        normalized.nextScene.mapId,
        'hogsmeade',
    );
    assert.equal(
        normalized.nextScene.roomId,
        'hogsmeade_station',
    );
    assert.equal(
        normalized.nextScene
            .actorStates[0].mapId,
        'hogsmeade',
    );
    assert.equal(
        normalized.nextScene
            .actorStates[0]
            .firstImpressionOfPlayerEn,
        undefined,
    );
    assert.equal(
        validateSceneTransitionPackage(
            normalized,
            state,
            { tier: 'medium' },
        ).valid,
        true,
    );
});

test('scene transition normalization repairs invalid actor and following rooms', () => {
    const state = createCurrentPlayingState();
    const payload = createCurrentTransitionPackage();
    payload.nextScene.actorStates[0].roomId = 'invented_balcony';
    payload.nextScene.actorStates[0].currentActivityEn = 'Waiting nearby.';
    payload.nextScene.followingSceneIntent.mapId = 'invented_map';
    payload.nextScene.followingSceneIntent.roomId = 'invented_room';
    payload.nextScene.followingSceneIntent.titleEn = 'An Unmapped Errand';
    payload.nextScene.followingSceneIntent.summaryEn = 'Continue somewhere invented.';

    const normalized = normalizeSceneTransitionPackage(payload, state);

    assert.equal(
        normalized.nextScene.actorStates[0].roomId,
        'back_garden',
    );
    assert.equal(
        normalized.nextScene.followingSceneIntent.mapId,
        'zhang_home',
    );
    assert.equal(
        normalized.nextScene.followingSceneIntent.roomId,
        'back_garden',
    );
    assert.equal(
        validateSceneTransitionPackage(normalized, state).valid,
        true,
    );
});

test('scene transition grounding validates structured destination without parsing prose', () => {
    const state = createCurrentPlayingState();
    const destination = {
        mapId: 'diagon_alley',
        roomId: 'leaky_cauldron',
    };
    const authority = getSceneDestinationAuthority(state, destination);
    assert.equal(authority.roomNameEn, 'Leaky Cauldron');

    const payload = createCurrentTransitionPackage();
    payload.nextScene.id = 'leaky_cauldron_arrival';
    payload.nextScene.mapId = destination.mapId;
    payload.nextScene.roomId = destination.roomId;
    payload.nextScene.nameEn = 'Arrival at the Leaky Cauldron';
    payload.nextScene.summaryEn =
        'The family reaches the Leaky Cauldron with the school list in hand.';
    payload.nextScene.explorationHookEn =
        'Inside the Leaky Cauldron, a brass room key keeps turning toward a sealed upstairs landing whenever nobody touches it.';
    payload.nextScene.actorStates[0].mapId = destination.mapId;
    payload.nextScene.actorStates[0].roomId = destination.roomId;
    payload.nextScene.actorStates[0].currentActivityEn =
        'Waiting beside a table in the Leaky Cauldron.';
    payload.nextScene.openingSegments[0].textEn =
        'The Leaky Cauldron is dim even at noon, and every chair seems to know it.';
    payload.nextScene.followingSceneIntent.mapId = destination.mapId;
    payload.nextScene.followingSceneIntent.roomId = destination.roomId;

    assert.deepEqual(
        validateSceneDestinationGrounding(payload, state, destination),
        { valid: true, errors: [] },
    );
    assert.equal(
        validateSceneTransitionPackage(payload, state, {
            expectedMapId: destination.mapId,
            expectedRoomId: destination.roomId,
            requireDestinationGrounding: true,
        }).valid,
        true,
    );

    payload.nextScene.summaryEn =
        'Tina returns to the back garden while the owl waits on the fence.';
    payload.nextScene.openingSegments[0].textEn =
        'Wet grass clings to her socks beside the garden fence.';
    const stale = validateSceneDestinationGrounding(
        payload,
        state,
        destination,
    );
    assert.deepEqual(
        stale,
        { valid: true, errors: [] },
    );

    payload.nextScene.roomId =
        'gringotts_steps';
    const wrongStructuredRoom =
        validateSceneDestinationGrounding(
            payload,
            state,
            destination,
        );
    assert.equal(
        wrongStructuredRoom.valid,
        false,
    );
    assert.match(
        wrongStructuredRoom.errors
            .join('；'),
        /leaky_cauldron/,
    );
});

test('scene transition allows adjacent-room references without treating them as current location assertions', () => {
    const {
        destination,
        payload,
        state,
    } = createEntranceHallTransitionCase();
    assert.deepEqual(
        validateSceneTransitionPackage(
            payload,
            state,
            {
                expectedMapId:
                    destination.mapId,
                expectedRoomId:
                    destination.roomId,
                requireDestinationGrounding:
                    true,
            },
        ),
        {
            valid: true,
            errors: [],
        },
    );
});

test('[defect-probing][Task 15] scene transition rejects actor activity that asserts a different current room', () => {
    const {
        payload,
        state,
    } = createEntranceHallTransitionCase();
    payload.nextScene.actorStates[0]
        .currentActivityEn =
        'Standing in the Great Hall beside the staff table.';
    const activityMismatch =
        validateSceneTransitionPackage(
            payload,
            state,
        );
    assert.equal(
        activityMismatch.valid,
        false,
    );
    assert.match(
        activityMismatch.errors.join('；'),
        /\[actor:.*\/room\]/u,
    );
});

test('scene transition rejects a structured room ID that differs from destination authority', () => {
    const state = createCurrentKingsCrossState();
    const payload =
        createCurrentTransitionPackage();
    payload.nextScene.id =
        'kings_cross_barrier_arrival';
    payload.nextScene.mapId =
        'kings_cross';
    payload.nextScene.roomId =
        'hogwarts_express';
    payload.nextScene.nameEn =
        'The Hogwarts Express';
    payload.nextScene.summaryEn =
        'The Hogwarts Express waits beyond the barrier between Platforms Nine and Ten, which Tina has not crossed.';
    payload.nextScene.actorStates[0].mapId =
        'kings_cross';
    payload.nextScene.actorStates[0].roomId =
        'hogwarts_express';
    payload.nextScene.actorStates[0]
        .currentActivityEn =
        'Waiting aboard the Hogwarts Express.';
    payload.nextScene.openingSegments[0]
        .textEn =
        'Hogwarts Express: Tina and Alex stand before the brick barrier between Platforms Nine and Ten while Minerva McGonagall waits beside them.';
    payload.nextScene.followingSceneIntent
        .mapId = 'kings_cross';
    payload.nextScene.followingSceneIntent
        .roomId =
        'platform_nine_three_quarters';

    const invalid =
        validateSceneTransitionPackage(
            payload,
            state,
            {
                expectedMapId:
                    'kings_cross',
                expectedRoomId:
                    'platform_barrier',
                requireDestinationGrounding:
                    true,
            },
        );
    assert.equal(invalid.valid, false);
    assert.match(
        invalid.errors.join('；'),
        /platform_barrier/,
    );

    payload.nextScene.roomId =
        'platform_barrier';
    payload.nextScene.actorStates[0].roomId =
        'platform_barrier';
    payload.nextScene.actorStates[0]
        .currentActivityEn =
        'Waiting at the barrier between Platforms Nine and Ten.';
    assert.equal(
        validateSceneTransitionPackage(
            payload,
            state,
            {
                expectedMapId:
                    'kings_cross',
                expectedRoomId:
                    'platform_barrier',
                requireDestinationGrounding:
                    true,
            },
        ).errors.some(error =>
            error.includes(
                'platform_barrier',
            )),
        false,
    );
});

test('scene transition commits an absolute nextClock across a deliberate calendar jump', () => {
    const state =
        addCurrentExpiredStoryBeat(
            migrateCurrentCalendarFixture(
                createCurrentPlayingState(),
                [
                    createCurrentCalendarEntry(
                        'crossed_transition_event',
                        '1991-07-25 · 09:00',
                        '1991-07-25 · 10:00',
                    ),
                    createCurrentCalendarEntry(
                        'active_transition_event',
                        '1991-09-01 · 10:00',
                        '1991-09-01 · 11:00',
                    ),
                ],
            ),
            'transition_expired_beat',
        );
    const payload =
        createCurrentTransitionPackage();
    payload.nextClock =
        '1991-09-01 · 10:30';
    payload.nextScene.temporalFactsEn = [
        'The current date is 1 September 1991.',
        'The train departs at eleven.',
    ];
    const next = applySceneTransition(
        state,
        payload,
        {
            id: state.scene.id,
            startedClock:
                state.scene.startedClock,
            endedClock: state.clock,
            status: 'closed',
        },
        {
            tier: 'medium',
        },
    );

    assert.equal(
        next.clock,
        '1991-09-01 · 10:30',
    );
    assert.equal(
        next.scene.startedClock,
        '1991-09-01 · 10:30',
    );
    assert.deepEqual(
        next.calendar.entries
            .map(entry => [
                entry.id,
                entry.status,
            ]),
        [
            [
                'crossed_transition_event',
                'completed',
            ],
            [
                'active_transition_event',
                'active',
            ],
        ],
    );
    assert.equal(
        next.calendar.storyBeats
            .find(beat =>
                beat.id ===
                'transition_expired_beat')
            .status,
        'deferred',
        'Scene Transition uses the shared local beat settlement',
    );
    assert.deepEqual(
        next.scene.temporalFactsEn,
        payload.nextScene
            .temporalFactsEn,
    );
});

test('scene transition atomically archives the old scene and commits the next room', () => {
    const state = createCurrentPlayingState();
    state.memoryDirector
        .pendingEventBoundary = {
            id: 'old:event:1',
            status: 'pending',
            sceneId: state.scene.id,
            turn: state.turn.count,
        };
    const payload = createCurrentTransitionPackage();
    payload.nextScene.name = '后花园里的猫头鹰';
    payload.nextScene.summary = '蒂娜抵达围墙边，猫头鹰仍在等候。';
    payload.nextScene.chapter = '早餐时的信';
    payload.nextScene.actorStates[0].currentActivity = '拿着回条站在花园门边。';
    const archive = {
        id: state.scene.id,
        name: state.scene.name,
        closureSummary: '助学金表格已经签好，蒂娜跑进了花园。',
        startedClock: state.scene.startedClock,
        endedClock: state.clock,
        messageIds: [1, 2, 3],
        status: 'closed',
    };
    const next = applySceneTransition(state, payload, archive, {
        expectedMapId: 'zhang_home',
        expectedRoomId: 'back_garden',
        startedMessageId: 17,
        tier: 'medium',
    });

    assert.equal(next.sceneArchive.length, 1);
    assert.equal(next.sceneArchive[0].id, 'zhang_home_kitchen');
    assert.deepEqual(next.sceneArchive[0].timelineEntries, [
        state.scene
            .timelineEntries[0],
        {
            clock: '1991-07-24 · 11:15',
            label: '助学金表格已经签好，蒂娜跑进了花园。',
        },
    ]);
    assert.equal(next.scene.id, 'zhang_home_garden_owl');
    assert.equal(
        next.scene.explorationHookEn,
        payload.nextScene.explorationHookEn,
    );
    assert.equal(next.scene.startedMessageId, 17);
    assert.equal(next.scene.nextSceneIntent.titleEn, 'The Signed Reply');
    assert.deepEqual(next.scene.timelineEntries, [{
        clock: '1991-07-24 · 11:15',
        label: '蒂娜抵达围墙边，猫头鹰仍在等候。',
    }]);
    assert.equal(next.location, '后花园');
    assert.equal(next.map.currentLocalNodeId, 'back_garden');
    assert.equal(next.actors.find(actor =>
        actor.id === 'minerva_mcgonagall').present, true);
    assert.equal(next.actors.find(actor =>
        actor.id === 'tina_mother').present, false);
    assert.deepEqual(
        next.activeInteractionActorIds,
        [
            'minerva_mcgonagall',
        ],
    );
    assert.deepEqual(
        next.localPresence,
        {
            version: 1,
            mapId:
                'zhang_home',
            roomId:
                'back_garden',
            occupantActorIds: [],
            cohortIds: [],
            updatedTurn:
                next.turn.count,
            source:
                'scene_roster',
        },
    );
    assert.equal(next.sceneTransition.status, 'idle');
    assert.deepEqual(
        next.memoryDirector
            .pendingEventBoundary,
        {
            id: 'old:event:1',
            boundaryId: 'old:event:1',
            status: 'pending',
            sceneId:
                'zhang_home_kitchen',
            turn: 0,
            carriedToSceneId:
                'zhang_home_garden_owl',
        },
    );
    assert.equal(
        next.memoryDirector
            .lastReviewedTurn,
        next.turn.count,
    );
});

test('classroom transition keeps a full local cohort while limiting the active cast', () => {
    const state =
        createCurrentPlayingState();
    const cohortMemberIds = [
        'tina_mother',
        'classmate_a',
        'classmate_b',
    ];
    state.actorLibrary.push(
        {
            id:
                'classmate_a',
            nameEn:
                'Classmate A',
        },
        {
            id:
                'classmate_b',
            nameEn:
                'Classmate B',
        },
    );
    state.actors.push(
        ...[
            'classmate_a',
            'classmate_b',
        ].map(id => ({
            id,
            nameEn: id,
            present: false,
            lifeStatus:
                'alive',
            mapId:
                'zhang_home',
            roomId:
                'charms_classroom',
        })),
    );
    state.actors =
        state.actors.map(actor => ({
            ...actor,
            mapId:
                'zhang_home',
            roomId:
                'charms_classroom',
        }));
    const minervaFirstImpressionRef =
        state.actorMemoryIndex
            .byActorId
            .minerva_mcgonagall
            .firstImpressionRef;
    state.actorLibrary.find(actor =>
        actor.id ===
            'minerva_mcgonagall')
        .firstImpressionOfPlayerEn =
        state.memorySynapse.appraisals
            .find(appraisal =>
                appraisal.id ===
                    minervaFirstImpressionRef)
            .summaryEn;
    normalizeCurrentActorFixtureInPlace(
        state,
    );
    state.scene.roomId =
        'charms_classroom';
    state.map
        .currentLocalNodeId =
        'charms_classroom';
    state.map.customLocalMaps[0]
        .nodes = [
            {
                id:
                    'charms_classroom',
                name:
                    '魔咒课教室',
                nameEn:
                    'Charms Classroom',
                levelId:
                    'ground_floor',
                kind:
                    'classroom',
            },
            {
                id:
                    'transfiguration_classroom',
                name:
                    '变形术教室',
                nameEn:
                    'Transfiguration Classroom',
                levelId:
                    'ground_floor',
                kind:
                    'classroom',
            },
        ];
    state.localPresence = {
        version: 1,
        mapId:
            'zhang_home',
        roomId:
            'charms_classroom',
        occupantActorIds:
            cohortMemberIds,
        cohortIds: [
            'gryffindor_year1_charms_1991',
        ],
        updatedTurn: 0,
        source:
            'cohort_roster',
    };
    state.cohorts = [{
        version: 1,
        id:
            'gryffindor_year1_charms_1991',
        labelEn:
            'Gryffindor first-years in Charms',
        mapId:
            'zhang_home',
        roomId:
            'charms_classroom',
        knownMemberActorIds:
            cohortMemberIds,
        source:
            'class_roster',
    }];
    const payload =
        createCurrentTransitionPackage(
            'transfiguration_classroom',
        );
    payload.nextScene.nameEn =
        'Transfiguration Classroom';
    payload.nextScene.summaryEn =
        'The class takes its seats for Transfiguration.';
    payload.nextScene.actorStates[0]
        .roomId =
        'transfiguration_classroom';
    payload.nextScene
        .followingSceneIntent
        .roomId =
        'transfiguration_classroom';

    const next =
        applySceneTransition(
            state,
            payload,
            {
                id:
                    state.scene.id,
                status:
                    'closed',
            },
            {
                expectedMapId:
                    'zhang_home',
                expectedRoomId:
                    'transfiguration_classroom',
            },
        );

    assert.deepEqual(
        next.activeInteractionActorIds,
        [
            'minerva_mcgonagall',
        ],
    );
    assert.deepEqual(
        next.localPresence,
        {
            version: 1,
            mapId:
                'zhang_home',
            roomId:
                'transfiguration_classroom',
            occupantActorIds: [
                'classmate_a',
                'classmate_b',
                'minerva_mcgonagall',
                'tina_mother',
            ],
            cohortIds: [
                'gryffindor_year1_transfiguration_1991',
            ],
            updatedTurn: 0,
            source:
                'cohort_roster',
        },
    );
    assert.equal(
        next.actors.find(actor =>
            actor.id ===
                'classmate_a')
            .present,
        false,
    );
    assert.equal(
        next.actors.find(actor =>
            actor.id ===
                'classmate_a')
            .roomId,
        'transfiguration_classroom',
    );
});

test('scene transition does not teleport an omitted actor to the new map', () => {
    const state = createCurrentPlayingState();
    const payload = createCurrentTransitionPackage();
    payload.nextScene.id = 'leaky_cauldron_arrival';
    payload.nextScene.mapId = 'diagon_alley';
    payload.nextScene.roomId = 'leaky_cauldron';
    payload.nextScene.actorStates = payload.nextScene.actorStates.map(actor => ({
        ...actor,
        mapId: 'diagon_alley',
        roomId: 'leaky_cauldron',
    }));
    payload.nextScene.followingSceneIntent.mapId = 'diagon_alley';
    payload.nextScene.followingSceneIntent.roomId = 'leaky_cauldron';

    const next = applySceneTransition(state, payload, {
        id: state.scene.id,
        status: 'closed',
    });
    const omitted = next.actors.find(actor => actor.id === 'tina_mother');

    assert.equal(omitted.present, false);
    assert.equal(omitted.mapId, 'zhang_home');
    assert.equal(omitted.roomId, 'kitchen');
});

test('scene transition snapshots carried and stored item custody', () => {
    const state = createCurrentPlayingState();
    state.items = [
        {
            id: 'player_wand',
            labelEn: 'Player Wand',
            detailEn: 'A chosen wand.',
            importance: 'key',
            custody: 'carried',
            ownerId: 'player',
            mapId: 'zhang_home',
            roomId: 'kitchen',
        },
        {
            id: 'old_letter',
            labelEn: 'Old Letter',
            detailEn: 'Stored on the kitchen table.',
            importance: 'important',
            custody: 'stored',
            ownerId: 'player',
            mapId: 'zhang_home',
            roomId: 'kitchen',
        },
        {
            id:
                'harry_spare_brass_quill',
            labelEn:
                'Harry\'s Spare Brass Quill',
            detailEn:
                'Destroyed brass-nibbed quill remains.',
            importance: 'important',
            custody: 'carried',
            ownerId:
                'canon_harry_james_potter',
            holderId: 'player',
            state: 'destroyed',
            transferMode: 'loan',
            mapId: 'zhang_home',
            roomId: 'kitchen',
        },
    ];
    const next = applySceneTransition(
        state,
        createCurrentTransitionPackage(),
        {
            id: state.scene.id,
            status: 'closed',
        },
        {
            tier: 'medium',
        },
    );
    const wand = next.items.find(
        item => item.id === 'player_wand');
    const letter = next.items.find(
        item => item.id === 'old_letter');
    const quill = next.items.find(
        item =>
            item.id ===
                'harry_spare_brass_quill',
    );
    assert.equal(wand.roomId, 'back_garden');
    assert.equal(wand.custody, 'carried');
    assert.equal(letter.roomId, 'kitchen');
    assert.equal(letter.custody, 'stored');
    assert.equal(
        quill.ownerId,
        'canon_harry_james_potter',
    );
    assert.equal(
        quill.holderId,
        'player',
    );
    assert.equal(
        quill.state,
        'destroyed',
    );
    assert.equal(
        quill.roomId,
        'back_garden',
    );
    assert.deepEqual(
        next.scene.itemStates.map(item => [
            item.id,
            item.custody,
            item.roomId,
        ]),
        [
            [
                'player_wand',
                'carried',
                'back_garden',
            ],
            [
                'old_letter',
                'stored',
                'kitchen',
            ],
            [
                'harry_spare_brass_quill',
                'carried',
                'back_garden',
            ],
        ],
    );
});

test('transition normalization drops new permanent flags from medium tier only', () => {
    const state = createCurrentPlayingState();
    state.actors = state.actors.map(actor => ({
        ...actor,
        lifeStatus: 'alive',
        lifeStatusPermanent: false,
        lifeStatusDetailEn: 'Alive.',
    }));
    const payload =
        createCurrentTransitionPackage();
    payload.nextScene.actorStates[0]
        .lifeStatusPermanent = true;

    const medium =
        normalizeSceneTransitionPackage(
            payload,
            state,
            { tier: 'medium' },
        );
    assert.equal(
        medium.nextScene.actorStates[0]
            .lifeStatusPermanent,
        false,
    );
    assert.equal(
        validateSceneTransitionPackage(
            medium,
            state,
            { tier: 'medium' },
        ).valid,
        true,
    );

    const high =
        normalizeSceneTransitionPackage(
            payload,
            state,
            { tier: 'high' },
        );
    assert.equal(
        high.nextScene.actorStates[0]
            .lifeStatusPermanent,
        true,
    );
});

test('only high-tier transitions may commit irreversible NPC death', () => {
    const state = createCurrentPlayingState();
    state.actors = state.actors.map(actor => ({
        ...actor,
        lifeStatus: 'alive',
        lifeStatusPermanent: false,
        lifeStatusDetailEn: 'Alive.',
    }));
    const payload = createCurrentTransitionPackage();
    payload.nextScene.actorStates[0] = {
        ...payload.nextScene.actorStates[0],
        present: false,
        lifeStatus: 'dead',
        lifeStatusPermanent: true,
        lifeStatusDetailEn:
            'Killed during the committed permanent consequence.',
    };
    payload.nextScene.openingSegments[1] = {
        type: 'narration',
        textEn:
            'The garden falls silent after the permanent loss.',
    };
    const mediumValidation =
        validateSceneTransitionPackage(
            payload,
            state,
            { tier: 'medium' },
        );
    assert.equal(
        mediumValidation.valid,
        false,
    );
    assert.match(
        mediumValidation.errors.join('；'),
        /高端世界导演/,
    );
    assert.equal(
        validateSceneTransitionPackage(
            payload,
            state,
            { tier: 'high' },
        ).valid,
        true,
    );
    const deadState = applySceneTransition(
        state,
        payload,
        {
            id: state.scene.id,
            status: 'closed',
        },
        { tier: 'high' },
    );
    const dead =
        deadState.actors.find(actor =>
            actor.id ===
                'minerva_mcgonagall');
    assert.equal(dead.lifeStatus, 'dead');
    assert.equal(
        dead.lifeStatusPermanent,
        true,
    );
    assert.equal(dead.present, false);

    const revival =
        createCurrentTransitionPackage();
    revival.nextScene.id =
        'illegal_revival_scene';
    revival.nextScene.actorStates[0] = {
        ...revival.nextScene.actorStates[0],
        present: true,
        lifeStatus: 'alive',
    };
    assert.match(
        validateSceneTransitionPackage(
            revival,
            deadState,
            { tier: 'high' },
        ).errors.join('；'),
        /不能恢复/,
    );
});

test('mid-tier transition director may settle reversible NPC status', () => {
    const state = createCurrentPlayingState();
    state.actors = state.actors.map(actor => ({
        ...actor,
        lifeStatus: 'alive',
        lifeStatusPermanent: false,
        lifeStatusDetailEn: 'Alive.',
    }));
    const payload = createCurrentTransitionPackage();
    payload.nextScene.actorStates[0] = {
        ...payload.nextScene.actorStates[0],
        lifeStatus: 'injured',
        lifeStatusPermanent: false,
        lifeStatusDetailEn:
            'A sprained wrist from the observed closing-scene fall.',
    };
    assert.equal(
        validateSceneTransitionPackage(
            payload,
            state,
            { tier: 'medium' },
        ).valid,
        true,
    );
    const next = applySceneTransition(
        state,
        payload,
        {
            id: state.scene.id,
            status: 'closed',
        },
        { tier: 'medium' },
    );
    const actor = next.actors.find(item =>
        item.id === 'minerva_mcgonagall');
    assert.equal(actor.lifeStatus, 'injured');
    assert.equal(
        actor.lifeStatusPermanent,
        false,
    );
    assert.equal(
        actor.lifeStatusSinceClock,
        next.clock,
    );
});
