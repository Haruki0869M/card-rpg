// 敵の絵・予告の長押しで詳しい窓が出るかだけを確かめる
import { start } from './rec.mjs';
const r = await start('enemy-long', { video: false });
const { page, shot, note, tap, tryTap, newGame, edit } = r;
await newGame({ n: 1 });
await tryTap(page.getByText('つづける'));
await edit((g) => { const w = g.world; const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple'); for (const id of Object.keys(w.pos)) w.pos[id] = t; w.story = undefined; });
await tap(page.getByText('翠の神殿に入る'), 1200);
await tryTap(page.getByText('探索力の判定'), 1300);
await tap(page.getByRole('button', { name: /^扉を開ける/ }), 2600);
for (const sel of ['[data-enemy-sprite]', '[data-intent]', '[data-enemy-info]']) {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) { note(`${sel} なし`); continue; }
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(800);
  const d = await page.evaluate(() => [...document.querySelectorAll('button')].some((x) => x.textContent === '詳細を閉じる') ? document.querySelector('.panel-gold-edge')?.textContent.slice(0, 200) : null);
  await shot(sel.replace(/\W/g, ''));
  await page.mouse.up(); await page.waitForTimeout(500);
  note(`${sel} 長押し → ${d ?? '窓なし'}`);
}
await r.finish();
