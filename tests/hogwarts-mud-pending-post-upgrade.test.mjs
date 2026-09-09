/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createCurrentPlayingState } from './hogwarts-mud-test-fixtures.mjs';
import { createPendingPostSettlement, upgradePendingPostSettlement, migrateLegacyPendingMovementSettlement } from '../public/scripts/extensions/hogwarts-mud/domain/pending-post-settlement.js';
import { createTurnRetryCheckpoint } from '../public/scripts/extensions/hogwarts-mud/domain/turn-rollback.js';

function fixture(retryCount = 0) {
    const state = createCurrentPlayingState();
    const segments = [{ type: 'narration', textEn: 'Professor McGonagall waits by the kitchen table.' }];
    const chat = [
        { is_user: true, mes: 'I wait.', extra: { hogwartsMud: { role: 'player_turn' } } },
        { is_user: false, mes: segments[0].textEn, extra: { hogwartsMud: { role: 'scene_turn', segments } } },
    ];
    const pending = createPendingPostSettlement({
        state, playerMessageId: 0, sceneMessageId: 1,
        transactionDraft: {
            protocolVersion: 2, segments, elapsedMinutes: 15,
            publicEventEn: 'An unverified excerpt.',
            actorUpdates: [
                { id: 'minerva_mcgonagall', currentActivityEn: 'Waiting by the kitchen table.' },
                { id: 'nonexistent_actor', currentActivityEn: 'Invented.' },
            ],
            pacingBeatRealized: true,
        },
        preTurnCheckpoint: createTurnRetryCheckpoint(state, { playerMessageId: 0, assistantMessageId: 1 }),
        retryCount,
    });
    pending.version = 1;
    delete pending.recovery;
    chat[1].extra.hogwartsMud.pendingPostSettlement = pending;
    return { state, chat, pending };
}

test('V1 upgrade revalidates candidates and preserves source without writing the world', () => {
    const { state, chat, pending } = fixture();
    const before = structuredClone({ state, chat });
    const upgraded = upgradePendingPostSettlement(state, chat, pending);
    assert.equal(upgraded.version, 2);
    assert.deepEqual(upgraded.transactionDraft.segments, pending.transactionDraft.segments);
    assert.deepEqual(upgraded.transactionDraft.actorUpdates, [pending.transactionDraft.actorUpdates[0]]);
    assert.equal(upgraded.transactionDraft.publicEventEn, '');
    assert.equal(upgraded.transactionDraft.pacingBeatRealized, false);
    assert.equal(upgraded.recovery.supplement.status, 'available');
    assert.deepEqual(upgraded.recovery.accepted.observation.result.actorUpdates.map(a => a.actorId),
        ['minerva_mcgonagall']);
    assert.deepEqual({ state, chat }, before);
});

test('V1 prior retry consumes the one supplementary allowance', () => {
    const { state, chat, pending } = fixture(1);
    assert.equal(upgradePendingPostSettlement(state, chat, pending).recovery.supplement.status, 'spent');
});

test('older movement receipts cannot invent a checkpoint or reset an existing retry allowance', () => {
    const { state, chat, pending } = fixture(3);
    delete chat[1].extra.hogwartsMud.pendingPostSettlement;
    chat[1].extra.hogwartsMud.pendingTurnSettlement = {
        version: 1, transactionDraft: pending.transactionDraft, retryCount: 3,
    };
    migrateLegacyPendingMovementSettlement(state, chat);
    const migrated = chat[1].extra.hogwartsMud.pendingPostSettlement;
    assert.equal(migrated.version, 1);
    assert.equal(migrated.preTurnCheckpoint, null);
    assert.equal(migrated.retryable, false);
    assert.throws(() => upgradePendingPostSettlement(state, chat, migrated), /checkpoint/);
    migrated.preTurnCheckpoint = pending.preTurnCheckpoint;
    assert.equal(upgradePendingPostSettlement(state, chat, migrated).recovery.supplement.status, 'spent');
});

test('V1 upgrade refuses missing checkpoint, stale revision and changed source', async t => {
    for (const [name, mutate] of [
        ['checkpoint', f => { f.pending.preTurnCheckpoint = null; }],
        ['revision', f => { f.state.stateRevision = 100; }],
        ['source', f => { f.chat[1].extra.hogwartsMud.segments = [{ type: 'narration', textEn: 'Edited.' }]; }],
    ]) {
        await t.test(name, () => {
            const f = fixture();
            mutate(f);
            assert.throws(() => upgradePendingPostSettlement(f.state, f.chat, f.pending), /Legacy Post recovery/);
        });
    }
});
