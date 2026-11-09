// 世界マップの移動で、動いていない駒が作り直されず・マスからずれないことを毎フレーム測る。
//   - 移動前 → 移動中（各フレーム）→ 到着の演出 → 移動後 で、全キャラの駒の要素が同じもの（作り直されていない）
//   - 止まっている駒と、その駒が乗っているマスとの位置の差が変わらない（0px）
//   - 歩いている間は、移動前の霧と敵の数のまま（ゴールの視界・敵が先に出ない）
//   - 突発イベントは「！」のカットインと窓が同時に見えない
// 使い方: npx vite build && npx vite preview --port 4173 を動かしたまま node scripts/world-move-stability.mjs
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues, startBattle, waitForWorldMovement } from './lib.mjs';
const dir = 'screenshots/world-move-stability'; await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const check = (ok, text) => { if (!ok) throw new Error(text); };

async function run(width, party) {
  const page = await browser.newPage({ viewport: { width, height: 780 } });
  page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const read = async () => { await page.waitForTimeout(300); return page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure'))); };
  const resume = async (d) => {
    await page.evaluate((d) => {
      localStorage.setItem('card-rpg/adventure', JSON.stringify(d));
      localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false }));
    }, d);
    await page.reload(); await page.getByText('つづきから', { exact: true }).click(); await page.waitForTimeout(400);
  };
  try {
    await startBattle(page, party, ['forestWolf']);
    const base = await read();
    const fixture = (kind) => {
      const d = structuredClone(base), g = d.game, w = g.world;
      g.mode = 'world'; g.expeditions = []; delete g.battle; delete g.dungeon; delete g.party; delete g.event; delete g.encounter;
      w.story = undefined; w.move = 6; w.turn = 'h0'; w.acted = []; w.lastMove = undefined; w.moveProposal = undefined;
      const enemy = structuredClone(w.wanderers[0]);
      // 左側の5列だけ見えている。右は霧。動くのは h0 が 0 → 3（1行目）、ほかは2〜3行下の別々のマスで止まっている
      w.tiles.forEach((t, i) => { t.t = 'road'; t.f = undefined; t.seen = i % w.width < 5; });
      w.visitedRegions = Array.from({ length: 100 }, (_, i) => i);
      const spots = [0, w.width * 2 + 1, w.width * 2 + 3, w.width * 3 + 2];
      g.heroes.forEach((h, k) => { w.pos[h.id] = spots[k]; h.lastRandomEvent = w.worldTurn; });
      // 霧の中の敵（歩いている間に先に出てきてはいけない）
      enemy.tile = w.width * 1 + 7; w.wanderers = [enemy];
      if (kind === 'event') {
        delete g.heroes[0].lastRandomEvent;
        w.wanderers = [];
        // 最初の抽選で突発イベントが起きる固定状態（ゲーム側は通常のRngを使う）。
        g.rngState = 7;
      }
      return d;
    };

    // ---- 1. 駒の作り直し・ずれ・未来の状態の先出し ----
    await resume(fixture('stable'));
    const target = page.locator('[data-reach="3"]'); await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.evaluate(() => {
      const heroes = [...document.querySelectorAll('[data-hero]')];
      const rel = (el) => {
        const tile = el.getAttribute('data-tile');
        const hex = document.querySelector(`[data-hex="${tile}"]`);
        if (!hex) return null;
        const a = el.getBoundingClientRect(), b = hex.getBoundingClientRect();
        return { tile, dx: a.x - b.x, dy: a.y - b.y };
      };
      const fog = () => document.querySelectorAll('[data-fog-tile]').length;
      const enemies = () => document.querySelectorAll('[data-wanderer]').length;
      window.__probe = {
        nodes: Object.fromEntries(heroes.map(e => [e.dataset.hero, e])),
        start: Object.fromEntries(heroes.map(e => [e.dataset.hero, rel(e)])),
        fog0: fog(), enemies0: enemies(),
        frames: 0, sawMoving: false, sawArrival: false, remounted: new Set(), maxShift: {}, stepFog: [], stepEnemies: [], afterFog: null, afterEnemies: null,
        stripMax: 0, heroHidden: 0,
      };
      const p = window.__probe;
      const tick = () => {
        p.frames++;
        const moving = document.querySelector('[data-world-moving]');
        const phase = moving?.getAttribute('data-world-moving');
        if (phase === 'steps') { p.sawMoving = true; p.stepFog.push(fog()); p.stepEnemies.push(enemies()); }
        // フェーズ2-D: 移動中は下のパネルの代わりに小さな帯だけ。歩いている駒（h0）は地図の見える範囲に入っている
        if (moving) {
          p.stripMax = Math.max(p.stripMax, moving.getBoundingClientRect().height);
          const map = document.querySelector('[data-world-map]')?.getBoundingClientRect();
          const h0 = document.querySelector('[data-hero="h0"]')?.getBoundingClientRect();
          if (map && h0 && (h0.top + h0.height / 2 < map.top || h0.top + h0.height / 2 > map.bottom)) p.heroHidden++;
        }
        if (phase === 'arrival') p.sawArrival = true;
        for (const [id, node] of Object.entries(p.nodes)) {
          const now = document.querySelector(`[data-hero="${id}"]`);
          if (now !== node || !node.isConnected) p.remounted.add(id);
          if (id === 'h0' || !now) continue;
          const r = rel(now), s = p.start[id];
          if (!r || !s || r.tile !== s.tile) { p.maxShift[id] = Infinity; continue; }
          p.maxShift[id] = Math.max(p.maxShift[id] ?? 0, Math.abs(r.dx - s.dx), Math.abs(r.dy - s.dy));
        }
        if (p.sawArrival && !moving) { if (p.afterFog === null) { p.afterFog = fog(); p.afterEnemies = enemies(); } if (p.frames > 2000) return; }
        if (!p.done) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.locator('button:has-text("移動する")').click();
    await page.locator('[data-world-moving]').waitFor();
    if (width === 390) await page.screenshot({ path: `${dir}/${party}p-moving.png` });
    await waitForWorldMovement(page);
    await page.waitForTimeout(600);
    const probe = await page.evaluate(() => { const p = window.__probe; p.done = true; return { ...p, nodes: undefined, remounted: [...p.remounted] }; });
    const issues = await layoutIssues(page);
    await page.screenshot({ path: `${dir}/${width}-${party}p-after.png` });
    check(probe.sawMoving && probe.sawArrival, `${width}px ${party}人: 移動の演出を観測できない`);
    check(!probe.remounted.length, `${width}px ${party}人: 駒が作り直された ${probe.remounted}`);
    const shifts = Object.entries(probe.maxShift);
    check(shifts.length === party - 1, `${width}px ${party}人: 止まっている駒を測れない ${JSON.stringify(probe.maxShift)}`);
    for (const [id, px] of shifts) check(px < 0.5, `${width}px ${party}人: ${id} がマスから ${px}px ずれた`);
    check(probe.stepFog.every(n => n === probe.fog0), `${width}px ${party}人: 歩いている間に霧が晴れた ${probe.fog0}→${[...new Set(probe.stepFog)]}`);
    check(probe.stepEnemies.every(n => n === probe.enemies0), `${width}px ${party}人: 歩いている間に敵が出た ${probe.enemies0}→${[...new Set(probe.stepEnemies)]}`);
    check(!issues.length, `${width}px ${party}人: ${issues}`);
    check(probe.stripMax > 0 && probe.stripMax <= 90, `${width}px ${party}人: 移動中の下の帯が高すぎる（${probe.stripMax}px）`);
    check(probe.heroHidden === 0, `${width}px ${party}人: 歩いている駒が地図の外に出た（${probe.heroHidden}フレーム）`);
    console.log(`OK: ${width}px ${party}人 ${probe.frames}フレーム・作り直し0・止まっている駒のずれ最大${Math.max(...shifts.map(s => s[1])).toFixed(2)}px・歩行中の霧${probe.fog0}/敵${probe.enemies0}のまま（到着後 霧${probe.afterFog}/敵${probe.afterEnemies}）`);

    // ---- 2. 突発イベント: 「！」のカットインと窓を重ねない ----
    await resume(fixture('event'));
    const t2 = page.locator('[data-reach="3"]'); await t2.scrollIntoViewIfNeeded();
    const b2 = await t2.boundingBox(); await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2);
    await page.locator('button:has-text("移動する")').click();
    await page.locator('[data-world-moving]').waitFor();
    await page.evaluate(() => {
      window.__ev = { overlap: 0, frames: 0, marker: 0 };
      const tick = () => {
        const e = window.__ev; e.frames++;
        const win = document.querySelector('[data-event-window]');
        if (win) {
          const wo = Number(getComputedStyle(win).opacity);
          const cut = [...document.querySelectorAll('[aria-hidden]')].find(x => x.textContent.trim() === '！');
          const co = cut ? Number(getComputedStyle(cut).opacity) : 0;
          if (wo > 0.05 && co > 0.05) e.overlap++;
          if (document.querySelector('[data-arrival-marker]')) e.marker++;
        }
        if (e.frames < 600) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await waitForWorldMovement(page);
    await page.locator('[data-event-window]').waitFor();
    await page.waitForTimeout(700);
    const ev = await page.evaluate(() => window.__ev);
    const saved = await read();
    check(saved.game.mode === 'event', `${width}px ${party}人: 突発イベントにならない`);
    check(ev.overlap === 0, `${width}px ${party}人: 「！」と窓が ${ev.overlap} フレーム重なった`);
    check(ev.marker === 0, `${width}px ${party}人: 到着の「！」が窓の後ろに残った`);
    check(!errors.length, errors.join('\n'));
    if (width === 390) await page.screenshot({ path: `${dir}/${party}p-event.png` });
    console.log(`OK: ${width}px ${party}人 突発イベントの「！」と窓の重なり0フレーム`);
  } catch (e) {
    await page.screenshot({ path: `${dir}/failure-${width}-${party}.png` }).catch(() => {});
    throw e;
  } finally {
    await page.close();
  }
}

try {
  for (const party of [2, 4]) for (const width of [360, 390, 480]) await run(width, party);
} finally {
  await browser.close();
}
