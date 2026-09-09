import assert from 'node:assert/strict';
import test from 'node:test';
/* global globalThis */
import { createCurrentPlayingState } from './hogwarts-mud-test-fixtures.mjs';
import { createTurnWorkflow } from '../public/scripts/extensions/hogwarts-mud/workflows/turn.js';
import { applyTurnTransaction } from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import { validateTurnTransaction } from '../public/scripts/extensions/hogwarts-mud/domain/turn-validation.js';
import { createGuardedSavePorts } from '../public/scripts/extensions/hogwarts-mud/runtime/guarded-save-ports.js';
import { createSaveRevisionGuard } from '../public/scripts/extensions/hogwarts-mud/runtime/save-revision-guard.js';
import { createPendingPostSettlement } from '../public/scripts/extensions/hogwarts-mud/domain/pending-post-settlement.js';
import { createPostRecovery, emptyPostObservation } from '../public/scripts/extensions/hogwarts-mud/domain/post-recovery.js';
import { preserveSceneNarrative } from '../public/scripts/extensions/hogwarts-mud/domain/narrative-preservation.js';
import { createTurnRetryCheckpoint } from '../public/scripts/extensions/hogwarts-mud/domain/turn-rollback.js';
import { createTurnController } from '../public/scripts/extensions/hogwarts-mud/ui/turn-controller.js';

/* eslint-disable playwright/expect-expect */
function storage() {
    const values = new Map();
    return {
        get length() { return values.size; },
        key: index => [...values.keys()][index] ?? null,
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key),
    };
}

async function harness({ failure = false, reservationFailure = false, movement = null } = {}) {
    const state = createCurrentPlayingState();
    const prose = '  Professor McGonagall sets her book on the kitchen table.\n';
    const performance = preserveSceneNarrative({ segments: [{ type: 'narration', textEn: prose }] });
    const transaction = {
        ...performance, narrativeFirst: true, elapsedMinutes: 15, instantaneousMagic: false,
        movementPreflight: movement,
    };
    const observation = emptyPostObservation(transaction);
    observation.observation.diagnostics.familyRejections = [{
        family: 'sceneProgression', disposition: 'discard_family', reasonCode: 'missing_family',
    }];
    const context = {
        chatId: 'narrative-recovery-integration',
        chatMetadata: { hogwartsMud: state },
        chat: [
            { is_user: true, mes: 'I watch quietly.', extra: { hogwartsMud: { role: 'player_turn' } } },
            { is_user: false, mes: prose, extra: { hogwartsMud: {
                role: 'scene_turn', segments: performance.segments,
            } } },
        ],
        async saveMetadata() { return { durable: true }; },
    };
    let durable;
    let failWrites = failure;
    // Save snapshots exclude host callback functions.
    context.saveChat = async () => {
        if (failWrites && context.chat[1].extra.hogwartsMud.turnTransaction) throw new Error('host write failed');
        if (reservationFailure && context.chat[1].extra.hogwartsMud.pendingPostSettlement
            ?.recovery.supplement.status === 'reserved') throw new Error('reservation write failed');
        durable = structuredClone({ chat: context.chat, state: context.chatMetadata.hogwartsMud });
        return { durable: true };
    };
    const ports = createGuardedSavePorts({
        getContext: () => context,
        guard: createSaveRevisionGuard({ storage: storage(), lockManager: null }),
        readPersistedTimeline: async () => [{ chat_metadata: { hogwartsMud: durable.state } }, ...durable.chat],
    });
    await ports.registerSaveRevisionHead(context, { persistMigration: false });
    const current = context.chatMetadata.hogwartsMud;
    const checkpoint = createTurnRetryCheckpoint(current, {
        playerMessageId: 0, assistantMessageId: 1, playerAction: context.chat[0].mes,
    });
    const nextChat = structuredClone(context.chat);
    const nextState = structuredClone(current);
    nextState.turn.status = 'post_unsettled';
    nextChat[1].extra.hogwartsMud.pendingPostSettlement = createPendingPostSettlement({
        state: { ...nextState, stateRevision: current.stateRevision + 1 },
        playerMessageId: 0, sceneMessageId: 1, transactionDraft: transaction,
        preTurnCheckpoint: checkpoint, movementPreflight: movement,
        failureCode: 'post_fields_pending', recovery: createPostRecovery(observation, transaction),
    });
    await ports.guardedRewriteTimeline({
        currentState: current, nextState, currentChat: structuredClone(context.chat), nextChat,
        source: 'turn_post_pending', changedDomains: ['turn'],
    });
    let calls = 0;
    let finish;
    const makeWorkflow = () => createTurnWorkflow({
        ...ports, getContext: () => context, getMudState: () => context.chatMetadata.hogwartsMud,
        jobRegistry: { turnActive: false, sceneTransitionActive: false, turnSettlement: new Map() },
        applyTurnTransaction, validateTurnTransaction,
        applyPresenceWitnessTransaction: value => value,
        composeSceneSegments: segments => segments.map(s => s.textEn || s.rawText).join('\n'),
        partitionItemProposals: () => ({ operations: [], candidates: [] }),
        extractSpellCandidates: () => [],
        applyObservedActorUpdates: () => {},
        reconcileTurnActorPresenceWithSpatialState: value => value,
        reduceLocalPresence: () => ({ occupantActorIds: [], cohortIds: [] }),
        resolveEventWitnesses: () => null,
        buildLocalSemanticRoomContext: () => ({ rooms: [] }),
        consumePacingBeat: () => { throw new Error('Unrealized beat consumed'); },
        applySystemPrompt() {}, renderAll() {}, updateNativeMessageBlock() {},
        requestPostTurnSemanticObservation: async (_state, _action, tx, options) => {
            await options.beforeDispatch();
            calls++;
            await new Promise(resolve => { finish = resolve; });
            return emptyPostObservation(tx);
        },
    });
    const workflow = makeWorkflow();
    return { context, workflow, prose, transaction, savePorts: ports, get calls() { return calls; },
        resumeWrites: () => { failWrites = false; },
        makeWorkflow, release: () => finish?.(), get durable() { return durable; } };
}

test('defaults commit through real Reducer and guarded host save without regenerating prose', async () => {
    const h = await harness();
    const before = h.context.chatMetadata.hogwartsMud;
    const result = await h.workflow.retryPendingPostSettlement({ defaults: true });
    assert.equal(result.settled, true);
    assert.equal(h.calls, 0);
    assert.equal(h.durable.state.turn.count, before.turn.count + 1);
    assert.equal(h.durable.state.turn.status, 'idle');
    assert.equal(h.durable.chat[1].extra.hogwartsMud.segments[0].textEn, h.prose);
    assert.equal(h.durable.chat[1].extra.hogwartsMud.pendingPostSettlement, undefined);
    assert.equal(h.durable.chat[1].extra.hogwartsMud.turnTransaction.publicEventEn, '');
    assert.equal(h.durable.state.scene.timelineEntries.length, before.scene.timelineEntries.length);
});

test('a durable reservation prevents duplicate supplement while the first call is pending', async () => {
    const h = await harness();
    const request = h.workflow.retryPendingPostSettlement({ selectedGroupIds: ['sceneProgression'] });
    for (let index = 0; index < 10 && h.calls === 0; index++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(h.calls, 1);
    assert.equal(h.durable.chat[1].extra.hogwartsMud.pendingPostSettlement.recovery.supplement.status, 'reserved');
    await assert.rejects(() => h.workflow.retryPendingPostSettlement(), /still settling/);
    h.release();
    assert.equal((await request).settled, true);
    assert.equal(h.calls, 1);
});

test('host commit rollback retains saved prose and an uncommitted recovery receipt', async () => {
    const h = await harness({ failure: true });
    const count = h.context.chatMetadata.hogwartsMud.turn.count;
    await assert.rejects(() => h.workflow.retryPendingPostSettlement({ defaults: true }), /host write failed/);
    assert.equal(h.context.chatMetadata.hogwartsMud.turn.count, count);
    assert.equal(h.context.chatMetadata.hogwartsMud.turn.status, 'post_unsettled');
    assert.equal(h.context.chat[1].extra.hogwartsMud.segments[0].textEn, h.prose);
    assert.equal(h.context.chat[1].extra.hogwartsMud.turnTransaction, undefined);
    assert.equal(h.context.chat[1].extra.hogwartsMud.pendingPostSettlement.recovery.supplement.status, 'available');
    assert.equal(h.durable.chat[1].extra.hogwartsMud.turnTransaction, undefined);
});

test('building a committed message leaves the live recovery message untouched', async () => {
    const h = await harness();
    const original = structuredClone(h.context.chat[1]);
    const message = h.workflow.buildSceneMessage(h.transaction, h.context.chatMetadata.hogwartsMud, h.context.chat[1]);
    assert.deepEqual(h.context.chat[1], original);
    assert.equal(message.extra.hogwartsMud.pendingPostSettlement, undefined);
    assert.equal(message.extra.hogwartsMud.turnTransaction, h.transaction);
});

test('reservation persistence failure dispatches nothing and retains the previous receipt', async () => {
    const h = await harness({ reservationFailure: true });
    await assert.rejects(() => h.workflow.retryPendingPostSettlement(), /reservation write failed/);
    assert.equal(h.calls, 0);
    assert.equal(h.durable.chat[1].extra.hogwartsMud.pendingPostSettlement.recovery.supplement.status, 'available');
    assert.equal(h.context.chat[1].extra.hogwartsMud.pendingPostSettlement.recovery.supplement.status, 'available');
});

test('a refreshed workflow cannot reuse a durable reserved attempt', async () => {
    const h = await harness();
    const request = h.workflow.retryPendingPostSettlement();
    for (let index = 0; index < 10 && h.calls === 0; index++) await new Promise(resolve => setTimeout(resolve, 5));
    try {
        const refreshed = h.makeWorkflow();
        await assert.rejects(() => refreshed.retryPendingPostSettlement(), /already used/);
    } finally {
        h.release();
        await request;
    }
    assert.equal(h.calls, 1);
});

test('changed saved prose rejects recovery before dispatch', async () => {
    const h = await harness();
    h.context.chat[1].extra.hogwartsMud.segments[0].textEn = 'The saved source was edited.';
    await assert.rejects(() => h.workflow.retryPendingPostSettlement({ defaults: true }), /narrative changed/i);
    assert.equal(h.calls, 0);
    assert.equal(h.context.chat[1].extra.hogwartsMud.turnTransaction, undefined);
});

test('changed saved prose while a supplement is pending cannot be overwritten at commit', async () => {
    const h = await harness();
    const beforeCount = h.context.chatMetadata.hogwartsMud.turn.count;
    const request = h.workflow.retryPendingPostSettlement();
    for (let index = 0; index < 10 && h.calls === 0; index++) await new Promise(resolve => setTimeout(resolve, 5));
    h.context.chat[1].extra.hogwartsMud.segments[0].textEn = 'The saved source was edited.';
    h.release();
    await assert.rejects(() => request, /narrative changed/i);
    assert.equal(h.context.chatMetadata.hogwartsMud.turn.count, beforeCount);
    assert.equal(h.context.chat[1].extra.hogwartsMud.segments[0].textEn, 'The saved source was edited.');
    assert.equal(h.context.chat[1].extra.hogwartsMud.turnTransaction, undefined);
});

test('a world revision race cannot rebase the stale receipt and enable later defaults', async () => {
    const h = await harness();
    const request = h.workflow.retryPendingPostSettlement();
    for (let index = 0; index < 10 && h.calls === 0; index++) await new Promise(resolve => setTimeout(resolve, 5));
    const pendingRevision = h.context.chat[1].extra.hogwartsMud.pendingPostSettlement.stateRevision;
    const currentState = structuredClone(h.context.chatMetadata.hogwartsMud);
    const nextState = structuredClone(currentState);
    nextState.actors[0].currentActivityEn = 'An independently committed change.';
    await h.savePorts.guardedRewriteTimeline({
        currentState, nextState, currentChat: structuredClone(h.context.chat),
        nextChat: structuredClone(h.context.chat), source: 'actor_independent_update', changedDomains: ['actors'],
    });
    h.release();
    await assert.rejects(() => request, /State changed/);
    assert.equal(h.context.chat[1].extra.hogwartsMud.pendingPostSettlement.stateRevision, pendingRevision);
    await assert.rejects(() => h.workflow.retryPendingPostSettlement({ defaults: true }), /can no longer be settled/);
    assert.equal(h.context.chatMetadata.hogwartsMud.actors[0].currentActivityEn, 'An independently committed change.');
});

test('uncertain host failure permits storage-only recovery only after verifying the persisted base', async () => {
    const h = await harness({ failure: true });
    const state = structuredClone(h.context.chatMetadata.hogwartsMud);
    const chat = structuredClone(h.context.chat);
    await assert.rejects(() => h.workflow.retryPendingPostSettlement({ defaults: true }), /host write failed/);
    assert.equal(await h.savePorts.recoverFailedPostPreservation(state, chat), true);
    h.resumeWrites();
    assert.equal((await h.workflow.retryPendingPostSettlement({ defaults: true })).settled, true);
    assert.equal(h.calls, 0);
});

test('uncertain host failure cannot recover against a different disk revision', async () => {
    const h = await harness({ failure: true });
    const state = structuredClone(h.context.chatMetadata.hogwartsMud);
    const chat = structuredClone(h.context.chat);
    await assert.rejects(() => h.workflow.retryPendingPostSettlement({ defaults: true }), /host write failed/);
    h.durable.state.stateRevision += 2;
    assert.equal(await h.savePorts.recoverFailedPostPreservation(state, chat), false);
    assert.equal(h.calls, 0);
});

test('post-unsettled submission boundary rejects a new player action', async () => {
    const previousToastr = globalThis.toastr;
    const warnings = [];
    globalThis.toastr = { warning: message => warnings.push(message) };
    try {
        const state = createCurrentPlayingState();
        state.turn.status = 'post_unsettled';
        const context = {
            chat: [],
            saveChatCalls: 0,
            async saveChat() { this.saveChatCalls++; },
        };
        let runs = 0;
        const controller = createTurnController({
            refs: { composerInput: { value: 'I take another action.', style: {}, focus() {} } },
            session: { displayLocale: 'zh-CN' },
            getMudState: () => state,
            getContext: () => context,
            getFailedPlayerTurn: () => null,
            getActiveAddressingState: () => ({}),
            resolvePlayerAddressing: () => ({ valid: true }),
            parseSpellCastDirectives: () => [],
            jobRegistry: { turnActive: false, sceneTransitionActive: false, interiorMap: null },
            runStructuredTurn: async () => { runs++; },
            renderAll() {},
            renderComposerAddressing() {},
        });
        await controller.submitTurn();
        assert.equal(context.chat.length, 0);
        assert.equal(context.saveChatCalls, 0);
        assert.equal(runs, 0);
        assert.deepEqual(warnings, ['请先结算或丢弃已保留场景，再提交下一步行动。']);
    } finally {
        globalThis.toastr = previousToastr;
    }
});
