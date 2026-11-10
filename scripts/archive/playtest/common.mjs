// テストプレイ記録用の共通部品（コードは変えない・撮るだけ）
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues } from '../../lib.mjs';
export { layoutIssues };
export const URL = 'http://127.0.0.1:4219/card-rpg/';
export const OUT = 'scripts/archive/playtest/shots';
await mkdir(OUT, { recursive: true });
export async function open({ fast = false, dsf = 2 } = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dsf, hasTouch: true });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
  const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', n); };
  const text = async () => (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, ' / ').slice(0, 1500);
  const issues = async (w) => { const l = await layoutIssues(page); console.log(`[${w}] layout:`, JSON.stringify(l)); };
  const edit = async (fn, arg) => {
    await page.evaluate(({ src, arg }) => {
      const k = 'card-rpg/adventure';
      const d = JSON.parse(localStorage.getItem(k));
      (0, eval)(src)(d.game, arg);
      localStorage.setItem(k, JSON.stringify(d));
    }, { src: fn.toString(), arg });
    await page.reload();
    await page.getByText('つづきから').click();
    await page.waitForTimeout(500);
  };
  const fresh = async () => {
    await page.goto(URL);
    await page.evaluate((fast) => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: fast, vibration: false })); }, fast);
    await page.reload();
    await page.waitForTimeout(500);
  };
  return { browser, page, shot, text, issues, edit, fresh, errors };
}
import { readFileSync } from 'node:fs';
export async function loadSave(page, file, mutate, arg) {
  await page.goto(URL);
  const d = JSON.parse(readFileSync(file, 'utf8'));
  await page.evaluate(({ d, src, arg }) => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false }));
    if (src) (0, eval)(src)(d.game, arg);
    localStorage.setItem('card-rpg/adventure', JSON.stringify(d));
  }, { d, src: mutate?.toString(), arg });
  await page.reload();
  await page.getByText('つづきから').click();
  await page.waitForTimeout(600);
}
