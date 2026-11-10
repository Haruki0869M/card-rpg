// フェーズ1: 敵の番を0.1秒おきのコマ送りで測る。
// 1. ダメージ・ブロック・状態異常・回復の数字が、受けたキャラ（敵・味方）の絵の頭のすぐ上に出る
// 2. 「敵のターン」「ターン N」の帯が、数字と同じ時に出ない。帯が敵の予告に重ならない
// 3. 敵が1体ずつ、間（約0.55秒。2026-11 段階Cで0.4秒から長くした）を取って動く
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues, startBattle } from './lib.mjs';

const dir = 'screenshots/enemy-turn-timing'; await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const check = (ok, text) => { if (!ok) throw new Error(text); };
const widths = (process.env.TIMING_WIDTHS ?? '360,390,480').split(',').map(Number);

async function runOnce(width, party, enemies) {
  const page = await browser.newPage({ viewport: { width, height: 780 } });
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => errors.push(`${width}px: ${e.message}`));
  await startBattle(page, party, enemies, false);
  await page.locator('[data-enemy]').first().waitFor();
  // 開始の「ターン 1」の帯が終わるまで待つ
  await page.waitForTimeout(2500);
  await targeting(page, width, party);
  // 0.1秒おきに記録（ページの中で測る。撮る時間の遅れに左右されない）
  await page.evaluate(() => {
    const rows = []; window.timingRows = rows;
    const t0 = performance.now();
    const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    const visible = (el) => Number(getComputedStyle(el).opacity) > 0.05;
    window.timingTimer = setInterval(() => {
      const popups = [...document.querySelectorAll('[data-popup-unit]')].filter(visible).map((el) => {
        const id = el.getAttribute('data-popup-unit');
        const owner = document.querySelector(`[data-enemy-sprite="${id}"]`) ?? document.querySelector(`[data-ally-sprite="${id}"]`);
        return { id, text: el.textContent, tone: el.getAttribute('data-popup-tone'), lane: Number(el.getAttribute('data-popup-lane')), box: rect(el), owner: owner ? rect(owner) : null };
      });
      const banner = document.querySelector('[data-phase-banner]');
      const intents = [...document.querySelectorAll('[data-intent]')].map(rect);
      const attacks = [...document.querySelectorAll('[data-enemy-sprite] [data-unit-motion="attack"]')].map((el) => el.getAttribute('data-motion-unit'));
      rows.push({ t: Math.round(performance.now() - t0), popups, banner: banner && visible(banner) ? { phase: banner.getAttribute('data-phase-banner'), box: rect(banner.firstElementChild ?? banner) } : null, intents, attacks });
    }, 100);
  });
  // ターン終了（まだ行動できる仲間がいる時は、確認の窓で「終了する」）
  await page.getByRole('button', { name: 'ターン終了' }).click();
  const yes = page.getByRole('button', { name: 'ターンを終了する' });
  if (await yes.count()) await yes.click();
  // 敵の番が終わって「ターン 2」の帯が消えるまで
  const deadline = Date.now() + 20000;
  let shots = 0;
  while (Date.now() < deadline) {
    await page.waitForTimeout(100);
    if (shots < 40 && shots % 4 === 0) await page.screenshot({ path: `${dir}/${width}-${party}p-${String(shots).padStart(2, '0')}.png` });
    shots++;
    const done = await page.evaluate(() => {
      const rows = window.timingRows;
      return rows.some((r) => r.banner?.phase === 'ally') && !rows[rows.length - 1].banner && !document.querySelector('[data-battle-presenting]');
    });
    if (done) break;
  }
  const rows = await page.evaluate(() => { clearInterval(window.timingTimer); return window.timingRows; });
  const issues = await layoutIssues(page);
  await page.close();
  return { rows, issues };
}

/** 狙いの表示（フェーズ1の2回目）: 札で敵の絵を隠さない・矢印と光で示す・帯の下の数字と下の予測が同じ・宛先は名前 */
async function targeting(page, width, party) {
  const names = await page.$$eval('[data-intent-name]', (els) => els.map((e) => e.textContent));
  check(names.length > 0 && names.every((t) => !/P\d/.test(t)), `${width}px: 予告の宛先が名前でない ${names}`);
  // 敵を狙うカードを探す（手札は種で変わる）
  const cards = page.locator('[data-card-index][data-usable]');
  let found = false;
  for (let i = 0; i < await cards.count() && !found; i++) {
    const box = await cards.nth(i).boundingBox();
    await page.mouse.click(box.x + 14, box.y + 70); await page.waitForTimeout(80);
    if (await page.getByText('敵をタップ').count()) found = true;
    else { await page.keyboard.press('Escape'); await page.waitForTimeout(80); }
  }
  check(found, `${width}px: 敵を狙うカードが手札に無い`);
  const enemy = page.locator('[data-enemy]:not([data-dead])').first();
  const eb = await enemy.boundingBox(); await page.mouse.click(eb.x + eb.width / 2, eb.y + 60); await page.waitForTimeout(150);
  check(!(await page.getByText('下の一覧へ').count()), `${width}px: 「予測 下の一覧へ」の札が残っている`);
  check(await page.locator('[data-target-arrow]').count() === 1, `${width}px: 狙う敵の矢印が無い`);
  const col = await page.$$eval('[data-tier-label="完全"]', (els) => els.map((e) => e.getAttribute('data-tier-values')));
  const pred = await page.locator('[data-card-predictions]').textContent();
  // 「完全」の列の数字（ダメージ・ブロック・回復）が、下の予測の「完全：」の行にすべて出ている
  const line = (await page.locator('[data-card-predictions] > div').allTextContents()).find((t) => t.startsWith('完全：')) ?? '';
  const values = (col[0] ?? '').split(',').filter(Boolean);
  const said = [...line.matchAll(/(?:ダメージ|ブロック\+|HP回復)(\d+(?:〜\d+)?)/g)].map((x) => x[1]);
  check(col.length === 1 && values.length > 0 && values.every((v) => said.includes(v)), `${width}px: 帯の下の数字（${values}）と下の予測（${line}）が違う`);
  await page.screenshot({ path: `${dir}/${width}-${party}p-target.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
}

function analyze(label, rows) {
  const problems = [];
  // 1. 数字の位置: 持ち主の絵の横の範囲の中、頭の近く（絵の上の端から上へ30px〜下へ90px）
  let popupCount = 0;
  for (const r of rows) for (const p of r.popups) {
    popupCount++;
    if (!p.owner) { problems.push(`${r.t}ms: ${p.text} の持ち主の絵が無い`); continue; }
    const cx = (p.box.l + p.box.r) / 2;
    if (cx < p.owner.l - 4 || cx > p.owner.r + 4) problems.push(`${r.t}ms: ${p.text}（${p.id}）が持ち主の横の範囲の外 x=${Math.round(cx)} 絵=${Math.round(p.owner.l)}〜${Math.round(p.owner.r)}`);
    const top = p.box.t - p.lane * 28;
    if (top < p.owner.t - 30 || top > p.owner.t + 90) problems.push(`${r.t}ms: ${p.text}（${p.id}）が頭の近くに無い 上=${Math.round(top)} 絵の上=${Math.round(p.owner.t)}`);
  }
  // 2. 帯と数字が同時に出ない・帯が予告に重ならない
  for (const r of rows) {
    if (r.banner && r.popups.length) problems.push(`${r.t}ms: 帯（${r.banner.phase}）と数字（${r.popups.map((p) => p.text).join(',')}）が同時に出ている`);
    if (r.banner) for (const i of r.intents) {
      const b = r.banner.box;
      if (b.l < i.r && i.l < b.r && b.t < i.b && i.t < b.b) { problems.push(`${r.t}ms: 帯が敵の予告に重なる`); break; }
    }
  }
  const phases = rows.map((r) => r.banner?.phase).filter((b, i, a) => b && b !== a[i - 1]);
  if (phases.join(',') !== 'enemy,ally') problems.push(`帯の順番が違う: ${phases.join(',')}`);
  // 3. 敵が1体ずつ、間を取って動く（攻撃の動きが始まった時刻）
  const starts = [];
  const seen = new Set();
  for (const r of rows) for (const id of r.attacks) if (!seen.has(id)) { seen.add(id); starts.push({ id, t: r.t }); }
  const gaps = starts.slice(1).map((s, i) => s.t - starts[i].t);
  if (starts.length < 2) problems.push(`敵の攻撃が ${starts.length} 回しか記録されていない`);
  for (const g of gaps) if (g < 400) problems.push(`敵の行動の間が短い: ${g}ms`);
  if (!popupCount) problems.push('数字が1つも出ていない');
  const total = rows[rows.length - 1].t;
  console.log(`${label}: 数字 ${popupCount} コマ・帯 ${phases.join('→')}・敵の行動の間 ${gaps.join('/')}ms・敵の番の全体 ${total}ms`);
  return problems;
}

try {
  const all = [];
  for (const width of widths) {
    for (const [party, enemies] of [[2, ['forestWolf', 'forestWolf', 'toxicShroom']], [4, ['forestWolf', 'forestWolf']]]) {
      const label = `${width}px・${party}人・敵${enemies.length}体`;
      const { rows, issues } = await runOnce(width, party, enemies);
      const problems = analyze(label, rows);
      if (issues.length) problems.push(...issues.map((x) => `画面: ${x}`));
      all.push(...problems.map((p) => `${label}: ${p}`));
    }
  }
  check(!errors.length, errors.join('\n'));
  check(!all.length, all.slice(0, 30).join('\n'));
  console.log('OK: 敵の番の数字・帯・間（コマ送り）');
} finally {
  await browser.close();
}
