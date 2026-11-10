// 世界マップのカメラと下のパネル（フェーズ2-D）の確認:
// 1) 始めの画面（2人・物語を閉じた後）で、手番の駒が地図の見えている所（枠の上の端〜重なっている下のパネルの上の端）の縦の真ん中（±20%）にいる
// 2) 移動力の判定でスロットが回ってから止まる（約0.35秒）
// 3) 判定の後も駒が枠の真ん中付近。行き先を選んでも、地図の枠の高さが変わらない（下のパネルが大きくならない）
// 4) 選んだ時のボタンの文言「移動する（移動力N を使う・Mマス先）」・マスの説明は地図の上に重なる
// 使い方: npx vite preview を起こしてから node scripts/world-camera.mjs（URL=... で場所を変えられる）
import { chromium, depart, layoutIssues, URL } from './lib.mjs';

const browser = await chromium.launch();
const problems = [];
for (const [width, height] of [[360, 640], [390, 844], [480, 854]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  const ng = (m) => problems.push(`${width}px: ${m}`);
  const shot = (n) => page.screenshot({ path: `scripts/screenshots/world-camera-${width}-${n}.png` });
  const where = () =>
    page.evaluate(() => {
      // 下の操作パネルは地図の上に重なっている（地図の枠の大きさはいつも同じ）。見えている所 = 枠の上の端〜パネルの上の端
      const box = document.querySelector('[data-world-map]').getBoundingClientRect();
      const panel = document.querySelector('[data-world-panel]').getBoundingClientRect();
      const visH = Math.min(box.bottom, panel.top) - box.top;
      const turn = JSON.parse(localStorage.getItem('card-rpg/adventure')).game.world.turn;
      const h = document.querySelector(`[data-hero="${turn}"]`).getBoundingClientRect();
      return { ratio: (h.top + h.height / 2 - box.top) / visH, mapH: visH };
    });
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false })); });
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText('2人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(500);
  const cont = page.getByText('つづける', { exact: true });
  if (await cont.count()) await cont.first().click();
  await page.waitForTimeout(1600); // 手番のカットインが消えるまで
  const a = await where();
  await shot('1-start');
  if (Math.abs(a.ratio - 0.5) > 0.2) ng(`始めの画面で駒が枠の真ん中にいない（上から${(a.ratio * 100).toFixed(0)}%）`);
  // 移動力の判定: スロットが回ってから止まる
  await page.locator('[data-roll-move]').click();
  const spun = await page.locator('[data-roll-spinning]').waitFor({ timeout: 600 }).then(() => true).catch(() => false);
  if (!spun) ng('移動力の判定でスロットが回らない');
  await page.locator('[data-roll-spinning]').waitFor({ state: 'detached', timeout: 1500 }).catch(() => ng('スロットが止まらない'));
  await page.waitForTimeout(300);
  const b = await where();
  await shot('2-rolled');
  if (Math.abs(b.ratio - 0.5) > 0.2) ng(`判定の後に駒が枠の真ん中にいない（上から${(b.ratio * 100).toFixed(0)}%）`);
  // 行き先を選ぶ: 地図の枠の高さが変わらない
  const t = page.locator('[data-reach]').filter({ hasText: /^[1-9]$/ }).first();
  if (!(await t.count())) ng('行ける光るマスが無い');
  else {
    const bb = await t.boundingBox();
    await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await page.waitForTimeout(400);
    const c = await where();
    await shot('3-selected');
    if (Math.abs(c.mapH - b.mapH) > 1) ng(`行き先を選ぶと地図の見えている高さが変わる（${b.mapH.toFixed(0)}→${c.mapH.toFixed(0)}px）`);
    const btn = (await page.locator('button:has-text("移動する")').innerText().catch(() => '')).replace(/\s+/g, '');
    if (!/^移動する（移動力\d+を使う・\d+マス先）$/.test(btn)) ng(`移動するのボタンの文言: ${btn}`);
    if (!(await page.locator('[data-tile-info]').count())) ng('マスの説明が出ない');
    const issues = await layoutIssues(page);
    if (issues.length) ng(`表示の問題: ${issues.join(' / ')}`);
  }
  await page.close();
  console.log(`${width}px: 確認済み（始め ${(a.ratio * 100).toFixed(0)}%・判定の後 ${(b.ratio * 100).toFixed(0)}%）`);
}
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: 世界マップのカメラ・スロットの回転・行き先を選んでもパネルが大きくならない（360/390/480）');
