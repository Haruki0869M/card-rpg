// 実機の不具合④(1)（2026-11-15）の確認: オンライン2台・390×540（HEIGHT で変えられる）。勝利画面の順番を、P2 の画面のボタンで確かめる。
//   P2 のレベルアップ（P1 は先に自分のカードを選べる）→ P2 の成長 → P2 のカード（説明を開いても「選ばない」と「このカードを選ぶ」が押せる）
//   → 2人ともカードが終わるまで取り合いは出ない（「〜さんが…選んでいます」）→ 取り合いが2台とも真ん中に出る → 2人が答える → 結果 → 先へ進む
//   切断: P2 が切れている間（代わりに操作なし）は、P1 に取り合いが出る（切断した人の分で、いつまでも出ない、を作らない）
// エミュレーター（demo-card-rpg）だけを使う（URL の ?emu=）。本番の Firebase には書かない。
// 使い方: URL=http://localhost:4197/card-rpg/ node scripts/coop-reward.mjs   （COOP_REWARD_OUTPUT で写真の場所）
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, URL } from './lib.mjs';

const EMU = process.env.EMU_HOST ?? '127.0.0.1';
const OUT = process.env.COOP_REWARD_OUTPUT ?? 'screenshots/coop-reward';
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
const shot = (page, name) => page.screenshot({ path: `${OUT}/${H}-${name}.png` }).catch(() => {});
const step = (p) => p.locator('[data-reward-step]').getAttribute('data-reward-step').catch(() => null);

const browser = await chromium.launch();
async function newPage(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('card-rpg/settings')) localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false, overviewHintSeen: true }));
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${name}] pageerror ${e.message}`));
  return page;
}
const closeStory = async (p) => {
  for (let i = 0; i < 5 && (await p.getByText('タップで続ける').count()); i++) {
    await p.getByText('タップで続ける').first().click().catch(() => {});
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
    return { inView: r.top >= 0 && r.bottom <= innerHeight + 1, covered: !(top && (top === el || el.contains(top))), by: top && !(top === el || el.contains(top)) ? String(top.className).slice(0, 50) : '' };
  });
  check(hit.inView && !hit.covered, `${what}: 押せる${hit.covered ? `（上に ${hit.by}）` : ''}${hit.inView ? '' : '（画面の外）'}`);
  if (click) {
    await b.click();
    await wait(600);
  }
  return true;
}

async function setupRoom() {
  const A = await newPage('A');
  const B = await newPage('B');
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
  return { A, B, g0, h1: g0.heroes.find((h) => h.playerId === 'P1').id, h2: g0.heroes.find((h) => h.playerId === 'P2').id };
}

/** 2人で翠の神殿に入り、勝利画面の途中の形を差し込む（P2 にレベルアップ・2人にカード3枚・鋼の剣の取り合い） */
async function injectReward(r) {
  const { A, B } = r;
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
  await api(A, (g) => window.__online.inject(g), g);
  await api(B, () => window.__online.resync()).catch(() => {});
  await wait(900);
  const err = await api(A, (c) => window.__online.send(c), { type: 'WORLD_INTERACT', playerId: 'P1', heroId: r.h1 });
  if (err) throw new Error(err);
  await until(async () => (await game(A))?.expeditions?.[0]?.heroes?.length === 2, 10000, 'enter dungeon');
  await wait(800);
  for (const p of [A, B]) await closeStory(p);
  const g2 = await game(A);
  const x = g2.expeditions[0];
  x.heroes = [r.h1, r.h2];
  x.mode = 'reward';
  delete x.battle;
  delete x.vote;
  x.reward = {
    gold: 12,
    exp: [r.h1, r.h2].map((heroId) => ({ heroId, gained: 14, fromLevel: 1, toLevel: heroId === r.h2 ? 2 : 1, fromExp: 0, toExp: 4 })),
    levelUps: [{ heroId: r.h2, level: 2, options: [{ kind: 'maxHp', amount: 5 }, { kind: 'focusMax', amount: 1 }] }],
    cardOffers: [r.h1, r.h2].flatMap((heroId) => ['lanceCharge', 'cmPrepare', 'warCry'].map((cardId) => ({ cardId, heroId }))),
    cardDone: [],
    cardOdds: [70, 25, 5],
    cardPicked: false,
    loot: [],
    claim: { item: { uid: 'claim-1', itemId: 'steelSword' }, heroes: [r.h1, r.h2], choices: {} },
  };
  await api(A, (g) => window.__online.inject(g), g2);
  await api(B, () => window.__online.resync()).catch(() => {});
  await until(async () => (await game(B))?.expeditions?.[0]?.mode === 'reward', 8000, 'reward');
  await wait(1200);
}

try {
  const r = await setupRoom();
  const { A, B } = r;
  await injectReward(r);
  const L = '報酬の順番';
  // P2: 自分のレベルアップが先頭 → 成長
  check((await step(B)) === 'growth', `${L}: P2 の画面は最初に成長（${await step(B)}）`);
  // P1: P2 の成長を待つ間も、自分のカードを選べる（取り合いはまだ出ない）
  check((await step(A)) === 'card', `${L}: P1 の画面は自分のカード（${await step(A)}）`);
  check(!(await A.locator('[data-claim-center]').count()) && (await A.locator('[data-claim-later]').count()) > 0, `${L}: P1 のカードの間は取り合いを出さず「全員が…選び終えたら…取り合いが出ます」`);
  await shot(B, '1-P2-growth');
  await shot(A, '1-P1-card');
  await press(B, B.getByRole('button', { name: /最大HP|HP/ }).first(), `${L}: P2 が成長を選ぶ`);
  check(await tryUntil(async () => (await step(B)) === 'card', 5000), `${L}: P2 は成長の後に自分のカード`);
  // P2: カードを押すと説明が開き、「このカードを選ぶ」と「選ばない」が押せる（取り合いに押し出されない）
  await press(B, '[data-pick-card="1"]', `${L}: P2 がカードを押す`);
  await press(B, '[data-card-pick-action]', `${L}: P2 の「このカードを選ぶ」`, { click: false });
  await press(B, '[data-reward-skip-card]', `${L}: P2 の「選ばない」`, { click: false });
  await shot(B, '2-P2-card-open');
  // P1 がカードを選ばない → P2 を待つ（「ナツさんが、〜の山札に加えるカードを選んでいます」）
  await press(A, '[data-reward-skip-card]', `${L}: P1 が「選ばない」`);
  check(await tryUntil(async () => (await step(A)) === 'wait', 5000), `${L}: P1 は P2 を待つ`);
  const note = await A.locator('[data-reward-bottom] [data-wait-notes]').innerText().catch(() => '');
  check(/ナツさんが、.+の山札に加えるカードを選んでいます/.test(note), `${L}: P1 の待ちの文「${note.replace(/\n/g, ' ')}」`);
  check(!(await A.locator('[data-claim-center]').count()), `${L}: P2 のカードが終わるまで、P1 にも取り合いは出ない`);
  await shot(A, '3-P1-wait');
  // P2 がカードを選ぶ → 2台とも取り合いが真ん中に
  await press(B, '[data-card-pick-action]', `${L}: P2 が「このカードを選ぶ」`);
  for (const [p, n] of [[A, 'P1'], [B, 'P2']]) check(await tryUntil(async () => (await p.locator('[data-claim-center]').count()) > 0, 6000), `${L}: ${n} の画面の真ん中に取り合い`);
  await shot(B, '4-P2-claim');
  await press(B, B.locator('[data-claim-center] button', { hasText: '欲しい' }), `${L}: P2 が「欲しい」`);
  check(await tryUntil(async () => (await step(B)) === 'wait', 5000), `${L}: P2 は答えた後 P1 を待つ`);
  const note2 = await B.locator('[data-reward-bottom] [data-wait-notes]').innerText().catch(() => '');
  check(/ハルさんが、.+で、戦利品（鋼の剣）を欲しいか選んでいます/.test(note2), `${L}: P2 の待ちの文「${note2.replace(/\n/g, ' ')}」`);
  await press(A, A.locator('[data-claim-center] button', { hasText: '余れば' }), `${L}: P1 が「余れば」`);
  check(await tryUntil(async () => !!(await game(A))?.expeditions?.[0]?.reward?.claim?.rolls, 5000), `${L}: 取り合いが決まった`);
  check(await tryUntil(async () => (await B.locator('[data-reward-finish]').count()) > 0, 5000), `${L}: P2 の画面に「先へ進む」`);
  await shot(B, '5-P2-done');
  await press(B, '[data-reward-finish]', `${L}: P2 の「先へ進む」`, { click: false });

  // ---- 切断: P2 が切れている間（代わりに操作なし）、P1 に取り合いが出る ----
  const L2 = '切断中';
  await injectReward(r);
  await api(B, () => window.__online.goOffline());
  await press(A, '[data-reward-skip-card]', `${L2}: P1 が「選ばない」`);
  const shown = await tryUntil(async () => (await A.locator('[data-claim-center]').count()) > 0, 20000);
  check(shown, `${L2}: P2 が切れている（成長・カードが残っている）間も、P1 には取り合いが出る`);
  await shot(A, '6-P1-claim-while-P2-offline');
  // 【提案】隠れている知らせの印: P1 がシートを開くと、通信の知らせ（ナツさんの通信が切れています）はシートの後ろ → 見出しに「お知らせ 1」
  const L3 = '隠れている知らせ';
  check(await tryUntil(async () => (await A.locator('[data-online-overlay] > *').count()) > 0, 20000), `${L3}: P1 の画面に通信の知らせ`);
  await api(A, () => window.__online.openSheet('party'));
  check(await tryUntil(async () => (await A.locator('[data-sheet="party"] [data-hidden-notice]').count()) > 0, 3000), `${L3}: シートの見出しに「お知らせ」の印`);
  await shot(A, '7-P1-sheet-notice');
  await press(A, '[data-sheet="party"] [data-hidden-notice]', `${L3}: 「お知らせ」を押す`);
  check(!(await A.locator('[data-sheet="party"]').count()), `${L3}: 押すとシートが閉じて、知らせが見える`);
  // 転職のカード選び: 同じ印。押すと畳んで知らせが見え、「〜の専用カード選びに戻る」で開き直す
  const g3 = await game(A);
  g3.heroes.find((h) => h.id === r.h1).jobPick = ['lanceCharge', 'cmPrepare', 'warCry'];
  await api(A, (g) => window.__online.inject(g), g3);
  check(await tryUntil(async () => (await A.locator('[data-job-pick] [data-hidden-notice]').count()) > 0, 5000), `${L3}: 転職のカード選びの上にも「お知らせ」の印`);
  await wait(600);
  await shot(A, '8-P1-jobpick-notice');
  await press(A, '[data-job-pick] [data-hidden-notice]', `${L3}: カード選びの「お知らせ」を押す`);
  check(!(await A.locator('[data-job-pick]').count()) && (await A.locator('[data-job-pick-peek] button').count()) > 0, `${L3}: カード選びが畳まれ、「専用カード選びに戻る」が出る`);
  await shot(A, '9-P1-jobpick-peek');
  await press(A, '[data-job-pick-peek] button', `${L3}: 「専用カード選びに戻る」`);
  check((await A.locator('[data-job-pick]').count()) > 0, `${L3}: カード選びに戻る（まだ決まっていない）`);
  await api(B, () => window.__online.goOnline());
  await wait(1500);
} catch (e) {
  console.log('ERROR', e);
  problems.push(String(e).split('\n')[0]);
}
await browser.close();
writeFileSync(`${OUT}/summary.json`, JSON.stringify({ height: H, problems }, null, 2));
console.log(problems.length ? `\n失敗 ${problems.length}件:\n${problems.join('\n')}` : '\nすべて成功');
process.exit(problems.length ? 1 : 0);
