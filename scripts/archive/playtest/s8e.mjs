import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
await loadSave(page, 'scripts/archive/playtest/shots/save-battle.json');
await page.waitForTimeout(1500);
await page.getByText('セシル').first().click(); await page.waitForTimeout(600);
await page.locator('[data-card-index="1"]').click(); await page.waitForTimeout(500);
console.log(await page.evaluate(() => [...document.querySelectorAll('[data-ally]')].map(e => e.getAttribute('data-ally') + ' ' + e.tagName + ' ' + e.className.slice(0,40) + ' ' + JSON.stringify(e.getBoundingClientRect())).join('\n')));
await page.locator('[data-ally]').nth(1).click(); await page.waitForTimeout(500);
await shot('08h-heal-pick-cecil');
console.log((await text()).match(/回復・支援[^/]*/)?.[0]);
// 発動して演出を見る
await page.getByRole('button', { name: /発動/ }).click();
for (let i = 0; i < 10; i++) { await page.waitForTimeout(250); await shot(`08i-heal-fx-${i}`); }
console.log(await text());
await browser.close();
console.log('errors', errors);
