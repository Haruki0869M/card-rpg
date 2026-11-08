import { open } from './common.mjs';
const { browser, page, shot, text, issues, fresh, errors } = await open();
await fresh();
await page.getByText('新しい冒険').click(); await page.waitForTimeout(300);
await page.getByText('2人', { exact: true }).click();
await page.getByText('キャラクター作成へ').click(); await page.waitForTimeout(400);
// 1人目: 下へスクロールしてレーダーと特殊能力
await page.mouse.wheel(0, 700); await page.waitForTimeout(300);
await shot('02b-create-p1-scroll');
await page.mouse.wheel(0, 900); await page.waitForTimeout(300);
await shot('02c-create-p1-bottom');
await page.mouse.wheel(0, -3000); await page.waitForTimeout(300);
// 2人目へ
await page.getByRole('button', { name: /2人目/ }).click(); await page.waitForTimeout(400);
await shot('02d-create-p2');
console.log(await text());
// 魔道士→僧侶
await page.getByRole('button', { name: '僧侶', exact: true }).click(); await page.waitForTimeout(400);
await shot('02e-create-p2-priest');
await page.getByRole('button', { name: '女', exact: true }).click().catch(()=>{});
await page.waitForTimeout(300);
await page.mouse.wheel(0, 700); await page.waitForTimeout(300);
await shot('02f-create-p2-radar');
console.log(await text());
await page.mouse.wheel(0, -3000);
await page.getByText('冒険に出発').click(); await page.waitForTimeout(1200);
await shot('03a-world-start');
console.log(await text()); await issues('world');
await page.waitForTimeout(2500);
await shot('03b-world-start2');
console.log(await text());
const buttons = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim().slice(0,24) + '|' + (b.getAttribute('aria-label')||'')).join(' ; '));
console.log(buttons);
// 保存を写しておく
const save = await page.evaluate(() => localStorage.getItem('card-rpg/adventure'));
(await import('node:fs')).writeFileSync('scripts/playtest/shots/save-start.json', save);
await browser.close();
console.log('errors', errors);
