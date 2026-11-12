// 段階4（命中の演出）の確認: 攻撃が当たった瞬間を細かく調べて、数を数える。
// 1) 画面の毎フレーム（requestAnimationFrame）で、命中の演出・白いフラッシュ・スロットの板・敵の予告の位置を記録し、
//    「演出が何コマ出たか」「スロットの板が演出にどれだけ重なったか」「板が敵の予告に重なったか」を数える。
// 2) 0.05秒おきに戦場を撮る（screenshots/battle-fx-frames/）。
// 場面: ふつう / とどめの一撃（倒れる敵）/ 設定「簡易」/ 端末の「動きを減らす」。幅 375px と 360px。
// 使い方: ビルドしてプレビューを起こしてから
//   URL=http://127.0.0.1:4188/card-rpg/ node scripts/battle-fx-frames.mjs
//   FX_SHOTS=0 で撮影を省く。FX_WIDTHS=375,360 で幅を変える。
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, startBattle } from './lib.mjs';

const dir = 'screenshots/battle-fx-frames';
mkdirSync(dir, { recursive: true });
const KEY = 'card-rpg/adventure';
const WIDTHS = (process.env.FX_WIDTHS ?? '375,360').split(',').map(Number);
const SHOTS = process.env.FX_SHOTS !== '0';
const SCENES = [
  { name: 'normal', mode: 'standard', reduced: false, lethal: false },
  { name: 'lethal', mode: 'standard', reduced: false, lethal: true },
  { name: 'simple', mode: 'simple', reduced: false, lethal: false },
  { name: 'reduced', mode: 'standard', reduced: true, lethal: false },
  // 敵4体（戦場が混む時）
  { name: 'four', mode: 'standard', reduced: false, lethal: false, enemies: ['treeWarden', 'chaosShaman', 'forestWolf', 'toxicShroom'] },
];
const BASE_ENEMIES = ['goblinBrute', 'goblinScout'];

const browser = await chromium.launch();
const results = [];
let failed = false;

/** 保存データの戦闘を書き換えて、設定を入れて読み直す */
async function resume(page, base, scene) {
  const d = structuredClone(base);
  const x = d.game.expeditions?.[0] ?? d.game;
  const b = x.battle;
  b.phase = 'ally';
  // とどめ: 狙う敵（左）だけ HP1（ほかの敵は残るので、戦闘は続く）
  b.enemies.forEach((e, i) => { e.hp = scene.lethal && i === 0 ? 1 : 5000; e.maxHp = scene.lethal && i === 0 ? 40 : 5000; e.block = 0; });
  b.allies.forEach((a) => { a.hp = a.maxHp = 500; a.mana = 20; a.focus = 6; a.hand = [{ uid: 'fxtest', cardId: 'strike' }]; });
  // 先にタイトルへ戻す（画面を閉じる時の保存が、書き換えた保存データを上書きしないように）
  await page.reload();
  await page.evaluate(({ k, d, mode }) => {
    localStorage.setItem(k, JSON.stringify(d));
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false, cutinMode: mode }));
  }, { k: KEY, d, mode: scene.mode });
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.locator('[data-card-index]').first().waitFor({ timeout: 5000 });
  // 「ターン N」の帯（1秒）が消えるまで待つ
  await page.waitForTimeout(1500);
}

/** 毎フレームの記録を始める（ms ミリ秒） */
async function startSampler(page, ms) {
  await page.evaluate((ms) => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    // 見えている濃さ: 自分と親の opacity を掛ける
    const visOpacity = (el) => { let o = 1; for (let p = el; p && p !== document.body; p = p.parentElement) o *= parseFloat(getComputedStyle(p).opacity || '1'); return o; };
    const frames = [];
    window.__fx = frames;
    const t0 = performance.now();
    const tick = () => {
      const t = performance.now() - t0;
      const slot = document.querySelector('[data-slot-overlay]');
      const impacts = [...document.querySelectorAll('[data-impact]')].map((e) => ({ unit: e.getAttribute('data-impact-unit'), style: e.getAttribute('data-impact'), r: rect(e), o: visOpacity(e) }));
      // 白いフラッシュ: 直した後は白い層（data-hit-flash）、直す前は絵に filter: brightness
      const flashLayers = [...document.querySelectorAll('[data-hit-flash]')].map((e) => visOpacity(e)).filter((o) => o > 0.05);
      const filterFlash = [...document.querySelectorAll('[data-motion-unit]')].some((e) => /brightness\((?!1\))/.test(getComputedStyle(e.firstElementChild ?? e).filter));
      frames.push({ t, slot: slot ? rect(slot) : null, impacts, flash: flashLayers.length > 0 || filterFlash });
      if (t < ms) requestAnimationFrame(tick);
    };
    // 板が出ている間に毎フレーム、敵の予告の枠（data-intent）と、敵の名前〜状態の欄全体（data-enemy-info）に重なったかを数える
    window.__fxIntentHits = 0;
    window.__fxInfoHits = 0;
    window.__fxInfoWhat = undefined;
    const watch = () => {
      const slot = document.querySelector('[data-slot-overlay]');
      if (slot) {
        const s = slot.getBoundingClientRect();
        const hit = (sel) => [...document.querySelectorAll(sel)].some((e) => {
          const r = e.getBoundingClientRect();
          return r.width && s.left < r.right && r.left < s.right && s.top < r.bottom && r.top < s.bottom;
        });
        if (hit('[data-intent]')) window.__fxIntentHits++;
        // 欄の箱ではなく、中に見えている物（文字・印・枠。子を持たない要素）で数える
        const over = [...document.querySelectorAll('[data-enemy-info] *')].find((e) => {
          if (e.children.length) return false;
          const r = e.getBoundingClientRect();
          return r.width && s.left < r.right && r.left < s.right && s.top < r.bottom && r.top < s.bottom;
        });
        if (over) { window.__fxInfoHits++; window.__fxInfoWhat = `${over.tagName}:${(over.textContent || over.getAttribute('class') || '').slice(0, 20)}`; }
      }
      if (performance.now() - t0 < ms) requestAnimationFrame(watch);
    };
    requestAnimationFrame(tick);
    requestAnimationFrame(watch);
  }, ms);
}

const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

function summarize(frames) {
  const dt = frames.length > 1 ? (frames.at(-1).t - frames[0].t) / (frames.length - 1) : 16.7;
  const impactFrames = frames.filter((f) => f.impacts.some((i) => i.o > 0.05));
  let overlap = 0, maxCover = 0, minVis = 1;
  for (const f of impactFrames) {
    for (const i of f.impacts) minVis = Math.min(minVis, i.o);
    if (!f.slot) continue;
    const cover = Math.max(...f.impacts.map((i) => inter(f.slot, i.r) / Math.max(1, i.r.w * i.r.h)));
    maxCover = Math.max(maxCover, cover);
    if (cover > 0.02) overlap++;
  }
  return {
    frameMs: +dt.toFixed(1),
    rawImpactFrames: frames.filter((f) => f.impacts.length).length,
    impactFrames: impactFrames.length,
    impactMs: Math.round(impactFrames.length * dt),
    overlapFrames: overlap,
    maxCoverPct: Math.round(maxCover * 100),
    minImpactOpacity: impactFrames.length ? +minVis.toFixed(2) : null,
    flashFrames: frames.filter((f) => f.flash).length,
    slotFrames: frames.filter((f) => f.slot).length,
  };
}

try {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 360 ? 640 : 812 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const bases = {};
    for (const scene of SCENES) {
      const key = (scene.enemies ?? BASE_ENEMIES).join(',');
      if (!bases[key]) {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await startBattle(page, 1, scene.enemies ?? BASE_ENEMIES, false);
        bases[key] = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
      }
      const base = bases[key];
      await page.emulateMedia({ reducedMotion: scene.reduced ? 'reduce' : 'no-preference' });
      for (const pass of SHOTS ? ['count', 'shots'] : ['count']) {
        await resume(page, base, scene);
        const box = await page.locator('[data-card-index][data-usable]').first().boundingBox();
        await page.mouse.click(box.x + 14, box.y + 70);
        await page.waitForTimeout(150);
        if (await page.getByText('敵をタップ').count()) {
          const eb = await page.locator('[data-enemy]:not([data-dead])').first().boundingBox();
          // 敵の絵の真ん中を押す
          await page.mouse.click(eb.x + eb.width / 2, eb.y + 60);
        }
        await page.getByLabel('フォーカスを増やす').click();
        await page.waitForTimeout(100);
        if (pass === 'count') await startSampler(page, 2600);
        await page.locator('button:has-text("発動")').click();
        if (pass === 'count') {
          await page.waitForTimeout(2800);
          const frames = await page.evaluate(() => window.__fx);
          const hits = await page.evaluate(() => [window.__fxIntentHits, window.__fxInfoHits, window.__fxInfoWhat]);
          const s = { width, scene: scene.name, ...summarize(frames), slotOnIntentFrames: hits[0], slotOnEnemyInfoFrames: hits[1], ...(hits[2] ? { enemyInfoOverlapExample: hits[2] } : {}) };
          results.push(s);
          console.log(JSON.stringify(s));
        } else {
          // 0.05秒おきに戦場を撮る（撮るのに時間がかかるので、実際の間隔はファイル名の ms を見る）
          const field = await page.locator('[data-synergy-field]').boundingBox();
          const clip = { x: 0, y: Math.max(0, field.y - 4), width, height: Math.min(page.viewportSize().height - field.y, field.height + 160) };
          const t0 = Date.now();
          let n = 0;
          while (Date.now() - t0 < 2800 && n < 40) {
            const next = t0 + n * 50;
            const wait = next - Date.now();
            if (wait > 0) await page.waitForTimeout(wait);
            await page.screenshot({ path: `${dir}/${width}-${scene.name}-${String(n).padStart(2, '0')}-${Date.now() - t0}ms.png`, clip });
            n++;
          }
        }
      }
    }
    if (errors.length) { failed = true; console.error(`${width}px 画面のエラー:`, errors.slice(-3).join(' / ')); }
    await ctx.close();
  }
  writeFileSync(`${dir}/summary.json`, JSON.stringify(results, null, 2));
  console.log(`記録: ${dir}/summary.json`);
} finally {
  await browser.close();
}
if (failed) process.exit(1);
