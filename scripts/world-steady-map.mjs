// 世界マップが「ガックン」と動かないことの確認（360/390/480 × 1倍・2倍）:
// 「移動する」を押す前・歩いている間・到着・パネルが戻った後まで、毎フレーム次を記録する
//   - 地図の枠（[data-world-map]）の画面上の位置と大きさ → いつも同じ（0px）
//   - 地図（SVG）の画面上の位置 → 下のパネルが「移動中…」の帯に変わる・戻るフレームでは動かない（0px）
//   - 1フレームで地図が動く量（カメラがなめらかに追っているか。跳んでいないか）
//   - 歩いている駒が「地図の枠の上の端〜パネルの上の端」に見えている
// 使い方: npx vite preview を起こしてから node scripts/world-steady-map.mjs（URL=... で場所を変えられる）
import { chromium, depart, layoutIssues, URL } from './lib.mjs';

const browser = await chromium.launch();
const problems = [];
for (const [width, height] of [[360, 640], [390, 844], [480, 854]]) {
  for (const zoom of [1, 2]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const tag = `${width}px ${zoom}倍`;
    const ng = (m) => problems.push(`${tag}: ${m}`);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);
    await page.evaluate((z) => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false, worldZoom: z })); }, zoom);
    await page.reload();
    await page.getByText('新しい冒険').click();
    await page.getByText('2人', { exact: true }).click();
    await page.getByText('キャラクター作成へ').click();
    await depart(page);
    await page.waitForTimeout(500);
    const cont = page.getByText('つづける', { exact: true });
    if (await cont.count()) await cont.first().click();
    await page.waitForTimeout(1600);
    // 1人で歩く（同行を外す）と、到着の後に手番が隣の仲間へ移る（手番の切り替えのカメラも見られる）
    const solo = page.getByText('同行を解除して単独行動する', { exact: true });
    await page.locator('[data-roll-move]').click();
    await page.locator('[data-roll-spinning]').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    if (await solo.count()) { await solo.click(); await page.waitForTimeout(300); }
    const target = await page.evaluate(() => {
      const box = document.querySelector('[data-world-map]').getBoundingClientRect();
      const panel = document.querySelector('[data-world-panel]').getBoundingClientRect();
      const bottom = Math.min(box.bottom, panel.top);
      const list = [...document.querySelectorAll('[data-reach]')]
        .map((g) => ({ cost: Number(g.getAttribute('data-cost')), r: g.getBoundingClientRect() }))
        .map(({ cost, r }) => ({ cost, x: r.left + r.width / 2, y: r.top + r.height / 2 }))
        .filter(({ x, y }) => x > box.left + 20 && x < box.right - 70 && y > box.top + 20 && y < bottom - 20);
      list.sort((a, b) => b.cost - a.cost);
      return list[0] ?? null;
    });
    if (!target) { ng('見えている光るマスが無い'); await page.close(); continue; }
    await page.mouse.click(target.x, target.y);
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const p = (window.__steady = { frames: 0, boxMoved: 0, panelFrames: 0, panelShift: 0, maxStep: 0, hidden: 0, sawMoving: false, after: 0, done: false });
      const rect = (sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom } : null; };
      let prev = null;
      const tick = () => {
        p.frames++;
        const box = rect('[data-world-map]'), svg = rect('[data-world-map] svg');
        const moving = document.querySelector('[data-world-moving]');
        // 見えているパネルの上の端（移動中は帯、それ以外は操作パネル）
        const panel = moving ? rect('[data-world-moving]') : rect('[data-world-panel]');
        if (moving) p.sawMoving = true;
        if (box && svg && panel) {
          if (prev) {
            if (Math.abs(box.x - prev.box.x) + Math.abs(box.y - prev.box.y) + Math.abs(box.w - prev.box.w) + Math.abs(box.h - prev.box.h) > 0.5) p.boxMoved++;
            const shift = Math.hypot(svg.x - prev.svg.x, svg.y - prev.svg.y);
            if (!!moving !== prev.moving) { p.panelFrames++; p.panelShift = Math.max(p.panelShift, shift); }
            p.maxStep = Math.max(p.maxStep, shift);
          }
          if (moving) {
            const walker = [...document.querySelectorAll('[data-hero]')].find((el) => Number(getComputedStyle(el).zIndex) >= 10);
            if (walker) {
              const h = walker.getBoundingClientRect();
              const cy = h.top + h.height / 2;
              if (cy < box.top || cy > Math.min(box.bottom, panel.top)) p.hidden++;
            }
          } else if (p.sawMoving) p.after++;
          prev = { box, svg, panel, moving: !!moving };
        }
        if (!p.done) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const go = page.locator('button:has-text("移動する")');
    if (!(await go.count())) { ng('「移動する」のボタンが無い'); await page.close(); continue; }
    await go.first().click();
    await page.locator('[data-world-moving]').waitFor({ timeout: 3000 }).catch(() => {});
    await page.locator('[data-world-moving]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => ng('移動の演出が終わらない'));
    await page.waitForTimeout(1500);
    const p = await page.evaluate(() => { window.__steady.done = true; return window.__steady; });
    if (!p.sawMoving) ng('移動の演出を観測できない');
    if (p.boxMoved) ng(`地図の枠が動いた・大きさが変わった（${p.boxMoved}フレーム）`);
    // 到着の後に戦闘・イベントの画面へ切り替わると「戻る」は地図の上では見えないので、帯に変わる瞬間（1回以上）を必ず見る
    if (p.panelFrames < 1) ng(`パネルが帯に変わる瞬間を観測できない（${p.panelFrames}回）`);
    if (p.panelShift > 0.5) ng(`パネルが帯に変わった・戻った瞬間に地図が ${p.panelShift.toFixed(1)}px 動いた`);
    if (p.maxStep > 60) ng(`1フレームで地図が ${p.maxStep.toFixed(0)}px 動いた（跳んでいる）`);
    if (p.hidden) ng(`歩いている駒がパネルの下や枠の外に隠れた（${p.hidden}フレーム）`);
    if (await page.locator('[data-world-map]').count()) {
      const issues = await layoutIssues(page);
      if (issues.length) ng(`表示の問題: ${issues.join(' / ')}`);
    }
    if (errors.length) ng(`例外: ${errors.join(' / ')}`);
    if (width === 390) await page.screenshot({ path: `scripts/screenshots/world-steady-${width}-${zoom}x-after.png` });
    console.log(`${tag}: ${p.frames}フレーム・パネルが帯に変わった・戻った${p.panelFrames}回のずれ最大${p.panelShift.toFixed(1)}px・1フレームの動き最大${p.maxStep.toFixed(1)}px・枠の変化${p.boxMoved}`);
    await page.close();
  }
}
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: 移動の前・最中・後で地図の枠は動かず、パネルが変わる瞬間の地図のずれ0（360/390/480・1倍/2倍）');
