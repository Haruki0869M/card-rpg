// 観点1: 1台の協力のテンポ（同行の確認・受け渡しの画面）。「スマホを回して」と「1人で全員」の両方
import { start } from './rec.mjs';
const MODE = process.env.SEATS ?? 'pass';
const name = `v1-coop-${MODE}`;
const r = await start(name);
const { page, beat, shot, text, note, tap, tryTap, newGame, edit } = r;
// 受け渡しの画面・カットイン・同行の確認を、0.1秒おきに数える
await page.addInitScript(() => {});
const watch = async () => page.evaluate(() => {
  const w = (window.__watch = { handoff: 0, cutin: 0, proposal: 0, seen: [] });
  let last = '';
  setInterval(() => {
    const t = document.body.innerText;
    const h = /渡してください|タップで始める/.test(t) || !!document.querySelector('[aria-label="手番を始める"]');
    const c = !!document.querySelector('[data-turn-cutin],[data-turn-notice]');
    const p = !!document.querySelector('[data-move-proposal]');
    const key = `${h ? 'H' : ''}${c ? 'C' : ''}${p ? 'P' : ''}`;
    if (key !== last) { if (key.includes('H') && !last.includes('H')) w.handoff++; if (key.includes('C') && !last.includes('C')) w.cutin++; if (key.includes('P') && !last.includes('P')) w.proposal++; w.seen.push(`${(performance.now() / 1000).toFixed(1)}s:${key || '-'}`); last = key; }
  }, 100);
});
const counts = () => page.evaluate(() => ({ ...window.__watch, seen: window.__watch.seen.slice(-30) }));
const handoff = async (label) => {
  for (let i = 0; i < 8; i++) {
    if (await page.getByLabel('手番を始める').count()) { await shot(`handoff-${label}`); note(`受け渡しの画面（${label}）: ${(await text()).slice(0, 120)}`); await tap(page.getByLabel('手番を始める'), 700); return true; }
    await page.waitForTimeout(150);
  }
  return false;
};
const pickTile = async () => {
  const t = page.locator('[data-reach]').filter({ hasText: /^[1-9]$/ }).first();
  const b = await t.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await beat();
};

await newGame({ n: 2, seats: MODE });
await watch();
await tryTap(page.getByText('つづける'));
await shot('01-world-start');
// P1 が2人目を連れて動く（「1人で全員」は最初から同行、「スマホを回して」は誘う）
const invite = page.getByRole('button', { name: /を誘う$/ });
if (await invite.count()) { await tap(invite); await shot('02-invited'); note(`誘った後: ${(await text()).slice(0, 200)}`); }
await tap(page.getByText('移動力の判定', { exact: true }), 1200);
await pickTile();
await shot('03-picked');
await tap(page.locator('button:has-text("移動する")'), 200);
// 同行の確認が出るか
let proposal = false;
for (let i = 0; i < 10; i++) { if (await page.locator('[data-move-proposal]').count()) proposal = true; await page.waitForTimeout(80); }
note(`同行の確認の窓: ${proposal ? '出た' : '出ない'}`);
await page.locator('[data-world-moving]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
await beat(900);
await shot('04-arrived');
// 突発イベントなどの窓は閉じる
for (let i = 0; i < 4; i++) { if (!(await tryTap(page.getByText('つづける'))) && !(await tryTap(page.getByText('先へ進む'))) && !(await tryTap(page.getByText('閉じる', { exact: true })))) break; }
await tryTap(page.getByRole('button', { name: '手番を終える' }), 300);
const h1 = await handoff('world-P1toP2');
note(`世界マップ P1→2人目: 受け渡し ${h1 ? 'あり' : 'なし'}`);
await shot('05-second-turn');
note(`2人目の番: ${(await text()).slice(0, 160)}`);
// 2人目も動く
if (await page.getByText('移動力の判定', { exact: true }).count()) {
  await tap(page.getByText('移動力の判定', { exact: true }), 1200);
  await pickTile();
  await tap(page.locator('button:has-text("移動する")'), 200);
  await page.locator('[data-world-moving]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  await beat(900);
  for (let i = 0; i < 4; i++) { if (!(await tryTap(page.getByText('つづける'))) && !(await tryTap(page.getByText('先へ進む'))) && !(await tryTap(page.getByText('閉じる', { exact: true })))) break; }
}
await tryTap(page.getByRole('button', { name: '手番を終える' }), 300);
const h2 = await handoff('world-P2toP1');
note(`世界マップ 2人目→P1: 受け渡し ${h2 ? 'あり' : 'なし'}`);
await shot('06-back-to-P1');
const worldCounts = await counts();
// 戦闘: 2人を翠の神殿の入口へ（書き換え）→ 入って最初の部屋の戦闘
await edit((g) => { const w = g.world; const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple'); for (const id of Object.keys(w.pos)) w.pos[id] = t; w.story = undefined; w.turn = g.heroes[0].id; w.acted = []; g.mode = 'world'; delete g.event; delete g.world.randomEvent; delete g.world.event; });
await watch();
await tap(page.getByText('翠の神殿に入る'), 1200);
await handoff('dungeon-enter');
await tryTap(page.getByText('探索力の判定'), 1200);
await shot('07-dungeon');
await tap(page.getByRole('button', { name: /^扉を開ける/ }), 2500);
await handoff('battle-start');
await shot('08-battle');
// 1人目: カードを1枚使って次の仲間へ
const useCard = async () => {
  await tap(page.locator('[data-card-index]').first(), 600);
  if (/敵をタップ|対象の敵/.test(await text())) await tap(page.locator('[data-enemy]:not([data-dead])').first(), 500);
  await tryTap(page.getByRole('button', { name: /発動/ }), 1800);
};
await useCard();
// 次の仲間に切り替える（手札の上の顔）
await tryTap(page.locator('[data-ally]').nth(1), 900);
const h3 = await handoff('battle-P1toP2');
note(`戦闘 1人目→2人目: 受け渡し ${h3 ? 'あり' : 'なし'}`);
await shot('09-battle-second');
await useCard();
await tap(page.getByRole('button', { name: 'ターン終了' }), 300);
if (await page.getByRole('button', { name: 'ターンを終了する' }).count()) { await shot('10-endturn-confirm'); await tap(page.getByRole('button', { name: 'ターンを終了する' }), 300); }
await page.waitForTimeout(6000);
const h4 = await handoff('battle-turn2');
note(`戦闘 敵の番の後: 受け渡し ${h4 ? 'あり' : 'なし'}`);
await shot('11-turn2');
const battleCounts = await counts();
await r.finish({ worldCounts, battleCounts });
