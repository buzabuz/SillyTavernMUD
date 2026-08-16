/* eslint-disable playwright/expect-expect */
import {
    admitCurrentLocationResidents,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-admission.js';
import {
    normalizeCampaign,
} from '../public/scripts/extensions/hogwarts-mud/domain/campaign.js';
import {
    assertImportSize,
    detectPresetApi,
    normalizeRegexScripts,
    sanitizePresetData,
} from '../public/scripts/extensions/hogwarts-mud/domain/preset-import.js';
import {
    PRESET_LOCATION_ACTORS,
} from '../public/scripts/extensions/hogwarts-mud/map-pack.js';
import {
    createCurrentPlayingState,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('imports reject files above the configured size limit', () => {
    assert.doesNotThrow(() => assertImportSize(1024));
    assert.throws(() => assertImportSize(6 * 1024 * 1024), /5 MB/);
});

test('preset type detection recognizes standard SillyTavern shapes', () => {
    assert.equal(detectPresetApi({ prompts: [] }), 'openai');
    assert.equal(detectPresetApi({ instruct_sequence: '### Instruction' }), 'instruct');
    assert.equal(detectPresetApi({ story_string: '{{description}}' }), 'context');
    assert.equal(detectPresetApi({ temperature: 0.8 }, 'textgenerationwebui'), 'textgenerationwebui');
});

test('preset sanitization removes connection and secret-bearing fields', () => {
    const source = {
        name: 'Imported',
        temperature: 0.8,
        reverse_proxy: 'https://example.invalid',
        proxy_password: 'secret',
        custom_include_headers: 'x-test: value',
        nested: {
            api_key: 'nested-secret',
            safe: true,
        },
    };
    const { clean, removed } = sanitizePresetData(source);
    assert.equal(clean.temperature, 0.8);
    assert.equal(clean.reverse_proxy, undefined);
    assert.equal(clean.proxy_password, undefined);
    assert.equal(clean.nested.api_key, undefined);
    assert.equal(clean.nested.safe, true);
    assert.deepEqual(removed.sort(), ['custom_include_headers', 'nested.api_key', 'proxy_password', 'reverse_proxy']);
    assert.equal(source.reverse_proxy, 'https://example.invalid');
});

test('preset sanitization removes prototype-pollution keys', () => {
    const source = JSON.parse('{"name":"Safe","__proto__":{"polluted":true},"nested":{"constructor":{"prototype":{"polluted":true}}}}');
    const { clean, removed } = sanitizePresetData(source);
    assert.equal(Object.hasOwn(clean, '__proto__'), false);
    assert.equal(Object.hasOwn(clean.nested, 'constructor'), false);
    assert.deepEqual(removed.sort(), ['__proto__', 'nested.constructor']);
});

test('regex normalization accepts standard single and array formats', () => {
    let id = 0;
    const uuid = () => `id-${++id}`;
    const scripts = normalizeRegexScripts([
        { scriptName: 'Quotes', findRegex: '/foo/g', replaceString: 'bar' },
        { scriptName: 'Spacing', findRegex: '/ +/g' },
    ], uuid);

    assert.equal(scripts.length, 2);
    assert.equal(scripts[0].id, 'id-1');
    assert.equal(scripts[1].replaceString, '');
    assert.equal(scripts[1].disabled, false);
});

test('regex normalization rejects malformed files', () => {
    assert.throws(() => normalizeRegexScripts({ findRegex: '/foo/' }), /scriptName/);
    assert.throws(() => normalizeRegexScripts({ scriptName: 'Missing expression' }), /findRegex/);
});

test('campaign presets normalize locked and open school starts', () => {
    assert.deepEqual(normalizeCampaign({
        presetId: 'canon_1991',
        startYear: 2005,
        grade: 7,
        difficulty: 'harsh',
    }), {
        presetId: 'canon_1991',
        startYear: 1991,
        grade: 1,
        difficulty: 'harsh',
    });

    const open = normalizeCampaign({
        presetId: 'hogwarts_student',
        startYear: 1986,
        grade: 5,
        difficulty: 'narrative',
    });
    assert.equal(open.startYear, 1986);
    assert.equal(open.grade, 5);
});

test('entering a preset proprietor room admits its canonical resident once', () => {
    const state = createCurrentPlayingState();
    state.map.activeMapId = 'diagon_alley';
    state.map.currentLocalNodeId =
        'ollivanders';
    state.map.currentLevelId = 'street';
    state.scene.mapId = 'diagon_alley';
    state.scene.roomId = 'ollivanders';
    state.spatial = {
        version: 3,
        player: {
            mapId: 'diagon_alley',
            roomId: 'ollivanders',
        },
        lastMovement: null,
    };

    assert.equal(
        PRESET_LOCATION_ACTORS
            .garrick_ollivander
            .homeRoomId,
        'ollivanders',
    );
    const admitted =
        admitCurrentLocationResidents(
            state,
        );
    assert.deepEqual(
        admitted.admittedActorIds,
        ['garrick_ollivander'],
    );
    const profile =
        admitted.state.actorLibrary
            .find(actor =>
                actor.id ===
                    'garrick_ollivander');
    const actor =
        admitted.state.actors
            .find(item =>
                item.id ===
                    'garrick_ollivander');
    assert.equal(
        profile.cast.origin,
        'preset_resident',
    );
    assert.equal(actor.present, true);
    assert.equal(
        actor.mapId,
        'diagon_alley',
    );
    assert.equal(
        actor.roomId,
        'ollivanders',
    );
    assert.match(
        actor.currentActivityEn,
        /Emerging quietly/,
    );

    const repeated =
        admitCurrentLocationResidents(
            admitted.state,
        );
    assert.deepEqual(
        repeated.admittedActorIds,
        [],
    );
    assert.equal(
        repeated.state,
        admitted.state,
    );
    assert.equal(
        repeated.state.actorLibrary
            .filter(item =>
                item.id ===
                    'garrick_ollivander')
            .length,
        1,
    );
    assert.equal(
        repeated.state.actors
            .filter(item =>
                item.id ===
                    'garrick_ollivander')
            .length,
        1,
    );
});
