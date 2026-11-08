import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
await loadSave(page, 'scripts/playtest/shots/save-event.json');
await page.waitForTimeout(800);
await page.getByText('エサを買って分けてあげる').click(); await page.waitForTimeout(300);
await shot('05a-choice');
console.log(await text());
// 判定などの演出
for (let i = 0; i < 4; i++) { await page.waitForTimeout(400); await shot(`05b-after-${i}`); }
console.log(await text());
await page.getByText('先へ進む').click();
for (let i = 0; i < 8; i++) { await page.waitForTimeout(300); await shot(`05c-adopt-${i}`); }
console.log(await text()); await issues('adopt');
await page.getByLabel('お供の名前').fill('ぴーちゃん');
await shot('05d-named');
await page.getByText('お供にする').click();
for (let i = 0; i < 4; i++) { await page.waitForTimeout(400); await shot(`05e-map-${i}`); }
console.log(await text());
const save = await page.evaluate(() => localStorage.getItem('card-rpg/adventure'));
(await import('node:fs')).writeFileSync('scripts/playtest/shots/save-pet.json', save);
await browser.close();
console.log('errors', errors);
