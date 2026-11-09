// 世界マップの拡大の確認（360/390/480）:
// 1) 始めは1倍。＋・−・標準のボタンで、1〜2.5倍の範囲で変わる。標準で1倍に戻る
// 2) 2本指のピンチ（CDP のタッチ）で変わる。範囲の外には出ない。指を離すとこの端末の設定に保存される
// 3) 町に入って出ても、読み込み直しても、拡大がそのまま。駒が枠の中に見える
// 4) 最大の拡大で移動しても拡大がそのまま。歩いている駒がずっと枠の中に見える
// 5) 表示の問題（layoutIssues）が無い
// SAMPLE=1 の時は 390×844 の見本の画面写真（最小と最大）だけを screenshots/world-zoom/ に保存する
// 使い方: npx vite preview を起こしてから node scripts/world-zoom.mjs（URL=... で場所を変えられる）
import { mkdirSync } from 'node:fs';
import { chromium, depart, layoutIssues, URL } from './lib.mjs';

const SAMPLE = process.env.SAMPLE === '1';
const browser = await chromium.launch();
const problems = [];
mkdirSync('screenshots/world-zoom', { recursive: true });
mkdirSync('scripts/screenshots', { recursive: true });

const sizes = SAMPLE ? [[390, 844]] : [[360, 640], [390, 844], [480, 854]];
for (const [width, height] of sizes) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, deviceScaleFactor: SAMPLE ? 3 : 1 });
  const page = await ctx.newPage();
  const ng = (m) => problems.push(`${width}px: ${m}`);
  const shot = (n) => page.screenshot({ path: `scripts/screenshots/world-zoom-${width}-${n}.png` });
  const zoom = async () => Number(await page.locator('[data-zoom-controls]').getAttribute('data-zoom'));
  const savedZoom = () => page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/settings') || '{}').worldZoom);
  // 手番の駒が地図の枠の中に見えているか（上下左右の位置の割合）
  const heroView = () =>
    page.evaluate(() => {
      const box = document.querySelector('[data-world-map]').getBoundingClientRect();
      const turn = JSON.parse(localStorage.getItem('card-rpg/adventure')).game.world.turn;
      const el = document.querySelector(`[data-hero="${turn}"]`);
      if (!el) return { inView: false, rx: -1, ry: -1 };
      const h = el.getBoundingClientRect();
      const cx = h.left + h.width / 2, cy = h.top + h.height / 2;
      return { inView: cx >= box.left && cx <= box.right && cy >= box.top && cy <= box.bottom, rx: (cx - box.left) / box.width, ry: (cy - box.top) / box.height };
    });
  const hexW = () => page.locator('[data-hex] polygon').first().evaluate((p) => p.getBoundingClientRect().width);
  const closeOverlays = async () => {
    for (let k = 0; k < 3; k++) {
      const cont = page.getByText('つづける', { exact: true });
      if (await cont.count()) await cont.first().click().catch(() => {});
      const handoff = page.getByText('スマホを渡して、タップで始める');
      if (await handoff.count()) await handoff.click().catch(() => {});
      await page.waitForTimeout(250);
    }
  };

  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false })); });
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText('2人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(500);
  await closeOverlays();
  await page.waitForTimeout(1600); // 手番のカットインが消えるまで

  // 1) ボタン
  if ((await zoom()) !== 1) ng(`始めが1倍でない（${await zoom()}）`);
  if (!(await page.locator('[data-zoom-out]').isDisabled())) ng('1倍で「−」が押せる');
  const base = await hexW();
  if (SAMPLE) await page.screenshot({ path: 'screenshots/world-zoom/sample-min.png', scale: 'css' });
  else await shot('1-min');
  for (let k = 0; k < 10 && !(await page.locator('[data-zoom-in]').isDisabled()); k++) {
    await page.locator('[data-zoom-in]').click();
    await page.waitForTimeout(120);
  }
  if ((await zoom()) !== 2.5) ng(`＋を押し続けても2.5倍にならない（${await zoom()}）`);
  // 最大で、駒を真ん中へ（「手番のキャラへ戻る」）
  await page.locator('[data-recenter]').click();
  await page.waitForTimeout(700);
  const big = await hexW();
  const ratio = big / base;
  if (Math.abs(ratio - 2.5) > 0.08) ng(`最大のマスの大きさが1倍の2.5倍でない（${ratio.toFixed(2)}倍）`);
  const hv = await heroView();
  if (!hv.inView) ng('最大の拡大で駒が見えない');
  if (SAMPLE) {
    await page.screenshot({ path: 'screenshots/world-zoom/sample-max.png', scale: 'css' });
    console.log(`見本: 1倍のマスの幅 ${base.toFixed(1)}px → 最大 ${big.toFixed(1)}px（${ratio.toFixed(2)}倍・横に約${(width / big).toFixed(1)}マス）`);
    // ボタンの見本: 3つとも押せる大きさ（1.5倍）で、画面全体と、ボタンの周りを3倍の細かさで
    await page.locator('[data-zoom-reset]').click();
    await page.locator('[data-zoom-in]').click();
    await page.locator('[data-zoom-in]').click();
    await page.locator('[data-recenter]').click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'screenshots/world-zoom/sample-buttons.png', scale: 'css' });
    const cb = await page.locator('[data-zoom-controls]').boundingBox();
    const rb = await page.locator('[data-recenter]').boundingBox();
    const x = Math.max(0, cb.x - 90), y = Math.max(0, cb.y - 50);
    await page.screenshot({ path: 'screenshots/world-zoom/sample-buttons-zoom.png', clip: { x, y, width: width - x, height: rb.y + rb.height + 30 - y } });
    await ctx.close();
    continue;
  }
  await shot('2-max');
  if ((await savedZoom()) !== 2.5) ng(`拡大が設定に保存されない（${await savedZoom()}）`);
  await page.locator('[data-zoom-reset]').click();
  await page.waitForTimeout(150);
  if ((await zoom()) !== 1) ng(`標準で1倍に戻らない（${await zoom()}）`);
  await page.locator('[data-zoom-in]').click();
  await page.locator('[data-zoom-in]').click();
  await page.waitForTimeout(150);
  if ((await zoom()) !== 1.5) ng(`＋2回で1.5倍にならない（${await zoom()}）`);
  await page.locator('[data-zoom-out]').click();
  await page.waitForTimeout(150);
  if ((await zoom()) !== 1.25) ng(`−で1.25倍にならない（${await zoom()}）`);

  // 2) ピンチ（CDP のタッチ）。指の間の地面が残る
  const cdp = await ctx.newCDPSession(page);
  const mb = await page.locator('[data-world-map]').boundingBox();
  const cx = mb.x + mb.width / 2, cy = mb.y + mb.height / 2;
  const pinch = async (from, to) => {
    const pts = (d) => [{ x: cx - d / 2, y: cy, id: 1 }, { x: cx + d / 2, y: cy, id: 2 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(from) });
    for (let k = 1; k <= 8; k++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(from + ((to - from) * k) / 8) });
      await page.waitForTimeout(30);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(200);
  };
  await pinch(80, 160); // 1.25 × 2 = 2.5
  const z1 = await zoom();
  if (Math.abs(z1 - 2.5) > 0.03) ng(`ピンチで広げても大きくならない（${z1}）`);
  await pinch(60, 300); // 範囲の外 → 2.5 で止まる
  if ((await zoom()) > 2.5) ng(`ピンチで最大を超える（${await zoom()}）`);
  await pinch(300, 30); // 範囲の外 → 1 で止まる
  if ((await zoom()) !== 1) ng(`ピンチで縮めても1倍で止まらない（${await zoom()}）`);
  await pinch(100, 150); // 1.5
  const z2 = await zoom();
  if (Math.abs(z2 - 1.5) > 0.03) ng(`ピンチで1.5倍にならない（${z2}）`);
  if (Math.abs((await savedZoom()) - z2) > 0.001) ng(`ピンチの後の拡大が設定に保存されない（${await savedZoom()} / ${z2}）`);

  // 3) 最大にして、町に入って出る・読み込み直す
  await page.locator('[data-zoom-reset]').click();
  for (let k = 0; k < 6; k++) await page.locator('[data-zoom-in]').click();
  await page.waitForTimeout(150);
  const invite = page.getByText('誘う', { exact: true });
  if (await invite.count()) await invite.first().click();
  await page.waitForTimeout(150);
  const enter = page.getByText('王都クリスタリアに入る', { exact: true });
  if (!(await enter.count())) ng('町に入るボタンが無い');
  else {
    await enter.click();
    await page.waitForTimeout(400);
    await page.locator('[data-town-exit]').click();
    await page.waitForTimeout(800);
    await closeOverlays();
    if ((await zoom()) !== 2.5) ng(`町から出ると拡大が変わる（${await zoom()}）`);
    if (!(await heroView()).inView) ng('町から出た後に駒が見えない');
  }
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(500);
  await closeOverlays();
  await page.waitForTimeout(1200);
  if ((await zoom()) !== 2.5) ng(`読み込み直すと拡大が変わる（${await zoom()}）`);
  const hr = await heroView();
  if (!hr.inView) ng('読み込み直した後に駒が見えない');
  await shot('3-reloaded');

  // 4) 最大の拡大で移動。歩いている間も拡大はそのまま、駒は枠の中
  const roll = page.getByText('移動力の判定', { exact: true });
  if (!(await roll.count())) ng('移動力の判定のボタンが無い');
  else {
    await roll.click();
    await page.locator('[data-roll-spinning]').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    // 一番遠い（数字が大きい）光るマスのうち、枠の中に見えているもの
    const target = await page.evaluate(() => {
      const box = document.querySelector('[data-world-map]').getBoundingClientRect();
      const list = [...document.querySelectorAll('[data-reach]')]
        .map((g) => ({ i: Number(g.getAttribute('data-reach')), cost: Number(g.getAttribute('data-cost')), r: g.getBoundingClientRect() }))
        .filter(({ r }) => r.left + r.width / 2 > box.left + 20 && r.left + r.width / 2 < box.right - 70 && r.top + r.height / 2 > box.top + 20 && r.top + r.height / 2 < box.bottom - 20);
      list.sort((a, b) => b.cost - a.cost);
      const t = list[0];
      return t ? { i: t.i, x: t.r.left + t.r.width / 2, y: t.r.top + t.r.height / 2 } : null;
    });
    if (!target) ng('見えている光るマスが無い');
    else {
      await page.mouse.click(target.x, target.y);
      await page.waitForTimeout(400);
      const issues = await layoutIssues(page);
      if (issues.length) ng(`行き先を選んだ時の表示の問題: ${issues.join(' / ')}`);
      await shot('4-selected');
      const go = page.locator('button:has-text("移動する")');
      if (!(await go.count())) ng('「移動する」のボタンが無い');
      else {
        await go.first().click();
        let out = 0, seen = 0, zoomChanged = false;
        for (let k = 0; k < 40; k++) {
          await page.waitForTimeout(100);
          if (!(await page.locator('[data-world-map]').count())) break; // 戦闘・イベントなどへ
          const z = await zoom().catch(() => 2.5);
          if (z !== 2.5) zoomChanged = true;
          const moving = await page.evaluate(() => !!document.querySelector('[data-hero] [data-hopping], .footprint'));
          const v = await page.evaluate(() => {
            const box = document.querySelector('[data-world-map]').getBoundingClientRect();
            return [...document.querySelectorAll('[data-hero]')].map((el) => {
              const z = Number(getComputedStyle(el).zIndex);
              const h = el.getBoundingClientRect();
              const cx = h.left + h.width / 2, cy = h.top + h.height / 2;
              return { moving: z >= 10, inView: cx >= box.left && cx <= box.right && cy >= box.top && cy <= box.bottom };
            }).filter((x) => x.moving);
          });
          if (v.length) {
            seen++;
            if (v.some((x) => !x.inView)) out++;
          }
          if (k === 6) await shot('5-walking');
          if (!moving && seen > 3) break;
        }
        if (zoomChanged) ng('歩いている間に拡大が変わった');
        if (!seen) ng('歩いている駒が見つからない');
        if (out) ng(`歩いている駒が枠の外に出た（${out}回）`);
        await page.waitForTimeout(1200);
        if (await page.locator('[data-zoom-controls]').count()) {
          if ((await zoom()) !== 2.5) ng(`移動の後に拡大が変わる（${await zoom()}）`);
          const issues2 = await layoutIssues(page);
          if (issues2.length) ng(`移動の後の表示の問題: ${issues2.join(' / ')}`);
        }
        await shot('6-after');
      }
    }
  }
  if ((await savedZoom()) !== 2.5) ng(`最後に設定の拡大が2.5でない（${await savedZoom()}）`);
  await ctx.close();
  console.log(`${width}px: 確認済み（1倍のマス ${base.toFixed(1)}px → 最大 ${big.toFixed(1)}px・${ratio.toFixed(2)}倍）`);
}
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log(SAMPLE ? 'OK: 見本の画面写真を保存した' : 'OK: 世界マップの拡大（ボタン・ピンチ・保存・町・読み込み直し・最大での移動）360/390/480');
