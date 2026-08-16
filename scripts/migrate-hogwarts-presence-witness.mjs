#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
    mkdir,
    open,
    readFile,
    readdir,
    rename,
    stat,
    unlink,
    utimes,
} from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

import {
    createEventKnowledgeId,
    normalizeEventKnowledge,
} from '../public/scripts/extensions/hogwarts-mud/presence-witness-contract.js';

const SCHEMA_VERSION = 1;
const DEFAULT_CHAT_DIRECTORY = path.resolve(
    'data',
    'default-user',
    'chats',
    'Hogwarts_World_Director',
);
const DEFAULT_BACKUP_ROOT = path.resolve(
    'data',
    'default-user',
    'backups',
    'hogwarts-presence-witness-v1',
);
const BACKUP_PATH_PATTERN =
    /(?:^|[/\\])(?:backups?|migration-backups?)(?:[/\\]|$)|\.pre-[^/\\]*$/iu;
const CHARMS_SCENE_ID = 'first_charms_lesson';
const CHARMS_MAP_ID = 'hogwarts_castle';
const CHARMS_ROOM_ID = 'charms_classroom';
const CHARMS_COHORT_ID =
    'gryffindor_year1_charms_1991';
const CHARMS_OCCUPANT_IDS = Object.freeze([
    'canon_dean_thomas',
    'canon_filius_flitwick',
    'canon_harry_james_potter',
    'canon_hermione_jean_granger',
    'canon_lavender_brown',
    'canon_neville_longbottom',
    'canon_ronald_bilius_weasley',
    'canon_seamus_finnigan',
]);
const CHARMS_COHORT_MEMBER_IDS =
    Object.freeze(
        CHARMS_OCCUPANT_IDS.filter(
            id =>
                id !==
                'canon_filius_flitwick',
        ),
    );
const CHARMS_OPENING_NAMES =
    Object.freeze([
        'Hermione',
        'Harry Potter',
        'Ron Weasley',
        'Seamus',
        'Dean',
        'Neville',
        'Professor Flitwick',
    ]);
const KNOWLEDGE_STALE_REASON =
    'presence_witness_v1_migration_requires_offline_reprojection';

function sha256(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function stableIds(values) {
    return [
        ...new Set(
            (
                Array.isArray(values)
                    ? values
                    : []
            )
                .map(value =>
                    String(value || '')
                        .trim())
                .filter(Boolean),
        ),
    ].sort();
}

function jsonEqual(left, right) {
    return JSON.stringify(left) ===
        JSON.stringify(right);
}

function splitArchive(source) {
    const newlineIndex =
        source.indexOf(0x0a);
    const headerEnd =
        newlineIndex >= 0
            ? newlineIndex
            : source.length;
    let headerBytes =
        source.subarray(0, headerEnd);
    if (
        headerBytes.at(-1) === 0x0d
    ) {
        headerBytes =
            headerBytes.subarray(
                0,
                headerBytes.length - 1,
            );
    }
    const remainder =
        newlineIndex >= 0
            ? source.subarray(
                newlineIndex,
            )
            : Buffer.alloc(0);
    return {
        header:
            JSON.parse(
                headerBytes.toString(
                    'utf8',
                ),
            ),
        remainder,
    };
}

function parseMessages(remainder) {
    const text =
        remainder.toString('utf8');
    const lines =
        text.startsWith('\n')
            ? text.slice(1)
                .split('\n')
            : text.split('\n');
    if (
        lines.at(-1) === ''
    ) {
        lines.pop();
    }
    return lines.map((line, messageId) => {
        try {
            return {
                messageId,
                value:
                    JSON.parse(
                        line.endsWith('\r')
                            ? line.slice(0, -1)
                            : line,
                    ),
            };
        } catch {
            return {
                messageId,
                value: null,
            };
        }
    });
}

function getMud(message) {
    return message?.extra
        ?.hogwartsMud;
}

function getTransaction(message) {
    return getMud(message)
        ?.turnTransaction;
}

function findLatestActiveInteraction(
    state,
    messages,
) {
    for (
        let index =
            messages.length - 1;
        index >= 0;
        index -= 1
    ) {
        const ids =
            getTransaction(
                messages[index].value,
            )
                ?.actorPresence
                ?.presentActorIdsAfterTurn;
        if (Array.isArray(ids)) {
            return stableIds(ids);
        }
    }
    return stableIds(
        (state.actors || [])
            .filter(actor =>
                actor?.present !== false)
            .map(actor => actor.id),
    );
}

function hasCharmsOpeningEvidence(
    message,
) {
    const mud = getMud(message);
    const text = String(
        mud?.sourceEn ||
        message?.mes ||
        '',
    );
    return mud?.role ===
            'scene_opening' &&
        mud.sceneId ===
            CHARMS_SCENE_ID &&
        CHARMS_OPENING_NAMES
            .every(name =>
                text.includes(name)) &&
        /(?:arrived|came through|dropped into|sat down|seated|stood|climbed)/iu
            .test(text);
}

function findTinaCharmsAccident(
    state,
    messages,
) {
    if (
        state.scene?.id !==
            CHARMS_SCENE_ID ||
        state.map?.activeMapId !==
            CHARMS_MAP_ID ||
        state.map
            ?.currentLocalNodeId !==
            CHARMS_ROOM_ID ||
        !messages.some(entry =>
            hasCharmsOpeningEvidence(
                entry.value,
            ))
    ) {
        return null;
    }
    const actorIds =
        new Set(
            (state.actors || [])
                .map(actor =>
                    actor?.id),
        );
    if (
        CHARMS_OCCUPANT_IDS
            .some(id =>
                !actorIds.has(id))
    ) {
        return null;
    }
    for (
        let index = 0;
        index < messages.length - 1;
        index += 1
    ) {
        const playerEntry =
            messages[index];
        const player =
            playerEntry.value;
        const playerMud =
            getMud(player);
        if (
            player?.is_user !== true ||
            playerMud?.sceneId !==
                CHARMS_SCENE_ID ||
            !(
                playerMud.spellCasts ||
                []
            ).some(cast =>
                cast?.spellId ===
                    'wingardium_leviosa') ||
            playerMud
                .checkResolution
                ?.outcome !==
                'critical_success' ||
            !/(?:\bRon(?:ald)?\b|罗恩)/iu
                .test(
                    String(
                        player.mes ||
                        '',
                    ),
                )
        ) {
            continue;
        }
        const assistantEntry =
            messages[index + 1];
        const assistant =
            assistantEntry.value;
        const mud = getMud(assistant);
        const transaction =
            getTransaction(assistant);
        const narrative =
            String(
                mud?.sourceEn ||
                assistant?.mes ||
                '',
            );
        if (
            assistant?.is_user === true ||
            mud?.sceneId !==
                CHARMS_SCENE_ID ||
            !(
                transaction
                    ?.spellCasts ||
                []
            ).some(cast =>
                cast?.spellId ===
                    'wingardium_leviosa') ||
            !/Ron's feet left the floor/iu
                .test(narrative) ||
            !/(?:The class erupted|whole class|full class)/iu
                .test(narrative) ||
            !/Flitwick/iu.test(
                narrative,
            )
        ) {
            continue;
        }
        const evidenceText =
            narrative.match(
                /His trainers kicked at nothing\. The class erupted[^.]*\./u,
            )?.[0] ||
            narrative.match(
                /The class erupted[^.]*\./u,
            )?.[0];
        if (!evidenceText) {
            continue;
        }
        return {
            playerMessageId:
                playerEntry.messageId,
            assistantMessageId:
                assistantEntry
                    .messageId,
            evidenceText,
            narrative,
        };
    }
    return null;
}

function migrateSceneArchive(
    state,
) {
    let changed = false;
    const events =
        Array.isArray(
            state.eventKnowledge,
        )
            ? state.eventKnowledge
            : [];
    state.sceneArchive = (
        Array.isArray(state.sceneArchive)
            ? state.sceneArchive
            : []
    ).map(scene => {
        const next = {
            ...scene,
        };
        const active =
            Array.isArray(
                scene
                    .activeInteractionActorIds,
            )
                ? stableIds(
                    scene
                        .activeInteractionActorIds,
                )
                : stableIds(
                    scene.actorIds,
                );
        const occupants =
            Array.isArray(
                scene
                    .localOccupantActorIds,
            )
                ? stableIds(
                    scene
                        .localOccupantActorIds,
                )
                : stableIds(
                    scene.actorIds,
                );
        const cohorts =
            stableIds(
                scene.localCohortIds,
            );
        const sceneEvents =
            Array.isArray(scene.events)
                ? scene.events
                : events.filter(event =>
                    event?.sceneId ===
                        scene.id);
        next.activeInteractionActorIds =
            active;
        next.localOccupantActorIds =
            occupants;
        next.localCohortIds =
            cohorts;
        next.events =
            structuredClone(
                sceneEvents,
            );
        if (!jsonEqual(next, scene)) {
            changed = true;
        }
        return next;
    });
    return changed;
}

function markKnowledgeCacheStale(
    state,
) {
    const knowledge =
        state.knowledgeBase;
    if (
        !knowledge ||
        typeof knowledge !==
            'object' ||
        Array.isArray(knowledge)
    ) {
        return false;
    }
    const before =
        JSON.stringify(knowledge);
    knowledge.vectorStatus =
        'stale';
    knowledge.vectorError =
        KNOWLEDGE_STALE_REASON;
    if (
        knowledge.recordHashes &&
        typeof knowledge
            .recordHashes ===
            'object'
    ) {
        for (
            const key
            of Object.keys(
                knowledge
                    .recordHashes,
            )
        ) {
            if (
                key.startsWith(
                    'scenes:',
                ) ||
                key.startsWith(
                    'events:',
                )
            ) {
                delete knowledge
                    .recordHashes[key];
            }
        }
    }
    return before !==
        JSON.stringify(knowledge);
}

function applyCharmsMigration(
    state,
    evidence,
) {
    if (!evidence) {
        return {
            changed: false,
            eventId: '',
        };
    }
    const actors =
        state.actors || [];
    for (const actor of actors) {
        if (
            CHARMS_OCCUPANT_IDS
                .includes(actor.id)
        ) {
            actor.mapId =
                CHARMS_MAP_ID;
            actor.roomId =
                CHARMS_ROOM_ID;
        }
    }
    const cohort = {
        version: 1,
        id: CHARMS_COHORT_ID,
        labelEn:
            'Gryffindor first-years in Charms',
        mapId: CHARMS_MAP_ID,
        roomId: CHARMS_ROOM_ID,
        knownMemberActorIds: [
            ...CHARMS_COHORT_MEMBER_IDS,
        ],
        source: 'class_roster',
    };
    const cohorts =
        new Map(
            (
                Array.isArray(
                    state.cohorts,
                )
                    ? state.cohorts
                    : []
            ).map(entry => [
                entry.id,
                entry,
            ]),
        );
    cohorts.set(
        cohort.id,
        cohort,
    );
    state.cohorts = [
        ...cohorts.values(),
    ].sort((left, right) =>
        String(left.id)
            .localeCompare(
                String(right.id),
            ));
    state.localPresence = {
        version: 1,
        mapId: CHARMS_MAP_ID,
        roomId: CHARMS_ROOM_ID,
        occupantActorIds: [
            ...CHARMS_OCCUPANT_IDS,
        ],
        cohortIds: [
            CHARMS_COHORT_ID,
        ],
        updatedTurn:
            Math.max(
                0,
                Number(
                    state.turn?.count ||
                    0,
                ),
            ),
        source: 'migration',
    };
    const witnessBasis =
        Object.fromEntries(
            CHARMS_OCCUPANT_IDS.map(
                actorId => [
                    actorId,
                    actorId ===
                        'canon_ronald_bilius_weasley'
                        ? 'direct'
                        : 'room_visual_audible',
                ],
            ),
        );
    const sourceMessageIds = [
        evidence.playerMessageId,
        evidence.assistantMessageId,
    ];
    const perception = {
        version: 1,
        visualScope: 'room',
        audibleScope: 'room',
        salience: 'major',
        attribution: 'clear',
        concealment: 'none',
        directParticipantActorIds: [
            'canon_ronald_bilius_weasley',
        ],
        evidenceText:
            evidence.evidenceText,
        confidence: 1,
        source: 'migration',
    };
    const eventId =
        createEventKnowledgeId({
            sceneId:
                CHARMS_SCENE_ID,
            sourceMessageIds,
        });
    const event =
        normalizeEventKnowledge({
            version: 2,
            eventKind:
                'observed',
            eventId,
            sceneId:
                CHARMS_SCENE_ID,
            clock:
                state.clock,
            sourceMessageIds,
            summaryEn:
                'Tina cast Wingardium Leviosa at Ron, levitating him in front of the whole Charms class.',
            activationSchemaIds: [],
            participantActorIds: [
                'canon_ronald_bilius_weasley',
            ],
            witnessActorIds: [
                ...CHARMS_OCCUPANT_IDS,
            ],
            witnessCohortIds: [
                CHARMS_COHORT_ID,
            ],
            witnessBasis,
            perception,
            knownToPlayer: true,
            source: 'migration',
        }, {
            actors,
            knownActorIds: (
                state.actorLibrary ||
                []
            ).map(actor =>
                actor.id),
            cohortIds: [
                CHARMS_COHORT_ID,
            ],
            sourceTexts: [
                evidence.narrative,
            ],
        });
    if (!event) {
        throw new Error(
            'High-confidence Charms event failed contract validation.',
        );
    }
    const eventById =
        new Map(
            (
                Array.isArray(
                    state.eventKnowledge,
                )
                    ? state.eventKnowledge
                    : []
            ).map(entry => [
                entry.eventId,
                entry,
            ]),
        );
    eventById.set(
        event.eventId,
        event,
    );
    state.eventKnowledge = [
        ...eventById.values(),
    ].sort((left, right) =>
        String(left.eventId)
            .localeCompare(
                String(right.eventId),
            ));
    return {
        changed: true,
        eventId,
    };
}

function countStructuredSpellEvents(
    messages,
) {
    return messages.filter(entry =>
        (
            getTransaction(
                entry.value,
            )?.spellCasts ||
            []
        ).length > 0)
        .length;
}

function collectModifiedFields(
    before,
    after,
) {
    const fields = [
        'presenceWitnessVersion',
        'activeInteractionActorIds',
        'localPresence',
        'cohorts',
        'eventKnowledge',
        'sceneArchive',
        'actors',
        'knowledgeBase',
    ];
    return fields.filter(field =>
        !jsonEqual(
            before[field],
            after[field],
        ));
}

export function migrateArchiveBuffer(
    source,
) {
    const beforeHash =
        sha256(source);
    let split;
    try {
        split =
            splitArchive(source);
    } catch (error) {
        return {
            status: 'skipped',
            reason:
                'invalid_metadata_json',
            beforeHash,
            afterHash: beforeHash,
            output: source,
            modifiedFields: [],
            eventCount: 0,
            occupantCount: 0,
            witnessCount: 0,
            lowConfidenceSkipped: 0,
            error:
                String(
                    error?.message ||
                    error,
                ),
        };
    }
    const state =
        split.header
            ?.chat_metadata
            ?.hogwartsMud;
    if (
        !state ||
        typeof state !==
            'object' ||
        Array.isArray(state)
    ) {
        return {
            status: 'skipped',
            reason:
                'no_hogwarts_state',
            beforeHash,
            afterHash: beforeHash,
            output: source,
            modifiedFields: [],
            eventCount: 0,
            occupantCount: 0,
            witnessCount: 0,
            lowConfidenceSkipped: 0,
        };
    }
    const messages =
        parseMessages(
            split.remainder,
        );
    const beforeState =
        structuredClone(state);
    state.presenceWitnessVersion =
        SCHEMA_VERSION;
    state.activeInteractionActorIds =
        findLatestActiveInteraction(
            state,
            messages,
        );
    state.cohorts =
        Array.isArray(state.cohorts)
            ? state.cohorts
            : [];
    state.eventKnowledge =
        Array.isArray(
            state.eventKnowledge,
        )
            ? state.eventKnowledge
            : [];
    const evidence =
        findTinaCharmsAccident(
            state,
            messages,
        );
    const eventResult =
        applyCharmsMigration(
            state,
            evidence,
        );
    migrateSceneArchive(state);
    markKnowledgeCacheStale(state);
    if (!evidence) {
        state.localPresence ??= {
            version: 1,
            mapId:
                state.map
                    ?.activeMapId ||
                state.scene?.mapId ||
                '',
            roomId:
                state.map
                    ?.currentLocalNodeId ||
                state.scene?.roomId ||
                '',
            occupantActorIds:
                stableIds(
                    (state.actors || [])
                        .filter(actor =>
                            actor.present !==
                                false &&
                            actor.mapId ===
                                (
                                    state.map
                                        ?.activeMapId ||
                                    state.scene
                                        ?.mapId
                                ) &&
                            actor.roomId ===
                                (
                                    state.map
                                        ?.currentLocalNodeId ||
                                    state.scene
                                        ?.roomId
                                ))
                        .map(actor =>
                            actor.id),
                ),
            cohortIds: [],
            updatedTurn:
                Math.max(
                    0,
                    Number(
                        state.turn
                            ?.count ||
                        0,
                    ),
                ),
            source: 'migration',
        };
    }
    const modifiedFields =
        collectModifiedFields(
            beforeState,
            state,
        );
    if (!modifiedFields.length) {
        return {
            status: 'noop',
            reason:
                'already_migrated',
            beforeHash,
            afterHash: beforeHash,
            output: source,
            modifiedFields,
            eventCount: 0,
            occupantCount:
                state.localPresence
                    ?.occupantActorIds
                    ?.length ||
                0,
            witnessCount:
                state.eventKnowledge
                    ?.find(event =>
                        event.eventId ===
                            eventResult.eventId)
                    ?.witnessActorIds
                    ?.length ||
                0,
            lowConfidenceSkipped:
                Math.max(
                    0,
                    countStructuredSpellEvents(
                        messages,
                    ) -
                    (
                        evidence
                            ? 1
                            : 0
                    ),
                ),
        };
    }
    const output =
        Buffer.concat([
            Buffer.from(
                JSON.stringify(
                    split.header,
                ),
                'utf8',
            ),
            split.remainder,
        ]);
    return {
        status: 'changed',
        reason: '',
        beforeHash,
        afterHash:
            sha256(output),
        output,
        modifiedFields,
        eventCount:
            eventResult.eventId
                ? 1
                : 0,
        occupantCount:
            state.localPresence
                ?.occupantActorIds
                ?.length ||
            0,
        witnessCount:
            state.eventKnowledge
                ?.find(event =>
                    event.eventId ===
                        eventResult.eventId)
                ?.witnessActorIds
                ?.length ||
            0,
        lowConfidenceSkipped:
            Math.max(
                0,
                countStructuredSpellEvents(
                    messages,
                ) -
                (
                    evidence
                        ? 1
                        : 0
                ),
            ),
        eventId:
            eventResult.eventId,
        bodyHashBefore:
            sha256(split.remainder),
        bodyHashAfter:
            sha256(
                splitArchive(output)
                    .remainder,
            ),
    };
}

async function syncDirectory(
    directory,
) {
    const handle =
        await open(directory, 'r');
    try {
        await handle.sync();
    } finally {
        await handle.close();
    }
}

export async function atomicReplaceFile(
    file,
    content,
    expectedHash,
) {
    const absolute =
        path.resolve(file);
    const directory =
        path.dirname(absolute);
    const current =
        await readFile(absolute);
    if (
        sha256(current) !==
            expectedHash
    ) {
        throw new Error(
            `SOURCE_HASH_MISMATCH: ${absolute}`,
        );
    }
    const currentStat =
        await stat(absolute);
    const temporary =
        path.join(
            directory,
            `.${path.basename(absolute)}.presence-witness-${process.pid}-${Date.now()}.tmp`,
        );
    let temporaryExists =
        false;
    try {
        const handle =
            await open(
                temporary,
                'wx',
                currentStat.mode,
            );
        temporaryExists = true;
        try {
            await handle.writeFile(
                content,
            );
            await handle.sync();
        } finally {
            await handle.close();
        }
        const rechecked =
            await readFile(absolute);
        if (
            sha256(rechecked) !==
                expectedHash
        ) {
            throw new Error(
                `SOURCE_HASH_MISMATCH: ${absolute}`,
            );
        }
        await rename(
            temporary,
            absolute,
        );
        temporaryExists = false;
        await syncDirectory(
            directory,
        );
    } finally {
        if (temporaryExists) {
            await unlink(temporary)
                .catch(() => {});
        }
    }
}

async function atomicWriteNewFile(
    file,
    content,
) {
    const absolute =
        path.resolve(file);
    await mkdir(
        path.dirname(absolute),
        {
            recursive: true,
        },
    );
    const temporary =
        path.join(
            path.dirname(absolute),
            `.${path.basename(absolute)}.${process.pid}-${Date.now()}.tmp`,
        );
    let temporaryExists =
        false;
    try {
        const handle =
            await open(
                temporary,
                'wx',
                0o600,
            );
        temporaryExists = true;
        try {
            await handle.writeFile(
                content,
            );
            await handle.sync();
        } finally {
            await handle.close();
        }
        await rename(
            temporary,
            absolute,
        );
        temporaryExists = false;
        await syncDirectory(
            path.dirname(
                absolute,
            ),
        );
    } finally {
        if (temporaryExists) {
            await unlink(temporary)
                .catch(() => {});
        }
    }
}

function ensureActiveArchivePath(
    file,
) {
    const absolute =
        path.resolve(file);
    if (
        BACKUP_PATH_PATTERN
            .test(absolute)
    ) {
        throw new Error(
            `Backup paths are not migration inputs: ${absolute}`,
        );
    }
    return absolute;
}

async function listActiveArchives(
    directory,
) {
    const absolute =
        ensureActiveArchivePath(
            directory,
        );
    const entries =
        await readdir(
            absolute,
            {
                withFileTypes: true,
            },
        );
    return entries
        .filter(entry =>
            entry.isFile() &&
            entry.name.endsWith(
                '.jsonl',
            ))
        .map(entry =>
            path.join(
                absolute,
                entry.name,
            ))
        .sort();
}

async function planFile(file) {
    const absolute =
        ensureActiveArchivePath(
            file,
        );
    const [
        source,
        fileStat,
    ] = await Promise.all([
        readFile(absolute),
        stat(absolute),
    ]);
    const migration =
        migrateArchiveBuffer(
            source,
        );
    return {
        path: absolute,
        source,
        stat: fileStat,
        migration,
    };
}

function createRunId() {
    return new Date()
        .toISOString()
        .replace(
            /[:.]/gu,
            '-',
        );
}

async function createBackupAndManifest(
    plans,
    backupRoot,
) {
    const runDirectory =
        path.join(
            path.resolve(backupRoot),
            createRunId(),
        );
    const filesDirectory =
        path.join(
            runDirectory,
            'files',
        );
    await mkdir(
        filesDirectory,
        {
            recursive: true,
        },
    );
    const entries = [];
    for (const plan of plans) {
        const backupName = [
            sha256(plan.path)
                .slice(0, 16),
            path.basename(
                plan.path,
            ),
        ].join('-');
        const backupPath =
            path.join(
                filesDirectory,
                backupName,
            );
        await atomicWriteNewFile(
            backupPath,
            plan.source,
        );
        const backup =
            await readFile(
                backupPath,
            );
        if (
            sha256(backup) !==
                plan.migration
                    .beforeHash
        ) {
            throw new Error(
                `BACKUP_HASH_MISMATCH: ${plan.path}`,
            );
        }
        entries.push({
            path: plan.path,
            backupPath,
            before: {
                sha256:
                    plan.migration
                        .beforeHash,
                size:
                    plan.source.length,
                mtimeMs:
                    plan.stat.mtimeMs,
                mode:
                    plan.stat.mode,
            },
            after: {
                sha256:
                    plan.migration
                        .afterHash,
                size:
                    plan.migration
                        .output.length,
            },
            modifiedFields:
                plan.migration
                    .modifiedFields,
            eventCount:
                plan.migration
                    .eventCount,
            occupantCount:
                plan.migration
                    .occupantCount,
            witnessCount:
                plan.migration
                    .witnessCount,
            lowConfidenceSkipped:
                plan.migration
                    .lowConfidenceSkipped,
        });
    }
    const manifestPath =
        path.join(
            runDirectory,
            'manifest.json',
        );
    const manifest = {
        version: 1,
        schemaVersion:
            SCHEMA_VERSION,
        createdAt:
            new Date()
                .toISOString(),
        status: 'planned',
        networkCalls: 0,
        entries,
    };
    await atomicWriteNewFile(
        manifestPath,
        Buffer.from(
            `${JSON.stringify(
                manifest,
                null,
                2,
            )}\n`,
        ),
    );
    return {
        manifest,
        manifestPath,
    };
}

async function finalizeManifest(
    manifestPath,
    manifest,
) {
    const current =
        await readFile(
            manifestPath,
        );
    const next = {
        ...manifest,
        status: 'completed',
        completedAt:
            new Date()
                .toISOString(),
    };
    await atomicReplaceFile(
        manifestPath,
        Buffer.from(
            `${JSON.stringify(
                next,
                null,
                2,
            )}\n`,
        ),
        sha256(current),
    );
    return next;
}

function summarizePlans(
    mode,
    plans,
    manifestPath = null,
) {
    const files =
        plans.map(plan => ({
            path: plan.path,
            status:
                plan.migration
                    .status,
            reason:
                plan.migration
                    .reason,
            beforeHash:
                plan.migration
                    .beforeHash,
            afterHash:
                plan.migration
                    .afterHash,
            modifiedFields:
                plan.migration
                    .modifiedFields,
            eventCount:
                plan.migration
                    .eventCount,
            occupantCount:
                plan.migration
                    .occupantCount,
            witnessCount:
                plan.migration
                    .witnessCount,
            lowConfidenceSkipped:
                plan.migration
                    .lowConfidenceSkipped,
            bodyHashBefore:
                plan.migration
                    .bodyHashBefore ||
                null,
            bodyHashAfter:
                plan.migration
                    .bodyHashAfter ||
                null,
        }));
    return {
        mode,
        schemaVersion:
            SCHEMA_VERSION,
        manifestPath,
        scanned: files.length,
        changed:
            files.filter(file =>
                file.status ===
                    'changed')
                .length,
        noops:
            files.filter(file =>
                file.status ===
                    'noop')
                .length,
        skipped:
            files.filter(file =>
                file.status ===
                    'skipped')
                .length,
        networkCalls: 0,
        files,
    };
}

export async function runMigration({
    mode = 'dry-run',
    file = '',
    all = false,
    chatDirectory =
    DEFAULT_CHAT_DIRECTORY,
    backupRoot =
    DEFAULT_BACKUP_ROOT,
} = {}) {
    if (
        !['dry-run', 'apply']
            .includes(mode)
    ) {
        throw new Error(
            `Unknown migration mode: ${mode}`,
        );
    }
    if (
        Boolean(file) ===
            Boolean(all)
    ) {
        throw new Error(
            'Select exactly one of --file or --all.',
        );
    }
    const files = file
        ? [
            ensureActiveArchivePath(
                file,
            ),
        ]
        : await listActiveArchives(
            chatDirectory,
        );
    const plans = [];
    for (const target of files) {
        plans.push(
            await planFile(target),
        );
    }
    if (mode === 'dry-run') {
        return summarizePlans(
            mode,
            plans,
        );
    }
    const changedPlans =
        plans.filter(plan =>
            plan.migration
                .status ===
                'changed');
    if (!changedPlans.length) {
        return summarizePlans(
            mode,
            plans,
        );
    }
    for (const plan of changedPlans) {
        const current =
            await readFile(
                plan.path,
            );
        if (
            sha256(current) !==
                plan.migration
                    .beforeHash
        ) {
            throw new Error(
                `SOURCE_HASH_MISMATCH: ${plan.path}`,
            );
        }
    }
    const {
        manifest,
        manifestPath,
    } =
        await createBackupAndManifest(
            changedPlans,
            backupRoot,
        );
    for (const plan of changedPlans) {
        await atomicReplaceFile(
            plan.path,
            plan.migration.output,
            plan.migration
                .beforeHash,
        );
        const written =
            await readFile(
                plan.path,
            );
        if (
            sha256(written) !==
                plan.migration
                    .afterHash
        ) {
            throw new Error(
                `AFTER_HASH_MISMATCH: ${plan.path}`,
            );
        }
    }
    await finalizeManifest(
        manifestPath,
        manifest,
    );
    return summarizePlans(
        mode,
        plans,
        manifestPath,
    );
}

export async function restoreManifest(
    manifestFile,
) {
    const manifestPath =
        path.resolve(
            manifestFile,
        );
    const manifest =
        JSON.parse(
            await readFile(
                manifestPath,
                'utf8',
            ),
        );
    if (
        manifest?.version !== 1 ||
        !Array.isArray(
            manifest.entries,
        )
    ) {
        throw new Error(
            'Invalid migration manifest.',
        );
    }
    const prepared = [];
    for (
        const entry
        of manifest.entries
    ) {
        const current =
            await readFile(
                entry.path,
            );
        const currentHash =
            sha256(current);
        if (
            currentHash !==
                entry.after?.sha256
        ) {
            throw new Error(
                `RESTORE_HASH_MISMATCH: ${entry.path}`,
            );
        }
        const backup =
            await readFile(
                entry.backupPath,
            );
        if (
            sha256(backup) !==
                entry.before?.sha256
        ) {
            throw new Error(
                `BACKUP_HASH_MISMATCH: ${entry.path}`,
            );
        }
        prepared.push({
            entry,
            backup,
            currentHash,
        });
    }
    for (const item of prepared) {
        await atomicReplaceFile(
            item.entry.path,
            item.backup,
            item.currentHash,
        );
        const mtime =
            new Date(
                item.entry
                    .before
                    .mtimeMs,
            );
        await utimes(
            item.entry.path,
            mtime,
            mtime,
        );
        await syncDirectory(
            path.dirname(
                item.entry.path,
            ),
        );
    }
    return {
        mode: 'restore',
        manifestPath,
        restored:
            prepared.length,
        networkCalls: 0,
        files:
            prepared.map(item => ({
                path:
                    item.entry.path,
                beforeHash:
                    item.entry
                        .before
                        .sha256,
                restoredHash:
                    sha256(
                        item.backup,
                    ),
                requiredCurrentHash:
                    item.entry
                        .after
                        .sha256,
            })),
    };
}

export function installNetworkGuard() {
    let calls = 0;
    const blocked =
        operation => {
            calls += 1;
            throw new Error(
                `NETWORK_DISABLED_DURING_MIGRATION: ${operation}`,
            );
        };
    const originals = {
        fetch:
            global.fetch,
        httpRequest:
            http.request,
        httpGet:
            http.get,
        httpsRequest:
            https.request,
        httpsGet:
            https.get,
        netConnect:
            net.connect,
        netCreateConnection:
            net.createConnection,
        tlsConnect:
            tls.connect,
    };
    global.fetch =
        () => blocked('fetch');
    http.request =
        () => blocked('http.request');
    http.get =
        () => blocked('http.get');
    https.request =
        () => blocked('https.request');
    https.get =
        () => blocked('https.get');
    net.connect =
        () => blocked('net.connect');
    net.createConnection =
        () =>
            blocked(
                'net.createConnection',
            );
    tls.connect =
        () => blocked('tls.connect');
    return {
        get calls() {
            return calls;
        },
        restore() {
            global.fetch =
                originals.fetch;
            http.request =
                originals.httpRequest;
            http.get =
                originals.httpGet;
            https.request =
                originals
                    .httpsRequest;
            https.get =
                originals.httpsGet;
            net.connect =
                originals.netConnect;
            net.createConnection =
                originals
                    .netCreateConnection;
            tls.connect =
                originals.tlsConnect;
        },
    };
}

function parseArguments(argv) {
    const options = {
        mode: 'dry-run',
        file: '',
        all: false,
        chatDirectory:
            DEFAULT_CHAT_DIRECTORY,
        backupRoot:
            DEFAULT_BACKUP_ROOT,
        restoreManifest: '',
    };
    let explicitMode = '';
    for (
        let index = 0;
        index < argv.length;
        index += 1
    ) {
        const argument =
            argv[index];
        if (
            argument === '--dry-run' ||
            argument === '--apply'
        ) {
            const mode =
                argument.slice(2);
            if (
                explicitMode &&
                explicitMode !== mode
            ) {
                throw new Error(
                    'Choose only one of --dry-run or --apply.',
                );
            }
            explicitMode = mode;
            options.mode = mode;
        } else if (
            argument === '--file'
        ) {
            options.file =
                argv[++index] || '';
        } else if (
            argument === '--all'
        ) {
            options.all = true;
        } else if (
            argument ===
                '--chat-directory'
        ) {
            options.chatDirectory =
                argv[++index] || '';
        } else if (
            argument ===
                '--backup-root'
        ) {
            options.backupRoot =
                argv[++index] || '';
        } else if (
            argument ===
                '--restore-manifest'
        ) {
            options.restoreManifest =
                argv[++index] || '';
        } else {
            throw new Error(
                `Unknown argument: ${argument}`,
            );
        }
    }
    if (
        options.restoreManifest
    ) {
        if (
            options.file ||
            options.all ||
            explicitMode
        ) {
            throw new Error(
                '--restore-manifest cannot be combined with migration selection or mode flags.',
            );
        }
        return options;
    }
    if (
        Boolean(options.file) ===
            Boolean(options.all)
    ) {
        throw new Error(
            'Select exactly one of --file or --all.',
        );
    }
    return options;
}

export async function runCli(
    argv,
) {
    const guard =
        installNetworkGuard();
    try {
        const options =
            parseArguments(argv);
        const result =
            options.restoreManifest
                ? await restoreManifest(
                    options
                        .restoreManifest,
                )
                : await runMigration(
                    options,
                );
        result.networkCalls =
            guard.calls;
        if (guard.calls !== 0) {
            throw new Error(
                `Migration attempted ${guard.calls} network calls.`,
            );
        }
        return result;
    } finally {
        guard.restore();
    }
}

const isMain =
    process.argv[1] &&
    fileURLToPath(
        import.meta.url,
    ) ===
        path.resolve(
            process.argv[1],
        );

if (isMain) {
    runCli(process.argv.slice(2))
        .then(result => {
            process.stdout.write(
                `${JSON.stringify(
                    result,
                    null,
                    2,
                )}\n`,
            );
        })
        .catch(error => {
            process.stderr.write(
                `${String(
                    error?.stack ||
                    error,
                )}\n`,
            );
            process.exitCode = 1;
        });
}
