// 狭い画面の直し 回2（2026-11-15）: オンライン2台・390×540（HEIGHT で変えられる）の世界マップ。凍てつく王国・災厄3体。
//   (1) P2 の待ち中（P1 の手番）に、💀×N・🔍・❄寒さの札が開けて閉じられる。開け閉めしても P1 の番は止まらない（P1 がサイコロを振れる）
//   (2) 通信の知らせ（同行の誘い・自分の切断）が出ていても 💀 が押せる。低い画面では知らせが仲間の列より下に出る（data-online-below）
//       ふつうの画面（390×844）では、知らせが今の災厄の札（4行）にどれだけ重なるかを測る（記録だけ）
//   (3) 一緒に動く提案の窓（MoveProposal）が出た時、見えている地図の高さ（提案した側・返事をする側）。150px 以上
//   (4) シート・カード選びの「お知らせ N」の数え方（HiddenNotices）: 知らせが1つの時に「お知らせ 1」
// エミュレーター（demo-card-rpg）だけを使う（URL の ?emu=）。本番の Firebase には書かない。
// 使い方: URL=http://127.0.0.1:4197/card-rpg/ node scripts/coop-small-world.mjs （COOP_SMALL_OUTPUT で写真の場所。MEASURE_ONLY=1 で数字だけ）
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, URL } from './lib.mjs';

const EMU = process.env.EMU_HOST ?? '127.0.0.1';
const OUT = process.env.COOP_SMALL_OUTPUT ?? 'screenshots/coop-small-world';
const H = Number(process.env.HEIGHT ?? 540);
const MEASURE_ONLY = !!process.env.MEASURE_ONLY;
if (/firebaseio|web\.app|firebaseapp/.test(URL)) throw new Error('本番には書きません（URL を確かめてください）');
mkdirSync(OUT, { recursive: true });
const problems = [];
const record = {};
const check = (ok, what) => {
  console.log(`${ok ? 'OK ' : 'NG '} ${what}${MEASURE_ONLY && !ok ? '（数字だけ）' : ''}`);
  if (!ok && !MEASURE_ONLY) problems.push(what);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 15000, what = '') {
  const t0 = Date.now();
  for (;;) {
    if (await fn().catch(() => false)) return true;
    if (Date.now() - t0 > ms) throw new Error(`timeout: ${what}`);
    await wait(100);
  }
}
const tryUntil = (fn, ms, what) => until(fn, ms, what).then(() => true, () => false);
const base = (extra = '') => `${URL}?emu=${EMU}${extra}`;
const api = (p, fn, arg) => p.evaluate(fn, arg);
const game = (p) => api(p, () => window.__online?.game());
const shot = (page, name) => page.screenshot({ path: `${OUT}/${H}-${name}.png` }).catch(() => {});
const SCOURGES = [['whiteWolfKing', 'scourgeWhiteWolfKing'], ['frostBellWraith', 'scourgeBellWraith'], ['lampEaterShade', 'scourgeLightEater']];

const browser = await chromium.launch();
async function newPage(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('card-rpg/settings')) localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false, overviewHintSeen: true }));
    const ids = ['corruptionKing', 'cursedArchipelago', 'sandDynasty', 'starCastle', 'clockworkEmpire', 'dreamLabyrinth'];
    if (!localStorage.getItem('card-rpg/profile')) localStorage.setItem('card-rpg/profile', JSON.stringify({ version: 1, clears: Object.fromEntries(ids.map((i) => [i, 1])) }));
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    console.log(`[${name}] pageerror`, e.message);
    problems.push(`[${name}] pageerror ${e.message}`);
  });
  return { ctx, page };
}
const closeStory = async (p) => {
  for (let i = 0; i < 5 && (await p.getByText('タップで続ける').count()); i++) {
    await p.getByText('タップで続ける').first().click().catch(() => {});
    await wait(250);
  }
  for (let i = 0; i < 5; i++) {
    const b = p.getByRole('button', { name: 'つづける', exact: true });
    if (!(await b.count())) break;
    await b.first().click().catch(() => {});
    await wait(250);
  }
};
/** 要素の真ん中に、ほかの層が乗っていないか */
const onTop = (p, sel) =>
  p.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { ok: false, by: 'ない' };
    const b = el.getBoundingClientRect();
    const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    const ok = !!t && (t === el || el.contains(t));
    return { ok, by: ok || !t ? '' : String(t.className).slice(0, 60) };
  }, sel);
const mapH = (p) =>
  p.evaluate(() => {
    const a = document.querySelector('[data-world-area]')?.getBoundingClientRect();
    const panel = document.querySelector('[data-world-panel]')?.getBoundingClientRect();
    const mp = document.querySelector('[data-move-proposal]')?.getBoundingClientRect();
    return { map: a && panel ? Math.round(panel.top - a.top) : null, proposal: mp ? Math.round(mp.height) : null };
  });

async function setupRoom() {
  const a = await newPage('A');
  const b = await newPage('B');
  const A = a.page, B = b.page;
  await A.goto(base());
  await A.getByText('新しい冒険').click();
  const card = A.locator('[data-scenarios] button', { hasText: '凍てつく王国' }).first();
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await wait(150);
  await A.getByText('2人', { exact: true }).click();
  await A.getByRole('button', { name: 'オンライン協力' }).click();
  await A.getByPlaceholder('プレイヤー').fill('ハル');
  await A.getByRole('button', { name: '部屋を作る' }).click();
  await A.getByTestId('room-code').waitFor();
  const code = (await A.getByTestId('room-code').textContent()).trim();
  await B.goto(base(`&room=${code}`));
  await B.getByPlaceholder('プレイヤー').fill('ナツ');
  await B.getByRole('button', { name: '参加する' }).click();
  await B.getByTestId('room-code').waitFor();
  for (const p of [A, B]) {
    await p.getByRole('button', { name: '作る', exact: true }).first().click();
    await p.getByRole('button', { name: 'このキャラに決める' }).click();
    await p.getByTestId('room-code').waitFor();
  }
  await until(async () => await A.getByRole('button', { name: '冒険に出発' }).isEnabled(), 10000, 'start enabled');
  await A.getByRole('button', { name: '冒険に出発' }).click();
  await until(async () => (await Promise.all([A, B].map((p) => api(p, () => window.__online?.mode())))).every((m) => m === 'world'), 20000, 'world');
  await wait(500);
  for (const p of [A, B]) await closeStory(p);
  const g0 = await game(A);
  const h1 = g0.heroes.find((h) => h.playerId === 'P1').id;
  const h2 = g0.heroes.find((h) => h.playerId === 'P2').id;
  const r = { a, b, A, B, g0, h1, h2 };
  r.inject = async (g) => {
    const err = await api(A, (g) => window.__online.inject(g), g);
    if (err) throw new Error(err);
    await api(B, () => window.__online.resync()).catch(() => {});
    await wait(1200);
    for (const p of [A, B]) await closeStory(p);
  };
  return r;
}

/** 寒い地域のダンジョンの入口に2人・災厄3体・P1 の手番（P2 は待ち） */
function coldState(r, extra = () => {}) {
  const g = structuredClone(r.g0);
  const w = g.world;
  const t = w.tiles.findIndex((x) => x.f?.kind === 'dungeon' && x.f.id === 'crystalCave');
  for (const h of g.heroes) {
    w.pos[h.id] = t;
    h.lastRandomEvent = w.worldTurn;
  }
  w.prevTile = t;
  // まわりのマスも見えている形に（行き先の光るマスを出すため）
  for (const x of w.tiles) x.seen = true;
  w.warm = undefined;
  w.turn = r.h1;
  w.move = null;
  w.moveDice = undefined;
  w.story = undefined;
  w.wanderers = w.wanderers.filter((x) => !x.scourge);
  const far = w.tiles.findIndex((x, i) => !x.f && i !== t && i % w.width < 3);
  for (const s of SCOURGES) w.wanderers.push({ id: `w${w.nextWandererId++}`, tile: far + w.wanderers.length, enemies: [{ defId: s[1], level: 7 }], scourge: s[0] });
  w.scourgesMet = SCOURGES.map((s) => s[0]);
  w.visitedRegions = Array.from({ length: 200 }, (_, i) => i);
  extra(g, t);
  return g;
}

const r = await setupRoom();
const { A, B } = r;
try {
  await r.inject(coldState(r));
  await until(async () => (await B.locator('[data-scourge-strip]').count()) > 0, 8000, 'P2 の 💀');
  const low = await B.evaluate(() => document.querySelector('[data-app-root]')?.hasAttribute('data-low'));
  check(low === (H < 640), `P2: 低い形 = ${low}（高さ ${H}）`);
  await shot(B, 'p2-waiting');

  // ---- (1) P2 の待ち中に 💀・🔍・❄（低い画面だけ。ふつうの画面は (2) の測るだけ） ----
  if (H < 640) {
  check((await onTop(B, '[data-scourge-button]')).ok, 'P2 待ち中: 💀×3 が押せる');
  await B.locator('[data-scourge-button]').click();
  await wait(400);
  check((await B.locator('[data-scourge-row]').count()) === 3, 'P2 待ち中: 💀 を押すと説明の窓（3体）');
  check((await onTop(B, '[data-scourge-close]')).ok, 'P2 待ち中: 説明の窓の×が押せる');
  await shot(B, 'p2-skull-open');
  await B.locator('[data-scourge-close]').click();
  check(await tryUntil(async () => !(await B.locator('[data-scourge-dialog]').count()), 2000), 'P2 待ち中: ×で閉じる');
  check((await onTop(B, '[data-zoom-toggle]')).ok, 'P2 待ち中: 🔍 が押せる');
  await B.locator('[data-zoom-toggle]').click();
  await wait(300);
  check((await B.locator('[data-zoom-tray] [data-zoom-in]').count()) === 1, 'P2 待ち中: 🔍 で ＋・標準・− が開く');
  await B.locator('[data-zoom-toggle]').click();
  await wait(300);
  check(!(await B.locator('[data-zoom-tray]').count()), 'P2 待ち中: 🔍 をもう1度押すと閉じる');
  }
  // ❄ の札: 手番のキャラ（P1）のパネルの中にある（P2 の画面ではほかの人の番の覆いの下）。P2 が見られるのは地図のマスの説明。記録だけ
  const coldChip = await onTop(B, '[data-climate-chip]');
  record.p2ColdChip = coldChip;
  console.log(`   P2 の画面の ❄寒さ の札: ${coldChip.ok ? '押せる' : `押せない（${coldChip.by}。ほかの人の番の覆いの下）`}`);
  if (coldChip.ok) {
    await B.locator('[data-climate-chip]').click();
    await wait(300);
    const t = await B.locator('[data-tile-info]').innerText().catch(() => '');
    check(/野営すれば防げる/.test(t), `P2 待ち中: ❄ の札で全文（${t}）`);
    await B.locator('[data-climate-chip]').click();
    await wait(300);
    check(!(await B.locator('[data-tile-info]').count()), 'P2 待ち中: ❄ の札をもう1度押すと消える');
  }
  // P1 の番は止まっていない（P1 の画面でサイコロを振れる）
  check((await onTop(A, '[data-roll-move]')).ok, 'P1: P2 が開け閉めしても、サイコロを振るボタンが押せる');
  // P1 の画面の ❄ の札（低い画面）
  if (H < 640) {
    await A.locator('[data-climate-chip]').click();
    await wait(300);
    const t = await A.locator('[data-tile-info]').innerText().catch(() => '');
    check(/野営すれば防げる/.test(t), `P1: ❄ の札で全文（${t}）`);
    await A.locator('[data-climate-chip]').click();
    await wait(200);
  }

  // ---- (2) 通信の知らせと 💀 ----
  // 同行の誘い（P1 → P2）: P2 の画面に知らせのカード
  await api(A, (c) => window.__online.send(c), { type: 'WORLD_INVITE', playerId: 'P1', heroId: r.h1, targetId: r.h2 });
  check(await tryUntil(async () => (await B.locator('[data-online-overlay] > *').count()) > 0, 6000), 'P2: 同行の誘いの知らせが出る');
  await wait(1300);
  const ov = await B.evaluate(() => {
    const o = document.querySelector('[data-online-overlay]');
    const card = o?.firstElementChild?.getBoundingClientRect();
    const row = document.querySelector('[data-party-row]')?.getBoundingClientRect();
    const strip = document.querySelector('[data-scourge-strip]')?.getBoundingClientRect();
    return { below: o?.getAttribute('data-online-below') ?? null, cardTop: card ? Math.round(card.top) : null, cardBottom: card ? Math.round(card.bottom) : null, rowBottom: row ? Math.round(row.bottom) : null, stripTop: strip ? Math.round(strip.top) : null, stripBottom: strip ? Math.round(strip.bottom) : null, n: o?.childElementCount ?? 0 };
  });
  record.inviteLayout = ov;
  console.log(`   P2 の知らせ: ${JSON.stringify(ov)}`);
  if (H < 640) check(ov.cardTop !== null && ov.rowBottom !== null && ov.cardTop >= ov.rowBottom, `P2（低い画面）: 知らせのカードが仲間の列より下（カードの上 ${ov.cardTop} ≥ 列の下 ${ov.rowBottom}）`);
  const skullUnder = await onTop(B, '[data-scourge-button]');
  if (H < 640) {
    check(skullUnder.ok, `P2: 誘いの知らせが出ていても 💀 が押せる${skullUnder.by ? `（上に ${skullUnder.by}）` : ''}`);
    // 記録だけ: 知らせを仲間の列の下へ出したので、横いっぱいのカードの間は地図の右上の 🔍・見取り図にかかる
    record.zoomUnderInvite = await onTop(B, '[data-zoom-toggle]');
    console.log(`   誘いの知らせが出ている間の 🔍: ${record.zoomUnderInvite.ok ? '押せる' : '隠れる（知らせに答えると消える）'}`);
  }
  else {
    const strip = await onTop(B, '[data-scourge-strip]');
    record.normalStripCovered = !strip.ok;
    console.log(`   ふつうの画面: 誘いの知らせが出ている時、災厄の札の真ん中は ${strip.ok ? '押せる' : `押せない（上に ${strip.by}）`}`);
  }
  await shot(B, 'p2-invite-and-skull');
  if (H < 640 && skullUnder.ok) {
    await B.locator('[data-scourge-button]').click();
    await wait(400);
    check((await B.locator('[data-scourge-dialog]').count()) === 1 && (await onTop(B, '[data-scourge-close]')).ok, 'P2: 知らせが出ている時も、💀 の窓が開いて×が押せる');
    await B.locator('[data-scourge-close]').click();
    await wait(400);
  }
  // 「お知らせ N」の数え方（シートを開くと見出しに出る）
  await api(B, () => window.__online.openSheet('party'));
  await wait(1300);
  const badge = await B.locator('[data-hidden-notice]').getAttribute('data-hidden-notice').catch(() => null);
  check(badge === '1', `P2: シートの「お知らせ N」は 1（${badge}）`);
  await B.keyboard.press('Escape').catch(() => {});
  if (await B.locator('[data-sheet-close]').count()) await B.locator('[data-sheet-close]').first().click({ timeout: 3000 }).catch(() => {});
  await wait(400);
  // 誘いに「行かない」で答える
  await B.getByRole('button', { name: '行かない' }).first().click({ timeout: 3000, force: true }).catch(() => {});
  await wait(800);
  // 自分の切断: 「通信が切れました」の帯
  await api(B, () => window.__online.goOffline());
  check(await tryUntil(async () => (await B.getByText('通信が切れました').count()) > 0, 6000), 'P2: 切断の知らせが出る');
  await wait(400);
  if (H < 640) {
    const s2 = await onTop(B, '[data-scourge-button]');
    check(s2.ok, `P2: 切断の知らせが出ていても 💀 が押せる${s2.by ? `（上に ${s2.by}）` : ''}`);
    check((await onTop(B, '[data-zoom-toggle]')).ok, 'P2: 切断の知らせが出ていても 🔍 が押せる');
  }
  await shot(B, 'p2-offline-and-skull');
  await api(B, () => window.__online.goOnline());
  await tryUntil(async () => !(await B.getByText('通信が切れました').count()), 15000);
  await wait(800);

  // ---- (3) 一緒に動く提案の窓 ----
  await r.inject(
    coldState(r, (g, t) => {
      g.world.follow = { [r.h2]: r.h1 };
    }),
  );
  // P1 がサイコロを振る（画面と同じ道）
  await api(A, (c) => window.__online.send(c), { type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: r.h1 });
  await wait(2500);
  await shot(A, 'p1-rolled');
  await tryUntil(async () => (await A.locator('[data-reach]').count()) > 0, 6000);
  const tos = await A.evaluate(() => [...document.querySelectorAll('[data-reach]')].map((e) => Number(e.getAttribute('data-reach'))));
  let err = 'no reach';
  for (const to of tos) {
    err = await api(A, (c) => window.__online.send(c), { type: 'WORLD_MOVE', playerId: 'P1', heroId: r.h1, to, companions: [r.h2] });
    if (!err) break;
  }
  check(!err, `P1: 一緒に動く提案を送る（${err ?? 'OK'}）`);
  check(await tryUntil(async () => (await B.locator('[data-move-proposal]').count()) > 0, 6000), 'P2: 一緒に動く提案の窓が出る');
  await wait(800);
  const mA = await mapH(A);
  const mB = await mapH(B);
  record.proposal = { leader: mA, answer: mB };
  console.log(`   提案の窓: P1（提案した側）窓 ${mA.proposal}px・地図 ${mA.map}px ／ P2（返事をする側）窓 ${mB.proposal}px・地図 ${mB.map}px`);
  if (H < 640) {
    check((mA.proposal === null || mA.map >= 150) && mB.map >= 150, `提案の窓が出ていても、見えている地図が 150px 以上（P1 ${mA.map}・P2 ${mB.map}）`);
  }
  const btns = await B.evaluate(() => [...document.querySelectorAll('[data-move-proposal] button')].map((b) => Math.round(b.getBoundingClientRect().height)));
  check(btns.length === 2 && btns.every((h) => h >= 44), `P2: 提案の窓のボタンは2つ・44px 以上（${btns.join(',')}）`);
  const txt = await B.locator('[data-move-proposal]').innerText();
  check(/一緒に動/.test(txt) && /同意/.test(txt) && /返事待ち/.test(txt), `P2: 提案の窓の文に「一緒に動く」「同意で動く」「返事待ち」がある（${txt.replace(/\n/g, ' / ')}）`);
  await shot(A, 'p1-proposal');
  await shot(B, 'p2-proposal');
  await B.locator('[data-move-proposal] button', { hasText: '一緒に行く' }).click();
  check(await tryUntil(async () => !(await B.locator('[data-move-proposal]').count()), 8000), 'P2: 「一緒に行く」で提案の窓が消え、動く');
} catch (e) {
  problems.push(`途中で止まった: ${String(e.message).split('\n')[0]}`);
  console.log('NG 途中で止まった', e.message);
  await shot(B, 'error-B');
  await shot(A, 'error-A');
}
writeFileSync(`${OUT}/${H}-record.json`, JSON.stringify(record, null, 1));
await browser.close();
console.log(problems.length ? `\n失敗 ${problems.length}件:\n${problems.join('\n')}` : '\nすべて成功');
process.exit(problems.length ? 1 : 0);
