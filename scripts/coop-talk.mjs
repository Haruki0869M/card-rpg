// ステップ2（オンラインの相談）の確認: エミュレーターで2台（P1=ホスト・P2）。
// - ダンジョン: P2 が方向ボタン・地図の扉を押すと、P1 の画面に「P2: こっち！」が出る。約8秒で消える。手番の人が向きを変えると消える
// - 宝箱: 開け役を2人で選ぶ（全員一致で決まる）→ 開け役の担当が開ける → 中身を「欲しい／余れば」で取り合う → 先へ進める
// - 店: 残りの数・最後の1つの確認（ゲーム内の窓）・P2 の画面に「〇〇が△△を買った（残り0）」・「ほしい！」の印
// - 災厄の中ボス（段階7b）: 2台に札・P2 が自分で「加わる」・2人で中ボスの戦闘・勝つと専用の装備の取り合い
// 状態は、エミュレーターの時だけ読み込む確認用の口（src/dev/onlineDebug.ts の inject）で差し込む。
// 事前に: npx vite build && npx vite preview --port 4242 --host 127.0.0.1 &   と   npm run emulators &
// 使い方: URL=http://127.0.0.1:4242/card-rpg/ WIDTH=390 node scripts/coop-talk.mjs（WIDTH を 360 にしてもう1回）
import { mkdirSync } from 'node:fs';
import { chromium, URL, layoutIssues } from './lib.mjs';

const EMU = process.env.EMU_HOST ?? '127.0.0.1';
const WIDTH = Number(process.env.WIDTH ?? 390);
const HEIGHT = WIDTH <= 360 ? 640 : 844;
const OUT = 'screenshots/coop-talk';
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
    if (await fn()) return true;
    if (Date.now() - t0 > ms) throw new Error(`timeout: ${what}`);
    await wait(80);
  }
}
const shot = (page, name) => page.screenshot({ path: `${OUT}/${WIDTH}-${name}.png` });

const browser = await chromium.launch();
async function device(name) {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('card-rpg/settings')) localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false }));
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    console.log(`[${name}] pageerror`, e.message);
    problems.push(`[${name}] pageerror ${e.message}`);
  });
  return page;
}
const base = (extra = '') => `${URL}?emu=${EMU}${extra}`;
const A = await device('A');
const B = await device('B');

// ---- 部屋を作って2人で始める ----
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
await until(async () => (await Promise.all([A, B].map((p) => p.evaluate(() => window.__online?.mode())))).every((m) => m === 'world'), 20000, 'world');
await wait(500);
const g0 = await A.evaluate(() => window.__online.game());
const h1 = g0.heroes.find((h) => h.playerId === 'P1').id;
const h2 = g0.heroes.find((h) => h.playerId === 'P2').id;

/** ホストが状態を差し込み、P2 も取り直す */
async function inject(g) {
  const err = await A.evaluate((g) => window.__online.inject(g), g);
  if (err) throw new Error(err);
  await B.evaluate(() => window.__online.resync());
  await wait(700);
}
/** 2人を同じマスに置き、P2 は P1 に同行（世界マップの施設に一緒に入る） */
function atPlace(kind, id) {
  const g = structuredClone(g0);
  const w = g.world;
  const t = w.tiles.findIndex((x) => x.f && x.f.kind === kind && (!id || x.f.id === id));
  if (t < 0) throw new Error(`no ${kind}`);
  for (const h of g.heroes) {
    w.pos[h.id] = t;
    h.gold = 999;
    h.lastRandomEvent = w.worldTurn;
  }
  w.follow = { [h2]: h1 };
  w.turn = h1;
  w.move = 4;
  w.story = undefined;
  w.wanderers = [];
  w.visitedRegions = Array.from({ length: 200 }, (_, i) => i);
  return g;
}
const send = async (page, cmd) => {
  const err = await page.evaluate((c) => window.__online.send(c), cmd);
  if (err) throw new Error(`${cmd.type}: ${err}`);
  await wait(600);
};
const closeStory = async (p) => {
  for (let i = 0; i < 4 && (await p.getByText('タップで続ける').count()); i++) {
    await p.getByText('タップで続ける').first().click();
    await wait(250);
  }
};
const layout = async (page, name) => {
  const issues = await layoutIssues(page);
  check(issues.length === 0, `${name} の表示の崩れなし${issues.length ? `（${issues.slice(0, 4).join(' / ')}）` : ''}`);
};

// ===== 1. ダンジョンのピン =====
await inject(atPlace('dungeon', 'emeraldTemple'));
await send(A, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: h1 });
await until(async () => !!(await A.evaluate(() => window.__online.game()))?.expeditions?.[0]?.dungeon, 10000, 'enter dungeon');
let g = await A.evaluate(() => window.__online.game());
check(g.expeditions[0].heroes.includes(h2), 'P2 のキャラも一緒にダンジョンに入った');
// 歩数を持たせ、手番は P1 のキャラ
g.world.turn = h1;
// お供の印が欄の上で切れないかも見る（オカメインコ）
g.heroes.find((h) => h.id === h1).pet = { petId: 'cockatiel', color: 'lutino', name: 'ピー', love: 0, acts: 0 };
await inject(g);
for (const p of [A, B]) await closeStory(p);
await A.locator('[data-door-choice]').first().waitFor();
await B.locator('[data-door-choice]').first().waitFor();
check((await A.locator('[data-pin-guide]').count()) === 0, 'P1（歩く人）には「こっち！」の案内が出ない');
check((await B.locator('[data-pin-guide]').count()) === 1, 'P2（手番でない人）には「こっち！」の案内が出る');
// 扉を選ぶだけの形: 手番でない人が扉のボタンを押すと「こっち！」
await B.locator('[data-door-choice]').first().click();
await until(async () => (await A.locator('[data-pin-banner]').count()) > 0, 5000, 'pin banner on A');
await wait(400);
const bannerA = await A.locator('[data-pin-banner]').innerText();
check(/P2/.test(bannerA) && /こっち！（.*扉）/.test(bannerA), `P1 の画面に「P2: こっち！（…扉）」が出る（${bannerA.replace(/\n/g, ' ')}）`);
check((await A.locator('[data-door-choice] ~ [data-pin-chips]').count()) === 1, 'P1 の扉のボタンにも P2 の札');
check((await B.locator('[data-pin-banner]').count()) === 1, 'P2 自身の画面にも出る');
await shot(A, 'dungeon-pin-P1');
await shot(B, 'dungeon-pin-P2');
await layout(B, 'ダンジョン（P2・ピンあり）');
// 約8秒で消える
await wait(8600);
check((await A.locator('[data-pin-banner]').count()) === 0, '約8秒でピンが消える');
// 地図の扉を指す
await B.locator('[data-minimap]').click();
await B.locator('[data-map-overlay]').waitFor();
const door = B.locator('[data-map-overlay] [data-door="open"]').first();
if (await door.count()) {
  await door.click();
  await B.locator('[data-pin-send]').click();
  await until(async () => (await A.locator('[data-pin-banner]').count()) > 0, 5000, 'door pin');
  const t = await A.locator('[data-pin-banner]').innerText();
  check(/扉/.test(t), `地図の扉を指すと P1 に「こっち！（…扉）」（${t.replace(/\n/g, ' ')}）`);
  check((await A.locator('[data-minimap] [data-cell-pin]').count()) + (await A.locator('[data-door-choice] ~ [data-pin-chips]').count()) >= 1, 'P1 のミニマップか扉のボタンに P2 の印');
  await shot(A, 'dungeon-door-pin-P1');
} else check(false, '地図に開けられる扉が見つからない');
await B.locator('[aria-label="地図を閉じる"]').click();
// お供の印が切れない（ボタンの内側）
const petBox = await A.locator('[data-party-pet]').first().boundingBox().catch(() => null);
const barBox = await A.locator('[data-dungeon-bar] .overflow-x-auto').first().boundingBox();
if (petBox) check(petBox.y >= barBox.y - 0.5, `パーティの顔のお供の印が欄の上で切れない（印 ${petBox.y.toFixed(0)} / 欄 ${barBox.y.toFixed(0)}）`);
else console.log('    （お供がいないので、お供の印の確認は飛ばした）');

// ===== 2. 宝箱: 開け役の相談と取り合い =====
g = await A.evaluate(() => window.__online.game());
{
  const x = g.expeditions[0];
  x.mode = 'chest';
  x.dungeon.currentRoomId = x.dungeon.rooms[0].id;
  x.chest = { roomId: x.dungeon.rooms[0].id, spec: { rarity: 'rare', locked: false }, unlocked: true };
}
await inject(g);
await A.locator('[data-opener-picker]').waitFor();
await B.locator('[data-opener-picker]').waitFor();
check(true, '2台とも「だれが開ける？」の一覧が出る');
const pick = await B.locator('[data-opener-picker]').innerText();
check(/器用/.test(pick) && /運/.test(pick) && /フォーカス/.test(pick) && /%/.test(pick), '一覧に成功率・器用・運・フォーカスが出る');
check((await A.getByText('報酬を受け取る人').count()) === 0, '2人以上では受取人の選択（開けた人が決める）を出さない');
await layout(B, '宝箱（開け役の一覧）');
await shot(B, 'chest-picker-P2');
// 意見が分かれると決まらない → そろえると決まる
await A.locator(`[data-opener="${h1}"] button`).click();
await wait(500);
await B.locator(`[data-opener="${h2}"] button`).click();
await wait(800);
check(!(await A.evaluate(() => window.__online.game())).expeditions[0].chest.opener, '意見が分かれている間は決まらない');
await B.locator(`[data-opener="${h1}"] button`).click();
await until(async () => (await A.evaluate(() => window.__online.game())).expeditions[0].chest.opener === h1, 8000, 'opener decided');
check(true, '全員が同じ人を選ぶと開け役が決まる');
await B.locator('[data-opener-wait]').waitFor();
check((await B.locator('[data-opener-wait]').innerText()).includes('待っています'), 'P2 の画面は「〇〇が開けます…待っています」');
await A.getByText('運のスロットで開ける').click();
await wait(400);
if (await A.getByText('タップで結果まで飛ばす').count()) await A.getByText('タップで結果まで飛ばす').click();
await until(async () => (await B.locator('[data-claim]').count()) > 0, 10000, 'claim on B');
const nClaims = (await A.evaluate(() => window.__online.game())).expeditions[0].chest.claims.length;
check(nClaims >= 1, `開けた後、中身の取り合いが下のパネルに出る（${nClaims}つ）`);
check((await B.getByRole('button', { name: /先へ進む/ }).count()) === 0 && (await B.locator('[data-claim-area]').isVisible()), '取り合いが終わるまで「先へ進む」は出ない（取り合いが画面の下に見えている）');
await shot(B, 'chest-claim-P2');
await layout(B, '宝箱（取り合い）');
for (let i = 0; i < nClaims; i++) {
  await A.locator(`[data-claim="${i}"]`).getByRole('button', { name: '欲しい' }).click();
  await wait(400);
  await B.locator(`[data-claim="${i}"]`).getByRole('button', { name: '余れば' }).click();
  await wait(600);
}
await until(async () => (await B.getByRole('button', { name: /先へ進む/ }).count()) > 0, 8000, 'leave enabled');
const gc = (await A.evaluate(() => window.__online.game())).expeditions[0].chest;
check(gc.claims.every((c) => c.winner === h1), '「欲しい」の P1 が品物を受け取った');
await shot(A, 'chest-done-P1');
await A.getByRole('button', { name: /先へ進む/ }).click();
await B.getByRole('button', { name: /先へ進む/ }).click();
await until(async () => (await A.evaluate(() => window.__online.mode())) === 'dungeon', 8000, 'back to dungeon');
check(true, '2人とも「先へ進む」でダンジョンに戻る');

// ===== 2b. 世界マップのマスの宝箱（2026-11-10 の実機の不具合: P2 が押せない） =====
// P1 の番で、同行している P2 のキャラと一緒にマスの宝箱を開ける。開け役は2人で決め、「先へ進む」は手番の P1 だけ
{
  const gw = atPlace('chest');
  const ti = gw.world.pos[h1];
  gw.world.tiles[ti].f.chest = { rarity: 'rare', locked: false };
  gw.world.tiles[ti].f.used = false;
  await inject(gw);
  await send(A, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: h1 });
  await until(async () => (await B.locator('[data-opener-picker]').count()) > 0, 8000, 'world chest picker on B');
  check((await B.locator('[data-turn-lock]').count()) === 0, 'P2 の画面に「選んでいます」の覆いが出ない（開け役は全員で決めるため）');
  // P2 の「任せる」が、何にも隠れずに押せる位置にある
  const covered = await B.locator(`[data-opener="${h1}"] button`).evaluate((btn) => {
    const r = btn.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el && !btn.contains(el) ? `${el.tagName}.${el.className}`.slice(0, 60) : '';
  });
  check(!covered, `P2 の「任せる」が別の物に隠れていない${covered ? `（${covered}）` : ''}`);
  check((await B.locator('[data-leave-wait]').count()) === 1 && (await B.getByRole('button', { name: /立ち去る/ }).count()) === 0, 'P2 には「立ち去る」の代わりに、待っている相手の表示');
  check((await A.getByRole('button', { name: /立ち去る/ }).count()) === 1, '手番の P1 には「立ち去る」が出る');
  await layout(B, '世界マップの宝箱（開け役の一覧・P2）');
  await shot(B, 'world-chest-picker-P2');
  // P1 が先に選ぶ → P2 の画面に「あなたの選択を待っています」の枠が、ボタンの上に（重ならずに）出る
  await A.locator(`[data-opener="${h1}"] button`).click();
  await until(async () => (await B.locator('[data-vote-status]').count()) > 0, 5000, 'vote status on B');
  const vs = B.locator('[data-vote-status]');
  check((await vs.innerText()).includes('あなたの選択を待っています'), 'P2 の画面に「あなたの選択を待っています」');
  const vsBox = await vs.boundingBox();
  const pickBox = await B.locator('[data-opener-picker]').boundingBox();
  check(vsBox.y + vsBox.height <= pickBox.y + 0.5, `待っている枠が一覧のボタンに重ならない（枠の下 ${(vsBox.y + vsBox.height).toFixed(0)} / 一覧の上 ${pickBox.y.toFixed(0)}）`);
  await shot(B, 'world-chest-vote-P2');
  await B.locator(`[data-opener="${h1}"] button`).click();
  await until(async () => (await A.evaluate(() => window.__online.game())).chest?.opener === h1, 8000, 'world chest opener');
  check(true, '世界マップの宝箱でも、全員が同じ人を選ぶと開け役が決まる');
  await A.getByText('運のスロットで開ける').click();
  await wait(400);
  if (await A.getByText('タップで結果まで飛ばす').count()) await A.getByText('タップで結果まで飛ばす').click();
  await until(async () => !!(await A.evaluate(() => window.__online.game())).chest?.contents, 10000, 'world chest opened');
  const wc = (await A.evaluate(() => window.__online.game())).chest;
  const n = wc.claims?.length ?? 0;
  for (let i = 0; i < n; i++) {
    await A.locator(`[data-claim="${i}"]`).getByRole('button', { name: '欲しい' }).click();
    await wait(400);
    await B.locator(`[data-claim="${i}"]`).getByRole('button', { name: '余れば' }).click();
    await wait(600);
  }
  await until(async () => (await A.getByRole('button', { name: /先へ進む/ }).count()) > 0, 8000, 'world chest leave on A');
  await wait(400);
  check((await B.getByRole('button', { name: /先へ進む/ }).count()) === 0 && (await B.locator('[data-leave-wait]').innerText()).includes('先へ進めるのを待っています'), 'P2 には「先へ進む」の代わりに「P1 さんが先へ進めるのを待っています」');
  check((await B.locator('[data-turn-lock]').count()) === 0, '開けた後も P2 の画面に覆いが出ない');
  await layout(B, '世界マップの宝箱（開けた後・P2）');
  await shot(B, 'world-chest-opened-P2');
  await A.getByRole('button', { name: /先へ進む/ }).click();
  await until(async () => (await Promise.all([A, B].map((p) => p.evaluate(() => window.__online.mode())))).every((m) => m === 'world'), 8000, 'back to world');
  check(true, 'P1 の「先へ進む」で2人とも世界マップに戻る');
}

// ===== 3. 店 =====
await inject(atPlace('town'));
await send(A, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: h1 });
await until(async () => (await Promise.all([A, B].map((p) => p.evaluate(() => window.__online.mode())))).every((m) => m === 'town'), 8000, 'town');
await wait(500);
const rowLast = A.locator('[data-shop-row]').filter({ has: A.locator('[data-shop-left]', { hasText: '残り1' }) }).first();
check((await rowLast.count()) === 1, '品物の行に「残りN」が出る');
const uid = await rowLast.getAttribute('data-shop-row');
// P2 の「ほしい！」
await B.locator(`[data-shop-row="${uid}"] [data-shop-want]`).click();
await until(async () => (await A.locator(`[data-shop-row="${uid}"] [data-pin-chips]`).count()) > 0, 5000, 'want pin');
await wait(400);
check(/P2: ほしい！/.test(await A.locator(`[data-shop-row="${uid}"] [data-pin-chips]`).innerText()), 'P1 の店の行に「P2: ほしい！」');
await shot(A, 'shop-want-P1');
await layout(A, '店（ほしい！の印）');
// 最後の1つ → 確認 → 買う
await rowLast.locator('button').last().click();
await A.getByRole('dialog', { name: '残り1つです' }).waitFor();
check((await A.getByRole('dialog').innerText()).includes('仲間も欲しいかもしれません'), '最後の1つはゲーム内の窓で確かめる');
await shot(A, 'shop-lastone-P1');
await A.getByRole('dialog').getByRole('button', { name: '買う' }).click();
await until(async () => /買った（残り0）/.test(await B.locator('body').innerText()), 6000, 'buy notice on B');
check(true, 'P2 の画面に「〇〇が△△を買った（残り0）」');
await shot(B, 'shop-notice-P2');
check(!/買った（残り0）/.test(await A.locator('body').innerText()), 'P1（買った人）には仲間のお知らせを出さない');

// ===== 4. 2人で災厄の中ボスに挑む（段階7b） =====
{
  const g = structuredClone(g0);
  const w = g.world;
  // 盗賊王を、王都から少し離れた陸のマスに置く。2人はその隣のマス（P2 は同行していない＝自分で「加わる」を答える）
  const land = (i) => i >= 0 && i < w.tiles.length && !w.tiles[i].f && ['plains', 'forest', 'hills', 'swamp'].includes(w.tiles[i].t);
  const nest = w.tiles.findIndex((t, i) => land(i) && land(i - 1) && i % w.width > 1 && Math.floor(i / w.width) > 30);
  w.wanderers = [{ id: 'wSc', tile: nest, enemies: [{ defId: 'scourgeGreedKing', level: 3 }, { defId: 'banditThug', level: 3 }, { defId: 'banditArcher', level: 3 }], scourge: 'greedKing' }];
  w.scourgeCount = 1;
  w.scourgesMet = ['greedKing'];
  for (const h of g.heroes) { w.pos[h.id] = nest - 1; h.lastRandomEvent = w.worldTurn; }
  w.tiles[nest].seen = true;
  w.tiles[nest - 1].seen = true;
  w.follow = {};
  w.turn = h1;
  w.move = 4;
  w.prevTile = nest - 1;
  w.story = undefined;
  w.visitedRegions = Array.from({ length: 200 }, (_, i) => i);
  await inject(g);
  check((await A.locator('[data-scourge-strip]').count()) === 1 && (await B.locator('[data-scourge-strip]').count()) === 1, '2台とも上に災厄の札が出る');
  await send(A, { type: 'WORLD_MOVE', playerId: 'P1', heroId: h1, to: nest, companions: [] });
  await until(async () => (await Promise.all([A, B].map((p) => p.evaluate(() => window.__online.mode())))).every((m) => m === 'encounter'), 8000, 'scourge encounter');
  await wait(500);
  check((await A.locator('[data-encounter-scourge]').count()) === 1 && (await B.locator('[data-encounter-scourge]').count()) === 1, '2台とも遭遇の画面に災厄の説明が出る');
  await shot(B, 'scourge-encounter-P2');
  await layout(B, '災厄の遭遇（P2）');
  // P2 が自分のキャラで「加わる」を押す
  await B.getByRole('button', { name: /返事待ち/ }).click();
  await wait(600);
  const ge = await A.evaluate(() => window.__online.game());
  check(ge.encounter?.joins?.[h2] === true, 'P2 が「加わる」と答えられる（だれも止まらない）');
  await A.getByRole('button', { name: /戦う/ }).click();
  await until(async () => (await Promise.all([A, B].map((p) => p.evaluate(() => window.__online.mode())))).every((m) => m === 'battle'), 8000, 'scourge battle');
  const gb = await A.evaluate(() => window.__online.game());
  check(!!gb.battle?.midboss && gb.battle.allies.length === 2, `2人とも災厄の戦闘に入る（中ボスの戦闘・味方${gb.battle?.allies.length}人）`);
  await wait(800);
  await shot(B, 'scourge-battle-P2');
  // 勝った所まで進めた状態を差し込み、戦闘を終える
  for (const e of gb.battle.enemies) { e.dead = true; e.hp = 0; }
  gb.battle.phase = 'victory';
  await inject(gb);
  await send(A, { type: 'FINISH_BATTLE', playerId: 'P1' });
  await until(async () => (await Promise.all([A, B].map((p) => p.evaluate(() => window.__online.mode())))).every((m) => m === 'reward'), 8000, 'scourge reward');
  await wait(600);
  const gr = await A.evaluate(() => window.__online.game());
  check(gr.reward?.claim?.item.itemId === 'greedCrown', '専用の装備「強欲王の黄金冠」が取り合いに出る');
  check(!gr.world.wanderers.some((x) => x.scourge) && JSON.stringify(gr.world.story ?? {}).includes('盗賊王を倒した'), '倒すと災厄が消え、「倒した！」の知らせが用意される');
  // レベルアップの成長を選び終えるまでは、取り合いの欄は出ない（今までと同じ流れ）。それぞれの担当の人が選ぶ
  for (let k = 0; k < 12; k++) {
    const lu = (await A.evaluate(() => window.__online.game())).reward?.levelUps?.[0];
    if (!lu) break;
    const owner = gr.heroes.find((h) => h.id === lu.heroId).playerId;
    await send(owner === 'P1' ? A : B, { type: 'CHOOSE_GROWTH', playerId: owner, optionIndex: Math.max(0, lu.options.findIndex((o) => o.kind === 'maxHp' || o.kind === 'stat')) });
  }
  await wait(600);
  const claimB = B.locator('[data-claim]');
  if (await claimB.count()) {
    await shot(B, 'scourge-claim-P2');
    await B.locator('[data-claim]').getByRole('button', { name: 'いらない' }).click();
    await A.locator('[data-claim]').getByRole('button', { name: '欲しい' }).click();
    await until(async () => !!(await A.evaluate(() => window.__online.game())).reward?.claim?.winner, 6000, 'claim winner');
    const gw = await A.evaluate(() => window.__online.game());
    check(gw.reward.claim.winner === h1, '「欲しい」の P1 が専用の装備を受け取った');
  } else check(false, 'P2 の画面に取り合いの欄が出ない');
}

await browser.close();
if (problems.length) {
  console.log(`\n問題 ${problems.length}件`);
  for (const p of problems) console.log(' -', p);
  process.exit(1);
}
console.log(`\ncoop-talk ${WIDTH}px: すべて成功`);
