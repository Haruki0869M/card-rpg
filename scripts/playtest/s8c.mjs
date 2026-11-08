import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
const btns = async () => console.log('BTN', await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0,22) + '|' + (b.getAttribute('aria-label')||'')).join(' ; ')));
const cards = async () => console.log('CARDS', await page.evaluate(() => [...document.querySelectorAll('[data-card-index]')].map(e => e.getAttribute('data-card-index') + ':' + e.textContent.trim().slice(0, 20)).join(' | ')));
await loadSave(page, 'scripts/playtest/shots/save-battle.json', (g) => { g.heroes[1].hp = 30; });
await page.waitForTimeout(1500);
await page.locator('[data-card-index="0"]').click(); await page.waitForTimeout(400);
await page.locator('[data-enemy]').nth(1).click();
for (let i = 0; i < 10; i++) { await page.waitForTimeout(250); await shot(`08d-attack-${i}`); }
console.log(await text());
// セシルへ
await page.getByText('セシル').first().click(); await page.waitForTimeout(600);
await shot('08e-cecil-turn'); await cards(); await btns();
await browser.close();
console.log('errors', errors);
