import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
const btns = async () => console.log('BTN', await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0,22) + '|' + (b.getAttribute('aria-label')||'')).join(' ; ')));
// 2人とも翠の神殿の入口へ。セシルにはオカメインコ（足元・肩の確認）。
await loadSave(page, 'scripts/archive/playtest/shots/save-pet.json', (g) => {
  const w = g.world; const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
  for (const id of Object.keys(w.pos)) w.pos[id] = t; w.move = undefined; w.moveRoll = undefined;
  g.heroes[1].pet = { petId: 'wolfPup', color: 'gray', name: 'ころ', love: 3, acts: 0 };
});
await shot('07a-before-dungeon');
await btns();
await page.getByText('翠の神殿に入る').click();
for (let i = 0; i < 4; i++) { await page.waitForTimeout(400); await shot(`07b-enter-${i}`); }
console.log(await text()); await btns();
if (await page.locator('[data-explore-roll-button]').count()) {
  await page.locator('[data-explore-roll-button]').click();
  for (let i = 0; i < 5; i++) { await page.waitForTimeout(300); await shot(`07c-explore-${i}`); }
}
console.log(await text()); await issues('dungeon'); await btns();
const save = await page.evaluate(() => localStorage.getItem('card-rpg/adventure'));
(await import('node:fs')).writeFileSync('scripts/archive/playtest/shots/save-dungeon.json', save);
await browser.close();
console.log('errors', errors);
