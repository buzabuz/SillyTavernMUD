/* global globalThis */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { parse } from 'acorn';
import { createModelAdapter } from '../public/scripts/extensions/hogwarts-mud/adapters/model.js';
import { parseCompleteJsonObject } from '../public/scripts/extensions/hogwarts-mud/core/json-recovery.js';
import { preserveSceneNarrative } from '../public/scripts/extensions/hogwarts-mud/domain/narrative-preservation.js';
import { createLocalSemanticAdapter } from '../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';
import { createTurnWorkflow } from '../public/scripts/extensions/hogwarts-mud/workflows/turn.js';
import { createTurnPerformanceWorkflow } from '../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';
import { createContextBudgetPlan } from '../public/scripts/extensions/hogwarts-mud/core/context-budget.js';
import { createTurnPerformanceBudget, getDeterministicTimePolicy } from '../public/scripts/extensions/hogwarts-mud/domain/turn-time.js';
import { buildBehavioralEnvironment } from '../public/scripts/extensions/hogwarts-mud/domain/time-environment.js';
import { buildSpatialContext } from '../public/scripts/extensions/hogwarts-mud/domain/spatial-reconciliation.js';
import { buildTemporaryActorPromotionPolicy } from '../public/scripts/extensions/hogwarts-mud/domain/pacing-validation.js';
import { parseItemOperationDirectives } from '../public/scripts/extensions/hogwarts-mud/domain/item-directive.js';
import { CANON_CAST_IDENTITY_CONTRACT, CANON_WIT_TONE_CONTRACT } from '../public/scripts/extensions/hogwarts-mud/domain/campaign.js';
import { NPC_IDENTITY_PROMPT_BOUNDARY } from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-prompt-projection.js';
import { getAuthoritativeSceneSpells } from '../public/scripts/extensions/hogwarts-mud/domain/spell-proposals.js';
import { projectPeoplePanel } from '../public/scripts/extensions/hogwarts-mud/people-projection.js';
import { createPostRecovery, emptyPostObservation, mergePostSupplement, narrativeSourceIdentity, postRecoveryTargets } from '../public/scripts/extensions/hogwarts-mud/domain/post-recovery.js';
import { LOW_POST_TURN_JSON_SCHEMA } from '../public/scripts/extensions/hogwarts-mud/domain/post-turn-semantic-contract.js';
import { selectLocalPostOutputSchema } from '../public/scripts/extensions/hogwarts-mud/domain/post-bookkeeping-contract.js';
import { createPendingPostSettlement } from '../public/scripts/extensions/hogwarts-mud/domain/pending-post-settlement.js';
import { createTurnRetryCheckpoint } from '../public/scripts/extensions/hogwarts-mud/domain/turn-rollback.js';
import { buildLocalMapModel } from '../public/scripts/extensions/hogwarts-mud/domain/maps.js';
import { findLocalRoomPath } from '../public/scripts/extensions/hogwarts-mud/domain/pathfinding.js';
import { buildStructuredPlayerTurnSequence, removeExplicitAddressDirective, resolvePlayerAddressing } from '../public/scripts/extensions/hogwarts-mud/domain/actor-identity.js';
import { projectObservedInventoryUpdates } from '../public/scripts/extensions/hogwarts-mud/domain/inventory.js';
import { partitionItemProposals } from '../public/scripts/extensions/hogwarts-mud/domain/item-reducer.js';
import { extractSpellCandidates } from '../public/scripts/extensions/hogwarts-mud/domain/spell-proposals.js';
import { reconcileTurnActorPresenceWithSpatialState } from '../public/scripts/extensions/hogwarts-mud/domain/spatial-reconciliation.js';
import { consumePacingBeat } from '../public/scripts/extensions/hogwarts-mud/domain/pacing-reducer.js';
import { validateTurnTransaction } from '../public/scripts/extensions/hogwarts-mud/domain/turn-validation.js';
import { applyTurnTransaction } from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import { applyPresenceWitnessTransaction, normalizeEventKnowledge, reduceLocalPresence, resolveEventWitnesses, validatePerceptionContract } from '../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';
import { createGuardedSavePorts } from '../public/scripts/extensions/hogwarts-mud/runtime/guarded-save-ports.js';
import { createSaveRevisionGuard } from '../public/scripts/extensions/hogwarts-mud/runtime/save-revision-guard.js';
import { settlePostTurnModelResult } from '../src/hogwarts-mud/local-semantic-adjudicator.js';

const [mode, requestPath, responsePath] = process.argv.slice(2);
assert.ok(mode && requestPath && responsePath, 'Usage: <mode> <request.json> <response.json>');
const sourcePath = 'data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl';
const source = fs.readFileSync(sourcePath, 'utf8');
const rows = source.trim().split('\n').map(JSON.parse);
const state = structuredClone(rows[0].chat_metadata.hogwartsMud);
const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
const raw = fs.readFileSync(responsePath, 'utf8');
let transportContent = raw;
if (process.argv.includes('--host-extraction')) {
    // Execute the actual host extraction functions without importing its browser composition root.
    const hostSource = fs.readFileSync('public/script.js', 'utf8');
    const ast = parse(hostSource, { ecmaVersion: 'latest', sourceType: 'module' });
    const declarations = ast.body.filter(node => node.type === 'ExportNamedDeclaration'
        && ['extractMessageFromData', 'extractJsonFromData'].includes(node.declaration?.id?.name))
        .map(node => hostSource.slice(node.declaration.start, node.declaration.end));
    assert.equal(declarations.length, 2);
    const host = vm.createContext({
        chat_completion_sources: new Proxy({}, { get: (_target, key) => String(key).toLowerCase() }),
        console: { debug() {} },
    });
    vm.runInContext(declarations.join('\n'), host);
    const extracted = host.extractJsonFromData({ choices: [{ message: { content: raw } }] }, {
        mainApi: 'openai', chatCompletionSource: 'custom', returnInvalidJson: true,
    });
    transportContent = JSON.parse(extracted);
}
const input = JSON.parse(request.messages[1].content);
globalThis.fetch = async () => { throw new Error('NETWORK_FORBIDDEN_RESPONSE_VERIFICATION'); };
let transaction;
let observation;
let calls = 0;
let exactRequest = false;
let action = input.playerAction || rows.at(-1).mes;
const adapter = createLocalSemanticAdapter({
    buildLocalMapModel, findLocalRoomPath, buildStructuredPlayerTurnSequence, projectObservedInventoryUpdates,
    validatePerceptionContract, getRequestHeaders: () => ({}),
    sendPostTurnSemanticRequest: async (_slot, messages) => {
        calls++;
        assert.deepEqual(messages, request.messages, 'Verifier must issue the captured production request unchanged');
        exactRequest = true;
        return { content: transportContent };
    },
    fetchImpl: async (url, options) => {
        const body = JSON.parse(options.body);
        if (url === '/api/hogwarts-mud/local/observe') {
            calls++;
            assert.deepEqual(body.input, input);
            exactRequest = true;
            return { ok: true, json: () => settlePostTurnModelResult(body.input, raw) };
        }
        assert.equal(url, '/api/hogwarts-mud/post/observe/settle');
        return { ok: true, json: () => settlePostTurnModelResult(body.input, body.raw) };
    },
});
if (mode === 'scene') {
    const performer = createTurnPerformanceWorkflow({
        CANON_CAST_IDENTITY_CONTRACT, CANON_WIT_TONE_CONTRACT, NPC_IDENTITY_PROMPT_BOUNDARY,
        buildBehavioralEnvironment, buildSpatialContext, buildStructuredPlayerTurnSequence,
        buildTemporaryActorPromotionPolicy, parseItemOperationDirectives, removeExplicitAddressDirective,
        resolvePlayerAddressing, getAuthoritativeSceneSpells, createContextBudgetPlan,
        getActiveAddressingState: current => {
            const ids = new Set(projectPeoplePanel(current).activePeople.map(actor => actor.id));
            return { ...current, actors: current.actors.map(actor => ({ ...actor, present: ids.has(actor.id) })) };
        },
        beginLiveSceneStream() {}, updateLiveSceneStream() {}, setLiveSceneStreamPhase() {},
        extractRoleResponseText: createModelAdapter({ parseCompleteJsonObject }).extractRoleResponseText,
        sendModelTaskRequest: async (_slot, messages) => {
            calls++;
            assert.deepEqual(messages, request.messages);
            exactRequest = true;
            return { content: raw };
        },
    });
    const slot = state.modelSlots.low;
    const budget = createTurnPerformanceBudget(action, getDeterministicTimePolicy(), {
        activeNamedActorCount: projectPeoplePanel(state).activePeople.length,
        adjudicatedMinutes: rows.at(-1).extra?.hogwartsMud?.localAdjudication?.result?.temporal?.elapsedMinutes,
    });
    const performance = await performer.generateScenePerformance(
        slot, state, action, budget, [], null, performer.createSceneMomentumDirective(state, budget),
        null, rows.at(-1).extra?.hogwartsMud?.addressing, [],
        createContextBudgetPlan(slot.contextSize, slot.maxResponseLength),
    );
    assert.equal(calls, 1);
    transaction = performer.buildSceneTransaction(performance, budget);
    observation = emptyPostObservation(transaction);
} else {
    const lastScene = rows.findLast(row => row.extra?.hogwartsMud?.turnTransaction);
    const freshScenePath = process.argv.find(arg => arg.startsWith('--scene-response='))?.slice(17);
    transaction = freshScenePath
        ? createTurnPerformanceWorkflow({}).buildSceneTransaction(
            preserveSceneNarrative(parseCompleteJsonObject(fs.readFileSync(freshScenePath, 'utf8'))),
            createTurnPerformanceBudget(action, getDeterministicTimePolicy(), {
                activeNamedActorCount: projectPeoplePanel(state).activePeople.length,
                adjudicatedMinutes: rows.at(-1).extra?.hogwartsMud?.localAdjudication?.result?.temporal?.elapsedMinutes,
            }),
        ) : structuredClone(lastScene.extra.hogwartsMud.turnTransaction);
    transaction.narrativeFirst = true;
    transaction.speakers = input.speakerDeclarations;
    transaction.postContext = {
        speakerDeclarations: input.speakerDeclarations,
        temporaryActorPromotionPolicy: input.temporaryActorPromotionPolicy,
        firstMeetingActorIds: input.firstMeetingActorIds,
        historicalSupport: input.historicalSupport,
    };
    state.postTurnSemanticProvider = mode.startsWith('low') ? 'low' : 'local';
    observation = await adapter.requestPostTurnSemanticObservation(state, action, transaction, {
        settlementOnly: true,
        recoveryTargets: input.recoveryTargets || null,
        acceptedConstraints: input.acceptedConstraints || null,
    });
    assert.equal(calls, 1);
    assert.equal(exactRequest, true);
    assert.notEqual(observation.postSettlementFailure, true);
}
const assessed = createPostRecovery(observation, transaction);
const emitSupplement = process.argv.find(arg => arg.startsWith('--emit-supplement='))?.slice(18);
if (emitSupplement) {
    if (!emitSupplement.startsWith('/tmp/hpmud-nfp-')) throw new Error('Private supplementary request path required.');
    const targets = postRecoveryTargets(assessed, assessed.groups.map(group => group.id));
    await assert.rejects(() => adapter.requestPostTurnSemanticObservation(state, action, transaction, {
        recoveryTargets: targets, acceptedConstraints: assessed.accepted.observation.result,
        beforeDispatch: assembly => {
            const supplementalInput = JSON.parse(assembly.messages[1].content);
            fs.writeFileSync(emitSupplement, JSON.stringify({
                messages: assembly.messages,
                outputSchema: selectLocalPostOutputSchema(LOW_POST_TURN_JSON_SCHEMA, supplementalInput),
            }), { mode: 0o600 });
            throw new Error('BUILD_ONLY_SUPPLEMENT_CAPTURE');
        },
    }), /BUILD_ONLY_SUPPLEMENT_CAPTURE/);
}
let accepted = observation;
if (mode.endsWith('supplement')) {
    const prior = emptyPostObservation(transaction);
    Object.assign(prior.observation.result, input.acceptedConstraints || {});
    prior.perception = prior.observation.result.perception;
    const empty = createPostRecovery({ ...prior, postSettlementFailure: true }, transaction);
    empty.groups = empty.groups.filter(group => input.recoveryTargets.families.includes(group.id));
    accepted = mergePostSupplement(empty, observation, empty.groups.map(group => group.id), transaction);
}
const context = {
    chatId: 'isolated-response-verification',
    chatMetadata: { hogwartsMud: state },
    chat: [
        { is_user: true, mes: action, extra: { hogwartsMud: { role: 'player_turn' } } },
        { is_user: false, mes: transaction.segments.map(s => s.textEn || s.rawText).join('\n'),
            extra: { hogwartsMud: { role: 'scene_turn', segments: structuredClone(transaction.segments) } } },
    ],
    async saveMetadata() { return { durable: true }; },
    async saveChat() { return { durable: true }; },
};
const values = new Map();
const savePorts = createGuardedSavePorts({
    getContext: () => context,
    guard: createSaveRevisionGuard({ lockManager: null, storage: {
        get length() { return values.size; },
        key: index => [...values.keys()][index] ?? null,
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key),
    } }),
});
await savePorts.registerSaveRevisionHead(context, { persistMigration: false });
const current = context.chatMetadata.hogwartsMud;
const next = structuredClone(current);
next.turn.status = 'post_unsettled';
const nextChat = structuredClone(context.chat);
const checkpoint = createTurnRetryCheckpoint(current, { playerMessageId: 0, assistantMessageId: 1 });
nextChat[1].extra.hogwartsMud.pendingPostSettlement = createPendingPostSettlement({
    state: { ...next, stateRevision: current.stateRevision + 1 }, playerMessageId: 0, sceneMessageId: 1,
    transactionDraft: transaction, preTurnCheckpoint: checkpoint,
    recovery: createPostRecovery(accepted, transaction),
});
await savePorts.guardedRewriteTimeline({
    currentState: current, nextState: next, currentChat: structuredClone(context.chat), nextChat,
    source: 'turn_post_pending', changedDomains: ['turn'],
});
const workflow = createTurnWorkflow({
    ...savePorts, getContext: () => context, getMudState: () => context.chatMetadata.hogwartsMud,
    jobRegistry: { turnActive: false, sceneTransitionActive: false, turnSettlement: new Map() },
    applyTurnTransaction, validateTurnTransaction, applyPresenceWitnessTransaction, partitionItemProposals,
    extractSpellCandidates, reconcileTurnActorPresenceWithSpatialState, reduceLocalPresence,
    resolveEventWitnesses, consumePacingBeat, normalizeEventKnowledge,
    applyObservedActorUpdates: adapter.applyObservedActorUpdates,
    buildLocalSemanticRoomContext: adapter.buildLocalSemanticRoomContext,
    composeSceneSegments: segments => segments.map(s => s.textEn || s.rawText).join('\n'),
    applySystemPrompt() {}, renderAll() {}, updateNativeMessageBlock() {},
    requestPostTurnSemanticObservation: async () => { throw new Error('Unexpected second model request'); },
});
const result = await workflow.retryPendingPostSettlement({ defaults: true });
assert.equal(result.settled, true);
assert.equal(context.chatMetadata.hogwartsMud.turn.count, current.turn.count + 1);
assert.equal(narrativeSourceIdentity(context.chat[1].extra.hogwartsMud.segments), narrativeSourceIdentity(transaction.segments));
assert.equal(fs.readFileSync(sourcePath, 'utf8'), source);
const report = {
    mode, responseHash: createHash('sha256').update(raw).digest('hex'),
    hostExtraction: process.argv.includes('--host-extraction'),
    capturedModelRequests: calls, realRemoteCalls: 0, exactRequest,
    sourceSaveUnchanged: true, reducerCommitted: true, proseUnchanged: true,
    rejectedFamilies: assessed.groups.filter(group => !input.recoveryTargets
        || input.recoveryTargets.families.includes(group.id)).map(group => ({ family: group.id, reasons: group.reasons })),
};
console.log(JSON.stringify(report, null, 2));
if (report.rejectedFamilies.length) process.exitCode = 1;
