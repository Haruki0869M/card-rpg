// 実際のUIをタップ操作して、勝利・敗北まで到達できるか確認する
// npx vite preview を起動した状態で: node scripts/playthrough.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const { chromium } = require('playwright');

const URL = process.env.URL ?? 'http://localhost:4173/card-rpg/';
mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch();
const issues = [];

async function tap(page, locator) {
  const box = await locator.boundingBox();
  if (!box) return false;
  // カードは重なっている可能性があるので左上寄りを押す
  await page.mouse.click(box.x + Math.min(20, box.width / 2), box.y + Math.min(60, box.height / 2));
  return true;
}

async function layoutIssues(page) {
  return page.evaluate(() => {
    const out = [];
    const de = document.documentElement;
    if (de.scrollHeight > innerHeight + 1 || de.scrollWidth > innerWidth + 1) out.push('page overflow');
    for (const el of document.querySelectorAll('.game-bg button')) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.width < 43.5 || r.height < 43.5)) out.push(`small button "${el.textContent}" ${r.width}x${r.height}`);
      if (r.bottom > innerHeight + 1 || r.right > innerWidth + 1) out.push(`offscreen "${el.textContent}"`);
    }
    return out;
  });
}

async function setup(page, party, fast = true) {
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  if (party === 4) {
    await page.getByLabel('メニュー').click();
    await page.getByText('4人モード').click(); // 切り替えるとバトルがリセットされメニューが閉じる
    await page.waitForTimeout(150);
  }
  await page.getByLabel('メニュー').click();
  if (await page.getByText('高速モード').count()) {
    if (fast) await page.getByText('高速モード').click();
    await page.getByLabel('閉じる').click();
  }
}

async function resultText(page) {
  if (await page.getByText('勝利！', { exact: true }).count()) return 'victory';
  if (await page.getByText('敗北…', { exact: true }).count()) return 'defeat';
  return null;
}

/** 攻撃的にプレイして勝利を目指す */
async function playToWin(page, tag) {
  for (let turn = 0; turn < 40; turn++) {
    let r = await resultText(page);
    if (r) return r;
    // 敵フェーズ待ち
    await page.waitForSelector('text=ターン終了', { timeout: 10000 });
    for (let guard = 0; guard < 40; guard++) {
      if ((r = await resultText(page))) return r;
      const allies = page.locator('[data-ally]:not([data-done]):not([data-dead])');
      if ((await allies.count()) === 0) break;
      await tap(page, allies.first());
      const cards = page.locator('[data-card-index][data-usable]');
      if ((await cards.count()) === 0) break;
      // 攻撃カード優先
      let card = cards.first();
      for (const id of ['heavySwing', 'gambleBolt', 'shieldBash', 'strike', 'magicArrow', 'warCry', 'meditate', 'guard']) {
        const c = page.locator(`[data-card-index][data-usable][data-card-id="${id}"]`);
        if (await c.count()) {
          card = c.first();
          break;
        }
      }
      await tap(page, card);
      await page.waitForTimeout(30);
      if (await page.getByText('対象を選択').count()) {
        // HPが最も低い敵
        const hps = await page.$$eval('[data-enemy]:not([data-dead])', (els) => els.map((e) => [e.dataset.enemy, +e.dataset.hp]));
        hps.sort((a, b) => a[1] - b[1]);
        await tap(page, page.locator(`[data-enemy="${hps[0][0]}"]`));
      }
      // 大技ならフォーカス全投入
      const id = await card.getAttribute('data-card-id').catch(() => null);
      if (id === 'heavySwing' || id === 'gambleBolt') {
        for (let i = 0; i < 4; i++) {
          const plus = page.getByLabel('フォーカスを増やす');
          if ((await plus.count()) && (await plus.isEnabled())) await plus.click();
        }
      }
      const li = await layoutIssues(page);
      if (li.length) issues.push(`${tag}: ${li.join(', ')}`);
      const go = page.getByText('発動', { exact: true });
      if (await go.count()) await go.click();
      await page.waitForTimeout(30);
    }
    if ((r = await resultText(page))) return r;
    await page.getByText('ターン終了').click();
    await page.waitForTimeout(100);
  }
  return 'timeout';
}

/** 何もせずターン終了を繰り返して敗北する */
async function playToLose(page) {
  for (let turn = 0; turn < 80; turn++) {
    const r = await resultText(page);
    if (r) return r;
    await page.waitForSelector('text=ターン終了', { timeout: 10000 });
    if (await resultText(page)) continue;
    await page.getByText('ターン終了').click();
    await page.waitForTimeout(50);
  }
  return 'timeout';
}

let failed = false;
for (const party of [2, 4]) {
  for (const goal of ['victory', 'defeat']) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`));
    let result;
    let attempts = 0;
    do {
      attempts++;
      await setup(page, party);
      result = goal === 'victory' ? await playToWin(page, `${party}p`) : await playToLose(page);
    } while (result !== goal && attempts < 6);
    const turn = await page.locator('text=/^ターン数/').locator('..').textContent().catch(() => '');
    console.log(`${party}人 ${goal}: ${result === goal ? 'OK' : 'NG(' + result + ')'} (試行${attempts}回) ${turn}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `screenshots/result-${party}p-${goal}.png` });
    if (result !== goal) failed = true;
    await ctx.close();
  }
}
await browser.close();
if (issues.length) console.log('issues:', [...new Set(issues)]);
process.exit(failed || issues.length ? 1 : 0);
