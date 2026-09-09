import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from './node_modules/playwright/index.mjs';

const root = resolve(import.meta.dirname, '..');
const evidence = resolve(root, '.trae/specs/hogwarts-narrative-first-post-settlement/evidence');
const server = createServer(async (req, res) => {
    try {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1">
                <link rel="stylesheet" href="/public/scripts/extensions/hogwarts-mud/style.css">
                <style>body{margin:0;background:#090b0e}#hpmud_app{position:static;display:block;padding:16px;box-sizing:border-box;min-height:100vh}#story{max-width:960px;margin:auto}#redraw{margin:16px}</style>
                <main id="hpmud_app" class="hpmud-app"><div id="story"></div><button id="redraw">重绘</button><output id="result"></output></main>
                <script type="module" src="/tests/hogwarts-mud-post-recovery-browser-fixture.js"></script>`);
            return;
        }
        const path = resolve(root, `.${url.pathname}`);
        if (!path.startsWith(`${root}/public/scripts/extensions/hogwarts-mud/`)
            && path !== resolve(root, 'tests/hogwarts-mud-post-recovery-browser-fixture.js')) {
            res.writeHead(403).end(); return;
        }
        res.setHeader('Content-Type', extname(path) === '.css' ? 'text/css' : 'text/javascript');
        res.end(await readFile(path));
    } catch {
        res.writeHead(404).end();
    }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
    browser = await chromium.launch({ headless: true });
    await mkdir(evidence, { recursive: true });
    for (const width of [1280, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 850 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        for (const scenario of ['pending', 'spent', 'reserved', 'movement', 'conflict', 'legacy', 'unsaved']) {
            await page.goto(`http://127.0.0.1:${server.address().port}/?scenario=${scenario}`);
            const supplement = page.getByRole('button', { name: '补生成所选项（一次）' });
            if (scenario === 'unsaved') {
                await page.getByText('正文仅保留在当前页面', { exact: false }).waitFor();
                assert.equal(await supplement.count(), 0);
                assert.equal(await page.getByText('信封放在桌上。', { exact: true }).count(), 1);
                const saveOnly = page.getByRole('button', { name: '重试保存正文' });
                await saveOnly.click();
                await supplement.waitFor();
                assert.deepEqual(JSON.parse(await page.locator('#result').textContent()), { saveOnly: true });
                assert.equal(await saveOnly.count(), 0);
                assert.equal(await page.getByText('正文仅保留在当前页面', { exact: false }).count(), 0);
                assert.equal(await page.getByText('信封放在桌上。', { exact: true }).count(), 1);
                assert.equal(await supplement.isDisabled(), false);
                continue;
            }
            await supplement.waitFor();
            const defaults = page.getByRole('button', { name: '使用保守结果继续' });
            assert.equal(await supplement.isDisabled(), ['spent', 'reserved', 'conflict'].includes(scenario));
            assert.equal(await defaults.isDisabled(), ['movement', 'conflict'].includes(scenario));
            const overflow = await page.locator('.hpmud-turn-failure').filter({ has: supplement }).evaluate(el => ({
                width: el.getBoundingClientRect().width,
                scroll: el.scrollWidth,
                right: el.getBoundingClientRect().right,
                titleWidth: el.querySelector('strong').getBoundingClientRect().width,
                fieldsBottom: el.querySelector('fieldset').getBoundingClientRect().bottom,
                actionsTop: el.querySelector('.hpmud-post-settlement-actions').getBoundingClientRect().top,
            }));
            assert.ok(overflow.right <= width && overflow.scroll <= overflow.width + 2,
                `${width}/${scenario}: overflowing recovery ${JSON.stringify(overflow)}`);
            assert.ok(overflow.titleWidth > 280 && overflow.actionsTop >= overflow.fieldsBottom,
                `${width}/${scenario}: recovery content squeezed by actions`);
            if (scenario === 'pending') {
                const boxes = page.getByRole('checkbox');
                await boxes.first().uncheck();
                await page.getByRole('button', { name: '重绘' }).click();
                assert.equal(await boxes.first().isChecked(), false);
                await page.screenshot({ path: resolve(evidence, `recovery-${width}.png`), fullPage: true });
                await supplement.click();
                assert.deepEqual(JSON.parse(await page.locator('#result').textContent()),
                    { selectedGroupIds: ['sceneProgression'] });
                assert.equal(await supplement.isDisabled(), true);
            }
        }
        for (const scenario of ['speaker_translated', 'speaker_pending', 'speaker_collision', 'speaker_canonical_collision']) {
            await page.goto(`http://127.0.0.1:${server.address().port}/?scenario=${scenario}`);
            await page.getByText('有你的一封信。', { exact: true }).waitFor();
            assert.equal(await page.locator('.hpmud-turn-name strong').textContent(),
                scenario === 'speaker_translated' ? '送信人' : '身份待确认');
            assert.doesNotMatch(await page.locator('#story').innerText(), /temp_delivery_person|Letter Carrier|Different Person|Known Canon Actor/);
        }
        assert.deepEqual(errors, []);
        await page.close();
    }
    console.log('PASS: 14 recovery and 8 speaker rendered states; no provider or game save access.');
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
