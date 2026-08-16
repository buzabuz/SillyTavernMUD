/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import {
    existsSync,
} from 'node:fs';
import {
    mkdtemp,
    readFile,
    rm,
    stat,
    writeFile,
} from 'node:fs/promises';
import {
    tmpdir,
} from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    DEFAULT_ARCHIVE_PATH,
    DEFAULT_BASELINE_PATH,
    LANGUAGE_CLASSES,
    auditLanguageBoundary,
    classifyLanguagePath,
    evaluateRatchet,
    findForbiddenProductionImports,
} from '../scripts/audit-hogwarts-language-boundary.mjs';
import {
    runTask6Acceptance,
} from '../scripts/dry-run-hogwarts-actor-context-task6.mjs';

const LANGUAGE_CONTRACT_PATH =
    path.resolve(
        '.trae/specs/hogwarts-runtime-contracts/language-boundary.md',
    );

function sha256(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

async function fileMetric(file) {
    const [
        contents,
        stats,
    ] = await Promise.all([
        readFile(file),
        stat(file),
    ]);
    return {
        sha256:
            sha256(contents),
        bytes:
            contents.length,
        mtimeMs:
            stats.mtimeMs,
    };
}

async function baseline() {
    return JSON.parse(
        await readFile(
            DEFAULT_BASELINE_PATH,
            'utf8',
        ),
    );
}

test(
    'language classes are unique and include non-fatal raw model evidence',
    () => {
        assert.equal(
            LANGUAGE_CLASSES.length,
            7,
        );
        assert.equal(
            new Set(
                LANGUAGE_CLASSES,
            ).size,
            LANGUAGE_CLASSES.length,
        );
        assert.ok(
            LANGUAGE_CLASSES.includes(
                'canonical_en',
            ),
        );
        assert.ok(
            LANGUAGE_CLASSES.includes(
                'model_output_evidence',
            ),
        );
        assert.notEqual(
            LANGUAGE_CLASSES.indexOf(
                'canonical_en',
            ),
            LANGUAGE_CLASSES.indexOf(
                'model_output_evidence',
            ),
        );
    },
);

test(
    'focused path contract separates authority, input, cache, alias, and unknown',
    () => {
        assert.equal(
            classifyLanguagePath(
                'actorLibrary[].nameEn',
            ).classification,
            'canonical_en',
        );
        assert.equal(
            classifyLanguagePath(
                'actorLibrary[].aliases[]',
            ).classification,
            'entity_alias',
        );
        assert.equal(
            classifyLanguagePath(
                'chat.user[].mes',
            ).classification,
            'player_input_evidence',
        );
        assert.equal(
            classifyLanguagePath(
                'chat.assistant[].extra.hogwartsMud.translatedZh',
            ).classification,
            'dynamic_locale_cache',
        );
        assert.equal(
            classifyLanguagePath(
                'eventKnowledge[].perception.evidenceText',
            ).classification,
            'model_output_evidence',
        );
        assert.equal(
            classifyLanguagePath(
                'newDomain.unregisteredSummary',
            ).classification,
            'unknown',
        );
    },
);

test(
    'ratchet rejects a new persisted canonical language violation',
    async () => {
        const result =
            evaluateRatchet(
                [{
                    category:
                        'canonical_en_contains_cjk',
                    path:
                        'newDomain.summaryEn',
                    count: 1,
                }],
                await baseline(),
            );
        assert.equal(
            result.passed,
            false,
        );
        assert.deepEqual(
            result.failures,
            [{
                category:
                    'canonical_en_contains_cjk',
                path:
                    'newDomain.summaryEn',
                current: 1,
                maximum: 0,
            }],
        );
    },
);

test(
    'ratchet rejects an alias promoted to semantic authority',
    async () => {
        const result =
            evaluateRatchet(
                [{
                    category:
                        'alias_used_as_semantic_authority',
                    path:
                        'actorLibrary[].aliases[]',
                    count: 1,
                }],
                await baseline(),
            );
        assert.equal(
            result.passed,
            false,
        );
        assert.deepEqual(
            result.failures,
            [{
                category:
                    'alias_used_as_semantic_authority',
                path:
                    'actorLibrary[].aliases[]',
                current: 1,
                maximum: 0,
            }],
        );
    },
);

test(
    'ratchet rejects growth and allows an unchanged or reduced ceiling',
    async () => {
        const currentBaseline =
            await baseline();
        const maximum =
            currentBaseline
                .violations
                .canonical_en_contains_cjk[
                    'checks[].reasonEn'
                ];
        const unchanged =
            evaluateRatchet(
                [{
                    category:
                        'canonical_en_contains_cjk',
                    path:
                        'checks[].reasonEn',
                    count:
                        maximum,
                }],
                currentBaseline,
            );
        const reduced =
            evaluateRatchet(
                [{
                    category:
                        'canonical_en_contains_cjk',
                    path:
                        'checks[].reasonEn',
                    count:
                        maximum - 1,
                }],
                currentBaseline,
            );
        const increased =
            evaluateRatchet(
                [{
                    category:
                        'canonical_en_contains_cjk',
                    path:
                        'checks[].reasonEn',
                    count:
                        maximum + 1,
                }],
                currentBaseline,
            );
        assert.equal(
            unchanged.passed,
            true,
        );
        assert.equal(
            reduced.passed,
            true,
        );
        assert.equal(
            increased.passed,
            false,
        );
        assert.deepEqual(
            increased.failures,
            [{
                category:
                    'canonical_en_contains_cjk',
                path:
                    'checks[].reasonEn',
                current:
                    maximum + 1,
                maximum,
            }],
        );
    },
);

test(
    'fixture audit is read-only and classifies current authority/cache boundaries',
    async () => {
        const directory =
            await mkdtemp(
                path.join(
                    tmpdir(),
                    'hogwarts-language-audit-',
                ),
            );
        const archivePath =
            path.join(
                directory,
                'fixture.jsonl',
            );
        const records = [
            {
                user_name: 'User',
                character_name:
                    'Director',
                chat_metadata: {
                    hogwartsMud: {
                        stateRevision: 1,
                        turn: {
                            count: 0,
                        },
                        scene: {
                            name:
                                '中文场景',
                            nameEn:
                                'English Scene',
                            summary:
                                '中文摘要',
                            summaryEn:
                                'English summary.',
                        },
                        eventKnowledge: [{
                            summaryEn:
                                'An English fact.',
                        }],
                    },
                },
            },
            {
                is_user: true,
                is_system: false,
                mes: '我看向门口。',
                extra: {
                    hogwartsMud: {
                        role:
                            'player_turn',
                    },
                },
            },
            {
                is_user: false,
                is_system: false,
                mes: 'The door opened.',
                extra: {
                    display_text:
                        '门打开了。',
                    hogwartsMud: {
                        role:
                            'scene_turn',
                        sourceEn:
                            'The door opened.',
                        translatedZh:
                            '门打开了。',
                    },
                },
            },
        ];
        await writeFile(
            archivePath,
            `${records
                .map(record =>
                    JSON.stringify(
                        record,
                    ))
                .join('\n')}\n`,
            'utf8',
        );
        try {
            const before =
                await fileMetric(
                    archivePath,
                );
            const report =
                await auditLanguageBoundary({
                    archivePath,
                    includePrompts:
                        false,
                });
            const after =
                await fileMetric(
                    archivePath,
                );
            assert.deepEqual(
                after,
                before,
            );
            assert.equal(
                report.archive
                    .unchanged,
                true,
            );
            assert.deepEqual(
                report.unknownPaths,
                [],
            );
            assert.ok(
                report.rows.some(row =>
                    row.path ===
                        'scene.nameEn' &&
                    row.classification ===
                        'canonical_en'),
            );
            assert.ok(
                report.rows.some(row =>
                    row.path ===
                        'scene.name' &&
                    row.classification ===
                        'dynamic_locale_cache'),
            );
        } finally {
            await rm(
                directory,
                {
                    recursive: true,
                    force: true,
                },
            );
        }
    },
);

test(
    'offline audit is not imported by production response handling',
    async () => {
        assert.deepEqual(
            await findForbiddenProductionImports(),
            [],
        );
    },
);

test(
    'living contract makes language mismatch non-fatal and forbids online audit use',
    async () => {
        const contract =
            await readFile(
                LANGUAGE_CONTRACT_PATH,
                'utf8',
            );
        assert.match(
            contract,
            /Non-English model text is not a fatal model error/u,
        );
        assert.match(
            contract,
            /cannot reject a whole response/u,
        );
        assert.match(
            contract,
            /not imported by production Prompt builders, response parsers,/u,
        );
        assert.match(
            contract,
            /live model output is never intercepted/u,
        );
    },
);

test(
    'real Tina baseline passes read-only ratchet without Prompt calls',
    {
        skip:
            !existsSync(
                DEFAULT_ARCHIVE_PATH,
            ),
    },
    async () => {
        const before =
            await fileMetric(
                DEFAULT_ARCHIVE_PATH,
            );
        const report =
            await auditLanguageBoundary({
                archivePath:
                    DEFAULT_ARCHIVE_PATH,
                baseline:
                    await baseline(),
                includePrompts:
                    false,
            });
        const after =
            await fileMetric(
                DEFAULT_ARCHIVE_PATH,
            );
        assert.deepEqual(
            after,
            before,
        );
        assert.equal(
            report.passed,
            true,
        );
        assert.equal(
            report.archive
                .unchanged,
            true,
        );
        assert.deepEqual(
            report.unknownPaths,
            [],
        );
        assert.equal(
            report.ratchet
                .passed,
            true,
        );
        assert.deepEqual(
            report
                .productionAuditImports,
            [],
        );
    },
);

test(
    'real Tina Low build-only remains zero-call and preserves the active archive',
    {
        skip:
            !existsSync(
                DEFAULT_ARCHIVE_PATH,
            ),
    },
    async () => {
        const before =
            await fileMetric(
                DEFAULT_ARCHIVE_PATH,
            );
        const report =
            await runTask6Acceptance(
                DEFAULT_ARCHIVE_PATH,
                {
                    includeMigrationEvidence:
                        false,
                },
            );
        const after =
            await fileMetric(
                DEFAULT_ARCHIVE_PATH,
            );
        assert.deepEqual(
            after,
            before,
        );
        assert.equal(
            report.archive
                .shaAndMtimeUnchanged,
            true,
        );
        assert.equal(
            report.prompt
                .buildOnly
                .modelAdapterCalls,
            0,
        );
        assert.equal(
            report.prompt
                .buildOnly
                .externalNetworkCalls,
            0,
        );
        assert.ok(
            report.prompt
                .initial
                .total
                .characters <=
            47_626,
        );
        const serialized =
            JSON.stringify(
                report.prompt,
            );
        assert.doesNotMatch(
            serialized,
            /Tina's blunt celebrity interrogation/u,
        );
        assert.doesNotMatch(
            serialized,
            /api[_-]?key/iu,
        );
    },
);
