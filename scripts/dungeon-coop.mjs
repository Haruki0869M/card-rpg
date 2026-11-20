// ダンジョンの確認（オンライン2人・エミュレーター。抜本的な見直し 段階2）:
// - 探索のサイコロ・「だれが振る？」・「手番を終える」は無い。入ったらすぐ、2人が同じ扉を選ぶと開く（扉1つ＝手番1回）
// - 絵の扉とボタンが同じ数・同じ並び。扉の予兆。P2 が自分のキャラのフォーカス1で「周囲の警戒」→ 2台とも先読みが見える
// - 手番でない人が扉を押すと「こっち！」。選ばなかった扉は地図に残らない
// - 合流: P1 が先に入り、P2 が後から同じ入口で「合流する」→ タブ1つ・顔2人・扉の投票が2人分。先の組が休憩中の時は断られて何も変わらない
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

// 絵の扉（左から右）とボタン（左から右）が同じ数・同じ並びか
const sameDoors = async (page, name, want) => {
  const r = await page.evaluate(() => {
    const view = document.querySelector('[data-dungeon-view]');
    const drawn = [...view.querySelectorAll('[data-wall-door]')].map((e) => ({ id: e.getAttribute('data-wall-door'), x: e.getBoundingClientRect().left })).sort((a, b) => a.x - b.x).map((d) => d.id);
    const buttons = [...document.querySelectorAll('[data-door-choice]')].map((e) => e.getAttribute('data-door-choice'));
    return { drawn, buttons };
  });
  check(r.buttons.length === want && r.drawn.join() === r.buttons.join(), `${name}: 絵の扉 ${r.drawn.length}つ ＝ ボタン ${r.buttons.length}つ（同じ並び。${want}つのはず）`);
};

// ===== 1. サイコロは無い。入ったらすぐ、2人で扉を選ぶ（扉1つ＝手番1回） =====
for (const [p, n] of [[A, 'P1'], [B, 'P2']]) {
  await p.locator('[data-door-choice]').first().waitFor({ timeout: 8000 }).catch(() => {});
  const gone = (await p.locator('[data-explore-picker], [data-explore-roll-button], [data-explore-end], [data-dice-overlay]').count()) + (await p.getByText('サイコロを振る').count()) + (await p.getByText('手番を終える').count());
  check(gone === 0, `${n}: 探索のサイコロ・「だれが振る？」・「手番を終える」は出ない`);
  check((await p.locator('[data-dir]').count()) === 0, `${n}: 方向のボタン（左へ・前進など）は無い`);
  await sameDoors(p, `${n} 入口`, 1);
  check((await p.locator('[data-door-choice]').first().getAttribute('data-door-omen')) === 'danger', `${n}: 入口の扉に予兆（赤＝魔物の群れ）が出る`);
}
await shot(A, '1-entrance-P1');
await shot(B, '1-entrance-P2');
await layout(A, '入口（P1）');
await layout(B, '入口（P2）');

// ===== 2. 扉のボタン（全員一致で開く） =====
const clearRoom = async () => {
  const g = await A.evaluate(() => window.__online.game());
  const x = g.expeditions[0];
  x.mode = 'dungeon';
  x.battle = undefined;
  x.battleInfo = undefined;
  x.event = undefined;
  x.chest = undefined;
  x.reward = undefined;
  x.vote = undefined;
  x.dungeon.rooms.find((r) => r.id === x.dungeon.currentRoomId).cleared = true;
  x.dungeon.opened = undefined;
  for (const h of g.heroes) {
    h.focus = 3;
    h.hp = Math.max(1, h.hp);
  }
  g.world.turn = x.heroes[0];
  g.world.acted = g.heroes.filter((h) => !x.heroes.includes(h.id)).map((h) => h.id);
  await inject(g);
  for (const p of [A, B]) await closeStory(p);
};
// 入口の扉を2人で開ける（1人だけではまだ開かない）
const firstRoom = (await dun()).currentRoomId;
await A.locator('[data-door-choice]').first().click().catch(() => {});
await wait(900);
check((await dun()).currentRoomId === firstRoom, 'P1 だけが扉を選んだ時は、まだ開かない');
check((await B.locator('[data-vote-status]').count()) > 0 || (await B.getByText(/待って|選んで/).count()) > 0, 'P2 の画面に、票の様子が出る');
await shot(B, '2-vote-waiting-P2');
await B.locator('[data-door-choice]').first().click().catch(() => {});
const sceneA = await A.locator('[data-door-open]').waitFor({ timeout: 4000 }).then(() => true, () => false);
check(sceneA, '2人が同じ扉を選ぶと、扉が開く演出が出る（P1）');
await until(async () => (await dun())?.currentRoomId !== firstRoom, 8000, 'entered room').catch(() => problems.push('入口の扉が開かない'));
check((await dun()).opened === true, '扉を開けると「この手番に扉を開けた」になる（部屋を済ませると手番が終わる）');
await wait(2500);
await clearRoom();
await A.locator('[data-dungeon-controls="ready"]').waitFor({ timeout: 4000 }).catch(() => {});
await wait(400);
const doorsA = A.locator('[data-door-choice]');
const doorsB = B.locator('[data-door-choice]');
check((await doorsA.count()) >= 1, `P1 に扉のボタンが出る（${(await doorsA.allInnerTexts()).map((t) => t.split('\n').slice(0, 2).join('・')).join(' / ')}）`);
check((await doorsB.count()) >= 1, 'P2 にも扉のボタンが出る');
// 扉の数は並び次第（2026-11-13 の並びの直しで、翠の神殿の最初の部屋の先は扉3つになった）。絵の扉とボタンが同じ数・同じ並びかを見る
const nDoors = await doorsA.count();
await sameDoors(A, `P1 扉${nDoors}つ`, nDoors);
await sameDoors(B, `P2 扉${nDoors}つ`, nDoors);
await shot(A, '4-doors-P1');
await shot(B, '4-doors-P2');
await layout(A, '扉のボタン（P1）');
await layout(B, '扉のボタン（P2）');

// ===== 3. 周囲の警戒: P2 が自分のキャラのフォーカス1で（手番のキャラは P1）。2台とも先読みが見える =====
check((await A.locator('[data-door-detail]').count()) === 0, '警戒の前は、扉の中身は出ない');
await B.locator('[data-scout-open]').click();
await B.locator('[data-scout-panel]').waitFor({ timeout: 3000 }).catch(() => {});
check((await B.locator('[data-scout-hero]').count()) === 1 && (await B.locator(`[data-scout-hero="${h2}"]`).count()) === 1, 'P2 の警戒の窓には、P2 のキャラだけが出る');
await shot(B, '4b-scout-panel-P2');
await layout(B, '警戒の窓（P2）');
const f0 = (await A.evaluate(() => window.__online.game())).heroes.find((h) => h.id === h2).focus;
await B.locator(`[data-scout-hero="${h2}"]`).click();
await until(async () => (await dun())?.watchedAt !== undefined, 6000, 'scouted').catch(() => {});
const f1 = (await A.evaluate(() => window.__online.game())).heroes.find((h) => h.id === h2).focus;
check(f1 === f0 - 1, `P2 のキャラのフォーカスが1減る（${f0} → ${f1}）`);
await wait(600);
check((await A.locator('[data-door-detail]').count()) >= 1 && (await B.locator('[data-door-detail]').count()) >= 1, '警戒の後、2台とも扉の中身（敵の名前など）が見える');
check((await A.locator('[data-door-beyond]').count()) === nDoors, `「その先」の扉の色も見える（P1・扉${nDoors}つ分）`);
check((await A.locator('[data-scout-open]').count()) === 0, '同じ通路では、もう警戒できない');
await shot(A, '4c-scouted-P1');
await layout(A, '警戒の後（P1）');

// ===== 4. P2 が扉を押す → P1 の画面にピン。2人が同じ（右の）扉を選ぶと開く =====
if (await doorsB.count()) {
  await doorsB.last().click();
  await until(async () => (await A.locator('[data-pin-banner]').count()) > 0, 5000, 'pin on A').catch(() => {});
  check((await A.locator('[data-pin-banner]').count()) > 0, 'P2 が扉のボタンを押すと、P1 に「P2: こっち！」');
  await shot(A, '5-pin-from-P2');
}
const before = await dun();
const target = (await doorsA.last().getAttribute('data-door-choice')) ?? '';
check((await dun()).currentRoomId === before.currentRoomId, 'P2 だけが選んだ時はまだ開かない');
await doorsA.last().click();
const openSeen = await A.locator('[data-door-open][data-door-open-slot="right"]').waitFor({ timeout: 4000 }).then(() => true, () => false);
check(openSeen, '右の扉へ寄って開く演出が出る（P1）');
if (openSeen) await shot(A, '6-door-opening-P1');
await until(async () => (await dun())?.currentRoomId === target, 8000, 'entered target').catch(() => {});
check((await dun()).currentRoomId === target, '2人が同じ扉を選ぶと、その扉が開く');
await wait(2500);
await clearRoom();
await wait(400);
check((await A.locator('[data-door-choice]:not([disabled])').count()) >= 1, '部屋を済ませたら、すぐ次の扉を選べる（全員がダンジョンの中）');
check((await A.locator('[data-scout-bar]').getAttribute('data-scout-bar').catch(() => null)) === 'none', '次の通路では、警戒は消えている（また警戒できる）');
await shot(A, '7-next-corridor-P1');
await layout(A, '次の通路（P1）');
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

// ===== 5. 合流（抜本的な見直し §1-4・オーナーの決定 5-B）: P1 が先に入り、P2 が後から合流 → タブ1つ・顔2人・扉の投票が2人分 =====
{
  // 2人を入口のマスに戻す（同行はしていない）。P1 のキャラの番
  const g = structuredClone(g0);
  const w = g.world;
  const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
  for (const h of g.heroes) {
    w.pos[h.id] = t;
    h.lastRandomEvent = w.worldTurn;
    h.focus = 3;
  }
  w.follow = undefined;
  w.turn = h1;
  w.acted = [];
  w.move = null;
  w.story = undefined;
  w.wanderers = [];
  w.visitedRegions = Array.from({ length: 200 }, (_, i) => i);
  await inject(g);
  for (const p of [A, B]) await closeStory(p);
}
const game = () => A.evaluate(() => window.__online.game());
const tabs = (p) => p.locator('[role="tablist"] [role="tab"]').count();
// P1 だけが先に入る（画面のボタンで）
await A.locator('[data-interact]').waitFor({ timeout: 8000 }).catch(() => {});
check(((await A.locator('[data-interact]').innerText().catch(() => '')) || '').includes('翠の神殿に入る'), 'P1: 先に入る人のボタンは「翠の神殿に入る」');
await A.locator('[data-interact]').click();
await until(async () => ((await game()).expeditions?.length ?? 0) === 1, 8000, 'P1 entered').catch(() => {});
let gj = await game();
check(gj.expeditions?.length === 1 && gj.expeditions[0].heroes.join() === h1, 'P1 のキャラだけがダンジョンに入った');
check(gj.world.turn === h2, '次は P2 のキャラの番（世界マップ）');
for (const p of [A, B]) await closeStory(p);
// P2 の画面: 「〇〇たちに合流する（翠の神殿）」
await B.locator('[data-interact]').waitFor({ timeout: 8000 }).catch(() => {});
const joinLabel = (await B.locator('[data-interact]').innerText().catch(() => '')) || '';
check(joinLabel.includes('合流する') && joinLabel.includes('翠の神殿'), `P2: ボタンが「〇〇たちに合流する（翠の神殿）」になる（${joinLabel.replace(/\n/g, ' ')}）`);
await shot(B, '12-join-button-P2');
await layout(B, '合流のボタン（P2）');
// 先の組が通路にいない時（休憩中）は断られる: 手番も侵食度も変わらない
{
  const g = await game();
  g.expeditions[0].mode = 'rest';
  await inject(g);
  for (const p of [A, B]) await closeStory(p);
}
const c0 = (await game()).world.corruption;
await B.locator('[data-interact]').click();
await wait(900);
gj = await game();
check(gj.expeditions[0].heroes.length === 1 && gj.world.turn === h2 && gj.world.corruption === c0, '先の組が休憩中の時は合流できず、手番も侵食度も変わらない');
check((await B.getByText(/終わってから合流しよう/).count()) > 0, 'P2 に「〇〇たちは今、休憩中です。終わってから合流しよう」と出る');
await shot(B, '13-join-refused-P2');
// 通路に戻ったら合流できる
{
  const g = await game();
  g.expeditions[0].mode = 'dungeon';
  await inject(g);
  for (const p of [A, B]) await closeStory(p);
}
await B.locator('[data-interact]').click();
await until(async () => ((await game()).expeditions?.[0]?.heroes.length ?? 0) === 2, 8000, 'joined').catch(() => {});
gj = await game();
check(gj.expeditions.length === 1, '合流しても、組（場面）は1つのまま');
check(gj.expeditions[0].heroes.join() === [h1, h2].join(), '先の組に P2 のキャラが加わる（後から来た人は末尾）');
check(gj.world.corruption >= c0 + 2, `合流でも侵食度 +2%（${c0} → ${gj.world.corruption}）`);
await wait(1200);
for (const p of [A, B]) await closeStory(p);
// 2台とも: タブは1つ・顔は2人・扉のボタン
for (const [p, n] of [[A, 'P1'], [B, 'P2']]) {
  await p.locator('[data-door-choice]').first().waitFor({ timeout: 8000 }).catch(() => {});
  check((await p.locator('[data-door-choice]').count()) >= 1, `${n}: 合流の後、ダンジョンの扉の画面が出る`);
  check((await tabs(p)) === 1, `${n}: 場面のタブは1つ（「翠の神殿」が2つに分かれない。今 ${await tabs(p)}）`);
  check((await p.locator('[data-dungeon-bar] button[aria-label*="HP"]').count()) === 2, `${n}: 下の顔の列が2人`);
}
await shot(A, '14-joined-P1');
await shot(B, '14-joined-P2');
await layout(A, '合流の後（P1）');
await layout(B, '合流の後（P2）');
// 扉の投票が2人分: P1 だけでは開かず、票の様子に2人の名前。P2 も選ぶと開く
const room0 = (await dun()).currentRoomId;
await A.locator('[data-door-choice]').first().click();
await wait(900);
check((await dun()).currentRoomId === room0, '合流の後: P1 だけが扉を選んでも開かない（2人分の投票）');
const voteRows = await B.locator('[data-vote-status] > div').count();
check(voteRows === 3, `P2 の票の様子に2人分の行が出る（見出し1＋2人。今 ${voteRows}）`);
await shot(B, '15-vote-two-P2');
await B.locator('[data-door-choice]').first().click();
await until(async () => (await dun())?.currentRoomId !== room0, 8000, 'opened by two').catch(() => {});
check((await dun()).currentRoomId !== room0, '合流の後: 2人が同じ扉を選ぶと開く');
await wait(2500);
const battle = (await game()).expeditions[0].battle;
check(!!battle && battle.allies.length === 2, `合流した人も、次の戦闘に参加する（味方 ${battle?.allies.length ?? 0}人）`);
await shot(A, '16-battle-two-P1');

await browser.close();
if (problems.length) {
  console.log(`\n問題 ${problems.length}件:\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`\n${WIDTH}: すべてOK`);
