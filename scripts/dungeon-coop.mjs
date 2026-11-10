// ダンジョンの手直しの確認（オンライン2人・エミュレーター）:
// - 「だれがサイコロを振る？」が2台に出る → 2人が同じキャラを選ぶと決まる → その人だけが振れる。仲間の画面でも同じ目が転がる
// - 扉のボタン（手番の人は開ける・ほかの人は「こっち！」）。2人が同じ扉を選ぶと扉の前まで自動で歩いて開く（1つで1）。選べる扉0の形
// - 選ばなかった扉は壁になり、探索度が100%まで届く形になっているか（地図に出ない）
// 事前に: npx vite build && npx vite preview --port 4245 --host 127.0.0.1 &   と   npm run emulators &
// 使い方: URL=http://127.0.0.1:4245/card-rpg/ WIDTH=390 node scripts/dungeon-coop.mjs（WIDTH は 360・390・480）
import { mkdirSync } from 'node:fs';
import { chromium, URL, layoutIssues } from './lib.mjs';

const EMU = process.env.EMU_HOST ?? '127.0.0.1';
const WIDTH = Number(process.env.WIDTH ?? 390);
const HEIGHT = WIDTH <= 360 ? 640 : WIDTH >= 480 ? 860 : 844;
const OUT = process.env.DUNGEON_COOP_OUTPUT ?? 'screenshots/dungeon-coop';
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
    if (!localStorage.getItem('card-rpg/settings')) localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false }));
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

async function inject(g) {
  const err = await A.evaluate((g) => window.__online.inject(g), g);
  if (err) throw new Error(err);
  await B.evaluate(() => window.__online.resync());
  await wait(800);
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
  const issues = (await layoutIssues(page)).filter((s) => !s.startsWith('small button: ""')); // 地図のマス（文字なし）は除く（dungeon-view と同じ）
  check(issues.length === 0, `${name} の表示の崩れなし${issues.length ? `（${issues.slice(0, 4).join(' / ')}）` : ''}`);
};
const dun = async () => (await A.evaluate(() => window.__online.game())).expeditions?.[0]?.dungeon;

// 2人を翠の神殿に置き、P2 は P1 に同行して一緒に入る
{
  const g = structuredClone(g0);
  const w = g.world;
  const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
  for (const h of g.heroes) {
    w.pos[h.id] = t;
    h.lastRandomEvent = w.worldTurn;
    h.focus = 3;
  }
  w.follow = { [h2]: h1 };
  w.turn = h1;
  w.move = 4;
  w.story = undefined;
  w.wanderers = [];
  w.visitedRegions = Array.from({ length: 200 }, (_, i) => i);
  await inject(g);
}
await send(A, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: h1 });
await until(async () => !!(await dun()), 10000, 'enter dungeon');
for (const p of [A, B]) await closeStory(p);

// ===== 1. だれがサイコロを振る？ =====
await A.locator('[data-explore-picker]').waitFor({ timeout: 8000 }).catch(() => {});
check((await A.locator('[data-explore-picker]').count()) === 1, 'P1 に「だれが探索のサイコロを振る？」が出る');
await B.locator('[data-explore-picker]').waitFor({ timeout: 8000 }).catch(() => {});
check((await B.locator('[data-explore-picker]').count()) === 1, 'P2 にも同じ一覧が出る');
check(!(await A.locator('[data-explore-roll-button]').count()), '決まるまでサイコロのボタンは出ない');
check((await A.locator('[data-dir]').count()) === 0, '方向のボタン（左へ・前進など）は無い');
await shot(A, '1-picker-P1');
await layout(A, '振る人の一覧（P1）');
await layout(B, '振る人の一覧（P2）');
// P1 は P2 のキャラ、P2 は自分のキャラ → 一致して P2 のキャラに決まる
await A.locator(`[data-explore-roller="${h2}"] button`).click();
await wait(700);
check(!(await dun()).exploreRoller, '1人だけ選んだ時はまだ決まらない');
await B.locator(`[data-explore-roller="${h2}"] button`).click();
await until(async () => !!(await dun())?.exploreRoller, 6000, 'roller decided').catch(() => {});
check((await dun())?.exploreRoller?.heroId === h2, '2人が同じキャラを選ぶと決まる');
await wait(500);
check((await A.locator('[data-explore-wait]').count()) === 1, 'P1 には「〇〇がサイコロを振ります（ナツさんを待っています）」');
check((await B.locator('[data-explore-roll-button]').count()) === 1, 'P2 にサイコロのボタンが出る');
await shot(A, '2-wait-P1');
await B.locator('[data-explore-roll-button]').click();
// 仲間（P1）の画面でも、同じサイコロが転がる
const rollingA = await A.locator('[data-dice-overlay]').waitFor({ timeout: 4000 }).then(() => true, () => false);
check(rollingA, 'P1 の画面でも、P2 のサイコロが真ん中で転がる');
await wait(300);
await shot(A, '3-dice-rolling-P1');
await A.locator('[data-dice-overlay="done"]').waitFor({ timeout: 4000 }).catch(() => {});
await B.locator('[data-dice-overlay="done"]').waitFor({ timeout: 4000 }).catch(() => {});
const faceA = await A.locator('[data-dice-overlay] [data-die-face]').getAttribute('data-die-face').catch(() => null);
const faceB = await B.locator('[data-dice-overlay] [data-die-face]').getAttribute('data-die-face').catch(() => null);
check(!!faceA && faceA === faceB, `2台で同じ目が出る（P1 ${faceA}・P2 ${faceB}）`);
await shot(A, '3b-dice-result-P1');
await until(async () => (await dun())?.explore != null, 6000, 'rolled');
const n0 = (await dun())?.explore ?? 0;
check(n0 >= 1 && n0 <= 3 && String(n0) === faceA, `選べる扉の数 = 出た目（${n0}）`);
await A.locator('[data-dice-overlay]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});

// ===== 2. 扉のボタン（手番の人 = P1 のキャラの番） =====
const clearRoom = async (left) => {
  const g = await A.evaluate(() => window.__online.game());
  const x = g.expeditions[0];
  x.mode = 'dungeon';
  x.battle = undefined;
  x.battleInfo = undefined;
  x.event = undefined;
  x.chest = undefined;
  x.reward = undefined;
  x.dungeon.rooms.find((r) => r.id === x.dungeon.currentRoomId).cleared = true;
  x.dungeon.explore = left;
  x.dungeon.watchedAt = undefined;
  g.world.turn = h1;
  await inject(g);
  for (const p of [A, B]) await closeStory(p);
};
// 入口の扉を2人で開ける（P2 が押すと、票と「こっち！」の印）
const firstRoom = (await dun()).currentRoomId;
await A.locator('[data-door-choice]').first().click().catch(() => {});
await B.locator('[data-door-choice]').first().click().catch(() => {});
await until(async () => (await dun())?.currentRoomId !== firstRoom, 8000, 'entered room').catch(() => problems.push('入口の扉が開かない'));
check((await dun()).explore === n0 - 1, `入口の扉を開けると、選べる扉が1つ減る（${n0} → ${(await dun()).explore}）`);
await wait(2500);
await clearRoom(3);
await A.locator('[data-dungeon-controls="ready"]').waitFor({ timeout: 4000 }).catch(() => {});
await wait(400);
const doorsA = A.locator('[data-door-choice]');
const doorsB = B.locator('[data-door-choice]');
check((await doorsA.count()) >= 1, `P1 に扉のボタンが出る（${(await doorsA.allInnerTexts()).map((t) => t.split('\n')[0]).join(' / ')}）`);
check((await doorsB.count()) >= 1, 'P2 にも扉のボタンが出る（押すと「こっち！」）');
await shot(A, '4-doors-P1');
await shot(B, '4-doors-P2');
await layout(A, '扉のボタン（P1）');
await layout(B, '扉のボタン（P2）');
// P2 が扉を押す → P1 の画面にピン
if (await doorsB.count()) {
  await doorsB.last().click();
  await until(async () => (await A.locator('[data-pin-banner]').count()) > 0, 5000, 'pin on A').catch(() => {});
  check((await A.locator('[data-pin-banner]').count()) > 0, 'P2 が扉のボタンを押すと、P1 に「P2: こっち！」');
  await shot(A, '5-pin-from-P2');
}
// 2人が同じ（右の）扉を選ぶ → 扉の前まで自動で歩いて開く。使うのは1だけ（P2 は上でもう右の扉を押した＝票も入っている）
const before = await dun();
const target = (await doorsA.last().getAttribute('data-door-choice')) ?? '';
check((await dun()).currentRoomId === before.currentRoomId, 'P2 だけが選んだ時はまだ開かない');
await doorsA.last().click();
const walkSeen = await A.locator('[data-door-open="walk"]').waitFor({ timeout: 4000 }).then(() => true, () => false);
check(walkSeen, '扉の前まで自動で歩く演出が出る（P1）');
if (walkSeen) await shot(A, '6-walking-P1');
await until(async () => (await dun())?.currentRoomId === target, 8000, 'entered target').catch(() => {});
const after = await dun();
check(after.currentRoomId === target, '2人が同じ扉を選ぶと、その扉が開く');
check(before.explore - after.explore === 1, `どれだけ歩いても、扉1つで1だけ使う（${before.explore} → ${after.explore}）`);
await wait(2500);
// 選べる扉0: 扉のボタンは押せない。警戒と「手番を終える」は残る
await clearRoom(0);
await wait(400);
const enabledDoors = await A.locator('[data-door-choice]:not([disabled])').count();
check((await A.locator('[data-door-choice]').count()) >= 1 && enabledDoors === 0, '選べる扉0: 扉のボタンは灰色で押せない');
check(await A.locator('[data-watch-open]').isEnabled(), '選べる扉0: 警戒はできる');
check(await A.locator('[data-explore-end]').isVisible(), '選べる扉0: 「手番を終える」がある');
await shot(A, '7-zero-left-P1');
await layout(A, '選べる扉0（P1）');
// 一人称の絵の扉をタップ
const tapDoor = A.locator('[data-dungeon-view] [data-door-tap]');
console.log(`  絵の中の押せる扉: ${await tapDoor.count()}`);
// 扉を開ける（2人で開ける）→ もう1つの扉は壁になり、地図からも消える
await A.getByLabel('地図を開く').click();
await A.locator('[data-map-overlay]').waitFor();
await wait(300);
await shot(A, '9-map');
await layout(A, '大きな地図');
await A.getByLabel('地図を閉じる').click();
const d2 = await dun();
const row = d2.rooms.find((r) => r.id === d2.currentRoomId).row;
const others = d2.rooms.filter((r) => r.row === row && r.id !== d2.currentRoomId);
await A.getByLabel('地図を開く').click();
await A.locator('[data-map-overlay]').waitFor();
await wait(300);
await shot(A, '10-map-after-choice');
const shownOthers = await A.evaluate((ids) => ids.filter((id) => document.querySelector(`[data-map-overlay] [aria-label="開かない扉"]`)), others.map((r) => r.id));
check(shownOthers.length === 0, '選ばなかった扉は、地図に「開かない扉」として残らない');
await A.getByLabel('地図を閉じる').click();
await shot(A, '11-room');
await layout(A, '部屋の中');
check((await A.locator('[data-room-here]').count()) === 1, `部屋の中では、部屋の種類を文字で出す（${(await A.locator('[data-room-here]').innerText().catch(() => '')).trim()}）`);

await browser.close();
if (problems.length) {
  console.log(`\n問題 ${problems.length}件:\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`\n${WIDTH}: すべてOK`);
