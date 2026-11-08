import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
const btns = async () => console.log('BTN', await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0,22) + '|' + (b.getAttribute('aria-label')||'')).join(' ; ')));
await loadSave(page, 'scripts/playtest/shots/save-reward.json');
await page.waitForTimeout(1500);
await shot('10b-resume');
if (await page.getByText('報酬を受け取る').count()) await page.getByText('報酬を受け取る').click();
for (let i = 0; i < 4; i++) { await page.waitForTimeout(400); await shot(`10c-reward-${i}`); }
console.log(await text()); await btns(); await issues('reward');
await page.mouse.move(195, 500); await page.mouse.wheel(0, 800); await page.waitForTimeout(400);
await shot('10d-reward-scroll');
const save = await page.evaluate(() => localStorage.getItem('card-rpg/adventure'));
(await import('node:fs')).writeFileSync('scripts/playtest/shots/save-reward2.json', save);
await browser.close();
console.log('errors', errors);
