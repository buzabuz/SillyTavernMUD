#!/usr/bin/env node

import {
    createHash,
} from 'node:crypto';
import {
    readFile,
    stat,
} from 'node:fs/promises';
import path from 'node:path';

import {
    migrateLanguageAuthorityV1,
} from '../public/scripts/extensions/hogwarts-mud/domain/language-authority-migration.js';
import {
    DEFAULT_ARCHIVE_PATH,
    auditLanguageStructure,
} from './audit-hogwarts-language-boundary.mjs';

function sha256(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function parseArguments(args) {
    const options = {
        archivePath:
            DEFAULT_ARCHIVE_PATH,
    };
    for (
        let index = 0;
        index < args.length;
        index++
    ) {
        if (
            args[index] ===
            '--archive'
        ) {
            options.archivePath =
                path.resolve(
                    args[
                        index += 1
                    ],
                );
        } else {
            throw new TypeError(
                `Unknown argument: ${args[index]}`,
            );
        }
    }
    return options;
}

function parseArchive(contents) {
    const records =
        contents
            .trim()
            .split(/\n/u)
            .map(line =>
                JSON.parse(line));
    const state =
        records[0]
            ?.chat_metadata
            ?.hogwartsMud;
    if (!state) {
        throw new TypeError(
            'Archive has no Hogwarts world State.',
        );
    }
    return {
        firstRecord:
            records[0],
        state,
        chat:
            records.slice(1),
    };
}

function versions(state) {
    return {
        languageAuthorityVersion:
            state
                .languageAuthorityVersion ??
            null,
        characterLanguageVersion:
            state
                .characterLanguageVersion ??
            null,
        calendarVersion:
            state.calendar
                ?.version ??
            null,
        itemSystemVersion:
            state
                .itemSystemVersion ??
            null,
        materialStateVersion:
            state
                .materialStateVersion ??
            null,
        spellbookVersion:
            state.spellbook
                ?.version ??
            null,
        localMapVersion:
            state.map
                ?.localMapVersion ??
            null,
    };
}

function changeCounts(changes) {
    const counts = {};
    for (const change of changes) {
        const domain =
            String(
                change.path ||
                '',
            ).split(/[.[\]]/u)
                .filter(Boolean)
                .slice(0, 2)
                .join('.');
        counts[domain] =
            (
                counts[
                    domain
                ] ||
                0
            ) +
            1;
    }
    return Object.fromEntries(
        Object.entries(counts)
            .sort((
                left,
                right,
            ) =>
                right[1] -
                left[1] ||
                left[0]
                    .localeCompare(
                        right[0],
                        'en',
                    )),
    );
}

async function metric(
    archivePath,
) {
    const [
        contents,
        stats,
    ] = await Promise.all([
        readFile(
            archivePath,
            'utf8',
        ),
        stat(archivePath),
    ]);
    return {
        contents,
        sha256:
            sha256(contents),
        bytes:
            stats.size,
        mtimeMs:
            stats.mtimeMs,
    };
}

const options =
    parseArguments(
        process.argv.slice(2),
    );
const before =
    await metric(
        options.archivePath,
    );
const archive =
    parseArchive(
        before.contents,
    );
const migration =
    migrateLanguageAuthorityV1({
        worldState:
            archive.state,
        chat:
            archive.chat,
    });
const audit =
    auditLanguageStructure({
        state:
            migration.nextState,
        messages:
            migration.nextChat,
    });
const replay =
    migrateLanguageAuthorityV1({
        worldState:
            migration.nextState,
        chat:
            migration.nextChat,
    });
const after =
    await metric(
        options.archivePath,
    );
const nextJsonl = [
    JSON.stringify({
        ...archive
            .firstRecord,
        chat_metadata: {
            ...archive
                .firstRecord
                .chat_metadata,
            hogwartsMud:
                migration
                    .nextState,
        },
    }),
    ...migration
        .nextChat
        .map(message =>
            JSON.stringify(
                message,
            )),
].join('\n');

const report = {
    schemaVersion: 1,
    mode: 'read_only_dry_run',
    archive: {
        path:
            options.archivePath,
        timelineEpoch:
            archive.state
                .timelineEpoch,
        stateRevision:
            archive.state
                .stateRevision,
        sourceBefore: {
            sha256:
                before.sha256,
            bytes:
                before.bytes,
            mtimeMs:
                before.mtimeMs,
        },
        sourceAfter: {
            sha256:
                after.sha256,
            bytes:
                after.bytes,
            mtimeMs:
                after.mtimeMs,
        },
        sourceUnchanged:
            before.sha256 ===
                after.sha256 &&
            before.bytes ===
                after.bytes &&
            before.mtimeMs ===
                after.mtimeMs,
    },
    beforeVersions:
        versions(
            archive.state,
        ),
    afterVersions:
        versions(
            migration.nextState,
        ),
    migration: {
        changed:
            migration.changed,
        nextJsonlSha256:
            sha256(nextJsonl),
        nextJsonlBytes:
            Buffer.byteLength(
                nextJsonl,
            ),
        timelineEntries:
            migration.report
                .timelineEntries,
        fieldChangeCount:
            migration.report
                .changes
                .length,
        changeCounts:
            changeCounts(
                migration.report
                    .changes,
            ),
        translationCandidateCount:
            migration
                .translationCandidates
                .length,
        rawSegmentCount:
            migration.report
                .rawSegmentCount,
        skippedRecordCount:
            migration.report
                .skippedRecordCount,
    },
    languageAudit: {
        violationCount:
            audit.violations
                .length,
        violations:
            audit.violations,
        unknownPaths:
            audit.unknownPaths,
    },
    idempotence: {
        secondChanged:
            replay.changed,
        stateByteEqual:
            JSON.stringify(
                replay.nextState,
            ) ===
            JSON.stringify(
                migration
                    .nextState,
            ),
        chatByteEqual:
            JSON.stringify(
                replay.nextChat,
            ) ===
            JSON.stringify(
                migration
                    .nextChat,
            ),
    },
};

console.log(
    JSON.stringify(
        report,
        null,
        2,
    ),
);

if (
    !report.archive
        .sourceUnchanged ||
    report.languageAudit
        .violationCount ||
    report.languageAudit
        .unknownPaths
        .length ||
    report.idempotence
        .secondChanged ||
    !report.idempotence
        .stateByteEqual ||
    !report.idempotence
        .chatByteEqual
) {
    process.exitCode = 1;
}
