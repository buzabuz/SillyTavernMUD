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

function readChatStatus() {
    const contents =
        readFileSync(TINA_CHAT_PATH);
    const stats =
        statSync(TINA_CHAT_PATH);
    return {
        sha256:
            createHash('sha256')
                .update(contents)
                .digest('hex'),
        mtimeMs: stats.mtimeMs,
    };
}

test.use({
    channel: 'chrome',
    launchOptions: {
        args: [
            '--disable-breakpad',
            '--disable-crash-reporter',
        ],
    },
    viewport: {
        width: 390,
        height: 844,
    },
});

test('migrated Tina save keeps the 390px people panel read-only and keyboard accessible', async ({
    page,
}) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(
        !existsSync(TINA_CHAT_PATH),
        'The local Tina acceptance fixture is not available.',
    );

    const before =
        readChatStatus();
    const prohibitedRequests = {
        generate: [],
        translate: [],
        socialResolve: [],
        localObserve: [],
        chatSave: [],
    };
    const lifecycleWarnings = [];
    const consoleErrors = [];

    page.on('console', message => {
        if (
            message.type() ===
                'error'
        ) {
            consoleErrors.push(
                message.text(),
            );
        }
        if (
            ['warning', 'error']
                .includes(
                    message.type(),
                )
        ) {
            lifecycleWarnings.push(
                message.text(),
            );
        }
    });
    await page.route(
        '**/*',
        async route => {
            const request =
                route.request();
            const url =
                new URL(
                    request.url(),
                );
            const prohibitedKey =
                request.method() ===
                    'POST'
                    ? url.pathname
                        .includes(
                            '/generate',
                        )
                        ? 'generate'
                        : url.pathname ===
                            '/api/hogwarts-mud/local/translate' ||
                            url.pathname
                                .startsWith(
                                    '/api/translate/',
                                )
                            ? 'translate'
                            : url.pathname
                                .endsWith(
                                    '/social/resolve',
                                )
                                ? 'socialResolve'
                                : url.pathname
                                    .endsWith(
                                        '/local/observe',
                                    )
                                    ? 'localObserve'
                                    : url.pathname ===
                                        '/api/chats/save'
                                        ? 'chatSave'
                                        : null
                    : null;
            if (prohibitedKey) {
                prohibitedRequests[
                    prohibitedKey
                ].push(url.pathname);
                await route.fulfill({
                    status: 503,
                    contentType:
                        'application/json',
                    body:
                        '{"error":"blocked passive lifecycle request"}',
                });
                return;
            }
            await route.continue();
        },
    );

    await page.goto('/');
    await page.waitForFunction(
        'document.getElementById("preloader") === null',
        {
            timeout: 0,
        },
    );

    const tinaSave =
        page.locator(
            '#hpmud_save_list .hpmud-save-card',
        ).filter({
            hasText: 'Tina Zhang',
        });
    await expect(tinaSave)
        .toHaveCount(1);
    await tinaSave.click();
    await expect(
        page.locator(
            '#hpmud_workspace',
        ),
    ).toBeVisible();

    const sceneRestore =
        page.locator(
            '#hpmud_scene_restore',
        );
    await expect(sceneRestore)
        .toBeVisible();
    await sceneRestore.click();
    const scenePanel =
        page.locator(
            '#hpmud_scene_panel',
        );
    await expect(scenePanel)
        .toBeVisible();

    const activePeople =
        page.locator(
            '#hpmud_people .hpmud-person strong',
        );
    await expect(activePeople)
        .toHaveText([
            '拉文德·布朗',
            '罗恩·韦斯莱',
        ]);
    await page.locator(
        '#hpmud_people .hpmud-person',
    ).first().click();
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

    const composerInput =
        page.locator(
            '#hpmud_input',
        );
    await expect(composerInput)
        .toBeEditable();
    await composerInput.fill(
        '390px read-only composer probe',
    );
    await expect(composerInput)
        .toHaveValue(
            '390px read-only composer probe',
        );
    await composerInput.fill('');

    const localDetails =
        page.locator(
            '.hpmud-local-people',
        );
    const localSummary =
        localDetails.locator(
            'summary',
        );
    await localSummary.focus();
    await expect(localSummary)
        .toBeFocused();
    await page.keyboard.press(
        'Enter',
    );
    await expect(localDetails)
        .toHaveAttribute(
            'open',
            '',
        );

    const expectedLocalPeople = [
        '迪安·托马斯',
        '菲利乌斯·弗立维',
        '哈利·波特',
        '赫敏·格兰杰',
        '纳威·隆巴顿',
        '西莫·斐尼甘',
    ];
    const localPeople =
        page.locator(
            '#hpmud_local_people .hpmud-local-person',
        );
    await expect(localPeople)
        .toHaveCount(
            expectedLocalPeople.length,
        );
    await expect(
        localPeople.locator(
            'strong',
        ),
    ).toHaveText(
        expectedLocalPeople,
    );
    for (
        const localPerson
        of await localPeople.all()
    ) {
        await expect(localPerson)
            .toBeVisible();
    }
    await expect(
        page.locator(
            '#hpmud_local_cohorts',
        ),
    ).toContainText(
        '另有 Gryffindor first-years in Charms 成员若干',
    );

    const localPeopleContract =
        await page.locator(
            '.hpmud-local-people-body',
        ).evaluate(element => {
            const panel =
                element.closest(
                    '#hpmud_scene_panel',
                );
            const panelRect =
                panel.getBoundingClientRect();
            const view =
                element.ownerDocument
                    .defaultView;
            const rows = [
                ...element.querySelectorAll(
                    '.hpmud-local-person',
                ),
            ];
            return {
                bodyDisplay:
                    view
                        .getComputedStyle(
                            element,
                        ).display,
                interactiveCount:
                    element.querySelectorAll(
                        'button, a, [tabindex]',
                    ).length,
                focusableCount:
                    [
                        ...element
                            .querySelectorAll(
                                '*',
                            ),
                    ].filter(item =>
                        item.tabIndex >=
                            0)
                        .length,
                panelWithinViewport:
                    panelRect.left >= 0 &&
                    panelRect.right <=
                        view.innerWidth,
                rowsWithinPanel:
                    rows.every(row => {
                        const style =
                            view
                                .getComputedStyle(
                                    row,
                                );
                        const rect =
                            row
                                .getBoundingClientRect();
                        return (
                            style.display !==
                                'none' &&
                            style.visibility !==
                                'hidden' &&
                            rect.width > 0 &&
                            rect.left >=
                                panelRect.left &&
                            rect.right <=
                                panelRect.right
                        );
                    }),
                noHorizontalOverflow:
                    element.scrollWidth <=
                    element.clientWidth,
            };
        });
    expect(localPeopleContract)
        .toEqual({
            bodyDisplay: 'grid',
            interactiveCount: 0,
            focusableCount: 0,
            panelWithinViewport: true,
            rowsWithinPanel: true,
            noHorizontalOverflow: true,
        });

    await page.locator(
        '#hpmud_scene_collapse',
    ).click();
    await expect(
        page.locator(
            '#hpmud_app',
        ),
    ).toHaveClass(
        /scene-collapsed/u,
    );
    expect(
        await scenePanel.evaluate(
            element =>
                element
                    .ownerDocument
                    .defaultView
                    .getComputedStyle(
                        element,
                    ).pointerEvents,
        ),
    ).toBe('none');

    const addressMenu =
        page.locator(
            '#hpmud_address_menu',
        );
    await addressMenu
        .locator('summary')
        .click();
    await expect(
        page.locator(
            '#hpmud_address_options button',
        ),
    ).toHaveText([
        '全场',
        '拉文德·布朗',
        '罗恩·韦斯莱',
    ]);
    await addressMenu
        .locator('summary')
        .click();

    await page.locator(
        '#hpmud_relationship_graph',
    ).click();
    await expect(
        page.locator(
            '#hpmud_relationship_dialog',
        ),
    ).toBeVisible();
    await new Promise(resolve =>
        setTimeout(
            resolve,
            1500,
        ));
    const relationshipViewport =
        await page.locator(
            '#hpmud_relationship_dialog',
        ).evaluate(element => {
            const rect =
                element
                    .getBoundingClientRect();
            return {
                left:
                    rect.left,
                right:
                    rect.right,
                viewportWidth:
                    element
                        .ownerDocument
                        .defaultView
                        .innerWidth,
            };
        });
    expect(
        relationshipViewport.left,
    ).toBeGreaterThanOrEqual(0);
    expect(
        relationshipViewport.right,
    ).toBeLessThanOrEqual(
        relationshipViewport
            .viewportWidth,
    );

    const loadedState =
        await page.evaluate(() => {
            const context =
                SillyTavern
                    ?.getContext?.();
            const graph =
                context?.chatMetadata
                    ?.hogwartsMud
                    ?.socialGraph;
            const lastMessage =
                context?.chat?.at(-1);
            return {
                chatLength:
                    context?.chat
                        ?.length,
                cursor:
                    graph
                        ?.lastProcessedMessageId,
                evidence:
                    graph
                        ?.relationshipEvidence
                        ?.length,
                edges:
                    graph
                        ?.relationships
                        ?.length,
                swipeId:
                    lastMessage
                        ?.swipe_id,
                presenceWitnessVersion:
                    context?.chatMetadata
                        ?.hogwartsMud
                        ?.presenceWitnessVersion,
                activeInteractionActorIds:
                    context?.chatMetadata
                        ?.hogwartsMud
                        ?.activeInteractionActorIds,
                localOccupantActorIds:
                    context?.chatMetadata
                        ?.hogwartsMud
                        ?.localPresence
                        ?.occupantActorIds,
                localCohortIds:
                    context?.chatMetadata
                        ?.hogwartsMud
                        ?.localPresence
                        ?.cohortIds,
            };
        });
    const after =
        readChatStatus();

    expect.soft(loadedState)
        .toEqual({
            chatLength: 192,
            cursor: 191,
            evidence: 91,
            edges: 33,
            swipeId: 0,
            presenceWitnessVersion: 1,
            activeInteractionActorIds: [
                'canon_lavender_brown',
                'canon_ronald_bilius_weasley',
            ],
            localOccupantActorIds: [
                'canon_dean_thomas',
                'canon_filius_flitwick',
                'canon_harry_james_potter',
                'canon_hermione_jean_granger',
                'canon_lavender_brown',
                'canon_neville_longbottom',
                'canon_ronald_bilius_weasley',
                'canon_seamus_finnigan',
            ],
            localCohortIds: [
                'gryffindor_year1_charms_1991',
            ],
        });
    expect.soft(prohibitedRequests)
        .toEqual({
            generate: [],
            translate: [],
            socialResolve: [],
            localObserve: [],
            chatSave: [],
        });
    expect.soft(consoleErrors)
        .toEqual([]);
    expect.soft(
        lifecycleWarnings
            .filter(message =>
                message.includes(
                    'saveChat called without chat_name',
                ) ||
                /autocomplete/iu
                    .test(message)),
    ).toEqual([]);
    expect.soft(after)
        .toEqual(before);
});
