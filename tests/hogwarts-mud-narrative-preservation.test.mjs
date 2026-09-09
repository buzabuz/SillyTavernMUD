import assert from 'node:assert/strict';
import test from 'node:test';
import {
    validateLowScenePerformanceOutputContract,
} from '../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';

/* eslint-disable playwright/expect-expect */

test('Scene admission preserves displayable prose independently of bookkeeping', async t => {
    const textEn = 'Lavender put the book down and looked towards the door.';
    for (const [name, result, expected] of [
        ['missing progression', { segments: [{ type: 'narration', textEn }] }, true],
        ['malformed attached proposals', {
            segments: [{ type: 'narration', textEn }],
            stateProposals: 'not a proposal array',
        }, true],
        ['empty segments', { segments: [] }, false],
        ['empty text', { segments: [{ type: 'narration', textEn: '  ' }] }, false],
    ]) {
        await t.test(name, () => {
            const before = structuredClone(result);
            const validation = validateLowScenePerformanceOutputContract(
                result,
                { requireSceneProgression: true },
            );
            assert.equal(validation.valid, expected);
            assert.deepEqual(result, before);
        });
    }
});
