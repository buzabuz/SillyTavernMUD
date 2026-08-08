/* global document */

import { createHash } from 'node:crypto';
import {
    existsSync,
    readFileSync,
    statSync,
} from 'node:fs';

import {
    expect,
    test,
} from '@playwright/test';

const TINA_CHAT_PATH = new URL(
    '../data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl',
    import.meta.url,
);
const MODULE_PREFIX =
    '/scripts/extensions/hogwarts-mud/';
const INDEX_PATH =
    `${MODULE_PREFIX}index.js`;
const EXPECT_TIMEOUT = 20_000;

function readTinaStatus() {
    const contents =
        readFileSync(TINA_CHAT_PATH);
    return {
        sha256:
            createHash('sha256')
                .update(contents)
                .digest('hex'),
        mtimeMs:
            statSync(TINA_CHAT_PATH)
                .mtimeMs,
    };
}

function getProhibitedRequestKind(request) {
    if (request.method() !== 'POST') {
        return null;
    }
    const pathname =
        new URL(request.url())
            .pathname;
    if (pathname.includes('/generate')) {
        return 'generate';
    }
    if (pathname.includes('/translate')) {
        return 'translate';
    }
    if (pathname.startsWith('/api/hogwarts-mud/local/')) {
        return 'local';
    }
    if (pathname.startsWith('/api/hogwarts-mud/social/')) {
        return 'social';
    }
    if (pathname === '/api/chats/save') {
        return 'save';
    }
    return null;
}

test.use({
    channel: 'chrome',
    launchOptions: {
        args: [
            '--disable-breakpad',
            '--disable-crash-reporter',
        ],
    },
});

test('loads the Hogwarts module graph and keeps repeated init read-only', async ({
    page,
}) => {
    test.setTimeout(60_000);
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(
        !existsSync(TINA_CHAT_PATH),
        'The local Tina acceptance fixture is not available.',
    );

    const before =
        readTinaStatus();
    const moduleResponses =
        new Map();
    const failedModuleRequests = [];
    const pageErrors = [];
    const prohibitedRequests = {
        generate: [],
        translate: [],
        local: [],
        social: [],
        save: [],
    };

    page.on('pageerror', error => {
        pageErrors.push(error.message);
    });
    page.on('requestfailed', request => {
        const pathname =
            new URL(request.url())
                .pathname;
        if (
            pathname.startsWith(MODULE_PREFIX) &&
            pathname.endsWith('.js')
        ) {
            failedModuleRequests.push({
                pathname,
                error:
                    request.failure()
                        ?.errorText ||
                    'unknown',
            });
        }
    });
    page.on('response', response => {
        const pathname =
            new URL(response.url())
                .pathname;
        if (
            pathname.startsWith(MODULE_PREFIX) &&
            pathname.endsWith('.js')
        ) {
            moduleResponses.set(
                pathname,
                {
                    pathname,
                    status:
                        response.status(),
                    contentType:
                        response.headers()[
                            'content-type'
                        ] || '',
                },
            );
        }
    });
    await page.route(
        '**/*',
        async route => {
            const request =
                route.request();
            const kind =
                getProhibitedRequestKind(
                    request,
                );
            if (!kind) {
                await route.continue();
                return;
            }
            prohibitedRequests[kind]
                .push(
                    new URL(
                        request.url(),
                    ).pathname,
                );
            await route.fulfill({
                status: 503,
                contentType:
                    'application/json',
                body:
                    '{"error":"blocked by module-init E2E"}',
            });
        },
    );

    await page.goto(
        '/',
        {
            waitUntil:
                'domcontentloaded',
            timeout:
                EXPECT_TIMEOUT,
        },
    );
    await expect(
        page.locator('#preloader'),
    ).toHaveCount(
        0,
        {
            timeout:
                EXPECT_TIMEOUT,
        },
    );
    await expect(
        page.locator('#hpmud_app'),
    ).toHaveCount(
        1,
        {
            timeout:
                EXPECT_TIMEOUT,
        },
    );

    const tinaSave =
        page.locator(
            '#hpmud_save_list .hpmud-save-card',
        ).filter({
            hasText: 'Tina Zhang',
        });
    await expect(tinaSave)
        .toHaveCount(
            1,
            {
                timeout:
                    EXPECT_TIMEOUT,
            },
        );
    await tinaSave.click();
    await expect(
        page.locator(
            '#hpmud_workspace',
        ),
    ).toBeVisible({
        timeout:
            EXPECT_TIMEOUT,
    });

    const miniMap =
        page.locator(
            '#hpmud_map_mini',
        );
    await expect(miniMap)
        .toBeVisible();
    await expect(
        miniMap.locator('svg'),
    ).toHaveCount(1);

    const activePerson =
        page.locator(
            '#hpmud_people .hpmud-person',
        ).first();
    await expect(activePerson)
        .toContainText(
            '拉文德·布朗',
        );
    await activePerson.click();
    await expect(
        page.locator(
            '#hpmud_inspector_content',
        ),
    ).toContainText(
        '拉文德·布朗',
    );

    await page.locator(
        '[data-hpmud-inspector="map"]',
    ).click();
    await expect(
        page.locator(
            '#hpmud_inspector_content .hpmud-inspector-map svg',
        ),
    ).toHaveCount(1);
    await expect(
        page.locator(
            '#hpmud_inspector_content select[aria-label="地图地点"]',
        ),
    ).toBeVisible();

    const composer =
        page.locator(
            '#hpmud_input',
        );
    await expect(composer)
        .toBeEditable();
    await composer.fill(
        'desktop read-only composer probe',
    );
    await expect(composer)
        .toHaveValue(
            'desktop read-only composer probe',
        );
    await composer.fill('');

    await page.locator(
        '#hpmud_relationship_graph',
    ).click();
    await expect(
        page.locator(
            '#hpmud_relationship_dialog',
        ),
    ).toBeVisible();
    await expect(
        page.locator(
            '#hpmud_relationship_count',
        ),
    ).toContainText(
        '人物',
    );
    await page.locator(
        '#hpmud_relationship_close',
    ).click();
    await expect(
        page.locator(
            '#hpmud_relationship_dialog',
        ),
    ).toBeHidden();

    const initContract =
        await page.evaluate(
            async modulePath => {
                const first =
                    await import(
                        modulePath
                    );
                const second =
                    await import(
                        modulePath
                    );
                await first.init();

                const {
                    eventSource,
                    event_types,
                } =
                    await import(
                        '/script.js'
                    );
                const eventNames = [
                    event_types
                        .APP_READY,
                    event_types
                        .CHAT_CHANGED,
                    event_types
                        .CONNECTION_PROFILE_CREATED,
                    event_types
                        .CONNECTION_PROFILE_DELETED,
                    event_types
                        .CONNECTION_PROFILE_UPDATED,
                    event_types
                        .CHARACTER_MESSAGE_RENDERED,
                    event_types
                        .USER_MESSAGE_RENDERED,
                    event_types
                        .MESSAGE_UPDATED,
                    event_types
                        .MESSAGE_SWIPED,
                    event_types
                        .MESSAGE_DELETED,
                ];
                const listenerCounts =
                    () =>
                        Object.fromEntries(
                            eventNames.map(
                                name => [
                                    name,
                                    eventSource
                                        .events[
                                            name
                                        ]
                                        ?.length ||
                                        0,
                                ],
                            ),
                        );
                const listenersBefore =
                    listenerCounts();
                let registrationCalls =
                    0;
                const originalOn =
                    eventSource.on;
                const originalMakeLast =
                    eventSource.makeLast;
                eventSource.on =
                    function (...args) {
                        registrationCalls++;
                        return originalOn
                            .apply(
                                this,
                                args,
                            );
                    };
                eventSource.makeLast =
                    function (...args) {
                        registrationCalls++;
                        return originalMakeLast
                            .apply(
                                this,
                                args,
                            );
                    };
                try {
                    await Promise.all([
                        first.init(),
                        second.init(),
                        first.init(),
                    ]);
                } finally {
                    eventSource.on =
                        originalOn;
                    eventSource.makeLast =
                        originalMakeLast;
                }
                return {
                    sameModule:
                        first === second,
                    rootCount:
                        document
                            .querySelectorAll(
                                '#hpmud_app',
                            )
                            .length,
                    launcherCount:
                        document
                            .querySelectorAll(
                                '#hpmud_launcher',
                            )
                            .length,
                    toolbarCount:
                        document
                            .querySelectorAll(
                                '#hpmud_toolbar_button',
                            )
                            .length,
                    registrationCalls,
                    listenersBefore,
                    listenersAfter:
                        listenerCounts(),
                };
            },
            INDEX_PATH,
        );

    await page.evaluate(
        () =>
            new Promise(resolve =>
                setTimeout(
                    resolve,
                    500,
                )),
    );

    const modules =
        [...moduleResponses.values()]
            .sort((left, right) =>
                left.pathname.localeCompare(
                    right.pathname,
                ));
    const modulePaths =
        modules.map(module =>
            module.pathname);
    expect(modulePaths)
        .toContain(INDEX_PATH);
    expect(modulePaths)
        .not.toContain(
            `${MODULE_PREFIX}helpers.js`,
        );
    expect(modules.length)
        .toBeGreaterThan(2);
    for (const module of modules) {
        expect.soft(
            module.status,
            module.pathname,
        ).toBeGreaterThanOrEqual(200);
        expect.soft(
            module.status,
            module.pathname,
        ).toBeLessThan(300);
        expect.soft(
            module.contentType,
            module.pathname,
        ).toMatch(
            /^(?:application|text)\/javascript(?:;|$)/iu,
        );
    }

    expect.soft(initContract)
        .toEqual({
            sameModule: true,
            rootCount: 1,
            launcherCount: 1,
            toolbarCount: 1,
            registrationCalls: 0,
            listenersBefore:
                initContract
                    .listenersAfter,
            listenersAfter:
                initContract
                    .listenersAfter,
        });
    expect.soft(failedModuleRequests)
        .toEqual([]);
    expect.soft(pageErrors)
        .toEqual([]);
    expect.soft(prohibitedRequests)
        .toEqual({
            generate: [],
            translate: [],
            local: [],
            social: [],
            save: [],
        });
    expect.soft(readTinaStatus())
        .toEqual(before);
});
