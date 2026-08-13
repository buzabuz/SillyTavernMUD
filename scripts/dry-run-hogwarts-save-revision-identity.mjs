/* global globalThis */
import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import {
    readFile,
    stat,
} from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import tls from 'node:tls';

import {
    migrateNpcIdentityState,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-migration.js';
import {
    migrateNpcIdentityObservations,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-observation-migration.js';
import {
    migrateSaveRevisionState,
} from '../public/scripts/extensions/hogwarts-mud/domain/save-revision.js';
import {
    migrateLoadedSocialGraph,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';

function parseArguments(argv) {
    const options = {
        file: '',
    };
    for (
        let index = 0;
        index < argv.length;
        index += 1
    ) {
        const argument = argv[index];
        if (argument === '--file') {
            options.file =
                argv[index + 1] || '';
            index += 1;
            continue;
        }
        if (
            argument === '--dry-run'
        ) {
            continue;
        }
        throw new Error(
            `Unknown argument: ${argument}`,
        );
    }
    if (!options.file) {
        throw new Error(
            'Usage: node scripts/dry-run-hogwarts-save-revision-identity.mjs --dry-run --file <chat.jsonl>',
        );
    }
    return options;
}

function sha256(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function splitJsonl(raw) {
    const firstNewline =
        raw.indexOf('\n');
    if (firstNewline < 0) {
        throw new Error(
            'The chat JSONL has no message rows.',
        );
    }
    return {
        metadataLine:
            raw.slice(
                0,
                firstNewline,
            ),
        messageBytes:
            raw.slice(
                firstNewline + 1,
            ),
    };
}

function timelineKeyFor(file) {
    return path.basename(
        file,
        path.extname(file),
    );
}

function migrateState(
    source,
    {
        timelineKey,
        chatLength,
        chat,
    },
) {
    const revision =
        migrateSaveRevisionState(
            source,
            {
                timelineKey,
            },
        );
    const identity =
        migrateNpcIdentityState(
            revision.state,
        );
    const identityObservations =
        migrateNpcIdentityObservations(
            identity.state,
            chat,
        );
    const social =
        migrateLoadedSocialGraph(
            identityObservations
                .state
                .socialGraph,
            {
                chatLength,
                sceneId:
                    identity.state
                        .scene?.id ||
                    '',
            },
        );
    return {
        state: {
            ...identityObservations
                .state,
            socialGraph:
                social.graph,
        },
        diagnostics: {
            revisionChanged:
                revision.changed,
            identityChanged:
                identity.changed,
            identityObservationsChanged:
                identityObservations
                    .changed,
            socialChanged:
                social.changed,
            identity:
                identity.diagnostics,
            identityObservations:
                identityObservations
                    .diagnostics,
        },
    };
}

function collectDiffs(
    before,
    after,
    currentPath = '',
    result = [],
) {
    if (Object.is(before, after)) {
        return result;
    }
    if (
        before === undefined ||
        after === undefined ||
        before === null ||
        after === null ||
        typeof before !==
            'object' ||
        typeof after !==
            'object'
    ) {
        result.push({
            path: currentPath,
            kind:
                before === undefined
                    ? 'added'
                    : after ===
                        undefined
                        ? 'removed'
                        : 'changed',
        });
        return result;
    }
    if (
        Array.isArray(before) ||
        Array.isArray(after)
    ) {
        if (
            !Array.isArray(before) ||
            !Array.isArray(after)
        ) {
            result.push({
                path: currentPath,
                kind: 'changed',
            });
            return result;
        }
        const length =
            Math.max(
                before.length,
                after.length,
            );
        for (
            let index = 0;
            index < length;
            index += 1
        ) {
            collectDiffs(
                before[index],
                after[index],
                `${currentPath}[${index}]`,
                result,
            );
        }
        return result;
    }
    const keys =
        new Set([
            ...Object.keys(before),
            ...Object.keys(after),
        ]);
    for (const key of [
        ...keys,
    ].sort()) {
        collectDiffs(
            before[key],
            after[key],
            currentPath
                ? `${currentPath}.${key}`
                : key,
            result,
        );
    }
    return result;
}

const PRESENTATION_BODY_FIELD =
    '(?:hair|hairstyle|hairStyle|hairColor|dyedHairColor|naturalHairColor|injury|injuries|visibleInjury|visibleInjuries|scar|scars|bodyCondition|bodyConditions|form|bodyForm|currentForm|visibleConditions)';
const ALLOWED_DIFF_PATTERNS = [
    /^(?:saveRevisionVersion|timelineEpoch|stateRevision|revisionHistory|npcIdentityVersion|npcIdentityObservationVersion)$/u,
    /^actorLibrary\[\d+\]\.identity(?:\.|$)/u,
    /^actors\[\d+\]\.identity(?:\.|$)/u,
    /^socialGraph\.(?:identityClaims|relationshipClaims|personReferences)(?:\[|\.|$)/u,
    /^socialGraph\.relationships\[\d+\]\.(?:relationshipClaimIds|relationshipKinds)(?:\[|\.|$)/u,
    new RegExp(
        `^actorPresentations\\.[^.]+\\.${PRESENTATION_BODY_FIELD}(?:\\[|\\.|$)`,
        'u',
    ),
    new RegExp(
        `^(?:actorLibrary|actors)\\[\\d+\\]\\.(?:presentation|currentPresentation)\\.${PRESENTATION_BODY_FIELD}(?:\\[|\\.|$)`,
        'u',
    ),
];

function isAllowedDiff(diff) {
    return ALLOWED_DIFF_PATTERNS
        .some(pattern =>
            pattern.test(
                diff.path,
            ));
}

function projectToExistingShape(
    value,
    shape,
) {
    if (
        shape === null ||
        typeof shape !== 'object'
    ) {
        return value;
    }
    if (Array.isArray(shape)) {
        return shape.map(
            (entry, index) =>
                projectToExistingShape(
                    value?.[index],
                    entry,
                ),
        );
    }
    return Object.fromEntries(
        Object.entries(shape)
            .map(([key, entry]) => [
                key,
                projectToExistingShape(
                    value?.[key],
                    entry,
                ),
            ]),
    );
}

function actorMemorySnapshot(
    state,
) {
    const actorRecords =
        [
            ...(state.actorLibrary || []),
            ...(state.actors || []),
        ].map(actor => ({
            id: actor.id,
            fields:
                Object.fromEntries(
                    Object.entries(actor)
                        .filter(([key]) =>
                            /memory|knowledge/iu
                                .test(key)),
                ),
        }));
    return {
        actorRecords,
        memoryDirector:
            state.memoryDirector,
    };
}

function locationSnapshot(
    state,
) {
    return {
        location:
            state.location,
        map: state.map,
        spatial:
            state.spatial,
        localPresence:
            state.localPresence,
        cohorts:
            state.cohorts,
        scene: state.scene
            ? {
                id:
                    state.scene.id,
                mapId:
                    state.scene.mapId,
                roomId:
                    state.scene.roomId,
            }
            : null,
        actors: (
            state.actors || []
        ).map(actor => ({
            id: actor.id,
            mapId: actor.mapId,
            roomId: actor.roomId,
            present: actor.present,
            lifeStatus:
                actor.lifeStatus,
        })),
    };
}

function actorReferenceSnapshot(
    state,
) {
    return {
        library: (
            state.actorLibrary || []
        ).map(actor => ({
            id: actor.id,
            name: actor.name,
            nameEn: actor.nameEn,
            aliases: actor.aliases,
        })),
        runtime: (
            state.actors || []
        ).map(actor => ({
            id: actor.id,
            name: actor.name,
            nameEn: actor.nameEn,
            aliases: actor.aliases,
        })),
    };
}

function networkBlocker() {
    let calls = 0;
    const patches = [];
    const block = label => {
        calls += 1;
        throw new Error(
            `Network access is forbidden during dry-run: ${label}`,
        );
    };
    const patch = (
        target,
        key,
        label,
    ) => {
        const original =
            target[key];
        patches.push(() => {
            target[key] =
                original;
        });
        target[key] =
            (..._args) =>
                block(label);
    };
    patch(
        globalThis,
        'fetch',
        'fetch',
    );
    patch(
        http,
        'request',
        'http.request',
    );
    patch(
        https,
        'request',
        'https.request',
    );
    patch(
        net,
        'connect',
        'net.connect',
    );
    patch(
        net,
        'createConnection',
        'net.createConnection',
    );
    patch(
        tls,
        'connect',
        'tls.connect',
    );
    return {
        get calls() {
            return calls;
        },
        restore() {
            patches
                .reverse()
                .forEach(restore =>
                    restore());
        },
    };
}

async function main() {
    const options =
        parseArguments(
            process.argv.slice(2),
        );
    const file =
        path.resolve(
            options.file,
        );
    const blocker =
        networkBlocker();
    try {
        const beforeStat =
            await stat(
                file,
                {
                    bigint: true,
                },
            );
        const rawBefore =
            await readFile(
                file,
                'utf8',
            );
        const {
            metadataLine,
            messageBytes,
        } = splitJsonl(
            rawBefore,
        );
        const metadata =
            JSON.parse(
                metadataLine,
            );
        const before =
            metadata
                ?.chat_metadata
                ?.hogwartsMud;
        if (!before) {
            throw new Error(
                'The JSONL metadata does not contain chat_metadata.hogwartsMud.',
            );
        }
        const chatLength =
            messageBytes
                .split('\n')
                .filter(Boolean)
                .length;
        const chat =
            messageBytes
                .split('\n')
                .filter(Boolean)
                .map(line =>
                    JSON.parse(line));
        const first =
            migrateState(
                before,
                {
                    timelineKey:
                        timelineKeyFor(
                            file,
                        ),
                    chatLength,
                    chat,
                },
            );
        const second =
            migrateState(
                first.state,
                {
                    timelineKey:
                        timelineKeyFor(
                            file,
                        ),
                    chatLength,
                    chat,
                },
            );
        assert.equal(
            JSON.stringify(
                second.state,
            ),
            JSON.stringify(
                first.state,
            ),
            'Repeated migration is not byte-stable.',
        );

        const diffs =
            collectDiffs(
                before,
                first.state,
            );
        const unexpectedDiffs =
            diffs.filter(diff =>
                !isAllowedDiff(diff));
        assert.deepEqual(
            unexpectedDiffs,
            [],
            'Migration changed fields outside revision, Identity, social schema, or legacy presentation body fields.',
        );

        assert.deepEqual(
            first.state.items,
            before.items,
            'Items changed during dry-run.',
        );
        assert.deepEqual(
            actorMemorySnapshot(
                first.state,
            ),
            actorMemorySnapshot(
                before,
            ),
            'Actor memory or knowledge changed during dry-run.',
        );
        assert.deepEqual(
            locationSnapshot(
                first.state,
            ),
            locationSnapshot(
                before,
            ),
            'Location state changed during dry-run.',
        );
        assert.deepEqual(
            actorReferenceSnapshot(
                first.state,
            ),
            actorReferenceSnapshot(
                before,
            ),
            'Actor IDs, names, or aliases changed during dry-run.',
        );
        const relationshipShape =
            projectToExistingShape(
                first.state
                    .socialGraph,
                before.socialGraph,
            );
        assert.deepEqual(
            relationshipShape,
            before.socialGraph,
            'Existing relationship fields changed during dry-run.',
        );

        const rawAfter =
            await readFile(
                file,
                'utf8',
            );
        const afterStat =
            await stat(
                file,
                {
                    bigint: true,
                },
            );
        assert.equal(
            rawAfter,
            rawBefore,
            'The source JSONL changed during dry-run.',
        );
        assert.equal(
            afterStat.size,
            beforeStat.size,
            'The source JSONL size changed during dry-run.',
        );
        assert.equal(
            afterStat.mtimeNs,
            beforeStat.mtimeNs,
            'The source JSONL mtime changed during dry-run.',
        );
        assert.equal(
            blocker.calls,
            0,
            'Dry-run attempted network access.',
        );

        const diffCounts =
            Object.fromEntries(
                [
                    'added',
                    'removed',
                    'changed',
                ].map(kind => [
                    kind,
                    diffs.filter(diff =>
                        diff.kind === kind)
                        .length,
                ]),
            );
        const report = {
            mode: 'read-only-dry-run',
            file,
            source: {
                sha256:
                    sha256(rawBefore),
                bytes:
                    Number(
                        beforeStat.size,
                    ),
                mtimeNs:
                    beforeStat
                        .mtimeNs
                        .toString(),
                unchanged: true,
            },
            messages: {
                count: chatLength,
                sha256:
                    sha256(
                        messageBytes,
                    ),
                unchanged: true,
            },
            revision: {
                saveRevisionVersion:
                    first.state
                        .saveRevisionVersion,
                timelineEpoch:
                    first.state
                        .timelineEpoch,
                stateRevision:
                    first.state
                        .stateRevision,
                revisionHistory:
                    first.state
                        .revisionHistory
                        .length,
            },
            identity: {
                npcIdentityVersion:
                    first.state
                        .npcIdentityVersion,
                actorLibraryProfiles:
                    first.state
                        .actorLibrary
                        .length,
                actorLibraryV1:
                    first.state
                        .actorLibrary
                        .filter(actor =>
                            actor.identity
                                ?.version ===
                            1)
                        .length,
                runtimeActors:
                    first.state
                        .actors
                        .length,
                runtimeActorsV1:
                    first.state
                        .actors
                        .filter(actor =>
                            actor.identity
                                ?.version ===
                            1)
                        .length,
                diagnostics:
                    first.diagnostics
                        .identity,
            },
            socialSchema: {
                identityClaims:
                    first.state
                        .socialGraph
                        .identityClaims
                        .length,
                relationshipClaims:
                    first.state
                        .socialGraph
                        .relationshipClaims
                        .length,
                personReferences:
                    first.state
                        .socialGraph
                        .personReferences
                        .length,
            },
            invariants: {
                itemsUnchanged: true,
                relationshipsUnchanged:
                    true,
                memoriesUnchanged: true,
                locationsUnchanged: true,
                actorReferencesUnchanged:
                    true,
                messagesUnchanged: true,
                repeatedMigrationByteStable:
                    true,
                onlyAllowedSchemaPaths:
                    true,
                networkCalls:
                    blocker.calls,
            },
            diff: {
                total: diffs.length,
                ...diffCounts,
                paths:
                    diffs.map(diff =>
                        diff.path),
            },
        };
        process.stdout.write(
            `${JSON.stringify(
                report,
                null,
                2,
            )}\n`,
        );
    } finally {
        blocker.restore();
    }
}

await main();
