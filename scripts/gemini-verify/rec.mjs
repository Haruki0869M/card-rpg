// Gemini とオーナーの観点の確認テスト（2026-11-09）の撮影の共通部品。コードは変えない・撮るだけ。
// 使い方: NODE_PATH=C:/dev/card-rpg/node_modules PLAYWRIGHT_BROWSERS_PATH=... node scripts/gemini-verify/v1.mjs
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { chromium, layoutIssues } from '../lib.mjs';
export const URL = process.env.URL ?? 'http://127.0.0.1:4215/card-rpg/';
export const OUT = process.env.OUT ?? 'screenshots/gemini-verify';
await mkdir(`${OUT}/tmp-video`, { recursive: true });

export async function start(name, { video = true } = {}) {
  // 前に失敗した回の録画が残っていると、それを取り違えるので消す
  await rm(`${OUT}/tmp-video/${name}`, { recursive: true, force: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true,
    ...(video ? { recordVideo: { dir: `${OUT}/tmp-video/${name}`, size: { width: 390, height: 844 } } } : {}),
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  const notes = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
  page.on('dialog', async (d) => { notes.push(`ブラウザ標準の窓: ${d.message()}`); await d.accept(); });
  // 人の速さ: 0.4〜0.8秒
  const beat = (ms) => page.waitForTimeout(ms ?? 400 + Math.round(Math.random() * 400));
  const shot = async (n) => { await page.screenshot({ path: `${OUT}/${name}-${n}.png` }); console.log('shot', n); };
  const text = async () => (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, ' / ');
  const note = (s) => { notes.push(s); console.log('NOTE', s); };
  const tap = async (loc, ms) => { await loc.first().click(); await beat(ms); };
  const tryTap = async (loc, ms) => { try { if ((await loc.count()) && (await loc.first().isVisible()) && (await loc.first().isEnabled())) { await loc.first().click({ timeout: 2500 }); await beat(ms); return true; } } catch (e) { console.log('tryTap 失敗', String(e).slice(0, 80)); } return false; };
  const getSave = () => page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')));
  /** 保存データを書き換えて読み直す（つづきから） */
  const edit = async (fn, arg) => {
    await page.evaluate(({ src, arg }) => {
      const k = 'card-rpg/adventure';
      const d = JSON.parse(localStorage.getItem(k));
      (0, eval)(src)(d.game, arg);
      localStorage.setItem(k, JSON.stringify(d));
    }, { src: fn.toString(), arg });
    await page.reload();
    await page.waitForTimeout(500);
    await page.getByText('つづきから').click();
    await beat(700);
  };
  const btns = async () => page.evaluate(() => [...document.querySelectorAll('button,[role=button]')].filter((b) => b.offsetParent && !b.disabled).map((b) => (b.textContent.trim().slice(0, 16) || b.getAttribute('aria-label') || '?')).join(' ; '));
  /** ボタン・要素の位置と大きさ（親指の届きやすさ用） */
  const rects = async (sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return { t: (e.textContent.trim() || e.getAttribute('aria-label') || '').slice(0, 14), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }), sel);
  const issues = async (w) => { const l = await layoutIssues(page); console.log(`[${w}] layout:`, JSON.stringify(l)); return l; };
  const finish = async (extra = {}) => {
    await beat(900);
    await ctx.close(); await browser.close();
    if (video) {
      const dir = `${OUT}/tmp-video/${name}`; const [f] = await readdir(dir);
      await rename(`${dir}/${f}`, `${OUT}/${name}.webm`);
    }
    await writeFile(`${OUT}/${name}-notes.json`, JSON.stringify({ errors, notes, ...extra }, null, 1));
    console.log('done', name, 'errors', JSON.stringify(errors));
  };
  // タップの位置に赤い丸（動画で操作が分かるように）
  await ctx.addInitScript(() => {
    addEventListener('pointerdown', (e) => {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:${e.clientX - 14}px;top:${e.clientY - 14}px;width:28px;height:28px;border-radius:50%;border:3px solid rgba(255,80,80,.9);z-index:99999;pointer-events:none;transition:all .5s;`;
      document.documentElement.appendChild(d);
      requestAnimationFrame(() => { d.style.transform = 'scale(1.6)'; d.style.opacity = '0'; });
      setTimeout(() => d.remove(), 600);
    }, true);
  });

  /** 新しい冒険（人数・担当の決め方）。世界マップの最初の物語を閉じた所まで */
  const newGame = async ({ n = 2, seats = 'solo', difficulty = 'ふつう', fast = false, showCreate = true } = {}) => {
    await page.goto(URL);
    await page.evaluate((fast) => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: fast, vibration: false })); }, fast);
    await page.reload(); await beat(700);
    await tap(page.getByText('新しい冒険'));
    await tap(page.getByText(difficulty, { exact: true }));
    await tap(page.getByText(`${n}人`, { exact: true }));
    await tap(page.getByText('キャラクター作成へ'), 800);
    if (n > 1) {
      if (seats === 'pass') await tap(page.locator('[data-seat-choice="pass"]'));
      if (showCreate) { for (let i = 2; i <= n; i++) await tap(page.getByText(`${i}人目`, { exact: true })); await tap(page.getByText('1人目', { exact: true })); }
    }
    await tap(page.getByText('冒険に出発'), 700);
    const ask = page.getByRole('dialog', { name: 'このまま出発しますか？' });
    if (await ask.count()) await tap(ask.getByText('出発する', { exact: true }), 800);
    await beat(900);
  };
  return { browser, ctx, page, beat, shot, text, note, tap, tryTap, getSave, edit, btns, rects, issues, finish, newGame, errors, notes };
}
