// 点検 2026-11-13 F1 の確認: ホストが「代わりに操作」している席（P2）の番で、世界マップの場面の
// キャラを指さないボタン（宝箱の「先へ進む」・イベントの選択肢と「先へ進む」・遭遇の「世界マップへ」）を、
// 画面のボタンを押して進められるか。エミュレーターで2台（A = P1・ホスト、B = P2 → 途中で閉じる）。
// 状態は確認用の口（src/dev/onlineDebug.ts）で差し込む。本番の Firebase には書かない。
// 使い方: URL=http://127.0.0.1:4190/card-rpg/ node scripts/coop-proxy.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, URL } from './lib.mjs';

const EMU = process.env.EMU_HOST ?? '127.0.0.1';
const OUT = process.env.COOP_PROXY_OUTPUT ?? 'screenshots/coop-proxy';
const TAG = process.env.TAG ?? 'after';
mkdirSync(OUT, { recursive: true });
const problems = [];
const rows = [];
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
const shot = (page, name) => page.screenshot({ path: `${OUT}/${TAG}-${name}.png` }).catch(() => {});

const browser = await chromium.launch();
async function newCtx() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
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
async function closeStory(p) {
  for (let i = 0; i < 5; i++) {
    const b = p.getByRole('button', { name: 'つづける', exact: true });
    if (!(await b.count())) break;
    await b.first().click().catch(() => {});
    await wait(300);
  }
}

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
  return { ctxA, ctxB, A, B, g0, h1, h2 };
}

/** P2（h2）の番の世界マップ。h2 は kind の施設のマス、h1 は別のマス（同行しない） */
function p2Turn(r, kind, id) {
  const g = structuredClone(r.g0);
  const w = g.world;
  const t = w.tiles.findIndex((x) => x.f && x.f.kind === kind && (!id || x.f.id === id));
  const other = w.tiles.findIndex((x, i) => i !== t && x.f && x.f.kind === 'town');
  if (t < 0 || other < 0) throw new Error(`no ${kind}`);
  for (const h of g.heroes) {
    h.gold = 999;
    h.lastRandomEvent = w.worldTurn;
  }
  w.pos[r.h2] = t;
  w.pos[r.h1] = other;
  w.follow = {};
  w.turn = r.h2;
  w.acted = [r.h1];
  w.move = 0;
  w.story = undefined;
  delete w.storyQueue;
  w.wanderers = [];
  w.visitedRegions = Array.from({ length: 200 }, (_, i) => i);
  g.party = [r.h2];
  return { g, t };
}

async function inject(r, g) {
  const err = await api(r.A, (g) => window.__online.inject(g), g);
  if (err) throw new Error(err);
  await wait(1000);
  await closeStory(r.A);
}

/** 画面のボタンを押す（見つからなければ false） */
async function press(p, name) {
  const b = p.getByRole('button', { name }).first();
  if (!(await b.count())) return false;
  if (!(await b.isEnabled().catch(() => false))) return false;
  await b.click();
  return true;
}
const toast = (p) => api(p, () => window.__online.ui().toast).catch(() => null);

async function runCase(r, label, prep, steps, done) {
  const { g } = prep();
  await inject(r, g);
  const row = { case: label, proxy: (await api(r.A, () => window.__online.myPlayers())).join('+') };
  for (const [i, name] of steps.entries()) {
    const pressed = await press(r.A, name);
    row[`押した${i + 1}`] = pressed ? name : `${name}（ボタンなし）`;
    await wait(1200);
  }
  row.toast = await toast(r.A);
  row.progressed = await tryUntil(async () => done(await game(r.A)), 5000, label);
  row.mode = (await game(r.A))?.mode;
  await shot(r.A, `${label}-${row.proxy}`);
  console.log(JSON.stringify(row));
  rows.push(row);
  return row;
}

try {
  const r = await setupRoom();
  // 相方（P2）が閉じる。ホスト（A）は残る
  await r.B.close();
  await wait(1500);
  const cases = (h2) => [
    ['宝箱の先へ進む', () => {
      const x = p2Turn(r, 'landmark');
      x.g.mode = 'chest';
      x.g.chest = { tile: x.t, spec: { rarity: 'common', locked: false }, unlocked: true, opener: h2, grade: 'common', contents: [{ kind: 'gold', amount: 5 }] };
      return x;
    }, ['先へ進む'], (g) => g?.mode === 'world'],
    ['イベントの選択と先へ進む', () => {
      const x = p2Turn(r, 'landmark');
      x.g.mode = 'event';
      x.g.event = { eventId: 'rStrayBird', tile: x.t, random: true };
      return x;
    }, ['そっと見送る', '先へ進む'], (g) => g?.mode === 'world'],
    ['遭遇の判定の後の世界マップへ', () => {
      const x = p2Turn(r, 'landmark');
      x.g.mode = 'encounter';
      const wd = r.g0.world.wanderers?.[0];
      x.g.world.wanderers = wd ? [{ ...wd, id: 'w0', tile: x.t }] : [];
      x.g.encounter = { wandererId: 'w0', tile: x.t, heroId: h2, candidates: [h2], result: { choice: 'flee', heroId: h2, results: ['hit', 'hit', 'hit'], success: true } };
      return x;
    }, ['世界マップへ'], (g) => g?.mode === 'world'],
    ['町の世界マップへ（キャラ指定あり・比べる用）', () => {
      const x = p2Turn(r, 'town');
      const f = x.g.world.tiles[x.t].f;
      x.g.mode = 'town';
      x.g.town = { townId: f.id, heroId: h2, members: [h2] };
      return x;
    }, ['世界マップへ'], (g) => g?.mode === 'world'],
  ];
  // 1) 代わりの操作なし: P2 の番の場面は、ホストは進められない（今までどおり）
  console.log('\n===== 代わりの操作なし =====');
  for (const [label, prep, steps, done] of cases(r.h2)) {
    const row = await runCase(r, label, prep, steps, done);
    check(!row.progressed, `代わりの操作なし: ${label} はホストが進められない（今までどおり）`);
  }
  // 2) ホストが P2 を「代わりに操作」する
  await api(r.A, () => window.__online.setProxy('P2', true));
  await until(async () => (await api(r.A, () => window.__online.myPlayers())).includes('P2'), 10000, 'proxy on');
  console.log('\n===== ホストが P2 を代わりに操作 =====');
  for (const [label, prep, steps, done] of cases(r.h2)) {
    const row = await runCase(r, label, prep, steps, done);
    check(row.progressed, `代わりに操作: ${label} が画面のボタンで進む`);
  }
  await r.ctxA.close().catch(() => {});
  await r.ctxB.close().catch(() => {});
} catch (e) {
  console.log('ERROR', e);
  problems.push(String(e));
}
await browser.close();
writeFileSync(`${OUT}/${TAG}-summary.json`, JSON.stringify({ rows, problems }, null, 2));
console.log(problems.length ? `\n失敗 ${problems.length}件:\n${problems.join('\n')}` : '\nすべて成功');
process.exit(problems.length ? 1 : 0);
