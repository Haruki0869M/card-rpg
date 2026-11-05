// 確認スクリプトの共通部品
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
export const { chromium } = require('playwright');
export const URL = process.env.URL ?? 'http://localhost:4173/card-rpg/';

/**
 * 新しい冒険を始めて（人数を指定）、翠の神殿の最初の部屋で戦闘を始める。
 * enemies を渡すと、最初の部屋の敵をその組み合わせに差し替える（敵1〜4体の確認用）。
 */
export async function startBattle(page, partySize, enemies, fast = true) {
  await page.goto(URL);
  await page.evaluate((fast) => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: fast, vibration: false }));
  }, fast);
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText(`${partySize}人`, { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await page.getByText('冒険に出発').click();
  await page.getByText('翠の神殿').first().click();
  await page.waitForTimeout(300);
  if (enemies) {
    await page.evaluate((enemies) => {
      const k = 'card-rpg/adventure';
      const d = JSON.parse(localStorage.getItem(k));
      d.game.dungeon.rooms.find((r) => r.id === 'r0c0').enemies = enemies.map((defId) => ({ defId, level: 3 }));
      localStorage.setItem(k, JSON.stringify(d));
    }, enemies);
    await page.reload();
    await page.getByText('つづきから').click();
  }
  await page.getByLabel('戦闘').first().click();
  await page.getByText('この部屋へ進む').click();
  await page.waitForTimeout(400);
}

export async function layoutIssues(page) {
  return page.evaluate(() => {
    const out = [];
    const de = document.documentElement;
    if (de.scrollHeight > innerHeight + 1 || de.scrollWidth > innerWidth + 1) out.push(`page overflow ${de.scrollWidth}x${de.scrollHeight}`);
    const game = document.querySelector('.game-bg') ?? document.body;
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    // スクロールできる領域の中は、画面外にあってもスクロールで見られるので対象外
    const inScroller = (el) => {
      for (let p = el.parentElement; p && p !== game; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll)/.test(cs.overflowX + cs.overflowY)) return true;
      }
      return false;
    };
    for (const el of game.querySelectorAll('button, [data-card-index], [data-enemy], [data-ally]')) {
      if (!visible(el) || inScroller(el)) continue;
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
