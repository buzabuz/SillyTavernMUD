/* eslint-disable playwright/expect-expect, playwright/no-conditional-in-test */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import * as contextBudget from '../public/scripts/extensions/hogwarts-mud/core/context-budget.js';
import * as jsonRecovery from '../public/scripts/extensions/hogwarts-mud/core/json-recovery.js';
import * as campaign from '../public/scripts/extensions/hogwarts-mud/domain/campaign.js';
import * as character from '../public/scripts/extensions/hogwarts-mud/domain/character.js';
import {
    createMandatorySceneStateProjector,
} from '../public/scripts/extensions/hogwarts-mud/domain/mandatory-projection.js';
import * as presetImport from '../public/scripts/extensions/hogwarts-mud/domain/preset-import.js';
import * as translation from '../public/scripts/extensions/hogwarts-mud/domain/translation.js';
import * as helpers from '../public/scripts/extensions/hogwarts-mud/helpers.js';

const MODULE_URLS = [
    new URL(
        '../public/scripts/extensions/hogwarts-mud/core/context-budget.js',
        import.meta.url,
    ),
    new URL(
        '../public/scripts/extensions/hogwarts-mud/core/json-recovery.js',
        import.meta.url,
    ),
    new URL(
        '../public/scripts/extensions/hogwarts-mud/domain/campaign.js',
        import.meta.url,
    ),
    new URL(
        '../public/scripts/extensions/hogwarts-mud/domain/character.js',
        import.meta.url,
    ),
    new URL(
        '../public/scripts/extensions/hogwarts-mud/domain/mandatory-projection.js',
        import.meta.url,
    ),
    new URL(
        '../public/scripts/extensions/hogwarts-mud/domain/preset-import.js',
        import.meta.url,
    ),
    new URL(
        '../public/scripts/extensions/hogwarts-mud/domain/translation.js',
        import.meta.url,
    ),
];

test('Task 2 facade exports are the real module values', () => {
    const modules = [
        contextBudget,
        jsonRecovery,
        campaign,
        character,
        presetImport,
        translation,
    ];
    const factoryExports = new Set([
        'createSharedMemoryContextSelector',
    ]);
    for (const module of modules) {
        for (const [name, value] of
            Object.entries(module)) {
            if (factoryExports.has(name)) {
                continue;
            }
            assert.equal(
                helpers[name],
                value,
                `${name} must be re-exported without a compatibility copy`,
            );
        }
    }
    assert.equal(
        helpers
            .selectSharedMemoriesForContext
            .name,
        'selectSharedMemoriesForContext',
    );
    assert.equal(
        helpers
            .selectSharedMemoriesForContext
            .length,
        2,
    );
    assert.equal(
        helpers.buildMandatorySceneState.name,
        'buildMandatorySceneState',
    );
    assert.equal(
        helpers.buildMandatorySceneState.length,
        0,
    );
});

test('Task 2 modules do not import compatibility entry points', async () => {
    for (const url of MODULE_URLS) {
        const source = await readFile(
            url,
            'utf8',
        );
        assert.doesNotMatch(
            source,
            /(?:from|import\s*\()\s*['"][^'"]*(?:helpers|index)\.js['"]/u,
            url.pathname,
        );
        assert.ok(
            source.split('\n').length < 2000,
            `${url.pathname} exceeds the module limit`,
        );
    }
});

test('context budget preserves defaults, field order, and memory selection', () => {
    assert.deepEqual(
        Object.keys(
            contextBudget.DEFAULT_MODEL_SLOTS.low,
        ),
        [
            'profileId',
            'presetName',
            'regexPresetId',
            'contextSize',
            'maxResponseLength',
            'responseHeadroomVersion',
        ],
    );
    assert.deepEqual(
        Object.keys(
            contextBudget
                .createContextBudgetPlan(
                    undefined,
                    undefined,
                ),
        ),
        [
            'mode',
            'label',
            'ragLimit',
            'recentMessageLimit',
            'chapterMessageLimit',
            'memoryLimits',
            'contextSize',
            'maxResponseLength',
            'inputBudget',
            'mandatoryReserveTokens',
            'roleBudgetTokens',
            'maxPromptCharacters',
        ],
    );
    const select =
        contextBudget
            .createSharedMemoryContextSelector(
                value => value,
            );
    assert.deepEqual(
        select(
            {
                core: ['core-1'],
                recent: [
                    'recent-1',
                    'recent-2',
                ],
                everyday: ['everyday-1'],
            },
            {
                memoryLimits: {
                    core: 1,
                    recent: 1,
                    everyday: 0,
                },
            },
        ),
        {
            core: ['core-1'],
            recent: ['recent-2'],
            everyday: [],
        },
    );
});

test('context limiting preserves authoritative player input inside structured prompts', () => {
    const playerAction =
        'Practice for ten minutes, then whisper a question to Lavender.';
    const playerTurnSequence = [{
        type:
            'action',
        lineIndex:
            0,
        text:
            'Practice for ten minutes.',
    }, {
        type:
            'direct_speech',
        lineIndex:
            1,
        speechOrder:
            0,
        targetActorId:
            'canon_lavender_brown',
        text:
            'Ask Lavender a private question.',
    }];
    const limited =
        contextBudget
            .limitMessagesToContext(
                [{
                    role:
                        'system',
                    content:
                        'Preserve the authoritative player turn.',
                }, {
                    role:
                        'user',
                    content:
                        JSON.stringify({
                            playerAction,
                            playerTurnSequence,
                            addressing: {
                                mode:
                                    'direct',
                                actorIds: [
                                    'canon_lavender_brown',
                                ],
                            },
                            elapsedMinutes:
                                15,
                            retrievedLocalKnowledge: [{
                                text:
                                    'optional '.repeat(
                                        10_000,
                                    ),
                            }],
                        }),
                }],
                32_768,
                18_576,
            );
    const parsed =
        JSON.parse(
            limited[1].content,
        );

    assert.equal(
        parsed.playerAction,
        playerAction,
    );
    assert.deepEqual(
        parsed.playerTurnSequence,
        playerTurnSequence,
    );
    assert.deepEqual(
        parsed.addressing.actorIds,
        [
            'canon_lavender_brown',
        ],
    );
    assert.equal(
        parsed.elapsedMinutes,
        15,
    );
    assert.equal(
        parsed.retrievedLocalKnowledge,
        undefined,
    );
    assert.ok(
        parsed.contextOmittedFields
            .includes(
                'retrievedLocalKnowledge',
            ),
    );
});

test('v1 ceiling-sized response headroom migrates without overriding explicit v2 choices', () => {
    const contextSize =
        120_000;
    const legacyCeiling =
        contextSize -
        contextBudget
            .MANDATORY_CONTEXT_RESERVE -
        contextBudget
            .ROLE_CONTEXT_RESERVE;
    const migrated =
        contextBudget
            .normalizeModelSlots({
                low: {
                    contextSize,
                    maxResponseLength:
                        legacyCeiling,
                    responseHeadroomVersion:
                        1,
                },
            });
    const explicit =
        contextBudget
            .normalizeModelSlots({
                low: {
                    contextSize,
                    maxResponseLength:
                        legacyCeiling,
                    responseHeadroomVersion:
                        contextBudget
                            .RESPONSE_HEADROOM_VERSION,
                },
            });

    assert.equal(
        migrated.low
            .maxResponseLength,
        contextBudget
            .DEFAULT_RESPONSE_HEADROOM,
    );
    assert.equal(
        migrated.low
            .responseHeadroomVersion,
        2,
    );
    assert.equal(
        explicit.low
            .maxResponseLength,
        legacyCeiling,
    );
});

test('JSON recovery preserves successful and truncated-root contracts', () => {
    assert.deepEqual(
        jsonRecovery.parseCompleteJsonObject(
            'prefix {"ok":true} suffix',
        ),
        { ok: true },
    );
    assert.throws(
        () =>
            jsonRecovery
                .parseCompleteJsonObject(
                    '{"outer":{"open":true}',
                ),
        {
            name: 'SyntaxError',
            message:
                'Structured JSON response ended before the root object closed.',
        },
    );
    assert.deepEqual(
        jsonRecovery
            .extractStreamingSceneSegments(
                '{"segments":[{"type":"narration","textEn":"Complete."},{"type":"narration","textEn":"Partial',
            ),
        [
            {
                type: 'narration',
                textEn: 'Complete.',
                partial: false,
            },
            {
                type: 'narration',
                textEn: 'Partial',
                partial: true,
            },
        ],
    );
});

test('Campaign and Character defaults retain exact key order and errors', () => {
    assert.deepEqual(
        Object.keys(
            campaign.createDefaultCampaign(),
        ),
        [
            'presetId',
            'startYear',
            'grade',
            'difficulty',
        ],
    );
    assert.deepEqual(
        Object.keys(
            campaign.normalizeCampaign(),
        ),
        [
            'presetId',
            'startYear',
            'grade',
            'difficulty',
        ],
    );
    const draft =
        character.createDefaultCharacterDraft();
    assert.deepEqual(
        Object.keys(draft),
        [
            'identity',
            'background',
            'aptitudes',
            'attributes',
            'storyPreferences',
            'polishedBackground',
            'confirmed',
        ],
    );
    assert.deepEqual(
        character.validateCharacterDraft(draft),
        [
            '请填写角色姓名。',
            '请填写监护人或家庭关系。',
            '请填写角色最想得到的事物。',
            '请填写角色最害怕的事物。',
        ],
    );
});

test('mandatory projection preserves dependency use and top-level field order', () => {
    const materialState = {
        mapId: 'hogwarts_castle',
        roomId:
            'charms_classroom',
        roomEffects: [{
            id: 'floating_dust',
            type: 'scene_soiled',
            operation: 'soil',
            actorId: '',
            objectTextEn: 'dust',
            targetTextEn:
                'classroom',
            resultTextEn:
                'floating dust',
            persistence:
                'until_changed',
            committedClock:
                '1991-09-01 · 10:00',
            sourceTextEn:
                'duplicate source',
        }],
        actorPresentations: {},
    };
    const project =
        createMandatorySceneStateProjector({
            buildBehavioralEnvironment:
                state => ({
                    clock: state.clock,
                }),
            buildCurrentMaterialState:
                () => materialState,
            getActorKnownRumors:
                () => [],
            normalizeActorMemoryProfile:
                () => ({
                    knowledgeEn: [],
                }),
        });
    const projected = project({
        clock: '1991-09-01 · 10:00',
        chapter: 'Charms',
        location: 'Charms classroom',
        actors: [],
        actorLibrary: [],
        map: {
            activeMapId:
                'hogwarts_castle',
            currentLocalNodeId:
                'charms_classroom',
        },
    });
    assert.deepEqual(
        Object.keys(projected),
        [
            'clock',
            'chapter',
            'location',
            'scene',
            'playerPosition',
            'currentMaterialState',
            'actorCards',
            'behavioralEnvironment',
            'pacingDirective',
            'publicConflict',
            'discoveredClues',
            'currentItems',
            'knownSpells',
        ],
    );
    assert.deepEqual(
        projected.currentMaterialState,
        {
            mapId:
                'hogwarts_castle',
            roomId:
                'charms_classroom',
            roomEffects: [{
                id: 'floating_dust',
                type: 'scene_soiled',
                operation: 'soil',
                actorId: '',
                objectTextEn: 'dust',
                targetTextEn:
                    'classroom',
                resultTextEn:
                    'floating dust',
                persistence:
                    'until_changed',
                committedClock:
                    '1991-09-01 · 10:00',
            }],
            actorPresentations: {},
        },
    );
    assert.equal(
        Object.hasOwn(
            projected
                .playerPosition,
            'materialEffects',
        ),
        false,
    );
});

test('translation and preset import retain defaults and exact failures', () => {
    assert.deepEqual(
        translation.splitTranslationChunks(''),
        [],
    );
    assert.equal(
        translation
            .normalizeTranslationProvider(
                'unknown',
            ),
        'local',
    );
    assert.equal(
        translation
            .shouldTranslateToChinese(
                'The owl delivered a letter.',
            ),
        true,
    );
    assert.throws(
        () =>
            presetImport.assertImportSize(
                6 * 1024 * 1024,
            ),
        {
            name: 'Error',
            message:
                'Import file exceeds the 5 MB limit.',
        },
    );
    assert.throws(
        () =>
            presetImport.sanitizePresetData(
                [],
            ),
        {
            name: 'Error',
            message:
                'Preset must be a JSON object.',
        },
    );
    assert.throws(
        () =>
            presetImport.normalizeRegexScripts(
                {
                    findRegex: '/foo/',
                },
            ),
        {
            name: 'Error',
            message:
                'Regex entry 1 has no scriptName.',
        },
    );
});
