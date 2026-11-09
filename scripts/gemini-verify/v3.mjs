// 観点3: ビルドのシナジーが決まった時の爽快感（フォーカスで完全成功・連携・ジョブの能力・お供のカットイン）
// ＋前回の「大」（狙いの表示・予測の札・結果の帯・敵の番のテンポ・報酬の3択）の再確認
// 書き換え: 2人を翠の神殿の入口へ・レオンにセキセイインコ、ルーシアにオカメインコ・最初の部屋の敵を狼2体と毒キノコ・勝つ所で敵のHPを1に
import { start } from './rec.mjs';
const r = await start('v3-synergy');
const { page, beat, shot, text, note, tap, tryTap, newGame, edit, getSave } = r;
const cardIdx = async (re) => { const names = await page.evaluate(() => [...document.querySelectorAll('[data-card-index]')].map((e) => e.textContent)); const i = names.findIndex((t) => re.test(t)); return i < 0 ? 0 : i; };
// 0.1秒おきに、画面の揺れ（transform）・カットイン・数字を記録
const arm = () => page.evaluate(() => {
  window.__fx = [];
  const t0 = performance.now();
  setInterval(() => {
    const root = document.querySelector('.game-bg') ?? document.body;
    const tf = getComputedStyle(root).transform;
    const cut = [...document.querySelectorAll('[data-cutin-pet-art], [data-ability-cutin], [data-cutin]')].map((e) => e.textContent.trim().slice(0, 20));
    const pops = [...document.querySelectorAll('[data-popup-unit]')].map((e) => e.textContent.trim().slice(0, 12));
    const big = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /完全成功|成功！|失敗|ダメージ|連携/.test(e.textContent) && e.offsetParent).map((e) => e.textContent.trim().slice(0, 30)).slice(0, 4);
    window.__fx.push({ t: ((performance.now() - t0) / 1000).toFixed(1), tf: tf === 'none' ? '' : tf, cut, pops, big });
  }, 100);
});
const dump = async (label) => { const L = await page.evaluate(() => { const L = window.__fx; window.__fx = []; return L; }); const uniq = []; let last = ''; for (const x of L) { const k = JSON.stringify([x.tf, x.cut, x.pops, x.big]); if (k !== last) { uniq.push(x); last = k; } } note(`${label}: ${JSON.stringify(uniq).slice(0, 1500)}`); };

await newGame({ n: 2, seats: 'solo' });
await tryTap(page.getByText('つづける'));
await edit((g) => {
  const w = g.world; const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
  for (const id of Object.keys(w.pos)) w.pos[id] = t; w.story = undefined;
  g.heroes[0].pet = { petId: 'budgie', color: 'green', name: 'ぴーちゃん', love: 40, acts: 0 };
  g.heroes[1].pet = { petId: 'cockatiel', color: 'normal', name: 'ぽぽ', love: 40, acts: 0 };
});
await tap(page.getByText('翠の神殿に入る'), 1200);
await edit((g) => { (g.expeditions?.[0]?.dungeon ?? g.dungeon).rooms.find((r) => r.id === 'r0c0').enemies = ['forestWolf', 'toxicShroom', 'forestWolf'].map((defId) => ({ defId, level: 3 })); });
await tryTap(page.getByText('探索力の判定'), 1300);
await tap(page.getByRole('button', { name: /^扉を開ける/ }), 2600);
await shot('01-battle');
note(`戦闘の始め: ${(await text()).slice(0, 400)}`);
await arm();
// レオン: ストライク → 敵 → フォーカスを2つ → 発動
await tap(page.locator(`[data-card-index="${await cardIdx(/ストライク/)}"]`), 700);
await shot('02-card');
await tap(page.locator('[data-enemy]:not([data-dead])').nth(1), 700);
await shot('03-target');
for (let i = 0; i < 3; i++) await tryTap(page.getByRole('button', { name: 'フォーカスを増やす' }), 450);
await shot('04-focus');
await tap(page.getByRole('button', { name: /発動/ }), 250);
for (let i = 0; i < 6; i++) { await page.waitForTimeout(220); await shot(`05-slot-${i}`); }
await beat(900);
await dump('1枚目（フォーカスで完全成功を狙う）');
// 2枚目（お供の応援の歌は同じターンに2枚目から）
await tap(page.locator(`[data-card-index="${await cardIdx(/斬|ストライク|まとめ/)}"]`), 600);
if (/敵をタップ|対象の敵/.test(await text())) await tap(page.locator('[data-enemy]:not([data-dead])').nth(1), 500);
await tap(page.getByRole('button', { name: /発動/ }), 250);
for (let i = 0; i < 8; i++) { await page.waitForTimeout(220); await shot(`06-second-${i}`); }
await beat(900);
await dump('2枚目（お供の応援）');
// ルーシア: 同じ敵へ魔法（連携）
await tap(page.locator('[data-ally]').nth(1), 800);
await shot('07-lucia');
await tap(page.locator(`[data-card-index="${await cardIdx(/マジック|魔力|アロー/)}"]`), 600);
if (/敵をタップ|対象の敵/.test(await text())) await tap(page.locator('[data-enemy]:not([data-dead])').nth(1), 600);
await shot('08-combo-target');
note(`連携の表示: ${(await text()).match(/連携[^/]{0,20}/g)}`);
await tap(page.getByRole('button', { name: /発動/ }), 250);
for (let i = 0; i < 8; i++) { await page.waitForTimeout(220); await shot(`09-combo-${i}`); }
await beat(900);
await dump('ルーシアの連携');
// ターン終了 → 敵の番
await tap(page.getByRole('button', { name: 'ターン終了' }), 300);
if (await page.getByRole('button', { name: 'ターンを終了する' }).count()) { await shot('10-endturn-confirm'); await tap(page.getByRole('button', { name: 'ターンを終了する' }), 100); }
const t0 = Date.now();
for (let i = 0; i < 24; i++) { await page.waitForTimeout(250); if (i % 2 === 0) await shot(`11-enemy-${String(i).padStart(2, '0')}`); if (i > 6 && (await page.getByRole('button', { name: 'ターン終了' }).isEnabled().catch(() => false)) && !(await page.locator('[data-battle-presenting]').count())) break; }
note(`敵の番の長さ（ターン終了から操作できるまで）: 約${((Date.now() - t0) / 1000).toFixed(1)}秒`);
await dump('敵の番');
await shot('12-turn2');
// 勝つ（敵のHPを1に）
await edit((g) => { g.expeditions[0].battle.enemies.forEach((e) => (e.hp = Math.min(e.hp, 1))); });
for (let k = 0; k < 8; k++) {
  if (await page.getByText('報酬を受け取る').count()) break;
  const names = await page.evaluate(() => [...document.querySelectorAll('[data-card-index]')].map((e) => e.textContent));
  const i = names.findIndex((t) => /ストライク|斬|まとめ|マジック|魔力|アロー|ボルト/.test(t));
  if (i < 0) { await tap(page.getByRole('button', { name: 'ターン終了' }), 300); await tryTap(page.getByRole('button', { name: 'ターンを終了する' }), 3000); continue; }
  await tryTap(page.locator(`[data-card-index="${i}"]`), 500);
  await tryTap(page.locator('[data-enemy]:not([data-dead])'), 400);
  await tryTap(page.getByRole('button', { name: /発動/ }), 2200);
  if (!(await page.locator('[data-card-index]').count())) await tryTap(page.locator('[data-ally]').nth(1), 600);
}
await beat(1500);
await shot('13-victory');
await tryTap(page.getByText('報酬を受け取る'), 1500);
for (let k = 0; k < 6; k++) {
  await shot(`14-reward-${k}`);
  const tx = await text();
  if (/このカードを選ぶ/.test(tx)) { await tap(page.getByText('このカードを選ぶ'), 1200); continue; }
  const cards = page.locator('[data-pick-card], [data-offer-card]');
  if (await cards.count()) { await tap(cards.nth(1), 900); continue; }
  if (await tryTap(page.locator('button').filter({ hasText: /成功率も上がる|打たれ強く|確定成功|上がる/ }), 1300)) continue;
  if (await tryTap(page.getByText('先へ進む'), 1200)) break;
  note(`報酬の画面: ${tx.slice(0, 300)}`);
  break;
}
await shot('15-after');
await r.finish();
