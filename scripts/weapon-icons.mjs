// 武器のアイコンの確認: npm run build && npx vite preview --port 4173 を起動した状態で node scripts/weapon-icons.mjs
// 世界マップで「パーティ・装備」→ 武器の欄を開き、持ち物に15種類の武器を1本ずつ入れて、
// どれも描いた絵（item/<種類>.webp）で出ること・仮の記号（★）が出ないこと・画面が崩れないことを調べる。
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

// 種類ごとに1本（ふつうの武器）
const WEAPONS = {
  sword: 'copperSword', staff: 'oakStaff', hammer: 'oakHammer', bow: 'hunterBow',
  axe: 'woodAxe', fist: 'clothWraps', dagger: 'rustyDagger', spear: 'ironSpear', katana: 'plainKatana', tome: 'apprenticeTome',
  scythe: 'rustyScythe', scepter: 'woodScepter', whip: 'leatherWhip', instrument: 'travelerLute', gun: 'antiqueGun',
};

mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch();
let problems = 0;
for (const [w, h] of [[360, 640], [390, 844], [480, 854]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false }));
  });
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText('1人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(300);
  // 保存データを書き換えて、全員の持ち物に15種類の武器を入れる（物語も閉じる）
  await page.evaluate((ids) => {
    const k = 'card-rpg/adventure';
    const d = JSON.parse(localStorage.getItem(k));
    d.game.world.story = undefined;
    for (const hero of d.game.heroes) hero.stash = ids.map((itemId, i) => ({ uid: `wi${hero.id}${i}`, itemId }));
    localStorage.setItem(k, JSON.stringify(d));
  }, Object.values(WEAPONS));
  await page.reload();
  await page.getByText('つづきから').click();
  await page.waitForTimeout(300);
  await page.getByText('パーティ・装備').click().catch(async () => page.locator('[data-party-row] button').first().click());
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^武器/ }).first().click();
  await page.waitForTimeout(500);
  const tag = `weapon-icons-${w}x${h}`;
  await page.screenshot({ path: `screenshots/${tag}.png` });
  // 持ち物の武器の欄（15本）を、前半・後半に分けて撮る（目で見分けられるかの確認用）
  const list = page.locator('div.rounded-xl', { hasText: '持ち物の武器' }).last();
  await list.getByText('鉄の槍', { exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `screenshots/${tag}-list1.png` });
  await list.getByText('古式銃', { exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `screenshots/${tag}-list2.png` });
  const report = await layoutIssues(page);
  // 持ち物の武器の欄に、15種類すべての絵が読み込まれて、見分けられる大きさで出ているか
  const found = await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .map((img) => {
        const m = /\/(\w+)-[\w-]+\.webp$/.exec(img.currentSrc || img.src);
        const r = img.getBoundingClientRect();
        return m && { icon: m[1], ok: img.complete && img.naturalWidth > 0, w: r.width, h: r.height };
      })
      .filter(Boolean),
  );
  for (const icon of Object.keys(WEAPONS)) {
    const hit = found.filter((f) => f.icon === icon);
    if (!hit.length) report.push(`no image: ${icon}`);
    else if (!hit.some((f) => f.ok)) report.push(`not loaded: ${icon}`);
    else if (!hit.some((f) => f.w >= 30 && f.h >= 30)) report.push(`too small: ${icon} ${hit.map((f) => `${f.w.toFixed(0)}x${f.h.toFixed(0)}`).join(',')}`);
  }
  // 仮の記号（lucide の星）が武器の欄に残っていないか
  const stars = await list.locator('svg.lucide-star').count();
  if (stars) report.push(`fallback star icons: ${stars}`);
  report.push(...errors.map((e) => `pageerror: ${e}`));
  const uniq = [...new Set(report)];
  console.log(tag, uniq.length ? uniq : 'OK');
  problems += uniq.length;
  await ctx.close();
}
await browser.close();
if (problems) {
  console.log(`problems: ${problems}`);
  process.exit(1);
}
