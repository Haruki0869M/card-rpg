// シナリオ2だけの地図のイベント4種類（2026-11-21）の画面の確かめ。1台だけ・オンラインなし（本番の Firebase には何もしない）。
//   (1) 3つの画面（390×540・360×640・390×844）で、4つのイベントの選択肢が全部、画面の中（かスクロールで届く所）にあり、
//       12px より小さい字・44px より小さいボタン・横のはみ出しが無い（lib.mjs の layoutIssues）
//   (2) 巨人の炉あと: 武器を持っていない手番のキャラでは、理由「武器を持っていません」が出て押せない
//   (3) 釣り小屋の帆そり（振る前）: 選んだ後、世界マップの振る前の見込みに +3 が入り、振った内訳に「帆そり」が出る
//   (4) 番小屋: 「薪の束」をもらった後、道具袋に出る
// 使い方: URL=http://127.0.0.1:4192/card-rpg/ node scripts/scenario2-map-events.mjs
import { mkdirSync } from 'node:fs';
import { chromium, URL as BASE, depart, layoutIssues } from './lib.mjs';

const OUT = process.env.OUT ?? 'screenshots/scenario2-map-events';
mkdirSync(OUT, { recursive: true });
const KEY = 'card-rpg/adventure';
const SETTINGS = JSON.stringify({ fastMode: true, vibration: false, firstGuide: false, overviewHintSeen: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const EVENTS = ['iceFishingHut', 'firewoodHut', 'giantForge', 'fadingLantern'];
const SIZES = [[390, 540], [360, 640], [390, 844]];
let ng = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'OK ' : 'NG '} ${name}${extra ? `（${extra}）` : ''}`); if (!ok) ng++; };

async function newSave(page) {
  await page.goto(BASE);
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', s);
    const ids = ['corruptionKing', 'cursedArchipelago', 'sandDynasty', 'starCastle', 'clockworkEmpire', 'dreamLabyrinth'];
    localStorage.setItem('card-rpg/profile', JSON.stringify({ version: 1, clears: Object.fromEntries(ids.map((i) => [i, 1])) }));
  }, SETTINGS);
  await page.reload();
  await page.getByText('新しい冒険').click();
  const card = page.locator('[data-scenarios] button', { hasText: '凍てつく王国' }).first();
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await wait(150);
  await page.getByText('2人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await wait(500);
  const d = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  d.game.world.story = undefined;
  return d;
}
async function load(page, d) {
  await page.goto(BASE);
  await page.evaluate(({ d, k, s }) => { localStorage.clear(); localStorage.setItem('card-rpg/settings', s); localStorage.setItem(k, JSON.stringify(d)); }, { d, k: KEY, s: SETTINGS });
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await wait(1300);
}
/** 手番のキャラ（と仲間）を空いた雪のマスに立たせ、そこにイベントを置いて、イベントの画面にした保存 */
function withEvent(base, id, fn) {
  const d = structuredClone(base);
  const g = d.game;
  const w = g.world;
  const tile = w.tiles.findIndex((t) => !t.f && t.t === 'snow');
  w.tiles[tile].f = { kind: 'event', id };
  for (const h of g.heroes) { w.pos[h.id] = tile; h.gold = 100; h.focus = 3; }
  w.turn = g.heroes[0].id;
  w.move = null;
  w.moveDice = undefined;
  g.mode = 'event';
  g.event = { tile, eventId: id };
  fn?.(g);
  return d;
}

const browser = await chromium.launch();
for (const [vw, vh] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const base = await newSave(page);
  const tag = `${vw}x${vh}`;
  for (const id of EVENTS) {
    await load(page, withEvent(base, id));
    const opts = page.locator('[data-option-kind]');
    const n = await opts.count();
    check(n >= 2, `${tag} ${id}: 選択肢が出る`, `${n}個`);
    // 選択肢は、スクロールして届く所にある（届いた後は画面の中）
    let reach = true;
    for (let k = 0; k < n; k++) {
      await opts.nth(k).scrollIntoViewIfNeeded();
      const b = await opts.nth(k).boundingBox();
      if (!b || b.y < -1 || b.y + b.height > vh + 1 || b.x < -1 || b.x + b.width > vw + 1) reach = false;
    }
    check(reach, `${tag} ${id}: 選択肢が全部、画面の中に届く`);
    const issues = (await layoutIssues(page)).filter((s) => !/^offscreen/.test(s));
    check(!issues.length, `${tag} ${id}: 小さい字・小さいボタン・横のはみ出しが無い`, issues.slice(0, 3).join('／'));
    await page.screenshot({ path: `${OUT}/${tag}-${id}.png` });
  }
  if (vh === 540) {
    // (2) 武器なし
    await load(page, withEvent(base, 'giantForge', (g) => { delete g.heroes[0].equipment.weapon; }));
    const forge = page.locator('[data-option-kind]').first();
    const txt = await forge.innerText();
    check(/武器を持っていません/.test(txt) && (await forge.isDisabled()), `${tag} 炉あと: 武器が無いと、理由が出て押せない`, txt.replace(/\s+/g, ' ').slice(0, 60));
    await page.screenshot({ path: `${OUT}/${tag}-giantForge-noweapon.png` });
    // (3) 帆そり（振る前）
    await load(page, withEvent(base, 'iceFishingHut'));
    await page.locator('[data-option-kind]').nth(1).click();
    await wait(600);
    await page.screenshot({ path: `${OUT}/${tag}-sled-result.png` });
    const fin = page.locator('[data-event-finish], button:has-text("先へ進む"), button:has-text("閉じる")').first();
    await fin.click();
    await wait(900);
    const st = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).game, KEY);
    check(st.mode === 'world' && st.world.moveBonus?.value === 3 && st.world.move === null && st.heroes[0].gold === 70, `${tag} 帆そり: 30G 払い、次のサイコロに+3 を覚える`, JSON.stringify({ mode: st.mode, bonus: st.world.moveBonus, gold: st.heroes[0].gold }));
    await page.screenshot({ path: `${OUT}/${tag}-sled-world.png` });
    const roll = page.locator('[data-roll-move], button:has-text("サイコロを振る")').first();
    await roll.click();
    await wait(2500);
    const st2 = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).game, KEY);
    check((st2.world.moveDice?.bonus ?? []).some((b) => b.label === '帆そり' && b.value === 3) && !st2.world.moveBonus, `${tag} 帆そり: 振った内訳に「帆そり +3」`, JSON.stringify(st2.world.moveDice?.bonus));
    await page.screenshot({ path: `${OUT}/${tag}-sled-rolled.png` });
    // (4) 薪の束
    await load(page, withEvent(base, 'firewoodHut'));
    await page.locator('[data-option-kind]').first().click();
    await wait(600);
    await page.screenshot({ path: `${OUT}/${tag}-firewood-result.png` });
    const st3 = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).game, KEY);
    check(st3.heroes.some((h) => h.pouch.some((p) => p.itemId === 'firewoodBundle')) && st3.heroes[0].gold === 80, `${tag} 番小屋: 20G で「薪の束」が袋に入る`);
  }
  await ctx.close();
}
await browser.close();
console.log(ng ? `NG ${ng} 件` : 'scenario2-map-events: 全部 OK');
process.exit(ng ? 1 : 0);
