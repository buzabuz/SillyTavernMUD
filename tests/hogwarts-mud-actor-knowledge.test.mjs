/* eslint-disable playwright/expect-expect */
import {
    createContextBudgetPlan,
} from '../public/scripts/extensions/hogwarts-mud/core/context-budget.js';
import {
    buildActorContinuityCapsules,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-knowledge.js';
import {
    TRANSFORMERS_EMBEDDING_MAX_TOKENS,
} from '../src/vectors/embedding.js';
import {
    createCurrentPlayingState,
    normalizeCurrentActorFixtureInPlace,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('actor continuity capsules override stale stranger labels without exposing secrets', () => {
    const state =
        createCurrentPlayingState();
    const hermione = {
        id:
            'canon_hermione_jean_granger',
        nameEn:
            'Hermione Jean Granger',
        roleEn: 'Student',
        relationshipToPlayerEn:
            'newly met stranger',
        impressionOfPlayerEn:
            'Boundary-free but impossible to forget.',
        firstImpressionOfPlayerEn:
            'A reckless girl with a wand.',
        firstImpressionClock:
            '1991-09-01 · 11:53',
        secretEn:
            'This must not enter continuity.',
        sharedMemories: {
            core: [],
            recent: [{
                id: 'train_memory',
                tier: 'recent',
                summaryEn:
                    'Shared a train compartment where Tina broke the window and scorched a textbook.',
                lastClock:
                    '1991-09-01 · 15:15',
            }],
            everyday: [],
        },
    };
    const lavender = {
        id:
            'canon_lavender_brown',
        nameEn:
            'Lavender Brown',
        roleEn: 'Student',
    };
    state.actorLibrary = [
        hermione,
        lavender,
    ];
    state.actors = [
        {
            ...hermione,
            present: true,
        },
        {
            ...lavender,
            present: true,
        },
    ];
    state.socialGraph = {
        version: 2,
        relationships: [
            {
                id: 'hermione_player',
                sourceActorId:
                    hermione.id,
                targetActorId:
                    'player',
                familiarity: 30,
                closeness: 35,
                warmth: 8,
                trust: 0,
                tension: 80,
                protectiveness: 8,
                evidenceIds: [],
            },
            {
                id:
                    'hermione_lavender',
                sourceActorId:
                    hermione.id,
                targetActorId:
                    lavender.id,
                familiarity: 15,
                closeness: 10,
                warmth: 8,
                trust: 0,
                tension: 0,
                protectiveness: 0,
                evidenceIds: [],
            },
        ],
        relationshipEvidence: [],
    };
    normalizeCurrentActorFixtureInPlace(
        state,
    );
    state.memorySynapse
        .appraisals.push({
            id: 'appraisal_train_memory',
            observerId:
                hermione.id,
            targetId: 'player',
            summaryEn:
                'Shared a train compartment where Tina broke the window and scorched a textbook.',
            sourceEventIds: [],
            activationSchemaIds: [],
            derivedSchemaIds: [],
            contextTags: [],
            confidence: 0.8,
            status: 'accepted',
            knowledgeSource:
                'witness',
            committedClock:
                '1991-09-01 · 15:15',
            historicalClaimAllowed:
                false,
        });
    state.actorMemoryIndex
        .byActorId[
            hermione.id
        ].recent = [{
            recordType:
                'appraisal',
            recordId:
                'appraisal_train_memory',
            addedClock:
                '1991-09-01 · 15:15',
        }];

    const [capsule] =
        buildActorContinuityCapsules(
            state,
            [hermione.id],
            createContextBudgetPlan(
                120000,
                12000,
            ),
        );

    assert.equal(
        capsule.hasMetPlayer,
        true,
    );
    assert.equal(
        capsule.relationshipToPlayer
            .stageEn,
        'friend',
    );
    assert.equal(
        capsule.relationshipToPlayer
            .closeness,
        35,
    );
    assert.equal(
        capsule.relationshipToPlayer
            .tension,
        80,
    );
    assert.deepEqual(
        capsule.knownActorIds,
        [lavender.id],
    );
    assert.deepEqual(
        capsule.memories
            .map(memory =>
                memory.summaryEn),
        [
            'Shared a train compartment where Tina broke the window and scorched a textbook.',
        ],
    );
    assert.equal(
        JSON.stringify(capsule)
            .includes(
                'Boundary-free but impossible to forget.',
            ),
        false,
    );
    assert.equal(
        JSON.stringify(capsule)
            .includes(
                'This must not enter continuity.',
            ),
        false,
    );
});

test('local transformer embeddings enforce a bounded sequence length', () => {
    assert.equal(
        TRANSFORMERS_EMBEDDING_MAX_TOKENS,
        512,
    );
});
