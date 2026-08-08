import {
    ITEM_OPERATION_VALUES,
} from './item-schema.js';

export const ITEM_OPERATION_LABELS =
    Object.freeze({
        acquire: '获得',
        carry: '携带',
        place: '放置',
        equip: '穿戴',
        unequip: '脱下',
        give: '赠送',
        lend: '借出',
        consume: '消耗',
        damage: '损坏',
        clean: '清洗',
        lose: '丢失',
        destroy: '销毁',
    });

export const ITEM_OPERATION_OPTIONS =
    Object.freeze(
        ITEM_OPERATION_VALUES.map(
            operation =>
                Object.freeze({
                    operation,
                    label:
                        ITEM_OPERATION_LABELS[
                            operation
                        ] ||
                        operation,
                }),
        ),
    );

const ITEM_DIRECTIVE_PATTERN =
    /【物品操作:([a-z]+)(?:｜([^】]*))?】|【物品:([a-z][a-z0-9_]{1,79})(?:｜([^】]*))?】/gu;

function compactDirectiveLabel(
    value,
) {
    return String(value || '')
        .normalize('NFKC')
        .replace(
            /[【】|｜\r\n]+/gu,
            ' ',
        )
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, 80);
}

export function createItemOperationDirective(
    operation,
) {
    if (
        !ITEM_OPERATION_VALUES.includes(
            operation,
        )
    ) {
        return '';
    }
    return `【物品操作:${operation}｜${
        ITEM_OPERATION_LABELS[
            operation
        ]
    }】`;
}

export function createItemReferenceDirective(
    item,
) {
    const id =
        String(
            typeof item ===
                'string'
                ? item
                : item?.id ||
                    '',
        ).trim();
    if (
        !/^[a-z][a-z0-9_]{1,79}$/u
            .test(id)
    ) {
        return '';
    }
    const label =
        compactDirectiveLabel(
            typeof item ===
                'string'
                ? ''
                : item?.label ||
                    item?.labelEn,
        );
    return `【物品:${id}${
        label
            ? `｜${label}`
            : ''
    }】`;
}

export function parseItemOperationDirectives(
    playerAction,
    items = null,
) {
    const source =
        String(playerAction || '');
    const validItemIds =
        items instanceof Set
            ? items
            : Array.isArray(items)
                ? new Set(
                    items
                        .map(item =>
                            typeof item ===
                                'string'
                                ? item
                                : item?.id)
                        .filter(Boolean),
                )
                : null;
    const directives = [];
    const errors = [];
    let pendingOperation =
        null;
    for (
        const match
        of source.matchAll(
            ITEM_DIRECTIVE_PATTERN,
        )
    ) {
        const operation =
            match[1] ||
            '';
        if (operation) {
            if (pendingOperation) {
                errors.push(
                    `物品操作 ${pendingOperation.operation} 缺少物品引用。`,
                );
            }
            if (
                !ITEM_OPERATION_VALUES
                    .includes(operation)
            ) {
                errors.push(
                    `未知物品操作 ${operation}。`,
                );
                pendingOperation =
                    null;
                continue;
            }
            pendingOperation = {
                operation,
                operationLabel:
                    ITEM_OPERATION_LABELS[
                        operation
                    ],
                start:
                    match.index,
                operationText:
                    match[0],
            };
            continue;
        }
        const itemId =
            match[3] ||
            '';
        if (!pendingOperation) {
            errors.push(
                `物品引用 ${itemId} 缺少前置操作。`,
            );
            continue;
        }
        if (
            validItemIds &&
            !validItemIds.has(
                itemId,
            )
        ) {
            errors.push(
                `物品引用 ${itemId} 不在当前正式物品库。`,
            );
            pendingOperation =
                null;
            continue;
        }
        directives.push({
            operation:
                pendingOperation
                    .operation,
            operationLabel:
                pendingOperation
                    .operationLabel,
            itemId,
            itemLabel:
                compactDirectiveLabel(
                    match[4],
                ),
            start:
                pendingOperation
                    .start,
            end:
                Number(
                    match.index ||
                    0,
                ) +
                match[0].length,
            raw:
                `${pendingOperation.operationText}\n${match[0]}`,
        });
        pendingOperation =
            null;
    }
    if (pendingOperation) {
        errors.push(
            `物品操作 ${pendingOperation.operation} 缺少物品引用。`,
        );
    }
    return {
        directives,
        errors,
    };
}
