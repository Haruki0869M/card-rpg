// 実際の画面をタップして、キャラ作成 → ダンジョン → 宝箱 → レベルアップ → ボス撃破 → 大宝箱 → 拠点 まで進める
// npm run build && npx vite preview --port 4173 を起動した状態で: node scripts/adventure.mjs
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL } from './lib.mjs';

mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch();
const issues = new Set();
const seen = new Set();

async function check(page, tag) {
  for (const i of await layoutIssues(page)) issues.add(`${tag}: ${i}`);
}

async function clickText(page, text, opts = {}) {
  const l = page.getByText(text, { exact: true, ...opts }).first();
  if (await l.count()) {
    await l.click();
    return true;
  }
  return false;
}

async function playBattle(page) {
  for (let guard = 0; guard < 60; guard++) {
    if (await page.locator('button:has-text("報酬を受け取る"), button:has-text("冒険の結果へ"), button:has-text("ダンジョンへ戻る")').count()) return;
    const endBtn = page.locator('button:has-text("ターン終了"):not([disabled])');
    if (!(await endBtn.count())) {
      await page.waitForTimeout(150);
      continue;
    }
    const allies = page.locator('[data-ally]:not([data-done]):not([data-dead])');
    if ((await allies.count()) === 0) {
      await endBtn.click();
      await page.waitForTimeout(200);
      continue;
    }
    await allies.first().click();
    const cards = page.locator('[data-card-index][data-usable]');
    if (!(await cards.count())) {
      await endBtn.click();
      continue;
    }
    const card = cards.first();
    const box = await card.boundingBox();
    await page.mouse.click(box.x + 14, box.y + 70);
    await page.waitForTimeout(40);
    if (await page.getByText('敵をタップ').count()) {
      const e = page.locator('[data-enemy]:not([data-dead])').first();
      const eb = await e.boundingBox();
      await page.mouse.click(eb.x + eb.width / 2, eb.y + 60);
    }
    for (let i = 0; i < 3; i++) {
      const plus = page.getByLabel('フォーカスを増やす');
      if ((await plus.count()) && (await plus.isEnabled()) && (await page.locator('[data-card-index][data-usable]').count()) <= 2) await plus.click();
    }
    if (!seen.has('focus')) {
      seen.add('focus');
      await check(page, 'focus');
    }
    const go = page.locator('button:has-text("発動")');
    if (await go.count()) await go.click();
    await page.waitForTimeout(40);
  }
}

async function run(party, difficulty) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => issues.add(`pageerror: ${e.message}`));
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByText('新しい冒険').click();
  if (!(await page.getByText('高速モード').count())) {
    /* 設定はメニューから */
  }
  await clickText(page, difficulty);
  await clickText(page, `${party}人`);
  await check(page, 'setup');
  await page.getByText('キャラクター作成へ').click();
  await check(page, 'create');
  await page.getByText('冒険に出発').click();
  // 高速モード
  await page.getByLabel('メニュー').click();
  await page.getByText('高速モード（演出2倍速）').click();
  await page.getByLabel('閉じる').click();
  await check(page, 'hub');
  await page.getByText('翠の神殿').first().click();

  let result = 'timeout';
  for (let step = 0; step < 300; step++) {
    await page.waitForTimeout(60);
    if (await page.getByText('拠点に戻る', { exact: true }).count()) {
      result = 'cleared';
      await page.screenshot({ path: `screenshots/adv-${party}p-cleared.png` });
      await check(page, 'cleared');
      await page.getByText('拠点に戻る').click();
      await page.waitForTimeout(200);
      if (!(await page.getByText('冒険の拠点').count())) issues.add('拠点に戻れない');
      break;
    }
    if (await page.getByText('全滅…', { exact: true }).count()) {
      if (await page.locator('button:has-text("冒険の結果へ")').count()) {
        await page.locator('button:has-text("冒険の結果へ")').click();
        continue;
      }
      result = 'gameover';
      break;
    }
    // ダンジョンの地図: 光っている部屋を選んで進む
    if (await page.getByText('撤退', { exact: true }).count()) {
      if (!seen.has('dungeon')) {
        seen.add('dungeon');
        await check(page, 'dungeon');
      }
      const rooms = page.locator('button[aria-label]').filter({ has: page.locator('.glow-pulse') });
      if (await rooms.count()) {
        await rooms.first().click();
        await page.getByText('この部屋へ進む').click();
      }
      continue;
    }
    if (await page.locator('button:has-text("ターン終了")').count()) {
      if (!seen.has('battle')) {
        seen.add('battle');
        await check(page, 'battle');
      }
      await playBattle(page);
      const fin = page.locator('button:has-text("報酬を受け取る"), button:has-text("冒険の結果へ"), button:has-text("ダンジョンへ戻る")');
      if (await fin.count()) await fin.first().click();
      continue;
    }
    if (await page.getByText('レベルアップ！').count()) {
      if (!seen.has('levelup')) {
        seen.add('levelup');
        await check(page, 'levelup');
        await page.screenshot({ path: `screenshots/adv-levelup.png` });
      }
      const opts = page.locator('button:has(.font-display)').filter({ hasNotText: 'カード強化' });
      await opts.first().click();
      continue;
    }
    if (await page.getByText('カードを1枚、山札に加える').count()) {
      if (!seen.has('reward')) {
        seen.add('reward');
        await check(page, 'reward');
        await page.screenshot({ path: `screenshots/adv-reward.png` });
      }
      await page.getByText('カードを選ばない').click();
      continue;
    }
    // 宝箱の演出中（最初の1回は演出を最後まで見る。以降は飛ばす）
    if (await page.getByText('タップで結果まで飛ばす').count()) {
      if (seen.has('chest-anim')) await clickText(page, 'タップで結果まで飛ばす');
      else {
        seen.add('chest-anim');
        await page.waitForTimeout(700);
        await page.screenshot({ path: `screenshots/adv-chest-anim.png` });
      }
      continue;
    }
    if (await page.getByText('運のスロット').count() && (await page.getByText('先へ進む').count()) && !seen.has('chest-result')) {
      seen.add('chest-result');
      await check(page, 'chest-result');
      await page.screenshot({ path: `screenshots/adv-chest-result.png` });
    }
    if (await clickText(page, '先へ進む')) continue;
    if (await page.locator('button:has-text("ダンジョン制覇！")').count()) {
      await page.screenshot({ path: `screenshots/adv-bigchest.png` });
      await page.locator('button:has-text("ダンジョン制覇！")').click();
      continue;
    }
    if (await clickText(page, '隠し宝箱へ')) continue;
    // 宝箱
    if (await page.locator('button:has-text("開ける"), button:has-text("鍵を開ける")').count()) {
      if (!seen.has('chest')) {
        seen.add('chest');
        await check(page, 'chest');
        await page.screenshot({ path: `screenshots/adv-chest.png` });
      }
      await page.locator('button:has-text("開ける"), button:has-text("鍵を開ける")').last().click();
      await page.waitForTimeout(150);
      continue;
    }
    // イベント
    if (await page.getByText('挑戦する').count()) {
      await page.getByText('挑戦する').click();
      continue;
    }
    const evOpts = page.locator('.panel button.btn-dark, .panel button.bg-sky-950\\/60').filter({ hasNotText: '戻る' });
    if (await page.getByText('能力値で判定').count() || (await page.getByText('立ち去る').count())) {
      if (!seen.has('event')) {
        seen.add('event');
        await check(page, 'event');
        await page.screenshot({ path: `screenshots/adv-event.png` });
      }
      await evOpts.first().click();
      continue;
    }
    // 休憩
    if (await page.getByText('瞑想する').count()) {
      if (!seen.has('rest')) {
        seen.add('rest');
        await check(page, 'rest');
      }
      await page.getByText('休む', { exact: true }).click();
      continue;
    }
  }
  console.log(`${party}人・${difficulty}: ${result}`);
  await ctx.close();
  return result;
}

const results = [];
results.push(await run(4, 'やさしい'));
results.push(await run(2, 'やさしい'));
await browser.close();
if (issues.size) console.log('issues:', [...issues]);
process.exit(issues.size || !results.includes('cleared') ? 1 : 0);
