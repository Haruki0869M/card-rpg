// 動画③ 戦闘（敵4体・敵を選ぶ・味方を選ぶ・フォーカス・お供・能力）〜勝利・報酬
import { start } from './rec.mjs';
const { page, beat, shot, text, save, putSave, loadFile, finish } = await start('03-battle-and-synergy');
const btns = async () => console.log('BTN', await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled).map(b => b.textContent.trim().slice(0, 18) + '|' + (b.getAttribute('aria-label') || '')).join(' ; ')));
const tryClick = async (loc, ms = 800) => { if (await loc.count()) { await loc.first().click(); await beat(ms); return true; } console.log('なし:', loc.toString()); return false; };
const handoff = async () => { if (await page.getByRole('button', { name: '手番を始める' }).count()) { await shot('v3-handoff'); await page.getByRole('button', { name: '手番を始める' }).click(); await beat(900); } };
const cardIdx = async (re) => { const names = await page.evaluate(() => [...document.querySelectorAll('[data-card-index]')].map((e) => e.textContent)); const i = names.findIndex((t) => re.test(t)); return i < 0 ? 0 : i; };
await page.goto('http://127.0.0.1:4219/card-rpg/');
// 書き換え: 翠の神殿の最初の部屋の敵を4体に・P1/P2 に分ける（レオンにセキセイインコ、セシルに子狼）
await putSave(loadFile('scripts/playtest/shots/save-dungeon.json'), (g) => {
  g.heroes[0].playerId = 'P1'; g.heroes[1].playerId = 'P2';
  (g.expeditions[0].heroes ?? []).forEach?.(() => {});
  const dg = g.expeditions?.[0]?.dungeon ?? g.dungeon;
  dg.rooms.find((r) => r.id === 'r0c0').enemies = ['forestWolf', 'toxicShroom', 'forestWolf', 'toxicShroom'].map((defId) => ({ defId, level: 3 }));
});
await tryClick(page.getByRole('button', { name: /^扉を開ける/ }), 2500);
await handoff();
await shot('v3-01-battle-4enemies');
console.log(await text()); await btns();
// レオン: ストライク → 敵を選ぶ → 選び直す → フォーカスを使う → 発動
await page.locator(`[data-card-index="${await cardIdx(/ストライク/)}"]`).click(); await beat(900);
await shot('v3-02-card-selected');
await page.locator('[data-enemy]').nth(0).click(); await beat(900);
await shot('v3-03-target-1');
await page.locator('[data-enemy]').nth(2).click(); await beat(900);
await shot('v3-04-target-changed');
await tryClick(page.getByRole('button', { name: 'フォーカスを増やす' }), 900);
await shot('v3-05-focus');
await page.getByRole('button', { name: /発動/ }).click();
for (let i = 0; i < 6; i++) { await page.waitForTimeout(250); await shot(`v3-06-slot-${i}`); }
await beat(800);
// 2枚目・3枚目（3枚目でインコの応援）
for (const re of [/ガード/, /シールド|ストライク/]) {
  await page.locator(`[data-card-index="${await cardIdx(re)}"]`).click(); await beat(700);
  if (await page.locator('[data-enemy]:not([data-dead])').count() && /対象の敵/.test(await text())) { await page.locator('[data-enemy]:not([data-dead])').first().click(); await beat(600); }
  await page.getByRole('button', { name: /発動/ }).click();
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(250); await shot(`v3-07-${re.source.slice(0, 3)}-${i}`); }
  await beat(700);
}
console.log('AFTER3', (await text()).slice(0, 600));
// セシル（P2）: 癒し → 最初の相手 → 相手を変える → 発動
await handoff();
if (!/セシル/.test(await page.evaluate(() => document.querySelector('[data-ally].ring-2, [data-ally]')?.textContent ?? ''))) await tryClick(page.locator('[data-ally]').nth(1), 900);
await handoff();
await page.locator(`[data-card-index="${await cardIdx(/癒し/)}"]`).click(); await beat(900);
await shot('v3-08-heal-default-target');
console.log('HEAL', (await text()).match(/回復・支援[^/]*/)?.[0]);
await page.locator('[data-ally]').nth(1).click(); await beat(900);
await shot('v3-09-heal-target-changed');
console.log('HEAL2', (await text()).match(/回復・支援[^/]*/)?.[0]);
await page.getByRole('button', { name: /発動/ }).click();
for (let i = 0; i < 6; i++) { await page.waitForTimeout(250); await shot(`v3-10-heal-${i}`); }
await beat(800);
// ターン終了 → 敵の番
await page.getByRole('button', { name: 'ターン終了' }).click();
for (let i = 0; i < 16; i++) { await page.waitForTimeout(250); await shot(`v3-11-enemy-${String(i).padStart(2, '0')}`); }
await handoff();
await beat(1000);
console.log('TURN2', (await text()).slice(0, 500));
// 勝利まで（書き換え: 敵のHPを1に）
await putSave(await save(), (g) => { g.expeditions[0].battle.enemies.forEach((e) => (e.hp = Math.min(e.hp, 1))); });
await handoff();
for (let k = 0; k < 6; k++) {
  if (await page.getByText('報酬を受け取る').count()) break;
  await handoff();
  const names = await page.evaluate(() => [...document.querySelectorAll('[data-card-index]')].map((e) => e.textContent));
  let i = names.findIndex((t) => /ストライク|シールド|ヘビー|聖なる|まとめ|斬/.test(t));
  if (i < 0) { await tryClick(page.getByRole('button', { name: 'ターン終了' }), 3000); continue; }
  await page.locator(`[data-card-index="${i}"]`).click(); await beat(600);
  await tryClick(page.locator('[data-enemy]:not([data-dead])'), 500);
  await page.getByRole('button', { name: /発動/ }).click(); await beat(2200);
}
await beat(1200);
await shot('v3-12-victory');
await tryClick(page.getByText('報酬を受け取る'), 1500);
await shot('v3-13-levelup');
await tryClick(page.locator('button').filter({ hasText: /成功率も上がる|打たれ強く|確定成功/ }), 1500);
await shot('v3-13b-levelup-P2');
await tryClick(page.locator('button').filter({ hasText: /成功率も上がる|打たれ強く|確定成功/ }), 1500);
await shot('v3-14-card-pick-P1');
console.log('PICK1', (await text()).slice(0, 500));
const pick = async () => { const b = page.locator('button').filter({ hasText: /%/ }); if (await b.count()) { await b.first().click(); await beat(1500); } };
await pick();
await handoff();
await shot('v3-15-card-pick-P2');
console.log('PICK2', (await text()).slice(0, 500));
await pick();
await shot('v3-16-after-reward');
await finish();
