import { open, loadSave } from './common.mjs';
const { browser, page, text, errors } = await open({ dsf: 1 });
let n = 0;
const film = async (tag, count, gap = 250) => { for (let i = 0; i < count; i++) { await page.screenshot({ path: `scripts/playtest/shots/09-${String(n++).padStart(3, '0')}-${tag}.jpg`, type: 'jpeg', quality: 75 }); await page.waitForTimeout(gap); } };
await loadSave(page, 'scripts/playtest/shots/save-battle.json');
await page.waitForTimeout(1500);
const play = async (tag) => {
  await page.locator('[data-card-index]').first().waitFor();
  const names = await page.evaluate(() => [...document.querySelectorAll('[data-card-index]')].map(e => e.textContent));
  // 攻撃カード優先
  let idx = names.findIndex(t => /ストライク|シールド|ヘビー/.test(t)); if (idx < 0) idx = 0;
  await page.locator(`[data-card-index="${idx}"]`).click(); await page.waitForTimeout(300);
  if (await page.locator('[data-enemy]:not([data-dead])').count()) await page.locator('[data-enemy]:not([data-dead])').first().click().catch(() => {});
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /発動/ }).click();
  await film(tag, 10);
};
await play('c1'); await play('c2'); await play('c3');
console.log(await text());
await page.getByRole('button', { name: 'ターン終了' }).click();
await film('end', 28);
console.log(await text());
await browser.close();
console.log('errors', errors);
