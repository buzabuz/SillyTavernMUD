/* eslint-disable playwright/expect-expect */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getSceneTimelineDisplaySummary,
} from '../public/scripts/extensions/hogwarts-mud/domain/scene-timeline-display.js';

test('Scene timeline display removes only the recognized trailing pacing metadata', () => {
    assert.equal(
        getSceneTimelineDisplaySummary(
            'Tina damaged the counter and McGonagall reprimanded her.\n  "pacingBeatRealized":true',
        ),
        'Tina damaged the counter and McGonagall reprimanded her.',
    );
    assert.equal(
        getSceneTimelineDisplaySummary(
            'The sign literally reads "status:true".',
        ),
        'The sign literally reads "status:true".',
    );
    assert.equal(
        getSceneTimelineDisplaySummary(
            'A normal summary.\n  "pacingBeatRealized":"yes"',
        ),
        'A normal summary.\n  "pacingBeatRealized":"yes"',
    );
    assert.equal(
        getSceneTimelineDisplaySummary(
            'A normal summary.\n  "pacingBeatRealized":false,\n  "other":true',
        ),
        'A normal summary.\n  "pacingBeatRealized":false,\n  "other":true',
    );
});
