// 確認スクリプトの共通部品
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
export const { chromium } = require('playwright');
export const URL = process.env.URL ?? 'http://localhost:4173/card-rpg/';

/** テスト戦闘の設定から、人数と敵の組み合わせを選んで戦闘を始める */
export async function startBattle(page, partySize, encounterName, fast = true) {
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel('メニュー').click();
  if (fast) await page.getByText('高速モード').click();
  await page.getByText('テスト戦闘の設定').click();
  for (let i = 0; i < 3; i++) {
    const minus = page.getByLabel('人数を減らす');
    if (await minus.isEnabled()) await minus.click();
  }
  for (let i = 1; i < partySize; i++) await page.getByLabel('人数を増やす').click();
  if (encounterName) await page.getByText(encounterName).click();
  await page.getByText('この設定で戦闘開始').click();
  await page.waitForTimeout(400);
}

export async function layoutIssues(page) {
  return page.evaluate(() => {
    const out = [];
    const de = document.documentElement;
    if (de.scrollHeight > innerHeight + 1 || de.scrollWidth > innerWidth + 1) out.push(`page overflow ${de.scrollWidth}x${de.scrollHeight}`);
    const game = document.querySelector('.game-bg');
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    for (const el of game.querySelectorAll('button, [data-card-index], [data-enemy], [data-ally]')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.left < -1 || r.top < -1)
        out.push(`offscreen: "${el.textContent.slice(0, 16)}" ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
    }
    for (const el of game.querySelectorAll('button')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5) out.push(`small button: "${el.textContent.slice(0, 12)}" ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
    }
    // 重なったカードの押せる幅
    const cs = [...game.querySelectorAll('[data-card-index]')].map((e) => e.getBoundingClientRect());
    for (let i = 0; i + 1 < cs.length; i++) {
      const dx = cs[i + 1].left - cs[i].left;
      if (Math.abs(cs[i + 1].top - cs[i].top) < 30 && dx < 43.5) out.push(`card strip ${i}: ${dx.toFixed(0)}px`);
    }
    // 敵・味方の押せる大きさ
    for (const el of game.querySelectorAll('[data-enemy]:not([data-dead]), [data-ally]')) {
      const r = el.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5) out.push(`small target ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
    }
    // 12px未満の文字
    const small = new Set();
    for (const el of game.querySelectorAll('*')) {
      if (![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
      if (!visible(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 12) small.add(`${fs}px "${el.textContent.trim().slice(0, 10)}"`);
    }
    out.push(...[...small].map((s) => `small text ${s}`));
    return out;
  });
}
