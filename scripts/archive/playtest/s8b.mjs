import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
const btns = async () => console.log('BTN', await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0,22) + '|' + (b.getAttribute('aria-label')||'')).join(' ; ')));
await loadSave(page, 'scripts/archive/playtest/shots/save-battle.json');
await page.waitForTimeout(1500);
// ストライクを選ぶ
await page.locator('[data-card-index="0"]').click(); await page.waitForTimeout(500);
await shot('08b-card-selected');
console.log(await text()); await btns();
await page.locator('[data-card-index="0"]').click(); await page.waitForTimeout(500);
await shot('08c-card-tap2');
console.log(await text()); await btns();
await browser.close();
console.log('errors', errors);
