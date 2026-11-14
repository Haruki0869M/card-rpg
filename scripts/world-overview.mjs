// 段階6a（overhaul-plan-v2 §2-4）の確認: シナリオ1の広い地図（15列×42行）を、スマホの縦画面（360×640・390×844）と 480 で見る。
// 1) 1倍は前と同じマスの大きさ（横に約8.5列）。地図は横にもスクロールできる。街道の上では「街道ボーナス +1」が振るボタンに出る
// 2) −を押し続けると、横の15列が全部枠に収まる倍率で止まる（横にはみ出さない）。0.75倍より小さい時は、小さい文字（移動力の数字・敵のLv）を出さない
// 3) 見取り図（🗺）: 画面に収まる。町・次の目的地（光る輪）・自分たちの印がある。印を押すと閉じて、その場所が見える所へ地図が動く
// 4) 表示の問題（layoutIssues）が無い。画面の写真は scripts/screenshots/world-overview-<幅>-<番号>.png
// 使い方: URL=http://127.0.0.1:4188/card-rpg/ node scripts/world-overview.mjs
import { mkdirSync } from 'node:fs';
import { chromium, depart, layoutIssues, URL } from './lib.mjs';

const browser = await chromium.launch();
const problems = [];
mkdirSync('scripts/screenshots', { recursive: true });

for (const [width, height] of [[360, 640], [390, 844], [480, 854]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true });
  const page = await ctx.newPage();
  const ng = (m) => problems.push(`${width}px: ${m}`);
  const shot = (n) => page.screenshot({ path: `scripts/screenshots/world-overview-${width}-${n}.png` });
  const zoom = async () => Number(await page.locator('[data-zoom-controls]').getAttribute('data-zoom'));
  const zoomMin = async () => Number(await page.locator('[data-zoom-controls]').getAttribute('data-zoom-min'));
  const closeOverlays = async () => {
    for (let k = 0; k < 3; k++) {
      const cont = page.getByText('つづける', { exact: true });
      if (await cont.count()) await cont.first().click().catch(() => {});
      const handoff = page.getByText('スマホを渡して、タップで始める');
      if (await handoff.count()) await handoff.click().catch(() => {});
      await page.waitForTimeout(250);
    }
  };
  const issues = async (when) => {
    const list = await layoutIssues(page);
    if (list.length) ng(`${when}の表示の問題: ${list.join(' / ')}`);
  };
  /** 地図の枠の大きさと、中身の大きさ（横にはみ出しているか） */
  const mapBox = () => page.evaluate(() => {
    const el = document.querySelector('[data-world-map]');
    return { cw: el.clientWidth, sw: el.scrollWidth, ch: el.clientHeight, left: el.scrollLeft, top: el.scrollTop };
  });

  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false })); });
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText('2人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(500);
  await closeOverlays();
  await page.waitForTimeout(1600);

  const w = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.world);
  if (w.width !== 15 || w.height !== 42) ng(`地図が15列×42行でない（${w.width}×${w.height}）`);

  // 1) 1倍
  if ((await zoom()) !== 1) ng(`始めが1倍でない（${await zoom()}）`);
  const hexW = await page.locator('[data-hex] polygon').first().evaluate((p) => p.getBoundingClientRect().width);
  const cols = width / hexW;
  if (width <= 480 && (cols < 7.5 || cols > 9.5)) ng(`1倍で横に見えるマスが約8.5列でない（${cols.toFixed(1)}列）`);
  const b1 = await mapBox();
  if (b1.sw <= b1.cw + 1) ng('1倍で横にスクロールできない（広い地図が全部収まっている）');
  const bonus = page.locator('[data-road-bonus]');
  if (!(await bonus.count())) ng('王都（街道の上）で「街道ボーナス」が振るボタンに出ない');
  else if (!(await bonus.innerText()).includes('+1')) ng(`街道ボーナスの文字が違う（${await bonus.innerText()}）`);
  const preview = await page.locator('[data-dice-preview]').innerText().catch(() => '');
  if (!preview.includes('街道')) ng(`振る前の説明に街道のボーナスが無い（${preview}）`);
  await issues('1倍');
  await shot('1-normal');

  // 2) 縮小の下限
  for (let k = 0; k < 8 && !(await page.locator('[data-zoom-out]').isDisabled()); k++) {
    await page.locator('[data-zoom-out]').click();
    await page.waitForTimeout(150);
  }
  const zmin = await zoomMin();
  if ((await zoom()) !== zmin) ng(`−を押し続けても下限で止まらない（${await zoom()} / ${zmin}）`);
  if (width <= 480 && (zmin < 0.45 || zmin > 0.62)) ng(`下限が約0.55倍でない（${zmin}）`);
  await page.waitForTimeout(600);
  const b2 = await mapBox();
  if (b2.sw > b2.cw + 1) ng(`下限でも横にはみ出す（中身 ${b2.sw}px / 枠 ${b2.cw}px）`);
  if (zmin < 0.75 && !(await page.locator('[data-zoom-controls][data-zoom-compact]').count())) ng('0.75倍より小さいのに、小さい表示になっていない');
  // 敵の Lv の札・移動力の数字が出ていない
  const labels = await page.evaluate(() => [...document.querySelectorAll('[data-wanderer] span')].filter((s) => /^(Lv|×)/.test(s.textContent ?? '')).length);
  if (zmin < 0.75 && labels) ng(`縮小しても敵の Lv の札が出ている（${labels}）`);
  await page.locator('[data-roll-move]').click();
  await page.locator('[data-roll-spinning]').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(700);
  const reachNums = await page.locator('[data-reach] text').count();
  const reachHex = await page.locator('[data-reach]').count();
  if (!reachHex) ng('縮小した時に、移動できるマスの印が無い');
  if (zmin < 0.75 && reachNums) ng(`縮小しても移動力の数字が出ている（${reachNums}）`);
  await issues('縮小の下限');
  await shot('2-min');

  // 3) 見取り図
  await page.locator('[data-overview-open]').click();
  await page.waitForTimeout(400);
  const ov = page.locator('[data-overview]');
  if (!(await ov.count())) ng('見取り図が開かない');
  else {
    const svg = await page.locator('[data-overview-map]').boundingBox();
    if (!svg) ng('見取り図の地図が無い');
    else {
      if (svg.x < -1 || svg.y < -1 || svg.x + svg.width > width + 1 || svg.y + svg.height > height + 1) ng(`見取り図が画面からはみ出す（${JSON.stringify(svg)}）`);
      if (width === 390 && height === 844) console.log(`390×844 の見取り図: ${svg.width.toFixed(0)}×${svg.height.toFixed(0)}px`);
      if (width === 360 && height === 640) console.log(`360×640 の見取り図: ${svg.width.toFixed(0)}×${svg.height.toFixed(0)}px`);
    }
    const towns = await page.locator('[data-overview-mark="town"]').count();
    if (towns < 1) ng('見取り図に町の印が無い');
    if (!(await page.locator('[data-overview-goal]').count())) ng('見取り図に次の目的地（光る輪）が無い');
    if ((await page.locator('[data-overview-hero]').count()) < 2) ng('見取り図に自分たちの印が無い');
    const close = await page.locator('[data-overview-close]').boundingBox();
    if (!close || close.width < 40 || close.height < 40) ng('見取り図の「閉じる」が小さい');
    await issues('見取り図');
    await shot('3-overview');
    // 印を押す: 次の目的地（霧の中でも印がある）。押すと閉じて、そのマスが地図の見える所に来る
    const goalTile = Number(await page.locator('[data-overview-mark="dungeon"]').first().getAttribute('data-tile').catch(() => 'NaN'));
    const mark = Number.isFinite(goalTile) ? page.locator(`[data-overview-mark][data-tile="${goalTile}"]`).first() : page.locator('[data-overview-mark="town"]').first();
    const tile = Number(await mark.getAttribute('data-tile'));
    await mark.click();
    await page.waitForTimeout(900);
    if (await ov.count()) ng('印を押しても見取り図が閉じない');
    const seen = await page.evaluate((t) => {
      const box = document.querySelector('[data-world-map]').getBoundingClientRect();
      const panelTop = document.querySelector('[data-world-panel]').getBoundingClientRect().top;
      const hex = document.querySelector(`[data-hex="${t}"]`) ?? document.querySelector(`[data-fog-tile="${t}"]`);
      if (!hex) return null;
      const r = hex.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      return { inView: cx >= box.left && cx <= box.right && cy >= box.top && cy <= Math.min(box.bottom, panelTop), cx, cy };
    }, tile);
    if (!seen) ng(`押した印のマス（${tile}）が地図に無い`);
    else if (!seen.inView) ng(`印を押しても、そのマス（${tile}）が見える所へ動かない（${JSON.stringify(seen)}）`);
    await shot('4-picked');
  }
  await ctx.close();
}
await browser.close();
if (problems.length) {
  console.log('NG');
  for (const p of problems) console.log(' - ' + p);
  process.exit(1);
}
console.log('OK');
