/*
Removed by compact-timeline-appraisal-lifecycle Revision 4.

The former GossipPack/Prophet writer is intentionally left non-executable so
old direct test imports cannot restore a second world-fact authority.

import {
    countTextWords,
} from './actor-memory.js';

import {
    getClosingSceneWitnessIds,
} from './scene-destination.js';

import {
    normalizeMemoryId,
} from './stable-identity.js';

import {
    getWorldClockGapMinutes,
    GOSSIP_CHANNEL_VALUES,
    WORLD_CHANGE_MIN_DAYS,
    WORLD_NEWS_CATEGORY_VALUES,
    worldClockToEpochMinutes,
} from './time-environment.js';

export function normalizeTransitionWorldChanges(
    worldChanges,
) {
    const source =
        worldChanges &&
        typeof worldChanges === 'object' &&
        !Array.isArray(worldChanges)
            ? worldChanges
            : {};
    return {
        prophetBriefs:
            (
                Array.isArray(
                    source.prophetBriefs,
                )
                    ? source.prophetBriefs
                    : []
            )
                .slice(0, 4)
                .map(brief => ({
                    id: String(
                        brief?.id || '',
                    ).trim(),
                    headlineEn: String(
                        brief?.headlineEn || '',
                    ).trim(),
                    headline: String(
                        brief?.headline || '',
                    ).trim(),
                    briefEn: String(
                        brief?.briefEn || '',
                    ).trim(),
                    brief: String(
                        brief?.brief || '',
                    ).trim(),
                    category: String(
                        brief?.category || '',
                    ).trim(),
                    happenedClock: String(
                        brief?.happenedClock || '',
                    ).trim(),
                })),
        gossipUpdates:
            (
                Array.isArray(
                    source.gossipUpdates,
                )
                    ? source.gossipUpdates
                    : []
            )
                .slice(0, 4)
                .map(update => ({
                    id: String(
                        update?.id || '',
                    ).trim(),
                    action: String(
                        update?.action || '',
                    ).trim(),
                    originEventEn: String(
                        update?.originEventEn || '',
                    ).trim(),
                    originEvent: String(
                        update?.originEvent || '',
                    ).trim(),
                    truthCoreEn: String(
                        update?.truthCoreEn || '',
                    ).trim(),
                    truthCore: String(
                        update?.truthCore || '',
                    ).trim(),
                    versionEn: String(
                        update?.versionEn || '',
                    ).trim(),
                    version: String(
                        update?.version || '',
                    ).trim(),
                    sourceActorIds: [
                        ...new Set(
                            (
                                Array.isArray(
                                    update
                                        ?.sourceActorIds,
                                )
                                    ? update
                                        .sourceActorIds
                                    : []
                            )
                                .map(String)
                                .filter(Boolean),
                        ),
                    ].slice(0, 6),
                    audienceActorIds: [
                        ...new Set(
                            (
                                Array.isArray(
                                    update
                                        ?.audienceActorIds,
                                )
                                    ? update
                                        .audienceActorIds
                                    : []
                            )
                                .map(String)
                                .filter(Boolean),
                        ),
                    ].slice(0, 6),
                    channel: String(
                        update?.channel || '',
                    ).trim(),
                    targetGroupEn: String(
                        update?.targetGroupEn ||
                        '',
                    ).trim(),
                    targetGroup: String(
                        update?.targetGroup ||
                        '',
                    ).trim(),
                    distortionLevel: Number(
                        update
                            ?.distortionLevel,
                    ),
                })),
    };
}
*/

export {};

/*
function getGossipKnownActorIds(pack) {
    return new Set([
        ...(pack?.sourceActorIds || []),
        ...(pack?.knownActorIds || []),
        ...(pack?.versions || [])
            .flatMap(version => [
                ...(version
                    .sourceActorIds || []),
                ...(version
                    .audienceActorIds || []),
            ]),
    ]);
}

export function validateTransitionWorldChanges(
    worldChanges,
    worldState,
    nextClock,
    {
        allowPending = false,
    } = {},
) {
    const errors = [];
    const changes =
        normalizeTransitionWorldChanges(
            worldChanges,
        );
    const gapMinutes =
        getWorldClockGapMinutes(
            worldState.clock,
            nextClock,
        );
    const longTransition =
        Number(gapMinutes) >=
            WORLD_CHANGE_MIN_DAYS *
            1440;
    const briefs =
        changes.prophetBriefs;
    const gossipUpdates =
        changes.gossipUpdates;
    if (!longTransition) {
        if (
            briefs.length ||
            gossipUpdates.length
        ) {
            errors.push(
                `不足 ${WORLD_CHANGE_MIN_DAYS} 天的转场不得生成场间新闻或流言传播。`,
            );
        }
        return errors;
    }
    if (!briefs.length) {
        if (
            allowPending &&
            !gossipUpdates.length
        ) {
            return errors;
        }
        errors.push(
            '跨越至少一周的转场必须生成 1–4 条《预言家日报》边角新闻。',
        );
    }
    const witnessIds = new Set(
        getClosingSceneWitnessIds(
            worldState,
        ),
    );
    if (
        witnessIds.size &&
        !gossipUpdates.some(update =>
            update.action === 'create')
    ) {
        errors.push(
            '跨越至少一周且旧场景有见证者时，必须从目击事件创建至少一个流言包。',
        );
    }

    const actorIds = new Set(
        (worldState.actorLibrary || [])
            .map(actor => actor.id),
    );
    const existingNewsIds = new Set(
        (worldState.worldNews || [])
            .map(brief => brief.id),
    );
    const seenNewsIds = new Set();
    const fromMinutes =
        worldClockToEpochMinutes(
            worldState.clock,
        );
    const toMinutes =
        worldClockToEpochMinutes(
            nextClock,
        );
    briefs.forEach(brief => {
        if (
            !/^[a-z][a-z0-9_]{2,79}$/
                .test(brief.id) ||
            seenNewsIds.has(brief.id) ||
            existingNewsIds.has(brief.id)
        ) {
            errors.push(
                `日报新闻 ID ${brief.id || '?'} 无效或重复。`,
            );
        }
        seenNewsIds.add(brief.id);
        const headlineWords =
            countTextWords(
                brief.headlineEn,
            );
        const briefWords =
            countTextWords(
                brief.briefEn,
            );
        if (
            headlineWords < 2 ||
            headlineWords > 18 ||
            briefWords < 8 ||
            briefWords > 60
        ) {
            errors.push(
                `日报新闻 ${brief.id || '?'} 的标题或正文长度无效。`,
            );
        }
        if (
            !WORLD_NEWS_CATEGORY_VALUES
                .includes(
                    brief.category,
                )
        ) {
            errors.push(
                `日报新闻 ${brief.id || '?'} 的 category 无效。`,
            );
        }
        const happenedMinutes =
            worldClockToEpochMinutes(
                brief.happenedClock,
            );
        if (
            happenedMinutes === null ||
            happenedMinutes < fromMinutes ||
            happenedMinutes > toMinutes
        ) {
            errors.push(
                `日报新闻 ${brief.id || '?'} 的 happenedClock 必须落在本次时间跳跃内。`,
            );
        }
    });

    const packs = new Map(
        (worldState.gossipPacks || [])
            .map(pack => [
                pack.id,
                pack,
            ]),
    );
    const seenGossipIds = new Set();
    gossipUpdates.forEach(update => {
        const existing =
            packs.get(update.id);
        if (
            !/^[a-z][a-z0-9_]{2,79}$/
                .test(update.id) ||
            seenGossipIds.has(update.id)
        ) {
            errors.push(
                `流言包 ID ${update.id || '?'} 无效或在本次更新中重复。`,
            );
        }
        seenGossipIds.add(update.id);
        if (![
            'create',
            'propagate',
        ].includes(update.action)) {
            errors.push(
                `流言包 ${update.id || '?'} 的 action 无效。`,
            );
        }
        if (
            !GOSSIP_CHANNEL_VALUES
                .includes(
                    update.channel,
                )
        ) {
            errors.push(
                `流言包 ${update.id || '?'} 的传播渠道无效。`,
            );
        }
        if (
            countTextWords(
                update.versionEn,
            ) < 5 ||
            countTextWords(
                update.versionEn,
            ) > 60 ||
            countTextWords(
                update.targetGroupEn,
            ) < 2 ||
            countTextWords(
                update.targetGroupEn,
            ) > 18
        ) {
            errors.push(
                `流言包 ${update.id || '?'} 的传播版本或目标群体长度无效。`,
            );
        }
        if (
            !Number.isInteger(
                update.distortionLevel,
            ) ||
            update.distortionLevel < 1 ||
            update.distortionLevel > 3
        ) {
            errors.push(
                `流言包 ${update.id || '?'} 的 distortionLevel 必须是 1–3。`,
            );
        }
        if (
            !update.sourceActorIds.length ||
            update.sourceActorIds.some(
                id => !actorIds.has(id)) ||
            update.audienceActorIds.some(
                id => !actorIds.has(id))
        ) {
            errors.push(
                `流言包 ${update.id || '?'} 的传播人物必须引用现有人物，且至少有一个来源人物。`,
            );
        }
        if (update.action === 'create') {
            if (existing) {
                errors.push(
                    `新流言包 ${update.id} 已存在。`,
                );
            }
            if (
                update.sourceActorIds.some(
                    id =>
                        !witnessIds.has(id))
            ) {
                errors.push(
                    `新流言包 ${update.id} 的来源必须是旧场景同房间见证者。`,
                );
            }
            if (
                countTextWords(
                    update.originEventEn,
                ) < 6 ||
                countTextWords(
                    update.originEventEn,
                ) > 50 ||
                countTextWords(
                    update.truthCoreEn,
                ) < 6 ||
                countTextWords(
                    update.truthCoreEn,
                ) > 50 ||
                update.distortionLevel !== 1
            ) {
                errors.push(
                    `新流言包 ${update.id} 必须含 6–50 词的目击事件和真相底稿，并从失真 1 开始。`,
                );
            }
        } else if (
            !existing ||
            existing.status === 'faded'
        ) {
            errors.push(
                `传播流言包 ${update.id || '?'} 不存在或已经淡出。`,
            );
        } else {
            const knownActors =
                getGossipKnownActorIds(
                    existing,
                );
            if (
                update.sourceActorIds.some(
                    id =>
                        !knownActors.has(id))
            ) {
                errors.push(
                    `传播流言包 ${update.id} 的来源人物尚未听过该流言。`,
                );
            }
            const latest =
                existing.versions?.at(-1);
            const expectedDistortion =
                Math.min(
                    3,
                    Number(
                        latest
                            ?.distortionLevel ||
                        0,
                    ) + 1,
                );
            if (
                update.distortionLevel !==
                    expectedDistortion ||
                update.versionEn ===
                    latest?.versionEn
            ) {
                errors.push(
                    `传播流言包 ${update.id} 必须在上一版本上增加一级失真并改写内容。`,
                );
            }
        }
    });
    return errors;
}

export function applyTransitionWorldChanges(
    next,
    previous,
    payload,
) {
    const changes =
        normalizeTransitionWorldChanges(
            payload.worldChanges,
        );
    const gapMinutes =
        getWorldClockGapMinutes(
            previous.clock,
            payload.nextClock,
        );
    if (
        Number(gapMinutes) <
            WORLD_CHANGE_MIN_DAYS * 1440
    ) {
        return null;
    }
    next.worldNews = [
        ...(next.worldNews || []),
        ...changes.prophetBriefs.map(
            brief => ({
                ...brief,
                headline:
                    brief.headline ||
                    brief.headlineEn,
                brief:
                    brief.brief ||
                    brief.briefEn,
                source:
                    'daily_prophet_margin',
                publishedClock:
                    payload.nextClock,
            }),
        ),
    ].slice(-24);

    const packs = new Map(
        (next.gossipPacks || [])
            .map(pack => [
                pack.id,
                structuredClone(pack),
            ]),
    );
    for (const update of changes
        .gossipUpdates) {
        const version = {
            clock: payload.nextClock,
            versionEn:
                update.versionEn,
            version:
                update.version ||
                update.versionEn,
            sourceActorIds:
                update.sourceActorIds,
            audienceActorIds:
                update.audienceActorIds,
            channel: update.channel,
            targetGroupEn:
                update.targetGroupEn,
            targetGroup:
                update.targetGroup ||
                update.targetGroupEn,
            distortionLevel:
                update.distortionLevel,
        };
        if (update.action === 'create') {
            packs.set(update.id, {
                id: update.id,
                originEventEn:
                    update.originEventEn,
                originEvent:
                    update.originEvent ||
                    update.originEventEn,
                truthCoreEn:
                    update.truthCoreEn,
                truthCore:
                    update.truthCore ||
                    update.truthCoreEn,
                sourceActorIds:
                    update.sourceActorIds,
                knownActorIds:
                    [...new Set([
                        ...update
                            .sourceActorIds,
                        ...update
                            .audienceActorIds,
                    ])],
                status: 'active',
                createdClock:
                    payload.nextClock,
                updatedClock:
                    payload.nextClock,
                versions: [version],
            });
            continue;
        }
        const pack = packs.get(
            update.id,
        );
        pack.versions = [
            ...(pack.versions || []),
            version,
        ].slice(-8);
        pack.knownActorIds = [
            ...new Set([
                ...(pack
                    .knownActorIds || []),
                ...update.sourceActorIds,
                ...update
                    .audienceActorIds,
            ]),
        ];
        pack.updatedClock =
            payload.nextClock;
        pack.status = 'active';
    }
    next.gossipPacks = [...packs.values()]
        .map(pack => {
            const quietMinutes =
                getWorldClockGapMinutes(
                    pack.updatedClock,
                    payload.nextClock,
                );
            return Number(quietMinutes) >=
                28 * 1440
                ? {
                    ...pack,
                    status: 'faded',
                }
                : pack;
        })
        .slice(-16);

    const entry = {
        id: normalizeMemoryId(
            `world_change_${previous.scene?.id || 'scene'}_${payload.nextClock}`,
            'world_change',
        ),
        fromClock: previous.clock,
        toClock: payload.nextClock,
        elapsedDays:
            Math.floor(
                Number(gapMinutes) /
                1440,
            ),
        prophetBriefIds:
            changes.prophetBriefs
                .map(brief => brief.id),
        gossipUpdateIds:
            changes.gossipUpdates
                .map(update => update.id),
        createdAt:
            new Date().toISOString(),
    };
    next.worldChangeLog = [
        ...(next.worldChangeLog || []),
        entry,
    ].slice(-12);
    return entry;
}
*/
