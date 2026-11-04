// 実際のUIをタップ操作して、1〜4人それぞれで勝利・敗北まで到達できるか確認する
// npm run build && npx vite preview --port 4173 を起動した状態で: node scripts/playthrough.mjs
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, startBattle } from './lib.mjs';

mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch();
const issues = [];

async function tapCard(page, locator) {
  const box = await locator.boundingBox();
  if (!box) return false;
  await page.mouse.click(box.x + Math.min(16, box.width / 2), box.y + Math.min(70, box.height / 2));
  return true;
}

async function resultText(page) {
  if (await page.getByText('勝利！', { exact: true }).count()) return 'victory';
  if (await page.getByText('敗北…', { exact: true }).count()) return 'defeat';
  return null;
}

async function playToWin(page, tag) {
  for (let turn = 0; turn < 40; turn++) {
    let r = await resultText(page);
    if (r) return r;
    await page.waitForSelector('button:has-text("ターン終了"):not([disabled])', { timeout: 15000 });
    for (let guard = 0; guard < 40; guard++) {
      if ((r = await resultText(page))) return r;
      const allies = page.locator('[data-ally]:not([data-done]):not([data-dead])');
      if ((await allies.count()) === 0) break;
      await allies.first().click();
      const cards = page.locator('[data-card-index][data-usable]');
      if ((await cards.count()) === 0) break;
      let card = cards.first();
      for (const id of ['heavySwing', 'gambleBolt', 'shieldBash', 'strike', 'magicArrow', 'warCry', 'meditate', 'guard']) {
        const c = page.locator(`[data-card-index][data-usable][data-card-id="${id}"]`);
        if (await c.count()) {
          card = c.first();
          break;
        }
      }
      const id = await card.getAttribute('data-card-id');
      await tapCard(page, card);
      await page.waitForTimeout(40);
      if (await page.getByText('敵をタップ').count()) {
        const hps = await page.$$eval('[data-enemy]:not([data-dead])', (els) => els.map((e) => [e.dataset.enemy, +e.dataset.hp]));
        hps.sort((a, b) => a[1] - b[1]);
        const box = await page.locator(`[data-enemy="${hps[0][0]}"]`).boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + 60);
      }
      if (id === 'heavySwing' || id === 'gambleBolt') {
        for (let i = 0; i < 4; i++) {
          const plus = page.getByLabel('フォーカスを増やす');
          if ((await plus.count()) && (await plus.isEnabled())) await plus.click();
        }
      }
      const li = await layoutIssues(page);
      if (li.length) issues.push(`${tag}: ${li.join(', ')}`);
      const go = page.locator('button:has-text("発動")');
      if (await go.count()) await go.click();
      await page.waitForTimeout(40);
    }
    if ((r = await resultText(page))) return r;
    await page.locator('button:has-text("ターン終了")').click();
    await page.waitForTimeout(100);
  }
  return 'timeout';
}

async function playToLose(page) {
  for (let turn = 0; turn < 80; turn++) {
    const r = await resultText(page);
    if (r) return r;
    await page.locator('button:has-text("ターン終了"):not([disabled])').or(page.getByText('敗北…', { exact: true })).first().waitFor({ timeout: 15000 });
    if (await resultText(page)) continue;
    await page.locator('button:has-text("ターン終了")').click();
    await page.waitForTimeout(50);
  }
  return 'timeout';
}

let failed = false;
for (const party of [1, 2, 3, 4]) {
  for (const goal of ['victory', 'defeat']) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`));
    let result;
    let attempts = 0;
    do {
      attempts++;
      await startBattle(page, party, party === 1 ? '重装兵（1体）' : 'ゴブリンの一団（3体）');
      result = goal === 'victory' ? await playToWin(page, `${party}p`) : await playToLose(page);
    } while (result !== goal && attempts < 6);
    console.log(`${party}人 ${goal}: ${result === goal ? 'OK' : 'NG(' + result + ')'} (試行${attempts}回)`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `screenshots/result-${party}p-${goal}.png` });
    if (result !== goal) failed = true;
    await ctx.close();
  }
}
await browser.close();
if (issues.length) console.log('issues:', [...new Set(issues)]);
process.exit(failed || issues.length ? 1 : 0);
