// 点検 2026-11-13 F6 の確認: 物語の窓が2つ並んでいる時（制覇の物語 → 災厄の知らせ）の「つづける」。
// エミュレーターで2台（A = P1・ホスト、B = P2）。状態は確認用の口（src/dev/onlineDebug.ts）で差し込む。本番の Firebase には書かない。
//   1. B の通信が遅れて、A が閉じた後に、B が古い窓（制覇の物語）の「つづける」を押す → 災厄の知らせが閉じてはいけない
//   2. A だけが押す → B の画面には、B が自分で押すまで、制覇の物語が出たまま
//   3. 2人がほぼ同時に押す（参考。届く順は通信しだい）→ 災厄の知らせが残る
// 使い方: URL=http://127.0.0.1:4190/card-rpg/ node scripts/coop-story.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, URL } from './lib.mjs';

const EMU = process.env.EMU_HOST ?? '127.0.0.1';
const OUT = process.env.COOP_STORY_OUTPUT ?? 'screenshots/coop-story';
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
const base = (extra = '') => `${URL}?emu=${EMU}${extra}`;
const api = (p, fn, arg) => p.evaluate(fn, arg);
const game = (p) => api(p, () => window.__online?.game());
const seq = (p) => api(p, () => window.__online?.seq() ?? -1).catch(() => -1);
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
const storyBtn = (p) => p.getByRole('button', { name: 'つづける', exact: true });
/** 画面に出ている物語の窓の題（無ければ ''） */
const shownTitle = (p) =>
  p.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'つづける');
    return b?.parentElement?.firstElementChild?.textContent?.trim() ?? '';
  }).catch(() => '');
async function closeAll(p) {
  for (let i = 0; i < 6 && (await storyBtn(p).count()); i++) {
    await storyBtn(p).first().click().catch(() => {});
    await wait(400);
  }
}

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
  await wait(800);
  for (const p of [A, B]) await closeAll(p);
  const g0 = await game(A);
  return { ctxA, ctxB, A, B, g0 };
}

const P1 = { title: '確認の制覇の物語', lines: ['ダンジョンを制覇した。'] };
const P2 = { title: '💀 確認の災厄の知らせ', lines: ['災厄が現れた。'] };

/** 窓を2つ並べた状態を差し込む（ホスト A）。B は取り直す */
async function injectStories(r) {
  const g = structuredClone(await game(r.A));
  g.world.story = P1;
  g.world.storyQueue = [P2];
  g.mode = 'world';
  const err = await api(r.A, (g) => window.__online.inject(g), g);
  if (err) throw new Error(err);
  await api(r.B, () => window.__online.resync()).catch(() => {});
  await until(async () => (await shownTitle(r.A)) === P1.title && (await shownTitle(r.B)) === P1.title, 10000, 'both show P1');
}
const roomStory = async (p) => (await game(p))?.world?.story?.title ?? '(なし)';

try {
  const r = await setupRoom();

  // ---- 1. B の通信が遅れて、古い窓への「つづける」が後から届く ----
  console.log('\n===== 1. 遅れて届いた「つづける」 =====');
  await injectStories(r);
  await api(r.B, () => window.__online.goOffline());
  await wait(500);
  const s1 = await seq(r.A);
  await storyBtn(r.A).first().click();
  await until(async () => (await seq(r.A)) > s1, 8000, 'A closed P1');
  const bBefore = await shownTitle(r.B);
  await storyBtn(r.B).first().click(); // B はまだ制覇の物語を見ている（通信が切れている）
  await wait(300);
  await api(r.B, () => window.__online.goOnline());
  await wait(4000);
  const row1 = { case: '1. 遅れて届いた', bSawBeforePress: bBefore, roomStory: await roomStory(r.A), aShows: await shownTitle(r.A), bShows: await shownTitle(r.B) };
  console.log(JSON.stringify(row1));
  rows.push(row1);
  await shot(r.A, '1-A');
  await shot(r.B, '1-B');
  check(row1.roomStory === P2.title, '1. 遅れて届いた古い窓への「つづける」で、災厄の知らせが閉じない');
  check(row1.bShows === P2.title, '1. B の画面に災厄の知らせが出る');
  await closeAll(r.A);
  await closeAll(r.B);
  await wait(1000);

  // ---- 2. A だけが押す: B の画面は、B が押すまで制覇の物語のまま ----
  console.log('\n===== 2. 片方だけが押す =====');
  await injectStories(r);
  const s2 = await seq(r.A);
  await storyBtn(r.A).first().click();
  await until(async () => (await seq(r.B)) > s2, 8000, 'B got A press');
  await wait(1000);
  const row2 = { case: '2. A だけが押す', roomStory: await roomStory(r.A), aShows: await shownTitle(r.A), bShows: await shownTitle(r.B) };
  await shot(r.B, '2-B-before');
  // B が自分で押す → B の画面は災厄の知らせへ。部屋の窓（災厄の知らせ）は閉じない
  const s2b = await seq(r.A);
  await storyBtn(r.B).first().click();
  await wait(1500);
  row2.bShowsAfterOwnPress = await shownTitle(r.B);
  row2.roomStoryAfterBPress = await roomStory(r.A);
  row2.bPressSentToRoom = (await seq(r.A)) > s2b;
  console.log(JSON.stringify(row2));
  rows.push(row2);
  await shot(r.B, '2-B-after');
  check(row2.aShows === P2.title, '2. A の画面は災厄の知らせ');
  check(row2.bShows === P1.title, '2. B の画面は、B が押すまで制覇の物語のまま');
  check(row2.bShowsAfterOwnPress === P2.title, '2. B が押すと、B の画面は災厄の知らせ');
  check(row2.roomStoryAfterBPress === P2.title, '2. B が制覇の物語を閉じても、災厄の知らせは残る');
  await closeAll(r.A);
  await closeAll(r.B);
  await wait(1000);

  // ---- 3. ほぼ同時に押す（参考） ----
  console.log('\n===== 3. ほぼ同時に押す =====');
  for (let k = 0; k < 3; k++) {
    await injectStories(r);
    await Promise.all([storyBtn(r.A).first().click(), storyBtn(r.B).first().click()]);
    await wait(3000);
    const row3 = { case: `3. 同時（${k + 1}回目）`, roomStory: await roomStory(r.A), aShows: await shownTitle(r.A), bShows: await shownTitle(r.B) };
    console.log(JSON.stringify(row3));
    rows.push(row3);
    check(row3.roomStory === P2.title, `3. 同時に押しても災厄の知らせが残る（${k + 1}回目）`);
    await closeAll(r.A);
    await closeAll(r.B);
    await wait(1000);
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
