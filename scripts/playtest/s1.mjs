import { open } from './common.mjs';
const { browser, page, shot, text, issues, fresh, errors } = await open();
await fresh();
// 前の冒険があるときの確認を出すため、一度はじめる
await shot('01a-title-empty');
console.log(await text());
await page.getByText('新しい冒険').click(); await page.waitForTimeout(400);
await shot('01b-setup');
console.log(await text()); await issues('setup');
await page.getByText('2人', { exact: true }).click(); await page.waitForTimeout(200);
await shot('01c-setup-2p');
await page.getByText('キャラクター作成へ').click(); await page.waitForTimeout(400);
await shot('02a-create-p1');
console.log(await text()); await issues('create');
console.log(await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim().slice(0,20) + '|' + (b.getAttribute('aria-label')||'')).join(' ; ')));
await browser.close();
console.log('errors', errors);
