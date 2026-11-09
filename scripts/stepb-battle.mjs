// ステップB（戦闘の画面）の確認: 360×640・390×844・480×860 で
// 1) 敵を狙うカードを選ぶと、狙う敵のチップが生きている敵の数だけ出る（敵4体）
// 2) チップを押しても、敵の絵を押しても、狙う敵が変わる
// 3) 予測の文字「HP 45 → 12」、倒せる時は「→ 撃破！」（HP1の敵を作って確かめる）
// 4) 「スマホを回して」の時だけ、上に「P2（キャラ名）を操作中」。1人で全員を操作する時は出ない
// 5) 戦闘不能の味方の枠に「戦闘不能・勝てばHP1」、詳細に「戦闘不能（勝利でHP1復帰…）」
// 6) それぞれの場面で layoutIssues（はみ出し・小さいボタン・小さい文字）が無い
// 使い方: npx vite build && npx vite preview を起こしてから node scripts/stepb-battle.mjs（URL=... で場所を変えられる）
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, startBattle } from './lib.mjs';

const SIZES = [
  [360, 640],
  [390, 844],
  [480, 860],
];
const ENEMIES = ['treeWarden', 'chaosShaman', 'forestWolf', 'toxicShroom'];
const KEY = 'card-rpg/adventure';
mkdirSync('scripts/screenshots', { recursive: true });
const browser = await chromium.launch();
let page;
let width = 0;
let errors = [];
const shot = (n) => page.screenshot({ path: `scripts/screenshots/stepb-${n}-${width}.png` });
const fail = async (msg) => {
  await shot('fail').catch(() => {});
  if (errors.length) console.error('画面のエラー:', errors.slice(-3).join(' / '));
  console.error('NG:', `${width}px:`, msg);
  await browser.close();
  process.exit(1);
};
const checkLayout = async (what) => {
  const issues = await layoutIssues(page);
  if (issues.length) await fail(`${what}の表示の問題: ${issues.join(' / ')}`);
};
/** 保存データの戦闘を書き換えて、読み直す */
const editBattle = async (fn) => {
  await page.evaluate(
    ({ k, src }) => {
      const d = JSON.parse(localStorage.getItem(k));
      const x = d.game.expeditions?.[0] ?? d.game;
      (0, eval)(src)(d.game, x.battle);
      localStorage.setItem(k, JSON.stringify(d));
    },
    { k: KEY, src: fn.toString() },
  );
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(500);
  // ダンジョンの番の受け渡し（スマホを回して遊ぶ時）が出たら閉じる
  for (const t of ['スマホを渡して、タップで始める', 'タップで始める']) {
    const h = page.getByText(t);
    if (await h.count()) await h.first().click().catch(() => {});
  }
  await page.locator('[data-card-index]').first().waitFor({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
};
/** 敵を狙うカードを選ぶ（チップが出るまで手札を順に押す） */
const pickEnemyCard = async () => {
  const n = await page.locator('[data-card-index]').count();
  for (let i = 0; i < n; i++) {
    const c = page.locator(`[data-card-index="${i}"]`);
    if (!(await c.count())) break;
    const box = await c.boundingBox();
    await page.mouse.click(box.x + 12, box.y + 80);
    await page.waitForTimeout(150);
    // ダメージの無いカード（挑発など）は飛ばす。予測に「→」がある＝ダメージのあるカード
    const preds = await page.locator('[data-target-chip]').evaluateAll((els) => els.map((e) => e.getAttribute('data-chip-prediction')));
    if (preds.some((t) => t?.includes('→'))) return true;
    await page.getByLabel('キャンセル').click().catch(() => {});
    await page.waitForTimeout(100);
  }
  return false;
};
const selectedChip = () => page.locator('[data-chip-selected]').getAttribute('data-target-chip').catch(() => null);

for (const [w, h] of SIZES) {
  width = w;
  errors = [];
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await startBattle(page, 4, ENEMIES);
  // 「スマホを回して」の担当（P1〜P4）にし、最後の敵をHP1にする（撃破の予測を見るため）
  await editBattle((g, b) => {
    g.heroes.forEach((x, i) => (x.playerId = `P${i + 1}`));
    b.allies.forEach((a) => (a.playerId = g.heroes.find((x) => x.id === a.id)?.playerId ?? a.playerId));
    b.enemies[b.enemies.length - 1].hp = 1;
  });
  await shot('field');
  await checkLayout('戦闘の始め（敵4体）');

  // ----- 4) 操作中のラベル -----
  const label = page.locator('[data-seat-label]');
  if (!(await label.count())) await fail('スマホを回して遊ぶ時に「操作中」のラベルが出ない');
  const labelText = (await label.textContent()) ?? '';
  if (!/^P1（.+）を操作中$/.test(labelText)) await fail(`操作中のラベルの文字が違う: ${labelText}`);
  // 2人目に切り替えると P2 になる
  await page.locator('[data-ally]').nth(1).click();
  await page.waitForTimeout(150);
  const label2 = (await label.textContent()) ?? '';
  if (!/^P2（.+）を操作中$/.test(label2)) await fail(`2人目を選んだ時のラベルが違う: ${label2}`);
  await page.locator('[data-ally]').nth(0).click();
  await page.waitForTimeout(150);

  // ----- 1) チップ -----
  if (!(await pickEnemyCard())) await fail('敵を狙うカードを選んでもチップが出ない');
  const chips = page.locator('[data-target-chip]');
  const alive = await page.locator('[data-enemy]:not([data-dead])').count();
  if ((await chips.count()) !== alive) await fail(`チップの数（${await chips.count()}）が生きている敵の数（${alive}）と違う`);
  await shot('chips');
  await checkLayout('狙う敵のチップ');
  // チップが横にはみ出していない・押せる大きさ
  for (let i = 0; i < alive; i++) {
    const b = await chips.nth(i).boundingBox();
    if (!b || b.x < 0 || b.x + b.width > w + 1) await fail(`チップ${i + 1}が画面からはみ出している`);
    if (b.height < 43.5) await fail(`チップ${i + 1}が低すぎる（${b.height}px）`);
  }

  // ----- 2) チップを押す・敵の絵を押す -----
  const ids = await chips.evaluateAll((els) => els.map((e) => e.getAttribute('data-target-chip')));
  await chips.nth(1).click();
  await page.waitForTimeout(120);
  if ((await selectedChip()) !== ids[1]) await fail('チップを押しても狙う敵が変わらない');
  const ring = await page.locator(`[data-enemy="${ids[1]}"]`).count();
  if (!ring) await fail('チップの敵が戦場に見つからない');
  // 敵の絵を押す
  const enemy = page.locator(`[data-enemy="${ids[2]}"]`);
  const eb = await enemy.boundingBox();
  await page.mouse.click(eb.x + eb.width / 2, eb.y + eb.height * 0.35);
  await page.waitForTimeout(150);
  if ((await selectedChip()) !== ids[2]) await fail('敵の絵を押しても、チップの選択が変わらない');
  if (!(await page.locator('[data-target-guide]').textContent())?.includes('選択中')) await fail('敵の絵を押した後、選択中の表示が無い');

  // ----- 3) 予測の文字 -----
  const texts = await chips.evaluateAll((els) => els.map((e) => e.getAttribute('data-chip-prediction')));
  const last = texts[texts.length - 1];
  if (!/^HP 1 → 撃破！$/.test(last)) await fail(`HP1の敵の予測が「撃破！」でない: ${last}`);
  if (!texts.slice(0, -1).every((t) => /^HP \d+( → \d+(〜\d+)?)?$|^HP \d+ → 撃破/.test(t))) await fail(`予測の文字の形が違う: ${texts.join(' / ')}`);
  // パネルの予測（選んだ敵の行）とチップの数字が同じ考え方か: 選んだ敵のチップの減り = パネルの数字の中にある
  console.log(`${w}px チップ:`, texts.join(' / '));
  await chips.nth(texts.length - 1).click();
  await page.waitForTimeout(120);
  await shot('kill');
  await page.getByLabel('キャンセル').click();
  await page.waitForTimeout(120);

  // ----- 5) 戦闘不能の味方 -----
  await editBattle((g, b) => {
    b.allies[1].dead = true;
    b.allies[1].hp = 0;
  });
  const note = page.locator('[data-ally]').nth(1).locator('[data-fallen-note]');
  if (!(await note.count())) await fail('戦闘不能の味方の枠に説明が無い');
  const noteText = ((await note.textContent()) ?? '').replace(/\s/g, '');
  if (noteText !== '戦闘不能勝てばHP1') await fail(`戦闘不能の枠の文字が違う: ${noteText}`);
  await shot('fallen');
  await checkLayout('戦闘不能の味方');
  // 長押しで詳細 → 全文
  const ally = page.locator('[data-ally]').nth(1);
  const ab = await ally.boundingBox();
  await page.mouse.move(ab.x + ab.width / 2, ab.y + ab.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(250);
  const detail = page.locator('[data-fallen-detail]');
  if (!(await detail.count())) await fail('戦闘不能の味方の詳細に全文が無い');
  if (!((await detail.textContent()) ?? '').startsWith('戦闘不能（勝利でHP1復帰')) await fail('詳細の全文が違う');
  await shot('fallen-detail');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ----- 4') 1人で全員を操作する時は、ラベルが出ない -----
  await editBattle((g, b) => {
    g.heroes.forEach((x) => (x.playerId = 'P1'));
    b.allies.forEach((a) => (a.playerId = 'P1'));
  });
  if (await page.locator('[data-seat-label]').count()) await fail('1人で全員を操作する時にも「操作中」のラベルが出ている');

  if (errors.length) await fail(`画面のエラー: ${errors.join(' / ')}`);
  console.log(`${w}x${h}: OK`);
  await ctx.close();
}
await browser.close();
console.log('stepb-battle: すべてOK');
