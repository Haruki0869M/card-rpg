// 段階6 探索の仕組み: 見晴らしの塔・時間で消える出現スポット・v16 の保存の引き継ぎを、スマホ幅で確かめる（P2 のキャラで操作）。
// 使い方: npm run build のあと vite preview を立てて node scripts/explore.mjs（URL で場所を変えられる）
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

const OUT = 'screenshots/explore';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const check = (ok, message) => { if (!ok) throw new Error(message); };
const save = async () => {
  await page.waitForTimeout(300);
  return page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')));
};
async function resume(data) {
  await page.evaluate((d) => localStorage.setItem('card-rpg/adventure', JSON.stringify(d)), data);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(400);
}
// 六角形の距離（奇数行が右にずれる並び。エンジンの hex.ts と同じ）
const cube = (w, i) => { const c = i % w.width, r = Math.floor(i / w.width); const x = c - (r - (r & 1)) / 2; return [x, r, -x - r]; };
const dist = (w, a, b) => { const p = cube(w, a), q = cube(w, b); return Math.max(...p.map((v, k) => Math.abs(v - q[k]))); };

try {
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false })); });
  await page.reload();
  await page.getByText('新しい冒険', { exact: true }).click();
  await page.getByText('2人', { exact: true }).click();
  await page.getByText('キャラクター作成へ', { exact: true }).click();
  await depart(page, { exact: true });
  const base = await save();
  // 2人目のキャラを P2 の担当にする（ローカル協力。P2 の操作が P1 扱いにならないかを確かめる）
  base.game.heroes[1].playerId = 'P2';
  const p2Banner = async () => check(await page.getByText('現在は P2', { exact: false }).count() > 0, 'P2 の手番になっていない');
  const towers = base.game.world.tiles.flatMap((t, i) => (t.f?.kind === 'tower' ? [i] : []));
  check(towers.length >= 2 && towers.length <= 3, `塔の数が違う: ${towers.length}`);
  console.log(`OK: 新しい冒険に見晴らしの塔が${towers.length}か所`);

  // 1. 見晴らしの塔（P2 のキャラが登る）
  {
    const d = structuredClone(base), g = d.game, w = g.world;
    g.mode = 'world'; w.story = undefined; w.turn = 'h1';
    const t = towers[0];
    w.pos.h1 = t; w.tiles[t].seen = true;
    await resume(d);
    check(await page.locator('[data-feature="tower:watchtower"]').count() >= 1, '塔の印が出ない');
    await p2Banner();
    await page.screenshot({ path: `${OUT}/tower-before.png` });
    await page.getByText('見晴らしの塔に登る', { exact: true }).click();
    const after = (await save()).game;
    check(after.world.tiles[t].f.used === true, '塔が使用済みにならない');
    check(after.world.turn === 'h1' && after.mode === 'world', '塔に登ると手番が変わる');
    check(after.world.tiles.every((x, i) => dist(w, t, i) > 4 || x.seen), '半径4の霧が晴れない');
    check((await layoutIssues(page)).length === 0, '塔の後の表示が崩れる');
    await page.screenshot({ path: `${OUT}/tower-after.png` });
    console.log('OK: P2 が見晴らしの塔に登り、半径4の霧が晴れた（手番は続く）');
  }

  // 2. 出現スポット3種を地図に置いて表示（残りターン）
  for (const width of [360, 390, 480]) {
    await page.setViewportSize({ width, height: 780 });
    const d = structuredClone(base), g = d.game, w = g.world;
    g.mode = 'world'; w.story = undefined; w.turn = 'h1';
    const at = w.pos.h0;
    const free = w.tiles.map((x, i) => i).filter((i) => !w.tiles[i].f && w.tiles[i].t === w.tiles[at].t && !w.wanderers.some((x) => x.tile === i) && i !== at && dist(w, at, i) >= 1 && dist(w, at, i) <= 3);
    check(free.length >= 3, '置き場所が足りない');
    const kinds = ['star', 'peddler', 'thief'];
    w.spawns = kinds.map((kind, k) => ({ id: `s${k + 1}`, kind, tile: free[k], until: w.worldTurn + k }));
    for (const s of w.spawns) w.tiles[s.tile].seen = true;
    await resume(d);
    for (const [k, kind] of kinds.entries()) {
      const el = page.locator(`[data-spawn="${kind}"]`);
      check(await el.count() === 1, `${kind} の印が出ない`);
      check(await el.getAttribute('data-spawn-left') === String(k + 1), `${kind} の残りターンが違う`);
    }
    { const li = await layoutIssues(page); check(li.length === 0, `${width}px 地図の表示が崩れる: ${JSON.stringify(li).slice(0, 600)}`); }
    await page.screenshot({ path: `${OUT}/spawns-${width}.png` });
    console.log(`OK: ${width}px 出現スポット3種と「残N」の表示`);
  }

  // 3. P2 のキャラで各スポットに入る（イベントの画面になる・スポットが消える）
  const labels = { star: ['落ちた星を調べる', '流れ星の落下地点'], peddler: ['行商人と話す', 'さすらいの行商人'], thief: ['コソ泥に近づく', '黄金のコソ泥'] };
  await page.setViewportSize({ width: 390, height: 780 });
  for (const kind of ['star', 'peddler', 'thief']) {
    const d = structuredClone(base), g = d.game, w = g.world;
    g.mode = 'world'; w.story = undefined; w.turn = 'h1';
    const at = w.pos.h0;
    const tile = w.tiles.map((x, i) => i).find((i) => !w.tiles[i].f && w.tiles[i].t === w.tiles[at].t && !w.wanderers.some((x) => x.tile === i) && dist(w, at, i) === 2);
    w.spawns = [{ id: 's1', kind, tile, until: w.worldTurn + 1 }];
    w.pos.h1 = tile; w.tiles[tile].seen = true;
    await resume(d);
    await p2Banner();
    await page.getByText(labels[kind][0], { exact: true }).click();
    const s = (await save()).game;
    check(s.mode === 'event' && (s.world.spawns ?? []).length === 0, `${kind}: イベントにならない`);
    await page.getByText(labels[kind][1]).first().waitFor({ timeout: 3000 });
    check((await layoutIssues(page)).length === 0, `${kind}: イベントの表示が崩れる`);
    await page.screenshot({ path: `${OUT}/event-${kind}.png` });
    console.log(`OK: P2 が ${labels[kind][1]} に入った`);
  }

  // 4. v16 の保存（塔・スポット無し）から再開すると、v17 になり塔が足される
  {
    const old = structuredClone(base); old.version = old.game.version = 16;
    const w = old.game.world;
    for (const t of w.tiles) if (t.f?.kind === 'tower') delete t.f;
    delete w.spawns; delete w.nextSpawnAt; delete w.nextSpawnId;
    w.story = undefined; old.game.mode = 'world';
    await resume(old);
    await page.getByText('王都クリスタリアに入る', { exact: true }).click();
    const m = await save();
    check(m.game.version === 17, `v17 にならない: ${m.game.version}`);
    check(m.game.world.tiles.filter((t) => t.f?.kind === 'tower').length === towers.length, '古い保存に塔が足されない');
    check(Array.isArray(m.game.world.spawns) && typeof m.game.world.nextSpawnAt === 'number', '出現スポットの情報が無い');
    w.tiles.forEach((t, i) => {
      const n = m.game.world.tiles[i];
      check(t.t === n.t && t.r === n.r && t.seen === n.seen, `古い地図のマス${i}が変わった`);
    });
    console.log('OK: v16 の保存から再開（地図はそのまま、塔を足して v17）');
  }
  check(errors.length === 0, `ページのエラー: ${errors.join(' / ')}`);
  console.log('すべて OK');
} finally {
  await browser.close();
}
