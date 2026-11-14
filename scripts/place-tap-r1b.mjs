// 回1の追加（施設の絵を押して入る・足元の台・「入れる」・「あと〇マス」・名前の札・短い画面の「次:」・町のうわさ）の画面確認。
// 幅 360×640 と 390×844 で、シナリオ1（広い地図）の2人（1台）の冒険を使って:
// ① 施設の絵の「上の端・真ん中・足元」を本当に押して、3つともその施設のマスが選ばれるか（町・鍵のダンジョン・塔 × 標準・拡大・いちばん縮小）
// ② 足元の台と名前の札（標準・いちばん縮小）
// ③ 届く時の「入れる」と強い光。絵の上の端を押すと、その施設が選ばれる
// ④ 届かない時の「あと〇マス。この番は、ここまで進める」と、選ばれたマス。道が無い時の「回り道が要る」。1台で P2 の番でも同じ
// ⑤ 短い画面の「次:」の行（押すと目的地へ地図が動く）。高い画面は「次の目的」の行のまま
// ⑥ 町の画面のうわさ
// を写真に撮り、はみ出し・12px未満の文字・小さすぎるボタンを調べる。
// 使い方: npx vite build && npx vite preview を起こしてから node scripts/place-tap-r1b.mjs（URL で変更可。PLACE_OUTPUT で保存先）
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

const OUT = process.env.PLACE_OUTPUT ?? 'screenshots/place-tap-r1b';
const KEY = 'card-rpg/adventure';
mkdirSync(OUT, { recursive: true });
const SIZES = [
  [360, 640],
  [390, 844],
];
const browser = await chromium.launch();
const problems = [];
const notes = [];
const table = [];

async function start(page, players) {
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false, overviewHintSeen: true }));
  });
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText(`${players}人`, { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(300);
}
async function edit(page, fn, arg) {
  await page.evaluate(({ src, arg, k }) => {
    const d = JSON.parse(localStorage.getItem(k));
    (0, eval)(src)(d.game, arg);
    localStorage.setItem(k, JSON.stringify(d));
  }, { src: fn.toString(), arg, k: KEY });
  await page.reload();
  await page.getByText('つづきから').click();
  await page.waitForTimeout(600);
}
const game = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)).game, KEY);
async function check(page, tag, where) {
  const list = (await layoutIssues(page)).filter((s) => !s.startsWith('small button: ""'));
  if (list.length) problems.push(`${tag} ${where}: ${list.join(' / ')}`);
}
async function handoff(page) {
  for (let k = 0; k < 3; k++) {
    const h = page.locator('[data-handoff]');
    if (!(await h.count())) return;
    await h.first().click();
    await page.waitForTimeout(300);
  }
}
async function closeStory(page) {
  for (let k = 0; k < 4; k++) {
    const b = page.getByRole('button', { name: 'つづける' });
    if (!(await b.count())) return;
    await b.click();
    await page.waitForTimeout(350);
  }
}
const infoText = async (page) => ((await page.locator('[data-tile-info]').count()) ? await page.locator('[data-tile-info]').innerText() : '');
const selectedTile = async (page) => {
  const s = page.locator('[data-selected]');
  return (await s.count()) ? Number(await s.getAttribute('data-selected')) : undefined;
};
/**
 * 地図の中の要素を、見えている地図（操作パネルに隠れていない所）の真ん中へ。
 * 拡大のボタンが地図の上に横に並んでいる時（低い画面）は、その下から数える（ボタンを押してしまわないように）
 */
async function centerInMap(page, loc) {
  await loc.evaluate((el) => {
    const map = document.querySelector('[data-world-map]');
    const panel = document.querySelector('[data-world-panel]');
    const zoom = document.querySelector('[data-zoom-controls]');
    const m = map.getBoundingClientRect();
    const bottom = panel ? panel.getBoundingClientRect().top : m.bottom;
    const top = zoom?.getAttribute('data-zoom-layout') === 'row' ? zoom.getBoundingClientRect().bottom + 4 : m.top;
    const r = el.getBoundingClientRect();
    // 絵が見えている所より高い時は、絵の上の端をそろえる
    const want = r.height > bottom - top ? top + 2 + r.height / 2 : (top + bottom) / 2;
    map.scrollBy({ left: r.left + r.width / 2 - (m.left + m.width / 2), top: r.top + r.height / 2 - want, behavior: 'instant' });
  });
  await page.waitForTimeout(250);
}
async function setZoom(page, mode) {
  if (mode === 'standard') {
    if (await page.locator('[data-zoom-reset]').isEnabled()) await page.locator('[data-zoom-reset]').click();
  } else {
    const sel = mode === 'in' ? '[data-zoom-in]' : '[data-zoom-out]';
    for (let k = 0; k < 12 && (await page.locator(sel).isEnabled()); k++) {
      await page.locator(sel).click();
      await page.waitForTimeout(120);
    }
  }
  await page.waitForTimeout(400);
  return Number(await page.locator('[data-zoom-controls]').getAttribute('data-zoom'));
}
const W_ = (g) => g.world.width;
const cubeOf = (W, i) => { const c = i % W, r = Math.floor(i / W); const x = c - (r - (r & 1)) / 2; return [x, -x - r, r]; };
const hexDist = (W, a, b) => { const p = cubeOf(W, a), q = cubeOf(W, b); return Math.max(...p.map((v, k) => Math.abs(v - q[k]))); };

for (const [width, height] of SIZES) {
  const tag = `${width}x${height}`;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await start(page, 2);
  await closeStory(page);
  await handoff(page);

  // 地図を全部見せる。敵は消す（押す所を隠さない・移動で戦わない）。サイコロはまだ振っていない
  await edit(page, (g) => {
    const w = g.world;
    for (const t of w.tiles) t.seen = true;
    w.story = undefined;
    w.wanderers = [];
    w.turn = g.heroes[0].id;
    w.acted = [];
    w.move = null;
    w.moveDice = undefined;
  });
  await handoff(page);
  const g0 = await game(page);
  const w0 = g0.world;
  const W = W_(g0);
  const here0 = w0.pos[w0.turn];
  const near = (kind, pred = () => true) =>
    w0.tiles.map((t, i) => i).filter((i) => w0.tiles[i].f?.kind === kind && i !== here0 && pred(w0.tiles[i])).sort((a, b) => hexDist(W, here0, a) - hexDist(W, here0, b))[0];
  const goalTile = Number(await page.locator('[data-goal-mark]').getAttribute('data-goal-mark'));
  const targets = [
    { name: '町', tile: near('town') },
    { name: '鍵のダンジョン', tile: goalTile },
    { name: '塔', tile: near('tower') },
  ];
  // 期待する名前（標準の大きさの名前の札から。塔は「見晴らしの塔」）
  await setZoom(page, 'standard');
  for (const t of targets) {
    const lab = page.locator(`[data-place-label="${t.tile}"]`);
    t.expect = t.name === '塔' ? '見晴らしの塔' : (await lab.count()) ? (await lab.textContent()).trim() : '';
    if (!t.expect) problems.push(`${tag}: ${t.name}（マス${t.tile}）の名前の札が無い`);
  }
  notes.push(`${tag} 押す施設: ${targets.map((t) => `${t.name}「${t.expect}」(マス${t.tile})`).join('・')}`);

  // ---- ① 絵の上の端・真ん中・足元を押す（標準・拡大・いちばん縮小） ----
  for (const mode of ['standard', 'in', 'min']) {
    const z = await setZoom(page, mode);
    for (const t of targets) {
      const art = page.locator(`[data-feature-layer] [data-place-tile="${t.tile}"]`);
      if (!(await art.count())) {
        problems.push(`${tag} ${mode}: ${t.name}の絵が無い`);
        continue;
      }
      await centerInMap(page, art);
      const b = await art.boundingBox();
      const base = await page.locator(`[data-facility-base="${t.tile}"]`).boundingBox();
      const pts = {
        上の端: [b.x + b.width / 2, b.y + 3],
        真ん中: [b.x + b.width / 2, b.y + b.height / 2],
        足元: [base.x + base.width / 2, base.y + base.height * 0.82],
      };
      const row = { size: tag, zoom: `${mode}(${z})`, target: t.name };
      for (const [k, [x, y]] of Object.entries(pts)) {
        await page.mouse.click(x, y);
        await page.waitForTimeout(200);
        const info = await infoText(page);
        const ok = !!t.expect && info.includes(t.expect);
        row[k] = ok ? 'OK' : `NG「${info.slice(0, 40)}」`;
        if (!ok) problems.push(`${tag} ${mode} ${t.name} ${k}: 説明が「${info}」`);
      }
      table.push(row);
      if (t.name === '町') await page.screenshot({ path: `${OUT}/${tag}-01-${mode}-town.png` });
    }
    // ② 名前の札（縮小した時は、次の目的地と町だけ）
    const ranks = await page.locator('[data-place-label]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-label-rank'))));
    notes.push(`${tag} ${mode}(${z}) 名前の札: ${ranks.length}枚（順位 ${[0, 1, 2, 3].map((r) => ranks.filter((x) => x === r).length).join('/')}）`);
    if (mode === 'min' && z < 0.75 && ranks.some((r) => r > 1)) problems.push(`${tag}: 縮小した時に町と目的地のほかの札が出ている`);
    const fs = await page.locator('[data-place-label] text').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
    if (fs.some((f) => f < 12)) problems.push(`${tag} ${mode}: 名前の札の字が12px未満`);
    const bases = await page.locator('[data-facility-base]').count();
    if (!bases) problems.push(`${tag} ${mode}: 足元の台が無い`);
    await page.screenshot({ path: `${OUT}/${tag}-02-${mode}-labels.png` });
    await check(page, tag, `名前の札 ${mode}`);
  }
  await setZoom(page, 'standard');

  // ---- ③ 届く時の「入れる」 ----
  const town = targets[0].tile;
  const nb = w0.tiles.map((t, i) => i).filter((i) => hexDist(W, i, town) === 1 && !w0.tiles[i].f && ['plains', 'road', 'forest', 'hills'].includes(w0.tiles[i].t));
  await edit(page, (g, at) => {
    const w = g.world;
    for (const h of g.heroes) w.pos[h.id] = at;
    w.move = 3;
    w.moveDice = undefined;
    w.follow = {};
    for (const h of g.heroes) h.lastRandomEvent = w.worldTurn;
  }, nb[0]);
  await handoff(page);
  const mark = page.locator(`[data-enter-mark="${town}"]`);
  if (!(await mark.count())) problems.push(`${tag}: 届く町に「入れる」が出ない`);
  else {
    const txt = (await mark.textContent()).trim();
    if (txt !== '入れる') problems.push(`${tag}: 「入れる」の字が「${txt}」`);
    if (!(await page.locator(`[data-reach="${town}"][data-reach-enter]`).count())) problems.push(`${tag}: 届く町のマスの光が強くない`);
    await centerInMap(page, page.locator(`[data-feature-layer] [data-place-tile="${town}"]`));
    const mb = await mark.boundingBox();
    // 「入れる」の札（絵の上の端）を押す → 町が選ばれる
    await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height / 2);
    await page.waitForTimeout(250);
    const sel = await selectedTile(page);
    if (sel !== town) problems.push(`${tag}: 「入れる」の所を押しても町が選ばれない（${sel}）`);
    notes.push(`${tag} ③ 届く町: 「入れる」あり・押して選ばれたマス ${sel}（町 ${town}）・ボタン「${(await page.locator('[data-world-controls] .btn-gold').last().innerText()).trim()}」`);
    await page.screenshot({ path: `${OUT}/${tag}-03-can-enter.png` });
    await check(page, tag, '入れる');
  }

  // ---- ④ 届かない時の「あと〇マス」（P1 と、1台で P2 の番） ----
  for (const who of [0, 1]) {
    await edit(page, (g, { at, who }) => {
      const w = g.world;
      for (const h of g.heroes) w.pos[h.id] = at;
      w.turn = g.heroes[who].id;
      w.acted = who ? [g.heroes[0].id] : [];
      w.move = 2;
      w.moveDice = undefined;
      w.follow = {};
    }, { at: here0, who });
    await handoff(page);
    const goal = targets[1];
    const art = page.locator(`[data-feature-layer] [data-place-tile="${goal.tile}"]`);
    await centerInMap(page, art);
    const b = await art.boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + 3);
    await page.waitForTimeout(300);
    const info = await infoText(page);
    const sel = await selectedTile(page);
    const cost = sel !== undefined ? Number(await page.locator(`[data-reach="${sel}"]`).getAttribute('data-cost')) : NaN;
    notes.push(`${tag} ④ P${who + 1}の番・移動力2で「${goal.expect}」の絵の上の端を押す: 「${info}」・選ばれたマス ${sel}（使う移動力 ${cost}・目的地まで ${sel !== undefined ? hexDist(W, sel, goal.tile) : '-'}マス、今の場所から ${hexDist(W, here0, goal.tile)}マス）`);
    if (!/^あと\d+マス。この番は、ここまで進める/.test(info)) problems.push(`${tag} P${who + 1}: 届かない時の文が「${info}」`);
    if (sel === undefined || !(cost <= 2)) problems.push(`${tag} P${who + 1}: 届かない時に、この番で行けるマスが選ばれない`);
    else if (hexDist(W, sel, goal.tile) >= hexDist(W, here0, goal.tile)) problems.push(`${tag} P${who + 1}: 選ばれたマスが目的地に近づいていない`);
    // 勝手に動かない
    const g1 = await game(page);
    if (g1.world.pos[g1.world.turn] !== here0) problems.push(`${tag} P${who + 1}: 押しただけで動いた`);
    await page.screenshot({ path: `${OUT}/${tag}-04-too-far-p${who + 1}.png` });
    await check(page, tag, `あと〇マス P${who + 1}`);
  }
  // 道が無い（まわりを湖にする）
  const tower = targets[2].tile;
  await edit(page, (g, { tower, at }) => {
    const w = g.world;
    const W = w.width;
    const cube = (i) => { const c = i % W, r = Math.floor(i / W); const x = c - (r - (r & 1)) / 2; return [x, -x - r, r]; };
    const d = (a, b) => { const p = cube(a), q = cube(b); return Math.max(...p.map((v, k) => Math.abs(v - q[k]))); };
    w.tiles.forEach((t, i) => { if (d(i, tower) === 1) { t.t = 'water'; t.f = undefined; } });
    for (const h of g.heroes) w.pos[h.id] = at;
    w.turn = g.heroes[0].id;
    w.acted = [];
    w.move = 4;
  }, { tower, at: here0 });
  await handoff(page);
  {
    const art = page.locator(`[data-feature-layer] [data-place-tile="${tower}"]`);
    await centerInMap(page, art);
    const b = await art.boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(250);
    const info = await infoText(page);
    notes.push(`${tag} ④ 道が無い塔を押す: 「${info}」・選ばれたマス ${await selectedTile(page)}`);
    if (!info.startsWith('ここへは、回り道が要る')) problems.push(`${tag}: 道が無い時の文が「${info}」`);
    if ((await selectedTile(page)) !== undefined) problems.push(`${tag}: 道が無いのにマスが選ばれた`);
    await page.screenshot({ path: `${OUT}/${tag}-05-no-route.png` });
  }
  // サイコロを振る前
  await edit(page, (g) => {
    g.world.move = null;
  });
  await handoff(page);
  {
    const art = page.locator(`[data-feature-layer] [data-place-tile="${targets[1].tile}"]`);
    await centerInMap(page, art);
    const b = await art.boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(250);
    const info = await infoText(page);
    notes.push(`${tag} ④ サイコロの前に「${targets[1].expect}」を押す: 「${info}」`);
    if (!info.endsWith('サイコロを振ると、進める')) problems.push(`${tag}: サイコロの前の文が「${info}」`);
  }

  // ---- ⑤ 短い画面の「次:」の行 ----
  const short = page.locator('[data-goal-short]');
  const tall = height >= 700;
  const shortShown = await short.isVisible();
  const lineShown = await page.locator('[data-goal-line]').isVisible();
  if (tall && (shortShown || !lineShown)) problems.push(`${tag}: 高い画面なのに「次:」の行の出し方がちがう`);
  if (!tall && (!shortShown || lineShown)) problems.push(`${tag}: 短い画面に「次:」の行が出ない`);
  if (shortShown) {
    const txt = (await short.innerText()).trim();
    const goalTxt = (await page.locator('[data-goal-short-text]').innerText()).trim();
    notes.push(`${tag} ⑤ 短い画面の行: 「${txt}」（次の目的の部分「${goalTxt}」）`);
    if (!/^次: .+（.+）$/.test(goalTxt)) problems.push(`${tag}: 「次:」の文が「${goalTxt}」`);
    const sb = await short.boundingBox();
    const tb = await page.locator('[data-goal-short-text]').boundingBox();
    if (tb.x + tb.width > width + 0.5 || sb.x + sb.width > width + 0.5) problems.push(`${tag}: 「次:」の行が画面の横にはみ出している`);
    await page.locator('[data-recenter]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${tag}-06-short-next.png` });
    await short.click();
    await page.waitForTimeout(700);
    const m = await page.locator('[data-world-map]').boundingBox();
    const p = await page.locator('[data-world-panel]').boundingBox();
    const gm = await page.locator('[data-goal-mark]').boundingBox();
    const cy = gm.y + gm.height / 2, cx = gm.x + gm.width / 2;
    if (!(cx >= m.x && cx <= m.x + m.width && cy >= m.y && cy <= p.y)) problems.push(`${tag}: 「次:」の行を押しても、目的地が見える所へ動かない`);
    await page.screenshot({ path: `${OUT}/${tag}-07-short-next-focus.png` });
    await check(page, tag, '次: の行');
  } else notes.push(`${tag} ⑤ 高い画面: 「次の目的」の行 ${lineShown ? 'あり' : 'なし'}・短い行 なし`);

  // ---- ⑥ 町のうわさ ----
  await edit(page, (g, town) => {
    const w = g.world;
    for (const h of g.heroes) w.pos[h.id] = town;
    w.turn = g.heroes[0].id;
    w.move = null;
  }, town);
  await handoff(page);
  await page.locator('[data-interact]').click();
  await page.waitForTimeout(600);
  const rumor = page.locator('[data-town-rumor]');
  if (!(await rumor.count())) problems.push(`${tag}: 町の画面にうわさが無い`);
  else {
    const txt = (await rumor.innerText()).trim();
    notes.push(`${tag} ⑥ 町のうわさ: 「${txt}」`);
    if (!/^うわさ: .+に、.+があるらしい$/.test(txt)) problems.push(`${tag}: うわさの文が「${txt}」`);
  }
  await page.screenshot({ path: `${OUT}/${tag}-08-town-rumor.png` });
  await check(page, tag, '町のうわさ');

  if (errors.length) problems.push(`${tag}: ページのエラー ${errors.join(' / ')}`);
  await page.close();
}
await browser.close();

console.log('--- 絵を押した結果 ---');
for (const r of table) console.log(`${r.size} ${r.zoom} ${r.target}: 上の端 ${r['上の端']}・真ん中 ${r['真ん中']}・足元 ${r['足元']}`);
console.log('--- メモ ---');
for (const n of notes) console.log(n);
console.log('--- 問題 ---');
console.log(problems.length ? problems.join('\n') : 'なし');
process.exitCode = problems.length ? 1 : 0;
