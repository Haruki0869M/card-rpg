// 段階7b（災厄の中ボス）の画面確認。幅 360×640 と 390×844 で、2人（1台）の冒険を使って:
// ① 出た瞬間の知らせ: 侵食度が15%を越えたワールドターンの終わりに「💀 〇〇が現れた！」の窓（本物の出現の流れ）
// ② 上の札: 1体なら「💀盗賊王：店+25%」、2体なら 360px は「💀×2：…」にまとまる。押すと説明の窓（悪さ・倒すと・場所）
// ③ 地図の💀の印・見取り図の💀の印・野営のボタンの「💀回復半分」（魔獣がいる時）
// ④ 町の店: 「💀盗賊王のせいで、値段が+25%」と、値段が上がっている事
// ⑤ 遭遇: 「💀 強欲の盗賊王！」と、悪さ・倒すと・逃げても残る、の説明。「戦う」で中ボスの戦闘が始まる
// ⑥ 秘薬: 道具の袋から使うと、能力値を選ぶ画面が出て、選ぶと+5
// を写真に撮り、はみ出し・12px未満の文字・小さすぎるボタンを調べる。
// 使い方: npx vite build && npx vite preview を起こしてから node scripts/scourge-7b.mjs（URL で変更可）
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

const OUT = process.env.SC7B_OUTPUT ?? 'screenshots/scourge-7b';
const KEY = 'card-rpg/adventure';
mkdirSync(OUT, { recursive: true });
const SIZES = [
  [360, 640],
  [390, 844],
];
const browser = await chromium.launch();
const problems = [];

async function start(page, players) {
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false }));
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
/** 1台で回す時の「〇〇の番です」の窓を閉じる */
async function handoff(page) {
  for (let k = 0; k < 3; k++) {
    const h = page.locator('[data-handoff]');
    if (!(await h.count())) return;
    await h.first().click();
    await page.waitForTimeout(300);
  }
}

for (const [width, height] of SIZES) {
  const tag = `${width}x${height}`;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // ---- ① 出た瞬間の知らせ（本物の流れ: ワールドターンの終わり） ----
  await start(page, 2);
  await edit(page, (g) => {
    const w = g.world;
    w.story = undefined;
    w.corruption = 15.5;
    // 2人目はもう動いたことにして、1人目の「待機」でワールドターンを終える
    w.acted = g.heroes.filter((h) => h.id !== w.turn).map((h) => h.id);
  });
  await handoff(page);
  await page.getByRole('button', { name: '待機' }).click();
  await page.waitForTimeout(1200);
  const body = await page.locator('body').innerText();
  if (!/💀 .+が現れた！/.test(body)) problems.push(`${tag}: 災厄が現れた知らせが出ない`);
  await page.screenshot({ path: `${OUT}/${tag}-1-announce.png` });
  await check(page, tag, '知らせ');
  const g1 = await game(page);
  const first = g1.world.wanderers.find((x) => x.scourge);
  if (!first) {
    problems.push(`${tag}: 災厄が地図に置かれていない（scourgeCount=${g1.world.scourgeCount}）`);
    await page.close();
    continue;
  }
  await page.getByRole('button', { name: 'つづける' }).click();
  await page.waitForTimeout(400);
  await handoff(page);

  // ---- ② 1体の札（盗賊王にそろえる）・説明の窓・④ 町の店 ----
  await edit(page, (g) => {
    const w = g.world;
    const wd = w.wanderers.find((x) => x.scourge);
    wd.scourge = 'greedKing';
    wd.enemies[0].defId = 'scourgeGreedKing';
    wd.enemies.slice(1).forEach((e, i) => (e.defId = ['banditThug', 'banditArcher', 'banditThug'][i]));
    w.scourgesMet = ['greedKing'];
    w.tiles[wd.tile].seen = true;
    w.story = undefined;
  });
  await handoff(page);
  const strip = page.locator('[data-scourge-strip]');
  if (!(await strip.count())) problems.push(`${tag}: 上の災厄の札が出ない`);
  else if (!(await strip.innerText()).includes('盗賊王：店+25%')) problems.push(`${tag}: 札の文が「${await strip.innerText()}」`);
  if (!(await page.locator('[data-scourge-mark]').count())) problems.push(`${tag}: 地図に災厄の💀の印が無い`);
  await page.screenshot({ path: `${OUT}/${tag}-2-world-one.png` });
  await check(page, tag, '世界マップ（1体）');
  await strip.click();
  await page.waitForTimeout(400);
  const dlg = page.locator('[data-scourge-dialog]');
  if (!(await dlg.count())) problems.push(`${tag}: 札を押しても説明の窓が出ない`);
  else {
    const t = await dlg.innerText();
    for (const w of ['悪さ', '倒すと', '強欲王の黄金冠', '場所']) if (!t.includes(w)) problems.push(`${tag}: 説明の窓に「${w}」が無い`);
  }
  await page.screenshot({ path: `${OUT}/${tag}-3-dialog.png` });
  await check(page, tag, '説明の窓');
  await page.getByRole('button', { name: '閉じる' }).click();
  await page.waitForTimeout(300);
  // 町（はじまりの王都。最初から全員そこにいる）
  const enter = page.getByRole('button', { name: /に入る/ });
  if (await enter.count()) {
    await enter.first().click();
    await page.waitForTimeout(600);
    const note = page.locator('[data-shop-scourge]');
    if (!(await note.count())) problems.push(`${tag}: 町の店に「盗賊王のせいで」の文が無い`);
    else if (!(await note.innerText()).includes('+25%')) problems.push(`${tag}: 店の文が「${await note.innerText()}」`);
    await page.screenshot({ path: `${OUT}/${tag}-4-shop.png` });
    await check(page, tag, '町の店');
    const gs = await game(page);
    const shop = Object.values(gs.world.shops)[0];
    const row = shop?.items.find((x) => !x.sold);
    if (row) {
      const shown = await page.locator(`[data-shop-row="${row.item.uid}"] button.btn-gold`).last().innerText();
      const want = Math.round((row.price * 125) / 100);
      if (!shown.includes(String(want))) problems.push(`${tag}: 店の値段が ${shown}（${row.price}の+25% = ${want} のはず）`);
    }
  } else problems.push(`${tag}: 町に入るボタンが無い`);

  // ---- ② 2体の札（魔獣を足す）・③ 見取り図・野営の文 ----
  await edit(page, (g) => {
    const w = g.world;
    g.mode = 'world';
    delete g.town;
    const wd = w.wanderers.find((x) => x.scourge);
    const col = wd.tile % w.width;
    const cand = w.tiles.findIndex((t, i) => i !== wd.tile && !t.f && t.t === w.tiles[wd.tile].t && Math.abs((i % w.width) - col) <= 2 && Math.abs(Math.floor(i / w.width) - Math.floor(wd.tile / w.width)) <= 3 && !w.wanderers.some((x) => x.tile === i) && !Object.values(w.pos).includes(i));
    w.wanderers.push({ id: `w${w.nextWandererId++}`, tile: cand, enemies: [{ defId: 'scourgeNightmareBeast', level: 7 }, { defId: 'forestWolf', level: 7 }, { defId: 'nightmareMote', level: 7 }], scourge: 'nightmareBeast' });
    w.scourgesMet = ['greedKing', 'nightmareBeast'];
    w.scourgeCount = 2;
    w.tiles[cand].seen = true;
    // 盗賊王の巣の隣（同じ地形の空きマス）へ: 地図の💀の駒が画面に入るように。町の外なので野営もできる
    const sw = w.width;
    const walk = (i) => i >= 0 && i < w.tiles.length && !w.tiles[i].f && !['water', 'crag', 'mountain', 'lava', 'sea'].includes(w.tiles[i].t) && !w.wanderers.some((x) => x.tile === i) && i !== cand;
    const nb = [wd.tile - 1, wd.tile + 1, wd.tile - sw, wd.tile + sw, wd.tile - sw - 1, wd.tile + sw - 1, wd.tile - sw + 1, wd.tile + sw + 1].find(walk) ?? wd.tile - 2;
    w.tiles[nb].seen = true;
    for (const id of Object.keys(w.pos)) w.pos[id] = nb;
    w.move = null;
    w.story = undefined;
  });
  await handoff(page);
  if (!(await page.locator('[data-scourge-strip]').count())) await page.screenshot({ path: `${OUT}/${tag}-debug-two.png` });
  const strip2 = await page.locator('[data-scourge-strip]').innerText();
  if (width < 400 && !strip2.includes('💀×2')) problems.push(`${tag}: 2体の時に札が「💀×2」にまとまっていない（${strip2}）`);
  if (!(await page.locator('[data-camp-scourge]').count())) problems.push(`${tag}: 野営のボタンに「💀回復半分」が無い`);
  if (!(await page.locator('[data-scourge-mark]').count())) problems.push(`${tag}: 隣にいるのに、地図に災厄の💀の駒が見えない`);
  await page.screenshot({ path: `${OUT}/${tag}-5-world-two.png` });
  await check(page, tag, '世界マップ（2体）');
  await page.locator('[data-overview-open]').click();
  await page.waitForTimeout(500);
  const marks = await page.locator('[data-overview-mark="scourge"]').count();
  if (marks !== 2) problems.push(`${tag}: 見取り図の💀の印が ${marks} 個（2のはず）`);
  await page.screenshot({ path: `${OUT}/${tag}-6-overview.png` });
  await page.locator('[data-overview-close]').click();
  await page.waitForTimeout(300);

  // ---- ⑤ 遭遇の説明と戦闘 ----
  await edit(page, (g) => {
    const w = g.world;
    const wd = w.wanderers.find((x) => x.scourge === 'greedKing');
    const h = g.heroes.find((x) => x.id === w.turn) ?? g.heroes[0];
    w.pos[h.id] = wd.tile;
    w.prevTile = wd.tile;
    g.mode = 'encounter';
    g.encounter = { wandererId: wd.id, tile: wd.tile, heroId: h.id, candidates: [h.id] };
  });
  const enc = page.locator('[data-encounter-scourge]');
  if (!(await enc.count())) problems.push(`${tag}: 遭遇の画面に災厄の説明が無い`);
  else {
    const t = await enc.innerText();
    for (const w of ['いま世界に', '倒すと', '逃げても']) if (!t.includes(w)) problems.push(`${tag}: 遭遇の説明に「${w}」が無い`);
  }
  if (!(await page.getByText('💀 強欲の盗賊王！').count())) problems.push(`${tag}: 遭遇の題が「💀 強欲の盗賊王！」でない`);
  await page.screenshot({ path: `${OUT}/${tag}-7-encounter.png` });
  await check(page, tag, '遭遇');
  await page.getByRole('button', { name: /戦う/ }).click();
  await page.waitForTimeout(1500);
  const gb = await game(page);
  if (gb.mode !== 'battle' || !gb.battle?.midboss || gb.battle.enemies[0].defId !== 'scourgeGreedKing') problems.push(`${tag}: 災厄の戦闘が中ボスの戦闘として始まらない（mode=${gb.mode}）`);
  await page.screenshot({ path: `${OUT}/${tag}-8-battle.png` });
  await check(page, tag, '災厄の戦闘');

  // ---- ⑥ 秘薬 ----
  await edit(page, (g) => {
    const w = g.world;
    g.mode = 'world';
    delete g.battle;
    delete g.battleInfo;
    delete g.party;
    w.wanderers = w.wanderers.filter((x) => x.scourge !== 'greedKing');
    const start = w.tiles.findIndex((t) => t.f && t.f.kind === 'town');
    for (const id of Object.keys(w.pos)) w.pos[id] = start;
    g.heroes[0].pouch.push({ uid: 'elixirTest', itemId: 'scourgeElixir' });
    w.story = undefined;
  });
  await handoff(page);
  const agi0 = (await game(page)).heroes[0].bonusStats.agi ?? 0;
  await page.getByRole('button', { name: 'メニュー' }).click();
  await page.waitForTimeout(300);
  await page.getByText('道具の袋').click();
  await page.waitForTimeout(300);
  await page.getByText('災厄討ちの秘薬').first().click();
  await page.waitForTimeout(300);
  const hero0 = (await game(page)).heroes[0];
  await page.locator('button', { hasText: hero0.name }).last().click();
  await page.waitForTimeout(300);
  if (!(await page.locator('[data-elixir-stats]').count())) problems.push(`${tag}: 秘薬で能力値を選ぶ画面が出ない`);
  await page.screenshot({ path: `${OUT}/${tag}-9-elixir.png` });
  await check(page, tag, '秘薬');
  await page.locator('[data-elixir-stat="agi"]').click();
  await page.waitForTimeout(400);
  const agi1 = (await game(page)).heroes[0].bonusStats.agi ?? 0;
  if (agi1 !== agi0 + 5) problems.push(`${tag}: 秘薬の後の素早さの上乗せが ${agi0} → ${agi1}（+5のはず）`);

  if (errors.length) problems.push(`${tag}: ページのエラー ${errors.join(' / ')}`);
  await page.close();
}
await browser.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else console.log(`scourge-7b: OK（${SIZES.length}つの大きさ。写真は ${OUT}）`);
