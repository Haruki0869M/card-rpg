// 世界マップの重さの計測（箱庭の前と後を比べる）: 4人・CPU を4倍遅くして、
//   - 止まっている時（雲・水・魔物の呼吸だけが動く）2秒
//   - 歩いている時（「移動する」を押してから到着まで）
// のフレーム時間を、拡大1倍と2倍で測る。同じ冒険にするため、種を固定する（SEED、既定 12345）
// 使い方: npx vite preview を起こしてから node scripts/world-perf.mjs（URL=... で場所を変えられる）
import { chromium, depart, URL } from './lib.mjs';

const SEED = Number(process.env.SEED ?? 12345);
const browser = await chromium.launch();
const results = [];
const stats = (frames) => {
  const f = frames.slice(2).sort((a, b) => a - b);
  if (!f.length) return { frames: 0 };
  const avg = f.reduce((a, b) => a + b, 0) / f.length;
  return { frames: f.length, avgFps: +(1000 / avg).toFixed(1), p95ms: +f[Math.floor(f.length * 0.95)].toFixed(1), slow: `${((f.filter((x) => x > 25).length / f.length) * 100).toFixed(1)}%` };
};
for (const zoom of [1, 2]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2.6 });
  const page = await ctx.newPage();
  await page.addInitScript((seed) => {
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (a) => (a instanceof Uint32Array && a.length === 1 ? ((a[0] = seed), a) : random(a));
  }, SEED);
  // 原因を探す時だけ: PERF_CSS に CSS を入れると、ページに足す（例: 層を隠す・動きを止める）
  if (process.env.PERF_CSS) await page.addInitScript((css) => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = css; document.head.append(st); }), process.env.PERF_CSS);
  await page.goto(URL);
  await page.evaluate((z) => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false, worldZoom: z })); }, zoom);
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText('4人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(500);
  for (let k = 0; k < 3; k++) {
    const cont = page.getByText('つづける', { exact: true });
    if (await cont.count()) await cont.first().click().catch(() => {});
    const handoff = page.getByText('スマホを渡して、タップで始める');
    if (await handoff.count()) await handoff.click().catch(() => {});
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1800);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const record = () => page.evaluate(() => {
    window.__frames = [];
    window.__rec = true;
    let last = performance.now();
    const loop = (t) => { if (!window.__rec) return; window.__frames.push(t - last); last = t; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  const stop = () => page.evaluate(() => { window.__rec = false; return window.__frames; });
  // 内訳（ms）: スクリプト・スタイル計算・レイアウト・全体の処理
  await cdp.send('Performance.enable');
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const diff = (a, b) => ({ js: Math.round((b.ScriptDuration - a.ScriptDuration) * 1000), style: Math.round((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000), layout: Math.round((b.LayoutDuration - a.LayoutDuration) * 1000), task: Math.round((b.TaskDuration - a.TaskDuration) * 1000) });
  // 止まっている時
  await record();
  await page.waitForTimeout(2000);
  results.push({ zoom, scene: '止まっている', ...stats(await stop()) });
  // 歩いている時（一番遠い光るマスへ）
  await page.getByText('移動力の判定', { exact: true }).click();
  await page.locator('[data-roll-spinning]').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  const target = await page.evaluate(() => {
    const box = document.querySelector('[data-world-map]').getBoundingClientRect();
    const bottom = Math.min(box.bottom, document.querySelector('[data-world-panel]').getBoundingClientRect().top);
    const list = [...document.querySelectorAll('[data-reach]')]
      .map((g) => ({ cost: Number(g.getAttribute('data-cost')), r: g.getBoundingClientRect() }))
      .map(({ cost, r }) => ({ cost, x: r.left + r.width / 2, y: r.top + r.height / 2 }))
      .filter(({ x, y }) => x > box.left + 20 && x < box.right - 70 && y > box.top + 20 && y < bottom - 20);
    list.sort((a, b) => b.cost - a.cost);
    return list[0] ?? null;
  });
  if (target) {
    await page.mouse.click(target.x, target.y);
    await page.waitForTimeout(500);
    await record();
    const m0 = await metrics();
    if (process.env.PERF_PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); }
    if (process.env.PERF_RENDERS) await page.evaluate(() => { window.__r = {}; });
    await page.locator('button:has-text("移動する")').first().click();
    await page.waitForTimeout(400);
    await page.waitForFunction(() => !document.querySelector('[data-world-moving]'), null, { timeout: 15000 }).catch(() => {});
    const fr = await stop();
    if (process.env.PERF_PROFILE) {
      // 原因を探す時だけ: 関数ごとの時間（自分の分）の上位
      const { profile } = await cdp.send('Profiler.stop');
      const dt = profile.timeDeltas.reduce((a, b) => a + b, 0) / profile.samples.length / 1000;
      const count = new Map();
      for (const id of profile.samples) count.set(id, (count.get(id) ?? 0) + 1);
      const by = new Map();
      for (const n of profile.nodes) {
        const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`;
        by.set(k, (by.get(k) ?? 0) + (count.get(n.id) ?? 0) * dt);
      }
      console.log([...by].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => `${v.toFixed(0)}ms ${k}`).join(String.fromCharCode(10)));
    }
    if (process.env.PERF_RENDERS) console.log('renders', await page.evaluate(() => JSON.stringify(window.__r ?? {})));
    results.push({ zoom, scene: `歩いている（${target.cost}マス）`, ...stats(fr), ...diff(m0, await metrics()) });
  } else results.push({ zoom, scene: '歩いている', frames: 0, note: '光るマスが無い' });
  await ctx.close();
}
await browser.close();
console.table(results);
