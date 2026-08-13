// Extracted from the helpers compatibility facade for Task 4.

import {
    findCanonCharacter,
} from '../canon-characters.js';

import {
    DURABLE_ACQUISITION_PATTERN,
    IMPORTANT_ITEM_PATTERN,
} from './inventory.js';

import {
    findLocalRoomPath,
} from './pathfinding.js';

import {
    ensureMentionedKnownActorMemories,
    normalizeScenePerformanceActorLocations,
} from './spatial-performance.js';

import {
    recoverImplicitTemporaryActorEntrances,
    validateActorPresenceResolution,
    validateItemUpdates,
    validateTemporaryActorEntrances,
} from './turn-authority.js';
import {
    normalizeItemOperation,
} from './item-schema.js';

export const NARRATIVE_TURN_PROTOCOL_VERSION =
    2;

const NARRATIVE_STATE_PROPOSAL_TYPES =
    new Set([
        'actor_activity',
        'actor_move',
        'actor_enter',
        'actor_exit',
        'social_hint',
        'item_update',
        'temporary_actor',
        'clue_reveal',
    ]);

function appendSettlementWarning(
    warnings,
    code,
    detail,
) {
    warnings.push({
        code: String(code || 'unknown'),
        detail: String(detail || '')
            .slice(0, 500),
    });
}

function compactNarrativeEventText(
    value,
) {
    const words = String(value || '')
        .replace(/\s+/gu, ' ')
        .trim()
        .split(/\s+/u)
        .filter(Boolean)
        .slice(0, 48);
    if (!words.length) {
        return '';
    }
    const text = words.join(' ');
    return /[.!?]["'’”)]?$/u.test(text)
        ? text
        : `${text}.`;
}

function deriveNarrativePublicEvent(
    payload,
) {
    const supplied = String(
        payload?.publicEventEn || '',
    ).trim();
    if (
        supplied &&
        !/player completes|player acts|characters respond/iu
            .test(supplied)
    ) {
        return compactNarrativeEventText(
            supplied,
        );
    }
    const progression = String(
        payload?.signals
            ?.sceneProgression
            ?.summaryEn ||
        payload?.sceneProgression
            ?.summaryEn ||
        '',
    ).trim();
    if (progression) {
        return compactNarrativeEventText(
            progression,
        );
    }
    const segments = Array.isArray(
        payload?.segments,
    )
        ? payload.segments
        : [];
    const narration = [...segments]
        .reverse()
        .find(segment =>
            segment?.type ===
                'narration' &&
            String(
                segment.textEn ||
                '',
            ).trim());
    if (narration) {
        return compactNarrativeEventText(
            narration.textEn,
        );
    }
    const dialogueActorIds = [
        ...new Set(
            segments
                .filter(segment =>
                    segment?.type ===
                        'dialogue')
                .map(segment =>
                    segment.actorId)
                .filter(Boolean),
        ),
    ];
    return dialogueActorIds.length
        ? `A conversation continued with ${dialogueActorIds.join(', ')}.`
        : 'The current scene continued.';
}

export function normalizeNarrativeTurnCore(
    source,
) {
    const payload =
        source &&
        typeof source === 'object' &&
        !Array.isArray(source)
            ? structuredClone(source)
            : {};
    const warnings = Array.isArray(
        payload.settlementWarnings,
    )
        ? payload.settlementWarnings
        : [];
    payload.protocolVersion =
        NARRATIVE_TURN_PROTOCOL_VERSION;
    payload.segments = Array.isArray(
        payload.segments,
    )
        ? payload.segments
        : [];
    payload.stateProposals =
        Array.isArray(
            payload.stateProposals,
        )
            ? payload.stateProposals
                .slice(0, 24)
            : [];
    payload.signals =
        payload.signals &&
        typeof payload.signals ===
            'object' &&
        !Array.isArray(payload.signals)
            ? payload.signals
            : {};
    payload.settlementWarnings =
        warnings;
    return payload;
}

function mergeActorUpdate(
    updates,
    actorId,
    patch,
) {
    if (!actorId) {
        return;
    }
    const previous =
        updates.get(actorId) || {
            id: actorId,
        };
    updates.set(actorId, {
        ...previous,
        ...patch,
        id: actorId,
    });
}

export function foldNarrativeTurnProposals(
    source,
) {
    const payload =
        normalizeNarrativeTurnCore(
            source,
        );
    const warnings =
        payload.settlementWarnings;
    const actorUpdates = new Map();
    if (
        payload.actorUpdates !==
            undefined &&
        !Array.isArray(
            payload.actorUpdates,
        )
    ) {
        appendSettlementWarning(
            warnings,
            'invalid_legacy_actor_updates',
            'actorUpdates was not an array and was ignored.',
        );
    }
    (
        Array.isArray(
            payload.actorUpdates,
        )
            ? payload.actorUpdates
            : []
    ).forEach(update => {
        if (
            update &&
            typeof update ===
                'object' &&
            !Array.isArray(update) &&
            update.id
        ) {
            mergeActorUpdate(
                actorUpdates,
                String(update.id),
                update,
            );
        }
    });
    const itemUpdates =
        Array.isArray(
            payload.itemUpdates,
        )
            ? [...payload.itemUpdates]
            : [];
    const entrances =
        Array.isArray(
            payload
                .temporaryActorEntrances,
        )
            ? [
                ...payload
                    .temporaryActorEntrances,
            ]
            : [];
    const revealedClues =
        Array.isArray(
            payload.revealedClues,
        )
            ? [...payload.revealedClues]
            : [];

    (
        payload.stateProposals ||
        []
    )
        .forEach(proposal => {
            if (
                !proposal ||
                typeof proposal !==
                    'object' ||
                Array.isArray(proposal) ||
                !NARRATIVE_STATE_PROPOSAL_TYPES
                    .has(proposal.type)
            ) {
                appendSettlementWarning(
                    warnings,
                    'unknown_state_proposal',
                    proposal?.type ||
                        'non-object proposal',
                );
                return;
            }
            const actorId = String(
                proposal.actorId || '',
            );
            if (
                [
                    'actor_activity',
                    'actor_move',
                    'actor_enter',
                    'actor_exit',
                    'social_hint',
                ].includes(
                    proposal.type,
                ) &&
                !actorId
            ) {
                appendSettlementWarning(
                    warnings,
                    'proposal_missing_actor',
                    proposal.type,
                );
                return;
            }
            if (
                proposal.type ===
                    'actor_activity'
            ) {
                mergeActorUpdate(
                    actorUpdates,
                    actorId,
                    {
                        currentActivityEn:
                            proposal
                                .currentActivityEn,
                    },
                );
            } else if (
                proposal.type ===
                    'actor_move'
            ) {
                mergeActorUpdate(
                    actorUpdates,
                    actorId,
                    {
                        currentActivityEn:
                            proposal
                                .currentActivityEn,
                        mapId:
                            proposal.mapId,
                        roomId:
                            proposal.roomId,
                    },
                );
            } else if (
                proposal.type ===
                    'actor_enter' ||
                proposal.type ===
                    'actor_exit'
            ) {
                mergeActorUpdate(
                    actorUpdates,
                    actorId,
                    {
                        present:
                            proposal.type ===
                                'actor_enter',
                        currentActivityEn:
                            proposal
                                .currentActivityEn,
                        ...(proposal.mapId
                            ? {
                                mapId:
                                    proposal
                                        .mapId,
                            }
                            : {}),
                        ...(proposal.roomId
                            ? {
                                roomId:
                                    proposal
                                        .roomId,
                            }
                            : {}),
                    },
                );
            } else if (
                proposal.type ===
                    'social_hint'
            ) {
                mergeActorUpdate(
                    actorUpdates,
                    actorId,
                    {
                        firstImpressionOfPlayerEn:
                            proposal
                                .firstImpressionOfPlayerEn,
                    },
                );
            } else if (
                proposal.type ===
                    'item_update'
            ) {
                if (
                    proposal.item &&
                    typeof proposal.item ===
                        'object' &&
                    !Array.isArray(
                        proposal.item,
                    )
                ) {
                    const operation =
                        normalizeItemOperation(
                            proposal.item
                                .operation ||
                            proposal.item
                                .action,
                        );
                    itemUpdates.push(
                        {
                            ...proposal.item,
                            ...(operation
                                ? {
                                    operation,
                                    action:
                                        operation,
                                }
                                : {}),
                        },
                    );
                } else {
                    appendSettlementWarning(
                        warnings,
                        'proposal_missing_item',
                        'item_update',
                    );
                }
            } else if (
                proposal.type ===
                    'temporary_actor'
            ) {
                const actor =
                    proposal.actor;
                if (
                    actor &&
                    typeof actor ===
                        'object' &&
                    !Array.isArray(actor)
                ) {
                    entrances.push(actor);
                    mergeActorUpdate(
                        actorUpdates,
                        String(
                            actor.id || '',
                        ),
                        {
                            present: true,
                            currentActivityEn:
                                proposal
                                    .currentActivityEn ||
                                actor
                                    .currentActivityEn,
                        },
                    );
                } else {
                    appendSettlementWarning(
                        warnings,
                        'proposal_missing_temporary_actor',
                        'temporary_actor',
                    );
                }
            } else if (
                proposal.type ===
                    'clue_reveal'
            ) {
                if (
                    proposal.clue &&
                    typeof proposal.clue ===
                        'object' &&
                    !Array.isArray(
                        proposal.clue,
                    )
                ) {
                    revealedClues.push(
                        proposal.clue,
                    );
                }
            }
        });
    payload.actorUpdates = [
        ...actorUpdates.values(),
    ];
    payload.itemUpdates =
        itemUpdates;
    payload.temporaryActorEntrances =
        entrances;
    payload.revealedClues =
        revealedClues;
    delete payload.stateProposals;
    return payload;
}

function sanitizeNarrativeActorUpdates(
    payload,
    worldState,
) {
    const warnings =
        payload.settlementWarnings;
    const temporaryIds = new Set(
        (
            payload
                .temporaryActorEntrances ||
            []
        ).map(actor =>
            actor.id),
    );
    const knownActors = new Map(
        (
            worldState.actors ||
            []
        ).map(actor => [
            actor.id,
            actor,
        ]),
    );
    const validActorIds = new Set([
        ...knownActors.keys(),
        ...(
            worldState
                .actorLibrary ||
            []
        ).map(actor =>
            actor.id),
        ...temporaryIds,
    ]);
    const allowedKeys = new Set([
        'id',
        'present',
        'currentActivityEn',
        'mapId',
        'roomId',
        'firstImpressionOfPlayerEn',
    ]);
    const merged = new Map();
    (
        payload.actorUpdates || []
    ).forEach(source => {
        if (
            !source ||
            typeof source !==
                'object' ||
            Array.isArray(source) ||
            !validActorIds.has(
                source.id,
            )
        ) {
            appendSettlementWarning(
                warnings,
                'invalid_actor_proposal',
                source?.id || '?',
            );
            return;
        }
        const update =
            Object.fromEntries(
                Object.entries(source)
                    .filter(([key]) =>
                        allowedKeys.has(
                            key,
                        )),
            );
        if (
            update.present !==
                undefined &&
            typeof update.present !==
                'boolean'
        ) {
            delete update.present;
            appendSettlementWarning(
                warnings,
                'invalid_actor_presence_hint',
                update.id,
            );
        }
        if (
            update.currentActivityEn !=
                null
        ) {
            update.currentActivityEn =
                String(
                    update
                        .currentActivityEn ||
                    '',
                ).trim();
            if (
                !update
                    .currentActivityEn
            ) {
                delete update
                    .currentActivityEn;
            }
        }
        const actor =
            knownActors.get(update.id);
        if (
            update.mapId ||
            update.roomId
        ) {
            const currentMapId =
                actor?.mapId ||
                worldState.map
                    ?.activeMapId;
            const currentRoomId =
                actor?.roomId ||
                worldState.map
                    ?.currentLocalNodeId;
            const targetMapId =
                update.mapId ||
                currentMapId;
            const validRoute =
                targetMapId ===
                    currentMapId &&
                update.roomId &&
                findLocalRoomPath(
                    targetMapId,
                    currentRoomId,
                    update.roomId,
                    worldState.map,
                );
            if (!validRoute) {
                delete update.mapId;
                delete update.roomId;
                appendSettlementWarning(
                    warnings,
                    'invalid_actor_move_proposal',
                    update.id,
                );
            } else {
                update.mapId =
                    targetMapId;
            }
        }
        if (
            update.present ===
                false &&
            !update.currentActivityEn
        ) {
            update.currentActivityEn =
                'Leaving the immediate scene.';
        }
        const meaningfulKeys =
            Object.keys(update)
                .filter(key =>
                    key !== 'id');
        if (
            !meaningfulKeys.length
        ) {
            return;
        }
        mergeActorUpdate(
            merged,
            update.id,
            update,
        );
    });
    payload.actorUpdates = [
        ...merged.values(),
    ];
    return payload;
}

function sanitizeNarrativeTemporaryActors(
    payload,
    worldState,
) {
    const warnings =
        payload.settlementWarnings;
    const accepted = [];
    const canonicalRedirects =
        new Map();
    const knownCanonActorIds =
        new Map();
    [
        ...(worldState
            .actorLibrary || []),
        ...(worldState.actors || []),
    ].forEach(actor => {
        const canon =
            findCanonCharacter(
                actor.canonCatalogId,
            ) ||
            findCanonCharacter(
                actor.id,
            ) ||
            findCanonCharacter(
                actor.nameEn,
            );
        if (
            canon &&
            (
                !knownCanonActorIds.has(
                    canon.id,
                ) ||
                actor.id === canon.id
            )
        ) {
            knownCanonActorIds.set(
                canon.id,
                actor.id,
            );
        }
    });
    (
        payload
            .temporaryActorEntrances ||
        []
    ).forEach(actor => {
        const canon =
            findCanonCharacter(
                actor?.id,
            ) ||
            findCanonCharacter(
                actor?.nameEn,
            );
        const knownActorId =
            canon
                ? knownCanonActorIds.get(
                    canon.id,
                )
                : '';
        if (canon && knownActorId) {
            canonicalRedirects.set(
                actor.id,
                knownActorId,
            );
            return;
        }
        if (canon) {
            appendSettlementWarning(
                warnings,
                'canon_actor_cannot_be_temporary',
                `${actor.nameEn || actor.id} 必须由 Canon 目录以稳定 ID ${canon.id} 入场。`,
            );
            return;
        }
        const validation =
            validateTemporaryActorEntrances(
                [actor],
                {
                    ...worldState,
                    actors: [
                        ...(
                            worldState
                                .actors ||
                            []
                        ),
                        ...accepted,
                    ],
                },
            );
        if (!validation.valid) {
            appendSettlementWarning(
                warnings,
                'invalid_temporary_actor_proposal',
                validation.errors
                    .join('；'),
            );
            return;
        }
        accepted.push(actor);
    });
    payload.temporaryActorEntrances =
        accepted;
    if (!canonicalRedirects.size) {
        return payload;
    }
    const redirectId = actorId =>
        canonicalRedirects.get(
            actorId,
        ) || actorId;
    payload.segments = (
        payload.segments || []
    ).map(segment => ({
        ...segment,
        ...(segment.actorId
            ? {
                actorId:
                    redirectId(
                        segment.actorId,
                    ),
            }
            : {}),
    }));
    if (
        Array.isArray(
            payload.actorPresence
                ?.presentActorIdsAfterTurn,
        )
    ) {
        payload.actorPresence
            .presentActorIdsAfterTurn = [
                ...new Set(
                    payload.actorPresence
                        .presentActorIdsAfterTurn
                        .map(redirectId),
                ),
            ];
    }
    const actorUpdates =
        new Map();
    (
        payload.actorUpdates || []
    ).forEach(update => {
        const actorId =
            redirectId(update.id);
        mergeActorUpdate(
            actorUpdates,
            actorId,
            {
                ...update,
                id: actorId,
            },
        );
    });
    payload.actorUpdates = [
        ...actorUpdates.values(),
    ];
    return payload;
}

function sanitizeNarrativeItemsAndClues(
    payload,
    worldState,
    playerAction,
) {
    const warnings =
        payload.settlementWarnings;
    const narrative = (
        payload.segments || []
    )
        .map(segment =>
            segment.textEn)
        .join(' ');
    payload.itemUpdates = (
        payload.itemUpdates || []
    ).filter(update => {
        const errors =
            validateItemUpdates(
                [update],
                worldState,
                playerAction,
                narrative,
                {
                    requireNarrativeAcquisition:
                        false,
                },
            );
        if (errors.length) {
            appendSettlementWarning(
                warnings,
                'invalid_item_proposal',
                errors.join('；'),
            );
            return false;
        }
        return true;
    });
    if (
        IMPORTANT_ITEM_PATTERN.test(
            narrative,
        ) &&
        DURABLE_ACQUISITION_PATTERN
            .test(narrative) &&
        !payload.itemUpdates.some(
            update =>
                update.action ===
                    'acquire',
        )
    ) {
        appendSettlementWarning(
            warnings,
            'possible_untracked_item',
            'The narrative may contain an important item acquisition without a valid item proposal.',
        );
    }
    const activeArc = (
        worldState.storyArcs ||
        []
    ).find(arc =>
        arc.status === 'active');
    const clueIds = new Set(
        (
            activeArc?.cluePlan ||
            []
        ).map(clue =>
            clue.id),
    );
    payload.revealedClues = (
        payload.revealedClues ||
        []
    ).filter(clue => {
        const valid =
            clueIds.has(clue?.id) &&
            String(
                clue?.labelEn || '',
            ).trim() &&
            String(
                clue?.detailEn || '',
            ).trim();
        if (!valid) {
            appendSettlementWarning(
                warnings,
                'invalid_clue_proposal',
                clue?.id || '?',
            );
        }
        return valid;
    });
    return payload;
}

export function reconcileNarrativeTurnAuthority(
    source,
    worldState,
    {
        playerAction = '',
        admittedActors = [],
    } = {},
) {
    let payload =
        foldNarrativeTurnProposals(
            source,
        );
    payload.publicEventEn =
        deriveNarrativePublicEvent(
            payload,
        );
    payload =
        recoverImplicitTemporaryActorEntrances(
            payload,
            worldState,
        );
    payload =
        sanitizeNarrativeTemporaryActors(
            payload,
            worldState,
        );
    payload =
        sanitizeNarrativeActorUpdates(
            payload,
            worldState,
        );
    payload =
        sanitizeNarrativeItemsAndClues(
            payload,
            worldState,
            playerAction,
        );
    if (
        payload.actorPresence != null
    ) {
        const presenceErrors =
            validateActorPresenceResolution(
                payload.actorPresence,
                worldState,
                payload.actorUpdates,
                {
                    authorizedEntranceIds:
                        (
                            payload
                                .temporaryActorEntrances ||
                            []
                        ).map(actor =>
                            actor.id),
                },
            );
        if (presenceErrors.length) {
            appendSettlementWarning(
                payload
                    .settlementWarnings,
                'invalid_actor_presence_snapshot',
                presenceErrors
                    .join('；'),
            );
            delete payload.actorPresence;
        }
    }
    payload =
        normalizeScenePerformanceActorLocations(
            payload,
            worldState,
        );
    payload =
        ensureMentionedKnownActorMemories(
            payload,
            worldState,
            admittedActors,
        );
    return payload;
}

export function finalizeNarrativeTurnPerformance(
    source,
    {
        movementResolution = null,
        momentumDirective = null,
        checkResolution = null,
    } = {},
) {
    const payload =
        normalizeNarrativeTurnCore(
            source,
        );
    const signals =
        payload.signals || {};
    payload.publicEventEn =
        deriveNarrativePublicEvent(
            payload,
        );
    payload.eventEnded =
        typeof signals.eventEnded ===
            'boolean'
            ? signals.eventEnded
            : payload.eventEnded ===
                true;
    payload.pacingBeatRealized =
        typeof signals
            .pacingBeatRealized ===
            'boolean'
            ? signals
                .pacingBeatRealized
            : payload
                .pacingBeatRealized ===
                true;
    payload.checkApplied =
        Boolean(checkResolution);
    const proposedProgression =
        signals.sceneProgression ||
        payload.sceneProgression;
    const progressionTypes =
        new Set([
            'npc_initiative',
            'access_change',
            'practical_step',
            'new_information',
            'social_shift',
        ]);
    payload.sceneProgression =
        proposedProgression &&
        typeof proposedProgression ===
            'object' &&
        !Array.isArray(
            proposedProgression,
        ) &&
        progressionTypes.has(
            proposedProgression.type,
        ) &&
        String(
            proposedProgression
                .summaryEn ||
            '',
        ).trim()
            ? {
                type:
                    proposedProgression
                        .type,
                summaryEn:
                    compactNarrativeEventText(
                        proposedProgression
                            .summaryEn,
                    ),
                completedRequestedStep:
                    proposedProgression
                        .completedRequestedStep ===
                    true,
            }
            : {
                type:
                    movementResolution
                        ?.moved
                        ? 'access_change'
                        : checkResolution
                            ? 'practical_step'
                            : 'social_shift',
                summaryEn:
                    payload
                        .publicEventEn,
                completedRequestedStep:
                    false,
            };
    payload.settlementWarnings = [
        ...new Map(
            (
                payload
                    .settlementWarnings ||
                []
            ).map(warning => [
                `${warning.code}:${warning.detail}`,
                warning,
            ]),
        ).values(),
    ].slice(-24);
    if (
        momentumDirective
            ?.explicitProgressionRequest &&
        !payload.sceneProgression
            .completedRequestedStep
    ) {
        appendSettlementWarning(
            payload
                .settlementWarnings,
            'unconfirmed_requested_progression',
            'The narrative was accepted without a structured completion signal.',
        );
    }
    delete payload.stateProposals;
    delete payload.signals;
    return payload;
}

export function settleNarrativeTurnPerformance(
    source,
    worldState,
    options = {},
) {
    const core =
        normalizeNarrativeTurnCore(
            source,
        );
    const folded =
        foldNarrativeTurnProposals(
            core,
        );
    const reconciled =
        reconcileNarrativeTurnAuthority(
            folded,
            worldState,
            {
                playerAction:
                    options.playerAction,
                admittedActors:
                    options
                        .admittedActors ||
                    [],
            },
        );
    return finalizeNarrativeTurnPerformance(
        reconciled,
        options,
    );
}
