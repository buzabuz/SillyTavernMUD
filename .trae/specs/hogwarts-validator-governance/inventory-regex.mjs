import {
    createHash,
} from 'node:crypto';
import {
    readFile,
    readdir,
    writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {
    fileURLToPath,
} from 'node:url';

import {
    parse,
} from 'acorn';

const CATEGORIES = new Set([
    'accepted_lexical',
    'semantic_runtime',
    'semantic_migration',
    'dead_or_retired',
    'unclassified',
]);
const SCRIPT_DIRECTORY =
    path.dirname(
        fileURLToPath(
            import.meta.url,
        ),
    );
const PROJECT_ROOT =
    path.resolve(
        SCRIPT_DIRECTORY,
        '..',
        '..',
        '..',
    );
const MANIFEST_PATH =
    path.join(
        SCRIPT_DIRECTORY,
        'regex-classification.json',
    );
const BASELINE_PATH =
    path.join(
        SCRIPT_DIRECTORY,
        'regex-semantic-baseline.json',
    );
const RETIREMENTS_PATH =
    path.join(
        SCRIPT_DIRECTORY,
        'regex-semantic-retirements.json',
    );
const SEMANTIC_BASELINE_SHA256 =
    'bfb8f62530dc0d6a0b3e8973f822eca153837f6bdd81e13f3ace8857cc7b7b63';
const SEMANTIC_RETIREMENTS_SHA256 =
    'a21388bc9e70f2f3f6f54a7d4e5c2e607ef8ba5a91c350659403ac610a46ca4e';
const REGEX_MANIFEST_SHA256 =
    'c9acae3bc0bf4f2e327ffa1eb42e524e170fc50cc6e1a9e30445f816e92ec6c2';
const SEMANTIC_RETIREMENT_EVENT_COUNT =
    0;
const SCAN_ROOTS = [
    path.join(
        PROJECT_ROOT,
        'public',
        'scripts',
        'extensions',
        'hogwarts-mud',
    ),
    path.join(
        PROJECT_ROOT,
        'src',
        'hogwarts-mud',
    ),
];

function sha256(value) {
    return createHash('sha256')
        .update(
            String(value || ''),
        )
        .digest('hex');
}

function assertSerializedHash(
    serialized,
    expectedHash,
    label,
) {
    if (
        sha256(
            serialized,
        ) !==
        expectedHash
    ) {
        throw new Error(
            `${label} hash differs from the reviewed script anchor.`,
        );
    }
}

async function listJavaScriptFiles(
    directory,
) {
    const output = [];
    const entries =
        await readdir(
            directory,
            {
                withFileTypes: true,
            },
        );
    for (const entry of entries) {
        const absolutePath =
            path.join(
                directory,
                entry.name,
            );
        if (entry.isDirectory()) {
            output.push(
                ...await listJavaScriptFiles(
                    absolutePath,
                ),
            );
        } else if (
            entry.isFile() &&
            entry.name.endsWith('.js')
        ) {
            output.push(
                absolutePath,
            );
        }
    }
    return output;
}

function walk(
    node,
    visit,
    ancestors = [],
) {
    if (
        !node ||
        typeof node !== 'object'
    ) {
        return;
    }
    visit(
        node,
        ancestors,
    );
    const nextAncestors = [
        ...ancestors,
        node,
    ];
    for (const [
        key,
        value,
    ] of Object.entries(node)) {
        if (
            [
                'end',
                'loc',
                'start',
            ].includes(key)
        ) {
            continue;
        }
        if (Array.isArray(value)) {
            for (const child of value) {
                walk(
                    child,
                    visit,
                    nextAncestors,
                );
            }
        } else if (
            value &&
            typeof value ===
                'object' &&
            typeof value.type ===
                'string'
        ) {
            walk(
                value,
                visit,
                nextAncestors,
            );
        }
    }
}

function declarationName(node) {
    if (
        node?.type ===
        'VariableDeclarator'
    ) {
        return node.id?.name || '';
    }
    if (
        [
            'FunctionDeclaration',
            'FunctionExpression',
        ].includes(node?.type)
    ) {
        return node.id?.name || '';
    }
    if (
        [
            'MethodDefinition',
            'PropertyDefinition',
        ].includes(node?.type)
    ) {
        return (
            node.key?.name ||
            node.key?.value ||
            ''
        );
    }
    return '';
}

function ownerName(ancestors) {
    for (
        let index =
            ancestors.length - 1;
        index >= 0;
        index--
    ) {
        const name =
            declarationName(
                ancestors[index],
            );
        if (name) {
            return name;
        }
    }
    return '<module>';
}

function regexIdentity(node, source) {
    if (
        node.type === 'Literal' &&
        node.regex
    ) {
        return {
            kind: 'literal',
            pattern:
                node.regex.pattern,
            flags:
                node.regex.flags,
            source:
                source.slice(
                    node.start,
                    node.end,
                ),
        };
    }
    return {
        kind: 'dynamic',
        pattern: '',
        flags: '',
        source:
            source.slice(
                node.start,
                node.end,
            ),
    };
}

async function scanFile(absolutePath) {
    const source =
        await readFile(
            absolutePath,
            'utf8',
        );
    const relativePath =
        path.relative(
            PROJECT_ROOT,
            absolutePath,
        );
    const syntaxTree =
        parse(
            source,
            {
                ecmaVersion:
                    'latest',
                locations: true,
                sourceType:
                    'module',
            },
        );
    const candidates = [];
    walk(
        syntaxTree,
        (
            node,
            ancestors,
        ) => {
            const isLiteral =
                node.type ===
                    'Literal' &&
                Boolean(
                    node.regex,
                );
            const isDynamic =
                node.type ===
                    'NewExpression' &&
                node.callee?.name ===
                    'RegExp';
            if (
                !isLiteral &&
                !isDynamic
            ) {
                return;
            }
            candidates.push({
                file:
                    relativePath,
                line:
                    node.loc.start.line,
                column:
                    node.loc.start.column,
                owner:
                    ownerName(
                        ancestors,
                    ),
                ...regexIdentity(
                    node,
                    source,
                ),
            });
        },
    );
    candidates.sort(
        (
            left,
            right,
        ) =>
            left.line -
                right.line ||
            left.column -
                right.column,
    );
    const occurrences =
        new Map();
    return candidates.map(row => {
        const occurrenceKey = [
            row.owner,
            row.kind,
            row.pattern,
            row.flags,
            row.source,
        ].join('\u0000');
        const occurrence =
            occurrences.get(
                occurrenceKey,
            ) || 0;
        occurrences.set(
            occurrenceKey,
            occurrence + 1,
        );
        const fingerprintSource = [
            row.file,
            row.owner,
            row.kind,
            row.pattern,
            row.flags,
            row.source,
            occurrence,
        ].join('\u0000');
        return {
            id:
                `regex_${sha256(
                    fingerprintSource,
                ).slice(0, 20)}`,
            ...row,
            occurrence,
        };
    });
}

async function scanProject() {
    const files = (
        await Promise.all(
            SCAN_ROOTS.map(
                listJavaScriptFiles,
            ),
        )
    )
        .flat()
        .sort();
    const rows = (
        await Promise.all(
            files.map(scanFile),
        )
    )
        .flat()
        .sort((
            left,
            right,
        ) =>
            left.file.localeCompare(
                right.file,
            ) ||
            left.line -
                right.line ||
            left.column -
                right.column);
    return rows;
}

async function readExistingManifest() {
    try {
        const serialized =
            await readFile(
                MANIFEST_PATH,
                'utf8',
            );
        assertSerializedHash(
            serialized,
            REGEX_MANIFEST_SHA256,
            'Regex classification manifest',
        );
        return JSON.parse(
            serialized,
        );
    } catch (error) {
        if (
            error?.code ===
            'ENOENT'
        ) {
            return null;
        }
        throw error;
    }
}

function manifestRowsById(
    manifest,
) {
    return new Map(
        (
            manifest?.rows ||
            []
        ).map(row => [
            row.id,
            row,
        ]),
    );
}

function buildManifest(
    scannedRows,
    existingById,
) {
    const rows =
        scannedRows.map(row => {
            const existing =
                existingById.get(
                    row.id,
                );
            return {
                ...row,
                category:
                    CATEGORIES.has(
                        existing
                            ?.category,
                    )
                        ? existing
                            .category
                        : 'unclassified',
                rationale:
                    String(
                        existing
                            ?.rationale ||
                        '',
                    ),
                targetOwner:
                    String(
                        existing
                            ?.targetOwner ||
                        '',
                    ),
                deterministicOwner:
                    String(
                        existing
                            ?.deterministicOwner ||
                        '',
                    ),
                phase2Action:
                    String(
                        existing
                            ?.phase2Action ||
                        '',
                    ),
            };
        });
    return {
        manifestVersion: 1,
        scanRoots:
            SCAN_ROOTS.map(root =>
                path.relative(
                    PROJECT_ROOT,
                    root,
                )),
        rowCount:
            rows.length,
        sourceFingerprint:
            sha256(
                rows.map(row =>
                    row.id)
                    .join('\n'),
            ),
        rows,
    };
}

function assertManifest(
    manifest,
    scannedRows,
    {
        requireClassified =
            false,
    } = {},
) {
    if (
        Number(
            manifest
                ?.manifestVersion,
        ) !== 1 ||
        !Array.isArray(
            manifest?.rows,
        )
    ) {
        throw new Error(
            'Regex manifest is missing or invalid.',
        );
    }
    const manifestIds =
        manifest.rows.map(row =>
            row.id);
    const scannedIds =
        scannedRows.map(row =>
            row.id);
    if (
        JSON.stringify(
            manifestIds,
        ) !==
        JSON.stringify(
            scannedIds,
        )
    ) {
        throw new Error(
            'Regex source and classification manifest differ. Run inventory-regex.mjs --write, then classify every new row.',
        );
    }
    const expectedScanRoots =
        SCAN_ROOTS.map(root =>
            path.relative(
                PROJECT_ROOT,
                root,
            ));
    const expectedFingerprint =
        sha256(
            scannedIds.join(
                '\n',
            ),
        );
    if (
        Number(
            manifest.rowCount,
        ) !==
            scannedRows.length ||
        manifest
            .sourceFingerprint !==
            expectedFingerprint ||
        JSON.stringify(
            manifest.scanRoots,
        ) !==
            JSON.stringify(
                expectedScanRoots,
            )
    ) {
        throw new Error(
            'Regex manifest metadata differs from the current AST scan.',
        );
    }
    const identityFields = [
        'id',
        'file',
        'line',
        'column',
        'owner',
        'kind',
        'pattern',
        'flags',
        'source',
        'occurrence',
    ];
    manifest.rows.forEach((
        row,
        index,
    ) => {
        const scanned =
            scannedRows[index];
        for (const field of identityFields) {
            if (
                row[field] !==
                scanned[field]
            ) {
                throw new Error(
                    `Regex manifest ${row.id || `<row:${index}>`} differs from the AST scan at ${field}.`,
                );
            }
        }
    });
    for (const row of manifest.rows) {
        if (
            !CATEGORIES.has(
                row.category,
            )
        ) {
            throw new Error(
                `Regex ${row.id} has invalid category ${row.category || '<empty>'}.`,
            );
        }
        if (
            requireClassified &&
            row.category ===
                'unclassified'
        ) {
            throw new Error(
                `Regex ${row.id} remains unclassified at ${row.file}:${row.line}.`,
            );
        }
        if (
            requireClassified &&
            row.category !==
                'unclassified' &&
            [
                row.rationale,
                row.targetOwner,
                row.deterministicOwner,
                row.phase2Action,
            ].some(
                value =>
                    !String(
                        value ||
                        '',
                    ).trim(),
            )
        ) {
            throw new Error(
                `Regex ${row.id} requires rationale, targetOwner, deterministicOwner and phase2Action.`,
            );
        }
    }
}

async function readSemanticBaseline() {
    let baseline;
    try {
        const serialized =
            await readFile(
                BASELINE_PATH,
                'utf8',
            );
        assertSerializedHash(
            serialized,
            SEMANTIC_BASELINE_SHA256,
            'Regex semantic baseline',
        );
        baseline =
            JSON.parse(
                serialized,
            );
    } catch (error) {
        if (
            error?.code ===
            'ENOENT'
        ) {
            throw new Error(
                'Regex semantic baseline is missing. Establish and review the Phase 1 baseline before enforcing classification.',
            );
        }
        throw error;
    }
    if (
        Number(
            baseline
                ?.baselineVersion,
        ) !== 1 ||
        !Array.isArray(
            baseline?.rows,
        )
    ) {
        throw new Error(
            'Regex semantic baseline is invalid.',
        );
    }
    return baseline;
}

async function readSemanticRetirements() {
    let retirements;
    try {
        const serialized =
            await readFile(
                RETIREMENTS_PATH,
                'utf8',
            );
        assertSerializedHash(
            serialized,
            SEMANTIC_RETIREMENTS_SHA256,
            'Regex semantic retirement ledger',
        );
        retirements =
            JSON.parse(
                serialized,
            );
    } catch (error) {
        if (
            error?.code ===
            'ENOENT'
        ) {
            throw new Error(
                'Regex semantic retirement ledger is missing.',
            );
        }
        throw error;
    }
    if (
        Number(
            retirements
                ?.ledgerVersion,
        ) !== 1 ||
        !Array.isArray(
            retirements?.events,
        )
    ) {
        throw new Error(
            'Regex semantic retirement ledger is invalid.',
        );
    }
    if (
        retirements.events.length !==
        SEMANTIC_RETIREMENT_EVENT_COUNT
    ) {
        throw new Error(
            'Regex semantic retirement event count differs from the reviewed script anchor.',
        );
    }
    return retirements;
}

function semanticRows(manifest) {
    return manifest.rows
        .filter(row =>
            [
                'semantic_runtime',
                'semantic_migration',
            ].includes(
                row.category,
            ))
        .map(row => ({
            id:
                row.id,
            category:
                row.category,
            targetOwner:
                row.targetOwner,
            deterministicOwner:
                row
                    .deterministicOwner,
            phase2Action:
                row.phase2Action,
        }))
        .sort(
            (
                left,
                right,
            ) =>
                left.id.localeCompare(
                    right.id,
                ),
        );
}

function assertSemanticBaseline(
    manifest,
    baseline,
    retirements,
) {
    const baselineById =
        new Map(
            baseline.rows.map(row => [
                row.id,
                row,
            ]),
        );
    if (
        baselineById.size !==
        baseline.rows.length
    ) {
        throw new Error(
            'Regex semantic baseline contains duplicate IDs.',
        );
    }
    const currentById =
        new Map(
            manifest.rows.map(row => [
                row.id,
                row,
            ]),
        );
    const retiredById =
        new Map();
    for (
        const event of
        retirements.events
    ) {
        if (
            !event?.id ||
            retiredById.has(
                event.id,
            )
        ) {
            throw new Error(
                `Regex semantic retirement ledger contains a missing or duplicate ID ${event?.id || '<empty>'}.`,
            );
        }
        if (
            !baselineById.has(
                event.id,
            )
        ) {
            throw new Error(
                `Retired semantic regex ${event.id} is absent from the immutable baseline.`,
            );
        }
        if (
            [
                event.retiredAt,
                event.changeId,
                event.evidence,
            ].some(
                value =>
                    !String(
                        value ||
                        '',
                    ).trim(),
            )
        ) {
            throw new Error(
                `Retirement event ${event.id} requires retiredAt, changeId and evidence.`,
            );
        }
        retiredById.set(
            event.id,
            event,
        );
    }
    for (const row of manifest.rows) {
        const isSemantic =
            [
                'semantic_runtime',
                'semantic_migration',
            ].includes(
                row.category,
            );
        const baselineRow =
            baselineById.get(
                row.id,
            );
        if (
            isSemantic &&
            !baselineRow
        ) {
            throw new Error(
                `New semantic regex ${row.id} is forbidden at ${row.file}:${row.line}; semantic regex may only decrease.`,
            );
        }
        if (retiredById.has(row.id)) {
            throw new Error(
                `Retired semantic regex ${row.id} was reintroduced at ${row.file}:${row.line}.`,
            );
        }
        if (
            !baselineRow
        ) {
            continue;
        }
        if (!isSemantic) {
            throw new Error(
                `Existing semantic regex ${row.id} was relabelled instead of removed from ${row.file}:${row.line}.`,
            );
        }
        for (const field of [
            'category',
            'targetOwner',
            'deterministicOwner',
            'phase2Action',
        ]) {
            if (
                row[field] !==
                baselineRow[field]
            ) {
                throw new Error(
                    `Registered ownership for semantic regex ${row.id} changed at ${field}; revise the Phase 1 baseline only with explicit approval.`,
                );
            }
        }
    }
    for (const baselineRow of baseline.rows) {
        if (
            retiredById.has(
                baselineRow.id,
            )
        ) {
            continue;
        }
        if (
            !currentById.has(
                baselineRow.id,
            )
        ) {
            throw new Error(
                `Semantic regex ${baselineRow.id} disappeared without an append-only retirement event.`,
            );
        }
    }
}

async function runSemanticGateSelfTest() {
    const baselineRow = {
        id: 'regex_baseline',
        category:
            'semantic_runtime',
        targetOwner:
            'local_post_core_1_7b',
        deterministicOwner:
            'test reducer',
        phase2Action:
            'remove_and_replace_with_registered_semantic_owner',
    };
    const sourceRow = {
        ...baselineRow,
        file: 'test.js',
        line: 1,
    };
    const baseline = {
        rows: [
            baselineRow,
        ],
    };
    const noRetirements = {
        events: [],
    };
    const retired = {
        events: [
            {
                id:
                    baselineRow.id,
                retiredAt:
                    '2026-08-16',
                changeId:
                    'self-test',
                evidence:
                    'synthetic source removal',
            },
        ],
    };
    const expectFailure =
        (
            label,
            manifest,
            retirements,
        ) => {
            try {
                assertSemanticBaseline(
                    manifest,
                    baseline,
                    retirements,
                );
            } catch {
                return;
            }
            throw new Error(
                `Semantic gate self-test ${label} unexpectedly passed.`,
            );
        };

    assertSemanticBaseline(
        {
            rows: [
                sourceRow,
            ],
        },
        baseline,
        noRetirements,
    );
    assertSemanticBaseline(
        {
            rows: [],
        },
        baseline,
        retired,
    );
    expectFailure(
        'unregistered deletion',
        {
            rows: [],
        },
        noRetirements,
    );
    expectFailure(
        'retired resurrection',
        {
            rows: [
                sourceRow,
            ],
        },
        retired,
    );
    expectFailure(
        'new semantic ID',
        {
            rows: [
                sourceRow,
                {
                    ...sourceRow,
                    id: 'regex_new',
                    line: 2,
                },
            ],
        },
        noRetirements,
    );
    expectFailure(
        'relabelled baseline',
        {
            rows: [
                {
                    ...sourceRow,
                    category:
                        'accepted_lexical',
                },
            ],
        },
        noRetirements,
    );
    expectFailure(
        'owner mutation',
        {
            rows: [
                {
                    ...sourceRow,
                    targetOwner:
                        'dynamic_4b_inventory',
                },
            ],
        },
        noRetirements,
    );
    let staleManifestRejected =
        false;
    try {
        assertManifest(
            {
                manifestVersion: 1,
                rows: [
                    sourceRow,
                    {
                        ...sourceRow,
                        id: 'regex_stale',
                    },
                ],
            },
            [
                sourceRow,
            ],
            {
                requireClassified:
                    true,
            },
        );
    } catch {
        staleManifestRejected =
            true;
    }
    if (!staleManifestRejected) {
        throw new Error(
            'Semantic gate self-test stale persisted manifest unexpectedly passed.',
        );
    }
    const scannedRows =
        await scanProject();
    const persistedManifest =
        await readExistingManifest();
    assertManifest(
        persistedManifest,
        scannedRows,
        {
            requireClassified:
                true,
        },
    );
    for (const [
        field,
        value,
    ] of [
        ['file', 'forged.js'],
        ['line', -1],
        ['owner', 'forgedOwner'],
        ['pattern', 'forged'],
        ['source', '/forged/u'],
        ['occurrence', 999],
    ]) {
        const mutated =
            structuredClone(
                persistedManifest,
            );
        mutated.rows[0][field] =
            value;
        let rejected = false;
        try {
            assertManifest(
                mutated,
                scannedRows,
                {
                    requireClassified:
                        true,
                },
            );
        } catch {
            rejected = true;
        }
        if (!rejected) {
            throw new Error(
                `Semantic gate self-test persisted ${field} mutation unexpectedly passed.`,
            );
        }
    }
    for (const [
        field,
        value,
    ] of [
        [
            'rowCount',
            -1,
        ],
        [
            'sourceFingerprint',
            'forged',
        ],
        [
            'scanRoots',
            ['forged'],
        ],
    ]) {
        const mutated =
            structuredClone(
                persistedManifest,
            );
        mutated[field] =
            value;
        let rejected = false;
        try {
            assertManifest(
                mutated,
                scannedRows,
                {
                    requireClassified:
                        true,
                },
            );
        } catch {
            rejected = true;
        }
        if (!rejected) {
            throw new Error(
                `Semantic gate self-test manifest ${field} mutation unexpectedly passed.`,
            );
        }
    }
    const manifestSerialized =
        await readFile(
            MANIFEST_PATH,
            'utf8',
        );
    const baselineSerialized =
        await readFile(
            BASELINE_PATH,
            'utf8',
        );
    const retirementsSerialized =
        await readFile(
            RETIREMENTS_PATH,
            'utf8',
        );
    assertSerializedHash(
        manifestSerialized,
        REGEX_MANIFEST_SHA256,
        'Regex classification manifest',
    );
    assertSerializedHash(
        baselineSerialized,
        SEMANTIC_BASELINE_SHA256,
        'Regex semantic baseline',
    );
    assertSerializedHash(
        retirementsSerialized,
        SEMANTIC_RETIREMENTS_SHA256,
        'Regex semantic retirement ledger',
    );
    for (const [
        label,
        serialized,
        expectedHash,
    ] of [
        [
            'manifest tamper',
            `${manifestSerialized} `,
            REGEX_MANIFEST_SHA256,
        ],
        [
            'baseline tamper',
            `${baselineSerialized} `,
            SEMANTIC_BASELINE_SHA256,
        ],
        [
            'retirement tamper',
            `${retirementsSerialized} `,
            SEMANTIC_RETIREMENTS_SHA256,
        ],
    ]) {
        let rejected = false;
        try {
            assertSerializedHash(
                serialized,
                expectedHash,
                label,
            );
        } catch {
            rejected = true;
        }
        if (!rejected) {
            throw new Error(
                `Semantic gate self-test ${label} unexpectedly passed.`,
            );
        }
    }
    await readSemanticBaseline();
    await readSemanticRetirements();
    process.stdout.write(
        'Semantic gate self-test passed.\n',
    );
}

async function establishSemanticBaseline(
    manifest,
) {
    for (const filePath of [
        BASELINE_PATH,
        RETIREMENTS_PATH,
    ]) {
        try {
            await readFile(
                filePath,
                'utf8',
            );
            throw new Error(
                `Regex semantic governance file ${path.basename(filePath)} already exists and cannot be reset.`,
            );
        } catch (error) {
            if (
                error?.code !==
                    'ENOENT'
            ) {
                throw error;
            }
        }
    }
    const rows =
        semanticRows(
            manifest,
        );
    const baseline = {
        baselineVersion: 1,
        establishedAt:
            '2026-08-16',
        sourceFingerprint:
            manifest
                .sourceFingerprint,
        counts: {
            semanticRuntime:
                rows.filter(row =>
                    row.category ===
                    'semantic_runtime')
                    .length,
            semanticMigration:
                rows.filter(row =>
                    row.category ===
                    'semantic_migration')
                    .length,
            semanticTotal:
                rows.length,
        },
        policy:
            'Current semantic rows must equal this baseline minus append-only retirement events. New IDs, relabelling, owner changes, unregistered deletion and resurrection fail.',
        rows,
    };
    const retirements = {
        ledgerVersion: 1,
        establishedAt:
            '2026-08-16',
        policy:
            'Append one event when an approved Phase 2 task physically removes a baseline semantic regex. Events are never edited or deleted.',
        events: [],
    };
    await writeFile(
        BASELINE_PATH,
        `${JSON.stringify(
            baseline,
            null,
            2,
        )}\n`,
        'utf8',
    );
    await writeFile(
        RETIREMENTS_PATH,
        `${JSON.stringify(
            retirements,
            null,
            2,
        )}\n`,
        'utf8',
    );
    process.stdout.write(
        `Established immutable semantic regex baseline with ${rows.length} rows and an empty append-only retirement ledger.\n`,
    );
}

async function main() {
    const flags =
        new Set(
            process.argv.slice(2),
        );
    if (
        flags.has(
            '--self-test-semantic-gate',
        )
    ) {
        await runSemanticGateSelfTest();
        return;
    }
    const scannedRows =
        await scanProject();
    const existingManifest =
        await readExistingManifest();
    if (flags.has('--write')) {
        const manifest =
            buildManifest(
                scannedRows,
                manifestRowsById(
                    existingManifest,
                ),
            );
        await writeFile(
            MANIFEST_PATH,
            `${JSON.stringify(
                manifest,
                null,
                2,
            )}\n`,
            'utf8',
        );
        process.stdout.write(
            `${manifest.rowCount} regex rows written to ${path.relative(
                PROJECT_ROOT,
                MANIFEST_PATH,
            )}\n`,
        );
        return;
    }
    if (!existingManifest) {
        throw new Error(
            'Regex classification manifest is missing.',
        );
    }
    const manifest =
        existingManifest;
    if (
        flags.has(
            '--establish-semantic-baseline',
        )
    ) {
        assertManifest(
            manifest,
            scannedRows,
            {
                requireClassified:
                    true,
            },
        );
        await establishSemanticBaseline(
            manifest,
        );
        return;
    }
    const requireClassified =
        flags.has(
            '--require-classified',
        );
    assertManifest(
        manifest,
        scannedRows,
        {
            requireClassified:
                requireClassified,
        },
    );
    let baselineCounts = null;
    let retirementCount = null;
    if (requireClassified) {
        const baseline =
            await readSemanticBaseline();
        const retirements =
            await readSemanticRetirements();
        assertSemanticBaseline(
            manifest,
            baseline,
            retirements,
        );
        baselineCounts =
            baseline.counts;
        retirementCount =
            retirements
                .events
                .length;
    }
    const counts =
        Object.fromEntries(
            [
                ...CATEGORIES,
            ].sort().map(
                category => [
                    category,
                    manifest.rows
                        .filter(row =>
                            row.category ===
                            category)
                        .length,
                ],
            ),
        );
    process.stdout.write(
        `${JSON.stringify({
            rowCount:
                manifest.rowCount,
            sourceFingerprint:
                manifest
                    .sourceFingerprint,
            counts,
            semanticBaseline:
                baselineCounts,
            semanticRetirements:
                retirementCount,
        }, null, 2)}\n`,
    );
}

await main();
