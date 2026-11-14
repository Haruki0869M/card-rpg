// 実機の不具合①（2026-11-14）の確認: ダンジョンのイベントの2段階の合意（選ぶ段 → 挑む段）を、2台の画面のボタンで押す。
// 見る事（①の3つの現象が起きない事）:
//   (1) 先頭でない人の指定が黙って捨てられない → 票にはキャラ・フォーカスが無く、挑む段で挑む役の持ち主が決めたフォーカスだけが使われる
//   (2) 押した後に画面が変わらない → 自分の票の印・待ちの枠が見える（サブパネルに隠れない）
//   (3) 押し直すとフォーカスが0に戻る → 押し直しは票の取り消し（パネルは開かない）。挑む段のフォーカスは相手の操作で戻らない
// ほか: 先頭 = P2 と P1 の両方の並び・任せる・選び直す・払えない人も払う選択肢に入れられる・ホストの「代わりに操作」で挑む段を進める。
// 高さ 844 と 540（390 幅）。P2 の操作は画面のボタンで押す（命令を直接送らない）。
// エミュレーター（demo-card-rpg）だけを使う（URL の ?emu=）。本番の Firebase には書かない。
// 使い方: URL=http://127.0.0.1:4190/card-rpg/ node scripts/coop-agree.mjs   （HEIGHTS=844,540 で高さを変えられる）
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, URL } from './lib.mjs';

const EMU = process.env.EMU_HOST ?? '127.0.0.1';
const OUT = process.env.COOP_AGREE_OUTPUT ?? 'screenshots/coop-agree';
const HEIGHTS = (process.env.HEIGHTS ?? '844,540').split(',').map(Number);
if (/firebaseio|web\.app|firebaseapp/.test(URL)) throw new Error('本番には書きません（URL を確かめてください）');
mkdirSync(OUT, { recursive: true });
const problems = [];
const check = (ok, what) => {
  console.log(`${ok ? 'OK ' : 'NG '} ${what}`);
  if (!ok) problems.push(what);
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
const isHost = (p) => api(p, () => !!window.__online?.isHost()).catch(() => false);
let H = HEIGHTS[0];
const shot = (page, name) => page.screenshot({ path: `${OUT}/${H}-${name}.png` }).catch(() => {});

const browser = await chromium.launch();
async function newCtx() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('card-rpg/settings')) localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false, overviewHintSeen: true }));
  });
  return ctx;
}
async function pageOf(ctx, name) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    console.log(`[${name}] pageerror`, e.message);
    problems.push(`[${name}] pageerror ${e.message}`);
  });
  return page;
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

/** 部屋を作って2人で始める。A = P1（ホスト）、B = P2（coop-r3.mjs と同じ手順） */
async function setupRoom() {
  const ctxA = await newCtx();
  const ctxB = await newCtx();
  const A = await pageOf(ctxA, 'A');
  const B = await pageOf(ctxB, 'B');
  await A.goto(base());
  await A.getByText('新しい冒険').click();
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
  const r = { ctxA, ctxB, A, B, code, g0, h1, h2 };
  /** ホストが状態を差し込み、相手も取り直す */
  r.inject = async (g) => {
    const host = (await isHost(r.A)) ? r.A : r.B;
    const other = host === r.A ? r.B : r.A;
    const err = await api(host, (g) => window.__online.inject(g), g);
    if (err) throw new Error(err);
    if (!other.isClosed()) await api(other, () => window.__online.resync()).catch(() => {});
    await wait(900);
    for (const p of [r.A, r.B]) if (!p.isClosed()) await closeStory(p);
  };
  r.send = async (page, cmd) => {
    const err = await api(page, (c) => window.__online.send(c), cmd);
    if (err) throw new Error(`${JSON.stringify(cmd).slice(0, 80)}: ${err}`);
    await wait(500);
  };
  return r;
}

/** 2人で翠の神殿に入る（P2 は P1 に同行） */
async function enterDungeon(r) {
  const g = structuredClone(r.g0);
  const w = g.world;
  const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
  for (const h of g.heroes) {
    w.pos[h.id] = t;
    h.lastRandomEvent = w.worldTurn;
  }
  w.follow = { [r.h2]: r.h1 };
  w.turn = r.h1;
  w.move = 4;
  w.story = undefined;
  w.wanderers = [];
  w.visitedRegions = Array.from({ length: 200 }, (_, i) => i);
  await r.inject(g);
  await r.send(r.A, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: r.h1 });
  await until(async () => (await game(r.A))?.expeditions?.[0]?.heroes?.length === 2, 10000, 'enter dungeon');
  for (const p of [r.A, r.B]) await closeStory(p);
}

/** ダンジョンの組をイベントの前に置く。order = 組の並び（先頭の人）。gold = [P1, P2] */
async function atEvent(r, { order, eventId = 'fallenTree', gold, decided }) {
  const g = await game(r.A);
  const x = g.expeditions[0];
  x.heroes = order;
  x.mode = 'event';
  x.event = { eventId, roomId: x.dungeon.rooms[0].id, ...(decided ? { decided } : {}) };
  delete x.vote;
  delete x.chest;
  delete x.reward;
  delete x.battle;
  for (const h of g.heroes) {
    h.focus = 3;
    h.hp = Math.max(h.hp, 1);
    if (gold) h.gold = gold[h.playerId === 'P1' ? 0 : 1];
  }
  await r.inject(g);
  await until(async () => (await game(r.A))?.expeditions?.[0]?.mode === 'event', 8000, 'event');
  return g;
}
const ev = async (p) => (await game(p))?.expeditions?.[0]?.event;

/** 画面のボタンを押す。押す前に、ボタンの真ん中に別の層が乗っていないか（押せるか）を見る */
async function press(p, sel, what) {
  const b = p.locator(sel).first();
  if (!(await b.count())) {
    check(false, `${what}: ボタンが無い（${sel}）`);
    return false;
  }
  await b.scrollIntoViewIfNeeded().catch(() => {});
  const hit = await b.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return { inView: y >= 0 && y <= innerHeight && x >= 0 && x <= innerWidth, covered: !(top && (top === el || el.contains(top))), enabled: !el.disabled };
  });
  check(hit.inView && !hit.covered && hit.enabled, `${what}: 押せる（画面の中・上に何も乗っていない）${JSON.stringify(hit)}`);
  await b.click();
  await wait(700);
  return true;
}
const visible = (p, sel) => p.locator(sel).first().isVisible().catch(() => false);
const pageOfSeat = (r, seat) => (seat === 'P1' ? r.A : r.B);

/** ケース1: 先頭 = P2。P1 が先に押す → 印・待ちの枠 → 押し直し（取り消し）→ P2 が画面で押す → 挑む段 → 持ち主がフォーカス1で挑む */
async function caseLeadP2(r) {
  const label = '先頭P2';
  await atEvent(r, { order: [r.h2, r.h1] });
  await press(r.A, '[data-event-option="0"]', `${label}: P1 が「倒木を押しのける」`);
  check(await visible(r.A, '[data-my-vote-note]'), `${label}: P1 の画面に「✓ あなたが選択中」の印`);
  check(await visible(r.A, '[data-vote-status]'), `${label}: P1 の画面に待ちの枠（P2 考え中）が見える`);
  check(!(await r.A.locator('[data-challenge], [aria-label="フォーカスを増やす"]').count()), `${label}: 押してもサブパネルは開かない（待ちの枠が隠れない）`);
  check(await visible(r.B, '[data-vote-status]'), `${label}: P2 の画面にも待ちの枠`);
  await shot(r.A, `${label}-P1-voted`);
  // 押し直し = 取り消し
  await press(r.A, '[data-event-option="0"]', `${label}: P1 が同じ選択肢をもう一度`);
  check(await tryUntil(async () => !(await visible(r.A, '[data-my-vote-note]')), 4000), `${label}: 押し直すと票が取り消される（印が消える）`);
  check(!(await ev(r.A))?.decided && !(await r.A.locator('[aria-label="フォーカスを増やす"]').count()), `${label}: 押し直してもパネルは開かない`);
  await press(r.A, '[data-event-option="0"]', `${label}: P1 がもう一度入れる`);
  // P2 が画面のボタンで同じ選択肢
  await press(r.B, '[data-event-option="0"]', `${label}: P2 が画面で「倒木を押しのける」`);
  check(await tryUntil(async () => !!(await ev(r.A))?.decided, 6000), `${label}: 2人そろうと挑む段に進む（すぐには判定しない）`);
  const e = await ev(r.A);
  const g = await game(r.A);
  const who = g.heroes.find((h) => h.id === e.decided.heroId);
  const O = pageOfSeat(r, who.playerId), N = O === r.A ? r.B : r.A;
  await until(async () => await visible(N, '[data-challenge-wait]'), 6000, 'wait note').catch(() => {});
  check(await visible(O, '[data-challenge-go]'), `${label}: 挑む役（${who.name}・${who.playerId}）の持ち主の画面に「挑戦する」`);
  const waitText = await N.locator('[data-challenge-wait]').first().innerText().catch(() => '');
  check(/フォーカスを決めています/.test(waitText), `${label}: 持ち主でない画面に「〜さんが、${who.name}のフォーカスを決めています」（${waitText}）`);
  check((await N.locator(`[data-challenge-hero="${who.id}"]`).count()) > 0 && /成功率/.test(await N.locator('[data-challenge]').first().innerText()), `${label}: 持ち主でない画面にも挑む役と成功率が見える`);
  check(!(await N.locator('[data-challenge-go]').count()), `${label}: 持ち主でない画面には「挑戦する」が無い`);
  await shot(O, `${label}-owner`);
  await shot(N, `${label}-other`);
  // フォーカスを1にして、相手の操作（スタンプ）で画面が書き直されても0に戻らない
  await press(O, '[aria-label="フォーカスを増やす"]', `${label}: 持ち主がフォーカスを1つ増やす`);
  await api(N, () => window.__online.stamp('👍')).catch(() => {});
  await wait(1200);
  const panel = await O.locator('[data-challenge]').first().innerText();
  check(new RegExp(`フォーカス ${who.focus} → ${who.focus - 1}`).test(panel.replace(/\s+/g, ' ')), `${label}: 相手の操作の後もフォーカスの指定が1のまま（勝手に0に戻らない）`);
  await press(O, '[data-challenge-go]', `${label}: 持ち主が「挑戦する」`);
  check(await tryUntil(async () => !!(await ev(r.A))?.result, 6000), `${label}: 判定の結果が出る`);
  const res = (await ev(r.A)).result;
  const after = await game(r.A);
  check(res.heroId === who.id && res.results.filter((x) => x === 'focus').length === 1, `${label}: 判定は挑む役・持ち主が決めたフォーカス1で回った（${JSON.stringify(res.results)}）`);
  check(after.heroes.find((h) => h.id === who.id).focus === who.focus - 1, `${label}: 挑む役のフォーカスが1減った`);
  const other = after.heroes.find((h) => h.id !== who.id);
  check(other.focus === g.heroes.find((h) => h.id === other.id).focus, `${label}: もう1人のフォーカスは使われていない`);
  await shot(N, `${label}-result-other`);
}

/** ケース2: 先頭 = P1。P2 が先に押す → P1 → 挑む段 → 任せる → 任された人が選び直す → 2人で「迂回」 */
async function caseLeadP1(r) {
  const label = '先頭P1';
  await atEvent(r, { order: [r.h1, r.h2] });
  await press(r.B, '[data-event-option="0"]', `${label}: P2 が先に「倒木を押しのける」`);
  check(await visible(r.B, '[data-my-vote-note]') && (await visible(r.B, '[data-vote-status]')), `${label}: P2 の画面に印と待ちの枠`);
  await press(r.A, '[data-event-option="0"]', `${label}: P1 も同じ選択肢`);
  check(await tryUntil(async () => !!(await ev(r.A))?.decided, 6000), `${label}: 挑む段に進む`);
  const g = await game(r.A);
  const who = g.heroes.find((h) => h.id === (g.expeditions[0].event.decided.heroId));
  const O = pageOfSeat(r, who.playerId);
  await until(async () => await visible(O, '[data-challenge-to]'), 6000, 'handover').catch(() => {});
  await press(O, '[data-challenge-to]', `${label}: 持ち主（${who.playerId}）が「ほかのキャラに任せる」`);
  check(await tryUntil(async () => (await ev(r.A))?.decided?.heroId !== who.id, 5000), `${label}: 挑む役が替わった`);
  const toId = (await ev(r.A)).decided.heroId;
  const to = (await game(r.A)).heroes.find((h) => h.id === toId);
  const O2 = pageOfSeat(r, to.playerId);
  check(await tryUntil(async () => await visible(O2, '[data-challenge-go]'), 5000), `${label}: 任された人（${to.playerId}）の画面に「挑戦する」`);
  await press(O2, '[data-challenge-rechoose]', `${label}: 任された人が「選び直す」`);
  check(await tryUntil(async () => !(await ev(r.A))?.decided, 5000), `${label}: 選ぶ段に戻る`);
  await until(async () => (await r.A.locator('[data-event-option="1"]').count()) > 0 && (await r.B.locator('[data-event-option="1"]').count()) > 0, 5000, 'options back').catch(() => {});
  await press(r.B, '[data-event-option="1"]', `${label}: P2 が「迂回して進む」`);
  await press(r.A, '[data-event-option="1"]', `${label}: P1 も「迂回して進む」`);
  check(await tryUntil(async () => (await ev(r.A))?.result?.optionIndex === 1, 5000), `${label}: 判定の無い選択肢は決まるとすぐ実行`);
}

/** ケース3: 払う選択肢。P1 はお金なし・P2 は100G。P1 も票を入れられ、払うのは払える最初のキャラ（P2） */
async function casePay(r) {
  const label = '払う選択肢';
  await atEvent(r, { order: [r.h1, r.h2], eventId: 'wanderingMerchant', gold: [0, 100] });
  const btn = await r.A.locator('[data-event-option="1"]').first().innerText().catch(() => '');
  check(/が払う/.test(btn), `${label}: ボタンに「〇〇が払う」が出る（${btn.replace(/\s+/g, ' ')}）`);
  await press(r.A, '[data-event-option="1"]', `${label}: 払えない P1 が「掘り出し物を買う（90G）」`);
  check(await visible(r.A, '[data-my-vote-note]'), `${label}: 払えない P1 の票も入る`);
  await press(r.B, '[data-event-option="1"]', `${label}: P2 も同じ選択肢`);
  check(await tryUntil(async () => !!(await ev(r.A))?.result, 5000), `${label}: すぐ実行`);
  const g = await game(r.A);
  check(g.heroes.find((h) => h.id === r.h2).gold === 10 && g.heroes.find((h) => h.id === r.h1).gold === 0, `${label}: P2 のキャラが払った`);
}

/** ケース4: 挑む役が P2 のキャラで P2 が切断 → ホストが「代わりに操作」して、画面のボタンで挑む */
async function caseProxy(r) {
  const label = '代わりに操作';
  await atEvent(r, { order: [r.h1, r.h2], decided: { optionIndex: 0, heroId: r.h2 } });
  check(!!(await ev(r.A))?.decided, `${label}: 挑む段（挑む役 = P2 のキャラ）`);
  await r.B.close();
  await wait(1500);
  await api(r.A, () => window.__online.setProxy('P2', true));
  await until(async () => (await api(r.A, () => window.__online.myPlayers())).includes('P2'), 10000, 'proxy on');
  await wait(800);
  check(await tryUntil(async () => await visible(r.A, '[data-challenge-go]'), 5000), `${label}: ホストの画面に P2 の分の「挑戦する」`);
  await press(r.A, '[data-challenge-go]', `${label}: ホストが「挑戦する」`);
  check(await tryUntil(async () => (await ev(r.A))?.result?.heroId === r.h2, 6000), `${label}: P2 のキャラで判定が回った`);
  await shot(r.A, `${label}-done`);
}

const summary = [];
try {
  for (const [i, h] of HEIGHTS.entries()) {
    H = h;
    console.log(`\n===== 390×${H} =====`);
    const r = await setupRoom();
    await enterDungeon(r);
    for (const c of [caseLeadP2, caseLeadP1, casePay]) {
      try {
        await c(r);
      } catch (e) {
        check(false, `${c.name}: ${e.message}`);
      }
    }
    // 代わりに操作は、最後の高さで1回（相方を閉じるため）
    if (i === HEIGHTS.length - 1) {
      try {
        await caseProxy(r);
      } catch (e) {
        check(false, `caseProxy: ${e.message}`);
      }
    }
    summary.push({ height: H, problems: problems.length });
    await r.ctxA.close().catch(() => {});
    await r.ctxB.close().catch(() => {});
  }
} catch (e) {
  console.log('ERROR', e);
  problems.push(String(e));
}
await browser.close();
writeFileSync(`${OUT}/summary.json`, JSON.stringify({ summary, problems }, null, 2));
console.log(problems.length ? `\n失敗 ${problems.length}件:\n${problems.join('\n')}` : '\nすべて成功');
process.exit(problems.length ? 1 : 0);
