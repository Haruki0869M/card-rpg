// 箱庭の見比べ: screenshots/diorama/before と after の同じ名前の写真を、左右に並べた1枚にする（地図の所だけ）
// 使い方: node scripts/diorama-compare.mjs（先に diorama-shots.mjs で before と after を撮る）
//   SETS="before:今,after:案" で並べるフォルダと見出しを変えられる（左から順）。OUT_PREFIX=compare で保存名の頭
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from './lib.mjs';

const scenes = [['1-start-day', 'はじまり・昼'], ['1-start-night', 'はじまり・夜'], ['1-start-evening', 'はじまり・夕方'], ['1-start-morning', 'はじまり・朝'], ['2-forest-day', '森・昼'], ['2-forest-night', '森・夜'], ['3-corruption-75', '侵食度75%']];
const sets = (process.env.SETS ?? 'before:今,after:案').split(',').map((x) => x.split(':'));
const prefix = process.env.OUT_PREFIX ?? 'compare';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 20 + sets.length * 406, height: 520 }, deviceScaleFactor: 1 });
const img = (p) => `data:image/png;base64,${readFileSync(resolve(p)).toString('base64')}`;
for (const [n, label] of scenes) {
  const cell = (p, t, c) => `<div><div class="t" style="color:${c}">${t}</div><div class="v"><img src="${img(p)}"></div></div>`;
  await page.setContent(`<style>body{margin:0;background:#141020;font-family:'Meiryo','Yu Gothic',sans-serif}.row{display:flex;gap:16px;padding:10px}.t{font-size:20px;font-weight:bold;margin:2px 4px 6px}.v{width:390px;height:445px;overflow:hidden;position:relative}.v img{position:absolute;top:-115px;left:0;width:390px}</style>
  <div class="row">${sets.map(([dir, name], k) => cell(`screenshots/diorama/${dir}/${n}.png`, `${name}（${label}）`, k ? '#ffd88a' : '#ddd')).join('')}</div>`);
  await page.waitForTimeout(100);
  await page.screenshot({ path: `screenshots/diorama/${prefix}-${n}.png`, fullPage: true });
}
await browser.close();
console.log(`OK: screenshots/diorama/${prefix}-*.png`);
