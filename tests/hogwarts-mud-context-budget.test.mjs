/* eslint-disable playwright/expect-expect */
import {
    createContextBudgetPlan,
    DEFAULT_RESPONSE_HEADROOM,
    limitMessagesToContext,
    normalizeModelSlots,
    RESPONSE_HEADROOM_VERSION,
} from '../public/scripts/extensions/hogwarts-mud/core/context-budget.js';
import {
    selectSharedMemoriesForContext,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory.js';
import assert from 'node:assert/strict';
import test from 'node:test';

test('model slot settings migrate legacy limits to output headroom and clamp to context size', () => {
    const slots = normalizeModelSlots({
        low: {
            profileId: 'low-profile',
            maxTokens: 3000,
            contextSize: 2048,
        },
        medium: {
            presetName: 'Marina',
            regexPresetId: 'regex-1',
            contextSize: 65536,
            maxResponseLength: 4096,
        },
    });
    assert.equal(slots.low.contextSize, 32768);
    assert.equal(
        slots.low.maxResponseLength,
        DEFAULT_RESPONSE_HEADROOM,
    );
    assert.equal(
        slots.low.responseHeadroomVersion,
        RESPONSE_HEADROOM_VERSION,
    );
    assert.equal(Object.hasOwn(slots.low, 'maxTokens'), false);
    assert.equal(slots.medium.presetName, 'Marina');
    assert.equal(slots.medium.regexPresetId, 'regex-1');
    assert.equal(
        slots.medium.maxResponseLength,
        DEFAULT_RESPONSE_HEADROOM,
    );
    assert.equal(slots.high.contextSize, 120000);
    assert.equal(
        slots.high.maxResponseLength,
        DEFAULT_RESPONSE_HEADROOM,
    );
    const explicit = normalizeModelSlots({
        low: {
            maxResponseLength: 3000,
            responseHeadroomVersion:
                RESPONSE_HEADROOM_VERSION,
        },
    });
    assert.equal(
        explicit.low.maxResponseLength,
        3000,
    );
});

test('role context size limits old message content while preserving recent content', () => {
    const messages = [
        { role: 'system', content: 'S'.repeat(500) },
        { role: 'user', content: 'old-' + 'A'.repeat(30000) },
        { role: 'user', content: 'recent-action' },
    ];
    const plan = createContextBudgetPlan(
        32768,
        18576,
    );
    const limited = limitMessagesToContext(
        messages,
        32768,
        18576,
    );
    assert.ok(limited.reduce(
        (sum, message) =>
            sum + message.content.length,
        0,
    ) <= plan.maxPromptCharacters);
    assert.equal(limited.at(-1).content, 'recent-action');
    assert.notEqual(messages[1].content, limited[1].content);
});

test('adaptive context plans scale RAG and memory depth up to 120K', () => {
    const lean = createContextBudgetPlan(
        32768,
        4096,
    );
    const balanced = createContextBudgetPlan(
        65536,
        6000,
    );
    const rich = createContextBudgetPlan(
        120000,
        4096,
    );
    assert.equal(lean.mode, 'lean');
    assert.equal(lean.ragLimit, 3);
    assert.equal(lean.chapterMessageLimit, 8);
    assert.equal(balanced.mode, 'balanced');
    assert.equal(balanced.ragLimit, 6);
    assert.equal(
        balanced.chapterMessageLimit,
        16,
    );
    assert.equal(rich.mode, 'rich');
    assert.equal(rich.ragLimit, 10);
    assert.equal(rich.chapterMessageLimit, 32);
    assert.ok(rich.mandatoryReserveTokens >= 6000);

    const memories = {
        core: Array.from(
            { length: 3 },
            (_, index) => ({
                id: `core_${index}`,
                summaryEn: `Core ${index}`,
            }),
        ),
        recent: Array.from(
            { length: 6 },
            (_, index) => ({
                id: `recent_${index}`,
                summaryEn: `Recent ${index}`,
            }),
        ),
        everyday: Array.from(
            { length: 8 },
            (_, index) => ({
                id: `daily_${index}`,
                summaryEn: `Daily ${index}`,
            }),
        ),
    };
    const leanMemories =
        selectSharedMemoriesForContext(
            memories,
            lean,
        );
    const richMemories =
        selectSharedMemoriesForContext(
            memories,
            rich,
        );
    assert.deepEqual(
        Object.fromEntries(
            Object.entries(leanMemories).map(
                ([tier, items]) => [
                    tier,
                    items.length,
                ],
            ),
        ),
        { core: 3, recent: 2, everyday: 1 },
    );
    assert.deepEqual(
        Object.fromEntries(
            Object.entries(richMemories).map(
                ([tier, items]) => [
                    tier,
                    items.length,
                ],
            ),
        ),
        { core: 3, recent: 6, everyday: 8 },
    );
});
