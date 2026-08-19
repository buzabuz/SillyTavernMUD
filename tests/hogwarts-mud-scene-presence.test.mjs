/* eslint-disable playwright/expect-expect */
import {
    normalizeScenePerformanceActorLocations,
} from '../public/scripts/extensions/hogwarts-mud/domain/spatial-performance.js';
import {
    buildSpatialContext,
} from '../public/scripts/extensions/hogwarts-mud/domain/spatial-reconciliation.js';
import {
    validateScenePerformance,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-validation.js';
import assert from 'node:assert/strict';
import test from 'node:test';

test('an offstage actor cannot form impression or memory without a sightline', () => {
    const words = (prefix, count) => Array.from(
        { length: count },
        (_, index) => `${prefix}${index}`,
    ).join(' ');
    const state = {
        map: {
            activeMapId: 'diagon_alley',
            currentLocalNodeId: 'madam_malkins',
            generatedLocalNodes: [],
            generatedLocalExits: [],
            exitStates: {},
        },
        actors: [{
            id: 'tom_leaky_bartender',
            nameEn: 'Tom',
            present: true,
            mapId: 'diagon_alley',
            roomId: 'leaky_cauldron',
        }],
    };
    const spatial = buildSpatialContext(state)
        .actors[0];
    assert.equal(spatial.canSeePlayer, false);
    assert.equal(spatial.canHearPlayer, false);
    const payload = {
        publicEventEn:
            'Tina argues with Eddie inside Madam Malkin.',
        actorPresence: {
            presentActorIdsAfterTurn: [
                'tom_leaky_bartender',
            ],
        },
        segments: [
            {
                type: 'narration',
                textEn: words('movement', 45),
            },
            {
                type: 'narration',
                textEn: words('setting', 45),
            },
            {
                type: 'narration',
                textEn: words('reaction', 45),
            },
            {
                type: 'narration',
                textEn: words('aftermath', 45),
            },
        ],
        actorUpdates: [{
            id: 'tom_leaky_bartender',
            present: true,
            currentActivityEn:
                'Wiping a glass behind the distant bar.',
            impressionOfPlayerEn:
                'Loud, reckless, and prone to public accusations.',
            memoryUpdate: {
                summaryEn:
                    'Tina argued with Eddie inside Madam Malkin.',
                significance: 'everyday',
            },
        }],
    };
    const validation = validateScenePerformance(
        payload,
        state,
        {
            elapsedMinutes: 15,
            minimumWords: 240,
            maximumWords: 560,
        },
    );
    assert.equal(validation.valid, false);
    assert.match(
        validation.errors.join('；'),
        /不得写入.*impressionOfPlayerEn.*memoryUpdate/u,
    );
    const normalized =
        structuredClone(
            payload,
        );
    delete normalized.actorUpdates[0]
        .impressionOfPlayerEn;
    delete normalized.actorUpdates[0]
        .memoryUpdate;
    const spatiallyNormalized =
        normalizeScenePerformanceActorLocations(
            normalized,
            state,
        );
    assert.equal(
        spatiallyNormalized
            .actorUpdates[0]
            .impressionOfPlayerEn,
        undefined,
    );
    assert.equal(
        spatiallyNormalized
            .actorUpdates[0]
            .memoryUpdate,
        undefined,
    );
    assert.equal(
        spatiallyNormalized
            .actorUpdates[0]
            .currentActivityEn,
        payload.actorUpdates[0]
            .currentActivityEn,
    );
    assert.deepEqual(
        validateScenePerformance(
            spatiallyNormalized,
            state,
            {
                elapsedMinutes: 15,
                minimumWords: 240,
                maximumWords: 560,
            },
        ),
        { valid: true, errors: [] },
    );
});
