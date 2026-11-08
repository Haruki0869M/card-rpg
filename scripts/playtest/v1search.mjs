import { open, loadSave } from './common.mjs';
import { waitForWorldMovement } from '../lib.mjs';
const { browser, page } = await open({ dsf: 1 });
for (let seed = 1; seed <= 60; seed++) {
  await loadSave(page, 'scripts/playtest/shots/save-rolled.json', (g, s) => { const w = g.world; w.turn = 'h1'; w.acted = ['h0']; w.move = 3; w.moveRoll = ['hit','miss','hit','miss']; g.rngState = s; g.heroes.forEach(h => h.gold = 200); }, seed);
  const t = page.locator('[data-reach]').filter({ hasText: /^3$/ }).first();
  if (!(await t.count())) { console.log('no reach', (await page.evaluate(() => document.body.innerText)).slice(0, 400)); break; }
  await t.scrollIntoViewIfNeeded(); const b = await t.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.locator('button:has-text("移動する")').click();
  await waitForWorldMovement(page).catch(() => {});
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => { const g = JSON.parse(localStorage.getItem('card-rpg/adventure')).game; return [g.mode, g.event?.eventId, g.event?.random, g.world.pos]; });
  console.log(seed, JSON.stringify(m));
  if (m[0] === 'event' && m[2]) break;
}
await browser.close();
