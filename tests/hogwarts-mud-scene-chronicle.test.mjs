/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applySceneTransition,
} from '../public/scripts/extensions/hogwarts-mud/domain/archive-projection.js';
import {
    createDefaultCampaign,
} from '../public/scripts/extensions/hogwarts-mud/domain/campaign.js';
import {
    createDefaultCharacterDraft,
} from '../public/scripts/extensions/hogwarts-mud/domain/character.js';
import {
    createInitialWorldState,
} from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import {
    normalizeSceneTransitionPackage,
    validateSceneTransitionPackage,
} from '../public/scripts/extensions/hogwarts-mud/domain/scene-transition.js';
import {
    createSceneTransitionWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';

function createState() {
    const state =
        createInitialWorldState(
            createDefaultCharacterDraft(),
            {},
            createDefaultCampaign(),
        );
    state.phase = 'playing';
    state.clock =
        '1991-07-24 · 11:15';
    state.chapter = 'Test';
    state.location = 'Kitchen';
    state.scene = {
        id: 'scene_one',
        name: 'Kitchen',
        nameEn: 'Kitchen',
        summary: 'Test',
        summaryEn:
            'A quiet discussion is ending.',
        startedClock:
            state.clock,
        startedMessageId: 0,
        timelineEntries: [{
            clock: state.clock,
            label:
                'The discussion begins.',
        }],
        mapId: 'test_map',
        roomId: 'kitchen',
        calendarEntryIds: [],
    };
    state.map.activeMapId =
        'test_map';
    state.map.currentLocalNodeId =
        'kitchen';
    state.map.currentLevelId =
        'ground';
    state.map.customLocalMaps = [{
        id: 'test_map',
        name: 'Test',
        nameEn: 'Test',
        defaultLevelId: 'ground',
        levels: [{
            id: 'ground',
            name: 'Ground',
            nameEn: 'Ground',
            z: 0,
        }],
        nodes: [
            {
                id: 'kitchen',
                name: 'Kitchen',
                nameEn: 'Kitchen',
                levelId:
                    'ground',
            },
            {
                id: 'garden',
                name: 'Garden',
                nameEn: 'Garden',
                levelId:
                    'ground',
            },
        ],
        exits: [{
            from: 'kitchen',
            to: 'garden',
            direction: 'east',
            kind: 'door',
            minutes: 1,
        }],
    }];
    state.spatial.player = {
        mapId: 'test_map',
        roomId: 'kitchen',
    };
    return state;
}

function createPayload() {
    return {
        transitionMinutes: 5,
        nextClock:
            '1991-07-24 · 11:20',
        closureSummaryEn:
            'The discussion ends and the player leaves the kitchen.',
        globalChronicleSummaryEn:
            'The quiet kitchen scene established a simple departure after the player completed the immediate discussion. No hidden facts changed, but the move toward the garden preserved the existing schedule and left the prior room behind as the next scene began under the same ordinary morning conditions.',
        authorQuillEn:
            'This deliberately plain test passage provides enough editorial words to satisfy the transition contract while avoiding hidden facts, private motives, future revelations, or player actions absent from the scene. It remains intentionally dull because this fixture checks persistence rather than comedy, and it closes with a modest award for successfully walking through an ordinary door without inventing another plot.',
        unresolvedThreadsEn: [],
        nextScene: {
            id: 'scene_two',
            nameEn: 'Garden',
            summaryEn:
                'The next scene begins in Garden with a clear path ahead.',
            chapterEn: 'Test',
            mapId: 'test_map',
            roomId: 'garden',
            actorStates: [],
            followingSceneIntent: {
                titleEn: 'Continue',
                summaryEn:
                    'Continue in the garden.',
                triggerEn:
                    'After the player responds.',
                mapId: 'test_map',
                roomId: 'garden',
                tier: 'medium',
            },
        },
    };
}

function createArchiveEntry(
    state,
    payload,
) {
    return {
        id: state.scene.id,
        name: state.scene.name,
        nameEn:
            state.scene.nameEn,
        summary:
            state.scene.summary,
        summaryEn:
            state.scene.summaryEn,
        closureSummary:
            payload.closureSummaryEn,
        closureSummaryEn:
            payload.closureSummaryEn,
        authorQuill:
            payload.authorQuillEn,
        authorQuillEn:
            payload.authorQuillEn,
        unresolvedThreads: [],
        unresolvedThreadsEn: [],
        startedClock:
            state.scene.startedClock,
        endedClock: state.clock,
        location: state.location,
        mapId: state.scene.mapId,
        roomId: state.scene.roomId,
        activeInteractionActorIds: [],
        localOccupantActorIds: [],
        localCohortIds: [],
        events: [],
        actorIds: [],
        messageIds: [],
        timelineEntries:
            structuredClone(
                state.scene
                    .timelineEntries,
            ),
        calendarEntryIds: [],
        tier: 'medium',
        translationProvider: '',
        status: 'closed',
        closedAt:
            '2026-08-13T00:00:00.000Z',
    };
}

test('Scene Transition requires the chronicle field and discards removed parallel writers', () => {
    const state = createState();
    const payload =
        normalizeSceneTransitionPackage(
            createPayload(),
            state,
        );

    assert.equal(
        validateSceneTransitionPackage(
            payload,
            state,
        ).valid,
        true,
    );

    const missing =
        structuredClone(payload);
    delete missing
        .globalChronicleSummaryEn;
    assert.equal(
        validateSceneTransitionPackage(
            missing,
            state,
        ).valid,
        false,
    );

    for (const removedField of [
        'relationshipUpdates',
        'worldChanges',
    ]) {
        const raw =
            createPayload();
        raw[removedField] =
            removedField ===
                'relationshipUpdates'
                ? []
                : {};
        const sanitized =
            normalizeSceneTransitionPackage(
                raw,
                state,
            );
        assert.equal(
            Object.hasOwn(
                sanitized,
                removedField,
            ),
            false,
        );
        assert.equal(
            validateSceneTransitionPackage(
                sanitized,
                state,
            ).valid,
            true,
        );
    }
});

test('successful Scene Transition atomically appends one chronicle entry without transition Appraisals', () => {
    const state = createState();
    const payload =
        normalizeSceneTransitionPackage(
            createPayload(),
            state,
        );
    const archiveEntry =
        createArchiveEntry(
            state,
            payload,
        );
    const before =
        structuredClone(state);
    const next =
        applySceneTransition(
            state,
            payload,
            archiveEntry,
            {
                startedMessageId: 1,
                tier: 'medium',
            },
        );

    assert.deepEqual(state, before);
    assert.deepEqual(
        next.globalChronicle
            .entries,
        [{
            sceneId: 'scene_one',
            endedClock:
                '1991-07-24 · 11:15',
            summaryEn:
                payload
                    .globalChronicleSummaryEn,
        }],
    );
    assert.equal(
        next.sceneArchive.length,
        1,
    );
    assert.equal(
        next.sceneArchive[0]
            .timelineEntries
            .at(-1)
            .label,
        payload.closureSummaryEn,
    );
    assert.equal(
        next.memorySynapse
            .appraisals.length,
        0,
    );
    assert.equal(
        Object.hasOwn(
            next,
            'timeline',
        ),
        false,
    );
});

test('invalid chronicle output fails before source mutation', () => {
    const state = createState();
    const payload =
        createPayload();
    payload
        .globalChronicleSummaryEn =
        'Too short.';
    const normalized =
        normalizeSceneTransitionPackage(
            payload,
            state,
        );
    const before =
        structuredClone(state);

    assert.throws(
        () =>
            applySceneTransition(
                state,
                normalized,
                createArchiveEntry(
                    state,
                    normalized,
                ),
            ),
        /globalChronicleSummaryEn/u,
    );
    assert.deepEqual(state, before);
});

test('invalid Chronicle model output reports immediately without automatic retry', async () => {
    const state = createState();
    const invalid =
        createPayload();
    invalid
        .globalChronicleSummaryEn =
        'Too short.';
    let modelCalls = 0;
    const workflow =
        createSceneTransitionWorkflow({
            CANON_CAST_IDENTITY_CONTRACT:
                '',
            CANON_WIT_TONE_CONTRACT:
                '',
            buildActorContinuityCapsules:
                () => [],
            buildBehavioralEnvironment:
                () => ({}),
            buildCurrentMaterialState:
                () => ({}),
            buildMapAuthorityContext:
                () => ({}),
            buildSceneCastRotationPolicy:
                () => ({}),
            createContextBudgetPlan:
                () => ({
                    chapterMessageLimit:
                        10,
                }),
            extractRoleResponseText:
                value => value,
            formatRetrievedKnowledge:
                () => '',
            getContext:
                () => ({
                    chat: [],
                }),
            normalizeSceneTransitionPackage,
            parseJsonObject:
                value => value,
            projectActorLibraryForContext:
                () => [],
            projectNpcRuntimeActorsForPrompt:
                () => [],
            sendRoleRequest:
                async () => {
                    modelCalls++;
                    return structuredClone(
                        invalid,
                    );
                },
            validateSceneTransitionPackage,
        });

    await assert.rejects(
        () =>
            workflow
                .generateSceneTransitionPackage(
                    {},
                    state,
                    'medium',
                    '',
                    null,
                    {
                        changed: false,
                    },
                    [],
                    {
                        chapterMessageLimit:
                            10,
                    },
                ),
        /globalChronicleSummaryEn/u,
    );
    assert.equal(modelCalls, 1);
});
