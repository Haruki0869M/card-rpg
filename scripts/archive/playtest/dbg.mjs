import { open, loadSave } from './common.mjs';
const { browser, page } = await open();
await loadSave(page, 'scripts/archive/playtest/shots/save-rolled.json', (g, s) => { g.world.move = 3; }, 0);
console.log(await page.evaluate(() => [...document.querySelectorAll('[data-reach]')].map(e => e.getAttribute('data-reach')).join(',')));
console.log(await page.evaluate(() => document.body.innerText.slice(0, 600)));
await browser.close();
