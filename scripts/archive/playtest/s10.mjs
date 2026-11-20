import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
const btns = async () => console.log('BTN', await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0,22) + '|' + (b.getAttribute('aria-label')||'')).join(' ; ')));
await loadSave(page, 'scripts/archive/playtest/shots/save-battle.json', (g) => { const b = g.expeditions[0].battle; b.enemies.forEach(e => e.hp = 2); });
await page.waitForTimeout(1500);
for (let k = 0; k < 3; k++) {
  const names = await page.evaluate(() => [...document.querySelectorAll('[data-card-index]')].map(e => e.textContent));
  let idx = names.findIndex(t => /ストライク|シールド|ヘビー|聖なる/.test(t)); if (idx < 0) break;
  await page.locator(`[data-card-index="${idx}"]`).click(); await page.waitForTimeout(300);
  await page.locator('[data-enemy]:not([data-dead])').first().click().catch(() => {});
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /発動/ }).click();
  await page.waitForTimeout(2500);
  if (!(await page.locator('[data-enemy]:not([data-dead])').count())) break;
}
for (let i = 0; i < 6; i++) { await shot(`10a-win-${i}`); await page.waitForTimeout(500); }
console.log(await text()); await btns(); await issues('reward');
const save = await page.evaluate(() => localStorage.getItem('card-rpg/adventure'));
(await import('node:fs')).writeFileSync('scripts/archive/playtest/shots/save-reward.json', save);
await browser.close();
console.log('errors', errors);
