// 転職の画面の確認: 世界マップで剣士をLv6にして、パーティ → 転職先を見る → 剣豪に転職 → 専用カードを1枚選ぶ
// 使い方: npx vite preview を起こしてから node scripts/jobchange.mjs
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 });
const shot = (n) => page.screenshot({ path: `scripts/screenshots/job-${n}.png` });
const fail = async (msg) => {
  await shot('fail');
  console.error('NG:', msg);
  await browser.close();
  process.exit(1);
};

await page.goto(URL);
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false }));
});
await page.reload();
await page.getByText('新しい冒険').click();
await page.getByText('1人', { exact: true }).click();
await page.getByText('キャラクター作成へ').click();
await depart(page);
await page.waitForTimeout(300);
// 剣士をLv6に（物語も閉じる）
await page.evaluate(() => {
  const k = 'card-rpg/adventure';
  const d = JSON.parse(localStorage.getItem(k));
  d.game.world.story = undefined;
  d.game.heroes[0].level = 6;
  d.game.heroes[0].exp = 4;
  localStorage.setItem(k, JSON.stringify(d));
});
await page.reload();
await page.getByText('つづきから').click();
await page.waitForTimeout(300);
if (!(await page.getByLabel('転職できます').count())) await fail('世界マップに転職の印が出ない');
await page.locator('[data-party-row] button').first().click();
await page.getByText('転職先を見る').click();
await page.waitForTimeout(200);
await shot('list');
const issues1 = await layoutIssues(page);
if (issues1.length) console.log('転職の一覧の表示の問題:', issues1);
await page.getByText('剣豪に転職する').click();
await page.getByRole('dialog').getByText('転職する').click();
await page.waitForTimeout(300);
if (!(await page.locator('[data-job-pick]').count())) await fail('専用カードの3択が出ない');
await shot('pick');
const issues2 = await layoutIssues(page);
if (issues2.length) console.log('3択の表示の問題:', issues2);
await page.getByLabel('一閃').click();
await page.getByText('このカードにする').click();
await page.waitForTimeout(300);
if (await page.locator('[data-job-pick]').count()) await fail('3択が閉じない');
const hero = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.heroes[0]);
if (hero.classId !== 'swordmaster' || hero.level !== 1 || !hero.deck.some((c) => c.cardId === 'flashCut')) await fail(`転職の結果がおかしい: ${hero.classId} Lv${hero.level}`);
console.log(`OK: ${hero.name} 剣豪 Lv${hero.level} EXP${hero.exp}・一閃を獲得・持ち越し=${hero.carried}`);

// 最上位: レベル不足でも条件7/60が見え、聖堂で剣聖へ転職して専用カードを選べる。
const baseSave = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')));
for (const width of [360, 390, 480]) {
  await page.setViewportSize({ width, height: 780 });
  const seed = structuredClone(baseSave);
  seed.game.heroes[0].level = 6;
  seed.game.heroes[0].feats = { perfects: 7 };
  await page.evaluate((d) => localStorage.setItem('card-rpg/adventure', JSON.stringify(d)), seed);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.locator('[data-party-row] button').first().click();
  await page.getByText('転職先を見る', { exact: true }).click();
  // フェーズ2-A: レベルと条件を1か所に、✓/✗と進み具合の棒つきで出す（同じ文を2回出さない）
  const reqs = page.locator('[data-job-reqs]').filter({ hasText: '完全成功60回' });
  if (!(await reqs.first().isVisible())) await fail(`${width}px: 条件の一覧が見えない`);
  if (!(await reqs.first().getByText('7/60', { exact: true }).isVisible())) await fail(`${width}px: 条件の進捗（7/60）が見えない`);
  if (!(await reqs.first().locator('[data-job-req="ng"]').filter({ hasText: 'Lv7以上（今 Lv6）' }).count())) await fail(`${width}px: レベルの不足（✗ Lv7以上）が見えない`);
  if (!(await reqs.first().locator('[data-job-progress]').count())) await fail(`${width}px: 進み具合の棒が無い`);
  const dup = await page.getByText('完全成功60回', { exact: false }).count();
  if (dup !== await page.locator('[data-job-reqs]').filter({ hasText: '完全成功60回' }).count()) await fail(`${width}px: 条件の文が2回出ている（${dup}）`);
  await page.waitForTimeout(250);
  await shot(`top-progress-${width}`);
  seed.game.heroes[0].level = 7;
  seed.game.heroes[0].feats.perfects = 60;
  await page.evaluate((d) => localStorage.setItem('card-rpg/adventure', JSON.stringify(d)), seed);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.getByText('王都クリスタリアに入る', { exact: true }).click();
  await page.getByText('聖堂（転職）', { exact: true }).click();
  await page.getByText('剣聖に転職する', { exact: true }).click();
  await page.getByRole('dialog').getByText('転職する', { exact: true }).click();
  await page.getByRole('button', { name: '天剣', exact: true }).click();
  await page.waitForTimeout(250);
  const issues = await page.locator('[data-job-pick]').evaluate((el) => {
    const out = [];
    for (const button of el.querySelectorAll('button')) {
      const r = button.getBoundingClientRect();
      if (r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight) out.push('選択ボタンのはみ出し');
    }
    for (const e of el.querySelectorAll('*')) if ([...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12) out.push('12px未満の文字');
    return out;
  });
  if (issues.length) await fail(`${width}px: ${issues.join('・')}`);
  await shot(`top-pick-${width}`);
  await page.getByText('このカードにする', { exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.heroes[0].deck.some(c => c.cardId === 'heavenBlade'));
  const top = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.heroes[0]);
  if (top.classId !== 'swordSaint' || top.level !== 1 || !top.deck.some(c => c.cardId === 'heavenBlade') || top.carried !== 'swordmaster') await fail(`${width}px: 最上位への転職結果が不正`);
  console.log(`OK: ${width}px 条件7/60・聖堂で剣聖へ転職・天剣を獲得`);
}
await browser.close();
