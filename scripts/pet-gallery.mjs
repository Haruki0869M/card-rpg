// お供12種類×毛色の全部を、迎える画面（ポン！の後）で1枚ずつ撮る（可愛さの確認用。390×780）
// 使い方: vite preview を起こしてから node scripts/pet-gallery.mjs（保存先 screenshots/pet-gallery/）
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, layoutIssues, URL } from './lib.mjs';

const dir = 'screenshots/pet-gallery';
await mkdir(dir, { recursive: true });
// お供の定義（種類と毛色の ID）をデータのファイルから読む
const src = (await readFile('src/content/common/pets/pets.ts', 'utf8')).replace(/\r\n/g, '\n');
const pets = src.split(/\n  \{\n    id: '/).slice(1).map((b) => ({
  id: b.slice(0, b.indexOf("'")),
  colors: [...b.slice(b.indexOf('colors: ['), b.indexOf('],')).matchAll(/\{ id: '(\w+)'/g)].map((m) => m[1]),
}));
if (pets.length !== 12) throw new Error(`お供の数が12ではない: ${pets.length}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 });
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
let n = 0;
const problems = [];
for (const p of pets) {
  for (const color of p.colors) {
    await page.evaluate(({ petId, color }) => {
      const k = 'card-rpg/adventure';
      const d = JSON.parse(localStorage.getItem(k));
      const h = d.game.heroes[0];
      d.game.world.story = undefined;
      d.game.mode = 'world';
      h.petOffer = [petId];
      h.petOfferColors = { [petId]: color };
      localStorage.setItem(k, JSON.stringify(d));
    }, { petId: p.id, color });
    await page.reload();
    await page.getByText('つづきから').click();
    await page.locator('[data-pet-revealed]').waitFor();
    await page.waitForTimeout(500);
    const issues = await layoutIssues(page);
    if (issues.length) problems.push(`${p.id}-${color}: ${issues}`);
    await page.screenshot({ path: `${dir}/${String(++n).padStart(2, '0')}-${p.id}-${color}.png` });
  }
}
await browser.close();
if (problems.length) {
  console.error('NG: 表示の問題', problems);
  process.exit(1);
}
console.log(`OK: お供 ${pets.length}種類・${n}枚を撮った（${dir}）`);
