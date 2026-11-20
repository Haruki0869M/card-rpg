// 段階7c（災厄の5種類目「業火の魔人」）の画面確認。scourge-7b.mjs と同じ作りで、幅 360×640 と 390×844 で、2人（1台）の冒険を使って:
// ① 出た瞬間の知らせ: 侵食度が15%を越えたワールドターンの終わりに「💀 業火の魔人が現れた！」の窓（本物の出現の流れ。ほかの4種類は出た事にする）
// ② 上の札「💀魔人：戦闘で火傷1」と、押した時の説明の窓（悪さ・倒すと・紅蓮魔人の炉心核）
// ③ 遭遇: 「💀 業火の魔人！」と、悪さ・倒すと・逃げても残る、の説明
// ④ 戦闘: 本体（溶岩ゴーレムの絵）＋取り巻き2体。味方全員に火傷1が付いている
// ⑤ 戦闘: 大技「業火の炸裂」の予告（予告の文）
// を写真に撮り、はみ出し・12px未満の文字・小さすぎるボタンを調べる。
// 使い方: npx vite build && npx vite preview を起こしてから node scripts/scourge-7c.mjs（URL で変更可）
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

const OUT = process.env.SC7C_OUTPUT ?? 'screenshots/scourge-7c';
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

  // ---- ① 出た瞬間の知らせ（本物の流れ。ほかの4種類は出た事にして、業火の魔人が選ばれるようにする） ----
  await start(page, 2);
  await edit(page, (g) => {
    const w = g.world;
    w.story = undefined;
    w.corruption = 15.5;
    w.scourgesMet = ['greedKing', 'miasmaNecro', 'nightmareBeast', 'stormWitch'];
    w.acted = g.heroes.filter((h) => h.id !== w.turn).map((h) => h.id);
  });
  await handoff(page);
  await page.getByRole('button', { name: '待機' }).click();
  await page.waitForTimeout(1200);
  const body = await page.locator('body').innerText();
  if (!/💀 業火の魔人が、.+に現れた！/.test(body)) problems.push(`${tag}: 業火の魔人が現れた知らせが出ない`);
  if (!body.includes('戦闘の開始時、味方全員に「火傷」1が付く')) problems.push(`${tag}: 知らせに悪さの文が無い`);
  await page.screenshot({ path: `${OUT}/${tag}-1-announce.png` });
  await check(page, tag, '知らせ');
  const g1 = await game(page);
  const wd1 = g1.world.wanderers.find((x) => x.scourge === 'infernoDemon');
  if (!wd1) {
    problems.push(`${tag}: 業火の魔人が地図に置かれていない（scourgeCount=${g1.world.scourgeCount}）`);
    await page.close();
    continue;
  }
  await page.getByRole('button', { name: 'つづける' }).click();
  await page.waitForTimeout(400);
  await handoff(page);

  // ---- ② 上の札と説明の窓 ----
  await edit(page, (g) => {
    const w = g.world;
    const wd = w.wanderers.find((x) => x.scourge === 'infernoDemon');
    w.tiles[wd.tile].seen = true;
    w.story = undefined;
  });
  await handoff(page);
  const strip = page.locator('[data-scourge-strip]');
  if (!(await strip.count())) problems.push(`${tag}: 上の災厄の札が出ない`);
  else if (!(await strip.innerText()).includes('魔人：戦闘で火傷1')) problems.push(`${tag}: 札の文が「${await strip.innerText()}」`);
  await page.screenshot({ path: `${OUT}/${tag}-2-world.png` });
  await check(page, tag, '世界マップ');
  await strip.click();
  await page.waitForTimeout(400);
  const dlg = page.locator('[data-scourge-dialog]');
  if (!(await dlg.count())) problems.push(`${tag}: 札を押しても説明の窓が出ない`);
  else {
    const t = await dlg.innerText();
    for (const w of ['悪さ', '火傷', '倒すと', '紅蓮魔人の炉心核', '場所']) if (!t.includes(w)) problems.push(`${tag}: 説明の窓に「${w}」が無い`);
  }
  await page.screenshot({ path: `${OUT}/${tag}-3-dialog.png` });
  await check(page, tag, '説明の窓');
  await page.getByRole('button', { name: '閉じる' }).click();
  await page.waitForTimeout(300);

  // ---- ③ 遭遇の説明 ----
  await edit(page, (g) => {
    const w = g.world;
    const wd = w.wanderers.find((x) => x.scourge === 'infernoDemon');
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
    for (const w of ['いま世界に', '火傷', '倒すと', '紅蓮魔人の炉心核', '逃げても']) if (!t.includes(w)) problems.push(`${tag}: 遭遇の説明に「${w}」が無い`);
  }
  if (!(await page.getByText('💀 業火の魔人！').count())) problems.push(`${tag}: 遭遇の題が「💀 業火の魔人！」でない`);
  await page.screenshot({ path: `${OUT}/${tag}-4-encounter.png` });
  await check(page, tag, '遭遇');

  // ---- ④ 戦闘（味方全員に火傷1） ----
  await page.getByRole('button', { name: /戦う/ }).click();
  await page.waitForTimeout(1500);
  const gb = await game(page);
  if (gb.mode !== 'battle' || !gb.battle?.midboss || gb.battle.enemies[0].defId !== 'scourgeInfernoDemon') problems.push(`${tag}: 業火の魔人の戦闘が中ボスの戦闘として始まらない（mode=${gb.mode}）`);
  else {
    if (gb.battle.enemies.length !== 3) problems.push(`${tag}: 敵の数が ${gb.battle.enemies.length}（本体＋取り巻き2体のはず）`);
    const burns = gb.battle.allies.filter((a) => !a.dead).map((a) => a.statuses.burn ?? 0);
    if (!burns.every((n) => n === 1)) problems.push(`${tag}: 味方の火傷が ${burns.join(',')}（全員1のはず）`);
  }
  await page.screenshot({ path: `${OUT}/${tag}-5-battle.png` });
  await check(page, tag, '業火の魔人の戦闘');

  // ---- ⑤ 大技「業火の炸裂」の予告 ----
  await edit(page, (g) => {
    const e = g.battle.enemies[0];
    e.intent = { actionId: 'inferno', targetId: g.battle.allies[0].id };
  });
  await handoff(page);
  if (!(await page.locator('[data-intent="e0"][data-intent-big]').count())) problems.push(`${tag}: 本体の予告に「大技」の印が無い`);
  // 予告を長押しすると、行動の名前と予告の文が出る（detail-popup.mjs と同じ長押し）
  const b = await page.locator('[data-intent="e0"]').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const bodyB = await page.locator('body').innerText();
  if (!bodyB.includes('業火の炸裂')) problems.push(`${tag}: 予告を押しても「業火の炸裂」の説明が出ない`);
  if (!bodyB.includes('起爆')) problems.push(`${tag}: 予告の文（火傷を起爆）が出ない`);
  await page.screenshot({ path: `${OUT}/${tag}-6-inferno.png` });
  await check(page, tag, '業火の炸裂の予告');

  if (errors.length) problems.push(`${tag}: ページのエラー ${errors.join(' / ')}`);
  await page.close();
}
await browser.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else console.log(`scourge-7c: OK（${SIZES.length}つの大きさ。写真は ${OUT}）`);
