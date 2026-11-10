import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
const btns = async () => console.log('BTN', await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0,22) + '|' + (b.getAttribute('aria-label')||'')).join(' ; ')));
await loadSave(page, 'scripts/archive/playtest/shots/save-dungeon.json', (g) => {
  (g.expeditions?.[0]?.dungeon ?? g.dungeon).rooms.find((r) => r.id === 'r0c0').enemies = ['forestWolf', 'toxicShroom', 'forestWolf'].map((defId) => ({ defId, level: 3 }));
});
await page.getByRole('button', { name: /扉を開ける/ }).click();
for (let i = 0; i < 8; i++) { await page.waitForTimeout(400); await shot(`08a-battle-start-${i}`); }
console.log(await text()); await issues('battle'); await btns();
console.log(await page.evaluate(() => [...document.querySelectorAll('[data-card-index]')].map(e => e.getAttribute('data-card-index') + ':' + e.textContent.trim().slice(0, 30)).join(' | ')));
const save = await page.evaluate(() => localStorage.getItem('card-rpg/adventure'));
(await import('node:fs')).writeFileSync('scripts/archive/playtest/shots/save-battle.json', save);
await browser.close();
console.log('errors', errors);
