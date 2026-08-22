import {
    parseItemOperationDirectives,
} from './item-directive.js';
import {
    isItemVisibleToPlayer,
} from './item-schema.js';
import {
    normalizeInventoryItem,
} from './inventory.js';

/**
 * Field routes: vcon013.input.itemCandidates, dynamic.inventory.items.
 * See .trae/specs/hogwarts-runtime-contracts/model-field-routes.md.
 */

/**
 * @typedef {object} PostItemContextInput
 * @property {Record<string, any>} [state]
 * @property {string} [playerAction]
 * @property {Array<{ textEn?: string }>} [narrativeSegments]
 */

function normalizeReferenceText(
    value,
) {
    return String(value || '')
        .normalize('NFKC')
        .toLocaleLowerCase()
        .replace(
            /[^\p{L}\p{N}]+/gu,
            ' ',
        )
        .replace(/\s+/gu, ' ')
        .trim();
}

function containsWholeLabel(
    source,
    label,
) {
    const normalizedSource =
        normalizeReferenceText(
            source,
        );
    const normalizedLabel =
        normalizeReferenceText(
            label,
        );
    return Boolean(
        normalizedSource &&
        normalizedLabel &&
        ` ${normalizedSource} `.includes(
            ` ${normalizedLabel} `,
        ),
    );
}

function resolveCurrentRoom(
    state,
) {
    return {
        mapId:
            String(
                state?.map?.activeMapId ||
                state?.spatial?.player?.mapId ||
                state?.scene?.mapId ||
                '',
            ),
        roomId:
            String(
                state?.map?.currentLocalNodeId ||
                state?.spatial?.player?.roomId ||
                state?.scene?.roomId ||
                '',
            ),
    };
}

function buildKnownActorIds(
    state,
) {
    return [
        ...new Set([
            ...(
                state?.actorLibrary ||
                []
            ).map(actor =>
                actor.id),
            ...(
                state?.actors ||
                []
            ).map(actor =>
                actor.id),
        ].filter(Boolean)),
    ];
}

function createInventoryContextRecord(
    source,
    normalized,
) {
    return {
        id:
            normalized.id,
        labelEn:
            normalized.labelEn ||
            '',
        label:
            source.label ||
            normalized.labelEn ||
            '',
        appearanceEn:
            normalized.appearanceEn ||
            '',
        type:
            normalized.type ||
            'other',
        ownerId:
            normalized.ownerId ||
            'player',
        holderId:
            normalized.holderId ||
            '',
        state:
            normalized.state ||
            'intact',
        isEquipped:
            normalized.isEquipped ===
            true,
    };
}

function isIndependentRoomItem(
    item,
    room,
) {
    return [
        'whole',
        'remains',
    ].includes(
        item.physicalForm,
    ) &&
        !item.holderId &&
        item.location?.placement !==
            'with_holder' &&
        item.location?.mapId ===
            room.mapId &&
        item.location?.roomId ===
            room.roomId;
}

/**
 * Selects formal Items visible to one completed Post turn. The selector is
 * input-only: it never interprets an operation or mutates Item State.
 *
 * @param {PostItemContextInput} input
 */
export function selectPostItemContext(
    {
        state,
        playerAction = '',
        narrativeSegments = [],
    } = {},
) {
    const room =
        resolveCurrentRoom(state);
    const knownActorIds =
        buildKnownActorIds(state);
    const sourceItems =
        Array.isArray(state?.items)
            ? state.items
            : [];
    const visibleItems =
        sourceItems
            .map((source, index) => ({
                source,
                normalized:
                    normalizeInventoryItem(
                        source,
                        index,
                    ),
            }))
            .filter(({ normalized }) =>
                isItemVisibleToPlayer(
                    normalized,
                    knownActorIds,
                ))
            .filter(({ normalized }) =>
                [
                    'whole',
                    'remains',
                ].includes(
                    normalized.physicalForm,
                ));
    const visibleItemIds =
        new Set(
            visibleItems.map(({
                normalized,
            }) => normalized.id),
        );
    const directives =
        parseItemOperationDirectives(
            playerAction,
        ).directives.filter(directive =>
            visibleItemIds.has(
                directive.itemId,
            ));
    const directiveIds =
        new Set(
            directives.map(directive =>
                directive.itemId),
        );
    const evidenceText = [
        playerAction,
        ...(
            Array.isArray(narrativeSegments)
                ? narrativeSegments
                : []
        ).map(segment =>
            segment?.textEn ||
            ''),
    ].filter(Boolean).join('\n');
    const labelIds = new Map();
    for (const {
        normalized,
    } of visibleItems) {
        const label =
            normalizeReferenceText(
                normalized.labelEn,
            );
        if (!label) {
            continue;
        }
        const ids =
            labelIds.get(label) ||
            [];
        ids.push(normalized.id);
        labelIds.set(label, ids);
    }
    const selected = [];
    const includedByRoom = [];
    const includedByDirective = [];
    const includedByText = [];
    for (const {
        source,
        normalized,
    } of visibleItems) {
        const independent =
            isIndependentRoomItem(
                normalized,
                room,
            );
        const byDirective =
            directiveIds.has(
                normalized.id,
            );
        const normalizedLabel =
            normalizeReferenceText(
                normalized.labelEn,
            );
        const byText =
            Boolean(
                normalizedLabel &&
                labelIds.get(
                    normalizedLabel,
                )?.length === 1 &&
                containsWholeLabel(
                    evidenceText,
                    normalized.labelEn,
                ),
            );
        if (
            !independent &&
            !byDirective &&
            !byText
        ) {
            continue;
        }
        selected.push(
            createInventoryContextRecord(
                source,
                normalized,
            ),
        );
        if (independent) {
            includedByRoom.push(
                normalized.id,
            );
        }
        if (byDirective) {
            includedByDirective.push(
                normalized.id,
            );
        }
        if (byText) {
            includedByText.push(
                normalized.id,
            );
        }
    }
    return {
        items: selected,
        diagnostics: {
            candidateCount:
                visibleItems.length,
            selectedCount:
                selected.length,
            includedByRoom,
            includedByDirective,
            includedByText,
        },
    };
}
