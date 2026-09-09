/* global globalThis */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createTurnPerformanceWorkflow } from '../public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js';
import { createContextBudgetPlan } from '../public/scripts/extensions/hogwarts-mud/core/context-budget.js';
import { createTurnPerformanceBudget, getDeterministicTimePolicy } from '../public/scripts/extensions/hogwarts-mud/domain/turn-time.js';
import { buildBehavioralEnvironment } from '../public/scripts/extensions/hogwarts-mud/domain/time-environment.js';
import { buildSpatialContext } from '../public/scripts/extensions/hogwarts-mud/domain/spatial-reconciliation.js';
import {
    buildStructuredPlayerTurnSequence, removeExplicitAddressDirective, resolvePlayerAddressing,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-identity.js';
import { buildTemporaryActorPromotionPolicy } from '../public/scripts/extensions/hogwarts-mud/domain/pacing-validation.js';
import { parseItemOperationDirectives } from '../public/scripts/extensions/hogwarts-mud/domain/item-directive.js';
import { CANON_CAST_IDENTITY_CONTRACT, CANON_WIT_TONE_CONTRACT } from '../public/scripts/extensions/hogwarts-mud/domain/campaign.js';
import { NPC_IDENTITY_PROMPT_BOUNDARY } from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-prompt-projection.js';
import { getAuthoritativeSceneSpells } from '../public/scripts/extensions/hogwarts-mud/domain/spell-proposals.js';
import { projectPeoplePanel } from '../public/scripts/extensions/hogwarts-mud/people-projection.js';
import { createRoleTransportEnvelope, measurePromptMessages } from '../public/scripts/extensions/hogwarts-mud/domain/prompt-budget-allocator.js';
import { createLocalSemanticAdapter } from '../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';
import { buildLocalMapModel } from '../public/scripts/extensions/hogwarts-mud/domain/maps.js';
import { findLocalRoomPath } from '../public/scripts/extensions/hogwarts-mud/domain/pathfinding.js';
import { assemblePostTurnSemanticPrompt } from '../public/scripts/extensions/hogwarts-mud/domain/post-turn-prompt-assembly.js';
import { selectPostOutputSchema, selectLocalPostOutputSchema } from '../public/scripts/extensions/hogwarts-mud/domain/post-bookkeeping-contract.js';
import { POST_TURN_JSON_SCHEMA, LOW_POST_TURN_JSON_SCHEMA } from '../public/scripts/extensions/hogwarts-mud/domain/post-turn-semantic-contract.js';
import { POST_RECOVERY_FAMILIES } from '../public/scripts/extensions/hogwarts-mud/domain/post-recovery.js';
import { preserveSceneNarrative } from '../public/scripts/extensions/hogwarts-mud/domain/narrative-preservation.js';
import { parseCompleteJsonObject } from '../public/scripts/extensions/hogwarts-mud/core/json-recovery.js';

const sourcePath = process.argv.find(arg => arg.startsWith('--save='))?.slice(7)
    || 'data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl';
const before = fs.readFileSync(sourcePath, 'utf8');
const rows = before.trim().split('\n').map(JSON.parse);
const state = structuredClone(rows[0].chat_metadata.hogwartsMud);
const player = rows.at(-1);
const slot = state.modelSlots.low;
const requestMode = process.argv.find(arg => arg.startsWith('--request='))?.slice(10);
globalThis.fetch = async () => { throw new Error('NETWORK_FORBIDDEN_BUILD_ONLY'); };
const workflow = createTurnPerformanceWorkflow({
    CANON_CAST_IDENTITY_CONTRACT, CANON_WIT_TONE_CONTRACT, NPC_IDENTITY_PROMPT_BOUNDARY,
    buildBehavioralEnvironment, buildSpatialContext, buildStructuredPlayerTurnSequence,
    buildTemporaryActorPromotionPolicy, parseItemOperationDirectives, removeExplicitAddressDirective,
    resolvePlayerAddressing, getAuthoritativeSceneSpells, createContextBudgetPlan,
    getActiveAddressingState: current => {
        const ids = new Set(projectPeoplePanel(current).activePeople.map(actor => actor.id));
        return { ...current, actors: current.actors.map(actor => ({ ...actor, present: ids.has(actor.id) })) };
    },
});
const plan = createContextBudgetPlan(slot.contextSize, slot.maxResponseLength);
const budget = createTurnPerformanceBudget(player.mes, getDeterministicTimePolicy(), {
    activeNamedActorCount: projectPeoplePanel(state).activePeople.length,
    adjudicatedMinutes: player.extra?.hogwartsMud?.localAdjudication?.result?.temporal?.elapsedMinutes,
});
const scene = workflow.createScenePerformancePrompt(
    state, player.mes, budget, [], null, workflow.createSceneMomentumDirective(state, budget),
    null, player.extra?.hogwartsMud?.addressing, [], plan,
);
const envelope = createRoleTransportEnvelope({ json: true, maxResponseLength: slot.maxResponseLength });
const outputs = {
    scene: {
        messages: scene,
        outputSchema: null,
        measurement: measurePromptMessages(scene, {
            transportJsonSchema: envelope.transportJsonSchema, runtimeWrapper: envelope.runtimeWrapper,
        }),
        capacity: plan.maxPromptCharacters,
    },
};
const sceneRow = rows.findLastIndex(row => row.extra?.hogwartsMud?.turnTransaction);
const freshScenePath = process.argv.find(arg => arg.startsWith('--scene-response='))?.slice(17);
const freshPerformance = freshScenePath
    ? preserveSceneNarrative(parseCompleteJsonObject(fs.readFileSync(freshScenePath, 'utf8'))) : null;
const transaction = freshPerformance ? workflow.buildSceneTransaction(freshPerformance, budget)
    : structuredClone(rows[sceneRow].extra.hogwartsMud.turnTransaction);
const sceneInput = JSON.parse(scene[1].content);
transaction.narrativeFirst = true;
transaction.speakers = freshPerformance?.speakers || [];
transaction.postContext = {
    speakerDeclarations: transaction.speakers,
    temporaryActorPromotionPolicy: sceneInput.actionOpportunities.find(entry =>
        entry.temporaryActorPromotionPolicy)?.temporaryActorPromotionPolicy || null,
    firstMeetingActorIds: state.actors.filter(actor => actor.present !== false
        && !state.actorMemoryIndex?.byActorId?.[actor.id]?.firstImpressionRef).map(actor => actor.id),
    historicalSupport: Object.fromEntries(Object.entries(sceneInput.memoryActivations?.byActorId || {})
        .map(([id, capsule]) => [id, [...new Set((capsule.supportingEvents || []).flatMap(event =>
            (event.sourceRefs || []).filter(ref => ref.type === 'event').map(ref => ref.id)))]])),
};
for (const provider of ['low', 'local']) {
    for (const supplement of [false, true]) {
        const mode = `${provider}${supplement ? '-supplement' : ''}`;
        let input;
        const intercept = value => {
            input = value;
            throw new Error('BUILD_ONLY_DISPATCH_INTERCEPTED');
        };
        const adapter = createLocalSemanticAdapter({
            buildLocalMapModel, findLocalRoomPath, buildStructuredPlayerTurnSequence,
            getRequestHeaders: () => ({}),
            fetchImpl: async (url, options) => {
                if (url.endsWith('/local/observe')) return intercept(JSON.parse(options.body).input);
                throw new Error('NETWORK_FORBIDDEN_BUILD_ONLY');
            },
            sendPostTurnSemanticRequest: async (_slot, messages) => intercept(JSON.parse(messages[1].content)),
        });
        const warn = console.warn;
        console.warn = () => {};
        let result;
        try {
            result = await adapter.requestPostTurnSemanticObservation(
                { ...state, postTurnSemanticProvider: provider }, freshPerformance ? player.mes : rows[sceneRow - 1].mes,
                structuredClone(transaction), {
                    settlementOnly: true,
                    ...(supplement ? {
                        recoveryTargets: { families: POST_RECOVERY_FAMILIES },
                        acceptedConstraints: {},
                    } : {}),
                },
            );
        } finally { console.warn = warn; }
        if (!input) {
            outputs[mode] = { fit: false, diagnostics: result.promptAssembly };
            continue;
        }
        const assembled = assemblePostTurnSemanticPrompt({ provider, input, lowSlot: slot });
        outputs[mode] = {
            messages: assembled.messages,
            outputSchema: (provider === 'local' ? selectLocalPostOutputSchema : selectPostOutputSchema)(
                provider === 'low' || supplement ? LOW_POST_TURN_JSON_SCHEMA : POST_TURN_JSON_SCHEMA, input,
            ),
            fit: assembled.fit,
            measurement: assembled.diagnostics.finalMeasurement,
            capacity: assembled.diagnostics.capacity.maximumCharacters,
        };
    }
}
if (before !== fs.readFileSync(sourcePath, 'utf8')) throw new Error('Source save changed during measurement.');
if (requestMode) {
    const output = outputs[requestMode];
    if (!output?.messages) throw new Error(`Requested envelope unavailable: ${requestMode}`);
    console.log(JSON.stringify({ messages: output.messages, outputSchema: output.outputSchema }));
} else {
    console.log(JSON.stringify({
        stateRevision: state.stateRevision, realModelCalls: 0, sourceUnchanged: true,
        note: 'Current save with empty retrieval; Post uses last committed prose, not failed response replay.',
        requests: Object.fromEntries(Object.entries(outputs).map(([mode, output]) => [mode, {
            fit: output.fit ?? true,
            measurement: output.measurement || output.diagnostics?.finalMeasurement,
            capacity: output.capacity || output.diagnostics?.capacity?.maximumCharacters,
            sha256: output.messages
                ? createHash('sha256').update(JSON.stringify(output.messages)).digest('hex') : null,
        }])),
    }, null, 2));
}
