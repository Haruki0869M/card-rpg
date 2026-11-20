// 手番のカットインの画面確認（docs/archive/tasks/turn-cutin.md）
// 1台2人で、世界マップの P1→P2 の受け渡し（大きなカットイン・「スマホを P2 さんに渡してください」・自動で消える）、
// タップですぐ消せること、世界マップ→ダンジョンの組の番（カットインの後ろでダンジョンに切り替わっている）を、360/390/480px で確かめる。
// 使い方: npx vite build && npx vite preview --port 4173 を起こしてから node scripts/turn-cutin.mjs（URL で変更可）
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

const OUT = process.env.TURN_CUTIN_OUTPUT ?? 'screenshots/turn-cutin';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const problems = [];

async function run(width) {
  const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (n) => page.screenshot({ path: `${OUT}/${width}-${n}.png` });
  const ng = (m) => problems.push(`${width}px: ${m}`);
  const cutin = page.locator('[data-turn-cutin]');
  // 世界マップの受け渡しの画面（1台で担当が分かれている時。元からある）を閉じる
  const startTurn = async () => {
    const h = page.getByLabel('手番を始める');
    await h.waitFor({ timeout: 3000 }).catch(() => {});
    if (await h.count()) await h.click();
    await page.waitForTimeout(200);
  };
  const edit = async (fn) => {
    await page.evaluate((src) => {
      const k = 'card-rpg/adventure';
      const d = JSON.parse(localStorage.getItem(k));
      (0, eval)(src)(d.game);
      localStorage.setItem(k, JSON.stringify(d));
    }, fn.toString());
    await page.reload();
    await page.getByText('つづきから').click();
    await page.waitForTimeout(300);
  };
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false }));
  });
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText('2人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(300);
  // 2人目の担当を P2 にする（作成画面の初期値は全員 P1 = 1人で全員を操作）
  await edit((g) => {
    g.world.story = undefined;
    g.world.turn = 'h0';
    g.world.acted = [];
    g.heroes[1].playerId = 'P2';
  });
  if (await cutin.count()) ng('始めた直後（手番が変わっていない）にカットインが出た');
  // フェーズ2-C: 1台で担当が P1→P2 に変わる時は、カットインを出さず、受け渡しの画面（カットインと同じ見た目）1枚だけ
  const handoffScreen = page.getByLabel('手番を始める');
  const watchNoCutin = async (label) => {
    for (let i = 0; i < 12; i++) { if (await cutin.count()) { ng(`${label}: 受け渡しの画面と一緒にカットインも出た`); break; } await page.waitForTimeout(40); }
  };
  await page.getByText('待機', { exact: true }).click();
  await handoffScreen.waitFor({ timeout: 3000 }).catch(() => ng('P2の番の受け渡しの画面が出ない'));
  await watchNoCutin('P1→P2');
  await page.waitForTimeout(350);
  await shot('1-p2-handoff');
  const text = (await handoffScreen.innerText().catch(() => '')).replace(/\s+/g, ' ');
  if (!text.includes('の番！')) ng(`受け渡しの画面の文言: ${text}`);
  if (!text.includes('スマホを P2 さんに渡してください')) ng('受け渡しの画面に渡す相手の一言が無い');
  if (!text.includes('スマホを渡して、タップで始める')) ng('受け渡しの画面に「タップで始める」が無い');
  if ((await page.getByLabel('手番を始める').count()) !== 1) ng('受け渡しの画面が1枚ではない');
  const issues = await layoutIssues(page);
  if (issues.length) ng(`受け渡しの画面の表示: ${issues.join(' / ')}`);
  // 自動では消えない（盗み見を防ぐため、タップで始める）
  await page.waitForTimeout(1600);
  if (!(await handoffScreen.count())) ng('受け渡しの画面が自動で消えた');
  await startTurn();
  if (await handoffScreen.count()) ng('タップしても受け渡しの画面が消えない');
  // P2 が待機 → P1 の番も同じ（受け渡しの画面だけ）
  await page.getByText('待機', { exact: true }).click();
  await handoffScreen.waitFor({ timeout: 3000 }).catch(() => ng('P1の番の受け渡しの画面が出ない'));
  await watchNoCutin('P2→P1');
  await startTurn();
  // ダンジョン: P1 が1人で翠の神殿に入る → P2 の番（世界マップ）→ P2 が待機 → P1 の番はダンジョンの中
  await edit((g) => {
    const w = g.world;
    const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
    w.pos.h0 = t;
    w.pos.h1 = t === 0 ? 1 : 0;
    w.turn = 'h0';
    w.acted = [];
    g.world.follow = undefined;
  });
  await startTurn();
  await page.getByText('翠の神殿に入る').click();
  // 入った後は世界マップの P2 の番（1台で担当が変わる → 受け渡しの画面だけ）
  await handoffScreen.waitFor({ timeout: 3000 }).catch(() => ng('ダンジョンに入った後のP2の番の受け渡しの画面が出ない'));
  await cutin.click().catch(() => {});
  await cutin.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
  await startTurn();
  // P2 の画面（世界マップ）で待機
  if (!(await page.getByText('待機', { exact: true }).count())) await page.getByText('世界マップ').first().click().catch(() => {});
  await page.getByText('待機', { exact: true }).click();
  await cutin.waitFor({ timeout: 3000 }).catch(() => ng('ダンジョンの組の番のカットインが出ない'));
  await page.waitForTimeout(350);
  await shot('2-dungeon-turn');
  const t2 = (await cutin.innerText().catch(() => '')).replace(/\s+/g, ' ');
  if (!t2.includes('翠の神殿')) ng(`ダンジョンの番の場所が出ない: ${t2}`);
  if (!t2.includes('スマホを P1 さんに渡してください')) ng('ダンジョンの番で1台で回す時の一言が無い');
  if (!(await page.locator('[data-dungeon-view]').count())) ng('カットインの後ろでダンジョンの画面に切り替わっていない');
  await cutin.waitFor({ state: 'detached', timeout: 3000 }).catch(() => ng('ダンジョンの番のカットインが消えない'));
  await shot('3-dungeon-after');
  if (errors.length) ng(`画面の例外 ${errors.join(' / ')}`);
  await page.close();
  console.log(`${width}px: 確認済み`);
}

for (const w of [360, 390, 480]) await run(w);
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: 手番の表示（1台で担当が変わる時は受け渡しの画面1枚・タップで始める・ダンジョンの組の番のカットイン）360/390/480px');
