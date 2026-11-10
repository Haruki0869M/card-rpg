import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
// 移動力の判定の演出（50ms おき）
await loadSave(page, 'scripts/archive/playtest/shots/save-start.json', (g) => { g.world.story = undefined; });
await page.locator('[data-roll-move]').click();
for (let i = 0; i < 6; i++) { await page.waitForTimeout(80); await shot(`04a-roll-${i}`); }
// 移動 → 到着 → 突発イベント（0.3秒おき）
await loadSave(page, 'scripts/archive/playtest/shots/save-rolled.json', (g, s) => { g.world.move = 3; g.rngState = s; g.heroes.forEach(h => h.gold = 200); }, 7);
const t = page.locator('[data-reach]').filter({ hasText: /^3$/ }).first();
await t.scrollIntoViewIfNeeded(); const b = await t.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
await page.waitForTimeout(300);
await shot('04b-target');
console.log(await text());
await page.locator('button:has-text("移動する")').click();
const t0 = Date.now();
for (let i = 0; i < 30; i++) {
  await shot(`04c-move-${String(i).padStart(2, '0')}`);
  const pos = await page.evaluate(() => [...document.querySelectorAll('[data-hero]')].map(e => { const r = e.getBoundingClientRect(); return `${e.dataset.hero}@${e.getAttribute('data-tile')}:${Math.round(r.x)},${Math.round(r.y)}`; }).join(' ') + ' moving=' + (document.querySelector('[data-world-moving]')?.getAttribute('data-world-moving') ?? '-') + ' win=' + !!document.querySelector('[data-event-window]'));
  console.log(Date.now() - t0, pos);
  if (await page.locator('[data-event-window]').count() && i > 3) { await page.waitForTimeout(600); await shot('04d-event'); break; }
  await page.waitForTimeout(300 - 0);
}
console.log(await text()); await issues('event');
const save = await page.evaluate(() => localStorage.getItem('card-rpg/adventure'));
(await import('node:fs')).writeFileSync('scripts/archive/playtest/shots/save-event.json', save);
await browser.close();
console.log('errors', errors);
