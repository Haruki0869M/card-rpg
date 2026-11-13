// 3つ目の地域の町の店に「属性の付与」の装飾品が必ず並ぶ事の画面の確認（2026-11-13・docs/tasks/break-read-plan.md §3）
// - シナリオ1 の沼のほとりの町（swampHamlet）に入り、店の品に featured の品が1つある・その行に「属性の無い物理攻撃が〇属性になる」が読める
// - 長押しの詳しい説明にも同じ文が出る。360×640・390×844 で撮る。はみ出し・重なりを見る
// 使い方: URL=http://127.0.0.1:<番号>/card-rpg/ node scripts/featured-shop.mjs
import { mkdir } from 'node:fs/promises';
import { chromium, depart, layoutIssues, URL } from './lib.mjs';

const dir = 'screenshots/featured-shop';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const problems = [];

for (const [width, height] of [[360, 640], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ng = (t) => problems.push(`${width}x${height}: ${t}`);
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
  // 保存を書き換えて、沼のほとりの町のマスへ（物語は閉じる）
  await page.evaluate(() => {
    const k = 'card-rpg/adventure';
    const d = JSON.parse(localStorage.getItem(k));
    const w = d.game.world;
    const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'town' && x.f.id === 'swampHamlet');
    for (const id of Object.keys(w.pos)) w.pos[id] = t;
    w.story = undefined;
    for (const h of d.game.heroes) h.gold = 2000;
    localStorage.setItem(k, JSON.stringify(d));
  });
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByText(/に入る$/).first().click();
  await page.waitForTimeout(400);
  const g = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game);
  if (g.mode !== 'town' || g.town?.townId !== 'swampHamlet') { ng(`沼のほとりの町に入れない（${g.mode} ${g.town?.townId}）`); await page.close(); continue; }
  const stock = g.world.shops.swampHamlet;
  const featured = stock?.items.filter((x) => x.featured) ?? [];
  if (featured.length !== 1) ng(`必ず並ぶ品が1つでない（${featured.length}）`);
  const f = featured[0];
  if (f) {
    const row = page.locator(`[data-shop-row="${f.item.uid}"]`);
    await row.scrollIntoViewIfNeeded();
    const text = (await row.innerText()).replace(/\s+/g, ' ');
    console.log(`${width}x${height}: 必ず並ぶ品の行「${text}」`);
    if (!/属性の無い物理攻撃が.属性になる/.test(await row.locator('span.block').first().textContent())) ng(`行の説明に「属性の無い物理攻撃が〇属性になる」が無い（${text}）`);
    if (!text.includes(`${f.price}G`) && !text.includes(String(f.price))) ng(`値段 ${f.price} が行に無い（${text}）`);
    const issues = await layoutIssues(page);
    if (issues.length) ng(`並び: ${issues.join(' / ')}`);
    await page.screenshot({ path: `${dir}/${width}x${height}-row.png` });
    // 長押しの詳しい説明
    await row.locator('[data-item-detail]').click();
    await page.waitForTimeout(300);
    const body = await page.locator('body').innerText();
    if (!/属性の無い物理攻撃が.属性になる/.test(body)) ng('詳しい説明に「属性の無い物理攻撃が〇属性になる」が無い');
    await page.screenshot({ path: `${dir}/${width}x${height}-detail.png` });
  }
  if (errors.length) ng(`画面の例外 ${errors.join(' / ')}`);
  await page.close();
}
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: 3つ目の地域の町の店に「属性の付与」の装飾品が1つ並び、説明が読める（360×640・390×844）');
