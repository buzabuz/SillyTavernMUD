import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createPostRecovery, emptyPostObservation, mergePostSupplement,
    narrativeSourceIdentity, postRecoveryTargets,
} from '../public/scripts/extensions/hogwarts-mud/domain/post-recovery.js';
import { preserveSceneNarrative } from '../public/scripts/extensions/hogwarts-mud/domain/narrative-preservation.js';
import { selectPostOutputSchema } from '../public/scripts/extensions/hogwarts-mud/domain/post-bookkeeping-contract.js';
import { LOW_POST_TURN_JSON_SCHEMA } from '../public/scripts/extensions/hogwarts-mud/domain/post-turn-semantic-contract.js';
import { settlePostTurnResultFamilies } from '../src/hogwarts-mud/post-turn-result-settlement.js';
import { settlePostBookkeeping } from '../public/scripts/extensions/hogwarts-mud/domain/post-bookkeeping-settlement.js';

/* eslint-disable playwright/expect-expect */
const transaction = {
    segments: [{ type: 'narration', textEn: '  Hermione closed the book.\n' }],
    speakers: [], pacingBeat: { id: 'beat_read' },
    postContext: { firstMeetingActorIds: ['hermione'] },
};
const state = { actors: [{ id: 'hermione', present: true }], actorLibrary: [] };

test('narrative preservation keeps exact text and separates unknown metadata', async t => {
    for (const [name, segments] of [
        ['English', transaction.segments],
        ['non-English', [{ type: 'dialogue', actorId: 'unknown', textEn: '  她合上了书。\n' }]],
        ['invalid type', [{ type: 'invalid', textEn: '  The door shut.\n', historicalClaims: 12 }]],
    ]) {
        await t.test(name, () => {
            const result = preserveSceneNarrative({ segments, signals: 'bad', stateProposals: 1 });
            assert.equal(result.segments[0].textEn || result.segments[0].rawText, segments[0].textEn);
            assert.deepEqual(result.actorUpdates, []);
            assert.equal(result.sceneProgression, null);
            assert.equal(result.publicEventEn, '');
        });
    }
});

test('Post recovery distinguishes failed records, explicit no-change and harmless cleanup', () => {
    const observation = emptyPostObservation(transaction);
    observation.observation.diagnostics.familyRejections = [
        { family: 'actorUpdates', disposition: 'discard_record', recordIndex: 1, reasonCode: 'invalid_record_shape' },
        { family: 'perception', disposition: 'normalize', reasonCode: 'participant_ids_removed' },
    ];
    const recovery = createPostRecovery(observation, transaction);
    assert.deepEqual(recovery.groups.map(g => g.id), ['actorUpdates']);
    assert.deepEqual(recovery.groups[0].slots, [{ id: 'actorUpdates:1', index: 1 }]);
    assert.equal(recovery.supplement.status, 'available');
    assert.equal(recovery.accepted.narrativeText, undefined);
    assert.equal(createPostRecovery(emptyPostObservation(transaction), transaction).groups.length, 0);
});

test('one supplement cannot overwrite accepted records or unselected fields', () => {
    const original = emptyPostObservation(transaction);
    original.observation.result.actorUpdates = [{ actorId: 'hermione', currentActivityEn: 'Reading.' }];
    original.observation.diagnostics.familyRejections = [
        {
            family: 'actorUpdates', disposition: 'discard_record', reasonCode: 'invalid_record_shape',
            recordIndex: 1, target: { actorId: 'ron' },
        },
    ];
    const recovery = createPostRecovery(original, transaction);
    const next = emptyPostObservation(transaction);
    next.observation.result.actorUpdates = [
        { actorId: 'ron', currentActivityEn: 'Waiting.' },
        { actorId: 'hermione', currentActivityEn: 'Sleeping.' },
    ];
    next.observation.result.sceneProgression = { type: 'social_shift', summaryEn: 'Unrequested.' };
    const result = mergePostSupplement(recovery, next, ['actorUpdates'], transaction);
    assert.deepEqual(result.observation.result.actorUpdates, [
        { actorId: 'hermione', currentActivityEn: 'Reading.' },
        { actorId: 'ron', currentActivityEn: 'Waiting.' },
    ]);
    assert.equal(result.observation.result.sceneProgression, null);
    assert.equal(recovery.accepted.observation.result.actorUpdates.length, 1);
    assert.equal(narrativeSourceIdentity(transaction.segments), recovery.sourceIdentity);
    assert.throws(() => mergePostSupplement(recovery, next, ['actorUpdates'], {
        segments: [{ type: 'narration', textEn: 'Changed.' }],
    }), /narrative changed/);
});

test('supplement descriptor contains only selected failed families', () => {
    const observation = { ...emptyPostObservation(transaction), postSettlementFailure: true };
    const recovery = createPostRecovery(observation, transaction);
    const targets = postRecoveryTargets(recovery, ['inventoryUpdates', 'sceneProgression']);
    const schema = selectPostOutputSchema(LOW_POST_TURN_JSON_SCHEMA, { recoveryTargets: targets });
    assert.deepEqual(Object.keys(schema.properties).sort(), ['inventoryUpdates', 'sceneProgression', 'schemaVersion'].sort());
    assert.equal(schema.properties.schemaVersion.const, 2);
    assert.throws(() => postRecoveryTargets(recovery, ['not_a_field']));
});

test('semantic failed slots bound new records after accepted duplicates are excluded', () => {
    const original = emptyPostObservation(transaction);
    original.observation.result.actorUpdates = [{ actorId: 'hermione', currentActivityEn: 'Reading.' }];
    original.observation.diagnostics.familyRejections = [{
        family: 'actorUpdates', disposition: 'discard_record', reasonCode: 'actor_evidence_invalid', rejectedCount: 1,
        target: { actorId: 'ron' },
    }];
    const recovery = createPostRecovery(original, transaction);
    const next = emptyPostObservation(transaction);
    next.observation.result.actorUpdates = [
        { actorId: 'hermione', currentActivityEn: 'Replaced.' },
        { actorId: 'ron', currentActivityEn: 'Waiting.' },
        { actorId: 'harry', currentActivityEn: 'Unrequested additional record.' },
    ];
    const merged = mergePostSupplement(recovery, next, ['actorUpdates'], transaction);
    assert.deepEqual(merged.observation.result.actorUpdates.map(a => a.actorId), ['hermione', 'ron']);
    assert.equal(merged.observation.result.actorUpdates[0].currentActivityEn, 'Reading.');
});

test('supplement cannot replace an accepted Material target attribute with a different value', () => {
    const original = emptyPostObservation(transaction);
    const blue = { type: 'outfit_changed', actorId: 'player', valueTextEn: 'Blue robes.' };
    original.observation.result.materialEvents = [blue];
    original.materialEvents = [blue];
    original.observation.diagnostics.familyRejections = [{
        family: 'materialEvents', disposition: 'discard_record', rejectedCount: 1, reasonCode: 'invalid_record_shape',
    }];
    const next = emptyPostObservation(transaction);
    next.observation.result.materialEvents = [{ ...blue, valueTextEn: 'Red robes.' }];
    next.materialEvents = next.observation.result.materialEvents;
    const merged = mergePostSupplement(createPostRecovery(original, transaction), next, ['materialEvents'], transaction);
    assert.deepEqual(merged.observation.result.materialEvents, [blue]);
    assert.deepEqual(merged.materialEvents, [blue]);
});

test('bookkeeping validates each field independently and does not guess progression', () => {
    const raw = { ...emptyPostObservation(transaction).observation.result, inventoryObservationRequired: false };
    raw.firstImpressions = [{
        actorId: 'hermione', currentActivityEn: 'Reading.',
        firstImpressionOfPlayerEn: 'A careful reader.', evidenceText: 'Hermione closed the book.',
    }];
    raw.pacingRealization = { beatId: 'another_beat', realized: true, evidenceText: 'Hermione closed the book.' };
    raw.sceneProgression = { type: 'practical_step', summaryEn: 'The book was closed.', evidenceText: 'Hermione closed the book.' };
    const parsed = settlePostTurnResultFamilies(raw);
    const settled = settlePostBookkeeping(parsed.result, state, transaction);
    assert.equal(settled.result.firstImpressions.length, 1);
    assert.equal(settled.result.pacingRealization, null);
    assert.equal(settled.result.sceneProgression.summaryEn, 'The book was closed.');
    assert.deepEqual(settled.rejections.map(r => r.family), ['pacingRealization']);
    const noChange = settlePostBookkeeping(emptyPostObservation(transaction).observation.result, state, transaction);
    assert.equal(noChange.result.sceneProgression, null);
    assert.equal(noChange.result.pacingRealization, null);
});
