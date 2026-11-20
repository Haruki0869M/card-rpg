// 2026-11-15 の実機の不具合（2人オンライン・同行して入った「幸運の祠」で、P2 が先に祈って出た後、
// P1 の「世界マップへ」が「〜さんが選んでいます」の覆い（TurnLock）の下に隠れて押せず、お互いに待って止まった）の確認と、
// 同じ種類の穴の洗い出し（オーナーの決定 A）。
// 2人以上（別のプレイヤーのキャラ）が同行して一緒に入る場面を、P1・P2 の画面のボタンで最後まで押して進める:
//   祠（P2 が先に祈って出る → P1 が出る／P1 が先に祈る／手番が P2）・町・神殿（祭壇も同じ画面）・マスのイベント（薬草の群生地・温泉）・
//   マスの宝箱・遭遇・災厄の中ボス・見晴らしの塔・ランダムダンジョン／鍵のダンジョンの入口（鍵あり・なし）・野営・同行の解除・合流（誘う）・
//   1人で入った祠（ほかの人は覆いのまま）・1台で2人（祠・町・神殿・マスのイベント）・漂流物の洞の奥の山（片方が先に選ぶ。ONLY=flotsam）。
// 見る事: 押したいボタンが画面の中にあり、上にほかの層（覆いなど）が乗っていない（elementFromPoint）・押せる（disabled でない）。
//         片方が先に終わって待つ形で、残った人が押して進められる（お互いに待って止まらない）。最後に世界マップへ戻る。
// エミュレーター（demo-card-rpg）だけを使う（URL の ?emu=）。本番の Firebase には書かない（URL に本番の名前があれば止まる）。
// 使い方: URL=http://127.0.0.1:4194/card-rpg/ node scripts/coop-facilities.mjs   （HEIGHTS=844,540・ONLY=shrine,town のように絞れる）
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, URL } from './lib.mjs';

const EMU = process.env.EMU_HOST ?? '127.0.0.1';
const OUT = process.env.COOP_FACILITIES_OUTPUT ?? 'screenshots/coop-facilities';
const HEIGHTS = (process.env.HEIGHTS ?? '844,540').split(',').map(Number);
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
if (/firebaseio|web\.app|firebaseapp|card-rpg-1aa60/.test(URL + EMU)) throw new Error('本番には書きません（URL を確かめてください）');
if (!/^(127\.0\.0\.1|localhost)$/.test(EMU)) throw new Error('エミュレーターは手元（127.0.0.1）だけ');
mkdirSync(OUT, { recursive: true });
const problems = [];
const results = [];
let H = HEIGHTS[0];
const check = (ok, what) => {
  console.log(`${ok ? 'OK ' : 'NG '} [${H}] ${what}`);
  if (!ok) problems.push(`[${H}] ${what}`);
  return ok;
};
const note = (s) => console.log(`   ・[${H}] ${s}`);
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
const modeOf = (p) => api(p, () => window.__online?.mode()).catch(() => undefined);
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
    problems.push(`[${H}][${name}] pageerror ${e.message}`);
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

/** ボタンが押せるか（画面の中・真ん中に別の層が乗っていない・disabled でない）。押せる時だけ押す */
async function hitOf(p, loc) {
  const b = typeof loc === 'string' ? p.locator(loc).first() : loc.first();
  if (!(await b.count())) return { exists: false };
  await b.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
  const h = await b.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    const covered = !(top && (top === el || el.contains(top)));
    const lock = !!top?.closest?.('[data-turn-lock]');
    return { inView: y >= 0 && y <= innerHeight, covered, lock, by: covered && top ? `${top.tagName}.${String(top.className).slice(0, 40)}` : '', enabled: !el.disabled, text: el.innerText.replace(/\s+/g, ' ').slice(0, 30) };
  });
  return { exists: true, b, ...h };
}
async function press(p, loc, what, { click = true } = {}) {
  const h = await hitOf(p, loc);
  if (!h.exists) return check(false, `${what}: ボタンが無い`);
  const ok = h.inView && !h.covered && h.enabled;
  check(ok, `${what}: 押せる${h.covered ? `（上に ${h.lock ? '覆い data-turn-lock' : h.by}）` : ''}${h.enabled ? '' : '（disabled）'}${h.inView ? '' : '（画面の外）'}`);
  if (ok && click) {
    await h.b.click();
    await wait(600);
  }
  return ok;
}
const bothMode = (r, m) => tryUntil(async () => (await Promise.all([r.A, r.B].map(modeOf))).every((x) => x === m), 10000);

async function setupRoom() {
  const a = await newPage('P1');
  const b = await newPage('P2');
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
  await until(async () => (await Promise.all([A, B].map(modeOf))).every((m) => m === 'world'), 20000, 'world');
  await wait(500);
  for (const p of [A, B]) await closeStory(p);
  const g0 = await game(A);
  const h1 = g0.heroes.find((h) => h.playerId === 'P1').id;
  const h2 = g0.heroes.find((h) => h.playerId === 'P2').id;
  const r = { a, b, A, B, g0, h1, h2 };
  r.page = (pid) => (pid === 'P1' ? A : B);
  r.hero = (pid) => (pid === 'P1' ? h1 : h2);
  r.inject = async (g) => {
    const err = await api(A, (g) => window.__online.inject(g), g);
    if (err) throw new Error(err);
    await api(B, () => window.__online.resync()).catch(() => {});
    await wait(900);
    for (const p of [A, B]) await closeStory(p);
  };
  return r;
}

/** 平らな陸のマス（施設なし・海や山でない）。from から離れた所 */
const plainTile = (w, from, far = 4) =>
  w.tiles.findIndex((t, i) => !t.f && t.t !== 'sea' && t.t !== 'mountain' && Math.abs((i % w.width) - (from % w.width)) + Math.abs(Math.floor(i / w.width) - Math.floor(from / w.width)) >= far);
/** 隣のマス（施設なし・陸） */
function neighbor(w, from) {
  const W = w.width;
  const col = from % W, row = Math.floor(from / W);
  const dirs = row & 1 ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
  return dirs.map(([dc, dr]) => (row + dr) * W + col + dc).find((i) => i >= 0 && i < w.tiles.length && !w.tiles[i].f && w.tiles[i].t !== 'sea' && w.tiles[i].t !== 'mountain');
}

/**
 * 世界マップの状態を作る。leader の手番。together なら2人とも at にいて、follower は leader に同行
 * set(g, w) で施設などを足す
 */
function worldState(r, { at, leader = 'P1', together = true, follow = together }) {
  const g = structuredClone(r.g0);
  const w = g.world;
  const L = r.hero(leader), F = r.hero(leader === 'P1' ? 'P2' : 'P1');
  w.story = undefined;
  w.wanderers = [];
  w.spawns = [];
  w.visitedRegions = Array.from({ length: 300 }, (_, i) => i);
  for (const h of g.heroes) {
    w.pos[h.id] = at;
    h.lastRandomEvent = w.worldTurn;
    h.hp = Math.max(h.hp, 10);
  }
  if (!together) w.pos[F] = plainTile(w, at);
  w.follow = follow ? { [F]: L } : {};
  w.turn = L;
  w.acted = [];
  w.move = null;
  w.moveDice = undefined;
  w.moveProposal = undefined;
  w.invites = undefined;
  g.mode = 'world';
  for (const k of ['town', 'shrine', 'sanctuary', 'event', 'chest', 'encounter', 'party']) delete g[k];
  return { g, w, L, F };
}
const tileOf = (w, pred) => w.tiles.findIndex((t) => t.f && pred(t.f));

/** 施設（町・祠・神殿）に入る: 手番の人が画面の「〜に入る」「祠で祈る」を押す */
async function enterBy(r, leader, mode, label) {
  const P = r.page(leader);
  await P.locator('[data-interact]').first().waitFor({ timeout: 8000 }).catch(() => {});
  await press(P, '[data-interact]', `${label}: ${leader} が「${(await hitOf(P, '[data-interact]')).text ?? ''}」`);
  return check(await bothMode(r, mode), `${label}: 2台とも ${mode} の画面になった`);
}

/** 町・祠・神殿の「世界マップへ」: first が先に押し、その後 second が押す。お互いに待って止まらない事 */
async function exitInOrder(r, first, second, label) {
  const P = r.page(first), Q = r.page(second);
  await press(P, '[data-facility-exit="go"]', `${label}: ${first} が先に「世界マップへ」`);
  check(await tryUntil(async () => (await P.locator('[data-facility-exit="wait"]').count()) > 0, 4000), `${label}: ${first} は「仲間の利用終了を待っています」`);
  const waitNote = await P.locator('[data-wait-notes]').innerText().catch(() => '');
  check(/まだ.+を利用しています/.test(waitNote), `${label}: ${first} の画面に、だれを待っているか（${waitNote.replace(/\s+/g, ' ')}）`);
  await shot(P, `${label}-${first}-waiting`);
  await shot(Q, `${label}-${second}-left`);
  const lockOnQ = (await Q.locator('[data-turn-lock]').count()) > 0;
  const ok = await press(Q, '[data-facility-exit="go"]', `${label}: 残った ${second} が「世界マップへ」（覆いの下でない）`);
  if (!ok) check(false, `${label}: お互いに待って止まった（${second} の覆い=${lockOnQ}）`);
  check(await bothMode(r, 'world'), `${label}: 2台とも世界マップへ戻った`);
}

// ---------------- 場面 ----------------

const SCENES = {};

/** 祠（同行あり）。prayer が祈り、firstOut が先に出る */
async function shrineTogether(r, { leader, prayer, firstOut, label }) {
  const { g, w } = worldState(r, { at: 0, leader });
  const t = tileOf(w, (f) => f.kind === 'shrine');
  if (t < 0) return note(`${label}: 祠が地図に無い（飛ばす）`);
  w.tiles[t].f.used = false;
  for (const h of g.heroes) w.pos[h.id] = t;
  await r.inject(g);
  if (!(await enterBy(r, leader, 'shrine', label))) return;
  const other = prayer === 'P1' ? 'P2' : 'P1';
  // 2人で入った祠: どちらの画面にも覆いが出ない
  for (const pid of ['P1', 'P2']) check((await r.page(pid).locator('[data-turn-lock]').count()) === 0, `${label}: ${pid} の画面に「〜さんが選んでいます」の覆いが無い`);
  await shot(r.page(other), `${label}-${other}-before`);
  // 祈る（先に押した人）
  await press(r.page(prayer), '[data-shrine-option="0"]', `${label}: ${prayer} が祈る（1つ目の恵み）`);
  check(await tryUntil(async () => !!(await game(r.A))?.shrine?.result, 5000), `${label}: 祈った（部屋の状態）`);
  // ほかの人の画面: 選択肢が消えて結果の文
  const Q = r.page(other);
  check(await tryUntil(async () => (await Q.locator('[data-shrine-result]').count()) > 0 && (await Q.locator('[data-shrine-option]').count()) === 0, 5000), `${label}: ${other} の画面は選択肢が消えて結果の文が出る`);
  await exitInOrder(r, firstOut, firstOut === 'P1' ? 'P2' : 'P1', label);
  results.push({ scene: label, ok: true });
}
SCENES.shrine = async (r) => {
  // オーナーの実機の形: 手番（マスを踏んだ）= P1、P2 が先に祈って先に出る → P1 が出る
  await shrineTogether(r, { leader: 'P1', prayer: 'P2', firstOut: 'P2', label: '祠-実機の形（手番P1・P2が祈って先に出る）' });
  await shrineTogether(r, { leader: 'P1', prayer: 'P1', firstOut: 'P1', label: '祠-P1が祈って先に出る' });
  await shrineTogether(r, { leader: 'P2', prayer: 'P1', firstOut: 'P2', label: '祠-手番P2・P1が祈る・P2が先に出る' });
  // 1人で入った祠（P2 は離れた所）: P2 の画面は今までどおり覆い。P1 が祈って出る
  {
    const label = '祠-1人で入る（P2は別の所）';
    const { g, w } = worldState(r, { at: 0, leader: 'P1', together: false });
    const t = tileOf(w, (f) => f.kind === 'shrine');
    w.tiles[t].f.used = false;
    w.pos[r.h1] = t;
    await r.inject(g);
    if (await enterBy(r, 'P1', 'shrine', label)) {
      check(await tryUntil(async () => (await r.B.locator('[data-turn-lock]').count()) > 0, 3000), `${label}: P2 の画面は今までどおり覆い（P2 が押す物は無い）`);
      check((await r.A.locator('[data-turn-lock]').count()) === 0, `${label}: P1 の画面に覆いが無い`);
      await press(r.A, '[data-shrine-option="0"]', `${label}: P1 が祈る`);
      await press(r.A, '[data-facility-exit="go"]', `${label}: P1 が「世界マップへ」`);
      check(await bothMode(r, 'world'), `${label}: 世界マップへ戻った`);
    }
  }
};

async function placeTogether(r, { kind, mode, leader, firstOut, label }) {
  const { g, w } = worldState(r, { at: 0, leader });
  const t = tileOf(w, (f) => f.kind === kind && !(kind === 'town' && w.fallenTowns.includes(f.id)));
  if (t < 0) return note(`${label}: ${kind} が地図に無い（飛ばす）`);
  for (const h of g.heroes) w.pos[h.id] = t;
  await r.inject(g);
  if (!(await enterBy(r, leader, mode, label))) return;
  for (const pid of ['P1', 'P2']) check((await r.page(pid).locator('[data-turn-lock]').count()) === 0, `${label}: ${pid} の画面に覆いが無い`);
  await exitInOrder(r, firstOut, firstOut === 'P1' ? 'P2' : 'P1', label);
}
SCENES.town = async (r) => {
  await placeTogether(r, { kind: 'town', mode: 'town', leader: 'P1', firstOut: 'P2', label: '町-手番P1・P2が先に出る' });
  await placeTogether(r, { kind: 'town', mode: 'town', leader: 'P2', firstOut: 'P2', label: '町-手番P2・P2が先に出る' });
};
SCENES.sanctuary = async (r) => {
  await placeTogether(r, { kind: 'temple', mode: 'sanctuary', leader: 'P1', firstOut: 'P2', label: '神殿-手番P1・P2が先に出る' });
  await placeTogether(r, { kind: 'altar', mode: 'sanctuary', leader: 'P2', firstOut: 'P1', label: '祭壇-手番P2・P1が先に出る' });
};

/** マスのイベント（手番の人だけが選ぶ。ほかの人は覆い・装備と道具の帯は覆いの上） */
async function tileEvent(r, { eventId, leader, label }) {
  const { g, w } = worldState(r, { at: 0, leader });
  const t = plainTile(w, 0, 0);
  w.tiles[t].f = { kind: 'event', id: eventId };
  for (const h of g.heroes) w.pos[h.id] = t;
  await r.inject(g);
  if (!(await enterBy(r, leader, 'event', label))) return;
  const other = leader === 'P1' ? 'P2' : 'P1';
  const P = r.page(leader), Q = r.page(other);
  check((await P.locator('[data-turn-lock]').count()) === 0, `${label}: 手番の ${leader} の画面に覆いが無い`);
  check(await tryUntil(async () => (await Q.locator('[data-turn-lock]').count()) > 0, 3000), `${label}: ${other} の画面は覆い（押す物は無い・手番の人が選ぶ）`);
  // ほかの人の装備・道具の帯は、覆いの上に出て押せる
  await press(Q, '[data-dungeon-bar] [data-bar-button="道具"]', `${label}: ${other} の「道具」`, { click: false });
  await shot(Q, `${label}-${other}`);
  // 手番の人が、選べる選択肢を押す（判定つきなら「挑戦する」）→ 先へ進む
  const opts = P.locator('[data-event-option]:not([disabled])');
  await opts.first().waitFor({ timeout: 6000 }).catch(() => {});
  await press(P, opts, `${label}: ${leader} が選択肢を選ぶ`);
  const go = P.getByRole('button', { name: '挑戦する' });
  if (await go.count()) await press(P, go, `${label}: ${leader} が「挑戦する」`);
  const fin = P.locator('[data-event-panel] button.btn-gold');
  check(await tryUntil(async () => (await fin.count()) > 0, 6000), `${label}: 結果が出た`);
  // ほかの人の画面にも結果
  check(await tryUntil(async () => !!(await game(Q))?.event?.result, 5000), `${label}: ${other} の画面にも結果`);
  const battle = /戦闘/.test(await fin.first().innerText());
  await press(P, fin, `${label}: ${leader} が「${battle ? '戦闘を始める' : '先へ進む'}」`);
  const end = battle ? 'battle' : 'world';
  check(await tryUntil(async () => (await Promise.all([r.A, r.B].map(modeOf))).every((m) => m === end || m === 'world'), 8000), `${label}: 2台とも ${end} へ進んだ`);
}
SCENES.event = async (r) => {
  await tileEvent(r, { eventId: 'herbField', leader: 'P1', label: '薬草の群生地-手番P1' });
  await tileEvent(r, { eventId: 'hotSpring', leader: 'P2', label: '温泉-手番P2' });
};

/** マスの宝箱（2人: 開け役の投票 → 開ける → 取り合い → 手番の人が先へ進む） */
async function tileChest(r, { leader, label }) {
  const { g, w, L } = worldState(r, { at: 0, leader });
  const t = plainTile(w, 0, 0);
  w.tiles[t].f = { kind: 'chest', chest: { rarity: 'rare', locked: false } };
  for (const h of g.heroes) w.pos[h.id] = t;
  await r.inject(g);
  if (!(await enterBy(r, leader, 'chest', label))) return;
  for (const pid of ['P1', 'P2']) check((await r.page(pid).locator('[data-turn-lock]').count()) === 0, `${label}: ${pid} の画面に覆いが無い`);
  const voted = new Set();
  for (let i = 0; i < 40; i++) {
    const m = await modeOf(r.A);
    if (m !== 'chest') break;
    let did = false;
    for (const pid of ['P1', 'P2']) {
      const P = r.page(pid);
      const c = (await game(P))?.chest;
      if (!c) continue;
      const skip = P.getByRole('button', { name: /タップで結果まで飛ばす/ });
      if (await skip.count()) { await press(P, skip, `${label}: ${pid} 演出を飛ばす`); did = true; continue; }
      if (!c.contents && !c.opener && !voted.has(pid) && (await P.locator(`[data-opener="${L}"] button`).count())) {
        await press(P, `[data-opener="${L}"] button`, `${label}: ${pid} が開け役に手番のキャラを選ぶ`);
        voted.add(pid); did = true; continue;
      }
      if (!c.contents && c.opener && (await P.locator('[data-chest-open]').count())) { await press(P, '[data-chest-open]', `${label}: ${pid}（開け役）が開ける`); did = true; continue; }
      const pass = P.locator('[data-claim-area] button', { hasText: 'いらない' });
      if (await pass.count()) { await press(P, pass, `${label}: ${pid} が取り合いで「いらない」`); did = true; continue; }
      const relic = P.locator('[data-relic-pick] button, [data-relic] button');
      if (c.relics?.length && c.relicPicked === undefined && (await relic.count())) { await press(P, relic, `${label}: ${pid} が秘宝を選ぶ`); did = true; continue; }
      const fin = P.getByRole('button', { name: /^先へ進む/ });
      if (c.contents && !(c.claims ?? []).some((x) => !x.rolls) && (await fin.count())) { await press(P, fin, `${label}: ${pid} が「先へ進む」`); did = true; continue; }
    }
    if (!did) await wait(500);
    if (i === 39) check(false, `${label}: 宝箱が終わらない（止まった）`);
  }
  check(await bothMode(r, 'world'), `${label}: 2台とも世界マップへ戻った`);
}
SCENES.chest = async (r) => {
  await tileChest(r, { leader: 'P1', label: '宝箱-手番P1' });
  await tileChest(r, { leader: 'P2', label: '宝箱-手番P2' });
};

/** 遭遇（同行して隣のマスの魔物へ動く。同行の人は「一緒に行く」を画面で押す）→ 手番の人が「戦う」 */
async function encounter(r, { leader, label, scourge }) {
  const { g, w } = worldState(r, { at: 0, leader });
  // 出発のマス（coop-layers と同じ。隣へ動ける所）
  const from = r.g0.world.pos[r.h1];
  for (const h of g.heroes) w.pos[h.id] = from;
  const to = neighbor(w, from);
  w.tiles[to].seen = true;
  // 災厄の中ボス（強欲の盗賊王。シナリオ1の広い地図の災厄）は、地図の巣から隣のマスへ置き直す
  const src = scourge ? r.g0.world.wanderers.find((x) => x.scourge) : undefined;
  w.wanderers = [
    src
      ? { ...structuredClone(src), tile: to }
      : scourge
        ? { id: 'wsc', tile: to, scourge: 'greedKing', enemies: [{ defId: 'scourgeGreedKing', level: 3 }, { defId: 'banditThug', level: 2 }] }
        : { id: 'wcf', tile: to, enemies: [{ defId: 'forestWolf', level: 1 }] },
  ];
  w.move = 3;
  await r.inject(g);
  const other = leader === 'P1' ? 'P2' : 'P1';
  const P = r.page(leader), Q = r.page(other);
  const err = await api(P, (c) => window.__online.send(c), { type: 'WORLD_MOVE', playerId: leader, heroId: r.hero(leader), to, companions: [r.hero(other)] });
  if (err) return check(false, `${label}: 動けない（${err}）`);
  await wait(800);
  await press(Q, Q.locator('[data-move-proposal] button', { hasText: '一緒に行く' }), `${label}: ${other} が「一緒に行く」`);
  check(await bothMode(r, 'encounter'), `${label}: 2台とも遭遇の画面`);
  check((await Q.getByText(/でどうするか選んでいます/).count()) > 0, `${label}: ${other} の画面に「〜でどうするか選んでいます」`);
  if (scourge) check((await P.locator('[data-encounter-scourge]').count()) > 0, `${label}: 災厄の中ボスの説明が出る`);
  for (const pid of ['P1', 'P2']) check((await r.page(pid).locator('[data-turn-lock]').count()) === 0, `${label}: ${pid} の画面に覆いが無い`);
  await shot(Q, `${label}-${other}`);
  await press(P, P.getByRole('button', { name: /戦う/ }), `${label}: ${leader} が「戦う」`);
  check(await bothMode(r, 'battle'), `${label}: 2台とも戦闘へ`);
}
SCENES.encounter = async (r) => {
  await encounter(r, { leader: 'P1', label: '遭遇-手番P1' });
  await encounter(r, { leader: 'P2', label: '遭遇-手番P2' });
  await encounter(r, { leader: 'P1', label: '災厄の中ボス-手番P1', scourge: true });
};

/** 見晴らしの塔・ダンジョンの入口・野営・同行の解除・合流 */
SCENES.world = async (r) => {
  // 見晴らしの塔
  {
    const label = '見晴らしの塔-手番P2';
    const { g, w } = worldState(r, { at: 0, leader: 'P2' });
    const t = tileOf(w, (f) => f.kind === 'tower' && !f.used);
    if (t < 0) note(`${label}: 塔が無い（飛ばす）`);
    else {
      for (const h of g.heroes) w.pos[h.id] = t;
      await r.inject(g);
      await press(r.B, '[data-interact]', `${label}: P2 が「見晴らしの塔に登る」`);
      check(await bothMode(r, 'world'), `${label}: 世界マップのまま`);
      check(await tryUntil(async () => !!(await game(r.A)).world.tiles[t].f.used, 4000), `${label}: 登った`);
      await press(r.B, '[data-world-wait]', `${label}: P2 は続けて手番の操作ができる`, { click: false });
    }
  }
  // ダンジョンの入口（ランダムダンジョン・鍵のダンジョン 鍵あり／なし）
  for (const [label, pred, keys, leader, enters] of [
    ['ランダムダンジョンの入口-手番P1', (f) => f.kind === 'dungeon' && f.id === 'randomForest' && !f.used, [], 'P1', true],
    ['鍵のダンジョンの入口（鍵あり）-手番P2', (f) => f.kind === 'dungeon' && f.id === 'silentCatacomb', ['emerald'], 'P2', true],
    ['鍵のダンジョンの入口（鍵なし）-手番P1', (f) => f.kind === 'dungeon' && f.id === 'silentCatacomb', [], 'P1', false],
  ]) {
    const { g, w } = worldState(r, { at: 0, leader });
    const t = tileOf(w, pred);
    if (t < 0) { note(`${label}: 入口が無い（飛ばす）`); continue; }
    for (const h of g.heroes) w.pos[h.id] = t;
    w.keys = keys;
    await r.inject(g);
    const P = r.page(leader);
    await press(P, '[data-interact]', `${label}: ${leader} が入口のボタン`);
    if (enters) {
      check(await tryUntil(async () => (await game(r.A))?.expeditions?.[0]?.heroes?.length === 2, 8000), `${label}: 2人とも入った`);
      for (const pid of ['P1', 'P2']) {
        const Q = r.page(pid);
        await closeStory(Q);
        check(await tryUntil(async () => (await Q.locator('[data-door-choice]').count()) > 0, 8000), `${label}: ${pid} の画面に扉の選択`);
        await press(Q, '[data-door-choice]', `${label}: ${pid} の扉のボタン`, { click: false });
      }
    } else {
      check(await tryUntil(async () => (await P.locator('[data-gate-note]').count()) > 0, 3000), `${label}: 「扉が開かない…」の知らせ`);
      check(!(await game(r.A))?.expeditions?.length, `${label}: 入っていない`);
      await press(P, '[data-world-wait]', `${label}: ${leader} は続けて手番の操作ができる`, { click: false });
    }
  }
  // 野営（同行あり。手番の人）→ 次の手番の人が操作できる
  for (const leader of ['P1', 'P2']) {
    const label = `野営-手番${leader}`;
    const { g, w } = worldState(r, { at: 0, leader });
    const t = plainTile(w, 0, 0);
    for (const h of g.heroes) w.pos[h.id] = t;
    await r.inject(g);
    await press(r.page(leader), '[data-camp]', `${label}: ${leader} が「野営」`);
    await wait(800);
    for (const p of [r.A, r.B]) await closeStory(p);
    const g1 = await game(r.A);
    if (g1.mode === 'encounter') { note(`${label}: 夜襲（遭遇へ）`); continue; }
    check(g1.mode === 'world', `${label}: 世界マップのまま（${g1.mode}）`);
    const turnOwner = g1.heroes.find((h) => h.id === g1.world.turn)?.playerId;
    if (turnOwner) await press(r.page(turnOwner), '[data-world-wait], [data-roll-move]', `${label}: 次の手番（${turnOwner}）が操作できる`, { click: false });
  }
  // 同行の解除 → 合流（誘う → 誘われた人が画面の「一緒に行く」）
  for (const leader of ['P1', 'P2']) {
    const label = `同行の解除と合流-手番${leader}`;
    const other = leader === 'P1' ? 'P2' : 'P1';
    const { g, w } = worldState(r, { at: 0, leader });
    const t = plainTile(w, 0, 0);
    for (const h of g.heroes) w.pos[h.id] = t;
    await r.inject(g);
    const P = r.page(leader), Q = r.page(other);
    await press(P, '[data-unfollow]', `${label}: ${leader} が「同行を解除して単独行動する」`);
    check(await tryUntil(async () => !Object.keys((await game(r.A)).world.follow ?? {}).length, 4000), `${label}: 同行が解けた`);
    const otherName = g.heroes.find((h) => h.id === r.hero(other)).name;
    await press(P, P.getByRole('button', { name: `${otherName}を誘う` }), `${label}: ${leader} が ${otherName} を誘う`);
    const yes = Q.locator('[data-online-overlay] button', { hasText: '一緒に行く' });
    check(await tryUntil(async () => (await yes.count()) > 0, 4000), `${label}: ${other} の画面に誘いの知らせ`);
    await press(Q, yes, `${label}: ${other} が「一緒に行く」`);
    check(await tryUntil(async () => (await game(r.A)).world.follow?.[r.hero(other)] === r.hero(leader), 4000), `${label}: また同行になった`);
    await press(P, '[data-world-wait], [data-roll-move]', `${label}: ${leader} は続けて手番の操作ができる`, { click: false });
  }
};

/**
 * 漂流物の洞の奥の山（2026-11-16 シナリオ3の作り直し・点検 B4）: 2人で同行して入り、山の扉の前まで進めた状態を差し込み、山に入る。
 * 2台とも自分の3択が出る → first が先に選ぶ → first は待たずに次の扉（ボス）が押せる・残った人の3択は覆いの下でなく押せる → 残った人が選ぶ。
 * テーマはシナリオ3だけの物だが、確かめたいのは画面と命令なので、シナリオ1のランダムダンジョンの入口に漂流物の洞を付けて入る
 */
async function flotsamPile(r, { first, label }) {
  const { g, w } = worldState(r, { at: 0, leader: 'P1' });
  const t = tileOf(w, (f) => f.kind === 'dungeon' && f.id === 'randomForest');
  if (t < 0) return note(`${label}: ランダムダンジョンの入口が無い（飛ばす）`);
  w.tiles[t].f.used = false;
  w.tiles[t].f.theme = 'flotsamCave';
  for (const h of g.heroes) w.pos[h.id] = t;
  await r.inject(g);
  await press(r.A, '[data-interact]', `${label}: P1 が入口のボタン`);
  if (!check(await tryUntil(async () => (await game(r.A))?.expeditions?.[0]?.heroes?.length === 2, 8000), `${label}: 2人とも入った`)) return;
  for (const p of [r.A, r.B]) await closeStory(p);
  const g1 = await game(r.A);
  check(g1.expeditions[0].dungeon.theme === 'flotsamCave', `${label}: テーマは漂流物の洞`);
  const g2 = await api(r.A, (x) => window.__online.beforeRoom(x, 0, 'flotsamPile'), g1);
  if (!g2) return check(false, `${label}: 漂流物の山の部屋が無い`);
  const pile = g2.expeditions[0].dungeon.rooms.find((x) => x.type === 'flotsamPile').id;
  await r.inject(g2);
  // 扉を開ける（2人の場面はみんなで決めるので、2台とも同じ扉を押す）
  for (const pid of ['P1', 'P2']) {
    const P = r.page(pid);
    if ((await game(r.A)).heroes.some((h) => h.flotsam?.length)) break;
    const door = P.locator(`[data-door-choice="${pile}"]`);
    if (await tryUntil(async () => (await door.count()) > 0, 5000)) await press(P, door, `${label}: ${pid} が漂流物の山の扉`);
  }
  check(await tryUntil(async () => (await game(r.A)).heroes.every((h) => h.flotsam?.length === 3), 8000), `${label}: 2人とも候補が3つ配られた`);
  for (const p of [r.A, r.B]) {
    const skip = p.locator('[data-door-open]');
    if (await skip.count()) await skip.first().click().catch(() => {});
  }
  const second = first === 'P1' ? 'P2' : 'P1';
  const P = r.page(first), Q = r.page(second);
  for (const pid of ['P1', 'P2']) {
    const X = r.page(pid);
    check(await tryUntil(async () => (await X.locator('[data-flotsam-options="3"]').count()) > 0, 5000), `${label}: ${pid} の画面に3択`);
    check((await X.locator('[data-flotsam-pouch]').count()) > 0, `${label}: ${pid} の画面に袋の空き`);
    await shot(X, `${label}-${pid}-flotsam`);
  }
  await press(P, '[data-flotsam-pick="0"]', `${label}: ${first} が先に1つ選ぶ`);
  check(await tryUntil(async () => !(await game(r.A)).heroes.find((h) => h.id === r.hero(first)).flotsam, 5000), `${label}: ${first} の分が選ばれた`);
  check(!!(await game(r.A)).heroes.find((h) => h.id === r.hero(second)).flotsam, `${label}: ${second} の分は残っている`);
  // 先に選んだ人は待たない: 次の扉（ボス）のボタンが押せる所にある
  check(await tryUntil(async () => (await P.locator('[data-door-choice]').count()) > 0, 5000), `${label}: ${first} の画面に次の扉`);
  await press(P, '[data-door-choice]', `${label}: ${first} の次の扉（押さない）`, { click: false });
  await shot(P, `${label}-${first}-after`);
  // 残った人の3択は、覆いの下でなく押せる
  await press(Q, '[data-flotsam-pick="1"]', `${label}: 残った ${second} が選ぶ`);
  check(await tryUntil(async () => (await game(r.A)).heroes.every((h) => !h.flotsam), 5000), `${label}: 2人とも選び終えた`);
  check(await tryUntil(async () => (await Q.locator('[data-door-choice]').count()) > 0, 5000), `${label}: ${second} の画面にも次の扉（止まらない）`);
}
SCENES.flotsam = async (r) => {
  await flotsamPile(r, { first: 'P1', label: '漂流物の山-P1が先に選ぶ' });
  await flotsamPile(r, { first: 'P2', label: '漂流物の山-P2が先に選ぶ' });
};

// ---------------- 1台で2人 ----------------
async function local() {
  const H0 = H;
  const { ctx, page: p } = await newPage('1台');
  const edit = async (fn, arg) => {
    await p.evaluate(({ src, arg }) => {
      const k = 'card-rpg/adventure';
      const d = JSON.parse(localStorage.getItem(k));
      (0, eval)(src)(d, arg);
      localStorage.setItem(k, JSON.stringify(d));
    }, { src: fn.toString(), arg });
    await p.reload();
    await p.getByText('つづきから').click();
    await wait(900);
    await closeStory(p);
  };
  await p.goto(`${URL}?debug=1`);
  await p.getByText('新しい冒険').click();
  await p.getByText('2人', { exact: true }).click();
  await p.getByText('キャラクター作成へ').click();
  await p.getByText('冒険に出発').click();
  const ask = p.getByRole('dialog', { name: 'このまま出発しますか？' });
  if (await ask.waitFor({ timeout: 800 }).then(() => true, () => false)) await ask.getByText('出発する', { exact: true }).click();
  await wait(800);
  await closeStory(p);
  const mode = () => api(p, () => window.__online?.full()?.mode);
  const prep = (d, { kind, eventId }) => {
    const g = d.game;
    const w = g.world;
    let t = w.tiles.findIndex((x) => x.f && x.f.kind === kind && !(kind === 'town' && w.fallenTowns.includes(x.f.id)));
    if (kind === 'event') {
      t = w.tiles.findIndex((x) => !x.f && x.t !== 'sea' && x.t !== 'mountain');
      w.tiles[t].f = { kind: 'event', id: eventId };
    }
    if (w.tiles[t].f) w.tiles[t].f.used = false;
    const [a, b] = g.heroes;
    b.playerId = 'P2';
    for (const h of g.heroes) {
      w.pos[h.id] = t;
      h.lastRandomEvent = w.worldTurn;
    }
    w.follow = { [b.id]: a.id };
    w.turn = a.id;
    w.acted = [];
    w.move = null;
    w.story = undefined;
    w.wanderers = [];
    w.spawns = [];
    w.visitedRegions = Array.from({ length: 300 }, (_, i) => i);
    g.mode = 'world';
  };
  for (const [kind, m, eventId] of [['shrine', 'shrine'], ['town', 'town'], ['temple', 'sanctuary'], ['event', 'event', 'herbField']]) {
    const label = `1台で2人-${kind}`;
    await edit(prep, { kind, eventId });
    await press(p, '[data-interact]', `${label}: 「${(await hitOf(p, '[data-interact]')).text ?? ''}」`);
    check(await tryUntil(async () => (await mode()) === m, 5000), `${label}: ${m} の画面`);
    check((await p.locator('[data-turn-lock]').count()) === 0, `${label}: 覆いが無い`);
    if (m === 'shrine') {
      await press(p, '[data-shrine-option="0"]', `${label}: 祈る`);
      check((await p.locator('[data-shrine-result]').count()) > 0, `${label}: 結果の文`);
    }
    if (m === 'event') {
      await press(p, p.locator('[data-event-option]:not([disabled])'), `${label}: 選択肢`);
      const go = p.getByRole('button', { name: '挑戦する' });
      if (await go.count()) await press(p, go, `${label}: 挑戦する`);
      await press(p, p.locator('[data-event-panel] button.btn-gold'), `${label}: 先へ進む`);
    } else await press(p, '[data-facility-exit="go"]', `${label}: 「世界マップへ」（2人分まとめて）`);
    check(await tryUntil(async () => ['world', 'battle'].includes(await mode()), 5000), `${label}: 世界マップへ戻った`);
  }
  await ctx.close();
  H = H0;
}

for (const h of HEIGHTS) {
  H = h;
  console.log(`\n===== 390×${H} =====`);
  let r;
  try {
    r = await setupRoom();
    for (const [name, fn] of Object.entries(SCENES)) {
      if (ONLY && !ONLY.includes(name)) continue;
      console.log(`\n--- ${name} ---`);
      try {
        await fn(r);
      } catch (e) {
        console.log('ERROR', e);
        problems.push(`[${H}] ${name}: ${String(e).split('\n')[0]}`);
      }
    }
    if (!ONLY || ONLY.includes('local')) {
      console.log('\n--- 1台で2人 ---');
      await local().catch((e) => problems.push(`[${H}] local: ${String(e).split('\n')[0]}`));
    }
  } catch (e) {
    console.log('ERROR', e);
    problems.push(`[${H}] ${String(e).split('\n')[0]}`);
  }
  await r?.a.ctx.close().catch(() => {});
  await r?.b.ctx.close().catch(() => {});
}
await browser.close();
writeFileSync(`${OUT}/summary.json`, JSON.stringify({ heights: HEIGHTS, problems, results }, null, 2));
console.log(problems.length ? `\n失敗 ${problems.length}件:\n${problems.join('\n')}` : '\nすべて成功');
process.exit(problems.length ? 1 : 0);
