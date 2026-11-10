// 町の操作の確認（フェーズ2-A）: 2人で王都に入り、
// 1) キャラを切り替えると上の帯の所持金も切り替わる 2) タブ5つが切れない 3) 最後の段が「世界マップへ」の欄に重ならない
// 4) 装備品を買うと「すぐ装備する」の窓が出て、押すと装備が変わる（担当は P2 にして、1台で P2 以降で止まらないことも見る）
// 使い方: npx vite preview を起こしてから node scripts/town-ux.mjs（URL=... で場所を変えられる）
import { chromium, depart, layoutIssues, URL } from './lib.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
let width = 390;
const shot = (n) => page.screenshot({ path: `scripts/screenshots/town-${n}-${width}.png` });
const fail = async (msg) => {
  await shot('fail');
  console.error('NG:', `${width}px:`, msg);
  await browser.close();
  process.exit(1);
};
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')));

await page.goto(URL);
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false }));
});
await page.reload();
await page.getByText('新しい冒険').click();
await page.getByText('2人', { exact: true }).click();
await page.getByText('キャラクター作成へ').click();
await depart(page);
await page.waitForTimeout(300);
const base = await save();
// 2人目は P2 の担当にして、最初から同行（誘って承知した形）にする。所持金を別々にする
base.game.world.story = undefined;
base.game.heroes[0].gold = 270;
base.game.heroes[1].gold = 2300;
base.game.heroes[1].playerId = 'P2';

for (width of [360, 390, 480]) {
  await page.setViewportSize({ width, height: width === 360 ? 640 : 844 });
  const d = structuredClone(base);
  await page.evaluate((x) => localStorage.setItem('card-rpg/adventure', JSON.stringify(x)), d);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(300);
  // 手番の受け渡しの画面が出ていたら閉じる
  const handoff = page.getByText('スマホを渡して、タップで始める');
  if (await handoff.count()) await handoff.click();
  // 2人目を誘う（1台なのでその場で承知）→ 町に入る
  const invite = page.getByText('誘う', { exact: true });
  if (await invite.count()) await invite.first().click();
  await page.waitForTimeout(150);
  await page.getByText('王都クリスタリアに入る', { exact: true }).click();
  await page.waitForTimeout(300);
  const g = await save();
  if (g.game.mode !== 'town') await fail(`町に入れない（${g.game.mode}）`);
  if ((g.game.town.members ?? []).length < 2) await fail('2人で町に入れていない');
  const topGold = () => page.locator('[data-top-gold]').innerText();
  if ((await topGold()).trim() !== '270G') await fail(`1人目の所持金が上の帯に出ない（${await topGold()}）`);
  // 2人目に切り替え
  await page.locator('[data-facility-members] button').nth(1).click();
  await page.waitForTimeout(150);
  if ((await topGold()).trim() !== '2300G') await fail(`切り替えても上の帯の所持金が変わらない（${await topGold()}）`);
  // タブ5つが切れていない
  const cut = await page.locator('[data-town-tabs] button').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > innerWidth).map((e) => e.innerText));
  if (cut.length) await fail(`タブの文字が切れている: ${cut.join('・')}`);
  if ((await page.locator('[data-town-tabs] button').count()) !== 5) await fail('タブが5つ無い');
  // 最後の段が「世界マップへ」の欄に重ならない（一番下までスクロールして比べる）
  await page.locator('[data-town-body]').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.waitForTimeout(100);
  const overlap = await page.evaluate(() => {
    const body = document.querySelector('[data-town-body]');
    const exit = document.querySelector('[data-town-exit]');
    const last = [...body.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().height > 0).at(-1);
    return last ? last.getBoundingClientRect().bottom - exit.getBoundingClientRect().top : -1;
  });
  if (overlap > 0) await fail(`最後の段が「世界マップへ」の欄に ${overlap.toFixed(1)}px 重なる`);
  await shot('shop-bottom');
  const issues = await layoutIssues(page);
  if (issues.length) await fail(`町の表示の問題: ${issues.join(' / ')}`);
  await page.locator('[data-town-body]').evaluate((el) => el.scrollTo(0, 0));

  // 装備品を買う: 2人目（P2）で、装備品の行を上から順に買い、「すぐ装備する」が出たら押す（ジョブで使えない武器なら次へ）
  // 行の最後のボタンが「買う」（前のボタンは詳細を開く所。Step A）
  const rows = page.locator('[data-town-body] > div > div');
  const names = await rows.allInnerTexts();
  let equipped = false, notices = 0;
  for (let i = 0; i < names.length && !equipped; i++) {
    if (/聖水|ポーション|薬|おやつ|売り切れ/.test(names[i]) || !(await rows.nth(i).locator('button').last().count())) continue;
    if (await rows.nth(i).locator('button').last().isDisabled()) continue;
    const before = JSON.stringify((await save()).game.heroes[1].equipment);
    await rows.nth(i).locator('button').last().click();
    await page.waitForTimeout(250);
    // 2人以上で最後の1つを買う時は「残り1つです」の確認が出る（ステップ2）→ 買う
    const lastOne = page.getByRole('dialog', { name: '残り1つです' });
    if (await lastOne.count()) {
      await lastOne.getByRole('button', { name: '買う' }).click();
      await page.waitForTimeout(250);
    }
    const notice = page.locator('[data-buy-notice]');
    if (!(await notice.count())) await fail(`買った時のお知らせが出ない（${names[i].slice(0, 20)}）`);
    notices++;
    if (notices === 1) await shot('bought');
    if ((await notice.getAttribute('data-buy-notice')) !== 'equip') continue;
    const issues2 = await layoutIssues(page);
    if (issues2.length) await fail(`買った時の窓の表示の問題: ${issues2.join(' / ')}`);
    if (!(await page.locator('[data-equip-now]').count())) {
      await notice.getByText('閉じる', { exact: true }).click();
      await page.waitForTimeout(150);
      continue;
    }
    await page.locator('[data-equip-now]').click();
    await page.waitForTimeout(250);
    const after = (await save()).game.heroes[1];
    if (JSON.stringify(after.equipment) === before) await fail('「すぐ装備する」を押しても装備が変わらない（P2 のキャラ）');
    if (!(await page.getByText('を装備した！', { exact: false }).count())) await fail('装備した時のお知らせが出ない');
    equipped = true;
  }
  if (!equipped) await fail('「すぐ装備する」まで確かめられなかった（装備できる品物が無い）');
  console.log(`OK ${width}px: P2 のキャラが買ってすぐ装備できた`);
  console.log(`OK ${width}px: 所持金の切り替え・タブ・下の余白`);
}
await browser.close();
console.log('town-ux: すべて成功');
