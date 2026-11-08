// 動画② 町（P1/P2 の切り替え・買い物・装備・聖堂の条件）〜ダンジョン（探索力の判定・歩く）
import { start } from './rec.mjs';
const { page, beat, shot, text, save, putSave, loadFile, finish } = await start('02-town-and-dungeon');
const btns = async () => console.log('BTN', await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled).map(b => b.textContent.trim().slice(0, 18) + '|' + (b.getAttribute('aria-label') || '')).join(' ; ')));
const tryClick = async (loc, ms = 800) => { if (await loc.count()) { await loc.first().click(); await beat(ms); return true; } console.log('なし:', loc.toString()); return false; };
await page.goto('http://127.0.0.1:4219/card-rpg/');
// 書き換え: 2人を王都に・P1/P2 に分ける・レオンを剣豪Lv4（条件の進み具合 9/15・7/10・3/10）・所持金
await putSave(loadFile('scripts/playtest/shots/save-pet.json'), (g) => {
  const w = g.world; for (const id of Object.keys(w.pos)) w.pos[id] = 211; w.move = undefined; w.moveRoll = undefined; w.turn = 'h0'; w.acted = [];
  g.heroes[0].playerId = 'P1'; g.heroes[1].playerId = 'P2';
  const L = g.heroes[0]; L.classId = 'swordmaster'; L.level = 4; L.exp = 0; L.feats = { perfects: 9, 'kills:weapon:katana': 7, 'kills:element': 3 };
  g.heroes.forEach((h) => (h.gold = 300));
});
await shot('v2-01-world-at-town');
await btns();
await tryClick(page.getByText('王都クリスタリアに入る'), 1500);
await shot('v2-02-town-P1');
await btns();
// 買い物（レオン）
await tryClick(page.getByRole('button', { name: '30' }).nth(1), 1000);
await shot('v2-03-bought');
console.log(await text());
// P2 に切り替え
await tryClick(page.getByRole('button', { name: /セシル/ }), 1000);
await shot('v2-04-town-P2');
await tryClick(page.getByRole('button', { name: '30' }).nth(3), 1000);
await shot('v2-05-P2-bought');
// 宿屋・依頼のタブ
await tryClick(page.getByRole('button', { name: /宿屋/ }), 900); await shot('v2-06-inn');
await tryClick(page.getByRole('button', { name: /依頼/ }).last(), 900); await shot('v2-07-quests');
// レオンに戻って聖堂
await tryClick(page.getByRole('button', { name: /レオン/ }), 900);
await tryClick(page.getByText('聖堂（転職）'), 1200);
await shot('v2-08-temple-list');
await page.mouse.move(195, 600);
for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 250); await beat(500); }
await shot('v2-09-temple-conditions');
console.log(await text());
await tryClick(page.getByRole('button', { name: 'セシル' }).last(), 1000);
await shot('v2-10-temple-P2');
await tryClick(page.getByRole('button', { name: '閉じる' }), 900);
await tryClick(page.getByText('世界マップへ'), 1500);
await shot('v2-11-after-town');
console.log(await text()); await btns();
// ダンジョン（書き換え: 2人を翠の神殿の入口へ・最初の部屋は敵なし）
await putSave(loadFile('scripts/playtest/shots/save-pet.json'), (g) => {
  const w = g.world; const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
  for (const id of Object.keys(w.pos)) w.pos[id] = t; w.move = undefined; w.moveRoll = undefined; w.turn = 'h0'; w.acted = [];
  g.heroes[0].playerId = 'P1'; g.heroes[1].playerId = 'P2';
  g.heroes[1].pet = { petId: 'cockatiel', color: 'lutino', name: 'まめ', love: 3, acts: 0 };
});
await shot('v2-12-world-at-dungeon');
await btns();
await tryClick(page.getByText('翠の神殿に入る'), 2000);
await shot('v2-13-dungeon-enter');
console.log(await text()); await btns();
await tryClick(page.getByText('探索力の判定'), 1500);
await shot('v2-14-explore-roll');
// 装備の画面
if (await tryClick(page.getByRole('button', { name: /^装備/ }), 1200)) { await shot('v2-15-equip'); console.log('EQUIP', await text()); await btns(); await tryClick(page.getByRole('button', { name: /閉じる|戻る/ }), 900); }
// 扉は全員の投票：P1 が「開ける」を押した所
await tryClick(page.getByRole('button', { name: /^扉を開ける/ }), 1500);
await shot('v2-16-door-vote');
console.log('VOTE', (await text()).slice(0, 500)); await btns();
// 歩く場面（書き換え: 最初の部屋の戦闘に勝った直後の保存から。P1/P2 に分ける）
await putSave(loadFile('scripts/playtest/shots/save-reward2.json'), (g) => { g.heroes[0].playerId = 'P1'; g.heroes[1].playerId = 'P2'; (g.expeditions?.[0]?.heroes ?? []).length; });
await tryClick(page.getByText('最大HP +8'), 900); await tryClick(page.getByText('最大HP +8'), 900);
await tryClick(page.getByText('レオンはカードを選ばない'), 900); await tryClick(page.getByText('セシルはカードを選ばない'), 900);
await tryClick(page.getByText('先へ進む'), 1500);
await shot('v2-17-room');
for (let k = 0; k < 4; k++) {
  const names = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled).map(b => b.textContent.trim()));
  const pick = ['前進', '左へ', '右へ'].find((x) => names.some((n) => n.startsWith(x)));
  if (!pick) { console.log('歩けない', names.join(',')); break; }
  await page.getByRole('button', { name: new RegExp('^' + pick) }).first().click(); await beat(1300);
  await shot('v2-18-walk-' + k);
  console.log(pick, (await text()).slice(0, 200));
}
await tryClick(page.getByRole('button', { name: /地図を開く/ }), 1200); await shot('v2-19-dungeon-map');
await btns();
await finish();
