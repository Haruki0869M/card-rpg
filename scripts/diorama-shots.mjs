// 世界マップの箱庭（ジオラマ）の見比べの写真（390×844）。同じ種の冒険で、前と後の版を同じ場面で撮る
//   1) 始まりの辺り（昼・夜）  2) 森と山のある辺り（昼・夜。周り半径4マスだけ霧を晴らす）  3) 夕方・朝
// 使い方: npx vite preview を起こしてから OUT=screenshots/diorama/after node scripts/diorama-shots.mjs
//   INJECT_CSS=... でページに CSS を足す（見本用）
//   SEED=... で冒険の種（既定 12345）、PARTY=... で人数（既定 2）、ZOOM=... で拡大（既定 1）
import { mkdirSync } from 'node:fs';
import { chromium, depart, URL } from './lib.mjs';

const OUT = process.env.OUT ?? 'screenshots/diorama/after';
const SEED = Number(process.env.SEED ?? 12345);
const PARTY = Number(process.env.PARTY ?? 2);
const ZOOM = Number(process.env.ZOOM ?? 1);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.addInitScript((seed) => {
  const random = crypto.getRandomValues.bind(crypto);
  crypto.getRandomValues = (a) => (a instanceof Uint32Array && a.length === 1 ? ((a[0] = seed), a) : random(a));
}, SEED);
// 見本だけ: INJECT_CSS で CSS を足す（案A の CSS の3D傾きの見本など）
if (process.env.INJECT_CSS) await page.addInitScript((css) => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = css; document.head.append(st); }), process.env.INJECT_CSS);
// 調べる時だけ: INJECT_JS でページに JS を足す（例: 別スレッドを使わない端末のまねをする）
if (process.env.INJECT_JS) await page.addInitScript(process.env.INJECT_JS);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL);
await page.evaluate((z) => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false, worldZoom: z })); }, ZOOM);
await page.reload();
await page.getByText('新しい冒険').click();
await page.getByText(`${PARTY}人`, { exact: true }).click();
await page.getByText('キャラクター作成へ').click();
await depart(page);
await page.waitForTimeout(500);
const closeOverlays = async () => {
  for (let k = 0; k < 3; k++) {
    const cont = page.getByText('つづける', { exact: true });
    if (await cont.count()) await cont.first().click().catch(() => {});
    const handoff = page.getByText('スマホを渡して、タップで始める');
    if (await handoff.count()) await handoff.click().catch(() => {});
    await page.waitForTimeout(250);
  }
};
await closeOverlays();
await page.waitForTimeout(1800);

/** 保存データを書き換えて読み込み直す（見た目の確認のためだけ） */
const edit = async (fn, arg) => {
  await page.evaluate(([src, a]) => {
    const s = JSON.parse(localStorage.getItem('card-rpg/adventure'));
    new Function('w', 'a', src)(s.game.world, a);
    localStorage.setItem('card-rpg/adventure', JSON.stringify(s));
  }, [fn, arg]);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(500);
  await closeOverlays();
  await page.waitForTimeout(1500);
};
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

// 1) 始まりの辺り
await edit('w.worldTurn = 3;'); // 昼
await shot('1-start-day');
await edit('w.worldTurn = 7;'); // 夜
await shot('1-start-night');
await edit('w.worldTurn = 5;'); // 夕方
await shot('1-start-evening');
await edit('w.worldTurn = 1;'); // 朝
await shot('1-start-morning');

// 2) 森と山: 山のマスで、周りに森が多い所へ手番のキャラを置き、半径4マスの霧を晴らす
await edit(`
  const W = w.width, H = w.height;
  const nb = (i) => { const c = i % W, r = Math.floor(i / W), o = r & 1;
    const d = o ? [[1,0],[-1,0],[0,-1],[1,-1],[0,1],[1,1]] : [[1,0],[-1,0],[-1,-1],[0,-1],[-1,1],[0,1]];
    return d.map(([dc,dr]) => [c+dc, r+dr]).filter(([c2,r2]) => c2>=0&&c2<W&&r2>=0&&r2<H).map(([c2,r2]) => r2*W+c2); };
  let best = -1, bs = -1;
  w.tiles.forEach((t, i) => { if (t.t !== 'mountain' && t.t !== 'hills') return;
    const s = nb(i).reduce((n, j) => n + (w.tiles[j].t === 'forest' ? 2 : w.tiles[j].t === 'mountain' ? 1 : 0), 0) + (t.f ? 3 : 0);
    if (s > bs) { bs = s; best = i; } });
  const near = nb(best).find((j) => w.tiles[j].t !== 'mountain' && w.tiles[j].t !== 'water' && w.tiles[j].t !== 'sea') ?? best;
  w.pos[w.turn] = near;
  let ring = new Set([near]);
  for (let k = 0; k < 4; k++) { for (const i of [...ring]) for (const j of nb(i)) ring.add(j); }
  for (const i of ring) w.tiles[i].seen = true;
  w.worldTurn = 3;
`);
await shot('2-forest-day');
await edit('w.worldTurn = 7;');
await shot('2-forest-night');
// 3) 侵食度が高い時（75%）
await edit('w.corruption = 78; w.worldTurn = 3;');
await shot('3-corruption-75');
// 4) 山の辺り（火山の地域）: 周り半径2マスだけ晴らす。霧の向こうの山のシルエットが見えるか
await edit(`
  const W = w.width, H = w.height;
  const nb = (i) => { const c = i % W, r = Math.floor(i / W), o = r & 1;
    const d = o ? [[1,0],[-1,0],[0,-1],[1,-1],[0,1],[1,1]] : [[1,0],[-1,0],[-1,-1],[0,-1],[-1,1],[0,1]];
    return d.map(([dc,dr]) => [c+dc, r+dr]).filter(([c2,r2]) => c2>=0&&c2<W&&r2>=0&&r2<H).map(([c2,r2]) => r2*W+c2); };
  w.corruption = 0;
  w.tiles.forEach((t) => { t.seen = false; });
  let best = -1, bs = -1;
  w.tiles.forEach((t, i) => { if (Math.floor(i / W) > 9 || t.t === 'mountain' || t.t === 'lava' || t.f) return;
    const s = nb(i).reduce((n, j) => n + (w.tiles[j].t === 'mountain' || w.tiles[j].t === 'lava' ? 1 : 0), 0);
    if (s > bs) { bs = s; best = i; } });
  w.pos[w.turn] = best;
  let ring = new Set([best]);
  for (let k = 0; k < 2; k++) { for (const i of [...ring]) for (const j of nb(i)) ring.add(j); }
  for (const i of ring) w.tiles[i].seen = true;
  w.worldTurn = 3;
`);
await shot('4-mountain-silhouette');
// 5) 地平線（地図の一番上へスクロール）: まだ見ていない最後の城のシルエット
await page.evaluate(() => document.querySelector('[data-world-map]').scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(400);
await shot('5-horizon');
// 6) 移動力の判定の後（行けるマスと、必要な移動力の数字）。始まりの辺りへ戻して判定する（最後に撮るので、ほかの写真に影響しない）
await edit(`
  const W = w.width;
  w.tiles.forEach((t) => { t.seen = false; });
  const start = w.tiles.findIndex((t) => t.f && t.f.kind === 'town');
  w.pos[w.turn] = start;
  const c0 = start % W, r0 = Math.floor(start / W);
  w.tiles.forEach((t, i) => { const c = i % W, r = Math.floor(i / W); if (Math.abs(c - c0) <= 3 && Math.abs(r - r0) <= 3) t.seen = true; });
  w.worldTurn = 3;
`);
await page.locator('[data-recenter]').click().catch(() => {});
await page.getByText('移動力の判定').click();
await page.waitForTimeout(3500);
await closeOverlays();
await page.waitForTimeout(600);
await shot('6-reach');
await browser.close();
if (errors.length) console.log('ページのエラー:\n' + errors.join('\n'));
console.log(`OK: ${OUT} に保存した`);
