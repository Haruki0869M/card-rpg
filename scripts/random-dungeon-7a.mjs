// 段階7a（ランダムダンジョンの強化）の画面確認。幅 360×640 と 390×844 で:
// ① 世界マップ: ランダムダンジョンのマスの説明（テーマ・全5行・黄金箱）と「💎古代の晶洞（…）に入る」のボタン、見取り図のテーマの印（2か所・別のテーマ）
// ② 入口: 名前が「テーマ（洞窟）」・深さが「/5」
// ③ 晶石の祭壇: 2人（1台）で、2人とも「強化か変異」の画面が出て、自分で選べる（だれも止まらない）
// ④ 闇商人: 「闇商人」の画面・先頭に「専用」の装備・高めの値段・買える
// ⑤ 黄金箱: 1人で開けて、専用の装備が出た時に「✨専用」の札が出る
// ⑥ 踏破済み: 制覇したマスには「入る」のボタンが出ない
// を写真に撮り、はみ出し・12px未満の文字・小さすぎるボタンを調べる。
// 使い方: npx vite build && npx vite preview --port 4173 を起こしてから node scripts/random-dungeon-7a.mjs（URL で変更可）
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL, depart } from './lib.mjs';
import { loadGoldenBoxIds } from './gameData.mjs';

/** 専用の装備の id（前は12個を直に書いていて、14個に増えた時に古くなった。今はゲームのデータ goldenBox.ts から読む） */
const GOLDEN_BOX_IDS = await loadGoldenBoxIds();

const OUT = process.env.RD7A_OUTPUT ?? 'screenshots/random-dungeon-7a';
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
  await page.waitForTimeout(400);
}
const game = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)).game, KEY);
async function check(page, tag, where) {
  const list = (await layoutIssues(page)).filter((s) => !s.startsWith('small button: ""'));
  if (list.length) problems.push(`${tag} ${where}: ${list.join(' / ')}`);
}

/** 全員をテーマ theme のランダムダンジョンの入口へ。1つ目の扉の部屋を firstRoom に変える（4行目の部屋をすぐ見るため） */
async function enterThemed(page, tag, theme, firstRoom) {
  await edit(page, (g, theme) => {
    const w = g.world;
    const tiles = w.tiles.map((t, i) => (t.f && t.f.kind === 'dungeon' && t.f.id === 'randomForest' ? i : -1)).filter((i) => i >= 0);
    const t = tiles.find((i) => w.tiles[i].f.theme === theme) ?? tiles[0];
    w.tiles[t].f.theme = theme;
    for (const id of Object.keys(w.pos)) w.pos[id] = t;
    w.story = undefined;
    for (const h of g.heroes) h.gold = 3000;
  }, theme);
  const names = { crystalGrotto: '古代の晶洞', sealedLabyrinth: '封魔の地下迷宮', outlawDen: '無法者の隠れ処' };
  const btn = page.getByText(new RegExp(`${names[theme]}（迷いの森の洞窟）に入る`));
  if (!(await btn.count())) problems.push(`${tag}: 「${names[theme]}（迷いの森の洞窟）に入る」のボタンが無い`);
  await page.screenshot({ path: `${OUT}/${tag}-${theme}-0-world.png` });
  await check(page, tag, `${theme} 世界マップ`);
  await btn.first().click();
  await page.waitForTimeout(500);
  const g = await game(page);
  const d = g.expeditions?.[0]?.dungeon;
  if (!d || d.theme !== theme) return problems.push(`${tag}: ${theme} のダンジョンに入れなかった`);
  const rows = Math.max(...d.rooms.map((r) => r.row)) + 1;
  if (rows !== 5) problems.push(`${tag}: ${theme} の行の数が ${rows}（5のはず）`);
  const body = await page.locator('body').innerText();
  if (!body.includes(names[theme])) problems.push(`${tag}: ダンジョンの画面に「${names[theme]}」の名前が出ない`);
  if (!/深さ\s*\d+\/5/.test(body)) problems.push(`${tag}: 深さが「/5」になっていない`);
  await page.screenshot({ path: `${OUT}/${tag}-${theme}-1-entrance.png` });
  await check(page, tag, `${theme} 入口`);
  if (firstRoom) {
    await edit(page, (g, type) => {
      const dd = g.expeditions[0].dungeon;
      for (const r of dd.rooms.filter((x) => x.row === 0)) { r.type = type; delete r.enemies; }
    }, firstRoom);
    await page.locator('[data-door-choice]').first().click();
    await page.waitForTimeout(900);
  }
}

for (const [width, height] of SIZES) {
  const tag = `${width}x${height}`;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // ---- ① 見取り図: 2か所・別のテーマの印 ----
  await start(page, 2);
  await edit(page, (g) => { g.world.story = undefined; for (const t of g.world.tiles) t.seen = true; });
  await page.locator('[data-overview-open]').click();
  await page.waitForTimeout(400);
  const marks = await page.locator('[data-overview-theme]').evaluateAll((es) => es.map((e) => e.getAttribute('data-overview-theme')));
  if (marks.length !== 2 || new Set(marks).size !== 2) problems.push(`${tag}: 見取り図のテーマの印が「${marks.join('・')}」（別々の2つのはず）`);
  await page.screenshot({ path: `${OUT}/${tag}-overview.png` });
  await page.locator('[data-overview-close]').click();

  // ---- ③ 晶石の祭壇（2人・1台） ----
  await enterThemed(page, tag, 'crystalGrotto', 'crystalAltar');
  for (let k = 0; k < 2; k++) {
    const task = page.locator('[data-hero-task]');
    if (!(await task.count())) { problems.push(`${tag}: 晶石の祭壇の画面が${k + 1}人目に出ない`); break; }
    if (!(await page.locator('[data-altar-modes]').count())) problems.push(`${tag}: 祭壇に「強化／変異」の切り替えが無い`);
    if (k === 0) await page.locator('[data-altar-mode="transmute"]').click();
    await page.screenshot({ path: `${OUT}/${tag}-altar-${k + 1}.png` });
    await check(page, tag, `祭壇 ${k + 1}人目`);
    // カード（aria-label にカードの名前がある）を1枚押す → 下に開く説明の窓のボタンで決める（回2）
    await task.locator('button[aria-label][aria-pressed]').first().click();
    await page.waitForTimeout(250);
    if (k === 0) await page.screenshot({ path: `${OUT}/${tag}-altar-detail.png` });
    await page.locator('[data-card-pick-action]').click();
    await page.waitForTimeout(400);
  }
  const ga = await game(page);
  if (ga.heroes.some((h) => h.cardTask)) problems.push(`${tag}: 祭壇の作業が残っている（${ga.heroes.map((h) => h.cardTask).join(',')}）`);
  if (!ga.log.some((l) => l.text.includes('晶石の祭壇で'))) problems.push(`${tag}: 祭壇の結果の記録が無い`);
  if (!(await page.locator('[data-door-choice]').count())) problems.push(`${tag}: 祭壇の後、次の扉が出ない`);

  // ---- ④ 闇商人（2人・1台） ----
  await start(page, 2);
  await enterThemed(page, tag, 'outlawDen', 'blackMarket');
  const shop = page.locator('[data-black-market]');
  if (!(await shop.count())) problems.push(`${tag}: 闇商人の画面が出ない`);
  if (!(await page.getByText('闇商人', { exact: true }).count())) problems.push(`${tag}: 「闇商人」の題が無い`);
  if (!(await page.locator('[data-hero-task] [data-exclusive-tag]').count())) problems.push(`${tag}: 闇商人の品に「専用」の札が無い`);
  await page.screenshot({ path: `${OUT}/${tag}-black-market.png` });
  await check(page, tag, '闇商人');
  const goldBefore = (await game(page)).heroes[0].gold;
  await page.locator('[data-hero-task] button.btn-gold').first().click();
  await page.waitForTimeout(300);
  const gb = await game(page);
  if (gb.heroes[0].gold >= goldBefore) problems.push(`${tag}: 闇商人で買えなかった`);
  if (!gb.heroes[0].stash.some((i) => GOLDEN_BOX_IDS.includes(i.itemId))) problems.push(`${tag}: 専用の装備が持ち物に入らない`);
  // 2人とも「別れる」で閉じる（だれも止まらない）
  for (let k = 0; k < 2; k++) {
    const close = page.getByText('闇商人と別れる');
    if (!(await close.count())) { problems.push(`${tag}: ${k + 1}人目の「闇商人と別れる」が無い`); break; }
    await close.click();
    await page.waitForTimeout(300);
  }
  if ((await game(page)).heroes.some((h) => h.peddler)) problems.push(`${tag}: 闇商人の画面が閉じない`);

  // ---- ⑤ 黄金箱（1人）・⑥ 踏破済み ----
  await start(page, 1);
  await enterThemed(page, tag, 'sealedLabyrinth');
  let exclusive = false;
  for (let seed = 1; seed <= 12 && !exclusive; seed++) {
    await edit(page, (g, seed) => {
      const x = g.expeditions[0];
      const boss = x.dungeon.rooms.find((r) => r.row === 4);
      for (const r of x.dungeon.rooms) r.cleared = r.row < 4;
      x.dungeon.currentRoomId = boss.id;
      x.mode = 'chest';
      x.chest = { roomId: boss.id, spec: { rarity: 'legend', locked: false, big: true }, unlocked: true };
      g.rngState = seed * 7919;
    }, seed);
    await page.getByText('運のスロットで開ける').click();
    await page.waitForTimeout(2500);
    exclusive = !!(await game(page)).expeditions?.[0]?.chest?.exclusive;
  }
  if (!exclusive) problems.push(`${tag}: 12回開けても専用の装備が出なかった`);
  else {
    for (let k = 0; k < 20 && !(await page.locator('[data-exclusive-tag]').count()); k++) {
      await page.mouse.click(width / 2, height / 2);
      await page.waitForTimeout(300);
    }
    if (!(await page.locator('[data-exclusive-tag]').count())) problems.push(`${tag}: 黄金箱の中身に「✨専用」の札が出ない`);
    await page.screenshot({ path: `${OUT}/${tag}-golden-box.png` });
    await check(page, tag, '黄金箱');
  }
  // 宝箱を出て、制覇 → 地上に戻る
  const leave = page.getByRole('button', { name: /ダンジョン制覇！/ });
  if (await leave.count()) await leave.click();
  else problems.push(`${tag}: 黄金箱の後の「ダンジョン制覇！」のボタンが無い`);
  await page.waitForTimeout(800);
  const back = page.getByRole('button', { name: /地上に戻る/ });
  if (await back.count()) await back.click();
  else problems.push(`${tag}: 「地上に戻る」のボタンが無い`);
  await page.waitForTimeout(800);
  const gw = await game(page);
  const used = gw.world.tiles.filter((t) => t.f && t.f.kind === 'dungeon' && t.f.id === 'randomForest' && t.f.used).length;
  if (used !== 1) problems.push(`${tag}: 制覇した後、踏破済みのマスが ${used} か所（1のはず）。mode=${gw.mode} x=${gw.expeditions?.[0]?.mode}`);
  else {
    if (await page.getByText(/封魔の地下迷宮（迷いの森の洞窟）に入る/).count()) problems.push(`${tag}: 踏破済みなのに「入る」のボタンが出ている`);
    await page.screenshot({ path: `${OUT}/${tag}-cleared-world.png` });
  }
  if (errors.length) problems.push(`${tag}: ページのエラー ${errors.join(' / ')}`);
  await page.close();
}
await browser.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else console.log(`random-dungeon-7a: OK（${SIZES.length}つの大きさ。写真は ${OUT}）`);
