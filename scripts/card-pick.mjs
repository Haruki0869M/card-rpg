// カードを「押してから決める」の確認（フェーズ3 項目2）。360/390/480px で:
//  1) 戦闘の報酬: めくった後にカードを押しても選ばれず、説明の窓が出る → 別のカードに切り替わる → 窓の外で閉じる →「このカードを選ぶ」で山札に入る
//  2) 町の店: 値段のボタンを押しても買わず、説明の窓が出る →「〇〇Gで買う」で買う（お金が減って山札に入る）
// 使い方: vite preview を起こしてから node scripts/card-pick.mjs（URL=... で場所を変えられる）
import { chromium, layoutIssues, startBattle } from './lib.mjs';

const browser = await chromium.launch();
let failed = false;
const ng = (msg) => { failed = true; console.error('NG:', msg); };
const save = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')));
const load = async (page, d) => {
  await page.evaluate((x) => localStorage.setItem('card-rpg/adventure', JSON.stringify(x)), d);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(400);
};
const issues = async (page, where) => {
  const list = await layoutIssues(page);
  if (list.length) ng(`${where}の表示の問題: ${list.join(' / ')}`);
};
// 窓が画面の中に収まっているか（下にはみ出していないか）
const panelFits = (page) => page.locator('[data-card-pick-panel]').evaluate((e) => {
  const r = e.querySelector('[data-card-pick-action]').getBoundingClientRect();
  return r.bottom <= innerHeight + 1 && r.top >= 0;
});

for (const width of [360, 390, 480]) {
  const height = width === 360 ? 640 : 844;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => ng(`${width}px pageerror: ${e.message}`));
  const shot = (n) => page.screenshot({ path: `scripts/screenshots/card-pick-${n}-${width}.png` });

  // ---- 1) 戦闘の報酬 ----
  await startBattle(page, 1, ['forestWolf']);
  const d = await save(page);
  const g = d.game;
  const e = g.expeditions?.find((x) => x.battle) ?? g;
  const h = g.heroes[0];
  e.mode = 'reward';
  delete e.battle;
  e.reward = { gold: 12, exp: [], levelUps: [], cardOffers: ['lanceCharge', 'cmPrepare', 'warCry'].map((cardId) => ({ cardId, heroId: h.id })), cardDone: [], cardOdds: [70, 25, 5], cardPicked: false, loot: [] };
  const deckBefore = h.deck.length;
  await load(page, d);
  if (!(await page.getByText(/の山札に1枚加える/).count())) { ng(`${width}px: 報酬の画面が出ない`); await shot('fail'); await page.close(); continue; }
  // めくる（タップで飛ばす）→ 1枚目を押す
  await page.locator('[data-pick-card="0"]').click();
  await page.waitForTimeout(300);
  if (!(await page.locator('[data-card-pick-panel]').count())) {
    await page.locator('[data-pick-card="0"]').click();
    await page.waitForTimeout(300);
  }
  let s = await save(page);
  if ((s.game.expeditions?.find((x) => x.reward) ?? s.game).reward?.cardDone?.length) ng(`${width}px: カードを1回押しただけで選ばれた`);
  if (!(await page.locator('[data-card-pick-panel="lanceCharge"]').count())) ng(`${width}px: 押しても説明の窓が出ない`);
  else {
    const sum = await page.locator('[data-card-summary]').innerText();
    if (!sum.trim()) ng(`${width}px: ひとことの説明が空`);
    if (!(await panelFits(page))) ng(`${width}px: 報酬の「このカードを選ぶ」が画面からはみ出す`);
    await shot('reward');
    await issues(page, `${width}px 報酬の窓`);
  }
  // 別のカードを押すと切り替わる
  await page.locator('[data-pick-card="1"]').click();
  await page.waitForTimeout(250);
  if (!(await page.locator('[data-card-pick-panel="cmPrepare"]').count())) ng(`${width}px: 別のカードに切り替わらない`);
  // 窓の外（題の文字）を押すと閉じる
  await page.getByText(/の山札に1枚加える/).click();
  await page.waitForTimeout(250);
  if (await page.locator('[data-card-pick-panel]').count()) ng(`${width}px: 窓の外を押しても閉じない`);
  // 選ぶ
  await page.locator('[data-pick-card="2"]').click();
  await page.waitForTimeout(250);
  await page.locator('[data-card-pick-action]').click();
  await page.waitForTimeout(400);
  s = await save(page);
  const hero = s.game.heroes[0];
  if (hero.deck.length !== deckBefore + 1 || hero.deck.at(-1).cardId !== 'warCry') ng(`${width}px: 「このカードを選ぶ」で山札に入らない`);

  // ---- 2) 町の店 ----
  const d2 = structuredClone(d);
  const g2 = d2.game;
  // 報酬の前の世界マップへ戻し、王都に入る
  g2.expeditions = [];
  g2.mode = 'world';
  delete g2.dungeon; delete g2.party; delete g2.battle;
  g2.world.story = undefined;
  const town = g2.world.tiles.findIndex((t) => t.f && t.f.kind === 'town' && t.f.id === 'royalCapital');
  if (town >= 0) g2.world.pos[g2.heroes[0].id] = town;
  g2.heroes[0].gold = 900;
  // 店の品揃えを決めておく（このキャラのカードを2枚）
  g2.world.shops = {};
  await load(page, d2);
  const enter = page.getByText(/に入る$/).first();
  if (await enter.count()) await enter.click();
  await page.waitForTimeout(400);
  s = await save(page);
  if (s.game.mode !== 'town') { ng(`${width}px: 町に入れない（${s.game.mode}）`); await shot('fail'); await page.close(); continue; }
  const shopCards = page.locator('[data-town-body] button[data-pick-card]:not([aria-pressed])');
  if (!(await shopCards.count())) { ng(`${width}px: 店にこのキャラのカードが無い`); await page.close(); continue; }
  const goldBefore = s.game.heroes[0].gold;
  const deck2 = s.game.heroes[0].deck.length;
  await shopCards.first().scrollIntoViewIfNeeded();
  await shopCards.first().click(); // 値段のボタン
  await page.waitForTimeout(300);
  s = await save(page);
  if (s.game.heroes[0].gold !== goldBefore) ng(`${width}px: 値段のボタンだけで買えてしまう`);
  if (!(await page.locator('[data-card-pick-panel]').count())) ng(`${width}px: 店で説明の窓が出ない`);
  else {
    if (!(await panelFits(page))) ng(`${width}px: 店の「〇〇Gで買う」が画面からはみ出す`);
    await shot('shop');
    await issues(page, `${width}px 店の窓`);
    await page.locator('[data-card-pick-action]').click();
    await page.waitForTimeout(400);
    s = await save(page);
    if (s.game.heroes[0].gold >= goldBefore || s.game.heroes[0].deck.length !== deck2 + 1) ng(`${width}px: 「〇〇Gで買う」で買えない`);
  }
  console.log(`${width}px: 報酬と店の説明の窓 ${failed ? 'NG あり' : 'OK'}`);
  await page.close();
}
await browser.close();
if (failed) process.exit(1);
console.log('OK: カードを押してから決める（報酬・店）');
