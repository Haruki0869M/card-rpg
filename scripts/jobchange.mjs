// 転職の画面の確認: 世界マップで剣士をLv5にして、パーティ → 転職先を見る → 剣豪に転職 → 専用カードを1枚選ぶ
// 使い方: npx vite preview を起こしてから node scripts/jobchange.mjs
import { chromium, layoutIssues, URL } from './lib.mjs';

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
  localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false }));
});
await page.reload();
await page.getByText('新しい冒険').click();
await page.getByText('1人', { exact: true }).click();
await page.getByText('キャラクター作成へ').click();
await page.getByText('冒険に出発').click();
await page.waitForTimeout(300);
// 剣士をLv5に（物語も閉じる）
await page.evaluate(() => {
  const k = 'card-rpg/adventure';
  const d = JSON.parse(localStorage.getItem(k));
  d.game.world.story = undefined;
  d.game.heroes[0].level = 5;
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
await browser.close();
