/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
    fileURLToPath,
} from 'node:url';

const TEST_DIR = path.dirname(
    fileURLToPath(import.meta.url),
);
const CLIENT_ROOT = path.join(
    TEST_DIR,
    '..',
    'public',
    'scripts',
    'extensions',
    'hogwarts-mud',
);

const [
    mapRendererSource,
    styleSource,
] = await Promise.all([
    fs.readFile(
        path.join(
            CLIENT_ROOT,
            'ui',
            'map-renderer.js',
        ),
        'utf8',
    ),
    fs.readFile(
        path.join(
            CLIENT_ROOT,
            'style.css',
        ),
        'utf8',
    ),
]);

function getFinalMobileRules() {
    const start =
        styleSource.lastIndexOf(
            '@media (max-width: 760px)',
        );
    assert.notEqual(
        start,
        -1,
        'mobile layout rules must exist',
    );
    const end =
        styleSource.indexOf(
            '\n}\n\n/* People panel',
            start,
        );
    assert.notEqual(
        end,
        -1,
        'mobile layout rules must have a stable boundary',
    );
    return styleSource.slice(
        start,
        end + 2,
    );
}

test(
    'desktop workspace retains the scene, story, and inspector columns',
    () => {
        assert.match(
            styleSource,
            /\.hpmud-workspace \{[\s\S]*?grid-template-columns: 216px minmax\(620px, 1fr\) 276px;/u,
        );
        assert.match(
            styleSource,
            /\.hpmud-story-column \{[\s\S]*?grid-template-rows: minmax\(0, 1fr\) auto;/u,
        );
    },
);

test(
    'mini-map expansion opens the inspector before rendering the map tab',
    () => {
        assert.match(
            mapRendererSource,
            /function openMapInspector\(\) \{[\s\S]*?root\.classList\.add\(\s*'hpmud-inspector-open',?\s*\);[\s\S]*?#hpmud_character[\s\S]*?aria-expanded[\s\S]*?'true'[\s\S]*?renderInspector\('map'\);[\s\S]*?\}/u,
        );
        assert.match(
            mapRendererSource,
            /button\.addEventListener\(\s*'click',\s*openMapInspector,\s*\);/u,
        );
    },
);

test(
    'mobile workspace keeps the story column full-height and overlays the scene panel',
    () => {
        const mobileRules =
            getFinalMobileRules();
        assert.match(
            mobileRules,
            /\.hpmud-workspace,[\s\S]*?grid-template-rows: minmax\(0, 1fr\);[\s\S]*?position: relative;/u,
        );
        assert.match(
            mobileRules,
            /\.hpmud-scene-panel \{[\s\S]*?position: absolute;[\s\S]*?opacity: 0;[\s\S]*?pointer-events: none;/u,
        );
        assert.match(
            mobileRules,
            /\.hpmud-app\.scene-open \.hpmud-scene-panel \{[\s\S]*?opacity: 1;[\s\S]*?pointer-events: auto;/u,
        );
    },
);

test(
    'mobile composer tool groups do not inherit desktop flex-basis heights',
    () => {
        const mobileRules =
            getFinalMobileRules();
        assert.match(
            mobileRules,
            /\.hpmud-expression-tools,[\s\S]*?\.hpmud-turn-actions \{[\s\S]*?flex: 0 0 auto;/u,
        );
    },
);
