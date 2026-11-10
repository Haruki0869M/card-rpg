import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
const btns = async () => console.log('BTN', await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0,22) + '|' + (b.getAttribute('aria-label')||'')).join(' ; ')));
// ペット付きの保存で、2人とも王都に戻し、レオンを Lv5 にしておく（転職の条件を見るため）
await loadSave(page, 'scripts/archive/playtest/shots/save-pet.json', (g) => { const w = g.world; for (const id of Object.keys(w.pos)) w.pos[id] = 211; w.move = undefined; w.moveRoll = undefined; g.heroes[0].level = 5; g.heroes[0].exp = 0; g.heroes.forEach(h => h.gold = 300); });
await shot('06a-before');
await btns();
await page.getByText('王都クリスタリアに入る').click(); await page.waitForTimeout(1500);
await shot('06b-town');
console.log(await text()); await issues('town'); await btns();
await browser.close();
console.log('errors', errors);
