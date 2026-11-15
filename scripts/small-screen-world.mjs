// 狭い画面 回1（2026-11-15）: 世界マップの低い画面の確認。scripts/small-screen.mjs から呼ぶ（戦闘の所とは別の関数・別のファイル）。
// 1台だけ・オンラインなし（本番の Firebase には何もしない）。シナリオ2（凍てつく王国）・2人（と4人）。
//   (1) 低い形（[data-app-root] の data-low）になっている
//   (2) 見えている地図の高さ: いちばん混んだ時（災厄3体＋温泉＋2人同じマス＋入れる施設）でも 390×540 は 200px・360×520 は 180px 以上。
//       ふつうの時（1人で野原）・マスの説明の帯が出ている時も測って記録する（落とす線にはしない）
//   (3) 12px より小さい字・44px より小さいボタン・横のはみ出しが無い（lib.mjs の layoutIssues）
//   (4) 💀×N（仲間の列）・🔍（拡大）・♨／❄ の札が、押すと開き、もう1度押すか外（地図）を押すと閉じる。開いた中身に全文がある
//   (5) 町の画面の災厄は1行の帯（畳まない）。押すと説明が開く
//   (6) 手番の駒の真ん中を押すと地図に当たる（ボタン・帯に当たらない）
//   (7) 4人: 仲間の列は横に送れる（はみ出しても、ステータスのボタンまで送れる）
//   (8) CSS の高さは 720px だが、見えている高さ（visualViewport）が 540px の時も低い形（「次の目的」の行は出ず、パネルの短い「次:」が出る）
//   (9) 通信の知らせ（LAYER.online）のカードが上に出ている時に、💀・🔍 が押せるか（回2 で知らせを仲間の列の下へ出したので、落とす線にした）
//   (10) 回2: 雪に埋もれた街道の札（振るボタンのすぐ右・押すと全文。ふつうの画面 390×844・360×640 も）
//   edgeChecks（SMALL_SCREEN_PARTS=edges）: 地図の右の余白と、端のマス（下の方の説明）
import { mkdirSync, writeFileSync } from 'node:fs';
import { depart, layoutIssues } from './lib.mjs';

const KEY = 'card-rpg/adventure';
const SETTINGS = JSON.stringify({ fastMode: true, vibration: false, firstGuide: false, overviewHintSeen: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SCOURGES = [['whiteWolfKing', 'scourgeWhiteWolfKing'], ['frostBellWraith', 'scourgeBellWraith'], ['lampEaterShade', 'scourgeLightEater']];

/** 新しい冒険（凍てつく王国・n人）を始めて、物語を閉じた保存データを返す */
async function newSave(page, BASE, n) {
  await page.goto(BASE);
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', s);
    const ids = ['corruptionKing', 'cursedArchipelago', 'sandDynasty', 'starCastle', 'clockworkEmpire', 'dreamLabyrinth'];
    localStorage.setItem('card-rpg/profile', JSON.stringify({ version: 1, clears: Object.fromEntries(ids.map((i) => [i, 1])) }));
  }, SETTINGS);
  await page.reload();
  await page.getByText('新しい冒険').click();
  const card = page.locator('[data-scenarios] button', { hasText: '凍てつく王国' }).first();
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await wait(150);
  await page.getByText(`${n}人`, { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await wait(500);
  const d = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  d.game.world.story = undefined;
  return d;
}
const load = async (page, BASE, d) => {
  await page.goto(BASE);
  await page.evaluate(({ d, k, s }) => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', s);
    localStorage.setItem(k, JSON.stringify(d));
  }, { d, k: KEY, s: SETTINGS });
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await wait(1300);
};
/** 保存データを書き換えた写し */
const variant = (base, fn) => {
  const d = structuredClone(base);
  fn(d.game);
  return d;
};
const addScourges = (w, avoid) => {
  w.wanderers = w.wanderers.filter((x) => !x.scourge);
  const far = w.tiles.findIndex((x, i) => !x.f && i !== avoid && i % w.width < 3);
  for (const s of SCOURGES) w.wanderers.push({ id: `w${w.nextWandererId++}`, tile: far + w.wanderers.length, enemies: [{ defId: s[1], level: 7 }], scourge: s[0] });
  w.scourgesMet = SCOURGES.map((s) => s[0]);
};
/** いちばん混んだ時: 寒い地域のダンジョンの入口に全員・温泉で温まっている・災厄3体 */
const worstOf = (base) =>
  variant(base, (g) => {
    const w = g.world;
    const ids = Object.keys(w.pos);
    const t = w.tiles.findIndex((x) => x.f?.kind === 'dungeon' && x.f.id === 'crystalCave');
    for (const id of ids) w.pos[id] = t;
    w.prevTile = t;
    w.tiles[t].seen = true;
    w.warm = Object.fromEntries(ids.map((id) => [id, w.worldTurn + 3]));
    addScourges(w, t);
  });
/** 寒さ（温泉なし）: ダンジョンの入口・2人目は別のマス */
const coldOf = (base) =>
  variant(base, (g) => {
    const w = g.world;
    const ids = Object.keys(w.pos);
    const t = w.tiles.findIndex((x) => x.f?.kind === 'dungeon' && x.f.id === 'crystalCave');
    w.pos[ids[0]] = t;
    w.prevTile = t;
    w.tiles[t].seen = true;
    w.warm = undefined;
  });
/** 1人で野原（ふつうの時） */
const soloOf = (base) =>
  variant(base, (g) => {
    const w = g.world;
    const ids = Object.keys(w.pos);
    const start = w.pos[ids[0]];
    const land = (x) => !x.f && x.seen && !['sea', 'lake', 'deepSea', 'mountain'].includes(x.t);
    const t0 = [start - w.width, start - w.width + 1, start - 2 * w.width, start + 1, start - 1].find((i) => w.tiles[i] && land(w.tiles[i]));
    w.pos[ids[0]] = t0;
    w.prevTile = t0;
  });
/** 町（災厄3体） */
const townOf = (base) =>
  variant(base, (g) => {
    const w = g.world;
    const t = w.tiles.findIndex((x) => x.f?.kind === 'town');
    for (const id of Object.keys(w.pos)) w.pos[id] = t;
    w.prevTile = t;
    addScourges(w, t);
  });

const worldBox = (page) =>
  page.evaluate(() => {
    const r = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), h: Math.round(b.height), w: Math.round(b.width) };
    };
    const area = r('[data-world-area]');
    const panel = r('[data-world-panel]');
    const info = r('[data-tile-info]');
    const act = document.querySelector('[data-hero][data-active]');
    let pieceHit = null;
    if (act) {
      const b = act.getBoundingClientRect();
      const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height * 0.6);
      pieceHit = t ? !!t.closest('[data-world-map]') && !t.closest('button') : false;
    }
    return {
      low: document.querySelector('[data-app-root]')?.hasAttribute('data-low') ?? null,
      visibleMapH: area && panel ? panel.top - area.top : null,
      underInfo: area && info ? info.top - area.top : null,
      pieceHit,
    };
  });
/** その要素の真ん中に、ほかの物が乗っていないか */
/** 消えるまで待つ（閉じる時の薄くなる動きを待つ。重い時のため最大2秒） */
const gone = async (page, sel) => {
  await page.locator(sel).first().waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
  return !(await page.locator(sel).count());
};
const onTop = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return !!t && (t === el || el.contains(t));
  }, sel);

/** 街道のマス（災厄3体 = 凍て鐘の亡霊が生きている）に2人。振る前 */
const buriedOf = (base) =>
  variant(base, (g) => {
    const w = g.world;
    const start = w.pos[Object.keys(w.pos)[0]];
    const sr = Math.floor(start / w.width);
    let t = -1, best = Infinity;
    w.tiles.forEach((x, i) => {
      if (x.t !== 'road' || x.f) return;
      const d = Math.abs(Math.floor(i / w.width) - sr);
      if (d < best) (best = d), (t = i);
    });
    for (const id of Object.keys(w.pos)) w.pos[id] = t;
    w.prevTile = t;
    w.tiles[t].seen = true;
    w.move = null;
    w.moveDice = undefined;
    w.warm = undefined;
    addScourges(w, t);
  });
/** 狭い画面 回2（C）: 埋もれた街道の札がある・押すと全文（エンジンの文）・もう1度押すと消える・街道ボーナスの札は出ない */
async function buriedCheck(page, BASE, base2, tag, shot, check) {
  await load(page, BASE, buriedOf(base2));
  const chip = page.locator('[data-road-buried]');
  check((await chip.count()) === 1, `${tag} 雪に埋もれた街道の札がある（振るボタンのすぐ右）`, 'world');
  check(!(await page.locator('[data-road-bonus]').count()), `${tag} 埋もれている時は「街道ボーナス +1」の札が出ない`, 'world');
  if (!(await chip.count())) return;
  const pos = await page.evaluate(() => {
    const c = document.querySelector('[data-road-buried]').getBoundingClientRect();
    const r = document.querySelector('[data-roll-move]').getBoundingClientRect();
    return { sameRow: Math.abs(c.top + c.height / 2 - (r.top + r.height / 2)) < 6, rightOf: c.left >= r.right - 1, h: Math.round(c.height), text: document.querySelector('[data-road-buried]').innerText.replace(/\n/g, '') };
  });
  check(pos.sameRow && pos.rightOf && pos.h >= 44, `${tag} 札は振るボタンと同じ行の右・高さ ${pos.h}px（${pos.text}）`, 'world');
  await chip.click();
  await wait(250);
  const t = await page.locator('[data-tile-info]').innerText().catch(() => '');
  check(t === '❄ 街道が雪に埋もれている（凍て鐘の亡霊のせいで、街道ボーナス +1 が無い）', `${tag} 札を押すとエンジンの全文が出る（${t}）`, 'world');
  await shot('road-buried');
  await chip.click();
  await wait(250);
  check(!(await page.locator('[data-tile-info]').count()), `${tag} 札をもう1度押すと消える`, 'world');
  for (const i of await layoutIssues(page)) check(false, `${tag} 埋もれた街道の時: ${i}`, 'world');
}

export async function worldMapChecks({ browser, BASE, OUT, check }) {
  const sizes = (process.env.WORLD_SIZES ?? '390x540,360x520').split(',').map((s) => s.split('x').map(Number));
  mkdirSync(OUT, { recursive: true });
  const heights = [];
  // 保存データは1回だけ作る（2人・4人）
  const maker = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const base2 = await newSave(maker, BASE, 2);
  const base4 = await newSave(maker, BASE, 4);
  await maker.close();
  for (const [W, H] of sizes) {
    const tag = `${W}x${H}`;
    const need = H >= 540 ? 200 : 180;
    console.log(`\n===== 世界マップ ${W}×${H}（地図の目安 ${need}px） =====`);
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => check(false, `${tag} 世界マップ pageerror: ${e.message}`, 'world'));
    const shot = (name) => page.screenshot({ path: `${OUT}/world-${tag}-${name}.png` });
    const H_ = { size: tag };
    try {
      // ---- ふつうの時（1人で野原） ----
      await load(page, BASE, soloOf(base2));
      let m = await worldBox(page);
      check(m.low === true, `${tag} 世界マップ: 低い形（data-low）になっている`, 'world');
      H_.solo = m.visibleMapH;
      await shot('1-solo');
      for (const i of await layoutIssues(page)) check(false, `${tag} 世界マップ（ふつうの時）: ${i}`, 'world');
      await page.locator('[data-roll-move]').click();
      await wait(2200);
      m = await worldBox(page);
      H_.soloRolled = m.visibleMapH;
      for (const i of await layoutIssues(page)) check(false, `${tag} 世界マップ（振った後）: ${i}`, 'world');
      const reach = page.locator('[data-reach]');
      if (await reach.count()) {
        const b = await reach.first().boundingBox();
        await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
        await wait(400);
        m = await worldBox(page);
        H_.soloInfo = m.underInfo;
        await shot('2-solo-info');
      }

      // ---- いちばん混んだ時（災厄3体＋温泉＋2人同じマス＋ダンジョンの入口） ----
      await load(page, BASE, worstOf(base2));
      m = await worldBox(page);
      H_.worst = m.visibleMapH;
      check(m.visibleMapH >= need, `${tag} 混んだ時（振る前）: 見えている地図 ${m.visibleMapH}px ≥ ${need}px`, 'world');
      check(m.pieceHit === true, `${tag} 混んだ時: 手番の駒の真ん中を押すと地図に当たる`, 'world');
      await shot('3-worst');
      for (const i of await layoutIssues(page)) check(false, `${tag} 世界マップ（混んだ時）: ${i}`, 'world');
      // ♨ の札（駒の右上）の字は 12px 以上
      const warmFont = await page.evaluate(() => {
        const e = document.querySelector('[data-hero-warm]');
        return e ? parseFloat(getComputedStyle(e).fontSize) : null;
      });
      check(warmFont !== null && warmFont >= 12, `${tag} 駒の ♨ の札の字が 12px 以上（${warmFont}px）`, 'world');
      // 💀×N: 押すと開く → もう1度押す（= 窓の外）で閉じる。×でも閉じる
      const skull = page.locator('[data-scourge-button]');
      check((await skull.count()) === 1 && (await page.locator('[data-party-row] [data-scourge-button]').count()) === 1, `${tag} 💀×N のボタンが仲間の列にある`, 'world');
      check((await page.locator('[data-scourge-place]').count()) === 0, `${tag} 低い画面の世界マップでは、4行の災厄の札は出ない（畳む）`, 'world');
      check((await onTop(page, '[data-scourge-button]')) === true, `${tag} 💀×N のボタンが押せる`, 'world');
      await skull.click();
      await wait(400);
      check((await page.locator('[data-scourge-dialog]').count()) === 1 && (await page.locator('[data-scourge-row]').count()) === 3, `${tag} 💀×3 を押すと説明の窓（3体ぶん）が開く`, 'world');
      check((await onTop(page, '[data-scourge-close]')) === true, `${tag} 説明の窓の×が押せる`, 'world');
      await shot('4-skull-open');
      const sb = await skull.boundingBox();
      await page.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2);
      check(await gone(page, '[data-scourge-dialog]'), `${tag} 💀 をもう1度押す（窓の外）と閉じる`, 'world');
      await skull.click();
      await wait(300);
      await page.locator('[data-scourge-close]').click();
      check(await gone(page, '[data-scourge-dialog]'), `${tag} 説明の窓は×でも閉じる`, 'world');
      // 🔍: 押すと ＋・標準・− が開く → もう1度押すと閉じる → 開いて地図を押すと閉じる（マスは選ばない）
      check((await page.locator('[data-zoom-controls][data-zoom-folded="closed"]').count()) === 1 && !(await page.locator('[data-zoom-in]').count()), `${tag} 拡大のボタンは畳んだ形（見取り図＋🔍）`, 'world');
      await page.locator('[data-zoom-toggle]').click();
      await wait(250);
      check((await page.locator('[data-zoom-tray] [data-zoom-in]').count()) === 1 && (await onTop(page, '[data-zoom-in]')) === true, `${tag} 🔍 を押すと ＋・標準・− が開いて押せる`, 'world');
      await shot('5-zoom-open');
      await page.locator('[data-zoom-in]').click();
      await wait(300);
      check((await page.locator('[data-zoom-tray]').count()) === 1, `${tag} ＋を押しても開いたまま（続けて押せる）`, 'world');
      await page.locator('[data-zoom-toggle]').click();
      await wait(250);
      check(!(await page.locator('[data-zoom-tray]').count()), `${tag} 🔍 をもう1度押すと閉じる`, 'world');
      await page.locator('[data-zoom-toggle]').click();
      await wait(250);
      const area = await page.locator('[data-world-area]').boundingBox();
      await page.mouse.click(area.x + 30, area.y + 70);
      await wait(300);
      check(!(await page.locator('[data-zoom-tray]').count()) && !(await page.locator('[data-tile-info]').count()), `${tag} 🔍 が開いている時に地図を押すと閉じる（マスの説明は出ない）`, 'world');
      // ♨ の札: 押すと全文（「寒さを受けない」）がパネルのすぐ上に出る。もう1度押すと消える
      const chip = page.locator('[data-warmth-chip]');
      check((await chip.count()) === 1, `${tag} 温泉の短い札がある`, 'world');
      if (await chip.count()) {
        await chip.click();
        await wait(250);
        const t = await page.locator('[data-tile-info]').innerText().catch(() => '');
        check(/温泉で温まっている/.test(t) && /寒さを受けない/.test(t), `${tag} ♨ の札を押すと全文が出る（${t}）`, 'world');
        m = await worldBox(page);
        H_.worstWarmInfo = m.underInfo;
        await shot('6-warm-chip');
        await chip.click();
        await wait(250);
        check(!(await page.locator('[data-tile-info]').count()), `${tag} ♨ の札をもう1度押すと消える`, 'world');
      }
      await page.locator('[data-roll-move]').click();
      await wait(2200);
      m = await worldBox(page);
      H_.worstRolled = m.visibleMapH;
      check(m.visibleMapH >= need, `${tag} 混んだ時（振った後）: 見えている地図 ${m.visibleMapH}px ≥ ${need}px`, 'world');
      await shot('7-worst-rolled');
      for (const i of await layoutIssues(page)) check(false, `${tag} 世界マップ（混んだ時・振った後）: ${i}`, 'world');
      check((await page.locator('[data-low-actions] [data-reroll]').count()) <= 1 && (await page.locator('[data-low-actions] [data-camp]').count()) === 1 && (await page.locator('[data-low-actions] [data-world-wait]').count()) === 1, `${tag} 振った後のボタンが1段（振り直す・野営・手番を終える）`, 'world');

      // ---- 寒さ（温泉なし）: ❄ の札を押すと「野営すれば防げる」が読める ----
      await load(page, BASE, coldOf(base2));
      const cold = page.locator('[data-climate-chip]');
      if (await cold.count()) {
        await cold.click();
        await wait(250);
        const t = await page.locator('[data-tile-info]').innerText().catch(() => '');
        check(/野営すれば防げる/.test(t) && /回復は半分/.test(t), `${tag} ❄ の札を押すと全文が出る（${t}）`, 'world');
        await shot('8-cold-chip');
      } else check(false, `${tag} 寒いマスなのに ❄ の札が無い`, 'world');

      // ---- 狭い画面 回2（C）: 雪に埋もれた街道（凍て鐘の亡霊）の札。振るボタンのすぐ右・押すと全文 ----
      await buriedCheck(page, BASE, base2, tag, shot, check);

      // ---- 町の画面: 災厄は1行の帯（畳まない） ----
      await load(page, BASE, townOf(base2));
      await page.locator('[data-interact]').click();
      await wait(1200);
      const line = await page.evaluate(() => {
        const e = document.querySelector('[data-scourge-line]');
        if (!e) return null;
        const b = e.getBoundingClientRect();
        return { h: Math.round(b.height), text: e.innerText.replace(/\n/g, ' ') };
      });
      check(!!line && line.h <= 48, `${tag} 町の画面の災厄は1行の帯（${JSON.stringify(line)}）`, 'world');
      if (line) {
        await page.locator('[data-scourge-line]').click();
        await wait(400);
        check((await page.locator('[data-scourge-row]').count()) === 3, `${tag} 町の画面の帯を押すと説明の窓が開く`, 'world');
        await shot('9-town');
        await page.locator('[data-scourge-close]').click();
        await wait(300);
      }

      // ---- 4人: 仲間の列（💀 を足すと 360 幅ではみ出す → 横に送れる） ----
      await load(page, BASE, worstOf(base4));
      const row = await page.evaluate(() => {
        const r = document.querySelector('[data-party-row]');
        const st = r.querySelector('[data-status-button]');
        const before = { sw: r.scrollWidth, cw: r.clientWidth, ox: getComputedStyle(r).overflowX };
        r.scrollLeft = r.scrollWidth;
        const sb = st.getBoundingClientRect();
        const out = { ...before, statusVisible: sb.right <= innerWidth + 1 && sb.left >= 0, heroes: r.querySelectorAll('button[aria-label*="HP"]').length };
        r.scrollLeft = 0;
        return out;
      });
      console.log(`   4人の仲間の列: 中身 ${row.sw}px / 幅 ${row.cw}px（${row.ox}）`);
      check(row.heroes === 4 && (row.sw <= row.cw || (row.ox === 'auto' && row.statusVisible)), `${tag} 4人: 仲間の列が入る、または横に送ってステータスまで届く（中身 ${row.sw} / 幅 ${row.cw}）`, 'world');
      check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `${tag} 4人: 画面が横にはみ出さない`, 'world');
      await shot('10-party4');
      m = await worldBox(page);
      H_.worst4 = m.visibleMapH;

      // ---- 通信の知らせのカードが上に出ている時（記録だけ）: 偽のカードを置いて、💀・🔍 の真ん中が押せるか ----
      const overlap = await page.evaluate(() => {
        const host = document.querySelector('[data-app-root] > div');
        const ov = document.createElement('div');
        // 狭い画面 回2（B）: 本物の知らせ（OnlineOverlay）と同じ置き方 = 低い画面では仲間の列の下（本物は scripts/coop-small-world.mjs で見る）
        const row = document.querySelector('[data-party-row]')?.getBoundingClientRect();
        const top = row ? Math.max(56, Math.round(row.bottom - host.getBoundingClientRect().top + 4)) : 56;
        ov.style.cssText = `position:absolute;left:0;right:0;top:0;z-index:62;pointer-events:none;display:flex;flex-direction:column;align-items:center;padding:${top}px 12px 0`;
        ov.innerHTML = '<div style="pointer-events:auto;width:100%;max-width:400px;height:64px;background:#000c;border-radius:12px"></div>';
        host.appendChild(ov);
        const hit = (s) => {
          const el = document.querySelector(s);
          if (!el) return null;
          const b = el.getBoundingClientRect();
          const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          return !!t && (t === el || el.contains(t));
        };
        const out = { skull: hit('[data-scourge-button]'), zoom: hit('[data-zoom-toggle]') };
        ov.remove();
        return out;
      });
      H_.onlineOverlap = overlap;
      // 💀 は落とす線。🔍 は記録だけ（知らせを仲間の列の下へ出したので、横いっぱいのカード = 同行の誘い・代わりに操作する の間は、
      // 地図の右上の 見取り図・🔍 にかかる。切断の帯は細いのでかからない。回2 の報告に書いた）
      check(overlap.skull === true, `${tag} 通信の知らせのカードが出ていても 💀 が押せる（🔍 は ${overlap.zoom ? '押せる' : '隠れる'}）`, 'world');
      console.log(`   通信の知らせ（高さ64pxのカード）が出ている時: 💀 ${overlap.skull ? '押せる' : '押せない'}・🔍 ${overlap.zoom ? '押せる' : '押せない'}`);
    } catch (e) {
      check(false, `${tag} 世界マップ: 途中で止まった（${String(e.message).split('\n')[0]}）`, 'world');
      await shot('error').catch(() => {});
    }
    heights.push(H_);
    await page.close();
  }

  // ---- 狭い画面 回2（C）: ふつうの画面（390×844・360×640）でも、雪に埋もれた街道の札が出る ----
  for (const [W, H] of [[390, 844], [360, 640]]) {
    const tag = `${W}x${H}`;
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    try {
      await buriedCheck(page, BASE, base2, tag, (name) => page.screenshot({ path: `${OUT}/world-${tag}-${name}.png` }), check);
    } catch (e) {
      check(false, `${tag} 埋もれた街道: 途中で止まった（${String(e.message).split('\n')[0]}）`, 'world');
    }
    await page.close();
  }

  // ---- 見えている高さを偽る: CSS の高さは 720px・見えている高さは 540px ----
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 720 }, deviceScaleFactor: 1 });
    await page.addInitScript(() => {
      const vv = window.visualViewport;
      if (vv) Object.defineProperty(vv, 'height', { get: () => 540, configurable: true });
    });
    await load(page, BASE, worstOf(base2));
    const f = await page.evaluate(() => {
      const vis = (s) => {
        const e = document.querySelector(s);
        return !!e && e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== 'none';
      };
      return {
        low: document.querySelector('[data-app-root]')?.hasAttribute('data-low'),
        appH: getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim(),
        goalLine: vis('[data-goal-line]'),
        goalShort: vis('[data-goal-short]'),
        currentTurn: vis('[data-current-turn]'),
        skull: vis('[data-scourge-button]'),
      };
    });
    console.log(`\n   見えている高さを偽った形（390×720・見えている 540）: ${JSON.stringify(f)}`);
    check(f.low === true && f.appH === '540px', `偽った形: 低い形になり、--app-h は 540px（${f.appH}）`, 'world');
    check(!f.goalLine && f.goalShort && !f.currentTurn && f.skull, `偽った形: CSS の高さの線（700px）より data-low が勝つ（次の目的の行は出ず、パネルの短い「次:」・💀×N）`, 'world');
    await page.screenshot({ path: `${OUT}/world-390x720-vv540.png` });
    await page.close();
  }
  writeFileSync(`${OUT}/world-heights.json`, JSON.stringify(heights, null, 2));
  console.log('\n----- 世界マップの見えている地図の高さ（px） -----');
  for (const h of heights) console.log(`${h.size}: ふつう ${h.solo} → 振った後 ${h.soloRolled}（マスの説明の上 ${h.soloInfo}） / 混んだ時 ${h.worst} → 振った後 ${h.worstRolled}（♨の全文の上 ${h.worstWarmInfo}） / 4人 ${h.worst4}`);
}

// ===== 狭い画面 回2（2026-11-15）: 地図の右の余白と、端のマス =====
// 4つの大きさ × シナリオ1・2 × 種（EDGE_SEEDS）。地図を全部見えている形にして、
//   (1) 右端・左端・上端・下端のマスを、指で地図をいちばん端まで動かした（左右の端は、見えている所の 2割・5割・8割の高さに置いた）時、
//       マスの真ん中を押すとボタンでなく地図に当たるか（当たった物を数える）。右端のマスは実際に押して、マスが選ばれる（ボタンが動かない）事も見る
//   (2) 駒を右端・左端・上端・下端のマスに置いて開いた時、駒の真ん中が地図に当たる（カメラが寄せる）
//   (3) 初めの位置のスクロールの位置（前と後で同じ事を比べる）
// EDGE_ONLY_MEASURE=1 は数字と写真だけ（直す前の作りで「前」を測る時。落ちても失敗にしない）
const EDGE_SCN = { corruptionKing: '侵食の魔王', frozenKingdom: '凍てつく王国' };
async function newSaveFor(browser, BASE, scenario, seed) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript((s) => {
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (a) => (a instanceof Uint32Array && a.length === 1 ? ((a[0] = s), a) : random(a));
  }, seed);
  await page.goto(BASE);
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', s);
    const ids = ['corruptionKing', 'frozenKingdom', 'cursedArchipelago', 'sandDynasty', 'starCastle', 'clockworkEmpire', 'dreamLabyrinth'];
    localStorage.setItem('card-rpg/profile', JSON.stringify({ version: 1, clears: Object.fromEntries(ids.map((i) => [i, 1])) }));
  }, SETTINGS);
  await page.reload();
  await page.getByText('新しい冒険').click();
  const card = page.locator('[data-scenarios] button', { hasText: EDGE_SCN[scenario] }).first();
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await wait(150);
  await page.getByText('2人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await wait(500);
  const d = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  d.game.world.story = undefined;
  // 地図を全部見えている形に（端のマスの位置を [data-hex] で測るため）
  for (const t of d.game.world.tiles) t.seen = true;
  await page.close();
  return d;
}
/** 地図の端のマスを押せるか。戻り値 { maxL, right/left/top/bottom: { ok, ng, by: {当たった物: 数} } } */
const edgeProbe = (page) =>
  page.evaluate(async () => {
    const map = document.querySelector('[data-world-map]');
    const frame = map.getBoundingClientRect();
    const panel = document.querySelector('[data-world-panel]')?.getBoundingClientRect();
    const visBottom = panel ? Math.min(frame.bottom, panel.top) : frame.bottom;
    const vis = visBottom - frame.top;
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const sl0 = map.scrollLeft, st0 = map.scrollTop;
    const c = new Map();
    for (const g of document.querySelectorAll('[data-hex]')) {
      const b = g.getBoundingClientRect();
      c.set(Number(g.getAttribute('data-hex')), { x: b.left + b.width / 2 - frame.left + sl0, y: b.top + b.height / 2 - frame.top + st0 });
    }
    const save = JSON.parse(localStorage.getItem('card-rpg/adventure')).game.world;
    const W = save.width, H = save.height;
    const ids = [...c.keys()];
    const edges = {
      right: ids.filter((i) => i % W === W - 1),
      left: ids.filter((i) => i % W === 0),
      top: ids.filter((i) => Math.floor(i / W) === 0),
      bottom: ids.filter((i) => Math.floor(i / W) === H - 1),
    };
    const maxL = map.scrollWidth - map.clientWidth, maxT = map.scrollHeight - map.clientHeight;
    const out = { maxL };
    const name = (t) => {
      const e = t.closest('[data-zoom-controls],[data-recenter],[data-goal-arrow],[data-world-panel],[data-tile-info],[data-region-name],button,[data-party-row]');
      if (!e) return t.tagName;
      return [...e.attributes].map((a) => a.name).find((n) => n.startsWith('data-')) ?? e.tagName;
    };
    for (const [edge, list] of Object.entries(edges)) {
      // ok/ng = 置いた位置ごと。tileNg = どの位置に置いても押せなかったマスの数（指で動かしても出せないマス）
      const r = { ok: 0, ng: 0, by: {}, tileNg: 0 };
      // どの端も、見えている所の 2割・5割・8割の高さに置いてみる（上下の端は、そのほかに次の目的地の矢印などが真ん中にある時も、ずらして押せるか）
      const fracs = [0.2, 0.5, 0.8];
      for (const i of list) {
        const p = c.get(i);
        let any = false, tried = false;
        for (const f of fracs) {
          const left = edge === 'right' ? maxL : edge === 'left' ? 0 : Math.max(0, Math.min(maxL, p.x - map.clientWidth / 2));
          map.scrollTo({ left, top: Math.max(0, Math.min(maxT, p.y - f * vis)), behavior: 'instant' });
          await raf();
          const x = frame.left + p.x - map.scrollLeft, y = frame.top + p.y - map.scrollTop;
          // 見えている所（枠の中・パネルより上）に置けなかった所は数えない（指で置けない位置）
          if (x < frame.left || x > frame.right || y < frame.top + 4 || y > visBottom - 4) continue;
          tried = true;
          const t = document.elementFromPoint(x, y);
          const good = !!t && !!t.closest('[data-world-map]') && !t.closest('button');
          if (good) (r.ok++, (any = true));
          else {
            r.ng++;
            const n = t ? name(t) : 'none';
            r.by[n] = (r.by[n] ?? 0) + 1;
          }
        }
        if (tried && !any) r.tileNg++;
      }
      out[edge] = r;
    }
    map.scrollTo({ left: sl0, top: st0, behavior: 'instant' });
    await raf();
    return out;
  });
/** 右端のマス（見えている所の真ん中の高さ・地図をいちばん右まで動かした所）を実際に押す。マスが選ばれて、ボタン（見取り図・拡大）が動かない */
async function tapRightEdge(page) {
  const p = await page.evaluate(async () => {
    const map = document.querySelector('[data-world-map]');
    const frame = map.getBoundingClientRect();
    const panel = document.querySelector('[data-world-panel]')?.getBoundingClientRect();
    const vis = (panel ? Math.min(frame.bottom, panel.top) : frame.bottom) - frame.top;
    const W = JSON.parse(localStorage.getItem('card-rpg/adventure')).game.world.width;
    const hexes = [...document.querySelectorAll('[data-hex]')].filter((g) => Number(g.getAttribute('data-hex')) % W === W - 1);
    const pick = hexes[Math.floor(hexes.length / 2)];
    const i = Number(pick.getAttribute('data-hex'));
    let b = pick.getBoundingClientRect();
    map.scrollTo({ left: map.scrollWidth, top: map.scrollTop + (b.top + b.height / 2 - frame.top) - vis * 0.5, behavior: 'instant' });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    b = pick.getBoundingClientRect();
    return { i, x: b.left + b.width / 2, y: b.top + b.height / 2, zoom: document.querySelector('[data-zoom-controls]')?.getAttribute('data-zoom') };
  });
  await page.mouse.click(p.x, p.y);
  await wait(400);
  const after = await page.evaluate(() => ({
    info: document.querySelector('[data-tile-info]')?.textContent ?? '',
    sel: document.querySelector('[data-selected]')?.getAttribute('data-selected') ?? null,
    overview: !!document.querySelector('[data-overview-close]') || !!document.querySelector('[data-overview]'),
    zoom: document.querySelector('[data-zoom-controls]')?.getAttribute('data-zoom'),
    tray: !!document.querySelector('[data-zoom-tray]'),
  }));
  return { ...p, ...after, ok: (!!after.info || after.sel !== null) && !after.overview && after.zoom === p.zoom && !after.tray };
}
/** 駒をマス t に置いた保存データ（2人とも） */
const heroAt = (base, t) =>
  variant(base, (g) => {
    for (const id of Object.keys(g.world.pos)) g.world.pos[id] = t;
    g.world.prevTile = t;
  });
const landTile = (w, pred) => w.tiles.findIndex((x, i) => pred(i) && !x.f && !['sea', 'lake', 'deepSea', 'mountain', 'water'].includes(x.t));
const pieceOk = (page) =>
  page.evaluate(() => {
    const act = document.querySelector('[data-hero][data-active]') ?? document.querySelector('[data-hero]');
    const map = document.querySelector('[data-world-map]');
    if (!act) return { hit: null };
    const b = act.getBoundingClientRect();
    const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height * 0.6);
    const btn = t && t.closest('button');
    return { hit: t ? !!t.closest('[data-world-map]') && !btn : false, by: btn ? [...btn.attributes].map((a) => a.name).find((n) => n.startsWith('data-')) : null, left: Math.round(map.scrollLeft), top: Math.round(map.scrollTop) };
  });

export async function edgeChecks({ browser, BASE, OUT, check }) {
  const measureOnly = !!process.env.EDGE_ONLY_MEASURE;
  const ck = (ok, what) => (measureOnly ? console.log(`${ok ? 'OK ' : 'NG '} ${what}（数字だけ）`) : check(ok, what, 'edges'));
  const sizes = (process.env.EDGE_SIZES ?? '390x540,360x520,390x844,360x640').split(',').map((s) => s.split('x').map(Number));
  const seeds = (process.env.EDGE_SEEDS ?? '11,874651857').split(',').map(Number);
  const scns = (process.env.EDGE_SCENARIOS ?? 'corruptionKing,frozenKingdom').split(',');
  mkdirSync(OUT, { recursive: true });
  const rows = [];
  for (const scn of scns) {
    for (const seed of seeds) {
      const base = await newSaveFor(browser, BASE, scn, seed);
      writeFileSync(`${OUT}/edge-save-${scn}-${seed}.json`, JSON.stringify(base));
      const w = base.game.world;
      const W = w.width;
      const startTile = w.pos[Object.keys(w.pos)[0]];
      const near = (i) => Math.abs(Math.floor(i / W) - Math.floor(startTile / W)) < 6;
      const spots = {
        right: landTile(w, (i) => i % W === W - 1 && near(i)),
        left: landTile(w, (i) => i % W === 0 && near(i)),
        top: landTile(w, (i) => Math.floor(i / W) === 0),
        bottom: landTile(w, (i) => Math.floor(i / W) === w.height - 1),
      };
      for (const [VW, VH] of sizes) {
        const tag = `${scn}-${seed}-${VW}x${VH}`;
        const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
        page.on('pageerror', (e) => ck(false, `${tag} pageerror: ${e.message}`));
        const row = { scn, seed, size: `${VW}x${VH}`, mapW: W };
        try {
          await load(page, BASE, base);
          await wait(500);
          row.start = await pieceOk(page);
          await page.screenshot({ path: `${OUT}/edge-${tag}-start.png` });
          const probe = await edgeProbe(page);
          row.padRight = probe.maxL;
          for (const e of ['right', 'left', 'top', 'bottom']) {
            row[e] = probe[e];
            // 落とす線: 指で動かしても出せないマスが無い事（置いた位置ごとの数は記録）
            ck(probe[e].tileNg === 0, `${tag} ${e} の端のマス: 出せないマス ${probe[e].tileNg}（置いた位置ごと: 押せる ${probe[e].ok} / 押せない ${probe[e].ng} ${JSON.stringify(probe[e].by)}）`);
          }
          // 地図をいちばん右まで動かした写真（余白が見える）
          await page.evaluate(() => {
            const m = document.querySelector('[data-world-map]');
            m.scrollTo({ left: m.scrollWidth, behavior: 'instant' });
          });
          await wait(300);
          await page.screenshot({ path: `${OUT}/edge-${tag}-pulled-right.png` });
          const tap = await tapRightEdge(page);
          row.tapRight = tap.ok;
          ck(tap.ok, `${tag} 右端のマスを押すと、マスが選ばれる（説明: ${tap.info.slice(0, 30)}…・選んだマス ${tap.sel}・拡大 ${tap.zoom}）`);
          await page.screenshot({ path: `${OUT}/edge-${tag}-tap-right.png` });
          // 駒を端のマスに置いて開く → 駒の真ん中が地図に当たる（ボタンの下に入らない）
          row.piece = {};
          for (const [e, t] of Object.entries(spots)) {
            if (t < 0) continue;
            await load(page, BASE, heroAt(base, t));
            await wait(500);
            const p = await pieceOk(page);
            row.piece[e] = p;
            ck(p.hit === true, `${tag} 駒を${e}の端（マス${t}）に置いた時、駒の真ん中が地図に当たる${p.by ? `（上に ${p.by}）` : ''}`);
            if (e === 'right') await page.screenshot({ path: `${OUT}/edge-${tag}-piece-right.png` });
          }
        } catch (err) {
          ck(false, `${tag} 途中で止まった（${String(err.message).split('\n')[0]}）`);
        }
        rows.push(row);
        await page.close();
      }
    }
  }
  writeFileSync(`${OUT}/edge-summary.json`, JSON.stringify(rows, null, 1));
  console.log('\n----- 端のマス（押せない数。right/left/top/bottom）・駒・初めの位置 -----');
  for (const r of rows) console.log(`${r.scn} ${r.seed} ${r.size}: 右の余白 ${r.padRight}px / 位置ごとの押せない数 ${['right', 'left', 'top', 'bottom'].map((e) => r[e]?.ng ?? '-').join('/')}・出せないマス ${['right', 'left', 'top', 'bottom'].map((e) => r[e]?.tileNg ?? '-').join('/')} / 右端を押す ${r.tapRight ? 'OK' : 'NG'} / 駒 ${Object.entries(r.piece ?? {}).map(([e, p]) => `${e}:${p.hit ? 'OK' : 'NG'}`).join(' ')} / 初めの位置 (${r.start?.left},${r.start?.top})`);
}
