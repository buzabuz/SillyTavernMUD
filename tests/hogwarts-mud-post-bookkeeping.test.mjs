/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createCurrentActorProposal, createCurrentPlayingState } from './hogwarts-mud-test-fixtures.mjs';
import { settlePostTurnResultFamilies } from '../src/hogwarts-mud/post-turn-result-settlement.js';
import { applyPostBookkeeping, settlePostBookkeeping } from '../public/scripts/extensions/hogwarts-mud/domain/post-bookkeeping-settlement.js';
import { preserveSceneNarrative } from '../public/scripts/extensions/hogwarts-mud/domain/narrative-preservation.js';
import { createPostRecovery, emptyPostObservation, mergePostSupplement } from '../public/scripts/extensions/hogwarts-mud/domain/post-recovery.js';
import { validateTurnTransaction } from '../public/scripts/extensions/hogwarts-mud/domain/turn-validation.js';
import { applyTurnTransaction } from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import { createLocalSemanticAdapter } from '../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';
import { settlePostTurnModelResult } from '../src/hogwarts-mud/local-semantic-adjudicator.js';
import { buildLocalMapModel } from '../public/scripts/extensions/hogwarts-mud/domain/maps.js';
import { findLocalRoomPath } from '../public/scripts/extensions/hogwarts-mud/domain/pathfinding.js';
import { projectObservedInventoryUpdates } from '../public/scripts/extensions/hogwarts-mud/domain/inventory.js';
import { validatePerceptionContract } from '../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';
import { POST_TURN_JSON_SCHEMA } from '../public/scripts/extensions/hogwarts-mud/domain/post-turn-semantic-contract.js';
import { selectLocalPostOutputSchema } from '../public/scripts/extensions/hogwarts-mud/domain/post-bookkeeping-contract.js';

function fixture() {
    const state = createCurrentPlayingState();
    const actor = createCurrentActorProposal('temp_messenger', {
        nameEn: 'Village Messenger', roleEn: 'A village messenger',
        roomId: state.map.currentLocalNodeId, relationship: '',
    });
    actor.privateFacts = { secretEn: '', knowledgeEn: [] };
    actor.initialRelationshipToPlayerEn = '';
    actor.firstImpressionOfPlayerEn = '';
    actor.runtime.currentActivityEn = 'Handing over a sealed letter.';
    const performance = preserveSceneNarrative({
        segments: [
            { type: 'narration', textEn: 'Professor McGonagall watches Tina while the messenger hands over a sealed letter.' },
            { type: 'dialogue', actorId: 'temp_messenger', textEn: 'A letter for you.' },
            { type: 'dialogue', actorId: 'minerva_mcgonagall', textEn: 'I remember the old red gate.' },
        ],
        speakers: [{ id: actor.id, displayNameEn: actor.nameEn }],
    });
    const transaction = {
        ...performance, narrativeFirst: true, elapsedMinutes: 15,
        pacingBeat: { id: 'beat_letter' },
        postContext: {
            temporaryActorPromotionPolicy: { mode: 'promote_selected_anonymous_interaction' },
            firstMeetingActorIds: ['minerva_mcgonagall'],
            historicalSupport: { minerva_mcgonagall: ['event_red_gate'] },
        },
    };
    state.actorMemoryIndex.byActorId.minerva_mcgonagall.firstImpressionRef = '';
    const raw = {
        ...emptyPostObservation(transaction).observation.result,
        inventoryObservationRequired: false,
        perception: {
            version: 1, visualScope: 'target', audibleScope: 'none',
            salience: 'normal', attribution: 'clear', concealment: 'none',
            directParticipantActorIds: [], evidenceText: performance.segments[0].textEn,
            confidence: 0.9, source: 'post_turn_observer',
        },
        temporaryActors: [actor],
        firstImpressions: [{
            actorId: 'minerva_mcgonagall', currentActivityEn: 'Watching Tina.',
            firstImpressionOfPlayerEn: 'An attentive child.',
            evidenceText: 'Professor McGonagall watches Tina',
        }],
        sceneProgression: {
            type: 'practical_step', summaryEn: 'The messenger hands over a letter.',
            evidenceText: 'the messenger hands over a sealed letter',
        },
        pacingRealization: {
            beatId: 'beat_letter', realized: true, evidenceText: 'the messenger hands over a sealed letter',
        },
        historicalClaims: [{
            segmentIndex: 2, actorId: 'minerva_mcgonagall',
            claimTextEn: 'the old red gate', sourceEventIds: ['event_red_gate'],
        }],
    };
    delete raw.inventoryUpdates;
    delete raw.identityObservations;
    return { state, actor, transaction, raw };
}

async function observeFixture(provider, raw, state, transaction) {
    state.postTurnSemanticProvider = provider;
    state.modelSlots.low = { profileId: 'isolated-test' };
    const calls = [];
    const adapter = createLocalSemanticAdapter({
        buildLocalMapModel, findLocalRoomPath, projectObservedInventoryUpdates, validatePerceptionContract,
        buildStructuredPlayerTurnSequence: () => [], getRequestHeaders: () => ({}),
        sendPostTurnSemanticRequest: async () => {
            calls.push('post_turn_semantic_proposal');
            return { content: JSON.stringify(raw) };
        },
        runLocalModelTask: async (id, invoke) => {
            calls.push(id);
            assert.equal(id, 'post_turn_semantic_proposal');
            return invoke();
        },
        fetchImpl: async (_url, options) => {
            const body = JSON.parse(options.body);
            return { ok: true, json: async () => settlePostTurnModelResult(body.input, body.raw || raw) };
        },
    });
    const result = await adapter.requestPostTurnSemanticObservation(state, 'I wait.', transaction);
    return { result, calls };
}

test('supplement repairs only the Actor target of a schema-rejected record', () => {
    const { transaction, raw } = fixture();
    raw.actorUpdates = [{ actorId: 'minerva_mcgonagall', currentActivityEn: 42 }];
    const parsed = settlePostTurnResultFamilies(raw);
    const original = emptyPostObservation(transaction);
    original.observation = { result: parsed.result, diagnostics: { familyRejections: parsed.rejections } };
    const recovery = createPostRecovery(original, transaction);
    const incoming = emptyPostObservation(transaction);
    incoming.observation.result.actorUpdates = [
        { actorId: 'tina_mother', currentActivityEn: 'Waiting.' },
        { actorId: 'minerva_mcgonagall', currentActivityEn: 'Watching Tina.' },
    ];
    const merged = mergePostSupplement(recovery, incoming, ['actorUpdates'], transaction);
    assert.deepEqual(merged.observation.result.actorUpdates, [incoming.observation.result.actorUpdates[1]]);
});

test('supplement cannot invent a target for a targetless rejected record', () => {
    const { transaction, raw } = fixture();
    raw.actorUpdates = [{ currentActivityEn: 42 }];
    const parsed = settlePostTurnResultFamilies(raw);
    const original = emptyPostObservation(transaction);
    original.observation = { result: parsed.result, diagnostics: { familyRejections: parsed.rejections } };
    const incoming = emptyPostObservation(transaction);
    incoming.observation.result.actorUpdates = [{
        actorId: 'tina_mother', currentActivityEn: 'Waiting.',
    }];
    const merged = mergePostSupplement(
        createPostRecovery(original, transaction), incoming, ['actorUpdates'], transaction,
    );
    assert.deepEqual(merged.observation.result.actorUpdates, []);
});

test('supplement may correct an invalid Material operation without changing its stable target', () => {
    const { transaction, raw } = fixture();
    raw.materialEvents = [{
        type: 'invalid_operation', actorId: 'player', objectTextEn: '',
        sourceTextEn: '', targetTextEn: '', valueTextEn: 'Blue robes.',
        previousValueTextEn: '', resultTextEn: 'Blue robes.', quantity: 1,
        operation: 'set', slot: 'outfit', evidenceText: 'Blue robes.',
        confidence: 0.9,
    }];
    const parsed = settlePostTurnResultFamilies(raw);
    const original = emptyPostObservation(transaction);
    original.observation = { result: parsed.result, diagnostics: { familyRejections: parsed.rejections } };
    const recovery = createPostRecovery(original, transaction);
    const incoming = emptyPostObservation(transaction);
    incoming.observation.result.materialEvents = [{
        ...raw.materialEvents[0], type: 'outfit_changed',
    }];
    const merged = mergePostSupplement(recovery, incoming, ['materialEvents'], transaction);
    assert.deepEqual(merged.observation.result.materialEvents, incoming.observation.result.materialEvents);
});

test('Low and Local keep language-rejected Actor records selectable while preserving progression', async t => {
    for (const provider of ['low', 'local']) {
        await t.test(provider, async () => {
            const { state, transaction, raw } = fixture();
            raw.inventoryUpdates = [];
            raw.identityObservations = [];
            raw.actorUpdates = [{
                actorId: 'minerva_mcgonagall', currentActivityEn: '正在注视蒂娜。',
                presence: 'present', roomId: state.map.currentLocalNodeId,
                evidenceText: 'Professor McGonagall watches Tina', confidence: 0.95,
            }];
            const { result, calls } = await observeFixture(provider, raw, state, transaction);
            assert.equal(result.postSettlementFailure, undefined);
            assert.equal(result.observation.diagnostics.languageMismatchCount, 1);
            assert.deepEqual(result.observation.result.actorUpdates, []);
            assert.deepEqual(result.observation.result.sceneProgression, raw.sceneProgression);
            const recovery = createPostRecovery(result, transaction);
            assert.ok(recovery.groups.some(group => group.families.includes('actorUpdates')));
            assert.deepEqual(calls, ['post_turn_semantic_proposal']);
        });
    }
});

test('Low and Local semantic Actor rejections retain the failed target during supplement merge', async t => {
    for (const provider of ['low', 'local']) {
        await t.test(provider, async () => {
            const { state, transaction, raw } = fixture();
            raw.inventoryUpdates = [];
            raw.identityObservations = [];
            const actor = {
                actorId: 'minerva_mcgonagall', currentActivityEn: 'Watching Tina.',
                presence: 'present', roomId: state.map.currentLocalNodeId,
                evidenceText: 'Professor McGonagall watches Tina', confidence: 0.1,
            };
            raw.actorUpdates = [actor];
            const { result } = await observeFixture(provider, raw, state, transaction);
            const recovery = createPostRecovery(result, transaction);
            assert.deepEqual(result.observation.result.actorUpdates, []);
            const next = emptyPostObservation(transaction);
            next.observation.result.actorUpdates = [
                { ...actor, actorId: 'tina_mother', confidence: 0.95 },
                { ...actor, confidence: 0.95 },
            ];
            const merged = mergePostSupplement(recovery, next, ['actorUpdates'], transaction);
            assert.deepEqual(merged.observation.result.actorUpdates, [next.observation.result.actorUpdates[1]]);
        });
    }
});

test('invalid initial Local Inventory routing exposes incomplete assessment without Dynamic dispatch', async () => {
    const { state, transaction, raw } = fixture();
    raw.inventoryObservationRequired = 'invalid';
    const { result, calls } = await observeFixture('local', raw, state, transaction);
    assert.equal(result.postSettlementFailure, undefined);
    const recovery = createPostRecovery(result, transaction);
    assert.ok(recovery.groups.some(group => group.families.includes('inventoryUpdates')));
    assert.deepEqual(calls, ['post_turn_semantic_proposal']);
    assert.deepEqual(result.observation.result.sceneProgression, raw.sceneProgression);
});

test('all migrated bookkeeping families reach the existing transaction and Actor reducers', () => {
    const { state, transaction, raw } = fixture();
    const before = structuredClone(state);
    const sourceText = transaction.segments.map(segment => segment.textEn);
    const parsed = settlePostTurnResultFamilies(raw);
    assert.deepEqual(parsed.rejections, []);
    const settled = settlePostBookkeeping(parsed.result, state, transaction);
    assert.deepEqual(settled.rejections, []);
    applyPostBookkeeping(transaction, settled.result);
    assert.deepEqual(validateTurnTransaction(transaction, state).errors, []);
    const next = applyTurnTransaction(state, transaction, 'I accept the letter.');
    assert.deepEqual(state, before);
    assert.equal(next.actorLibrary.some(actor => actor.id === 'temp_messenger'), true);
    assert.equal(next.actors.find(actor => actor.id === 'temp_messenger').roomId, state.map.currentLocalNodeId);
    assert.ok(next.actorMemoryIndex.byActorId.minerva_mcgonagall.firstImpressionRef);
    assert.equal(next.scene.timelineEntries.at(-1).summaryEn, raw.sceneProgression.summaryEn);
    assert.equal(transaction.pacingBeatRealized, true);
    assert.deepEqual(transaction.segments[2].historicalClaims, [{
        claimTextEn: 'the old red gate', sourceEventIds: ['event_red_gate'],
    }]);
    assert.deepEqual(transaction.segments.map(segment => segment.textEn), sourceText);
});

test('bookkeeping rejects unauthorized values without discarding independent progression', async t => {
    for (const [name, mutate, rejectedFamily] of [
        ['private facts', f => { f.raw.temporaryActors[0].privateFacts.secretEn = 'A concealed identity.'; }, 'temporaryActors'],
        ['remote room', f => { f.raw.temporaryActors[0].runtime.roomId = 'back_garden'; }, 'temporaryActors'],
        ['wrong public identity', f => { f.raw.temporaryActors[0].nameEn = 'Different Person'; }, 'temporaryActors'],
        ['existing first impression', f => {
            f.state.actorMemoryIndex.byActorId.minerva_mcgonagall.firstImpressionRef = 'existing';
        }, 'firstImpressions'],
        ['wrong beat', f => { f.raw.pacingRealization.beatId = 'unrelated_beat'; }, 'pacingRealization'],
        ['borrowed memory', f => { f.raw.historicalClaims[0].sourceEventIds = ['private_event']; }, 'historicalClaims'],
    ]) {
        await t.test(name, () => {
            const f = fixture();
            mutate(f);
            const settled = settlePostBookkeeping(settlePostTurnResultFamilies(f.raw).result, f.state, f.transaction);
            assert.deepEqual(settled.rejections.map(rejection => rejection.family), [rejectedFamily]);
            assert.deepEqual(settled.result.sceneProgression, f.raw.sceneProgression);
        });
    }
});

test('failed speaker admission holds dependent records together and keeps unrelated siblings', () => {
    const { state, transaction, raw } = fixture();
    raw.temporaryActors[0].privateFacts.secretEn = 'Unapproved.';
    raw.actorUpdates = [
        { actorId: 'temp_messenger', currentActivityEn: 'Waiting.' },
        { actorId: 'minerva_mcgonagall', currentActivityEn: 'Watching.' },
    ];
    raw.inventoryUpdates = [{ id: 'letter', holderId: 'temp_messenger', operation: 'give' }];
    raw.identityObservations = [{ actorId: 'temp_messenger' }];
    raw.perception.directParticipantActorIds = ['temp_messenger'];
    const settled = settlePostBookkeeping(raw, state, transaction);
    assert.deepEqual(settled.result.actorUpdates, [raw.actorUpdates[1]]);
    assert.deepEqual(settled.result.inventoryUpdates, []);
    assert.deepEqual(settled.result.identityObservations, []);
    assert.equal(settled.result.perception, null);
    assert.deepEqual(settled.rejections.filter(r => r.dependsOn === 'temporaryActors').map(r => r.family),
        ['actorUpdates', 'inventoryUpdates', 'identityObservations', 'perception']);
    assert.deepEqual(settled.result.sceneProgression, raw.sceneProgression);
});

test('extra bookkeeping fields are stripped without discarding valid declared evidence', () => {
    const { state, transaction, raw } = fixture();
    const expected = structuredClone(raw.sceneProgression);
    raw.sceneProgression.confidence = 0.85;
    raw.pacingRealization.comment = 'Auxiliary commentary.';
    const parsed = settlePostTurnResultFamilies(raw);
    assert.deepEqual(parsed.rejections, []);
    assert.deepEqual(parsed.result.sceneProgression, expected);
    const settled = settlePostBookkeeping(parsed.result, state, transaction);
    assert.deepEqual(settled.rejections, []);
    assert.equal(settled.result.pacingRealization.comment, undefined);
});

test('Local grammar omits oversized repetition limits but the return validator retains them', () => {
    const schema = selectLocalPostOutputSchema(POST_TURN_JSON_SCHEMA);
    assert.equal(schema.properties.temporaryActors.items.properties.publicProfile.properties.backgroundEn.maxLength, undefined);
    assert.equal(POST_TURN_JSON_SCHEMA.properties.temporaryActors.items.properties.publicProfile.properties.backgroundEn.maxLength, 3000);
    const { raw } = fixture();
    raw.temporaryActors[0].publicProfile.backgroundEn = 'x'.repeat(3001);
    assert.equal(settlePostTurnResultFamilies(raw).rejections[0].family, 'temporaryActors');
});

test('a message-local declaration cannot borrow an existing Actor identity or historical support', () => {
    const { state, transaction, raw } = fixture();
    transaction.speakers.push({ id: 'minerva_mcgonagall', displayNameEn: 'Unknown Messenger' });
    const settled = settlePostBookkeeping(raw, state, transaction);
    assert.deepEqual(settled.result.historicalClaims, []);
    assert.deepEqual(settled.result.firstImpressions, []);
    const preserved = preserveSceneNarrative({
        segments: transaction.segments, speakers: transaction.speakers,
    }, { reservedActorIds: ['minerva_mcgonagall'] });
    assert.equal(preserved.segments[2].actorId, '');
    assert.equal(preserved.segments[2].textEn, transaction.segments[2].textEn);
    assert.equal(preserved.speakers.some(s => s.id === 'minerva_mcgonagall'), false);
});

test('Low and Local supplementary Post admit a new speaker before projecting their gifted Item', async t => {
    for (const provider of ['low', 'local']) {
        await t.test(provider, async () => {
            const { state, transaction, raw } = fixture();
            state.postTurnSemanticProvider = provider;
            state.modelSlots.low = { profileId: 'isolated-test' };
            const item = {
                id: 'sealed_letter', operation: 'acquire', type: 'document',
                labelEn: 'Sealed Letter', appearanceEn: 'A sealed paper envelope.',
                ownerId: 'temp_messenger', holderId: 'player', targetHolderId: '',
                transferMode: 'gift', storyRoles: [], visibility: 'public', isEquipped: false, held: true,
                sourceKind: 'narrative', evidenceText: 'the messenger hands over a sealed letter',
                evidenceItemText: 'sealed letter', physicalForm: 'whole', confidence: 0.95,
            };
            raw.inventoryUpdates = [item];
            raw.identityObservations = [];
            let calls = 0;
            let reservations = 0;
            const adapter = createLocalSemanticAdapter({
                buildLocalMapModel, findLocalRoomPath, projectObservedInventoryUpdates, validatePerceptionContract,
                buildStructuredPlayerTurnSequence: () => [], getRequestHeaders: () => ({}),
                sendPostTurnSemanticRequest: async () => { calls++; return { content: JSON.stringify(raw) }; },
                runLocalModelTask: async (id, invoke) => {
                    assert.equal(id, 'post_turn_semantic_proposal');
                    calls++; return invoke();
                },
                fetchImpl: async (_url, options) => {
                    const body = JSON.parse(options.body);
                    return { ok: true, json: async () => settlePostTurnModelResult(body.input, body.raw || raw) };
                },
            });
            const result = await adapter.requestPostTurnSemanticObservation(state, 'I accept the letter.', transaction, {
                settlementOnly: true,
                recoveryTargets: { families: ['temporaryActors', 'inventoryUpdates'], groups: [] },
                beforeDispatch: async () => { reservations++; },
            });
            assert.equal(calls, 1);
            assert.equal(reservations, 1);
            assert.equal(result.postSettlementFailure, undefined);
            assert.equal(result.observation.result.temporaryActors[0].id, 'temp_messenger');
            assert.equal(result.itemUpdates.length, 1);
            assert.equal(result.itemUpdates[0].holderId, 'player');
            assert.equal(state.actorLibrary.some(actor => actor.id === 'temp_messenger'), false);
        });
    }
});
