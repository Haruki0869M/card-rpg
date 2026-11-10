import { open, loadSave } from './common.mjs';
const { browser, page, text, errors } = await open({ dsf: 1 });
const shot = (n) => page.screenshot({ path: `scripts/archive/playtest/shots/${n}.jpg`, type: 'jpeg', quality: 70 });
await loadSave(page, 'scripts/archive/playtest/shots/save-rolled.json', (g, s) => { g.world.move = 3; g.rngState = s; g.heroes.forEach(h => h.gold = 200); }, 7);
const t = page.locator('[data-reach]').filter({ hasText: /^3$/ }).first();
await t.scrollIntoViewIfNeeded(); const b = await t.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
await page.waitForTimeout(200);
await page.locator('button:has-text("移動する")').click();
const t0 = Date.now(); let next = 0;
for (let i = 0; i < 16; i++) {
  while (Date.now() - t0 < next) await page.waitForTimeout(10);
  const ms = Date.now() - t0; next += 300;
  await shot(`04e-film-${String(i).padStart(2, '0')}`);
  const pos = await page.evaluate(() => [...document.querySelectorAll('[data-hero]')].map(e => { const r = e.getBoundingClientRect(); return `${e.dataset.hero}@${e.getAttribute('data-tile')}:${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}`; }).join(' ') + ' moving=' + (document.querySelector('[data-world-moving]')?.getAttribute('data-world-moving') ?? '-') + ' win=' + !!document.querySelector('[data-event-window]'));
  console.log(i, ms, pos);
}
const badge = page.locator('[data-event-window]');
await page.setViewportSize({ width: 390, height: 844 });
await badge.screenshot({ path: 'scripts/archive/playtest/shots/zz-eventwin.png' });
await browser.close();
console.log('errors', errors);
