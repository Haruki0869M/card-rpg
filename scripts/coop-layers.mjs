// 実機の不具合②⑥（2026-11-14）の確認: オンライン2台・390×540（HEIGHT で変えられる）。P2 の画面で:
//   - 合意待ち中（扉の投票・イベントの投票・挑む段）に、パーティ・装備と道具袋を開く → ×が押せる（上にほかの層が乗っていない） → 閉じる
//   - 通信の知らせ（スタンプ・自分の切断）とシートが同時に出ても、×が押せる。切断中はシートの見出しに「通信が切れました…」
//   - シートを開いたまま切って戻す（取り直し）→ シートは残り、開いていた行（中の選択）は消える。落ちない
//   - 持ち物の行の「渡す」→ 行のすぐ下に枠 → 相手 → 確認 → 渡した側「回復薬を〜に渡しました」・受け取った側（P1）「〜から回復薬を受け取りました」
//   - 「使う」→ 相手 → HP が戻る・シートは開いたまま
//   - イベントの画面（世界マップのマス・ダンジョンの投票・挑む段）の下の帯「装備」「道具」で開ける。待ちの帯（TurnLock）に重ならない（2026-11-15）
//   - 投票中・挑む段で、道具袋から回復薬を使って戻っても、自分の票・フォーカスの指定が消えない
// P2 の操作は画面のボタンで押す。
// エミュレーター（demo-card-rpg）だけを使う（URL の ?emu=）。本番の Firebase には書かない。
// 使い方: URL=http://127.0.0.1:4193/card-rpg/ node scripts/coop-layers.mjs   （COOP_LAYERS_OUTPUT で写真の場所）
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, URL } from './lib.mjs';

const EMU = process.env.EMU_HOST ?? '127.0.0.1';
const OUT = process.env.COOP_LAYERS_OUTPUT ?? 'screenshots/coop-layers';
const H = Number(process.env.HEIGHT ?? 540);
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
const ui = (p) => api(p, () => window.__online?.ui());
const shot = (page, name) => page.screenshot({ path: `${OUT}/${H}-${name}.png` }).catch(() => {});

const browser = await chromium.launch();
async function newPage(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('card-rpg/settings')) localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false, overviewHintSeen: true }));
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

/** 画面のボタンが押せるか（画面の中・真ん中に別の層が乗っていない）を見てから押す */
async function press(p, loc, what, { click = true } = {}) {
  const b = typeof loc === 'string' ? p.locator(loc).first() : loc.first();
  if (!(await b.count())) {
    check(false, `${what}: ボタンが無い`);
    return false;
  }
  await b.scrollIntoViewIfNeeded().catch(() => {});
  const hit = await b.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return { inView: y >= 0 && y <= innerHeight, covered: !(top && (top === el || el.contains(top))), by: top && !(top === el || el.contains(top)) ? String(top.className).slice(0, 50) : '', enabled: !el.disabled };
  });
  check(hit.inView && !hit.covered && hit.enabled, `${what}: 押せる${hit.covered ? `（上に ${hit.by}）` : ''}`);
  if (click) {
    await b.click();
    await wait(500);
  }
  return true;
}

async function setupRoom() {
  const a = await newPage('A');
  const b = await newPage('B');
  const A = a.page, B = b.page;
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
  const r = { a, b, A, B, g0, h1, h2 };
  r.inject = async (g) => {
    const err = await api(A, (g) => window.__online.inject(g), g);
    if (err) throw new Error(err);
    await api(B, () => window.__online.resync()).catch(() => {});
    await wait(900);
    for (const p of [A, B]) await closeStory(p);
  };
  return r;
}

/** 2人で翠の神殿に入る（P2 は P1 に同行）。どちらも回復薬2つ・上回復薬1つ・60G。HP を減らしておく */
async function enterDungeon(r) {
  const g = structuredClone(r.g0);
  const w = g.world;
  const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
  for (const h of g.heroes) {
    w.pos[h.id] = t;
    h.lastRandomEvent = w.worldTurn;
    h.pouch = [{ uid: `p-${h.id}-1`, itemId: 'potion' }, { uid: `p-${h.id}-2`, itemId: 'potion' }, { uid: `p-${h.id}-3`, itemId: 'hiPotion' }];
    h.gold = 60;
    h.hp = Math.max(1, h.hp - 30);
  }
  w.follow = { [r.h2]: r.h1 };
  w.turn = r.h1;
  w.move = 4;
  w.story = undefined;
  w.wanderers = [];
  w.visitedRegions = Array.from({ length: 200 }, (_, i) => i);
  await r.inject(g);
  const err = await api(r.A, (c) => window.__online.send(c), { type: 'WORLD_INTERACT', playerId: 'P1', heroId: r.h1 });
  if (err) throw new Error(err);
  await until(async () => (await game(r.A))?.expeditions?.[0]?.heroes?.length === 2, 10000, 'enter dungeon');
  await wait(800);
  for (const p of [r.A, r.B]) await closeStory(p);
}

/** シートを測る: ×が押せるか・見出しに何も乗っていないか・スクロール領域 */
async function sheetOk(p, name, label) {
  const ok = await tryUntil(async () => (await p.locator(`[data-sheet="${name}"]`).count()) > 0, 3000);
  check(ok, `${label}: シート（${name}）が開く`);
  if (!ok) return false;
  await wait(250);
  const m = await p.evaluate((n) => {
    const root = document.querySelector(`[data-sheet="${n}"]`);
    const body = root.querySelector('[data-sheet-body]');
    const head = root.querySelector('[data-sheet-header]');
    const hb = head.getBoundingClientRect();
    const t = document.elementFromPoint(hb.left + 20, hb.top + hb.height / 2);
    const pb = root.querySelector('[data-sheet-panel]').getBoundingClientRect();
    return { body: body.clientHeight, content: body.scrollHeight, headerFree: !!t && root.contains(t), panelBottom: Math.round(pb.bottom), innerHeight };
  }, name);
  check(m.headerFree, `${label}: シートの見出しの上に、ほかの層が乗っていない`);
  // 中身が少ない時はシートも低い（その時は中身が全部見えていれば良い）。中身が多い時は 160px 以上
  check(m.body >= Math.min(160, m.content), `${label}: 中身のスクロール領域 ${m.body}px（中身 ${m.content}px）`);
  check(m.panelBottom <= m.innerHeight + 1, `${label}: シートの下が画面の中（${m.panelBottom}/${m.innerHeight}）`);
  await press(p, `[data-sheet="${name}"] [data-sheet-close]`, `${label}: ×`, { click: false });
  return true;
}
const closeSheet = async (p, name, label) => {
  await press(p, `[data-sheet="${name}"] [data-sheet-close]`, `${label}: ×で閉じる`);
  check(await tryUntil(async () => !(await p.locator(`[data-sheet="${name}"]`).count()), 2000), `${label}: 閉じた`);
};

/** 下の帯（扉の画面・イベントの画面の data-dungeon-bar）の「装備」「道具」 */
const barButton = (p, btn) => p.locator(`[data-dungeon-bar] [data-bar-button="${btn}"]`);

/** 「道具」で道具袋を開き、回復薬を自分のキャラに使って、×で閉じる（HP が戻ったかも見る） */
async function usePotionVia(p, heroId, label) {
  const hp0 = (await game(p)).heroes.find((h) => h.id === heroId).hp;
  await press(p, barButton(p, '道具'), `${label}: 「道具」`);
  if (!(await tryUntil(async () => (await p.locator('[data-sheet="pouch"]').count()) > 0, 3000))) return check(false, `${label}: 道具袋が開く`);
  await press(p, '[data-sheet="pouch"] [data-pouch-item="potion"]', `${label}: 回復薬の行を押す（使う相手が出る）`);
  await press(p, `[data-sheet="pouch"] [data-use-to="${heroId}"]`, `${label}: 自分のキャラに使う`);
  check(await tryUntil(async () => (await game(p)).heroes.find((h) => h.id === heroId).hp > hp0, 5000), `${label}: HP が戻った`);
  await shot(p, `${label}-pouch-used`);
  // 道具袋は、使うと自分で閉じる（閉じていなければ×で閉じる）
  if (await p.locator('[data-sheet="pouch"]').count()) await closeSheet(p, 'pouch', label);
  check(await tryUntil(async () => !(await p.locator('[data-sheet="pouch"]').count()), 2000), `${label}: 道具袋が閉じた`);
}

/** 待ち中に、パーティ・装備と道具袋を、画面の下の帯の「装備」「道具」で開いて閉じる */
async function openCloseWhileWaiting(r, label) {
  const B = r.B;
  for (const [name, btn] of [['party', '装備'], ['pouch', '道具']]) {
    await press(B, barButton(B, btn), `${label}: P2 が「${btn}」`);
    await sheetOk(B, name, `${label}・${name}`);
    await shot(B, `${label}-${name}`);
    await closeSheet(B, name, `${label}・${name}`);
  }
}

const summary = {};
let r;
try {
  r = await setupRoom();
  const { A, B } = r;

  // ---- 0) 世界マップのマスのイベントで、P1 の手番を待っている（下に待ちの帯 TurnLock が出る）----
  // 前は待ちの帯（z-55・押せる覆い）がシート（z-50）の下 34% に乗り、シートの下が黒く消えて押せなかった
  {
    const L0 = 'マスのイベントの待ち';
    const g = structuredClone(r.g0);
    const w = g.world;
    w.story = undefined;
    w.turn = r.h1;
    for (const h of g.heroes) w.pos[h.id] = w.pos[r.h1];
    g.mode = 'event';
    g.party = [r.h1];
    g.event = { eventId: 'rStrayBird', tile: w.pos[r.h1], random: true };
    await r.inject(g);
    const lock = await tryUntil(async () => (await B.locator('[data-turn-lock]').count()) > 0, 4000);
    check(lock, `${L0}: P2 の画面に待ちの帯（〜さんが選んでいます）`);
    // イベントの画面の下の帯（装備・道具）は、待ちの帯の上に出る（重ならない。画面のボタンで開く）
    const lift = await B.evaluate(() => {
      const bar = document.querySelector('[data-dungeon-bar]')?.getBoundingClientRect();
      const lock = document.querySelector('[data-turn-lock]')?.getBoundingClientRect();
      return bar && lock ? { barBottom: Math.round(bar.bottom), lockTop: Math.round(lock.top) } : null;
    });
    check(!!lift && lift.barBottom <= lift.lockTop + 1, `${L0}: 装備・道具の帯が待ちの帯の上 ${JSON.stringify(lift)}`);
    await press(B, barButton(B, '道具'), `${L0}: P2 が「道具」`);
    await sheetOk(B, 'pouch', L0);
    await closeSheet(B, 'pouch', L0);
    await press(B, barButton(B, '装備'), `${L0}: P2 が「装備」`);
    await sheetOk(B, 'party', L0);
    const bottom = await B.evaluate(() => {
      const t = document.elementFromPoint(195, innerHeight - 30);
      return !!t && !!t.closest('[data-sheet="party"]');
    });
    check(bottom, `${L0}: シートの下の端（画面の下から30px）が、待ちの帯ではなくシート`);
    // 参考: 前の重なり（シート z-50）に戻すと、下の端に何が乗るか（直す前の形の再現。合否には入れない）
    const old = await B.evaluate(() => {
      const s = document.querySelector('[data-sheet="party"]');
      const keep = s.style.zIndex;
      s.style.zIndex = '50';
      const t = document.elementFromPoint(195, innerHeight - 30);
      const what = t?.closest('[data-turn-lock]') ? '待ちの帯（data-turn-lock）' : t?.closest('[data-sheet]') ? 'シート' : String(t?.className).slice(0, 40);
      s.style.zIndex = keep;
      return what;
    });
    console.log(`   参考: 前の重なり（シート z-50）なら、下の端は「${old}」`);
    await shot(B, `${L0}-party`);
    await closeSheet(B, 'party', L0);
  }

  await enterDungeon(r);

  // ---- 1) 扉の投票の待ち ----
  const L1 = '扉の投票の待ち';
  await A.locator('[data-door-choice]').first().waitFor({ timeout: 8000 });
  await press(A, '[data-door-choice]', `${L1}: P1 が扉を選ぶ`);
  check(await tryUntil(async () => await B.getByText('あなたの選択を待っています').isVisible(), 5000), `${L1}: P2 の画面に「あなたの選択を待っています」`);
  await openCloseWhileWaiting(r, L1);

  // ---- 2) 知らせとシートが同時に出る・切って戻す ----
  const L2 = '知らせとシート';
  await press(B, B.locator('[data-dungeon-bar] button', { hasText: '装備' }), `${L2}: P2 が「装備」`);
  await sheetOk(B, 'party', `${L2}`);
  await api(A, () => window.__online.stamp('👍'));
  await wait(600);
  await shot(B, `${L2}-stamp`);
  await press(B, '[data-sheet="party"] [data-sheet-close]', `${L2}: スタンプが出ている間も×`, { click: false });
  // 持ち物の行を開いたまま切る
  await press(B, '[data-item-row="potion"] [data-row-give]', `${L2}: P2 が回復薬の「渡す」`);
  check((await B.locator('[data-row-panel]').count()) > 0, `${L2}: 行の下に枠が開いた`);
  await api(B, () => window.__online.goOffline());
  await wait(3000);
  check(await tryUntil(async () => (await B.locator('[data-sheet-offline]').count()) > 0, 3000), `${L2}: 切断中、シートの見出しに「通信が切れました。つながり直しています…」`);
  await shot(B, `${L2}-offline`);
  await press(B, '[data-sheet="party"] [data-sheet-close]', `${L2}: 切断中も×`, { click: false });
  await api(B, () => window.__online.goOnline());
  await wait(2500);
  await api(B, () => window.__online.resync());
  await wait(1200);
  check((await B.locator('[data-sheet="party"]').count()) > 0, `${L2}: つながり直してもシートは開いたまま`);
  check((await B.locator('[data-row-panel]').count()) === 0, `${L2}: つながり直すと、開いていた行（中の選択）は消える`);
  await shot(B, `${L2}-reconnected`);

  // ---- 3) 渡す（P2 → P1）と、受け取った側の知らせ ----
  const L3 = '渡す';
  const before = await game(A);
  await press(B, '[data-item-row="potion"] [data-row-give]', `${L3}: P2 が回復薬の「渡す」`);
  const panel = await B.evaluate(() => {
    const p = document.querySelector('[data-row-panel]');
    const row = document.querySelector('[data-item-row][data-open]');
    if (!p || !row) return null;
    const b = p.getBoundingClientRect();
    return { inside: row.contains(p), top: Math.round(b.top), bottom: Math.round(b.bottom), innerHeight };
  });
  check(!!panel && panel.inside && panel.bottom <= panel.innerHeight + 1 && panel.top >= 0, `${L3}: 枠が押した行のすぐ下・画面の中 ${JSON.stringify(panel)}`);
  check((await B.locator('[data-item-row][data-open] [data-row-give].btn-gold').count()) > 0, `${L3}: 押した「渡す」の見た目が変わる`);
  await shot(B, `${L3}-open`);
  await press(B, `[data-give-to="${r.h1}"]`, `${L3}: 相手（P1 のキャラ）`);
  await press(B, B.getByRole('button', { name: '渡す', exact: true }).last(), `${L3}: 確認の「渡す」`);
  const bt = await tryUntil(async () => /回復薬を.+に渡しました/.test((await ui(B)).toast ?? ''), 3000);
  check(bt, `${L3}: 渡した側（P2）の知らせ「${(await ui(B)).toast}」`);
  const at = await tryUntil(async () => /から回復薬を受け取りました/.test((await ui(A)).toast ?? ''), 5000);
  check(at, `${L3}: 受け取った側（P1）の知らせ「${(await ui(A)).toast}」`);
  await shot(A, `${L3}-P1-received`);
  await shot(B, `${L3}-P2-given`);
  const after = await game(A);
  const cnt = (g, id) => g.heroes.find((h) => h.id === id).pouch.filter((p) => p.itemId === 'potion').length;
  check(cnt(after, r.h1) === cnt(before, r.h1) + 1 && cnt(after, r.h2) === cnt(before, r.h2) - 1, `${L3}: 部屋の状態で回復薬が P1 のキャラへ移った`);
  // ゴールド
  await press(B, '[data-gold-row] [data-row-give]', `${L3}: P2 が「ゴールドを渡す」`);
  await press(B, `[data-gold-row] [data-give-to="${r.h1}"]`, `${L3}: ゴールドの相手`);
  await press(B, B.getByRole('button', { name: '渡す', exact: true }).last(), `${L3}: 確認の「渡す」（ゴールド）`);
  check(await tryUntil(async () => /から10Gを受け取りました/.test((await ui(A)).toast ?? ''), 5000), `${L3}: P1 に「〜から10Gを受け取りました」`);

  // ---- 4) 使う ----
  const L4 = '使う';
  const hp0 = (await game(A)).heroes.find((h) => h.id === r.h2).hp;
  await press(B, '[data-item-row="potion"] [data-row-use]', `${L4}: P2 が回復薬の「使う」`);
  await shot(B, `${L4}-open`);
  await press(B, `[data-use-to="${r.h2}"]`, `${L4}: 自分のキャラに使う`);
  check(await tryUntil(async () => (await game(A)).heroes.find((h) => h.id === r.h2).hp > hp0, 5000), `${L4}: HP が戻った`);
  check(/回復薬を使いました/.test((await ui(B)).toast ?? ''), `${L4}: 「〜に回復薬を使いました」（${(await ui(B)).toast}）`);
  check((await B.locator('[data-sheet="party"]').count()) > 0, `${L4}: 使った後もシートは開いたまま`);
  await closeSheet(B, 'party', L4);

  // ---- 5) イベントの投票の待ち・挑む段 ----
  const L5 = 'イベントの投票の待ち';
  const g = await game(A);
  const x = g.expeditions[0];
  x.heroes = [r.h1, r.h2];
  x.mode = 'event';
  x.event = { eventId: 'fallenTree', roomId: x.dungeon.rooms[0].id };
  delete x.vote;
  delete x.battle;
  delete x.reward;
  await r.inject(g);
  await until(async () => (await game(A))?.expeditions?.[0]?.mode === 'event', 8000, 'event');
  await press(A, '[data-event-option="0"]', `${L5}: P1 が選択肢を選ぶ`);
  check(await tryUntil(async () => await B.locator('[data-vote-status]').isVisible(), 4000), `${L5}: P2 の画面に待ちの枠`);
  await openCloseWhileWaiting(r, L5);
  check(await B.locator('[data-event-option="0"]').count() > 0, `${L5}: 閉じた後もイベントの選択肢が残る`);
  // 票を入れた P1 が、道具袋で回復薬を使って戻る → 自分の票はそのまま
  await usePotionVia(A, r.h1, `${L5}・P1`);
  check((await A.locator('[data-my-vote="1"][data-event-option="0"]').count()) > 0, `${L5}: P1 の画面で、自分の票（✓選択中）がそのまま`);
  check((await game(A))?.expeditions?.[0]?.vote?.picks?.P1?.optionIndex === 0, `${L5}: 部屋の状態でも P1 の票がそのまま`);
  await press(B, '[data-event-option="0"]', `${L5}: P2 も同じ選択肢（画面のボタン）`);
  const L6 = '挑む段';
  check(await tryUntil(async () => !!(await game(A))?.expeditions?.[0]?.event?.decided, 6000), `${L6}: 挑む段に進む`);
  await openCloseWhileWaiting(r, L6);
  // 挑む役の持ち主が、フォーカスを1つ決めてから道具袋で回復薬を使って戻る → フォーカスの指定はそのまま
  {
    const owner = (await A.locator('[data-challenge-mine="1"]').count()) ? A : B;
    const ownerHero = await owner.locator('[data-challenge]').getAttribute('data-challenge-hero');
    await press(owner, owner.getByRole('button', { name: 'フォーカスを増やす' }), `${L6}: 挑む役の人がフォーカス+1`);
    const focusText = async () => (await owner.locator('[data-challenge]').innerText()).match(/フォーカス \d+ → \d+/)?.[0];
    const before = await focusText();
    const usable = (await game(owner)).heroes.find((h) => h.id === ownerHero).pouch.some((x) => x.itemId === 'potion');
    if (usable) await usePotionVia(owner, ownerHero, `${L6}・挑む役`);
    else {
      await press(owner, barButton(owner, '道具'), `${L6}: 「道具」`);
      await closeSheet(owner, 'pouch', L6);
    }
    const after = await focusText();
    check(!!before && before === after, `${L6}: 道具袋から戻ってもフォーカスの指定がそのまま（${before} / ${after}）`);
    check(!!(await game(A))?.expeditions?.[0]?.event?.decided, `${L6}: 挑む段のまま`);
    await shot(owner, `${L6}-after-pouch`);
  }
  summary.done = true;
} catch (e) {
  console.log('ERROR', e);
  problems.push(String(e).split('\n')[0]);
}
await browser.close();
writeFileSync(`${OUT}/summary.json`, JSON.stringify({ height: H, problems }, null, 2));
console.log(problems.length ? `\n失敗 ${problems.length}件:\n${problems.join('\n')}` : '\nすべて成功');
process.exit(problems.length ? 1 : 0);
