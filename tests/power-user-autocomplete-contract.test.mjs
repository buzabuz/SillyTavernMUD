/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const POWER_USER_URL = new URL(
    '../public/scripts/power-user.js',
    import.meta.url,
);

async function readAutocompleteResizeCallback() {
    const source = await readFile(
        POWER_USER_URL,
        'utf8',
    );
    const start = source.indexOf(
        'const adjustAutocompleteDebounced = debounce(() => {',
    );
    const end = source.indexOf(
        '\n    const reportZoomLevelDebounced',
        start,
    );

    assert.ok(
        start >= 0,
        'autocomplete resize callback must exist',
    );
    assert.ok(
        end > start,
        'autocomplete resize callback must have a stable boundary',
    );
    return source.slice(start, end);
}

test('resize autocomplete adjustment still refreshes initialized open widgets', async () => {
    const callback =
        await readAutocompleteResizeCallback();
    const widgetCall = callback.indexOf(
        '.autocomplete(\'widget\')',
    );
    const openCheck = callback.indexOf(
        'style.display !== \'none\'',
    );
    const searchCall = callback.indexOf(
        '.autocomplete(\'search\')',
    );

    assert.ok(widgetCall >= 0);
    assert.ok(openCheck > widgetCall);
    assert.ok(searchCall > openCheck);
});

test('[defect-probing] resize autocomplete adjustment skips inputs without a widget instance', async () => {
    const callback =
        await readAutocompleteResizeCallback();
    const instanceCheck = callback.indexOf(
        '.autocomplete(\'instance\')',
    );
    const guardStart = callback.lastIndexOf(
        'if (',
        instanceCheck,
    );
    const widgetCall = callback.indexOf(
        '.autocomplete(\'widget\')',
    );
    const searchCall = callback.indexOf(
        '.autocomplete(\'search\')',
    );

    assert.ok(
        instanceCheck >= 0,
        'instance must be queried before autocomplete methods',
    );
    assert.ok(guardStart >= 0);
    assert.match(
        callback.slice(
            guardStart,
            widgetCall,
        ),
        /if\s*\([\s\S]*?\.autocomplete\('instance'\)\s*===\s*undefined\)\s*\{\s*return;\s*\}/u,
    );
    assert.ok(widgetCall > instanceCheck);
    assert.ok(searchCall > instanceCheck);
});
