import { open, loadSave } from './common.mjs';
import { waitForWorldMovement } from '../../lib.mjs';
const { browser, page } = await open();
for (let seed = 1; seed <= 40; seed++) {
  await loadSave(page, 'scripts/archive/playtest/shots/save-rolled.json', (g, s) => { g.world.move = 3; g.rngState = s; }, seed);
  const t = page.locator('[data-reach]').filter({ hasText: /^3$/ }).first();
  if (!(await t.count())) { console.log('no reach'); break; }
  await t.scrollIntoViewIfNeeded(); const b = await t.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.locator('button:has-text("移動する")').click();
  await waitForWorldMovement(page).catch(() => {});
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => { const g = JSON.parse(localStorage.getItem('card-rpg/adventure')).game; return [g.mode, g.event?.eventId, g.event?.random]; });
  console.log(seed, m);
  if (m[0] === 'event' && m[2]) break;
}
await browser.close();
