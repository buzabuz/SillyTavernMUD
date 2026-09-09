/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    readFileSync,
} from 'node:fs';
import test from 'node:test';

import {
    createSettingsProfileController,
    shouldWarnCustomEndpoint,
} from '../public/scripts/extensions/hogwarts-mud/ui/settings-profile-controller.js';

test('Custom Endpoint advisory identifies root-only and malformed values without blocking alternatives', () => {
    assert.equal(
        shouldWarnCustomEndpoint(
            'custom',
            'https://api.svips.org/',
        ),
        true,
    );
    assert.equal(
        shouldWarnCustomEndpoint(
            'custom',
            'https://api.svips.org/v1',
        ),
        false,
    );
    assert.equal(
        shouldWarnCustomEndpoint(
            'custom',
            'https://api.svips.org/v1/',
        ),
        false,
    );
    assert.equal(
        shouldWarnCustomEndpoint(
            'custom',
            'not a URL',
        ),
        true,
    );
    assert.equal(
        shouldWarnCustomEndpoint(
            'custom',
            '',
        ),
        false,
    );
    assert.equal(
        shouldWarnCustomEndpoint(
            'openai',
            'https://api.svips.org/',
        ),
        false,
    );
});

test('endpoint warning synchronizes hidden state and input emphasis', () => {
    const source = {
        value: 'custom',
    };
    const row = {
        hidden: false,
    };
    const toggles = [];
    const endpoint = {
        value: 'https://api.svips.org/',
        required: false,
        classList: {
            toggle: (
                className,
                enabled,
            ) => {
                toggles.push([
                    className,
                    enabled,
                ]);
            },
        },
    };
    const warning = {
        hidden: true,
    };
    const elements = new Map([
        [
            '#hpmud_profile_source',
            source,
        ],
        [
            '#hpmud_profile_endpoint_row',
            row,
        ],
        [
            '#hpmud_profile_endpoint',
            endpoint,
        ],
        [
            '#hpmud_profile_endpoint_warning',
            warning,
        ],
    ]);
    const controller =
        createSettingsProfileController({
            refs: {
                root: {
                    querySelector:
                        selector =>
                            elements.get(
                                selector,
                            ),
                },
            },
        });

    controller
        .syncProfileEndpointVisibility();
    assert.equal(
        endpoint.required,
        true,
    );
    assert.equal(
        warning.hidden,
        false,
    );
    assert.deepEqual(
        toggles.at(-1),
        [
            'hpmud-input-warning',
            true,
        ],
    );

    endpoint.value =
        'https://api.svips.org/v1';
    controller
        .syncProfileEndpointWarning();
    assert.equal(
        warning.hidden,
        true,
    );
    assert.deepEqual(
        toggles.at(-1),
        [
            'hpmud-input-warning',
            false,
        ],
    );

    source.value = 'openai';
    endpoint.value =
        'https://api.svips.org/';
    controller
        .syncProfileEndpointVisibility();
    assert.equal(
        row.hidden,
        true,
    );
    assert.equal(
        warning.hidden,
        true,
    );
});

test('profile editor binds live endpoint input validation and renders localized warning chrome', () => {
    const bindings = readFileSync(
        new URL(
            '../public/scripts/extensions/hogwarts-mud/ui/bindings.js',
            import.meta.url,
        ),
        'utf8',
    );
    const panel = readFileSync(
        new URL(
            '../public/scripts/extensions/hogwarts-mud/panel.html',
            import.meta.url,
        ),
        'utf8',
    );
    const styles = readFileSync(
        new URL(
            '../public/scripts/extensions/hogwarts-mud/style.css',
            import.meta.url,
        ),
        'utf8',
    );

    assert.match(
        bindings,
        /#hpmud_profile_endpoint'[\s\S]*'input',\s*syncProfileEndpointWarning/u,
    );
    assert.match(
        panel,
        /id="hpmud_profile_endpoint_warning"[^>]*role="status"[^>]*aria-live="polite"[^>]*hidden/u,
    );
    assert.match(
        styles,
        /\.hpmud-field-warning[\s\S]*color:\s*var\(--hp-danger\)/u,
    );
});
