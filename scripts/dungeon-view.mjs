// 第3段階B: ダンジョンの一人称の通路・ミニマップ・大きな地図・歩くボタンの画面確認
// 幅 360/390/480 と低い画面 360×560 で、入口（目の前に扉）→ 扉を開ける → 部屋の中 → 通路へ前進 → 右へ → 扉を向く → 地図を開いて扉まで歩く、
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
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false }));
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
  await page.getByText('探索力の判定').click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /^扉を開ける/ }).click();
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
  await edit((g) => {
    const x = g.expeditions[0];
    x.mode = 'dungeon';
    x.battle = undefined;
    x.battleInfo = undefined;
    x.dungeon.rooms.find((r) => r.id === x.dungeon.currentRoomId).cleared = true;
    x.dungeon.explore = 8;
    for (const h of g.heroes) h.focus = 4;
  });
  await check('部屋の中');
  await shot('2-room');
  await page.getByRole('button', { name: '前進', exact: true }).click();
  const anim = page.locator('[data-dungeon-anim]');
  if (reduced) {
    if (await anim.count()) problems.push(`${tag}: 動作軽減なのに歩く演出が出た`);
  } else {
    if ((await anim.getAttribute('data-dungeon-anim', { timeout: 500 }).catch(() => null)) !== 'forward') problems.push(`${tag}: 前進のズームが出ない`);
    await shot('3a-forward-anim');
    await anim.waitFor({ state: 'detached', timeout: 2000 }).catch(() => problems.push(`${tag}: 前進の演出が終わらない`));
  }
  await page.waitForTimeout(100);
  await expectEnd('wall', '通路（前は壁）');
  await check('通路');
  await shot('3-hall');
  // 第3段階C1: 周囲の警戒（フォーカス2で完全成功）→ 開けられる扉に気配の印
  await page.locator('[data-watch-open]').click();
  await page.locator('[data-watch-panel]').waitFor({ timeout: 2000 }).catch(() => problems.push(`${tag}: 周囲の警戒の窓が開かない`));
  await check('周囲の警戒の窓');
  await shot('3b-watch-panel');
  const plus = page.locator('[data-watch-panel]').getByLabel('フォーカスを増やす');
  for (let i = 0; i < 2; i++) if (await plus.isEnabled()) await plus.click();
  await page.getByRole('button', { name: '警戒する', exact: true }).click();
  await page.waitForTimeout(300);
  if ((await page.locator('[data-dungeon-view] [data-omen]').count()) < 1) problems.push(`${tag}: 警戒の後、通路の扉に気配の印が出ない`);
  if (await page.locator('[data-watch-open]').isEnabled()) problems.push(`${tag}: 同じ通路でもう一度警戒できてしまう`);
  await check('警戒の後');
  await shot('3c-watched');
  await page.getByRole('button', { name: '右へ', exact: true }).click();
  await page.locator('[data-dungeon-anim]').waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(100);
  await shot('4-right');
  await page.getByRole('button', { name: '扉を向く', exact: true }).click();
  if (!reduced && (await page.locator('[data-dungeon-anim]').getAttribute('data-dungeon-anim', { timeout: 500 }).catch(() => null)) !== 'left') problems.push(`${tag}: 扉を向く（左）の回転が出ない`);
  await page.locator('[data-dungeon-anim]').waitFor({ state: 'detached', timeout: 2000 }).catch(() => problems.push(`${tag}: 回転の演出が終わらない`));
  await expectEnd('door', '扉を向いた');
  await check('扉の前');
  await shot('5-door');
  // 地図を開いて、もう1つの扉の前まで歩く
  await page.getByLabel('地図を開く').click();
  await page.locator('[data-map-overlay]').waitFor();
  await check('大きな地図');
  await shot('6-map');
  const doors = page.locator('[data-door="open"]');
  if ((await doors.count()) < 1) problems.push(`${tag}: 地図に開けられる扉が見えない`);
  else {
    await doors.last().click();
    await shot('7-walk-panel');
    const walk = page.getByRole('button', { name: '歩く', exact: true });
    if (await walk.isEnabled()) {
      await walk.click();
      await page.locator('[data-dungeon-anim]').waitFor({ state: 'detached', timeout: 3000 }).catch(() => problems.push(`${tag}: ここまで歩くの演出が終わらない`));
      await page.waitForTimeout(100);
      if (await page.locator('[data-map-overlay]').count()) problems.push(`${tag}: 歩いた後に地図が閉じない`);
      await shot('8-walked');
    }
  }
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
console.log('OK: 通路の絵・ミニマップ・大きな地図・歩くボタン・歩く/向く/扉の演出・周囲の警戒と気配（360/390/480・360×560・動作軽減）');
