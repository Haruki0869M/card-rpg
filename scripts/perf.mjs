// 性能計測: CPUを4倍遅くした状態で、カード使用〜敵フェーズ中のフレーム時間を測る
// npm run build && npx vite preview --port 4173 を起動した状態で: node scripts/perf.mjs
import { chromium, confirmEndTurn, startBattle } from './lib.mjs';

const browser = await chromium.launch();
const results = [];
for (const [n, enc] of [[2, ['goblinBrute', 'chaosShaman', 'goblinScout']], [4, ['treeWarden', 'chaosShaman', 'forestWolf', 'toxicShroom']]]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2.6 });
  const page = await ctx.newPage();
  await startBattle(page, n, enc, false);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const loop = (t) => {
      window.__frames.push(t - last);
      last = t;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  // カードを3枚使う → ターン終了 → 敵フェーズを待つ
  for (let k = 0; k < 3; k++) {
    const card = page.locator('[data-card-index][data-usable]').first();
    if (!(await card.count())) break;
    const box = await card.boundingBox();
    await page.mouse.click(box.x + 14, box.y + 70);
    await page.waitForTimeout(150);
    if (await page.getByText('敵をタップ').count()) {
      const e = await page.locator('[data-enemy]:not([data-dead])').first().boundingBox();
      await page.mouse.click(e.x + e.width / 2, e.y + 60);
      await page.waitForTimeout(100);
    }
    const go = page.locator('button:has-text("発動")');
    if (await go.count()) await go.click();
    await page.waitForTimeout(700);
  }
  await page.locator('button:has-text("ターン終了")').click();
  await confirmEndTurn(page);
  await page.waitForTimeout(2500);
  const frames = await page.evaluate(() => window.__frames.slice(2));
  frames.sort((a, b) => a - b);
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  const p95 = frames[Math.floor(frames.length * 0.95)];
  const slow = frames.filter((f) => f > 25).length / frames.length;
  results.push({ party: n, frames: frames.length, avgFps: +(1000 / avg).toFixed(1), p95ms: +p95.toFixed(1), slowRatio: `${(slow * 100).toFixed(1)}%` });
  await ctx.close();
}
await browser.close();
console.table(results);
