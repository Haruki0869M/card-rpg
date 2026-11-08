// 伝承の書（K5）の画面の確認:
//  1) 記録が空の時: タイトル →「伝承の書」→ 6つのタブが開き、見ていない物は「？？？」で押せない
//  2) 冒険を始めると、最初のジョブ・山札が記録される（冒険の状態は変えない）
//  3) 記録を入れた状態で、各タブの一覧と詳細が 360/390/480px で崩れない
// 使い方: npx vite preview を起こしてから node scripts/lorebook.mjs
import { chromium, layoutIssues, URL } from './lib.mjs';

const OUT = process.env.LOREBOOK_OUTPUT ?? 'scripts/screenshots';
const browser = await chromium.launch();
let failed = false;
const TABS = ['pets', 'jobs', 'cards', 'items', 'enemies', 'record'];

for (const width of [360, 390, 480]) {
  const page = await browser.newPage({ viewport: { width, height: 780 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (n) => page.screenshot({ path: `${OUT}/lore-${width}-${n}.png` });
  const ng = async (msg) => {
    failed = true;
    console.error(`NG（${width}px）:`, msg);
    await shot('fail');
  };
  const check = async (where) => {
    const list = await layoutIssues(page);
    if (list.length) await ng(`${where}の表示の問題: ${JSON.stringify(list)}`);
  };
  const openBook = async () => {
    await page.getByText('伝承の書', { exact: true }).click();
    await page.locator('[data-lorebook]').waitFor();
  };

  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false }));
  });
  await page.reload();

  // 1) 空の記録
  await openBook();
  if (await page.locator('[data-lore-cell="seen"], [data-lore-cell="got"]').count()) await ng('空の記録なのに見た物がある');
  if (!(await page.locator('[data-lore-cell="none"]').count())) await ng('「？？？」の枠が無い');
  await shot('empty');
  await check('空の伝承の書');
  await page.getByLabel('閉じる').click();

  // 2) 冒険を始めると記録される
  await page.getByText('新しい冒険').click();
  await page.getByText('1人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await page.getByText('冒険に出発').click();
  await page.waitForTimeout(800);
  const prof = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/profile') ?? 'null'));
  if (!prof || !prof.jobs.got.length || !prof.cards.got.length || prof.adventures !== 1) await ng(`冒険を始めても記録されない: ${JSON.stringify(prof && { jobs: prof.jobs, adventures: prof.adventures })}`);

  // 3) 記録を入れてから、各タブ
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('card-rpg/profile'));
    p.pets = { seen: ['cockatiel:normal', 'cockatiel:lutino', 'owl:brown'], got: ['cockatiel:normal'] };
    p.enemies.seen.push('goblinScout');
    p.enemies.kills = { goblinScout: 3 };
    p.clears = { corruptionKing: 1 };
    localStorage.setItem('card-rpg/profile', JSON.stringify(p));
  });
  await page.goto(URL);
  await openBook();
  for (const tab of TABS) {
    await page.locator(`[data-lore-tab="${tab}"]`).click();
    await page.waitForTimeout(150);
    await shot(`${tab}`);
    await check(`伝承の書「${tab}」`);
    const cell = page.locator('[data-lore-cell="got"], [data-lore-cell="seen"]').first();
    if (tab !== 'record') {
      if (!(await cell.count())) {
        await ng(`「${tab}」に記録した物が出ない`);
        continue;
      }
      await cell.click();
      await page.locator('[data-lore-detail]').waitFor();
      await shot(`${tab}-detail`);
      await check(`伝承の書「${tab}」の詳細`);
      await page.locator('[data-lore-detail]').getByText('閉じる', { exact: true }).click();
    }
  }
  if (errors.length) await ng(`ページのエラー: ${errors.join(' / ')}`);
  await page.close();
}
await browser.close();
if (failed) process.exit(1);
console.log('OK: 伝承の書（360/390/480px）');
