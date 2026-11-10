import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
const btns = async () => (await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0,22) + '|' + (b.getAttribute('aria-label')||'')).join(' ; ')));
await loadSave(page, 'scripts/archive/playtest/shots/save-reward2.json');
await page.waitForTimeout(1500);
await page.getByText('最大HP +8').first().click(); await page.waitForTimeout(900);
await page.getByText('最大HP +8').first().click(); await page.waitForTimeout(900);
await shot('10f-card-leon');
await page.getByRole('button', { name: /抜き打ち/ }).click(); await page.waitForTimeout(600);
await shot('10g-card-leon-picked'); console.log(await text()); console.log(await btns());
const ok = page.getByRole('button', { name: /加える|決定|受け取る/ }); if (await ok.count()) { await ok.first().click(); await page.waitForTimeout(900); }
await shot('10h-card-cecil'); console.log(await text()); console.log(await btns()); await issues('cecil');
const cards = page.locator('button').filter({ hasText: /%/ });
if (await cards.count()) { await cards.first().click(); await page.waitForTimeout(600); await shot('10i-cecil-picked'); const ok2 = page.getByRole('button', { name: /加える|決定|受け取る/ }); if (await ok2.count()) { await ok2.first().click(); await page.waitForTimeout(900); } }
await shot('10j-after'); console.log(await text()); console.log(await btns());
await browser.close();
console.log('errors', errors);
