// 世界マップの「ステータス」ボタンと、どのプレイヤーのキャラかの表示を確かめる（360・390・480）
// 1) 右上に「ステータス」ボタンがあり、押すとパーティの窓が開く
// 2) 顔を押すと、そのキャラの窓が開く（2人目の顔 → 2人目）
// 3) 2人で遊ぶ時（P1・P2）は顔・窓に P1/P2 の印が出る。1人で全員を動かす時は出ない
// 使い方: npx vite build && npx vite preview を起こしてから node scripts/status-button.mjs（URL=... で場所を変えられる）
import { mkdirSync } from 'node:fs';
import { chromium, depart, layoutIssues, URL } from './lib.mjs';

const dir = 'screenshots/status-button';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
const fail = async (page, msg) => { await page.screenshot({ path: `${dir}/fail.png` }).catch(() => {}); console.error('NG:', msg); await browser.close(); process.exit(1); };

for (const [w, h] of [[360, 640], [390, 844], [480, 860]]) {
  for (const seats of ['solo', 'pass']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false })); });
    await page.reload();
    await page.getByText('新しい冒険').click();
    await page.getByText('2人', { exact: true }).click();
    await page.getByText('キャラクター作成へ').click();
    await depart(page);
    await page.waitForTimeout(300);
    await page.evaluate((seats) => {
      const k = 'card-rpg/adventure';
      const d = JSON.parse(localStorage.getItem(k));
      d.game.heroes.forEach((x, i) => (x.playerId = seats === 'pass' ? `P${i + 1}` : 'P1'));
      d.game.world.story = undefined;
      localStorage.setItem(k, JSON.stringify(d));
    }, seats);
    await page.reload();
    await page.getByText('つづきから').click();
    await page.waitForTimeout(600);
    for (const t of ['スマホを渡して、タップで始める', 'タップで始める']) { const x = page.getByText(t); if (await x.count()) await x.first().click().catch(() => {}); }
    const btn = page.locator('[data-status-button]');
    if (!(await btn.count())) await fail(page, `${w} ${seats}: ステータスのボタンが無い`);
    const tags = await page.locator('[data-party-row] [data-player-tag]').count();
    if (seats === 'pass' && tags !== 2) await fail(page, `${w} ${seats}: 顔のP印が${tags}個（2個のはず）`);
    if (seats === 'solo' && tags !== 0) await fail(page, `${w} ${seats}: 1人なのにP印が出ている`);
    const issues = await layoutIssues(page);
    if (issues.length) await fail(page, `${w} ${seats}: ${issues.join(' / ')}`);
    await page.screenshot({ path: `${dir}/${w}-${seats}-map.png` });
    // 2人目の顔を押す → 2人目の窓
    const names = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.heroes.map((x) => x.name));
    await page.locator('[data-party-row] > button').nth(1).click();
    await page.waitForTimeout(400);
    const title = await page.locator('.font-display').filter({ hasText: names[1] }).count();
    if (!title) await fail(page, `${w} ${seats}: 2人目の顔を押しても2人目（${names[1]}）が出ない`);
    if (seats === 'pass' && !(await page.locator('[data-sheet-owner]').count())) await fail(page, `${w}: 窓に「P2のキャラ」が出ない`);
    await page.screenshot({ path: `${dir}/${w}-${seats}-sheet.png` });
    await ctx.close();
  }
}
await browser.close();
console.log('OK: ステータスのボタン・顔から開く・P印（360/390/480 × 1人操作/2人）');
