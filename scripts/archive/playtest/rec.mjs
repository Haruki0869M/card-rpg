// 動画＋スクショの共通部品（review-pack 用）
import { mkdir, readdir, rename } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { chromium } from '../../lib.mjs';
export const URL = 'http://127.0.0.1:4219/card-rpg/';
export const OUT = 'screenshots/review-pack';
await mkdir(`${OUT}/tmp-video`, { recursive: true });
export async function start(name) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, recordVideo: { dir: `${OUT}/tmp-video/${name}`, size: { width: 390, height: 844 } } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', async (d) => { console.log('DIALOG:', d.type(), d.message()); await page.waitForTimeout(600); await d.accept(); });
  const beat = (ms = 600) => page.waitForTimeout(ms);
  const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', n); };
  const text = async () => (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, ' / ');
  const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')));
  const putSave = async (d, mutate, arg) => {
    await page.evaluate(({ d, src, arg }) => {
      if (src) (0, eval)(src)(d.game, arg);
      localStorage.setItem('card-rpg/adventure', JSON.stringify(d));
      localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false }));
    }, { d, src: mutate?.toString(), arg });
    await page.reload(); await beat(700);
    await page.getByText('つづきから').click(); await beat(900);
  };
  const loadFile = (f) => JSON.parse(readFileSync(f, 'utf8'));
  const finish = async () => {
    await beat(800);
    await ctx.close(); await browser.close();
    const dir = `${OUT}/tmp-video/${name}`; const [f] = await readdir(dir);
    await rename(`${dir}/${f}`, `${OUT}/${name}.webm`);
    console.log('video', `${OUT}/${name}.webm`, 'errors', JSON.stringify(errors));
  };
  // タップの位置に赤い丸を出す（動画で操作が分かるように）
  await ctx.addInitScript(() => {
    addEventListener('pointerdown', (e) => {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:${e.clientX - 14}px;top:${e.clientY - 14}px;width:28px;height:28px;border-radius:50%;border:3px solid rgba(255,80,80,.9);z-index:99999;pointer-events:none;transition:all .5s;`;
      document.documentElement.appendChild(d);
      requestAnimationFrame(() => { d.style.transform = 'scale(1.6)'; d.style.opacity = '0'; });
      setTimeout(() => d.remove(), 600);
    }, true);
  });
  return { browser, ctx, page, beat, shot, text, save, putSave, loadFile, finish, errors };
}
// 移動中の駒の安定を毎フレーム測る（動いていない駒の作り直し・ずれ・霧と敵の先出し）
export async function armProbe(page, mover) {
  await page.evaluate((mover) => {
    const heroes = [...document.querySelectorAll('[data-hero]')];
    const rel = (el) => { const tile = el.getAttribute('data-tile'); const hex = document.querySelector(`[data-hex="${tile}"]`); if (!hex) return null; const a = el.getBoundingClientRect(), b = hex.getBoundingClientRect(); return { tile, dx: a.x - b.x, dy: a.y - b.y }; };
    const fog = () => document.querySelectorAll('[data-fog-tile]').length;
    const enemies = () => document.querySelectorAll('[data-wanderer]').length;
    const p = window.__probe = { mover, nodes: Object.fromEntries(heroes.map((e) => [e.dataset.hero, e])), start: Object.fromEntries(heroes.map((e) => [e.dataset.hero, rel(e)])), fog0: fog(), enemies0: enemies(), frames: 0, stepFrames: 0, arrivalFrames: 0, remounted: [], maxShift: {}, fogChanged: 0, enemyChanged: 0, done: false };
    const tick = () => {
      p.frames++;
      const phase = document.querySelector('[data-world-moving]')?.getAttribute('data-world-moving');
      if (phase === 'steps') { p.stepFrames++; if (fog() !== p.fog0) p.fogChanged++; if (enemies() !== p.enemies0) p.enemyChanged++; }
      if (phase === 'arrival') p.arrivalFrames++;
      for (const [id, node] of Object.entries(p.nodes)) {
        const now = document.querySelector(`[data-hero="${id}"]`);
        if ((now !== node || !node.isConnected) && !p.remounted.includes(id)) p.remounted.push(id);
        if (id === mover || !now) continue;
        const r = rel(now), s = p.start[id];
        if (!r || !s || r.tile !== s.tile) { p.maxShift[id] = 'マスが変わった'; continue; }
        if (typeof p.maxShift[id] === 'string') continue;
        p.maxShift[id] = Math.max(p.maxShift[id] ?? 0, Math.abs(r.dx - s.dx), Math.abs(r.dy - s.dy));
      }
      if (!p.done) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, mover);
}
export async function readProbe(page) {
  return page.evaluate(() => { const p = window.__probe; p.done = true; return { mover: p.mover, frames: p.frames, stepFrames: p.stepFrames, arrivalFrames: p.arrivalFrames, remounted: p.remounted, maxShift: p.maxShift, fog0: p.fog0, enemies0: p.enemies0, fogChangedFramesDuringSteps: p.fogChanged, enemyChangedFramesDuringSteps: p.enemyChanged }; });
}
