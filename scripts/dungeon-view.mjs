// ダンジョンの一人称の通路・ミニマップ・大きな地図・扉のボタン・探索のサイコロの画面確認（扉を選ぶだけの形）
// 幅 360/390/480 と低い画面 360×560 で、入口（扉1つ・サイコロの前は押せない）→ サイコロ → 扉を開ける → 部屋の中（扉2つ）→ 警戒
// → 遠い方の扉（自動で歩く演出）→ 選べる扉0（警戒と手番を終えるだけ残る）→ 地図、
// を写真に撮り、はみ出し・12px未満の文字・小さすぎるボタン・通路の絵の高さ（200px以上）を調べる。
// 使い方: npx vite build && npx vite preview --port 4173 を起こしてから node scripts/dungeon-view.mjs（URL で変更可）
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

const OUT = process.env.DUNGEON_VIEW_OUTPUT ?? 'screenshots/dungeon-view';
// 入るダンジョン（ID:名前）。ほかのダンジョンの通路の絵を見る時に変える（例 lavaCavern:溶岩の大空洞）
const [DUNGEON_ID, DUNGEON_NAME] = (process.env.DUNGEON_VIEW_DUNGEON ?? 'emeraldTemple:翠の神殿').split(':');
// 通路の絵だけを別のダンジョンのものにする（ID）。鍵が要る・部屋の並びが毎回変わるダンジョンでも、同じ道順で見え方を確かめられる
const LOOK = process.env.DUNGEON_VIEW_LOOK;
mkdirSync(OUT, { recursive: true });
const SIZES = [
  [360, 640],
  [390, 844],
  [480, 854],
  [360, 560],
];
const browser = await chromium.launch();
const problems = [];

async function run(width, height, reduced = false) {
  const tag = `${width}x${height}${reduced ? '-reduced' : ''}`;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (n) => page.screenshot({ path: `${OUT}/${tag}-${n}.png` });
  const check = async (where) => {
    const list = (await layoutIssues(page)).filter((s) => !s.startsWith('small button: ""')); // 地図のマス（文字なし）は除く
    if (list.length) problems.push(`${tag} ${where}: ${list.join(' / ')}`);
    const h = await page.locator('[data-dungeon-view]').evaluate((e) => e.getBoundingClientRect().height).catch(() => 0);
    if (h < 200) problems.push(`${tag} ${where}: 通路の絵の高さが ${Math.round(h)}px（200px未満）`);
  };
  const edit = async (fn, arg) => {
    await page.evaluate(({ src, arg }) => {
      const k = 'card-rpg/adventure';
      const d = JSON.parse(localStorage.getItem(k));
      (0, eval)(src)(d.game, arg);
      localStorage.setItem(k, JSON.stringify(d));
    }, { src: fn.toString(), arg });
    await page.reload();
    await page.getByText('つづきから').click();
    await page.waitForTimeout(300);
  };
  const expectEnd = async (face, where) => {
    const end = await page.locator('[data-dungeon-view]').getAttribute('data-end');
    if (end !== face) problems.push(`${tag} ${where}: 正面が「${end}」（期待は「${face}」）`);
  };
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false }));
  });
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText('2人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(300);
  await edit((g, dungeonId) => {
    const w = g.world;
    const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === dungeonId);
    for (const id of Object.keys(w.pos)) w.pos[id] = t;
    w.story = undefined;
  }, DUNGEON_ID);
  await page.getByText(`${DUNGEON_NAME}に入る`).click();
  await page.waitForTimeout(300);
  if (LOOK) {
    await edit((g, look) => {
      (g.expeditions?.[0] ?? g).dungeon.dungeonId = look;
    }, LOOK);
  }
  // 入口: 目の前に扉
  await expectEnd('door', '入口');
  await check('入口');
  await shot('1-entrance');
  // フェーズ2-B: 1台で2人の時、扉の「全員が開けるを選ぶと…」の案内は出さない。サイコロの前は「まずはサイコロ」の案内
  if (await page.locator('[data-vote-hint]').count()) problems.push(`${tag}: 1台で遊んでいるのに扉の全員一致の案内が出た`);
  if (!(await page.locator('[data-move-guide]').filter({ hasText: '『サイコロを振る』' }).isVisible())) problems.push(`${tag}: サイコロの前に「まずはサイコロ」の案内が出ない`);
  // 扉を選ぶだけ: 方向のボタンは無い。扉1つなら「正面の扉を開ける」。サイコロの前は押せない
  if (await page.locator('[data-dir]').count()) problems.push(`${tag}: 方向のボタン（左へ・前進など）が残っている`);
  const doors = page.locator('[data-door-choice]');
  if ((await doors.count()) !== 1) problems.push(`${tag}: 入口の扉のボタンが ${await doors.count()} 個（1つのはず）`);
  else {
    if (!(await doors.first().innerText()).includes('正面の扉を開ける')) problems.push(`${tag}: 扉1つなのに「正面の扉を開ける」ではない`);
    if (await doors.first().isEnabled()) problems.push(`${tag}: サイコロの前なのに扉を押せる`);
  }
  await shot('1-one-door-before-roll');
  // 探索のサイコロ: 真ん中で転がる（動作軽減では転がさず結果だけ）
  await page.locator('[data-explore-roll-button]').click();
  const overlay = page.locator('[data-dice-overlay]');
  if (!reduced) {
    if ((await overlay.getAttribute('data-dice-overlay', { timeout: 800 }).catch(() => null)) !== 'rolling') problems.push(`${tag}: サイコロが転がらない`);
    await page.waitForTimeout(450);
    await shot('1b-dice-rolling');
  }
  await page.locator('[data-dice-overlay="done"]').waitFor({ timeout: 3000 }).catch(() => problems.push(`${tag}: サイコロの目が出ない`));
  await page.waitForTimeout(250);
  await check('サイコロの目');
  await shot('1c-dice-result');
  await overlay.waitFor({ state: 'detached', timeout: 4000 }).catch(() => problems.push(`${tag}: サイコロの表示が消えない`));
  if (await page.locator('[data-move-guide]').count()) problems.push(`${tag}: サイコロの後も「まずはサイコロ」の案内が残る`);
  if (!(await doors.first().isEnabled())) problems.push(`${tag}: サイコロの後も扉を押せない`);
  await doors.first().click();
  // 段階B2: 扉が開く演出 → 戦闘の画面（動作軽減では演出なし）
  const doorScene = page.locator('[data-door-open]');
  if (reduced) {
    if (await doorScene.count()) problems.push(`${tag}: 動作軽減なのに扉の演出が出た`);
  } else {
    await doorScene.waitFor({ timeout: 1000 }).catch(() => problems.push(`${tag}: 扉が開く演出が出ない`));
    await page.waitForTimeout(150);
    await shot('2a-door-opening');
    await doorScene.waitFor({ state: 'detached', timeout: 3000 }).catch(() => problems.push(`${tag}: 扉の演出が終わらない`));
  }
  await page.getByText('ターン終了').waitFor({ timeout: 5000 }).catch(() => problems.push(`${tag}: 扉の後に戦闘の画面にならない`));
  await page.waitForTimeout(400); // 保存が書かれるのを待つ（次で保存を書き換えるため）
  // 戦闘は確認の対象外: 保存を書き換えて「勝った後」にする
  const afterBattle = (left) => edit((g, left) => {
    const x = g.expeditions[0];
    x.mode = 'dungeon';
    x.battle = undefined;
    x.battleInfo = undefined;
    x.event = undefined;
    x.chest = undefined;
    x.dungeon.rooms.find((r) => r.id === x.dungeon.currentRoomId).cleared = true;
    x.dungeon.explore = left;
    for (const h of g.heroes) h.focus = 4;
  }, left);
  await afterBattle(2);
  await check('部屋の中');
  const n2 = await doors.count();
  if (n2 === 2) {
    const [l, r] = [await doors.nth(0).innerText(), await doors.nth(1).innerText()];
    if (!l.includes('左の扉を開ける') || !r.includes('右の扉を開ける')) problems.push(`${tag}: 扉2つの名前が左・右でない（${l} / ${r}）`);
  } else if (n2 < 1) problems.push(`${tag}: 部屋の中で扉のボタンが出ない`);
  if (n2 >= 2 && !(await page.locator('[data-door-choice-note]').count())) problems.push(`${tag}: 扉が2つ以上なのに「ほかの扉は閉ざされる」の案内が無い`);
  await shot('2-two-doors');
  // 第3段階C1: 周囲の警戒（フォーカス2で完全成功・扉の数は使わない）→ 開けられる扉に気配の印
  await page.locator('[data-watch-open]').click();
  await page.locator('[data-watch-panel]').waitFor({ timeout: 2000 }).catch(() => problems.push(`${tag}: 周囲の警戒の窓が開かない`));
  await check('周囲の警戒の窓');
  const plus = page.locator('[data-watch-panel]').getByLabel('フォーカスを増やす');
  for (let i = 0; i < 2; i++) if (await plus.isEnabled()) await plus.click();
  await page.getByRole('button', { name: '警戒する', exact: true }).click();
  await page.waitForTimeout(300);
  if ((await page.locator('[data-door-choice]').count()) && (await page.locator('[data-explore-left]').getAttribute('data-explore-left')) !== '2') problems.push(`${tag}: 警戒で選べる扉の数が減った`);
  if (await page.locator('[data-watch-open]').isEnabled()) problems.push(`${tag}: 同じ通路でもう一度警戒できてしまう`);
  await check('警戒の後');
  await shot('3-watched');
  // 遠い方（右）の扉: 扉の前まで自動で歩く演出 → 扉が開く。使うのは1だけ
  await doors.last().click();
  if (!reduced) {
    const walk = page.locator('[data-door-open="walk"]');
    if (await walk.waitFor({ timeout: 1000 }).then(() => true).catch(() => false)) {
      await page.waitForTimeout(200);
      await shot('3a-walking-to-door');
      if (!(await page.locator('[data-door-open="walk"] [data-dungeon-anim]').count())) problems.push(`${tag}: 扉まで歩く演出が動いていない`);
    }
    await page.locator('[data-door-open]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => problems.push(`${tag}: 扉まで歩く・開く演出が終わらない`));
  }
  await page.waitForTimeout(500);
  const left = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('card-rpg/adventure'));
    return d.game.expeditions?.[0]?.dungeon?.explore;
  });
  if (left !== 1) problems.push(`${tag}: 遠い扉を選んだ後の残りが ${left}（1のはず。扉1つで1）`);
  // 選べる扉0: 扉のボタンは押せない。警戒と「手番を終える」は残る
  await afterBattle(0);
  if ((await doors.count()) < 1) problems.push(`${tag}: 選べる扉0の時に扉のボタン自体が消えた（押せない形で出すはず）`);
  for (let i = 0; i < (await doors.count()); i++) if (await doors.nth(i).isEnabled()) problems.push(`${tag}: 選べる扉0なのに扉を押せる`);
  if (!(await page.locator('[data-watch-open]').isEnabled())) problems.push(`${tag}: 選べる扉0で警戒できない`);
  if (!(await page.locator('[data-explore-end]').isVisible())) problems.push(`${tag}: 選べる扉0で「手番を終える」が無い`);
  for (const label of ['装備', '道具', '撤退']) if (!(await page.getByRole('button', { name: label, exact: true }).count())) problems.push(`${tag}: 下の「${label}」が無い`);
  await check('選べる扉0');
  await shot('4-zero-left');
  // 地図（見るだけ）
  await page.getByLabel('地図を開く').click();
  await page.locator('[data-map-overlay]').waitFor();
  if (await page.locator('[data-vote-hint]').count()) problems.push(`${tag}: 地図を開いているのに扉の案内が重なる`);
  await check('大きな地図');
  await shot('5-map');
  await page.getByLabel('地図を閉じる').click();
  if (errors.length) problems.push(`${tag}: 画面の例外 ${errors.join(' / ')}`);
  await page.close();
  console.log(`${tag}: 確認済み`);
}

for (const [w, h] of SIZES) await run(w, h);
await run(390, 844, true);
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: 通路の絵・ミニマップ・大きな地図・扉のボタン・探索のサイコロ・扉まで歩く/扉の演出・選べる扉0・周囲の警戒と気配（360/390/480・360×560・動作軽減）');
