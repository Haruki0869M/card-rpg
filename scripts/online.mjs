// オンライン協力の確認: 2〜4台（別々のブラウザ。PEOPLE=2〜4、既定3）で部屋を作って参加し、自動プレイで遊んで、全員の状態が一致するかを見る。
// 最後に、通った操作の種類（ダンジョンの歩き・扉・投票・戦闘・町など）と、端末ごとに送った数を表示する。
// 途中で1台を切断 → ホストが代わりに操作 → 戻って追いつく。ホストが切断 → 次の人が引き継ぐ。
// 事前に: npm run build && npx vite preview --port 4173 &   と   npm run emulators &
import { chromium, URL } from './lib.mjs';

// REAL=1 なら本物の Firebase（この環境の通信の中継を通す）
const REAL = !!process.env.REAL;
const EMU = process.env.EMU_HOST ?? '127.0.0.1';
const STEPS = Number(process.env.STEPS ?? 150);
const PEOPLE = Number(process.env.PEOPLE ?? 3);
if (!(PEOPLE >= 2 && PEOPLE <= 4)) throw new Error('PEOPLE は 2〜4');
const base = (extra = '') => `${URL}?${REAL ? 'debug=1' : `emu=${EMU}`}${extra}`;
const shot = (page, name) => page.screenshot({ path: `screenshots/online-${name}.png` });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(fn, ms = 15000, what = '') {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return;
    if (Date.now() - t0 > ms) throw new Error(`timeout: ${what}`);
    await wait(50);
  }
}

const proxy = REAL && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined;
const browser = await chromium.launch(proxy ? { proxy } : {});
async function device(name) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, ignoreHTTPSErrors: REAL });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('card-rpg/settings')) localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false }));
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${name}] pageerror`, e.message));
  page.on('console', (m) => m.type() === 'error' && console.log(`[${name}] console`, m.text()));
  return page;
}

const NAMES = ['ハル', 'ナツ', 'アキ', 'フユ'];
const pages = [];
for (let i = 0; i < PEOPLE; i++) pages.push(await device('ABCD'[i]));
const [A, B] = pages;
const C = pages[PEOPLE - 1]; // 切断の確認に使う最後の端末

// ---- ホストが部屋を作る ----
await A.goto(base());
await A.getByText('新しい冒険').click();
await A.getByText(`${PEOPLE}人`, { exact: true }).click();
await A.getByRole('button', { name: 'オンライン協力' }).click();
await A.getByPlaceholder('プレイヤー').fill('ハル');
await A.getByRole('button', { name: '部屋を作る' }).click();
await A.getByTestId('room-code').waitFor();
const code = (await A.getByTestId('room-code').textContent()).trim();
console.log('room', code);

// ---- 招待のリンクで参加 ----
for (const [p, n] of pages.slice(1).map((p, i) => [p, NAMES[i + 1]])) {
  await p.goto(base(`&room=${code}`));
  await p.getByPlaceholder('プレイヤー').fill(n);
  await p.getByRole('button', { name: '参加する' }).click();
  await p.getByTestId('room-code').waitFor();
}

// ---- 1人1キャラ作る ----
for (const p of pages) {
  await p.getByRole('button', { name: '作る', exact: true }).first().click();
  await p.getByRole('button', { name: 'このキャラに決める' }).click();
  await p.getByTestId('room-code').waitFor();
}
await until(async () => await A.getByRole('button', { name: '冒険に出発' }).isEnabled(), 10000, 'start enabled');
await shot(A, 'lobby');
await A.getByRole('button', { name: '冒険に出発' }).click();
await until(async () => (await Promise.all(pages.map((p) => p.evaluate(() => window.__online?.mode())))).every((m) => m === 'world'), 15000, 'all in world');
await wait(500);
// 物語を閉じる（誰が押してもよい）
for (let i = 0; i < 5 && (await B.getByText('タップで続ける').count()); i++) {
  await B.getByText('タップで続ける').first().click();
  await wait(300);
}
await wait(500);
await shot(B, 'world-other');

// ---- 自動プレイ ----
const kinds = new Set();
const sentBy = {};
const kindOf = (c) => (c.type === 'SCENE' ? kindOf(c.command) : c.type === 'BATTLE' ? `BATTLE:${c.command.type}` : c.type);
const seqs = () => Promise.all(pages.map((p) => p.evaluate(() => window.__online.seq())));
async function drive(list, steps) {
  const host = async () => {
    for (const p of list) if (await p.evaluate(() => window.__online.isHost())) return p;
    throw new Error('no host');
  };
  let shotBattle = false;
  let retries = 0;
  for (let i = 0; i < steps; i++) {
    const h = await host();
    const mode = await h.evaluate(() => window.__online.mode());
    if (mode === 'ending' || mode === 'gameover') break;
    const before = await h.evaluate(() => window.__online.seq());
    // 全員が今の状態まで追いついてから、次の操作を送る（人が画面を見て操作するのと同じ）
    await until(async () => (await Promise.all(list.map((p) => p.evaluate(() => window.__online.seq())))).every((x) => x >= before), 15000, `sync before ${i}`);
    const cmd = await h.evaluate(() => window.__online.next());
    if (!cmd) break;
    if (cmd.type === 'BATTLE' && cmd.command.type === 'ENEMY_STEP') {
      // 敵の行動はホストが自動で進める
      await until(async () => (await h.evaluate(() => window.__online.seq())) > before, 15000, 'enemy step');
    } else {
      const who = cmd.type === 'BATTLE' ? cmd.command.playerId : cmd.playerId;
      let sender = h;
      for (const p of list) if (who && (await p.evaluate((w) => window.__online.myPlayers().includes(w), who))) sender = p;
      const err = await sender.evaluate((c) => window.__online.send(c), cmd);
      if (err) {
        // 送る直前に状態が進んだ（ホストの敵の自動行動など）→ 少し待ってやり直す
        if (++retries > 10) throw new Error(`step ${i} ${cmd.type}: ${err}`);
        await wait(300);
        i--;
        continue;
      }
      retries = 0;
      kinds.add(kindOf(cmd));
      const seat = await sender.evaluate(() => window.__online.seat());
      sentBy[seat] = (sentBy[seat] ?? 0) + 1;
      // みんなで決める操作の途中（1人が選んだところ）を、別の端末で撮る
      if (!shotVote && (cmd.type === 'VOTE' || (cmd.type === 'SCENE' && cmd.command.type === 'VOTE'))) {
        const other = list.find((p) => p !== sender);
        if (other) {
          await wait(600);
          await shot(other, 'vote');
          shotVote = true;
        }
      }
      await until(async () => (await h.evaluate(() => window.__online.seq())) > before, 15000, `step ${i} ${cmd.type}`);
    }
    if (!shotBattle && mode === 'battle') {
      const ready = await h.evaluate(() => window.__online.mode());
      if (ready === 'battle') {
        await wait(400);
        await shot(list[list.length - 1], 'battle');
        shotBattle = true;
      }
    }
  }
  // 全員の番号がそろうまで待つ（ホストの敵の自動行動で進み続けることがあるので、そろった時点で比べる）
  await until(async () => new Set(await Promise.all(list.map((p) => p.evaluate(() => window.__online.hash())))).size === 1, 30000, 'all caught up');
}
let shotVote = false;
const sameHash = async (list) => {
  const hs = await Promise.all(list.map((p) => p.evaluate(() => window.__online.hash())));
  return { ok: hs.every((h) => h === hs[0]), hs };
};

await drive(pages, STEPS);
let r = await sameHash(pages);
console.log(`${PEOPLE}台で自動プレイ:`, r.ok ? 'OK' : 'NG', r.hs.join(' '));

// スタンプ
await B.evaluate(() => window.__online.stamp('ここ行こう'));
await wait(600);
await shot(A, 'stamp');

// ---- 1台が切断 → ホストが代わりに操作 → 戻って追いつく ----
await C.evaluate(() => window.__online.goOffline());
// 実機の不具合③: 切れてから約10秒は「動いている」扱い（その間に代わりに操作を入れると、戻ってきた扱いで自動で外れる）。
// 画面と同じく、ホストが「切れている」と見てから代わりに操作する
await until(() => A.evaluate((p) => !window.__online.seatOnline(p), `P${PEOPLE}`), 25000, 'offline seen');
await A.evaluate((p) => window.__online.setProxy(p, true), `P${PEOPLE}`);
await wait(500);
await shot(A, 'offline');
await drive(pages.slice(0, -1), 40);
await C.evaluate(() => window.__online.goOnline());
await wait(3000);
await drive(pages, 1);
r = await sameHash(pages);
console.log('切断して戻る:', r.ok ? 'OK' : 'NG', r.hs.join(' '));

// ---- ホストが切断 → 次の人が引き継ぐ ----
await A.evaluate(() => window.__online.goOffline());
// ふつうの切断の引き継ぎは、約10秒待ってから（実機の不具合③・点検 F3）
await until(() => B.evaluate(() => window.__online.isHost()), 30000, 'host handover');
await B.evaluate(() => window.__online.setProxy('P1', true));
await wait(500);
await drive(pages.slice(1), 30);
r = await sameHash(pages.slice(1));
console.log('ホストの引き継ぎ:', r.ok ? 'OK' : 'NG', r.hs.join(' '));
console.log('seq', (await seqs()).join(' '));
console.log('通った操作:', [...kinds].sort().join(' '));
console.log('端末ごとに送った数:', JSON.stringify(sentBy));
await browser.close();
