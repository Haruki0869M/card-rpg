// レイアウト確認: npm run build && npx vite preview --port 4173 を起動した状態で node scripts/check-layout.mjs
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, startBattle } from './lib.mjs';

mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch();
let problems = 0;
const configs = [
  [1, ['goblinBrute']],
  [2, ['goblinBrute', 'chaosShaman', 'goblinScout']],
  [3, ['forestWolf', 'toxicShroom']],
  [4, ['treeWarden', 'chaosShaman', 'forestWolf', 'toxicShroom']],
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
// 冒険の準備・キャラ作成・タイトル（フェーズ3 項目3）: 難易度の説明・担当の2択・出発のボタンの光・レーダーの文字・ゲーム内の上書きの確認
for (const [w, h] of [[360, 640], [390, 844], [480, 860]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const report = [];
  const ng = (msg) => report.push(msg);
  page.on('pageerror', (e) => ng(`pageerror: ${e.message}`));
  page.on('dialog', (d) => { ng('ブラウザの確認の窓が出た'); void d.dismiss(); });
  const tag = `${w}x${h}-setup`;
  await page.goto(process.env.URL ?? 'http://localhost:4173/card-rpg/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false })); });
  await page.reload();
  await page.getByText('新しい冒険', { exact: true }).click();
  for (const d of ['やさしい', 'ふつう', 'むずかしい']) {
    await page.getByText(d, { exact: true }).click();
    const text = await page.locator('[data-difficulty-text]').textContent();
    if (/HP×|攻撃×|\d\.\d/.test(text) || !text.includes('命の灯火')) ng(`難易度の説明に倍率が出ている: ${text}`);
  }
  await page.getByText('ふつう', { exact: true }).click();
  report.push(...(await layoutIssues(page)));
  await page.screenshot({ path: `screenshots/${tag}-setup.png` });
  await page.getByText('2人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  if ((await page.locator('[data-seat-mode]').getAttribute('data-seat-mode')) !== 'solo') ng('担当の最初の選択が「1人で全員を操作」ではない');
  if (!(await page.locator('[data-depart="waiting"]').count()) || !(await page.locator('[data-unseen-hint]').count())) ng('2人目を見る前から出発のボタンが光っている');
  // 2人目を見ずに押すと、ゲーム内で1回だけ確かめる
  await page.getByText('冒険に出発').click();
  const ask = page.getByRole('dialog', { name: 'このまま出発しますか？' });
  if (!(await ask.count())) ng('2人目を見ずに出発する時の確認が出ない');
  else { await page.waitForTimeout(400); await page.screenshot({ path: `screenshots/${tag}-create-ask.png` }); await ask.getByText('やめる', { exact: true }).click(); }
  // レーダーの下の文字（器用・感知）が、下の「冒険に出発」の欄に隠れない
  // （レーダーを画面の一番下に寄せた時に、文字が絵の枠からも、下の欄からもはみ出さない）
  await page.locator('[data-radar]').evaluate((svg) => svg.scrollIntoView({ block: 'end' }));
  await page.waitForTimeout(150);
  const radar = await page.locator('[data-radar]').evaluate((svg) => {
    const foot = document.querySelector('[data-depart]').parentElement.getBoundingClientRect().top;
    const box = svg.getBoundingClientRect();
    const low = Math.max(...[...svg.querySelectorAll('text')].map((t) => t.getBoundingClientRect().bottom));
    return Math.max(low - foot, low - box.bottom);
  });
  if (radar > 0) ng(`レーダーの文字が出発のボタンの欄に ${radar.toFixed(0)}px 重なる`);
  await page.getByText('2人目', { exact: true }).click();
  if (!(await page.locator('[data-depart="ready"]').count())) ng('全員のタブを見ても出発のボタンが光らない');
  await page.locator('[data-seat-choice="pass"]').click();
  await page.locator('[data-seat-detail]').click();
  if (!(await page.locator('[data-seat-detail]').textContent()).includes('P2')) ng('「スマホを回して」で2人目が P2 にならない');
  report.push(...(await layoutIssues(page)));
  await page.screenshot({ path: `screenshots/${tag}-create.png` });
  await page.getByText('1人目', { exact: true }).click();
  await page.getByText('冒険に出発').click();
  await page.waitForTimeout(300);
  const players = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.heroes.map((x) => x.playerId).join(','));
  if (players !== 'P1,P2') ng(`「スマホを回して」の担当が保存されていない: ${players}`);
  // タイトル: 「つづきから」の説明と、ゲーム内の上書きの確認
  await page.reload();
  const sum = await page.locator('[data-continue-summary]').textContent();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `screenshots/${tag}-title.png` });
  const sumBox = await page.locator('[data-continue-summary]').evaluate((e) => e.scrollHeight - e.clientHeight);
  if (sumBox > 1) ng('「つづきから」の説明が切れている');
  if (sum.startsWith('・') || !sum.includes('所持金の合計')) ng(`「つづきから」の説明: ${sum}`);
  await page.getByText('新しい冒険', { exact: true }).click();
  const over = page.getByRole('dialog', { name: '新しい冒険を始めますか？' });
  if (!(await over.count())) ng('上書きの確認がゲーム内に出ない');
  else {
    await page.waitForTimeout(400);
    report.push(...(await layoutIssues(page)));
    await page.screenshot({ path: `screenshots/${tag}-title-confirm.png` });
    await over.getByText('やめる', { exact: true }).click();
  }
  const uniq = [...new Set(report)];
  console.log(tag, uniq.length ? uniq : 'OK', `（つづきから: ${sum}）`);
  problems += uniq.length;
  await ctx.close();
}
await browser.close();
process.exit(problems ? 1 : 0);
