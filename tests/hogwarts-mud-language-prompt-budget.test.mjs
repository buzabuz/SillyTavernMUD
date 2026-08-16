/* eslint-disable playwright/expect-expect, playwright/no-conditional-in-test */
import assert from 'node:assert/strict';
import {
    spawnSync,
} from 'node:child_process';
import path from 'node:path';
import test from 'node:test';

import {
    buildMapAuthorityContext,
} from '../public/scripts/extensions/hogwarts-mud/domain/maps.js';

const ROOT =
    path.resolve('.');
const MEASUREMENT_PATH =
    path.resolve(
        '.trae/specs/hogwarts-prompt-payload-consolidation/measure-prompts.mjs',
    );
const ACTIVE_TINA_PATH =
    path.resolve(
        'data/default-user/chats/Hogwarts_World_Director/' +
        'Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl',
    );

test(
    'active real-save build-only prompts pass every hard budget without repair prompts',
    () => {
        const result =
            spawnSync(
                process.execPath,
                [
                    MEASUREMENT_PATH,
                ],
                {
                    cwd: ROOT,
                    env: {
                        ...process.env,
                        HOGWARTS_PROMPT_MEASURE_ARCHIVE_PATH:
                            ACTIVE_TINA_PATH,
                    },
                    encoding:
                        'utf8',
                    maxBuffer:
                        32 *
                        1024 *
                        1024,
                },
            );
        assert.equal(
            result.status,
            0,
            result.stderr,
        );
        const report =
            JSON.parse(
                result.stdout,
            );
        const targets = {
            'scenePerformance':
                47_626,
            'sceneTransition':
                76_100,
            'sceneOpening':
                28_319,
            'calendar.high':
                14_358,
            'calendar.medium':
                36_893,
            'social':
                80_000,
            'mapExpansion':
                39_344,
            'hostSystemInjection':
                19_319,
        };
        for (
            const [
                key,
                target,
            ] of Object.entries(
                targets,
            )
        ) {
            const prompt =
                report.prompts[key];
            const actual =
                prompt.transportTotal
                    ?.characters ??
                prompt.messageTotal
                    ?.characters ??
                prompt.system
                    .characters;
            assert.ok(
                actual <= target,
                `${key}: ${actual} > ${target}`,
            );
        }
        assert.equal(
            report.archive
                .unchanged,
            true,
        );
        assert.equal(
            report.cutover
                .languageAuthority
                .changed,
            false,
        );
        assert.equal(
            report.cutover
                .languageAuthority
                .stats
                .timelineEntries,
            0,
        );
        assert.deepEqual(
            Object.keys(
                report.prompts,
            ).filter(key =>
                /\.repair\d+$/u
                    .test(key)),
            [],
        );
    },
);

test('Map expansion authority omits unrelated runtime material and Actor state', () => {
    const context =
        buildMapAuthorityContext(
            {
                location:
                    'Hogwarts Castle',
                map: {
                    activeMapId:
                        'hogwarts_castle',
                    currentLocalNodeId:
                        'entrance_hall',
                    currentLevelId:
                        'ground',
                    roomStates: {
                        'hogwarts_castle:entrance_hall': {
                            visibleResiduesEn: [
                                'SHOULD_NOT_ENTER_MAP_EXPANSION',
                            ],
                        },
                    },
                },
                actors: [{
                    id: 'actor_should_not_enter',
                    present: true,
                }],
            },
            {
                purpose:
                    'expansion',
            },
        );

    assert.match(
        context,
        /potions_classroom/u,
    );
    assert.doesNotMatch(
        context,
        /SHOULD_NOT_ENTER_MAP_EXPANSION/u,
    );
    assert.doesNotMatch(
        context,
        /actor_should_not_enter/u,
    );
    assert.doesNotMatch(
        context,
        /"roomStates"/u,
    );
    assert.doesNotMatch(
        context,
        /"spatial"/u,
    );
});
