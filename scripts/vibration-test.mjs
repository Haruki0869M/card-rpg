// 設定の「振動を試す」の確認（390px）:
// 1) 振動の設定が OFF でも、押すと navigator.vibrate(200) が呼ばれる。例外が出ない
// 2) 振動が使えない端末（navigator.vibrate が無い）では「この端末では振動が使えません」と出る。例外が出ない
// 3) 表示の問題（layoutIssues）が無い
// 使い方: npx vite preview を起こしてから node scripts/vibration-test.mjs（URL=... で場所を変えられる）
import { chromium, layoutIssues, URL } from './lib.mjs';

const browser = await chromium.launch();
const problems = [];
for (const supported of [true, false]) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((sup) => {
    window.__vib = [];
    if (sup) Object.defineProperty(navigator, 'vibrate', { configurable: true, value: (p) => { window.__vib.push(p); return true; } });
    else Object.defineProperty(navigator, 'vibrate', { configurable: true, value: undefined });
  }, supported);
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false })); });
  await page.reload();
  await page.getByText('設定', { exact: true }).first().click();
  await page.waitForTimeout(200);
  await page.locator('[data-vibration-test]').click();
  await page.waitForTimeout(200);
  const calls = await page.evaluate(() => window.__vib);
  const note = await page.locator('[data-vibration-note]').count();
  if (supported) {
    if (JSON.stringify(calls) !== '[200]') problems.push(`振動が OFF の時に押しても vibrate(200) が呼ばれない（${JSON.stringify(calls)}）`);
    if (note) problems.push('振動が使える端末なのに「使えません」が出る');
  } else if (!note) problems.push('振動が使えない端末で「この端末では振動が使えません」が出ない');
  const issues = await layoutIssues(page);
  if (issues.length) problems.push(`表示の問題: ${issues.join(' / ')}`);
  if (errors.length) problems.push(`例外: ${errors.join(' / ')}`);
  await page.screenshot({ path: `scripts/screenshots/vibration-test-${supported ? 'ok' : 'none'}.png` });
  await page.close();
  console.log(`${supported ? '振動が使える端末' : '振動が使えない端末'}: 確認済み（呼ばれた値 ${JSON.stringify(calls)}）`);
}
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: 設定の「振動を試す」（OFF でも 200ms・非対応の端末の案内・例外なし）');
