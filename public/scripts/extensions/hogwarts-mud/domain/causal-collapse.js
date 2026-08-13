// Extracted from the helpers compatibility facade for Task 4.

import {
    resolvePlayerAddressing,
} from './actor-identity.js';

import {
    normalizeCausalCollapseState,
} from './causal-state.js';

import {
    parseExplicitMovementDirective,
} from './movement.js';

function playerActionMentionsItem(
    item,
    playerAction,
) {
    const action = String(
        playerAction || '',
    ).normalize('NFKC');
    const labels = [
        item.id,
        item.labelEn,
        item.label,
    ]
        .map(value =>
            String(value || '')
                .trim()
                .normalize('NFKC'))
        .filter(value =>
            value.length >= 2);
    return labels.some(label => {
        if (
            /[\p{Script=Han}]/u
                .test(label)
        ) {
            return action.includes(label);
        }
        const escaped =
            label.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&',
            );
        return new RegExp(
            `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
            'iu',
        ).test(action);
    });
}

function getPlayerRelationshipMilestone(
    worldState,
    actorId,
) {
    const edges =
        (
            worldState.socialGraph
                ?.relationships ||
            []
        ).filter(edge =>
            (
                edge.sourceActorId ===
                    actorId &&
                edge.targetActorId ===
                    'player'
            ) ||
            (
                edge.sourceActorId ===
                    'player' &&
                edge.targetActorId ===
                    actorId
            ));
    const structuralTags =
        new Set(
            edges.flatMap(edge =>
                edge.structuralTags ||
                []),
        );
    if (
        structuralTags.has(
            'romantic_interest',
        )
    ) {
        return 'romantic_interest';
    }
    if (structuralTags.has('enemy')) {
        return 'enemy';
    }
    if (
        structuralTags.has('rivalry') ||
        structuralTags.has('rival')
    ) {
        return 'rival';
    }
    return edges.some(edge =>
        Number(edge.closeness || 0) >=
            35) ||
        structuralTags.has('friend')
        ? 'friend'
        : '';
}

export function detectCausalCollapseOpportunity(
    worldState = {},
    playerAction = '',
) {
    const state =
        normalizeCausalCollapseState(
            worldState
                .causalCollapse,
        );
    const sceneId =
        String(
            worldState.scene?.id ||
            '',
        );
    const checkedKeys =
        new Set(
            state.checkedSlots
                .map(entry =>
                    entry.key),
        );
    const boundInScene =
        state.records.filter(record =>
            record.sceneId ===
                sceneId)
            .length;
    if (
        !sceneId ||
        boundInScene >=
            state
                .maximumBindingsPerScene
    ) {
        return null;
    }
    const addressing =
        resolvePlayerAddressing(
            worldState,
            playerAction,
        );
    const directBlocks =
        addressing.valid
            ? (
                addressing.blocks ||
                []
            ).filter(block =>
                block.mode ===
                    'direct' &&
                block.targetActorId)
            : [];
    const directSpeechLength =
        directBlocks.reduce(
            (total, block) =>
                total +
                String(
                    block.speechText ||
                    '',
                ).trim().length,
            0,
        );
    if (directSpeechLength >= 12) {
        for (
            const actorId of [
                ...new Set(
                    directBlocks.map(
                        block =>
                            block
                                .targetActorId,
                    ),
                ),
            ]
        ) {
            const milestone =
                getPlayerRelationshipMilestone(
                    worldState,
                    actorId,
                );
            const milestoneKey =
                milestone
                    ? `actor:${actorId}:relationship:${milestone}`
                    : '';
            const firstDeepKey =
                `actor:${actorId}:first_deep`;
            const key =
                milestoneKey &&
                !checkedKeys.has(
                    milestoneKey,
                )
                    ? milestoneKey
                    : !checkedKeys.has(
                        firstDeepKey,
                    )
                        ? firstDeepKey
                        : '';
            if (key) {
                return {
                    key,
                    type:
                        milestoneKey ===
                            key
                            ? 'relationship_upgrade'
                            : 'first_deep_conversation',
                    focusActorId:
                        actorId,
                    mapId:
                        worldState.map
                            ?.activeMapId ||
                        '',
                    roomId:
                        worldState.map
                            ?.currentLocalNodeId ||
                        '',
                    itemId: '',
                };
            }
        }
    }
    if (
        parseExplicitMovementDirective(
            playerAction,
        )
    ) {
        const mapId = String(
            worldState.map
                ?.activeMapId ||
            '',
        );
        const roomId = String(
            worldState.map
                ?.currentLocalNodeId ||
            '',
        );
        const key =
            `location:${mapId}:${roomId}:first_observation`;
        if (
            mapId &&
            roomId &&
            !checkedKeys.has(key)
        ) {
            return {
                key,
                type:
                    'first_location_observation',
                focusActorId: '',
                mapId,
                roomId,
                itemId: '',
            };
        }
    }
    if (
        /(?:检查|查看|观察|研究|翻看|inspect|examine|study|look at)/iu
            .test(
                String(
                    playerAction || '',
                ),
            )
    ) {
        const item = (
            worldState.items || []
        ).find(candidate =>
            [
                'key',
                'important',
            ].includes(
                candidate.importance,
            ) &&
            playerActionMentionsItem(
                candidate,
                playerAction,
            ));
        if (item) {
            const key =
                `item:${item.id}:first_inspection`;
            if (!checkedKeys.has(key)) {
                return {
                    key,
                    type:
                        'first_item_inspection',
                    focusActorId: '',
                    mapId:
                        worldState.map
                            ?.activeMapId ||
                        '',
                    roomId:
                        worldState.map
                            ?.currentLocalNodeId ||
                        '',
                    itemId:
                        item.id,
                };
            }
        }
    }
    return null;
}
