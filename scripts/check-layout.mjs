// レイアウト確認: npm run build && npx vite preview --port 4173 を起動した状態で node scripts/check-layout.mjs
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, startBattle } from './lib.mjs';

mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch();
let problems = 0;
const configs = [
  [1, '重装兵（1体）'],
  [2, 'ゴブリンの一団（3体）'],
  [3, '斥候の二人組（2体）'],
  [4, 'ゴブリンの軍勢（4体）'],
];
for (const [w, h] of [[360, 640], [412, 860], [360, 560]]) {
  for (const [n, enc] of configs) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await startBattle(page, n, enc);
    await page.waitForTimeout(500);
    const tag = `${w}x${h}-${n}p`;
    await page.screenshot({ path: `screenshots/${tag}.png` });
    const report = await layoutIssues(page);
    // 全カードを1枚ずつ選択してパネルの崩れを確認
    const count = await page.locator('[data-card-index]').count();
    for (let i = 0; i < count; i++) {
      const c = page.locator(`[data-card-index="${i}"]`);
      const box = await c.boundingBox();
      await page.mouse.click(box.x + 12, box.y + 80);
      await page.waitForTimeout(120);
      if (await page.getByText('発動', { exact: true }).count()) report.push(...(await layoutIssues(page)));
      await page.getByLabel('キャンセル').click().catch(() => {});
      await page.waitForTimeout(80);
    }
    report.push(...errors.map((e) => `pageerror: ${e}`));
    const uniq = [...new Set(report)];
    console.log(tag, uniq.length ? uniq : 'OK');
    problems += uniq.length;
    await ctx.close();
  }
}
await browser.close();
process.exit(problems ? 1 : 0);
