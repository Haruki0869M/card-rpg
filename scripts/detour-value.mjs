// 寄り道の値打ち（2026-11-14 docs/tasks/detour-value-plan.md §3）の画面の確認（360×640 と 390×844）:
// ① 災厄の札: 「💀加護: ボスに「用心棒」「凍てつく守り」」の1行と、押した時の説明の加護の行
// ② 鍵のダンジョンのマスの説明: 掛かっている加護（💀）・見破りの印（👁見破り済み）とボスの段階
// ③ ランダムダンジョンのマスの説明: 「主を倒すと: 秘宝を3つから1つ・👁見破り（〇〇のボス）・抜け道」
// ④ ボスの戦闘: 名前の横の 💀2・👁、長押しの加護と見破りの行
// ⑤ 最後の中ボスの長押し: 「HP50%を切るか、相方が倒れると」
// ⑥ 黄金箱の秘宝の3択（2人・1台: みんなで決めるが、1台なら全員分まとめて入るので止まらない）→ 選んだ秘宝の取り合い
// ⑦ 制覇の画面: 見破りの知らせ・「抜け道を通る」と「入口へ戻る」。抜け道を押すと、次の目的地の近くのマスに出る
// ⑧ 町の店: 盗賊王の無料券（🎟）で、装備を無料でもらえる
// 重なり・はみ出し・12px 未満の字が無いこと（lib.mjs の layoutIssues）
// 使い方: URL=http://127.0.0.1:<番号>/card-rpg/ node scripts/detour-value.mjs
import { mkdirSync } from 'node:fs';
import { chromium, depart, layoutIssues, startBattle, URL } from './lib.mjs';

const OUT = process.env.DETOUR_OUTPUT ?? 'screenshots/detour-value';
const KEY = 'card-rpg/adventure';
mkdirSync(OUT, { recursive: true });
const SIZES = [
  [360, 640],
  [390, 844],
];
const browser = await chromium.launch();
const problems = [];
const notes = [];

async function start(page, players) {
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false, overviewHintSeen: true }));
  });
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText(`${players}人`, { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(300);
}
async function edit(page, fn, arg) {
  await page.evaluate(({ src, arg, k }) => {
    const d = JSON.parse(localStorage.getItem(k));
    (0, eval)(src)(d.game, arg);
    localStorage.setItem(k, JSON.stringify(d));
  }, { src: fn.toString(), arg, k: KEY });
  await page.reload();
  await page.getByText('つづきから').click();
  await page.waitForTimeout(500);
}
const game = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)).game, KEY);
async function check(page, tag, where) {
  const list = (await layoutIssues(page)).filter((s) => !s.startsWith('small button: ""'));
  if (list.length) problems.push(`${tag} ${where}: ${list.join(' / ')}`);
}
/** 手番の人のキャラが立っているマスを押して、マスの説明を読む */
async function tapHereInfo(page) {
  const hero = page.locator('[data-hero][data-active]').first();
  await hero.evaluate((el) => {
    const map = document.querySelector('[data-world-map]');
    const panel = document.querySelector('[data-world-panel]');
    const m = map.getBoundingClientRect();
    const inset = panel ? panel.getBoundingClientRect().height : 0;
    const r = el.getBoundingClientRect();
    map.scrollBy({ left: r.left + r.width / 2 - (m.left + m.width / 2), top: r.top + r.height / 2 - (m.top + (m.height - inset) / 2), behavior: 'instant' });
  });
  await page.waitForTimeout(300);
  const box = await hero.boundingBox();
  // 駒の絵は、マスの真ん中から上へ 0.62 の所に立つ（WorldMap.tsx）。マスの真ん中を押す
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForTimeout(300);
  return (await page.locator('[data-tile-info]').count()) ? await page.locator('[data-tile-info]').innerText() : '';
}
/** 災厄を地図に置く（陸の空きマスの、手番のキャラから離れた所） */
const placeScourges = (g, ids) => {
  const w = g.world;
  const at = w.pos[g.heroes[0].id];
  const free = w.tiles.map((t, i) => i).filter((i) => !w.tiles[i].f && w.tiles[i].t !== 'sea' && w.tiles[i].t !== 'deepSea' && Math.abs(i - at) > 40 && !w.wanderers.some((x) => x.tile === i));
  ids.forEach((id, k) => {
    const boss = { greedKing: 'scourgeGreedKing', stormWitch: 'scourgeStormWitch', miasmaNecro: 'scourgeMiasmaNecro' }[id];
    w.wanderers.push({ id: `w${w.nextWandererId++}`, tile: free[k * 7], enemies: [{ defId: boss, level: 8 }], scourge: id });
    w.tiles[free[k * 7]].seen = true;
  });
  w.scourgesMet = ids;
  w.scourgeCount = ids.length;
};

for (const [width, height] of SIZES) {
  const tag = `${width}x${height}`;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // ---- ①② 災厄の札・鍵のダンジョンのマスの説明 ----
  await start(page, 1);
  await edit(page, (g, place) => {
    const w = g.world;
    for (const t of w.tiles) t.seen = true;
    w.story = undefined;
    w.storyQueue = [];
    (0, eval)(place)(g, ['greedKing', 'stormWitch']);
    w.insight = ['silentCatacomb'];
    const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'silentCatacomb');
    w.pos[g.heroes[0].id] = t;
    w.tiles[t].seen = true;
  }, placeScourges.toString());
  if (!(await page.locator('[data-scourge-boon]').count())) problems.push(`${tag}: 災厄の札に加護の行が無い`);
  else {
    const t = await page.locator('[data-scourge-boon]').innerText();
    notes.push(`${tag} ① 札: ${t}`);
    if (!t.includes('用心棒') || !t.includes('凍てつく守り')) problems.push(`${tag}: 札の加護の行が「${t}」`);
  }
  await page.screenshot({ path: `${OUT}/${tag}-1-scourge-strip.png` });
  await check(page, tag, '災厄の札');
  await page.locator('[data-scourge-strip]').click();
  await page.waitForTimeout(300);
  if ((await page.locator('[data-scourge-row-boon]').count()) !== 2) problems.push(`${tag}: 災厄の説明に加護の行が2つ無い`);
  await page.screenshot({ path: `${OUT}/${tag}-1-scourge-dialog.png` });
  await check(page, tag, '災厄の説明');
  await page.getByRole('button', { name: '閉じる' }).first().click();
  await page.waitForTimeout(200);
  const info2 = await tapHereInfo(page);
  notes.push(`${tag} ② 鍵のダンジョン: ${info2}`);
  if (!info2.includes('💀加護') || !info2.includes('👁見破り済み')) problems.push(`${tag}: 鍵のダンジョンの説明に加護・見破りが無い（${info2}）`);
  await page.screenshot({ path: `${OUT}/${tag}-2-key-dungeon-info.png` });
  await check(page, tag, '鍵のダンジョンの説明');

  // ---- ③ ランダムダンジョンのマスの説明 ----
  await edit(page, (g) => {
    const w = g.world;
    const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'randomForest');
    w.pos[g.heroes[0].id] = t;
    w.tiles[t].seen = true;
  });
  const info3 = await tapHereInfo(page);
  notes.push(`${tag} ③ ランダムダンジョン: ${info3}`);
  if (!/主を倒すと: 秘宝を選べる（最大3つから1つ）・👁見破り（.+のボス）・抜け道/.test(info3)) problems.push(`${tag}: ランダムダンジョンの説明に「主を倒すと…」が無い（${info3}）`);
  await page.screenshot({ path: `${OUT}/${tag}-3-random-dungeon-info.png` });
  await check(page, tag, 'ランダムダンジョンの説明');

  // ---- ⑦ 制覇の画面（1人）: 入って、すぐ制覇した形にする ----
  await page.getByText(/迷いの森の洞窟）に入る/).first().click();
  await page.waitForTimeout(500);
  await edit(page, (g) => {
    const x = g.expeditions[0];
    for (const r of x.dungeon.rooms) r.cleared = true;
    x.mode = 'cleared';
    g.world.insight = ['emeraldTemple'];
    x.dungeon.insightGained = 'emeraldTemple';
  });
  const shortcut = page.locator('[data-shortcut]');
  if (!(await shortcut.count())) problems.push(`${tag}: 制覇の画面に「抜け道を通る」が無い`);
  if (!(await page.locator('[data-insight-note]').count())) problems.push(`${tag}: 制覇の画面に見破りの知らせが無い`);
  if (!(await page.getByRole('button', { name: /入口へ戻る/ }).count())) problems.push(`${tag}: 制覇の画面に「入口へ戻る」が無い`);
  await page.screenshot({ path: `${OUT}/${tag}-7-cleared.png` });
  await check(page, tag, '制覇の画面');
  if (await shortcut.count()) {
    const before = await game(page);
    const entrance = before.expeditions[0].entranceTile;
    await shortcut.click();
    await page.waitForTimeout(800);
    const after = await game(page);
    const pos = after.world.pos[after.heroes[0].id];
    if (after.expeditions?.length) problems.push(`${tag}: 抜け道の後もダンジョンの中`);
    else if (pos === entrance) problems.push(`${tag}: 抜け道を押したのに入口にいる`);
    else notes.push(`${tag} ⑦ 抜け道: 入口 ${entrance} → ${pos}`);
    await page.screenshot({ path: `${OUT}/${tag}-7-after-shortcut.png` });
  }

  // ---- ⑧ 町の無料券 ----
  await edit(page, (g) => {
    const w = g.world;
    w.freeShop = 1;
    w.story = undefined;
    const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'town');
    w.pos[g.heroes[0].id] = t;
    w.turn = g.heroes[0].id;
    g.heroes[0].gold = 0;
  });
  const enter = page.getByText(/に入る$/).first();
  if (await enter.count()) {
    await enter.click();
    await page.waitForTimeout(500);
    const shopTab = page.getByRole('button', { name: /店/ }).first();
    if (await shopTab.count()) await shopTab.click();
    await page.waitForTimeout(300);
    const free = page.locator('[data-free-shop]');
    if (!(await free.count())) problems.push(`${tag}: 町の店に無料券の行が無い`);
    else {
      await free.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${OUT}/${tag}-8-free-shop.png` });
      await check(page, tag, '無料券');
      const btn = page.getByRole('button', { name: '無料券', exact: true }).first();
      if (!(await btn.count())) problems.push(`${tag}: 無料券のボタンが無い`);
      else {
        await btn.click();
        await page.waitForTimeout(400);
        const g8 = await game(page);
        if ((g8.world.freeShop ?? 0) !== 0) problems.push(`${tag}: 無料券で買えなかった`);
        else notes.push(`${tag} ⑧ 無料券: お金0で買えた（持ち物 ${g8.heroes[0].stash.length + g8.heroes[0].pouch.length}）`);
      }
    }
  } else problems.push(`${tag}: 町に入れなかった`);

  // ---- ④⑤ ボスの戦闘（加護と見破り）・最後の中ボス ----
  await startBattle(page, 1, ['treantKing']);
  const bossSave = async (fn) => {
    const d = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
    fn(d.game);
    await page.evaluate(({ d, k }) => localStorage.setItem(k, JSON.stringify(d)), { d, k: KEY });
    await page.reload();
    await page.getByText('つづきから', { exact: true }).click();
    await page.waitForTimeout(500);
  };
  await bossSave((g) => {
    const b = g.expeditions[0].battle;
    b.boss = true;
    b.boon = { ids: ['greedKing', 'stormWitch'], uid: 'e0', ward: true };
    b.insight = 'e0';
    g.world.wanderers.push({ id: 'wx1', tile: 0, enemies: [], scourge: 'greedKing' }, { id: 'wx2', tile: 1, enemies: [], scourge: 'stormWitch' });
  });
  const mark = await page.locator('[data-boon-mark]').count();
  const eye = await page.locator('[data-insight-mark]').count();
  if (!mark || !eye) problems.push(`${tag}: ボスの名前の横に 💀・👁 の印が無い（${mark}・${eye}）`);
  await page.screenshot({ path: `${OUT}/${tag}-4-boss.png` });
  await check(page, tag, 'ボスの戦闘');
  await page.locator('[data-enemy="e0"] [data-intent]').click({ delay: 600 });
  await page.waitForTimeout(400);
  const rows = await page.locator('[data-boon-row]').allInnerTexts();
  const ins = await page.locator('[data-insight-row]').count();
  notes.push(`${tag} ④ 長押し: ${rows.join(' / ')}`);
  if (rows.length !== 2 || !ins) problems.push(`${tag}: ボスの長押しに加護（${rows.length}）・見破り（${ins}）が無い`);
  await page.screenshot({ path: `${OUT}/${tag}-4-boss-detail.png` });
  await check(page, tag, 'ボスの長押し');
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 5);
  await page.waitForTimeout(300);

  await startBattle(page, 1, ['gatekeeper', 'darkKnight']);
  await bossSave((g) => {
    const b = g.expeditions[0].battle;
    b.midboss = true;
    for (const e of b.enemies) e.phaseSet = 'midboss';
  });
  await page.locator('[data-enemy="e1"] [data-intent]').click({ delay: 600 });
  await page.waitForTimeout(400);
  const ahead = (await page.locator('[data-phase-ahead]').allInnerTexts()).join(' / ');
  notes.push(`${tag} ⑤ 中ボスの長押し: ${ahead}`);
  if (!ahead.includes('相方が倒れる')) problems.push(`${tag}: 中ボスの長押しに「相方が倒れる」が無い（${ahead}）`);
  await page.screenshot({ path: `${OUT}/${tag}-5-midboss-detail.png` });
  await check(page, tag, '中ボスの長押し');

  // ---- ⑥ 黄金箱の秘宝の3択（2人・1台） ----
  await start(page, 2);
  await edit(page, (g) => {
    const w = g.world;
    w.story = undefined;
    w.storyQueue = [];
    const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'randomForest');
    for (const h of g.heroes) w.pos[h.id] = t;
  });
  await page.getByText(/迷いの森の洞窟）に入る/).first().click();
  await page.waitForTimeout(500);
  // 2人目も同じ組に入る（合流）
  const join = page.getByText(/たちに合流する/);
  if (await join.count()) {
    await join.first().click();
    await page.waitForTimeout(500);
  }
  await edit(page, (g) => {
    const x = g.expeditions[0];
    const boss = x.dungeon.rooms.find((r) => r.row === 4);
    for (const r of x.dungeon.rooms) r.cleared = r.row < 4;
    x.dungeon.currentRoomId = boss.id;
    x.mode = 'chest';
    x.chest = { roomId: boss.id, spec: { rarity: 'legend', locked: false, big: true }, unlocked: true, opener: x.heroes[0] };
    g.rngState = 4242;
  });
  const g6 = await game(page);
  notes.push(`${tag} ⑥ 組の人数: ${g6.expeditions[0].heroes.length}`);
  await page.getByText('運のスロットで開ける').click();
  for (let k = 0; k < 25 && !(await page.locator('[data-relic-picker]').count()); k++) {
    await page.mouse.click(width / 2, 80);
    await page.waitForTimeout(300);
  }
  if (!(await page.locator('[data-relic-option]').count())) problems.push(`${tag}: 2人の黄金箱で秘宝の3択が出ない`);
  else {
    if ((await page.locator('[data-relic-option]').count()) !== 3) problems.push(`${tag}: 秘宝の候補が3つでない`);
    await page.screenshot({ path: `${OUT}/${tag}-6-relic-pick.png` });
    await check(page, tag, '秘宝の3択（2人）');
    await page.locator('[data-relic-option]').nth(1).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${tag}-6-relic-detail.png` });
    await check(page, tag, '秘宝の説明の窓');
    await page.locator('[data-item-pick-action]').click();
    await page.waitForTimeout(500);
    const c = (await game(page)).expeditions[0].chest;
    if (c.relicPicked !== 1) problems.push(`${tag}: 2人（1台）で秘宝が決まらない（relicPicked=${c.relicPicked}）`);
    // 1台の2人（同じ端末の2人）は取り合いにならず、使えるキャラに入る。2台の取り合いは scripts/detour-coop.mjs
    if (!(await page.locator('[data-claim-area]').count()) && !(await page.getByRole('button', { name: /ダンジョン制覇！/ }).count())) problems.push(`${tag}: 秘宝を選んだ後、先へ進めない`);
    await page.screenshot({ path: `${OUT}/${tag}-6-after-pick.png` });
  }
  if (errors.length) problems.push(`${tag}: ページのエラー ${errors.join(' / ')}`);
  await page.close();
}
await browser.close();
console.log(notes.join('\n'));
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else console.log(`detour-value: OK（${SIZES.length}つの大きさ。写真は ${OUT}）`);
