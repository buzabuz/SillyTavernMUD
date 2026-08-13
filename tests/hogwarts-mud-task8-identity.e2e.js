/* global document, window */
import {
    readFileSync,
} from 'node:fs';

import {
    expect,
    test,
} from '@playwright/test';

const styles =
    readFileSync(
        new URL(
            '../public/scripts/extensions/hogwarts-mud/style.css',
            import.meta.url,
        ),
        'utf8',
    );

test.use({
    channel: 'chrome',
    viewport: {
        width: 390,
        height: 844,
    },
});

test('390px top actions and Identity dossier stay inside the app', async ({
    page,
}) => {
    await page.setContent(`
        <style>${styles}</style>
        <div id="hpmud_app" class="hpmud-app">
            <header class="hpmud-topbar">
                <div class="hpmud-place">
                    <button class="hpmud-icon-button" type="button">◫</button>
                    <strong>格兰芬多公共休息室</strong>
                    <span class="hpmud-save-state"><i></i>已保存</span>
                </div>
                <div class="hpmud-chapter">
                    <strong>第一学年</strong>
                </div>
                <div class="hpmud-top-actions">
                    <button class="hpmud-relationship-entry" type="button">
                        <span>✦</span>关系星图
                    </button>
                    <button type="button">专注</button>
                    <details class="hpmud-more">
                        <summary>更多</summary>
                    </details>
                    <button class="hpmud-avatar-button" type="button">TZ</button>
                </div>
            </header>
            <main style="min-width: 0; padding: 10px;">
                <section class="hpmud-inspector-card hpmud-identity-dossier">
                    <header class="hpmud-identity-header">
                        <span class="hpmud-identity-sigil">HP</span>
                        <span>
                            <small>IDENTITY DOSSIER</small>
                            <h2>哈利·波特</h2>
                            <p>Student · newly met stranger</p>
                        </span>
                        <span class="hpmud-identity-source is-authority">权威</span>
                    </header>
                    <div class="hpmud-identity-grid">
                        <section class="hpmud-identity-group is-body">
                            <header><h3>身体状态</h3></header>
                            <dl>
                                <div class="hpmud-identity-field">
                                    <dt>疤痕</dt>
                                    <dd>Lightning-shaped scar on the forehead.</dd>
                                </div>
                            </dl>
                        </section>
                    </div>
                </section>
            </main>
        </div>
    `);

    const metrics =
        await page.evaluate(() => {
            const app =
                document.querySelector(
                    '#hpmud_app',
                );
            const actions =
                document.querySelector(
                    '.hpmud-top-actions',
                );
            const dossier =
                document.querySelector(
                    '.hpmud-identity-dossier',
                );
            const appRect =
                app.getBoundingClientRect();
            const actionsRect =
                actions.getBoundingClientRect();
            const dossierRect =
                dossier.getBoundingClientRect();
            return {
                viewportWidth:
                    window.innerWidth,
                appClientWidth:
                    app.clientWidth,
                appScrollWidth:
                    app.scrollWidth,
                actionsRight:
                    actionsRect.right,
                dossierClientWidth:
                    dossier.clientWidth,
                dossierScrollWidth:
                    dossier.scrollWidth,
                dossierLeft:
                    dossierRect.left,
                dossierRight:
                    dossierRect.right,
                appLeft:
                    appRect.left,
                appRight:
                    appRect.right,
            };
        });

    expect(metrics.viewportWidth)
        .toBe(390);
    expect(metrics.appScrollWidth)
        .toBeLessThanOrEqual(
            metrics.appClientWidth,
        );
    expect(metrics.actionsRight)
        .toBeLessThanOrEqual(
            metrics.appRight,
        );
    expect(metrics.dossierScrollWidth)
        .toBeLessThanOrEqual(
            metrics.dossierClientWidth,
        );
    expect(metrics.dossierLeft)
        .toBeGreaterThanOrEqual(
            metrics.appLeft,
        );
    expect(metrics.dossierRight)
        .toBeLessThanOrEqual(
            metrics.appRight,
        );
});
