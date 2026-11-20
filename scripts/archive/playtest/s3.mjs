import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
await loadSave(page, 'scripts/archive/playtest/shots/save-start.json');
await shot('03c-resume');
if (await page.getByText('つづける').count()) { await page.getByText('つづける').click(); await page.waitForTimeout(800); }
await shot('03d-world-map');
await issues('world');
// 同行の ON/OFF
await page.getByRole('button', { name: 'セシルを残す' }).click(); await page.waitForTimeout(500);
await shot('03e-companion-off');
console.log(await text());
await page.getByRole('button', { name: /セシル/ }).filter({ hasText: '' }).last().click().catch(e=>console.log('re-on fail', e.message));
await page.waitForTimeout(500);
await shot('03f-companion-on');
// 移動力の判定
await page.locator('[data-roll-move]').click();
for (let i = 0; i < 12; i++) { await page.waitForTimeout(300); await shot(`03g-roll-${String(i).padStart(2,'0')}`); }
console.log(await text());
const buttons = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim().slice(0,24) + '|' + (b.getAttribute('aria-label')||'')).join(' ; '));
console.log(buttons);
const save = await page.evaluate(() => localStorage.getItem('card-rpg/adventure'));
(await import('node:fs')).writeFileSync('scripts/archive/playtest/shots/save-rolled.json', save);
await browser.close();
console.log('errors', errors);
