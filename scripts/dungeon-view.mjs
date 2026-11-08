// 第3段階B: ダンジョンの一人称の通路・ミニマップ・大きな地図・歩くボタンの画面確認
// 幅 360/390/480 と低い画面 360×560 で、入口（目の前に扉）→ 扉を開ける → 部屋の中 → 通路へ前進 → 右へ → 扉を向く → 地図を開いて扉まで歩く、
// を写真に撮り、はみ出し・12px未満の文字・小さすぎるボタン・通路の絵の高さ（200px以上）を調べる。
// 使い方: npx vite build && npx vite preview --port 4173 を起こしてから node scripts/dungeon-view.mjs（URL で変更可）
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL } from './lib.mjs';

const OUT = process.env.DUNGEON_VIEW_OUTPUT ?? 'screenshots/dungeon-view';
mkdirSync(OUT, { recursive: true });
const SIZES = [
  [360, 640],
  [390, 844],
  [480, 854],
  [360, 560],
];
const browser = await chromium.launch();
const problems = [];

async function run(width, height) {
  const tag = `${width}x${height}`;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (n) => page.screenshot({ path: `${OUT}/${tag}-${n}.png` });
  const check = async (where) => {
    const list = (await layoutIssues(page)).filter((s) => !s.startsWith('small button: ""')); // 地図のマス（文字なし）は除く
    if (list.length) problems.push(`${tag} ${where}: ${list.join(' / ')}`);
    const h = await page.locator('[data-dungeon-view]').evaluate((e) => e.getBoundingClientRect().height).catch(() => 0);
    if (h < 200) problems.push(`${tag} ${where}: 通路の絵の高さが ${Math.round(h)}px（200px未満）`);
  };
  const edit = async (fn) => {
    await page.evaluate((src) => {
      const k = 'card-rpg/adventure';
      const d = JSON.parse(localStorage.getItem(k));
      (0, eval)(src)(d.game);
      localStorage.setItem(k, JSON.stringify(d));
    }, fn.toString());
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
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false }));
  });
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText('2人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await page.getByText('冒険に出発').click();
  await page.waitForTimeout(300);
  await edit((g) => {
    const w = g.world;
    const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
    for (const id of Object.keys(w.pos)) w.pos[id] = t;
    w.story = undefined;
  });
  await page.getByText('翠の神殿に入る').click();
  await page.waitForTimeout(300);
  // 入口: 目の前に扉
  await expectEnd('door', '入口');
  await check('入口');
  await shot('1-entrance');
  await page.getByText('探索力の判定').click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /^扉を開ける/ }).click();
  await page.waitForTimeout(400);
  // 戦闘は確認の対象外: 保存を書き換えて「勝った後」にする
  await edit((g) => {
    const x = g.expeditions[0];
    x.mode = 'dungeon';
    x.battle = undefined;
    x.battleInfo = undefined;
    x.dungeon.rooms.find((r) => r.id === x.dungeon.currentRoomId).cleared = true;
    x.dungeon.explore = 8;
  });
  await check('部屋の中');
  await shot('2-room');
  await page.getByRole('button', { name: '前進', exact: true }).click();
  await page.waitForTimeout(200);
  await expectEnd('wall', '通路（前は壁）');
  await check('通路');
  await shot('3-hall');
  await page.getByRole('button', { name: '右へ', exact: true }).click();
  await page.waitForTimeout(200);
  await shot('4-right');
  await page.getByRole('button', { name: '扉を向く', exact: true }).click();
  await page.waitForTimeout(200);
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
      await page.waitForTimeout(300);
      if (await page.locator('[data-map-overlay]').count()) problems.push(`${tag}: 歩いた後に地図が閉じない`);
      await shot('8-walked');
    }
  }
  if (errors.length) problems.push(`${tag}: 画面の例外 ${errors.join(' / ')}`);
  await page.close();
  console.log(`${tag}: 確認済み`);
}

for (const [w, h] of SIZES) await run(w, h);
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: 通路の絵・ミニマップ・大きな地図・歩くボタン（360/390/480・360×560）');
