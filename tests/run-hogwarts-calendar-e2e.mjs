import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
} from 'node:fs';
import {
    tmpdir,
} from 'node:os';
import {
    dirname,
    join,
} from 'node:path';
import {
    spawnSync,
} from 'node:child_process';
import {
    fileURLToPath,
} from 'node:url';

const EXPECTED_PLAYWRIGHT_VERSION =
    '1.56.1';
const EXPECTED_CHROMIUM_REVISION =
    '1194';
const EXPECTED_TEST_COUNT =
    13;
const testsRoot =
    dirname(
        fileURLToPath(
            import.meta.url,
        ),
    );
const packageJson =
    JSON.parse(
        readFileSync(
            new URL(
                './node_modules/@playwright/test/package.json',
                import.meta.url,
            ),
            'utf8',
        ),
    );
const browserRegistry =
    JSON.parse(
        readFileSync(
            new URL(
                './node_modules/playwright-core/browsers.json',
                import.meta.url,
            ),
            'utf8',
        ),
    );
const chromium =
    browserRegistry.browsers
        .find(browser =>
            browser.name ===
            'chromium');

if (
    packageJson.version !==
    EXPECTED_PLAYWRIGHT_VERSION
) {
    throw new Error(
        `Calendar E2E requires local Playwright ${EXPECTED_PLAYWRIGHT_VERSION}; found ${packageJson.version}.`,
    );
}
if (
    chromium?.revision !==
    EXPECTED_CHROMIUM_REVISION
) {
    throw new Error(
        `Calendar E2E requires local Chromium revision ${EXPECTED_CHROMIUM_REVISION}; found ${chromium?.revision || 'none'}.`,
    );
}

function countCollectedTests(
    suites = [],
) {
    return suites.reduce(
        (
            count,
            suite,
        ) =>
            count +
            (
                suite.specs || []
            ).reduce(
                (
                    specCount,
                    spec,
                ) =>
                    specCount +
                    (
                        spec.tests ||
                        []
                    ).length,
                0,
            ) +
            countCollectedTests(
                suite.suites,
            ),
        0,
    );
}

const isolatedRoot =
    mkdtempSync(
        join(
            tmpdir(),
            'hpmud-calendar-playwright-',
        ),
    );
const isolatedHome =
    join(
        isolatedRoot,
        'home',
    );
const isolatedTemp =
    join(
        isolatedRoot,
        'tmp',
    );
const isolatedConfig =
    join(
        isolatedHome,
        '.config',
    );
const isolatedCache =
    join(
        isolatedHome,
        '.cache',
    );

for (
    const directory of [
        isolatedHome,
        isolatedTemp,
        isolatedConfig,
        isolatedCache,
    ]
) {
    mkdirSync(directory);
}

const playwrightCli =
    fileURLToPath(
        new URL(
            './node_modules/@playwright/test/cli.js',
            import.meta.url,
        ),
    );
const playwrightArguments = [
    playwrightCli,
    'test',
    'hogwarts-mud-calendar.e2e.js',
    '--config=playwright.config.js',
    '--workers=1',
];
const playwrightEnvironment = {
    ...process.env,
    CFFIXED_USER_HOME:
        isolatedHome,
    HOME:
        isolatedHome,
    HPMUD_CALENDAR_E2E:
        '1',
    TMPDIR:
        isolatedTemp,
    XDG_CACHE_HOME:
        isolatedCache,
    XDG_CONFIG_HOME:
        isolatedConfig,
    PLAYWRIGHT_BROWSERS_PATH:
        '0',
};

try {
    const collection =
        spawnSync(
            process.execPath,
            [
                ...playwrightArguments,
                '--list',
                '--reporter=json',
            ],
            {
                cwd: testsRoot,
                encoding: 'utf8',
                env:
                    playwrightEnvironment,
                maxBuffer:
                    10 * 1024 * 1024,
            },
        );

    if (collection.error) {
        throw collection.error;
    }
    if (
        collection.signal ||
        collection.status !== 0
    ) {
        throw new Error(
            `Calendar E2E collection failed${
                collection.signal
                    ? ` with ${collection.signal}`
                    : ''
            }: ${
                String(
                    collection.stderr ||
                    '',
                ).trim() ||
                `exit ${collection.status}`
            }`,
        );
    }

    let collectionReport;
    try {
        collectionReport =
            JSON.parse(
                collection.stdout,
            );
    } catch (error) {
        throw new Error(
            'Calendar E2E collection did not return valid JSON.',
            {
                cause: error,
            },
        );
    }
    const collectedTests =
        countCollectedTests(
            collectionReport.suites,
        );
    if (
        collectedTests !==
        EXPECTED_TEST_COUNT
    ) {
        throw new Error(
            `Calendar E2E must collect exactly ${EXPECTED_TEST_COUNT} tests; collected ${collectedTests}.`,
        );
    }

    const result =
        spawnSync(
            process.execPath,
            [
                ...playwrightArguments,
                '--reporter=line',
            ],
            {
                cwd: testsRoot,
                env:
                    playwrightEnvironment,
                stdio: 'inherit',
            },
        );

    if (result.error) {
        throw result.error;
    }
    if (result.signal) {
        console.error(
            `Calendar E2E terminated by ${result.signal}.`,
        );
        process.exitCode = 1;
    } else {
        process.exitCode =
            result.status ?? 1;
    }
} finally {
    rmSync(
        isolatedRoot,
        {
            recursive: true,
            force: true,
        },
    );
}
