/* eslint-disable playwright/expect-expect */
import {
    extractStreamingSceneSegments,
    parseCompleteJsonObject,
    recoverScenePerformancePayload,
    recoverSceneTransitionPayload,
} from '../public/scripts/extensions/hogwarts-mud/core/json-recovery.js';
import {
    normalizeSceneTransitionPackage,
    validateSceneTransitionPackage,
} from '../public/scripts/extensions/hogwarts-mud/domain/scene-transition.js';
import {
    createCurrentPlayingState,
    createCurrentTransitionPackage,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('streaming scene parser reveals complete and partial JSON segments', () => {
    const partial = [
        '```json',
        '{"publicEventEn":"A door opens.","segments":[',
        '{"type":"narration","textEn":"The brass handle turns."},',
        '{"type":"dialogue","actorId":"minerva_mcgonagall",',
        '"textEn":"\\"This way, Miss Zhang.\\""},',
        '{"type":"narration","textEn":"The brick wall fol',
    ].join('');
    assert.deepEqual(
        extractStreamingSceneSegments(partial),
        [
            {
                type: 'narration',
                textEn: 'The brass handle turns.',
                partial: false,
            },
            {
                type: 'dialogue',
                actorId: 'minerva_mcgonagall',
                textEn: '"This way, Miss Zhang."',
                partial: false,
            },
            {
                type: 'narration',
                textEn: 'The brick wall fol',
                partial: true,
            },
        ],
    );

    const finished = `${partial}ds open."}],` +
        '"actorUpdates":[{"id":"minerva_mcgonagall",' +
        '"currentActivityEn":"Waiting"}]}';
    const segments =
        extractStreamingSceneSegments(finished);
    assert.equal(segments.length, 3);
    assert.equal(
        segments.at(-1).textEn,
        'The brick wall folds open.',
    );
    assert.equal(segments.at(-1).partial, false);
});

test('truncated scene recovery keeps only the complete Low output contract', () => {
    const raw = `\`\`\`json
{
  "segments": [
    {"type":"narration","textEn":"Tina points toward Eddie."},
    {"type":"dialogue","actorId":"alex_zhang","textEn":"What happened?"},
    {"type":"narration","textEn":"Eddie raises both hands."},
    {"type":"dialogue","actorId":"eddie_cooper","textEn":"That is not what happened."}
  ],
  "stateProposals": [
    {"type":"actor_activity","actorId":"alex_zhang","currentActivityEn":"Listening to both children."}
  ],
  "signals": {
    "pacingBeatRealized": false,
    "sceneProgression": {
      "type": "social_shift",
      "summaryEn": "Alex hears both children and takes charge."
    }
  }`;
    const recovered =
        recoverScenePerformancePayload(raw);

    assert.equal(
        recovered
            .signals
            .sceneProgression
            .type,
        'social_shift',
    );
    assert.equal(recovered.segments.length, 4);
    assert.deepEqual(
        recovered.stateProposals,
        [{
            type: 'actor_activity',
            actorId: 'alex_zhang',
            currentActivityEn:
                'Listening to both children.',
        }],
    );
    assert.deepEqual(
        Object.keys(recovered),
        [
            'segments',
            'stateProposals',
            'signals',
        ],
    );
    assert.deepEqual(
        Object.keys(recovered.segments[0]),
        ['type', 'textEn'],
    );
});

test('scene recovery drops an incomplete state proposal instead of creating a legacy update', () => {
    const raw = `\`\`\`json
{
  "segments":[
    {"type":"narration","textEn":"Tina folds her arms."},
    {"type":"dialogue","actorId":"eddie_cooper","textEn":"One question at a time."},
    {"type":"narration","textEn":"The bronze doors open."},
    {"type":"dialogue","actorId":"eddie_grandmother_cooper","textEn":"Edward Cooper."}
  ],
  "signals":{
    "pacingBeatRealized":true,
    "sceneProgression":{
      "type":"npc_initiative",
      "summaryEn":"Gran Cooper finds Eddie in Gringotts."
    }
  },
  "stateProposals":[
    {"type":"actor_activity","actorId":"eddie_cooper","currentActivityEn":"Answering Tina by the column."},
    {"type":"social_hint","actorId":"eddie_grandmother_cooper","currentActivityEn":"Confronting Eddie in the lobby.","firstImpressionOfPlayerEn":"A bold child"`;
    const recovered =
        recoverScenePerformancePayload(raw);

    assert.equal(
        recovered
            .signals
            .sceneProgression
            .type,
        'npc_initiative',
    );
    assert.equal(recovered.segments.length, 4);
    assert.equal(
        recovered.stateProposals,
        undefined,
    );
    assert.equal(
        recovered.actorUpdates,
        undefined,
    );
    assert.equal(
        recovered.memoryUpdate,
        undefined,
    );
});

test('structured JSON parsing rejects a truncated root instead of accepting an inner object', () => {
    const truncated = `\`\`\`json
{
  "transitionMinutes": 165,
  "worldChanges": {
    "prophetBriefs": [],
    "gossipUpdates": []
  },
  "socialRelationshipEvidence": [
    {
      "sourceActorId": "canon_ronald_bilius_weasley",
      "targetActorId": "canon_seamus_finnigan"`;

    assert.throws(
        () => parseCompleteJsonObject(
            truncated,
        ),
        /root object closed/,
    );
    assert.deepEqual(
        parseCompleteJsonObject(
            'Result:\n{"outer":{"inner":true}}\nDone',
        ),
        {
            outer: {
                inner: true,
            },
        },
    );
    assert.deepEqual(
        parseCompleteJsonObject(
            `<think>
Let me analyze the relationship evidence first.
An invalid draft like {"scanComplete":false} must be ignored.
</think>
\`\`\`json
{"scanComplete":true,"reviews":[],"statements":[],"relationshipEvidence":[]}
\`\`\``,
        ),
        {
            scanComplete: true,
            reviews: [],
            statements: [],
            relationshipEvidence: [],
        },
    );
});

test('scene transition recovery keeps a complete core and drops only a truncated social tail', () => {
    const payload =
        createCurrentTransitionPackage();
    const ordered = {
        ...payload,
        socialStatements: [{
            subjectId:
                'minerva_mcgonagall',
            speakerId:
                'minerva_mcgonagall',
            category: 'education',
            textEn:
                'The reply form must be signed.',
            witnessedBy: ['player'],
            sourceMessageIds: [12],
        }],
        socialRelationshipEvidence: [{
            sourceActorId:
                'minerva_mcgonagall',
            targetActorId: 'tina_mother',
            type: 'trust',
            weightDelta: 1,
            summaryEn:
                'McGonagall trusted Tina\'s family to complete the reply.',
            witnessedBy: ['player'],
            sourceMessageIds: [12],
        }],
    };
    const serialized =
        JSON.stringify(ordered);
    const evidenceStart =
        serialized.indexOf(
            '"socialRelationshipEvidence"',
        );
    const truncated = serialized.slice(
        0,
        serialized.indexOf(
            '"summaryEn"',
            evidenceStart,
        ) + 18,
    );

    const recovered =
        recoverSceneTransitionPayload(
            truncated,
        );
    assert.equal(
        recovered.nextScene.id,
        payload.nextScene.id,
    );
    assert.equal(
        recovered.socialStatements.length,
        1,
    );
    assert.deepEqual(
        recovered
            .socialRelationshipEvidence,
        [],
    );
    const normalized =
        normalizeSceneTransitionPackage(
            recovered,
            createCurrentPlayingState(),
            { tier: 'medium' },
        );
    assert.equal(
        validateSceneTransitionPackage(
            normalized,
            createCurrentPlayingState(),
            { tier: 'medium' },
        ).valid,
        true,
    );
});
