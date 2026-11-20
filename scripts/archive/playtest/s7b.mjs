import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
const btns = async () => (await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled).map(b => b.textContent.trim().slice(0,22) + '|' + (b.getAttribute('aria-label')||'')).join(' ; ')));
await loadSave(page, 'scripts/archive/playtest/shots/save-reward2.json');
await page.waitForTimeout(1200);
await page.getByText('最大HP +8').first().click(); await page.waitForTimeout(900);
await page.getByText('最大HP +8').first().click(); await page.waitForTimeout(900);
await page.getByText('レオンはカードを選ばない').click(); await page.waitForTimeout(900);
await page.getByText('セシルはカードを選ばない').click(); await page.waitForTimeout(900);
await page.getByText('先へ進む').click(); await page.waitForTimeout(1200);
await shot('07d-room'); console.log(await text()); console.log(await btns());
for (let k = 0; k < 4; k++) {
  const b = await btns();
  const pick = ['前進', '左へ', '右へ'].find(x => b.includes(x + '|'));
  if (!pick) { console.log('no move'); break; }
  await page.getByRole('button', { name: new RegExp('^' + pick) }).first().click();
  for (let i = 0; i < 3; i++) { await page.waitForTimeout(300); await shot(`07e-walk-${k}-${i}`); }
  console.log(pick, (await text()).slice(0, 300));
}
await issues('walk');
await browser.close();
console.log('errors', errors);
