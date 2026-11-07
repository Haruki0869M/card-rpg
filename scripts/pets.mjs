// お供と突発イベントの画面の確認:
//  1) 突発イベント「迷い鳥の口笛」→ エサ（50G）で迎える → 色と名前を選ぶ → 世界マップの肩に乗っている
//  2) パーティ画面のお供の欄で撫でる（フォーカス+1）
//  3) 戦闘で足元・肩にお供が出る（オカメインコの先読み「次:」）
// 使い方: npx vite preview を起こしてから node scripts/pets.mjs
import { chromium, layoutIssues, URL } from './lib.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 });
const shot = (n) => page.screenshot({ path: `scripts/screenshots/pet-${n}.png` });
const fail = async (msg) => {
  await shot('fail');
  console.error('NG:', msg);
  await browser.close();
  process.exit(1);
};
const issues = async (where) => {
  const list = await layoutIssues(page);
  if (list.length) console.log(`${where}の表示の問題:`, list);
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
  localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false }));
});
await page.reload();
await page.getByText('新しい冒険').click();
await page.getByText('1人', { exact: true }).click();
await page.getByText('キャラクター作成へ').click();
await page.getByText('冒険に出発').click();
await page.waitForTimeout(300);

// 1) 突発イベント
await edit((g) => {
  g.world.story = undefined;
  const h = g.heroes[0];
  h.gold = 200;
  g.mode = 'event';
  g.party = [h.id];
  g.event = { tile: g.world.pos[h.id], eventId: 'rStrayBird', random: true };
});
await page.waitForTimeout(500);
await shot('event');
await issues('突発イベント');
await page.getByText('エサを買って分けてあげる').click();
await page.waitForTimeout(300);
await page.getByText('先へ進む').click();
await page.waitForTimeout(300);
if (!(await page.locator('[data-hero-task]').count())) await fail('お供を迎える画面が出ない');
await shot('adopt');
await issues('お供を迎える画面');
const colorBtn = page.locator('[data-hero-task] button').filter({ hasText: /ルチノー|桜|黄緑|ほんのり/ }).first();
if (await colorBtn.count()) await colorBtn.click();
await page.getByLabel('お供の名前').fill('ぴーちゃん');
await page.getByText('お供にする').click();
await page.waitForTimeout(400);
if (await page.locator('[data-hero-task]').count()) await fail('お供を迎える画面が閉じない');
if (!(await page.locator('[data-hero] [data-pet]').count())) await fail('世界マップにお供が出ない');
await shot('map');

// 2) 撫でる
await page.locator('[data-party-row] button').first().click();
await page.waitForTimeout(200);
if (!(await page.locator('[data-pet-panel]').count())) await fail('パーティ画面にお供の欄が出ない');
await page.locator('[data-pet-panel] button').click();
await page.waitForTimeout(200);
await shot('panel');
await issues('パーティ画面のお供');
const after = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.heroes[0].pet);
if (!after?.patted || after.love <= 0) await fail('撫でても懐かない');

// 3) 戦闘（オカメインコにして先読みを見る）
await edit((g) => {
  const h = g.heroes[0];
  h.pet.petId = 'cockatiel';
  h.pet.color = 'lutino';
  const w = g.world;
  const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
  w.pos[h.id] = t;
});
await page.getByText('翠の神殿に入る').click();
await page.waitForTimeout(300);
if (await page.getByText('探索力の判定').count()) await page.getByText('探索力の判定').click();
await page.waitForTimeout(200);
await page.getByLabel('戦闘').first().click();
await page.getByText('この部屋へ進む').click();
await page.waitForTimeout(800);
await shot('battle');
await issues('戦闘');
if (!(await page.locator('[data-pet]').count())) await fail('戦闘にお供が出ない');
if (!(await page.locator('[data-foresee]').count())) await fail('先読みの「次:」が出ない');
console.log(`OK: ${after.name}（${after.petId}）・懐き度${after.love}・戦闘で先読み`);
await browser.close();
