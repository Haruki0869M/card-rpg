import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
const btns = async () => console.log('BTN', await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0,22) + '|' + (b.getAttribute('aria-label')||'')).join(' ; ')));
await loadSave(page, 'scripts/archive/playtest/shots/save-pet.json', (g) => { const w = g.world; for (const id of Object.keys(w.pos)) w.pos[id] = 211; w.move = undefined; w.moveRoll = undefined; g.heroes[0].level = 5; g.heroes[0].exp = 0; g.heroes[1].player = 1; g.heroes.forEach(h => h.gold = 300); });
await page.getByText('王都クリスタリアに入る').click(); await page.waitForTimeout(1500);
// 買い物
await page.getByRole('button', { name: '30' }).nth(1).click(); await page.waitForTimeout(600);
await shot('06c-buy');
console.log(await text()); await btns();
// カードの欄までスクロール
await page.locator('text=剣士のカード').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
await shot('06d-cards');
// セシルに切り替え
await page.getByRole('button', { name: /セシル/ }).first().click(); await page.waitForTimeout(600);
await shot('06e-cecil');
console.log(await text()); await btns();
// レオンに戻して聖堂
await page.getByRole('button', { name: /レオン/ }).first().click(); await page.waitForTimeout(400);
await page.getByText('聖堂（転職）').click(); await page.waitForTimeout(800);
await shot('06f-temple');
console.log(await text()); await issues('temple'); await btns();
await page.mouse.wheel(0, 600); await page.waitForTimeout(300);
await shot('06g-temple2');
console.log('URL-state', await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.mode));
const save = await page.evaluate(() => localStorage.getItem('card-rpg/adventure'));
(await import('node:fs')).writeFileSync('scripts/archive/playtest/shots/save-town.json', save);
await browser.close();
console.log('errors', errors);
