// 寄り道の値打ち（2026-11-14 docs/tasks/detour-value-plan.md §3）のオンライン2人の確認（エミュレーター）:
// - ランダムダンジョンの黄金箱: 2台とも秘宝の3択が出る。1人だけ選んでも決まらず、相手には「みんなの選択を待っています」。
//   2人が別々の物を選ぶと、開けた人（P1）の選んだ物に決まる。その後の取り合いも2台で進む（だれも止まらない）
// - 制覇の画面: 2台とも「抜け道を通る」「入口へ戻る」。2人が抜け道を選ぶと、2人とも次の目的地の近くのマスに出る
// - 2台とも、重なり・はみ出し・12px 未満の字が無い
// 事前に: npx vite build && npx vite preview --port <番号> --host 127.0.0.1 &   と   npm run emulators &（127.0.0.1:9000/9099）
// 使い方: URL=http://127.0.0.1:<番号>/card-rpg/ WIDTH=360 node scripts/detour-coop.mjs（WIDTH は 360・390）
import { mkdirSync } from 'node:fs';
import { chromium, URL, layoutIssues } from './lib.mjs';

const EMU = process.env.EMU_HOST ?? '127.0.0.1';
const WIDTH = Number(process.env.WIDTH ?? 390);
const HEIGHT = WIDTH <= 360 ? 640 : 844;
const OUT = process.env.DETOUR_COOP_OUTPUT ?? 'screenshots/detour-coop';
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
    if (!localStorage.getItem('card-rpg/settings')) localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false, overviewHintSeen: true }));
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
  await wait(900);
}
const send = async (page, cmd) => {
  const err = await page.evaluate((c) => window.__online.send(c), cmd);
  if (err) throw new Error(`${cmd.type}: ${err}`);
  await wait(700);
};
const closeStory = async (p) => {
  for (let i = 0; i < 4 && (await p.getByText('タップで続ける').count()); i++) {
    await p.getByText('タップで続ける').first().click();
    await wait(250);
  }
};
const layout = async (page, name) => {
  const issues = (await layoutIssues(page)).filter((s) => !s.startsWith('small button: ""'));
  check(issues.length === 0, `${name} の表示の崩れなし${issues.length ? `（${issues.slice(0, 4).join(' / ')}）` : ''}`);
};
const exp = async () => (await A.evaluate(() => window.__online.game())).expeditions?.[0];

// ---- 2人をランダムダンジョンの入口に置き、P2 は P1 に同行して一緒に入る ----
let rdTile;
{
  const g = structuredClone(g0);
  const w = g.world;
  rdTile = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'randomForest');
  for (const h of g.heroes) {
    w.pos[h.id] = rdTile;
    h.lastRandomEvent = w.worldTurn;
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
await until(async () => !!(await exp()), 10000, 'enter random dungeon');
for (const p of [A, B]) await closeStory(p);
check((await exp()).heroes.length === 2, '2人で同じ組としてランダムダンジョンに入った');

// ---- 黄金箱の前（開け役 = P1）にして、P1 が開ける ----
{
  const g = await A.evaluate(() => window.__online.game());
  const x = g.expeditions[0];
  const boss = x.dungeon.rooms.find((r) => r.row === 4);
  for (const r of x.dungeon.rooms) r.cleared = r.row < 4;
  x.dungeon.currentRoomId = boss.id;
  x.mode = 'chest';
  x.vote = undefined;
  x.chest = { roomId: boss.id, spec: { rarity: 'legend', locked: false, big: true }, unlocked: true, opener: h1 };
  g.rngState = 777;
  await inject(g);
}
await A.getByText('運のスロットで開ける').click();
const pickerOn = async (p) => {
  for (let k = 0; k < 30 && !(await p.locator('[data-relic-picker]').count()); k++) {
    await p.mouse.click(WIDTH / 2, 80);
    await wait(250);
  }
  return (await p.locator('[data-relic-option]').count()) === 3;
};
check(await pickerOn(A), 'P1 に秘宝の3択（3つ）が出る');
check(await pickerOn(B), 'P2 にも秘宝の3択（3つ）が出る');
await shot(A, '1-relic-P1');
await shot(B, '1-relic-P2');
await layout(A, '秘宝の3択（P1）');
await layout(B, '秘宝の3択（P2）');
const pickOn = async (p, i) => {
  await p.locator('[data-relic-option]').nth(i).click();
  await wait(300);
  await p.locator('[data-item-pick-action]').click();
  await wait(900);
};
// P1 だけ選ぶ → まだ決まらない。P2 の画面に、票の様子
await pickOn(A, 0);
check((await exp()).chest.relicPicked === undefined, 'P1 だけが選んだ時は、まだ決まらない');
check((await B.locator('[data-vote-status]').count()) > 0, 'P2 の画面に「みんなの選択を待っています」の枠が出る');
check((await B.locator('[data-relic-option] [aria-label*="P1"]').count()) > 0, 'P2 の画面の候補に、P1 の選んだ印が出る');
await shot(B, '2-relic-waiting-P2');
await layout(B, '秘宝の票の待ち（P2）');
// P2 は別の物 → 1対1 → 開けた人（P1）の選んだ物
await pickOn(B, 2);
await until(async () => (await exp()).chest.relicPicked !== undefined, 8000, 'relic decided').catch(() => {});
const c1 = (await exp()).chest;
check(c1.relicPicked === 0, `2人が別々の物を選ぶと、開けた人の選んだ物に決まる（relicPicked=${c1.relicPicked}）`);
check(!!c1.claims?.some((cl) => cl.item.uid === c1.relics[0].uid), '選んだ秘宝が取り合いに入る');
// 取り合い: 2人とも「余れば」
for (let k = 0; k < 8; k++) {
  const x = await exp();
  if (!x?.chest?.claims?.some((cl) => !cl.rolls)) break;
  const i = x.chest.claims.findIndex((cl) => !cl.rolls);
  for (const [p, pid, hid] of [[A, 'P1', h1], [B, 'P2', h2]]) {
    if (!x.chest.claims[i].choices[hid]) await send(p, { type: 'SCENE', scene: x.id, command: { type: 'CLAIM_LOOT', playerId: pid, heroId: hid, choice: 'greed', index: i } }).catch(() => {});
  }
}
check(!(await exp()).chest.claims.some((cl) => !cl.rolls), '取り合いが2台で最後まで進む');
await wait(600);
// 先へ進む（みんなで決める）
for (const p of [A, B]) {
  const b = p.getByRole('button', { name: /ダンジョン制覇！/ });
  await b.waitFor({ timeout: 5000 }).catch(() => {});
  if (await b.count()) await b.click();
  await wait(700);
}
await until(async () => (await exp())?.mode === 'cleared', 8000, 'cleared').catch(() => {});
check((await exp())?.mode === 'cleared', '2人が「ダンジョン制覇！」を押すと、制覇の画面へ');

// ---- 制覇の画面: 抜け道（みんなで決める） ----
for (const [p, n] of [[A, 'P1'], [B, 'P2']]) {
  await p.locator('[data-shortcut]').waitFor({ timeout: 5000 }).catch(() => {});
  check((await p.locator('[data-shortcut]').count()) === 1, `${n} に「抜け道を通る」が出る`);
  check((await p.getByRole('button', { name: /入口へ戻る/ }).count()) === 1, `${n} に「入口へ戻る」が出る`);
}
await shot(A, '3-cleared-P1');
await shot(B, '3-cleared-P2');
await layout(A, '制覇の画面（P1）');
await layout(B, '制覇の画面（P2）');
await A.locator('[data-shortcut]').click();
await wait(900);
check(!!(await exp()), 'P1 だけが抜け道を選んだ時は、まだ出ない');
check((await B.locator('[data-vote-status]').count()) > 0, 'P2 の画面に票の様子が出る');
await shot(B, '4-shortcut-waiting-P2');
await B.locator('[data-shortcut]').click();
await until(async () => !(await exp()), 8000, 'left dungeon').catch(() => {});
const g2 = await A.evaluate(() => window.__online.game());
const gB = await B.evaluate(() => window.__online.game());
check(!g2.expeditions?.length, '2人が抜け道を選ぶと、ダンジョンを出る');
check(g2.world.pos[h1] === g2.world.pos[h2] && g2.world.pos[h1] !== rdTile, `2人とも、入口とは別の同じマスに出る（${rdTile} → ${g2.world.pos[h1]}）`);
check(gB.world.pos[h1] === g2.world.pos[h1], 'P2 の端末でも同じマス');
check((g2.world.insight ?? []).length === 1, '見破りが1つ付く');
await wait(600);
await shot(A, '5-after-P1');
await shot(B, '5-after-P2');

await browser.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else console.log(`detour-coop: OK（${WIDTH}）`);
