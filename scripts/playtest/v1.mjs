// 動画① タイトル〜準備〜世界マップ（別々の移動・同行・イベント・お供）
import { start, armProbe, readProbe, URL } from './rec.mjs';
import { waitForWorldMovement } from '../lib.mjs';
import { writeFileSync } from 'node:fs';
const { page, beat, shot, text, save, putSave, loadFile, finish } = await start('01-world-and-party');
const btns = async () => console.log('BTN', await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled).map(b => b.textContent.trim().slice(0, 18) + '|' + (b.getAttribute('aria-label') || '')).join(' ; ')));
const probes = [];
// A. 保存データがある状態のタイトル → はじめから
await page.goto(URL);
await page.evaluate((d) => { localStorage.clear(); localStorage.setItem('card-rpg/adventure', d); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false })); }, JSON.stringify(loadFile('scripts/playtest/shots/save-start.json')));
await page.reload(); await beat(1200);
await shot('v1-01-title');
await page.getByRole('button', { name: /新しい冒険/ }).click(); await beat(900);
await shot('v1-02-setup');
await page.getByText('2人', { exact: true }).click(); await beat(600);
await page.getByText('ふつう', { exact: true }).click(); await beat(600);
await page.getByText('キャラクター作成へ').click(); await beat(900);
// B. キャラ作成
await shot('v1-03-create-p1');
await page.mouse.move(195, 640);
for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 250); await beat(400); }
await shot('v1-04-create-p1-ability');
await page.mouse.wheel(0, -2000); await beat(500);
await page.getByRole('button', { name: /2人目/ }).click(); await beat(800);
await page.getByRole('button', { name: '僧侶', exact: true }).click(); await beat(800);
await page.getByRole('button', { name: '女性', exact: true }).click(); await beat(700);
await page.getByRole('button', { name: 'P2', exact: true }).click(); await beat(700);
await page.mouse.move(195, 640);
for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 250); await beat(400); }
await shot('v1-05-create-p2-ability');
await page.mouse.wheel(0, -2000); await beat(500);
await page.getByText('冒険に出発').click(); await beat(1500);
await shot('v1-06-story');
await page.getByText('つづける').click(); await beat(1000);
// 突発イベントを止めて、別々の移動だけを見る（書き換え）
await putSave(await save(), (g) => { g.heroes.forEach((h) => (h.lastRandomEvent = g.world.worldTurn)); });
await shot('v1-07-map-start');
console.log(await text()); await btns();
// C. P1 が単独で移動
const solo = async (who, other) => {
  if (await page.getByRole('button', { name: `${other}を残す` }).count()) { await page.getByRole('button', { name: `${other}を残す` }).click(); await beat(700); }
  await page.locator('[data-roll-move]').click(); await beat(1200);
  const far = await page.evaluate(() => { const occ = new Set([...document.querySelectorAll('[data-hero]')].map((e) => e.getAttribute('data-tile'))); let best = null, n = -1; for (const e of document.querySelectorAll('[data-reach]')) { if (occ.has(e.getAttribute('data-reach'))) continue; const v = parseInt(e.textContent.trim()); if (v > n) { n = v; best = e.getAttribute('data-reach'); } } return best; });
  const t = page.locator(`[data-reach="${far}"]`); await t.scrollIntoViewIfNeeded(); const b = await t.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await beat(800);
  await shot(`v1-08-${who}-target`);
  const mover = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.world.turn);
  await armProbe(page, mover);
  await page.locator('button:has-text("移動する")').click();
  await page.waitForTimeout(250); await shot(`v1-09-${who}-moving`);
  await waitForWorldMovement(page); await beat(900);
  const pr = await readProbe(page); pr.who = who; probes.push(pr); console.log('PROBE', JSON.stringify(pr));
  await shot(`v1-10-${who}-arrived`);
  console.log(await text()); await btns();
};
await solo('P1', 'セシル');
await page.getByText('手番を終える').click(); await beat(1500);
await shot('v1-11a-handoff');
if (await page.getByRole('button', { name: '手番を始める' }).count()) { await page.getByRole('button', { name: '手番を始める' }).click(); await beat(900); }
console.log('after end', await text()); await btns();
await shot('v1-11-P2-turn');
await solo('P2', 'レオン');
await page.getByText('手番を終える').click(); await beat(1500);
await shot('v1-12-after-P2');
const __pl = (await save()).game.heroes.map((h) => h.playerId); console.log('players', JSON.stringify(__pl));
// D. 合流して同行：P2 の番に P1 を連れて移動 → 突発イベント → お供
await putSave(loadFile('scripts/playtest/shots/save-rolled.json'), (g, a) => { const w = g.world; w.turn = 'h1'; w.acted = ['h0']; w.move = 3; w.moveRoll = ['hit', 'miss', 'hit', 'miss']; g.rngState = a.s; g.heroes.forEach((h, i) => { h.gold = 200; h.playerId = a.pl[i]; }); }, { s: 7, pl: __pl });
await shot('v1-13-P2-with-companion');
console.log(await text()); await btns();
if (await page.getByRole('button', { name: '手番を始める' }).count()) { await page.getByRole('button', { name: '手番を始める' }).click(); await beat(900); }
if (await page.getByRole('button', { name: /レオンを誘う/ }).count()) { await page.getByRole('button', { name: /レオンを誘う/ }).click(); await beat(1200); await shot('v1-13b-invite'); console.log('INVITE', await text()); await btns(); }
const t = page.locator('[data-reach]').filter({ hasText: /^3$/ }).first(); await t.scrollIntoViewIfNeeded(); const b = await t.boundingBox();
await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await beat(800);
await page.locator('button:has-text("移動する")').click();
await beat(900); await shot('v1-14a-agree');
if (await page.getByRole('button', { name: /一緒に行く/ }).count()) { await page.getByRole('button', { name: /一緒に行く/ }).click(); }
await page.waitForTimeout(300); await shot('v1-14-party-moving');
await waitForWorldMovement(page);
let forced = false;
try { await page.locator('[data-event-window]').waitFor({ timeout: 5000 }); } catch { forced = true; console.log('EVENT: 起きなかったので書き換えで出す'); await shot('v1-14b-no-event'); await putSave(await save(), (g) => { const h = g.heroes[1]; g.mode = 'event'; g.party = [h.id, g.heroes[0].id]; g.event = { tile: g.world.pos[h.id], eventId: 'rStrayBird', random: true }; }); await page.locator('[data-event-window]').waitFor(); }
console.log('FORCED', forced); await beat(900);
await shot('v1-15-event');
await page.getByText('エサを買って分けてあげる').click(); await beat(1200);
await page.getByText('先へ進む').click(); await beat(1500);
await shot('v1-16-pet-coat');
await page.getByLabel('お供の名前').click(); await beat(400);
await page.getByLabel('お供の名前').pressSequentially('ぴーちゃん', { delay: 120 }); await beat(700);
await page.getByText('お供にする').click(); await beat(1500);
await shot('v1-17-pet-on-map');
writeFileSync('screenshots/review-pack/probe-world.json', JSON.stringify(probes, null, 1));
await finish();
