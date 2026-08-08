/* eslint-disable playwright/expect-expect, playwright/no-conditional-in-test */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
    readFile,
    readdir,
} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
    fileURLToPath,
    pathToFileURL,
} from 'node:url';
import vm from 'node:vm';

import { parse } from 'acorn';

import * as helpers from '../public/scripts/extensions/hogwarts-mud/helpers.js';

const PROJECT_ROOT = fileURLToPath(
    new URL('../', import.meta.url),
);
const CLIENT_ROOT =
    'public/scripts/extensions/hogwarts-mud';
const SERVER_ROOT = 'src/hogwarts-mud';
const HELPERS_FILE = `${CLIENT_ROOT}/helpers.js`;
const INDEX_FILE = `${CLIENT_ROOT}/index.js`;
const HELPERS_EXPORT_BASELINE = Object.freeze({
    count: 290,
    sha256:
        'bc5ee809af5c7a526f609fa3447ec16436245a25161e653a931c81eb24b04a59',
});
const INDEX_EXPORTS = Object.freeze([
    'SOCIAL_DIRECTOR_RESPONSE_SCHEMA',
    'canOpenCurrentV2SaveReadOnly',
    'createMemoryConsolidationPrompt',
    'init',
    'shouldTranslateRenderedMessage',
]);
const STRICT_ENTRY_LIMITS = Object.freeze({
    [HELPERS_FILE]: 350,
    [INDEX_FILE]: 600,
});
const DATA_FILE_NAMES = new Set([
    'canon-characters.js',
    'canon-localization.zh-cn.js',
]);
const LAYER_RANK = Object.freeze({
    core: 0,
    state: 1,
    domain: 1,
    runtime: 2,
    adapters: 2,
    workflows: 3,
    ui: 4,
});

function toProjectPath(filePath) {
    return path.relative(PROJECT_ROOT, filePath)
        .split(path.sep)
        .join('/');
}

function lineCount(source) {
    const newlines =
        source.match(/\n/gu)?.length || 0;
    return newlines +
        (source.endsWith('\n') ? 0 : 1);
}

async function collectJavaScriptFiles(relativeRoot) {
    const root = path.join(
        PROJECT_ROOT,
        relativeRoot,
    );
    const files = [];
    const visit = async directory => {
        const entries = await readdir(directory, {
            withFileTypes: true,
        });
        for (const entry of entries) {
            const entryPath =
                path.join(directory, entry.name);
            if (entry.isDirectory()) {
                await visit(entryPath);
            } else if (
                entry.isFile() &&
                /\.(?:m?js)$/u.test(entry.name)
            ) {
                files.push(toProjectPath(entryPath));
            }
        }
    };
    await visit(root);
    return files.sort();
}

async function readModule(file) {
    const source = await readFile(
        path.join(PROJECT_ROOT, file),
        'utf8',
    );
    return {
        file,
        source,
        ast: parse(source, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            allowHashBang: true,
        }),
    };
}

function resolveInternalImport(
    importer,
    specifier,
    knownFiles,
) {
    if (!specifier.startsWith('.')) {
        return null;
    }
    const resolved = path.posix.normalize(
        path.posix.join(
            path.posix.dirname(importer),
            specifier,
        ),
    );
    for (const candidate of [
        resolved,
        `${resolved}.js`,
        `${resolved}.mjs`,
        `${resolved}/index.js`,
    ]) {
        if (knownFiles.has(candidate)) {
            return candidate;
        }
    }
    return null;
}

function collectModuleSpecifiers(ast) {
    const specifiers = new Set();
    const visit = node => {
        if (!node || typeof node !== 'object') {
            return;
        }
        if (
            (
                node.type === 'ImportDeclaration' ||
                node.type === 'ExportNamedDeclaration' ||
                node.type === 'ExportAllDeclaration'
            ) &&
            typeof node.source?.value === 'string'
        ) {
            specifiers.add(node.source.value);
        } else if (
            node.type === 'ImportExpression' &&
            typeof node.source?.value === 'string'
        ) {
            specifiers.add(node.source.value);
        }
        for (const value of Object.values(node)) {
            if (Array.isArray(value)) {
                value.forEach(visit);
            } else {
                visit(value);
            }
        }
    };
    visit(ast);
    return [...specifiers];
}

function buildModuleGraph(modules) {
    const knownFiles = new Set(
        modules.map(module => module.file),
    );
    return new Map(
        modules.map(module => [
            module.file,
            collectModuleSpecifiers(module.ast)
                .map(specifier =>
                    resolveInternalImport(
                        module.file,
                        specifier,
                        knownFiles,
                    ))
                .filter(Boolean),
        ]),
    );
}

function findCycles(graph) {
    const active = new Set();
    const visited = new Set();
    const stack = [];
    const cycles = [];
    const visit = file => {
        if (active.has(file)) {
            const start = stack.indexOf(file);
            cycles.push([
                ...stack.slice(start),
                file,
            ]);
            return;
        }
        if (visited.has(file)) {
            return;
        }
        active.add(file);
        stack.push(file);
        for (const dependency of graph.get(file) || []) {
            visit(dependency);
        }
        stack.pop();
        active.delete(file);
        visited.add(file);
    };
    for (const file of graph.keys()) {
        visit(file);
    }
    return cycles;
}

function getLayer(file) {
    const segments = file.split('/');
    for (const [layer, rank] of
        Object.entries(LAYER_RANK)) {
        if (segments.includes(layer)) {
            return {
                layer,
                rank,
            };
        }
    }
    if (file === INDEX_FILE) {
        return {
            layer: 'index',
            rank: 5,
        };
    }
    return null;
}

function calleeName(node) {
    if (node?.type === 'Identifier') {
        return node.name;
    }
    if (
        node?.type === 'MemberExpression' &&
        !node.computed
    ) {
        return [
            calleeName(node.object),
            node.property.name,
        ].filter(Boolean).join('.');
    }
    return '';
}

function collectTopLevelSideEffects(module) {
    const effects = [];
    const deniedCalls =
        /(?:^|\.)(?:fetch|addEventListener|setInterval|setTimeout|saveMetadataDebounced|saveSettingsDebounced|setExtensionPrompt)$/u;
    const deniedMembers =
        /^(?:eventSource\.(?:on|once|makeLast)|document\.|window\.|globalThis\.|process\.on)/u;
    const visit = node => {
        if (!node || typeof node !== 'object') {
            return;
        }
        if ([
            'FunctionDeclaration',
            'FunctionExpression',
            'ArrowFunctionExpression',
            'ClassDeclaration',
            'ClassExpression',
        ].includes(node.type)) {
            return;
        }
        if (node.type === 'CallExpression') {
            const name = calleeName(node.callee);
            if (
                name === '$' ||
                deniedCalls.test(name) ||
                deniedMembers.test(name)
            ) {
                effects.push(name);
            }
        }
        if (node.type === 'NewExpression') {
            const name = calleeName(node.callee);
            if ([
                'EventSource',
                'WebSocket',
                'Worker',
                'XMLHttpRequest',
            ].includes(name)) {
                effects.push(`new ${name}`);
            }
        }
        for (const value of Object.values(node)) {
            if (Array.isArray(value)) {
                value.forEach(visit);
            } else {
                visit(value);
            }
        }
    };
    module.ast.body.forEach(visit);
    return [...new Set(effects)];
}

function importedNames(program) {
    const bySpecifier = new Map();
    for (const node of program.body) {
        if (node.type !== 'ImportDeclaration') {
            continue;
        }
        bySpecifier.set(
            node.source.value,
            node.specifiers.map(specifier =>
                specifier.imported?.name ||
                specifier.local.name),
        );
    }
    return bySpecifier;
}

function browserImportStub(name) {
    if (name === 'SOCIAL_GRAPH_EXTRACTOR_VERSION') {
        return 6;
    }
    if (name === 'normalizeSocialGraph') {
        return value => ({
            statements: [],
            relationshipEvidence: [],
            relationships: [],
            lastProcessedMessageId: -1,
            ...(value || {}),
        });
    }
    if (
        name === 'createDefaultCampaign' ||
        name === 'createDefaultCharacterDraft'
    ) {
        return () => ({});
    }
    return () => ({});
}

async function loadIndexModule() {
    const file = path.join(PROJECT_ROOT, INDEX_FILE);
    const source = await readFile(file, 'utf8');
    const ast = parse(source, {
        ecmaVersion: 'latest',
        sourceType: 'module',
    });
    const imports = importedNames(ast);
    const context = vm.createContext({
        console,
        structuredClone,
        URL,
    });
    const module = new vm.SourceTextModule(source, {
        context,
        identifier: pathToFileURL(file).href,
    });
    const stubs = new Map();
    await module.link(async specifier => {
        if (!stubs.has(specifier)) {
            const names = imports.get(specifier) || [];
            stubs.set(
                specifier,
                new vm.SyntheticModule(
                    names,
                    function setExports() {
                        for (const name of names) {
                            this.setExport(
                                name,
                                browserImportStub(name),
                            );
                        }
                    },
                    {
                        context,
                        identifier: `stub:${specifier}`,
                    },
                ),
            );
        }
        return stubs.get(specifier);
    });
    await module.evaluate();
    return {
        context,
        module,
    };
}

test('helpers preserves the complete real ESM export and named-import contract', async () => {
    const names = Object.keys(helpers).sort();
    const digest = createHash('sha256')
        .update(names.join('\n'))
        .digest('hex');
    assert.equal(
        names.length,
        HELPERS_EXPORT_BASELINE.count,
    );
    assert.equal(
        digest,
        HELPERS_EXPORT_BASELINE.sha256,
    );

    const context = vm.createContext({});
    const consumer = new vm.SourceTextModule(
        `import { ${names.join(',')} } from 'helpers';\n` +
        `export { ${names.join(',')} };`,
        {
            context,
            identifier: 'helpers-named-import-contract',
        },
    );
    const helperSource = await readFile(
        path.join(PROJECT_ROOT, HELPERS_FILE),
        'utf8',
    );
    const helperIdentifier = pathToFileURL(
        path.join(PROJECT_ROOT, HELPERS_FILE),
    ).href;
    const helperModule = new vm.SourceTextModule(
        helperSource,
        {
            context,
            identifier: helperIdentifier,
        },
    );
    const cache = new Map([
        [helperIdentifier, helperModule],
    ]);
    const linkRelative = async (
        specifier,
        referencingModule,
    ) => {
        const identifier = new URL(
            specifier,
            referencingModule.identifier,
        ).href;
        if (cache.has(identifier)) {
            return cache.get(identifier);
        }
        const source = await readFile(
            fileURLToPath(identifier),
            'utf8',
        );
        const dependency = new vm.SourceTextModule(
            source,
            {
                context,
                identifier,
            },
        );
        cache.set(identifier, dependency);
        return dependency;
    };
    await helperModule.link(linkRelative);
    await helperModule.evaluate();
    await consumer.link(async () => helperModule);
    await consumer.evaluate();
    assert.deepEqual(
        Object.keys(consumer.namespace).sort(),
        names,
    );
});

test('index preserves compatibility exports through real named imports', async () => {
    const loaded = await loadIndexModule();
    assert.deepEqual(
        Object.keys(loaded.module.namespace).sort(),
        INDEX_EXPORTS,
    );
    const consumer = new vm.SourceTextModule(
        `import { ${INDEX_EXPORTS.join(',')} } from 'index';\n` +
        `export { ${INDEX_EXPORTS.join(',')} };`,
        {
            context: loaded.context,
            identifier: 'index-named-import-contract',
        },
    );
    await consumer.link(async () => loaded.module);
    await consumer.evaluate();
    assert.deepEqual(
        Object.keys(consumer.namespace).sort(),
        INDEX_EXPORTS,
    );
});

test('index direct rule imports resolve from their real module owners', async () => {
    const indexModule = await readModule(INDEX_FILE);
    const directRuleImports =
        indexModule.ast.body.filter(node =>
            node.type === 'ImportDeclaration' &&
            /^\.\/(?:core\/|domain\/|presence-witness-contract\.js$|spell-catalog\.js$)/u
                .test(node.source.value),
        );
    assert.ok(
        directRuleImports.length > 0,
        'index must import its rule dependencies directly',
    );
    for (const declaration of directRuleImports) {
        const ownerUrl = pathToFileURL(
            path.join(
                PROJECT_ROOT,
                path.posix.dirname(INDEX_FILE),
                declaration.source.value,
            ),
        );
        const owner = await import(ownerUrl.href);
        for (const specifier of declaration.specifiers) {
            if (specifier.type !== 'ImportSpecifier') {
                continue;
            }
            assert.ok(
                specifier.imported.name in owner,
                `${declaration.source.value} does not export ${specifier.imported.name}`,
            );
        }
    }
});

test('existing tests provide stable structural golden coverage', async () => {
    const sources = new Map();
    for (const file of [
        'tests/hogwarts-mud-presence-contract.test.mjs',
        'tests/hogwarts-mud.test.mjs',
    ]) {
        sources.set(
            file,
            await readFile(
                path.join(PROJECT_ROOT, file),
                'utf8',
            ),
        );
    }
    const evidence = [
        [
            'tests/hogwarts-mud-presence-contract.test.mjs',
            'new worlds initialize the versioned presence and witness contract',
            'createInitialWorldState',
        ],
        [
            'tests/hogwarts-mud.test.mjs',
            'Social Graph v2 migrates Tina-sized legacy data without moving cursors or memory cooldowns',
            'normalizeSocialGraph',
        ],
        [
            'tests/hogwarts-mud.test.mjs',
            'local narrative-first reducer matches the LangGraph settlement output',
            'settleNarrativeTurnPerformance',
        ],
        [
            'tests/hogwarts-mud.test.mjs',
            'scene transition atomically archives the old scene and commits the next room',
            'applySceneTransition',
        ],
        [
            'tests/hogwarts-mud.test.mjs',
            'social audience projections preserve source knowledge without leaking hidden evidence through edge totals',
            'buildSocialAudienceProjection',
        ],
        [
            'tests/hogwarts-mud.test.mjs',
            'mandatory scene state stays compact and excludes detailed memories and hidden arcs',
            'JSON.stringify(compact)',
        ],
        [
            'tests/hogwarts-mud.test.mjs',
            'system prompt always adds the English-only output contract',
            'buildSystemPrompt',
        ],
    ];
    for (const [file, title, behavior] of evidence) {
        const source = sources.get(file);
        assert.ok(
            source.includes(`test('${title}'`),
            `missing golden coverage: ${title}`,
        );
        assert.ok(
            source.includes(behavior),
            `missing golden behavior assertion: ${behavior}`,
        );
    }
});

test('module graph has no cycles, reverse layers, or facade imports from production modules', async () => {
    const files = [
        ...await collectJavaScriptFiles(CLIENT_ROOT),
        ...await collectJavaScriptFiles(SERVER_ROOT),
    ];
    const modules = await Promise.all(
        files.map(readModule),
    );
    const graph = buildModuleGraph(modules);
    assert.deepEqual(findCycles(graph), []);

    const reverseLayers = [];
    const facadeImports = [];
    for (const [file, dependencies] of graph) {
        for (const dependency of dependencies) {
            const sourceLayer = getLayer(file);
            const targetLayer = getLayer(dependency);
            if (
                sourceLayer &&
                targetLayer &&
                sourceLayer.rank <
                    targetLayer.rank
            ) {
                reverseLayers.push(
                    `${file} (${sourceLayer.layer}) -> ` +
                    `${dependency} (${targetLayer.layer})`,
                );
            }
            if (
                (
                    dependency === HELPERS_FILE &&
                    file !== HELPERS_FILE
                ) ||
                dependency === INDEX_FILE
            ) {
                facadeImports.push(
                    `${file} -> ${dependency}`,
                );
            }
        }
    }
    assert.deepEqual(reverseLayers, []);
    assert.deepEqual(facadeImports, []);
});

test('modules have no top-level host, DOM, network, or persistence effects', async () => {
    const files = [
        ...await collectJavaScriptFiles(CLIENT_ROOT),
        ...await collectJavaScriptFiles(SERVER_ROOT),
    ].filter(file => file !== INDEX_FILE);
    const modules = await Promise.all(
        files.map(readModule),
    );
    const effects = Object.fromEntries(
        modules
            .map(module => [
                module.file,
                collectTopLevelSideEffects(module),
            ])
            .filter(([, values]) =>
                values.length),
    );
    assert.deepEqual(effects, {});
});

test('file sizes ratchet legacy giants and enforce strict modular limits', async () => {
    const files = [
        ...await collectJavaScriptFiles(CLIENT_ROOT),
        ...await collectJavaScriptFiles(SERVER_ROOT),
    ];
    for (const file of files) {
        const source = await readFile(
            path.join(PROJECT_ROOT, file),
            'utf8',
        );
        const lines = lineCount(source);
        const strictLimit =
            STRICT_ENTRY_LIMITS[file];
        if (strictLimit !== undefined) {
            assert.ok(
                lines <= strictLimit,
                `${file} has ${lines} lines; limit is ${strictLimit}`,
            );
            continue;
        }
        if (DATA_FILE_NAMES.has(
            path.posix.basename(file),
        )) {
            continue;
        }
        assert.ok(
            lines < 2000,
            `${file} has ${lines} lines; strict limit is below 2000`,
        );
    }
});
