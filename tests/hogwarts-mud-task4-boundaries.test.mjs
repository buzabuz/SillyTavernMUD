/* eslint-disable playwright/expect-expect, playwright/no-conditional-in-test */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import * as archiveProjection from '../public/scripts/extensions/hogwarts-mud/domain/archive-projection.js';
import * as checks from '../public/scripts/extensions/hogwarts-mud/domain/checks.js';
import * as initialWorld from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import * as interiorMap from '../public/scripts/extensions/hogwarts-mud/domain/interior-map.js';
import * as maps from '../public/scripts/extensions/hogwarts-mud/domain/maps.js';
import * as movement from '../public/scripts/extensions/hogwarts-mud/domain/movement.js';
import * as pacingReducer from '../public/scripts/extensions/hogwarts-mud/domain/pacing-reducer.js';
import * as pacingSignals from '../public/scripts/extensions/hogwarts-mud/domain/pacing-signals.js';
import * as pacingValidation from '../public/scripts/extensions/hogwarts-mud/domain/pacing-validation.js';
import * as pathfinding from '../public/scripts/extensions/hogwarts-mud/domain/pathfinding.js';
import * as sceneDestination from '../public/scripts/extensions/hogwarts-mud/domain/scene-destination.js';
import * as sceneTransition from '../public/scripts/extensions/hogwarts-mud/domain/scene-transition.js';
import * as spatialReconciliation from '../public/scripts/extensions/hogwarts-mud/domain/spatial-reconciliation.js';
import * as timeEnvironment from '../public/scripts/extensions/hogwarts-mud/domain/time-environment.js';
import * as turnProtocol from '../public/scripts/extensions/hogwarts-mud/domain/turn-protocol.js';
import * as turnReducer from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import * as turnRollback from '../public/scripts/extensions/hogwarts-mud/domain/turn-rollback.js';
import * as turnTime from '../public/scripts/extensions/hogwarts-mud/domain/turn-time.js';
import * as turnValidation from '../public/scripts/extensions/hogwarts-mud/domain/turn-validation.js';
import * as helpers from '../public/scripts/extensions/hogwarts-mud/helpers.js';

const DOMAIN_ROOT = new URL(
    '../public/scripts/extensions/hogwarts-mud/domain/',
    import.meta.url,
);
const HELPERS_URL = new URL(
    '../public/scripts/extensions/hogwarts-mud/helpers.js',
    import.meta.url,
);
const TURN_GRAPH_URL = new URL(
    '../src/hogwarts-mud/turn-settlement-graph.js',
    import.meta.url,
);
const TASK4_MODULE_NAMES = [
    'actor-admission',
    'archive-projection',
    'causal-collapse',
    'checks',
    'initial-world',
    'interior-map',
    'maps',
    'movement',
    'pacing-reducer',
    'pacing-signals',
    'pacing-validation',
    'pathfinding',
    'scene-destination',
    'scene-transition',
    'spatial-foundation',
    'spatial-performance',
    'spatial-reconciliation',
    'time-environment',
    'turn-authority',
    'turn-protocol',
    'turn-reducer',
    'turn-rollback',
    'turn-time',
    'turn-validation',
];
const PUBLIC_MODULES = [
    archiveProjection,
    checks,
    initialWorld,
    interiorMap,
    maps,
    movement,
    pacingReducer,
    pacingSignals,
    pacingValidation,
    pathfinding,
    sceneDestination,
    sceneTransition,
    spatialReconciliation,
    timeEnvironment,
    turnProtocol,
    turnReducer,
    turnRollback,
    turnTime,
    turnValidation,
];
const INTERNAL_EXPORTS = new Set([
    'EXPLICIT_MOVEMENT_DIRECTIVE_PATTERN',
    'GUIDED_MOVEMENT_ACTION_PATTERN',
    'LOCALIZED_TEMPORARY_ACTOR_KEYS',
    'MAGIC_ACTION_PATTERN',
    'MOVEMENT_ACTION_PATTERN',
    'OPENING_ID_PATTERN',
    'PACING_TEMPORARY_ACTOR_KEYS',
    'SPATIAL_INFERENCE_STOPWORDS',
    'WORLD_CLOCK_PATTERN',
    'applyItemUpdates',
    'appendSettlementWarning',
    'compactNarrativeEventText',
    'deriveNarrativePublicEvent',
    'enterInteriorMap',
    'findCheckTargetActor',
    'findExplicitRoomReference',
    'formatSceneLocationId',
    'getActorIdSet',
    'getCheckOutcome',
    'getClosingSceneWitnessIds',
    'getCoreCastOverlap',
    'getEnvironmentPeriod',
    'getExplicitMovementCompanionIds',
    'getGossipKnownActorIds',
    'getMapExits',
    'getSceneMapDefinitions',
    'isRoutePassable',
    'mergeActorUpdate',
    'normalizeCheckText',
    'normalizeSpatialText',
    'playerActionMentionsItem',
    'roomReferencesRoom',
    'sanitizeNarrativeActorUpdates',
    'sanitizeNarrativeItemsAndClues',
    'sanitizeNarrativeTemporaryActors',
    'secureRandomInt',
    'stableEnvironmentHash',
    'validateActorPresenceResolution',
    'validateItemUpdates',
    'validateTemporaryActorEntrances',
    'worldClockToEpochMinutes',
]);

test('Task 4 facade exports use the real rule, turn, transition, and spatial values', () => {
    for (const module of PUBLIC_MODULES) {
        for (const [name, value] of Object.entries(module)) {
            if (INTERNAL_EXPORTS.has(name)) {
                continue;
            }
            assert.equal(
                helpers[name],
                value,
                `${name} must be re-exported without a compatibility copy`,
            );
        }
    }
});

test('Task 4 modules obey facade, dependency, and size boundaries', async () => {
    for (const name of TASK4_MODULE_NAMES) {
        const source = await readFile(
            new URL(`${name}.js`, DOMAIN_ROOT),
            'utf8',
        );
        assert.ok(
            source.split('\n').length < 2000,
            `${name}.js exceeds the hard module limit`,
        );
        assert.doesNotMatch(
            source,
            /(?:from|import\s*\()\s*['"][^'"]*(?:helpers|index)\.js['"]/u,
            `${name}.js imports a compatibility entry point`,
        );
    }
});

test('helpers is a small declaration-only compatibility facade', async () => {
    const source = await readFile(HELPERS_URL, 'utf8');
    assert.ok(source.split('\n').length <= 350);
    assert.doesNotMatch(
        source,
        /\b(?:function|class)\s+[A-Za-z_$]/u,
    );
    assert.doesNotMatch(
        source,
        /\b(?:fetch|document|window|saveMetadataDebounced)\b/u,
    );
    assert.match(
        source,
        /from\s+['"]\.\/domain\/turn-protocol\.js['"]/u,
    );
    assert.match(
        source,
        /from\s+['"]\.\/domain\/spatial-reconciliation\.js['"]/u,
    );
});

test('server turn settlement graph imports the real turn protocol module', async () => {
    const source = await readFile(
        TURN_GRAPH_URL,
        'utf8',
    );
    assert.match(
        source,
        /from\s+['"][^'"]*\/domain\/turn-protocol\.js['"]/u,
    );
    assert.doesNotMatch(
        source,
        /from\s+['"][^'"]*\/helpers\.js['"]/u,
    );
});

test('Task 4 keeps time defaults, path order, and rollback errors stable', () => {
    assert.equal(
        timeEnvironment.advanceWorldClock(
            '1991-09-01 · 10:45',
            15,
        ),
        '1991-09-01 · 11:00',
    );
    assert.deepEqual(
        Object.keys(
            turnTime.createTurnPerformanceBudget(
                'wait',
            ),
        ),
        [
            'elapsedMinutes',
            'minimumWords',
            'maximumWords',
        ],
    );
    assert.throws(
        () =>
            turnRollback.restoreTurnRetryCheckpoint(
                null,
            ),
        {
            name: 'Error',
            message:
                '上一回合缺少可用的状态检查点。',
        },
    );
});
