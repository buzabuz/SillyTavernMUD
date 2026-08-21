import {
    END,
    START,
    StateGraph,
    StateSchema,
} from '@langchain/langgraph';
import { z } from 'zod';

import {
    finalizeNarrativeTurnPerformance,
    foldNarrativeTurnProposals,
    normalizeNarrativeTurnCore,
    reconcileNarrativeTurnAuthority,
} from '../../public/scripts/extensions/hogwarts-mud/domain/turn-protocol.js';

const TurnSettlementState =
    new StateSchema({
        input: z.any(),
        core: z.any().optional(),
        folded: z.any().optional(),
        reconciled: z.any().optional(),
        output: z.any().optional(),
    });

function collectNarrativeCore(state) {
    return {
        core:
            normalizeNarrativeTurnCore(
                state.input?.payload,
            ),
    };
}

function foldStateProposals(state) {
    return {
        folded:
            foldNarrativeTurnProposals(
                state.core,
            ),
    };
}

function reconcileAuthority(state) {
    const input = state.input || {};
    return {
        reconciled:
            reconcileNarrativeTurnAuthority(
                state.folded,
                input.worldState,
                {
                    playerAction:
                        input.playerAction,
                    admittedActors:
                        input.admittedActors,
                },
            ),
    };
}

function finalizeTurn(state) {
    const input = state.input || {};
    return {
        output:
            finalizeNarrativeTurnPerformance(
                state.reconciled,
                {
                    movementPreflight:
                        input
                            .movementPreflight,
                    momentumDirective:
                        input
                            .momentumDirective,
                    checkResolution:
                        input.checkResolution,
                },
            ),
    };
}

const turnSettlementGraph =
    new StateGraph(
        TurnSettlementState,
    )
        .addNode(
            'accept_narrative_core',
            collectNarrativeCore,
        )
        .addNode(
            'fold_sparse_proposals',
            foldStateProposals,
        )
        .addNode(
            'reconcile_authority',
            reconcileAuthority,
        )
        .addNode(
            'finalize_turn',
            finalizeTurn,
        )
        .addEdge(
            START,
            'accept_narrative_core',
        )
        .addEdge(
            'accept_narrative_core',
            'fold_sparse_proposals',
        )
        .addEdge(
            'fold_sparse_proposals',
            'reconcile_authority',
        )
        .addEdge(
            'reconcile_authority',
            'finalize_turn',
        )
        .addEdge(
            'finalize_turn',
            END,
        )
        .compile();

export async function runTurnSettlementGraph(
    input,
) {
    if (
        !input ||
        typeof input !== 'object' ||
        !input.worldState ||
        typeof input.worldState !==
            'object'
    ) {
        throw new Error(
            'Turn settlement input is invalid.',
        );
    }
    const result =
        await turnSettlementGraph.invoke({
            input,
        });
    if (!result.output) {
        throw new Error(
            'Turn settlement graph produced no output.',
        );
    }
    return result.output;
}
