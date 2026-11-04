// レイアウト確認: npx vite preview を起動した状態で node scripts/check-layout.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const { chromium } = require('playwright');

const URL = process.env.URL ?? 'http://localhost:4173/card-rpg/';
mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch();
let problems = 0;

for (const [w, h] of [[360, 640], [412, 780], [360, 560]]) {
  for (const party of [2, 4]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(URL);
    if (party === 4) {
      await page.getByLabel('メニュー').click();
      await page.getByText('4人モード').click();
    }
    await page.waitForTimeout(300);
    const tag = `${w}x${h}-${party}p`;
    await page.screenshot({ path: `screenshots/${tag}.png` });

    // カードを選択（使える最初のカード）
    const cards = page.locator('[data-card-index]');
    const n = await cards.count();
    for (let i = 0; i < n; i++) {
      const c = cards.nth(i);
      const box = await c.boundingBox();
      await page.mouse.click(box.x + 10, box.y + 70);
      await page.waitForTimeout(150);
      if (await page.getByText('発動').count()) break;
    }
    await page.waitForTimeout(200);
    await page.screenshot({ path: `screenshots/${tag}-select.png` });

    const report = await page.evaluate(() => {
      const out = [];
      const de = document.documentElement;
      if (de.scrollHeight > innerHeight + 1 || de.scrollWidth > innerWidth + 1)
        out.push(`page overflow ${de.scrollWidth}x${de.scrollHeight}`);
      const game = document.querySelector('.game-bg');
      // 全要素が画面内に収まっているか
      for (const el of game.querySelectorAll('button, [data-card-index]')) {
        const r = el.getBoundingClientRect();
        if (r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.left < -1 || r.top < -1)
          out.push(`offscreen: ${el.textContent.slice(0, 20)} ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
      }
      for (const el of game.querySelectorAll('button')) {
        const r = el.getBoundingClientRect();
        if (r.width < 43.5 || r.height < 43.5) out.push(`small button: "${el.textContent.slice(0, 12)}" ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
      }
      // 重なったカードの押せる幅（次のカードとの間隔）
      const cs = [...game.querySelectorAll('[data-card-index]')].map((e) => e.getBoundingClientRect());
      for (let i = 0; i + 1 < cs.length; i++) {
        const dx = cs[i + 1].left - cs[i].left;
        if (Math.abs(cs[i + 1].top - cs[i].top) < 30 && dx < 43.5) out.push(`card strip ${i}: ${dx.toFixed(0)}px`);
      }
      // 12px未満の文字
      const small = new Set();
      for (const el of game.querySelectorAll('*')) {
        if (!el.childNodes.length || ![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 12) small.add(`${fs}px "${el.textContent.trim().slice(0, 10)}"`);
      }
      out.push(...[...small].map((s) => `small text ${s}`));
      // 敵・味方枠のサイズ
      return out;
    });
    console.log(tag, report.length ? report : 'OK');
    problems += report.length;
    await ctx.close();
  }
}
await browser.close();
process.exit(problems ? 1 : 0);
