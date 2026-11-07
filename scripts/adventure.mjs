// 実際の画面をタップして、キャラ作成 → 世界マップ（物語・移動・遭遇）→ 翠の神殿 → 宝箱 → レベルアップ → ボス撃破 → 大宝箱 → 地上 まで進める
// 2人以上は担当プレイヤーを分けて、手番の受け渡しの画面も確かめる
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
    try {
      await l.click({ timeout: 4000 });
    } catch {
      // 消えていく途中のボタンなど（次の回でやり直す）
      return false;
    }
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
  // 2人目以降は別のプレイヤーが担当（ローカル協力の手番の受け渡しを確かめる）
  if (party > 1) {
    await page.getByText('2人目').click();
    await page.getByText('P2', { exact: true }).click();
    await page.getByText('1人目').click();
  }
  await check(page, 'create');
  await page.getByText('冒険に出発').click();
  // 冒頭の物語
  await page.waitForTimeout(400);
  await page.screenshot({ path: `screenshots/adv-story.png` });
  await page.getByText('つづける').click();
  // 高速モード
  await page.getByLabel('メニュー').click();
  await page.getByText('高速モード（演出2倍速）').click();
  await page.getByLabel('閉じる').click();

  let result = 'timeout';
  for (let step = 0; step < 900; step++) {
    await page.waitForTimeout(60);
    if (await page.getByText('地上に戻る', { exact: true }).count()) {
      result = 'cleared';
      await page.screenshot({ path: `screenshots/adv-${party}p-cleared.png` });
      await check(page, 'cleared');
      await page.getByText('地上に戻る').click();
      await page.waitForTimeout(300);
      // 地上に戻ったあと: 世界マップか、手番が来た別の組のダンジョン（M3-D）
      if (!(await page.locator('[data-world-map]').count()) && !(await page.getByText('探索力の判定').count())) { issues.add('世界マップに戻れない'); await page.screenshot({ path: `screenshots/adv-${party}p-noworld.png` }); console.log((await page.locator('body').innerText()).slice(0, 300)); }
      break;
    }
    if (await page.getByText('世界の終わり…', { exact: true }).count()) {
      result = 'gameover';
      break;
    }
    // 物語・手番の受け渡し
    if (await clickText(page, 'つづける')) continue;
    if (await page.getByLabel('手番を始める').count()) {
      if (!seen.has('handoff')) {
        seen.add('handoff');
        await page.screenshot({ path: `screenshots/adv-handoff.png` });
      }
      await page.getByLabel('手番を始める').click({ timeout: 3000 }).catch(() => {});
      continue;
    }
    // 遭遇
    if (await page.getByText('奇襲を狙う').count() && (await page.getByText('戦う', { exact: true }).count())) {
      if (!seen.has('encounter')) {
        seen.add('encounter');
        await check(page, 'encounter');
        await page.screenshot({ path: `screenshots/adv-encounter.png` });
      }
      await page.getByText('戦う', { exact: true }).click({ timeout: 3000 }).catch(() => {});
      continue;
    }
    if (await clickText(page, '戦闘開始')) continue;
    if (await clickText(page, '町を出る')) continue;
    if (await clickText(page, '祈らずに去る')) continue;
    // 世界マップ: 翠の神殿へ向かう
    if (await page.locator('[data-world-map]').count() && !(await page.getByText('撤退', { exact: true }).count())) {
      if (!seen.has('world')) {
        seen.add('world');
        await check(page, 'world');
        await page.screenshot({ path: `screenshots/adv-world.png` });
      }
      if (await clickText(page, '翠の神殿に入る')) continue;
      if (await page.getByText('移動力の判定').count()) {
        await page.getByText('移動力の判定').click({ timeout: 3000 }).catch(() => {});
        continue;
      }
      const reach = page.locator('[data-reach]');
      const n = await reach.count();
      if (n) {
        const goal = page.locator('[data-feature="dungeon:emeraldTemple"]');
        const gb = (await goal.count()) ? await goal.boundingBox() : null;
        const target = gb ? { x: gb.x + gb.width / 2, y: gb.y + gb.height / 2 } : { x: 180, y: -100000 };
        let best = null;
        let bestD = Infinity;
        for (let i = 0; i < n; i++) {
          const b = await reach.nth(i).boundingBox();
          if (!b) continue;
          const d = (b.x + b.width / 2 - target.x) ** 2 + (b.y + b.height / 2 - target.y) ** 2;
          if (d < bestD) (bestD = d), (best = i);
        }
        const hb = await page.locator('[data-hero].glow-pulse').boundingBox();
        const hd = hb ? (hb.x + hb.width / 2 - target.x) ** 2 + (hb.y + hb.height / 2 - target.y) ** 2 : Infinity;
        if (best !== null && bestD < hd) {
          await reach.nth(best).scrollIntoViewIfNeeded();
          const b = await reach.nth(best).boundingBox();
          await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
          await page.waitForTimeout(80);
          if (await page.locator('button:has-text("移動する")').count()) {
            if (!seen.has('move')) {
              seen.add('move');
              await page.screenshot({ path: `screenshots/adv-move.png` });
            }
            await page.locator('button:has-text("移動する")').click({ timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(250);
            continue;
          }
        }
      }
      await clickText(page, '手番を終える') || (await clickText(page, '待機'));
      continue;
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
      // 手番の最初は探索力を決める。使い切ったら「手番を終える」（M3-D）
      if (await page.getByText('探索力の判定').count()) {
        await page.getByText('探索力の判定').click();
        continue;
      }
      const rooms = page.locator('button[aria-label]').filter({ has: page.locator('.glow-pulse') });
      if (await rooms.count()) {
        await rooms.first().click();
        if (await page.getByText('この部屋へ進む').count()) await page.getByText('この部屋へ進む').click();
        else if (await page.getByText('手番を終える').count()) await page.getByText('手番を終える').click();
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
    if (await page.getByText(/の山札に1枚加える/).count()) {
      if (!seen.has('reward')) {
        seen.add('reward');
        await check(page, 'reward');
        await page.screenshot({ path: `screenshots/adv-reward.png` });
      }
      await page.getByText(/はカードを選ばない/).click();
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
    if (await clickText(page, '戦闘を始める')) continue;
    // イベントの後の作業（お供・カード・行商人）と転職のカード選び（J3a・J3b）
    if (await page.locator('[data-hero-task]').count()) {
      if (!seen.has('hero-task')) {
        seen.add('hero-task');
        await check(page, 'hero-task');
        await page.screenshot({ path: `screenshots/adv-hero-task.png` });
      }
      for (const t of ['お供にする', 'やめる', '行商人と別れる']) if (await clickText(page, t)) break;
      continue;
    }
    if (await page.locator('[data-job-pick]').count()) {
      await page.locator('[data-job-pick] button[aria-pressed]').first().click();
      await clickText(page, 'このカードにする');
      continue;
    }
    // 突発イベント: 選べる選択肢の先頭（お金・フォーカスの足りない選択肢は押せない）
    if (await page.locator('[data-event-window]').count() && !(await page.getByText('先へ進む').count()) && !(await page.getByText('戦闘を始める').count())) {
      const opts = page.locator('[data-event-window] button:not([disabled])');
      if (await opts.count()) {
        if (!seen.has('random-event')) {
          seen.add('random-event');
          await check(page, 'random-event');
          await page.screenshot({ path: `screenshots/adv-random-event.png` });
        }
        await opts.last().click();
        continue;
      }
    }
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
