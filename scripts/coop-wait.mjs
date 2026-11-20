// 実機の不具合③（2026-11-15）の確認: 「通信が切れています」の知らせが、一瞬の切断では出ず、本当に切れた時だけ約10秒で出る事。
// 見る事:
//   (1) 相方（P2）のページを3秒だけ切って戻す → P1 の画面に知らせが出ない
//   (2) 15秒切る → 約10秒（8〜14秒）で知らせが出る。戻るとすぐ（3秒以内に）消える
//   (3) ホストを3秒だけ切って戻す → ホストは代わらない
// 待っているのが P2 の時だけ知らせが出るので、世界マップの手番を P2 にしてから見る。
// エミュレーター（demo-card-rpg）だけを使う（URL の ?emu=）。本番の Firebase には書かない。
// 使い方: URL=http://127.0.0.1:4190/card-rpg/ node scripts/coop-wait.mjs
import { mkdirSync } from 'node:fs';
import { chromium, URL } from './lib.mjs';

const EMU = process.env.EMU_HOST ?? '127.0.0.1';
const OUT = process.env.COOP_WAIT_OUTPUT ?? 'screenshots/coop-wait';
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
const base = (extra = '') => `${URL}?emu=${EMU}${extra}`;
const api = (p, fn, arg) => p.evaluate(fn, arg);

const browser = await chromium.launch();
async function device(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('card-rpg/settings')) localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false, overviewHintSeen: true }));
  });
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

const A = await device('A');
const B = await device('B');
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

// 世界マップの手番を P2 にする（P1 の画面が P2 を待っている形）
const g = await api(A, () => window.__online.game());
g.world.story = undefined;
g.world.turn = g.heroes.find((h) => h.playerId === 'P2').id;
const err = await api(A, (x) => window.__online.inject(x), g);
if (err) throw new Error(err);
await api(B, () => window.__online.resync());
await wait(900);
for (const p of [A, B]) await closeStory(p);

const notice = () => A.getByText('さんの通信が切れています').count();

// (1) 3秒だけ切って戻す
await api(B, () => window.__online.goOffline());
let seen = false;
for (let t = 0; t < 30; t++) {
  if (await notice()) seen = true;
  await wait(100);
}
await api(B, () => window.__online.goOnline());
for (let t = 0; t < 30; t++) {
  if (await notice()) seen = true;
  await wait(100);
}
check(!seen, '相方を3秒切って戻す: 知らせが出ない');

// (2) 15秒切る
await wait(1500);
const t0 = Date.now();
await api(B, () => window.__online.goOffline());
let shownAt = null;
while (Date.now() - t0 < 15000) {
  if (shownAt === null && (await notice())) shownAt = Date.now() - t0;
  await wait(100);
}
await A.screenshot({ path: `${OUT}/notice.png` }).catch(() => {});
check(shownAt !== null && shownAt >= 8000 && shownAt <= 14000, `相方を15秒切る: 約10秒で知らせが出る（${shownAt === null ? '出なかった' : `${(shownAt / 1000).toFixed(1)}秒`}）`);
const back = Date.now();
await api(B, () => window.__online.goOnline());
const gone = await until(async () => (await notice()) === 0, 3000, 'notice gone').then(() => Date.now() - back, () => null);
check(gone !== null, `戻るとすぐ消える（${gone === null ? '消えなかった' : `${(gone / 1000).toFixed(1)}秒`}）`);

// (3) ホストを3秒だけ切って戻す
await wait(1500);
await api(A, () => window.__online.goOffline());
await wait(3000);
await api(A, () => window.__online.goOnline());
await wait(12000);
check((await api(A, () => window.__online.isHost())) && !(await api(B, () => window.__online.isHost())), 'ホストを3秒切って戻す: ホストは代わらない');
const hs = await Promise.all([A, B].map((p) => api(p, () => window.__online.hash())));
check(hs[0] === hs[1], `2台の状態が同じ（${hs.join(' ')}）`);

await browser.close();
console.log(problems.length ? `\n失敗 ${problems.length}件:\n${problems.join('\n')}` : '\nすべて成功');
process.exit(problems.length ? 1 : 0);
