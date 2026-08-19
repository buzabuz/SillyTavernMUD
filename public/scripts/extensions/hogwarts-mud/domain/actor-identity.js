import {
    findCanonCharacter,
} from '../canon-characters.js';

export function buildActorNameAliases(
    nameEn = '',
    name = '',
    existingAliases = [],
) {
    const aliases = [];
    const seen = new Set();
    const add = value => {
        const alias =
            String(value || '').trim();
        const key = alias
            .normalize('NFKC')
            .toLocaleLowerCase();
        if (
            alias.length >= 2 &&
            !seen.has(key)
        ) {
            seen.add(key);
            aliases.push(alias);
        }
    };
    (existingAliases || []).forEach(add);
    [nameEn, name].forEach(value => {
        add(value);
        String(value || '')
            .split(/[·•\s]+/u)
            .filter(part =>
                part.length >= 2 &&
                !/^(?:professor|prof|mr|mrs|ms|miss|dr)$/i
                    .test(part))
            .forEach(add);
    });
    return aliases;
}

export function getCanonActorDisplayMetadata(
    actor = {},
) {
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
    const name = String(
        canon?.nameZh || '',
    ).trim();
    if (!canon || !name) {
        return null;
    }
    const nameEn = String(
        canon.nameEn ||
        actor.nameEn ||
        '',
    ).trim();
    const nameParts =
        nameEn.split(/\s+/u)
            .filter(Boolean);
    return {
        nameEn,
        name,
        aliases:
            buildActorNameAliases(
                nameEn,
                name,
                [
                    ...(actor.aliases || []),
                    ...(canon.aliasesZh || []),
                    ...(nameParts.length >= 3
                        ? [
                            `${nameParts[0]} ${nameParts.at(-1)}`,
                        ]
                        : []),
                    name.replace(
                        /[·•\s]+/gu,
                        '',
                    ),
                ],
            ),
    };
}

export function reconcileCanonActorDisplayNames(
    worldState,
) {
    if (
        !worldState ||
        worldState
            .actorContextVersion ===
            1
    ) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(worldState);
    let changed = false;
    const reconcile = actor => {
        const display =
            getCanonActorDisplayMetadata(
                actor,
            );
        if (!display) {
            return actor;
        }
        if (
            actor.nameEn ===
                display.nameEn &&
            actor.name ===
                display.name &&
            JSON.stringify(
                actor.aliases || [],
            ) ===
                JSON.stringify(
                    display.aliases,
                )
        ) {
            return actor;
        }
        changed = true;
        return {
            ...actor,
            ...display,
        };
    };
    next.actorLibrary = (
        next.actorLibrary || []
    ).map(reconcile);
    next.actors = (
        next.actors || []
    ).map(reconcile);
    return {
        state: next,
        changed,
    };
}

export function resolveTemporaryActorRevealedName(
    actor,
    _segments = [],
) {
    const firstIdToken = String(
        actor?.id || '',
    )
        .split('_')
        .filter(Boolean)[0] ||
        '';
    if (
        !firstIdToken ||
        /^(?:temp|temporary|unnamed|unknown|student|boy|girl|man|woman|witch|wizard|gryffindor|slytherin|hufflepuff|ravenclaw)$/i
            .test(firstIdToken)
    ) {
        return {
            nameEn:
                String(
                    actor?.nameEn || '',
                ).trim(),
            name:
                String(
                    actor?.name || '',
                ).trim(),
        };
    }
    return {
        nameEn:
            String(
                actor?.nameEn || '',
            ).trim(),
        name:
            String(
                actor?.name || '',
            ).trim(),
    };
}

export function reconcileTemporaryActorDisplayNames(
    worldState,
    chat = [],
) {
    if (
        !worldState ||
        worldState
            .actorContextVersion ===
            1
    ) {
        return {
            state: worldState,
            changed: false,
        };
    }
    const next =
        structuredClone(worldState);
    let changed = false;
    next.actors = (
        next.actors || []
    ).map(actor => {
        if (!actor.temporary) {
            return actor;
        }
        const segments = [
            ...chat,
        ].reverse()
            .map(message =>
                message.extra
                    ?.hogwartsMud
                    ?.segments ||
                message.extra
                    ?.hogwartsMud
                    ?.turnTransaction
                    ?.segments ||
                [])
            .find(items =>
                items.some(segment =>
                    segment.actorId ===
                    actor.id)) ||
            [];
        const revealed =
            resolveTemporaryActorRevealedName(
                actor,
                segments,
            );
        if (
            !revealed.nameEn ||
            (
                revealed.nameEn ===
                    actor.nameEn &&
                (
                    !revealed.name ||
                    revealed.name ===
                        actor.name
                )
            )
        ) {
            return actor;
        }
        changed = true;
        return {
            ...actor,
            nameEn:
                revealed.nameEn,
            name:
                revealed.name ||
                actor.name ||
                revealed.nameEn,
            aliases:
                buildActorNameAliases(
                    revealed.nameEn,
                    revealed.name,
                    actor.aliases,
                ),
        };
    });
    return {
        state: next,
        changed,
    };
}

const EXPLICIT_ADDRESS_LINE_PATTERN =
    /^([ \t]*)[@＠]\s*(?:【\s*([^】\n]+?)\s*】|([^：:\n]+?))\s*[：:]\s*(.*)$/u;
const EXPLICIT_ADDRESS_START_PATTERN =
    /^[ \t]*[@＠]/u;

function getPlayerActionLines(
    playerAction = '',
) {
    return String(playerAction || '')
        .split(/\r?\n/u);
}

export function parseExplicitAddressDirective(
    playerAction = '',
) {
    return parseExplicitAddressBlocks(
        playerAction,
    )
        .map(block =>
            block.targetLabel)
        .filter(Boolean);
}

export function parseExplicitAddressBlocks(
    playerAction = '',
) {
    const blocks = [];
    getPlayerActionLines(
        playerAction,
    ).forEach((line, lineIndex) => {
        const match = line.match(
            EXPLICIT_ADDRESS_LINE_PATTERN,
        );
        if (!match) return;
        blocks.push({
            order: blocks.length,
            lineIndex,
            targetLabel:
                String(
                    match[2] ||
                    match[3] ||
                    '',
                ).trim(),
            speech:
                String(
                    match[4] ??
                    '',
                ).trim(),
            raw: line,
        });
    });
    return blocks;
}

export function removeExplicitAddressDirective(
    playerAction = '',
) {
    return getPlayerActionLines(
        playerAction,
    )
        .map(line => {
            const match = line.match(
                EXPLICIT_ADDRESS_LINE_PATTERN,
            );
            if (!match) return line;
            return `${match[1]}“${String(match[4] || '').trim()}”`;
        })
        .join('\n')
        .trim();
}

export function stripExplicitAddressTargets(
    playerAction = '',
) {
    return getPlayerActionLines(
        playerAction,
    )
        .map(line => {
            const match = line.match(
                EXPLICIT_ADDRESS_LINE_PATTERN,
            );
            if (!match) return line;
            return `${match[1]}${String(match[4] || '').trim()}`;
        })
        .join('\n')
        .trim();
}

export function buildStructuredPlayerTurnSequence(
    playerAction = '',
    addressing = {},
) {
    const blocksByLine = new Map(
        (addressing.blocks || [])
            .map(block => [
                block.lineIndex,
                block,
            ]),
    );
    return getPlayerActionLines(
        playerAction,
    )
        .map((line, lineIndex) => {
            const speechBlock =
                blocksByLine.get(lineIndex);
            if (speechBlock) {
                return {
                    type:
                        speechBlock.mode ===
                            'broadcast'
                            ? 'broadcast_speech'
                            : 'direct_speech',
                    lineIndex,
                    speechOrder:
                        speechBlock.order,
                    targetLabel:
                        speechBlock
                            .targetLabel,
                    targetActorId:
                        speechBlock
                            .targetActorId ||
                        '',
                    speechText:
                        speechBlock
                            .speechText,
                };
            }
            const text = line.trim();
            return text ? {
                type: 'action',
                lineIndex,
                text,
            } : null;
        })
        .filter(Boolean);
}

export function resolvePlayerAddressing(
    worldState = {},
    playerAction = '',
) {
    const targetLabels =
        parseExplicitAddressDirective(
            playerAction,
        );
    const addressBlocks =
        parseExplicitAddressBlocks(
            playerAction,
        );
    const attemptedLineCount =
        getPlayerActionLines(
            playerAction,
        ).filter(line =>
            EXPLICIT_ADDRESS_START_PATTERN
                .test(line))
            .length;
    const attempted =
        attemptedLineCount > 0;
    if (!attempted) {
        return {
            mode: 'open',
            attempted: false,
            valid: true,
            actorIds: [],
            targetLabels: [],
            unresolvedLabels: [],
            speechText: '',
            blocks: [],
            error: '',
        };
    }
    if (
        !targetLabels.length ||
        addressBlocks.length !==
            attemptedLineCount ||
        addressBlocks.some(block =>
            !block.targetLabel ||
            !block.speech)
    ) {
        return {
            mode: 'invalid',
            attempted: true,
            valid: false,
            actorIds: [],
            targetLabels,
            unresolvedLabels:
                targetLabels,
            speechText: '',
            blocks: [],
            error:
                '每条定向台词必须单独成行，并使用“@人物：台词”格式。',
        };
    }
    const profiles = new Map(
        (worldState.actorLibrary || [])
            .map(actor => [
                actor.id,
                actor,
            ]),
    );
    const resolvedBlocks = [];
    const unresolvedLabels = [];
    for (const block of addressBlocks) {
        if (
            /^(?:全场|所有人|大家|room|everyone)$/iu
                .test(block.targetLabel)
        ) {
            resolvedBlocks.push({
                order: block.order,
                lineIndex:
                    block.lineIndex,
                mode: 'broadcast',
                targetLabel:
                    block.targetLabel,
                targetActorId: '',
                speechText:
                    block.speech,
            });
            continue;
        }
        const normalizedTarget =
            block.targetLabel
                .normalize('NFKC')
                .toLocaleLowerCase();
        const matches =
            (worldState.actors || [])
                .filter(actor =>
                    actor.present !==
                        false)
                .filter(actor => {
                    const profile =
                        profiles.get(
                            actor.id,
                        ) || {};
                    return buildActorNameAliases(
                        actor.nameEn ||
                            profile.nameEn,
                        actor.name ||
                            profile.name,
                        [
                            ...(actor.aliases ||
                                []),
                            ...(profile.aliases ||
                                []),
                        ],
                    ).some(alias =>
                        alias
                            .normalize('NFKC')
                            .toLocaleLowerCase() ===
                        normalizedTarget);
                });
        if (matches.length !== 1) {
            unresolvedLabels.push(
                block.targetLabel,
            );
            continue;
        }
        resolvedBlocks.push({
            order: block.order,
            lineIndex:
                block.lineIndex,
            mode: 'direct',
            targetLabel:
                block.targetLabel,
            targetActorId:
                matches[0].id,
            speechText:
                block.speech,
        });
    }
    if (unresolvedLabels.length) {
        return {
            mode: 'invalid',
            attempted: true,
            valid: false,
            actorIds: [],
            targetLabels,
            unresolvedLabels:
                unresolvedLabels,
            speechText: '',
            blocks:
                resolvedBlocks,
            error:
                `当前在场人物中无法唯一匹配：${unresolvedLabels.join('、')}。`,
        };
    }
    const actorIds = [
        ...new Set(
            resolvedBlocks
                .map(block =>
                    block.targetActorId)
                .filter(Boolean),
        ),
    ];
    const hasBroadcast =
        resolvedBlocks.some(block =>
            block.mode ===
                'broadcast');
    return {
        mode:
            hasBroadcast &&
            !actorIds.length
                ? 'broadcast'
                : actorIds.length === 1 &&
                    !hasBroadcast
                    ? 'direct'
                    : 'sequence',
        attempted: true,
        valid: true,
        actorIds,
        targetLabels,
        unresolvedLabels: [],
        speechText:
            resolvedBlocks.length === 1
                ? resolvedBlocks[0]
                    .speechText
                : '',
        blocks:
            resolvedBlocks,
        error: '',
    };
}
