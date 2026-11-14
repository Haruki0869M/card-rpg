// 回3（2人プレイの不具合）の確認: エミュレーターで2台（A = P1・部屋を作った人＝最初のホスト、B = P2）。
//   PHASE=A  戦利品の取り合い・カード報酬・レベルアップの待ち（だれが何をしているか）
//   PHASE=B  P2 が道具袋で「自分に」「仲間に」回復薬を使う（世界マップ・ダンジョンの中・戦闘の中）＋ 1台で2人（P2 のキャラ）
//   PHASE=C  ホストが閉じる・読み込み直す・裏で止まる（凍結）・閉じて戻る／P2 が閉じて戻る × 世界マップ・戦闘・ダンジョンの扉・宝箱
//   PHASE=D  タイトルの「前の部屋に戻る」（部屋がある時・無い時）
// PHASE は「A,B」のように複数書ける（既定は全部）。C だけは CASES=world:close,battle:freeze のように絞れる。
// 状態は、エミュレーターの時だけ読み込む確認用の口（src/dev/onlineDebug.ts）で差し込む。本番の Firebase には書かない。
// 使い方: URL=http://127.0.0.1:4188/card-rpg/ WIDTH=390 node scripts/coop-r3.mjs（WIDTH を 360 にしてもう1回）
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, URL } from './lib.mjs';

const EMU = process.env.EMU_HOST ?? '127.0.0.1';
const WIDTH = Number(process.env.WIDTH ?? 390);
const HEIGHT = WIDTH <= 360 ? 640 : 844;
const OUT = process.env.COOP_R3_OUTPUT ?? 'screenshots/coop-r3';
const PHASES = (process.env.PHASE ?? 'A,B,C,D').split(',');
const TAG = process.env.TAG ?? 'after';
mkdirSync(OUT, { recursive: true });
const problems = [];
const notes = [];
const check = (ok, what) => {
  console.log(`${ok ? 'OK ' : 'NG '} ${what}`);
  if (!ok) problems.push(what);
};
const note = (s) => {
  console.log(`   ・${s}`);
  notes.push(s);
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
const shot = (page, name) => page.screenshot({ path: `${OUT}/${TAG}-${WIDTH}-${name}.png` }).catch(() => {});
const base = (extra = '') => `${URL}?emu=${EMU}${extra}`;

const browser = await chromium.launch();
async function newCtx() {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('card-rpg/settings')) localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false }));
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
const api = (p, fn, arg) => p.evaluate(fn, arg);
const game = (p) => api(p, () => window.__online?.game());
const seq = (p) => api(p, () => window.__online?.seq() ?? -1).catch(() => -1);
const isHost = (p) => api(p, () => !!window.__online?.isHost()).catch(() => false);
const closeStory = async (p) => {
  for (let i = 0; i < 5 && (await p.getByText('タップで続ける').count()); i++) {
    await p.getByText('タップで続ける').first().click().catch(() => {});
    await wait(250);
  }
};
const text = async (p, sel) => ((await p.locator(sel).first().innerText({ timeout: 1500 }).catch(() => '')) || '').replace(/\n+/g, ' ');

/** 部屋を作って2人で始める。A = P1（ホスト）、B = P2 */
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
    await api(other, () => window.__online.resync()).catch(() => {});
    await wait(800);
    for (const p of [r.A, r.B]) await closeStory(p);
  };
  r.send = async (page, cmd) => {
    const err = await api(page, (c) => window.__online.send(c), cmd);
    if (err) throw new Error(`${JSON.stringify(cmd).slice(0, 80)}: ${err}`);
    await wait(500);
  };
  r.close = async () => {
    await ctxA.close().catch(() => {});
    await ctxB.close().catch(() => {});
  };
  return r;
}

/** 2人を同じマスに置く（P2 は P1 に同行） */
function atPlace(r, kind, id) {
  const g = structuredClone(r.g0);
  const w = g.world;
  const t = w.tiles.findIndex((x) => x.f && x.f.kind === kind && (!id || x.f.id === id));
  if (t < 0) throw new Error(`no ${kind}`);
  for (const h of g.heroes) {
    w.pos[h.id] = t;
    h.gold = 999;
    h.lastRandomEvent = w.worldTurn;
  }
  w.follow = { [r.h2]: r.h1 };
  w.turn = r.h1;
  w.move = 4;
  w.story = undefined;
  w.wanderers = [];
  w.visitedRegions = Array.from({ length: 200 }, (_, i) => i);
  return g;
}

/** 2人で翠の神殿に入る */
async function enterDungeon(r) {
  await r.inject(atPlace(r, 'dungeon', 'emeraldTemple'));
  await r.send(r.A, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: r.h1 });
  await until(async () => !!(await game(r.A))?.expeditions?.[0]?.dungeon, 10000, 'enter dungeon');
  for (const p of [r.A, r.B]) await closeStory(p);
}

/** 世界マップで、2人一緒に敵とぶつかって戦闘を始める（P1 が動き、P2 は同行して同意） */
async function worldBattle(r) {
  const g = structuredClone(r.g0);
  const w = g.world;
  const from = w.pos[r.h1];
  // 隣の歩けるマス（施設なし）に敵を置く
  const W = w.width;
  const col = from % W, row = Math.floor(from / W);
  const odd = row & 1;
  const dirs = odd ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
  const to = dirs.map(([dc, dr]) => (row + dr) * W + col + dc).find((i) => i >= 0 && i < w.tiles.length && !w.tiles[i].f && w.tiles[i].t !== 'sea' && w.tiles[i].t !== 'mountain');
  for (const h of g.heroes) {
    w.pos[h.id] = from;
    h.lastRandomEvent = w.worldTurn;
  }
  w.tiles[to].seen = true;
  w.wanderers = [{ id: 'wr3', tile: to, enemies: [{ defId: w.wanderers[0]?.enemies[0]?.defId ?? 'slime', level: 1 }] }];
  w.follow = { [r.h2]: r.h1 };
  w.turn = r.h1;
  w.move = 3;
  w.story = undefined;
  w.visitedRegions = Array.from({ length: 200 }, (_, i) => i);
  await r.inject(g);
  await r.send(r.A, { type: 'WORLD_MOVE', playerId: 'P1', heroId: r.h1, to, companions: [r.h2] });
  await r.send(r.B, { type: 'WORLD_MOVE_AGREE', playerId: 'P2', accept: true });
  await until(async () => (await game(r.A)).mode === 'encounter', 8000, 'encounter');
  await r.send(r.A, { type: 'ENCOUNTER_CHOOSE', playerId: 'P1', heroId: r.h1, choice: 'fight', participants: [r.h1, r.h2], focusUsed: 0 });
  await until(async () => (await game(r.A)).mode === 'battle', 8000, 'battle');
  await wait(1500);
}

const summary = { A: [], B: [], C: [], D: [] };

/** カード報酬の1枚目を押して、説明の窓の「このカードを選ぶ」で決める（めくれる前なら、もう一度押す） */
async function pickCard(p) {
  const btn = p.getByRole('button', { name: 'このカードを選ぶ' });
  for (let i = 0; i < 4 && !(await btn.count()); i++) {
    await p.locator('[data-pick-card]').first().click().catch(() => {});
    await wait(500);
  }
  await btn.click().catch(() => {});
  await wait(1200);
}

// =====================================================================
// A: 戦利品の取り合いと、カード報酬・レベルアップの待ち
// =====================================================================
async function phaseA() {
  console.log('\n===== A: 取り合いとカード報酬 =====');
  const r = await setupRoom();
  const { A, B, h1, h2 } = r;
  const g = structuredClone(r.g0);
  const itemId = 'ironArmor';
  const cards = (await game(A)).heroes.map((h) => h.deck.slice(0, 3).map((c) => c.cardId));
  g.mode = 'reward';
  g.party = [h1, h2];
  g.battleInfo = { roomType: 'elite', tile: g.world.pos[h1] };
  g.world.story = undefined;
  g.reward = {
    gold: 40,
    exp: [h1, h2].map((id) => ({ heroId: id, gained: 30, fromLevel: 1, toLevel: id === h2 ? 2 : 1, fromExp: 0, toExp: 5 })),
    // P2 のキャラだけレベルアップ（実機と同じく、P2 が自分の分を選んでいる間に P1 が待つ形）
    levelUps: [{ heroId: h2, level: 2, options: [{ kind: 'stat', stat: 'str', amount: 1 }, { kind: 'maxHp', amount: 5 }, { kind: 'focusMax', amount: 1 }] }],
    cardOffers: [...cards[0].map((cardId) => ({ cardId, heroId: h1 })), ...cards[1].map((cardId) => ({ cardId, heroId: h2 }))],
    cardOdds: [80, 18, 2],
    cardDone: [],
    cardPicked: false,
    loot: [],
    claim: { item: { uid: 'r3claim', itemId }, heroes: [h1, h2], choices: {} },
  };
  await r.inject(g);
  await wait(1200);
  await shot(A, 'A1-start-P1');
  await shot(B, 'A1-start-P2');
  const lvA = await A.getByText('レベルアップ！').count();
  const lvB = await B.getByText('レベルアップ！').count();
  note(`始め: P1 の画面に P2 のレベルアップの窓が ${lvA ? '出る' : '出ない'}／P2 の画面に ${lvB ? '出る' : '出ない'}`);
  const cardsA = await A.locator('[data-pick-card]').count();
  note(`始め: P1 の画面のカード報酬 ${cardsA}枚・取り合いの窓 ${await A.locator('[data-claim]').count()}`);
  note(`始め: P1 の下の文「${await text(A, '[data-wait-notes]')}」`);
  summary.A.push({ step: '始め', P1: { levelUpOverlay: !!lvA, cards: cardsA, waitNotes: await text(A, '[data-wait-notes]') }, P2: { levelUpOverlay: !!lvB } });

  // P1: 自分の分（取り合い → カード）を先に済ませられるか
  const greed = A.locator('[data-claim] button', { hasText: '余れば' });
  if (await greed.count()) {
    await greed.first().click();
    await wait(800);
  }
  if (cardsA) await pickCard(A);
  const g1 = await game(A);
  const p1Done = g1.reward?.claim?.choices?.[h1] === 'greed' && g1.reward?.cardDone?.includes(h1);
  check(p1Done, 'P1 は、P2 がレベルアップを選んでいる間に、自分の取り合いの返事とカードを済ませられる');
  await shot(A, 'A2-P1-waiting');
  const waitA = await text(A, '[data-wait-notes]');
  note(`P1 が自分の分を済ませた後の、P1 の下の文「${waitA || (await text(A, '.shrink-0 .rounded-xl'))}」`);
  check(/ナツさんが、.*レベルアップの成長を選んでいます/.test(waitA), 'P1 に「ナツさんが、〇〇のレベルアップの成長を選んでいます」と出る');
  summary.A.push({ step: 'P1 が自分の分を済ませた', P1: { done: p1Done, waitNotes: waitA } });

  // P2: レベルアップ → 取り合いの窓がカードより上に出る → 取り合い → カード
  await B.getByText('レベルアップ！').waitFor({ timeout: 5000 }).catch(() => {});
  await B.locator('.absolute.inset-0 button').first().click().catch(() => {});
  await wait(1200);
  await shot(B, 'A3-P2-after-levelup');
  const claimBox = await B.locator('[data-claim]').first().boundingBox().catch(() => null);
  const cardBox = await B.locator('[data-pick-card]').first().boundingBox().catch(() => null);
  check(!!claimBox && !!cardBox && claimBox.y < cardBox.y, 'P2: 自分の取り合いの返事がまだの時は、取り合いの窓がカードより上に出る');
  const waitA2 = await text(A, '[data-wait-notes]');
  note(`P2 がレベルアップを選んだ後の、P1 の下の文「${waitA2}」`);
  check(/カードを選んでいます/.test(waitA2) && /欲しいか選んでいます/.test(waitA2), 'P1 に、P2 がカードと取り合いを選んでいる事が出る');
  await shot(A, 'A4-P1-waiting-cards');
  await B.locator('[data-claim] button', { hasText: '欲しい' }).first().click();
  await wait(1000);
  const waitA3 = await text(A, '[data-wait-notes]');
  note(`P2 が取り合いに答えた後の、P1 の下の文「${waitA3}」`);
  await shot(A, 'A5-P1-claim-done');
  await pickCard(B);
  const fin = await A.getByRole('button', { name: /先へ進む/ }).count();
  check(fin > 0, '2人とも選び終えたら、P1 に「先へ進む」が出る');
  await shot(A, 'A6-P1-finish');
  summary.A.push({ step: 'P2 がレベルアップを選んだ後', P1: { waitNotes: waitA2 } }, { step: 'P2 が取り合いに答えた後', P1: { waitNotes: waitA3 } });
  await r.close();
}

// =====================================================================
// B: P2 が道具袋で回復薬を使う
// =====================================================================
async function pouchTry(r, page, where, user, target, label) {
  // 使う前の HP・袋
  const before = await game(r.A);
  const hpOf = (g, id) => {
    const scene = g.expeditions?.[0];
    const b = (scene?.battle ?? g.battle);
    const a = b?.allies?.find((x) => x.id === id);
    return a ? a.hp : g.heroes.find((h) => h.id === id).hp;
  };
  const bag = (g) => g.heroes.find((h) => h.id === user).pouch.length;
  const hp0 = hpOf(before, target);
  const n0 = bag(before);
  await api(page, () => window.__online.openSheet('pouch'));
  await wait(500);
  const title = await text(page, '.font-display >> nth=0');
  await page.locator('[data-pouch-item="potion"]').first().click();
  await wait(400);
  await shot(page, `B-${where}-${label}-targets`);
  const tName = before.heroes.find((h) => h.id === target).name;
  const btn = page.locator('button', { hasText: tName }).filter({ hasText: 'HP' });
  const nBtn = await btn.count();
  const disabled = nBtn ? await btn.first().isDisabled() : true;
  if (nBtn && !disabled) await btn.first().click();
  await wait(1500);
  const after = await game(r.A);
  const afterB = await game(r.B);
  const ui = await api(page, () => window.__online.ui());
  const res = {
    where,
    label,
    targetButtons: nBtn,
    disabled,
    hpBefore: hp0,
    hpAfter: hpOf(after, target),
    hpOnOther: hpOf(afterB, target),
    bagBefore: n0,
    bagAfter: bag(after),
    sheetClosed: ui.sheet === null,
    toast: ui.toast,
  };
  const ok = res.hpAfter > res.hpBefore && res.bagAfter === n0 - 1 && res.hpOnOther === res.hpAfter && res.sheetClosed;
  check(ok, `B ${where}: P2 が${label}に回復薬（HP ${hp0}→${res.hpAfter}・相手の画面 ${res.hpOnOther}・袋 ${n0}→${res.bagAfter}・画面が閉じた ${res.sheetClosed}・お知らせ「${res.toast}」）`);
  summary.B.push({ ...res, ok });
  if (!res.sheetClosed) await api(page, () => window.__online.openSheet(null));
  return res;
}

async function phaseB() {
  console.log('\n===== B: P2 の道具袋 =====');
  const r = await setupRoom();
  const { A, B, h1, h2 } = r;
  const prep = (g) => {
    for (const h of g.heroes) {
      h.hp = Math.max(5, Math.floor(h.hp / 3));
      h.pouch = [1, 2, 3, 4].map((k) => ({ uid: `pot${h.id}${k}${Date.now() % 1000}`, itemId: 'potion' }));
    }
    return g;
  };
  // 世界マップ（P1 の番・P2 の番）
  for (const turn of [h1, h2]) {
    const g = prep(atPlace(r, 'landmark'));
    g.world.turn = turn;
    g.world.follow = undefined;
    await r.inject(g);
    const t = turn === h1 ? 'P1の番' : 'P2の番';
    await pouchTry(r, B, `世界マップ（${t}）`, h2, h2, '自分');
    await pouchTry(r, B, `世界マップ（${t}）`, h2, h1, '仲間（P1）');
  }
  // 実機に近い形: P1 だけ先にダンジョンへ、P2 は入口（世界マップ）。P2 の袋の「誰に使う？」に P1 が出るか
  {
    const g = prep(atPlace(r, 'dungeon', 'emeraldTemple'));
    g.world.follow = undefined;
    await r.inject(g);
    await r.send(A, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: h1 });
    await until(async () => !!(await game(A))?.expeditions?.[0], 10000, 'P1 entered');
    for (const p of [A, B]) await closeStory(p);
    await api(B, () => window.__online.openSheet('pouch'));
    await wait(500);
    await B.locator('[data-pouch-item="potion"]').first().click();
    await wait(300);
    const p1Name = (await game(A)).heroes.find((h) => h.id === h1).name;
    const listed = await B.locator('button', { hasText: p1Name }).filter({ hasText: 'HP' }).count();
    await shot(B, 'B-entrance-targets-P2');
    let toast = null;
    if (listed) {
      await B.locator('button', { hasText: p1Name }).filter({ hasText: 'HP' }).first().click();
      await wait(1000);
      toast = (await api(B, () => window.__online.ui())).toast;
    }
    note(`オンライン・入口の P2 の袋: ダンジョンの中の P1 が ${listed ? `出る（押すと「${toast}」）` : '出ない'}`);
    check(!listed, 'オンライン: 入口の P2 の袋の「誰に使う？」に、ダンジョンの中の P1 のキャラは出ない');
    summary.B.push({ where: 'オンライン・入口（P1 はダンジョンの中）', listedP1: !!listed, toast });
    await api(B, () => window.__online.openSheet(null));
  }
  // ダンジョンの中（戦闘の外）
  await enterDungeon(r);
  {
    const g = prep(await game(A));
    await r.inject(g);
  }
  await pouchTry(r, B, 'ダンジョン（戦闘の外）', h2, h2, '自分');
  await pouchTry(r, B, 'ダンジョン（戦闘の外）', h2, h1, '仲間（P1）');
  // ダンジョンの中の戦闘: 部屋を戦闘にする
  {
    const g = await game(A);
    const x = g.expeditions[0];
    // 扉の先の部屋を、bot の流れで開ける（2人の投票）
    for (let i = 0; i < 30 && x.mode !== 'battle'; i++) {
      const gg = await game(A);
      if (gg.expeditions?.[0]?.mode === 'battle') break;
      const cmd = await api(A, () => window.__online.next());
      if (!cmd) break;
      const inner = cmd.type === 'SCENE' ? cmd.command : cmd;
      const who = inner.type === 'BATTLE' ? inner.command.playerId : inner.playerId;
      const page = who === 'P2' ? B : A;
      await api(page, (c) => window.__online.send(c), cmd);
      await wait(700);
      for (const p of [A, B]) await closeStory(p);
    }
  }
  const gb = await game(A);
  if (gb.expeditions?.[0]?.mode === 'battle') {
    const x = gb.expeditions[0];
    for (const a of x.battle.allies) a.hp = Math.max(5, Math.floor(a.maxHp / 3));
    for (const h of gb.heroes) h.pouch = [1, 2, 3].map((k) => ({ uid: `potb${h.id}${k}`, itemId: 'potion' }));
    x.battle.phase = 'ally';
    await r.inject(gb);
    await wait(800);
    // P2 の操作中のキャラが P2 のキャラになっているか
    const ui = await api(B, () => window.__online.ui());
    note(`ダンジョンの戦闘: P2 の画面の操作中のキャラ = ${ui.activeId}（P2 のキャラ ${h2}）`);
    await pouchTry(r, B, 'ダンジョンの戦闘', h2, h2, '自分');
    await pouchTry(r, B, 'ダンジョンの戦闘', h2, h1, '仲間（P1）');
  } else note(`ダンジョンの戦闘に入れなかった（mode=${gb.expeditions?.[0]?.mode}）。世界マップの戦闘で試す`);
  await r.close();
  // 世界マップの戦闘
  const r2 = await setupRoom();
  await worldBattle(r2);
  {
    const g = await game(r2.A);
    for (const a of g.battle.allies) a.hp = Math.max(5, Math.floor(a.maxHp / 3));
    for (const h of g.heroes) h.pouch = [1, 2, 3].map((k) => ({ uid: `potw${h.id}${k}`, itemId: 'potion' }));
    await r2.inject(g);
  }
  const ui = await api(r2.B, () => window.__online.ui());
  note(`世界マップの戦闘: P2 の画面の操作中のキャラ = ${ui.activeId}（P2 のキャラ ${r2.h2}）`);
  await pouchTry(r2, r2.B, '世界マップの戦闘', r2.h2, r2.h2, '自分');
  await pouchTry(r2, r2.B, '世界マップの戦闘', r2.h2, r2.h1, '仲間（P1）');
  await r2.close();
}

// ---- 1台で2人（2人目のキャラは P2 の担当）----
async function phaseBLocal() {
  console.log('\n===== B: 1台で2人（P2 のキャラ） =====');
  const ctx = await newCtx();
  const p = await pageOf(ctx, 'L');
  const L = `${URL}?debug=1`;
  const edit = async (fn, arg) => {
    await p.evaluate(
      ({ src, arg }) => {
        const k = 'card-rpg/adventure';
        const d = JSON.parse(localStorage.getItem(k));
        (0, eval)(src)(d, arg);
        localStorage.setItem(k, JSON.stringify(d));
      },
      { src: fn.toString(), arg },
    );
    await p.reload();
    await p.getByText('つづきから').click();
    await wait(800);
    await closeStory(p);
  };
  const full = () => api(p, () => window.__online.full());
  const hpOf = (g, id) => {
    const b = g.expeditions?.[0]?.battle ?? g.battle;
    const a = b?.allies?.find((x) => x.id === id);
    return a ? a.hp : g.heroes.find((h) => h.id === id).hp;
  };
  async function tryLocal(where, target, label, pickOwner) {
    const g0 = await full();
    const user = g0.heroes[1].id;
    const hp0 = hpOf(g0, target);
    const n0 = g0.heroes[1].pouch.length;
    await api(p, () => window.__online.openSheet('pouch'));
    await wait(500);
    if (pickOwner) await p.locator('.mb-1.flex.gap-1 button', { hasText: g0.heroes[1].name }).first().click().catch(() => {});
    await wait(300);
    const title = await text(p, 'h2, .font-display');
    await p.locator('[data-pouch-item="potion"]').first().click();
    await wait(300);
    await shot(p, `BL-${where}-${label}`);
    await p.locator('button', { hasText: g0.heroes.find((h) => h.id === target).name }).filter({ hasText: 'HP' }).first().click().catch(() => {});
    await wait(1200);
    const g1 = await full();
    const ui = await api(p, () => window.__online.ui());
    const res = { where, label, owner: title, hpBefore: hp0, hpAfter: hpOf(g1, target), bagBefore: n0, bagAfter: g1.heroes[1].pouch.length, sheetClosed: ui.sheet === null, toast: ui.toast };
    const ok = res.hpAfter > hp0 && res.bagAfter === n0 - 1 && res.sheetClosed;
    check(ok, `B 1台で2人 ${where}: P2 のキャラが${label}に回復薬（HP ${hp0}→${res.hpAfter}・袋 ${n0}→${res.bagAfter}・お知らせ「${res.toast}」）`);
    summary.B.push({ local: true, ...res, ok });
    if (!res.sheetClosed) await api(p, () => window.__online.openSheet(null));
  }
  await p.goto(L);
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false }));
  });
  await p.reload();
  await p.getByText('新しい冒険').click();
  await p.getByText('2人', { exact: true }).click();
  await p.getByText('キャラクター作成へ').click();
  await p.getByText('冒険に出発').click();
  const ask = p.getByRole('dialog', { name: 'このまま出発しますか？' });
  if (await ask.waitFor({ timeout: 800 }).then(() => true, () => false)) await ask.getByText('出発する', { exact: true }).click();
  await wait(500);
  const prep = (d) => {
    const g = d.game;
    const w = g.world;
    const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
    for (const h of g.heroes) {
      w.pos[h.id] = t;
      h.hp = Math.max(5, Math.floor(h.hp / 3));
      h.pouch = [1, 2, 3, 4].map((k) => ({ uid: `lp${h.id}${k}`, itemId: 'potion' }));
      h.lastRandomEvent = w.worldTurn;
    }
    g.heroes[1].playerId = 'P2';
    w.story = undefined;
    w.turn = g.heroes[0].id;
  };
  await edit(prep);
  const g0 = await full();
  const [a, b] = g0.heroes.map((h) => h.id);
  await tryLocal('世界マップ（P1の番）', b, '自分', true);
  await tryLocal('世界マップ（P1の番）', a, '仲間（P1）', true);
  await p.getByText('翠の神殿に入る').click().catch(() => {});
  await wait(1000);
  await closeStory(p);
  const inDungeon = !!(await full()).expeditions?.[0];
  note(`1台で2人: P1 のキャラだけがダンジョンに入った = ${inDungeon && (await full()).expeditions[0].heroes.join() === a}`);
  // 実機に近い形: P1 のキャラはダンジョンの中、P2 のキャラは入口（世界マップ）。P2 の袋の「誰に使う？」に、ダンジョンの中の P1 が出るか
  {
    await api(p, () => window.__online.openSheet('pouch'));
    await wait(400);
    await p.locator('.mb-1.flex.gap-1 button', { hasText: g0.heroes[1].name }).first().click().catch(() => {});
    await p.locator('[data-pouch-item="potion"]').first().click();
    await wait(300);
    const listed = await p.locator('button', { hasText: g0.heroes[0].name }).filter({ hasText: 'HP' }).count();
    await shot(p, 'BL-entrance-targets');
    let toast = null;
    if (listed) {
      await p.locator('button', { hasText: g0.heroes[0].name }).filter({ hasText: 'HP' }).first().click();
      await wait(800);
      toast = (await api(p, () => window.__online.ui())).toast;
    }
    note(`入口の P2 の袋: ダンジョンの中の P1 が相手の一覧に ${listed ? `出る（押すと「${toast}」）` : '出ない'}`);
    check(!listed, '入口（世界マップ）の P2 の袋の「誰に使う？」に、ダンジョンの中の P1 のキャラは出ない');
    summary.B.push({ local: true, where: '入口（P1 はダンジョンの中）', listedP1: !!listed, toast });
    await api(p, () => window.__online.openSheet(null));
    // P2 のキャラも合流する
    await closeStory(p);
    await p.getByText('タップで始める').click().catch(() => {});
    await wait(500);
    await p.locator('[data-interact]').click().catch(() => {});
    await wait(1200);
    await closeStory(p);
    note(`P2 のキャラも合流した = ${(await full()).expeditions?.[0]?.heroes.length === 2}`);
  }
  if (inDungeon) {
    await tryLocal('ダンジョン（戦闘の外）', b, '自分', true);
    await tryLocal('ダンジョン（戦闘の外）', a, '仲間（P1）', true);
    // 戦闘: 最初の部屋の敵と戦う（保存を書き換えて、戦闘の場面にする）
    for (let i = 0; i < 6 && (await full()).expeditions?.[0]?.mode !== 'battle'; i++) {
      const door = p.locator('[data-door-choice]').first();
      if (await door.count()) await door.click().catch(() => {});
      await wait(800);
      const open = p.getByRole('button', { name: /開ける|進む|入る/ }).first();
      if (await open.count()) await open.click().catch(() => {});
      await wait(1200);
      await closeStory(p);
    }
    const gb = await full();
    if (gb.expeditions?.[0]?.mode === 'battle') {
      await edit((d) => {
        const x = d.game.expeditions[0];
        for (const al of x.battle.allies) {
          al.hp = Math.max(5, Math.floor(al.maxHp / 3));
          if (al.id === d.game.heroes[1].id) al.playerId = 'P2';
        }
        d.activeId = d.game.heroes[1].id;
        for (const h of d.game.heroes) h.pouch = [1, 2, 3].map((k) => ({ uid: `lb${h.id}${k}`, itemId: 'potion' }));
      });
      await tryLocal('ダンジョンの戦闘', b, '自分', false);
      await tryLocal('ダンジョンの戦闘', a, '仲間（P1）', false);
    } else note(`1台で2人: 戦闘に入れなかった（mode=${gb.expeditions?.[0]?.mode}）`);
  }
  await ctx.close();
}

// =====================================================================
// C: ホストが閉じた時
// =====================================================================
/** 場面を用意する。返り値: その場面で P2 が送れる自分の操作の作り方 */
async function prepWhere(r, where) {
  const { h1, h2 } = r;
  if (where === 'world') {
    const g = atPlace(r, 'landmark');
    g.world.follow = undefined;
    g.world.turn = h1;
    await r.inject(g);
  } else if (where === 'battle') {
    await worldBattle(r);
  } else if (where === 'enemy') {
    // 敵の番の途中: 2人とも「ターン終了」を押した直後に、ホストが閉じる
    await worldBattle(r);
    await api(r.B, (c) => window.__online.send(c), { type: 'BATTLE', command: { type: 'END_TURN', playerId: 'P2' } });
    await wait(600);
    await api(r.A, (c) => window.__online.send(c), { type: 'BATTLE', command: { type: 'END_TURN', playerId: 'P1' } });
    await until(async () => (await game(r.B)).battle?.phase === 'enemy', 8000, 'enemy phase');
    return;
  } else if (where === 'door') {
    await enterDungeon(r);
    const g = await game(r.A);
    g.world.turn = h1;
    await r.inject(g);
  } else if (where === 'chest') {
    const g = atPlace(r, 'landmark');
    const t = g.world.pos[h1];
    g.world.follow = undefined;
    g.mode = 'chest';
    g.chest = {
      tile: t,
      spec: { rarity: 'rare', locked: false },
      unlocked: true,
      opener: h1,
      contents: [
        { kind: 'item', item: { uid: 'c3a', itemId: 'ironArmor' } },
        { kind: 'item', item: { uid: 'c3b', itemId: 'potion' } },
      ],
      claims: [
        { item: { uid: 'c3a', itemId: 'ironArmor' }, heroes: [h1, h2], choices: {} },
        { item: { uid: 'c3b', itemId: 'potion' }, heroes: [h1, h2], choices: {} },
      ],
    };
    await r.inject(g);
  }
  await wait(600);
}

/** B（残った人）が、自分の席の操作・（ホストなら）代わりの操作で、何手進められるか */
async function driveFrom(p, other, steps, useProxy) {
  const s0 = await seq(p);
  let sent = 0;
  for (let i = 0; i < steps; i++) {
    const cmd = await api(p, () => window.__online.next()).catch(() => null);
    if (!cmd) break;
    const inner = cmd.type === 'SCENE' ? cmd.command : cmd;
    if (inner.type === 'BATTLE' && inner.command.type === 'ENEMY_STEP') {
      // 敵の行動はホストが自動で進める。少し待つ
      const before = await seq(p);
      await tryUntil(async () => (await seq(p)) > before, 6000, 'enemy');
      continue;
    }
    const who = inner.type === 'BATTLE' ? inner.command.playerId : inner.playerId;
    const mine = await api(p, (w) => !w || window.__online.myPlayers().includes(w), who);
    let sender = p;
    if (!mine) {
      if (other && (await api(other, (w) => window.__online?.myPlayers().includes(w), who).catch(() => false))) sender = other;
      else if (useProxy && (await isHost(p))) {
        await api(p, (w) => window.__online.setProxy(w, true), who);
        await wait(800);
      } else break;
    }
    const before = await seq(p);
    const err = await api(sender, (c) => window.__online.send(c), cmd).catch((e) => String(e));
    if (err) {
      await wait(500);
      continue;
    }
    sent++;
    const ok = await tryUntil(async () => (await seq(p)) > before, 6000, 'step');
    if (!ok) return { progressed: (await seq(p)) - s0, sent, stalled: true };
    for (const q of [p, other].filter(Boolean)) await closeStory(q).catch(() => {});
  }
  return { progressed: (await seq(p)) - s0, sent, stalled: false };
}

/** 残った P2 が「自分の操作」を1つ送って、部屋が受け付けるか（ホストが処理して番号が進むか）を見る */
async function probeP2(r, where) {
  const { B, h1, h2 } = r;
  let cmd;
  if (where === 'world') cmd = { type: 'GIVE', playerId: 'P2', fromHeroId: h2, toHeroId: h1, gold: 1 };
  else if (where === 'battle') cmd = { type: 'BATTLE', command: { type: 'END_TURN', playerId: 'P2' } };
  else if (where === 'chest') cmd = { type: 'CLAIM_LOOT', playerId: 'P2', heroId: h2, choice: 'greed', index: 0 };
  else {
    const n = await api(B, () => window.__online.next()).catch(() => null);
    const inner = n?.type === 'SCENE' ? n.command : n;
    if (inner?.type === 'VOTE') {
      const v = { ...inner, playerId: 'P2', command: inner.command ? { ...inner.command, playerId: 'P2' } : null };
      cmd = n.type === 'SCENE' ? { ...n, command: v } : v;
    } else cmd = n;
  }
  if (!cmd) return 'なし';
  const before = await seq(B);
  const err = await api(B, (c) => window.__online.send(c), cmd).catch((e) => String(e));
  if (err) return `送れない（${err}）`;
  const ok = await tryUntil(async () => (await seq(B)) > before, 10000, 'probe');
  return ok ? '受け付けた' : '10秒たっても進まない';
}

const overlayText = async (p) =>
  p
    .evaluate(() => [...document.querySelectorAll('[class*="z-[70]"]')].map((e) => e.innerText).join(' / ').replace(/\n+/g, ' '))
    .catch(() => '');

async function rejoin(ctx, name) {
  const p = await pageOf(ctx, name);
  await p.goto(base());
  await wait(800);
  const title = p.locator('[data-back-to-room]');
  let how = '';
  if (await title.count()) {
    how = 'タイトルの「前の部屋に戻る」';
    await title.click();
  } else {
    how = '「部屋に参加」の中の「前の部屋に戻る」';
    await p.getByText('部屋に参加').click();
    await p.getByRole('button', { name: /前の部屋/ }).click();
  }
  await tryUntil(async () => (await api(p, () => window.__online?.mode())) !== undefined && (await seq(p)) > 0, 15000, 'rejoined');
  return { p, how };
}

async function caseC(where, action) {
  const r = await setupRoom();
  const row = { where, action };
  try {
    await prepWhere(r, where);
    const s0 = await seq(r.A);
    const cdp = action === 'freeze' ? await r.ctxA.newCDPSession(r.A) : null;
    // ---- 起きる事 ----
    if (action === 'close' || action === 'closeReturn') await r.A.close();
    else if (action === 'reload') await r.A.reload();
    else if (action === 'freeze') {
      // スマホが眠った時に近い形: ページの JavaScript を止める（接続は残る）。
      // Page.setWebLifecycleState の frozen は、見えているページでは効かなかったので、デバッガーで止める
      await cdp.send('Debugger.enable');
      await cdp.send('Debugger.pause');
    }
    else if (action === 'p2CloseReturn') await r.B.close();
    // ---- 残った人 ----
    const stay = action === 'p2CloseReturn' ? r.A : r.B;
    const gone = action === 'p2CloseReturn' ? r.B : r.A;
    const t0 = Date.now();
    const tookOver = action === 'p2CloseReturn' ? true : await tryUntil(() => isHost(r.B), action === 'freeze' ? 60000 : 15000, 'takeover');
    row.tookOver = action === 'p2CloseReturn' ? '-' : tookOver ? `${Math.round((Date.now() - t0) / 1000)}秒で引き継いだ` : '引き継がない';
    // ホストの引き継ぎの直し（2026-11-14）: 止まってから「代わりに操作する」が画面の窓に出るまでの秒数（敵の番は除く）
    if (action !== 'p2CloseReturn' && where !== 'enemy') {
      const btn = stay.locator('[data-online-overlay]').getByRole('button', { name: '代わりに操作する', exact: true });
      const shown = await tryUntil(async () => (await btn.count()) > 0, 90000, 'proxy button');
      row.proxyButton = shown ? `${Math.round((Date.now() - t0) / 1000)}秒で出た` : '90秒まで出ない';
      check(shown && Date.now() - t0 <= 60000, `C ${where}/${action}: 止まってから60秒以内に「代わりに操作する」が出る（${row.proxyButton}）`);
    }
    await wait(2500);
    row.overlay = await overlayText(stay);
    if (where === 'enemy') {
      // だれも何もしなくても、敵の番が進んで味方の番に戻るか
      row.enemyContinues = await tryUntil(async () => (await game(stay))?.battle?.phase !== 'enemy', 15000, 'enemy continues');
    } else if (action !== 'p2CloseReturn') row.p2Own = await probeP2(r, where);
    await shot(stay, `C-${where}-${action}-stay`);
    // 残った人だけで進められるか（自分の操作 + ホストなら代わりの操作）
    const d = await driveFrom(stay, null, where === 'battle' ? 14 : 8, true);
    row.stayProgress = d.progressed;
    row.stayStalled = d.stalled;
    row.overlayAfter = await overlayText(stay);
    await shot(stay, `C-${where}-${action}-stay-after`);
    // ---- 戻る ----
    if (action === 'closeReturn' || action === 'p2CloseReturn' || action === 'reload' || action === 'freeze') {
      let back = gone;
      if (action === 'freeze') {
        await cdp.send('Debugger.resume');
        await cdp.send('Debugger.disable');
        await wait(3000);
      } else if (action === 'reload') {
        const rj = await rejoin(r.ctxA, 'A2').catch((e) => ({ err: String(e) }));
        await r.A.close().catch(() => {});
        back = rj.p;
        row.returnHow = rj.how ?? rj.err;
      } else {
        const rj = await rejoin(action === 'p2CloseReturn' ? r.ctxB : r.ctxA, 'R').catch((e) => ({ err: String(e) }));
        back = rj.p;
        row.returnHow = rj.how ?? rj.err;
      }
      if (back) {
        const caught = await tryUntil(async () => (await api(back, () => window.__online.hash())) === (await api(stay, () => window.__online.hash())), 15000, 'caught up');
        row.returnCaughtUp = caught;
        await shot(back, `C-${where}-${action}-back`);
        // 戻った人も操作できるか（2人で数手）
        const d2 = await driveFrom(stay, back, 6, true);
        row.bothProgress = d2.progressed;
        row.bothStalled = d2.stalled;
        row.backOverlay = await overlayText(back);
      }
    }
    row.seqStart = s0;
  } catch (e) {
    row.error = String(e).slice(0, 200);
  }
  console.log(JSON.stringify(row));
  summary.C.push(row);
  await r.close();
}

async function phaseC() {
  console.log('\n===== C: ホストが閉じた時 =====');
  const all = [];
  for (const w of ['world', 'battle', 'door', 'chest']) for (const a of ['close', 'reload', 'freeze', 'closeReturn', 'p2CloseReturn']) all.push(`${w}:${a}`);
  all.push('enemy:close', 'enemy:freeze');
  const list = process.env.CASES ? process.env.CASES.split(',') : all;
  for (const c of list) {
    const [w, a] = c.split(':');
    console.log(`--- ${w} / ${a}`);
    await caseC(w, a);
  }
}

// =====================================================================
// D: タイトルの「前の部屋に戻る」
// =====================================================================
async function phaseD() {
  console.log('\n===== D: タイトルの「前の部屋に戻る」 =====');
  const r = await setupRoom();
  await r.A.close();
  const p = await pageOf(r.ctxA, 'A2');
  await p.goto(base());
  await wait(1000);
  const btn = p.locator('[data-back-to-room]');
  check((await btn.count()) === 1, 'タイトルに「前の部屋（合言葉）に戻る」が出る');
  const label = await text(p, '[data-back-to-room]');
  check(label.includes(r.code), `ボタンに合言葉が出る（${label}）`);
  await shot(p, 'D1-title');
  await btn.click();
  const ok = await tryUntil(async () => (await api(p, () => window.__online?.mode())) === 'world', 15000, 'back in room');
  check(ok, '押すと、同じ部屋の冒険の続きに戻る');
  await shot(p, 'D2-back');
  summary.D.push({ label, back: ok });
  await r.close();
  // 部屋がもう無い時
  const ctx = await newCtx();
  const q = await pageOf(ctx, 'Q');
  await q.goto(base());
  await q.evaluate(() => localStorage.setItem('card-rpg/online', JSON.stringify({ code: 'ZZ99', name: 'ハル' })));
  await q.reload();
  await wait(800);
  await q.locator('[data-back-to-room]').click();
  await q.getByRole('alert').waitFor({ timeout: 10000 }).catch(() => {});
  const msg = await text(q, '[role="alert"]');
  check(/もうありません/.test(msg), `部屋が無い時は、分かる文で知らせる（${msg}）`);
  await shot(q, 'D3-missing');
  await q.reload();
  await wait(800);
  check((await q.locator('[data-back-to-room]').count()) === 0, '部屋が無かった後は、ボタンを出さない');
  summary.D.push({ missing: msg });
  await ctx.close();
}

try {
  if (PHASES.includes('A')) await phaseA();
  if (PHASES.includes('B')) await phaseB();
  if (PHASES.includes('B') || PHASES.includes('BL')) await phaseBLocal();
  if (PHASES.includes('C')) await phaseC();
  if (PHASES.includes('D')) await phaseD();
} catch (e) {
  console.log('ERROR', e);
  problems.push(String(e));
}
writeFileSync(`${OUT}/${TAG}-${WIDTH}-${PHASES.join('')}.json`, JSON.stringify({ summary, notes, problems }, null, 2));
await browser.close();
console.log(problems.length ? `\n問題 ${problems.length}件:\n- ${problems.join('\n- ')}` : '\nすべて OK');
process.exit(problems.length ? 1 : 0);
