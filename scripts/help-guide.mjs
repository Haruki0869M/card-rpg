// 遊び方・用語集（Step A ③）と、はじめての戦闘の案内（Step A ④）の画面の確認（360×640 / 390×844 / 480×860）:
//  1) タイトルの「遊び方」で開く → 項目 → 戻る（Android の戻る = 履歴を戻す）で目次 → もう一度で閉じる。用語集も開く
//  2) 世界マップ: 侵食度・🔥 を押すと、その説明が開く（侵食度は一番上に今の値と次の段階）。メニュー →「遊び方・用語集」→ 閉じるとメニューに戻る
//  3) ダンジョン: メニューから開ける
//  4) 戦闘: はじめての案内 ① → カードを選ぶと ② → 1枚使うと ③。上のバーの 侵食度・🔥 とメニューからも開ける
//  5) どこで開いても、冒険の保存（card-rpg/adventure）は変わらない
//  6) 2回目の戦闘（新しい冒険の戦闘）では案内が出ない。設定でONにすると出て、× で閉じると OFF に戻る
//  7) 表示の問題（はみ出し・小さいボタン・12px未満の文字）が無い
// 使い方: npx vite preview を起こしてから node scripts/help-guide.mjs
import { chromium, depart, layoutIssues, URL, waitForBattlePresentation } from './lib.mjs';

const OUT = process.env.HELP_OUTPUT ?? 'scripts/screenshots';
const SIZES = (process.env.HELP_SIZES ? JSON.parse(process.env.HELP_SIZES) : [[360, 640], [390, 844], [480, 860]]);
const SAVE = 'card-rpg/adventure';
const browser = await chromium.launch();
let failed = false;

for (const [width, height] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (n) => page.screenshot({ path: `${OUT}/help-${width}-${n}.png` });
  const ng = async (msg) => {
    failed = true;
    console.error(`NG（${width}px）:`, msg);
    await shot(`fail-${Date.now() % 100000}`).catch(() => {});
  };
  const check = async (where) => {
    const list = await layoutIssues(page);
    if (list.length) await ng(`${where}の表示の問題: ${JSON.stringify(list)}`);
  };
  const helpIs = (v) => page.locator(`[data-help="${v}"]`).waitFor({ timeout: 3000 }).then(() => true, () => false);
  const helpClosed = async () => (await page.locator('[data-help]').count()) === 0;
  const save = () => page.evaluate((k) => localStorage.getItem(k), SAVE);
  /** 開く → 中身の確認 → 閉じる。保存が変わらないことも確かめる */
  const openAndClose = async (where, open, topic, close = 'x') => {
    const before = await save();
    await open();
    if (!(await helpIs(topic))) return ng(`${where}: 「${topic}」が開かない`);
    await shot(`${where}-${topic}`);
    await check(`${where}の「${topic}」`);
    if (topic === 'corruption' && !(await page.locator('[data-help-corruption-now]').count())) await ng(`${where}: 侵食度の説明の上に今の値が無い`);
    if (close === 'back') await page.goBack();
    else await page.locator('[data-help-close]').click();
    await page.waitForTimeout(150);
    if (!(await helpClosed())) await ng(`${where}: 閉じても説明が残っている`);
    if ((await save()) !== before) await ng(`${where}: 説明を開いただけで冒険の保存が変わった`);
  };

  // 冒険を始めて、翠の神殿の入口へ（settings は消さない = 案内の設定はそのまま）
  const newAdventure = async () => {
    await page.goto(URL);
    if (await page.getByText('つづきから').count()) {
      await page.getByText('新しい冒険').click();
      await page.getByText('上書きして始める').click();
    } else await page.getByText('新しい冒険').click();
    await page.getByText('1人', { exact: true }).click();
    await page.getByText('キャラクター作成へ').click();
    await depart(page);
    await page.waitForTimeout(300);
    await page.evaluate((k) => {
      const d = JSON.parse(localStorage.getItem(k));
      const w = d.game.world;
      const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple');
      for (const id of Object.keys(w.pos)) w.pos[id] = t;
      w.story = undefined;
      localStorage.setItem(k, JSON.stringify(d));
    }, SAVE);
    await page.reload();
    await page.getByText('つづきから').click();
    await page.getByText('翠の神殿に入る').waitFor();
  };
  const enterDungeon = async () => {
    await page.getByText('翠の神殿に入る').click();
    await page.waitForTimeout(200);
    if (await page.locator('[data-explore-roll-button]').count()) await page.locator('[data-explore-roll-button]').click();
    await page.waitForTimeout(200);
  };
  const openDoor = async () => {
    await page.getByRole('button', { name: /扉を開ける/ }).click();
    await page.locator('[data-card-index]').first().waitFor({ timeout: 8000 });
    await waitForBattlePresentation(page);
    await page.waitForTimeout(1000); // 敵が出てくる動きが終わるまで（はみ出しの確認が動きの途中を拾わないように）
  };
  const guideStep = async () => page.locator('[data-first-guide]').getAttribute('data-first-guide', { timeout: 1500 }).catch(() => null);

  try {
    await page.goto(URL);
    await page.evaluate(() => {
      localStorage.clear();
      // 案内の設定は入れない（この端末で初めて = 最初の戦闘で案内が出る）
      localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false }));
    });
    await page.reload();

    // 1) タイトル
    await page.getByText('遊び方', { exact: true }).click();
    if (!(await helpIs('index'))) await ng('タイトルから目次が開かない');
    await shot('title-index');
    await check('タイトルの目次');
    await page.locator('[data-help-topic="dungeon"]').click();
    if (!(await helpIs('dungeon'))) await ng('目次から「ダンジョンと扉」が開かない');
    await check('ダンジョンと扉');
    await shot('title-dungeon');
    await page.goBack();
    if (!(await helpIs('index'))) await ng('戻るで目次に戻らない');
    await page.locator('[data-help-topic="glossary"]').click();
    if (!(await helpIs('glossary'))) await ng('用語集が開かない');
    await shot('title-glossary');
    await check('用語集');
    await page.goBack();
    await page.goBack();
    await page.waitForTimeout(150);
    if (!(await helpClosed())) await ng('戻る2回でタイトルに戻らない');
    if (!(await page.getByText('新しい冒険').isVisible())) await ng('閉じた後にタイトルが見えない');

    // 2) 世界マップ
    await newAdventure();
    await openAndClose('world', () => page.locator('[data-help-open="corruption"]').click(), 'corruption');
    await openAndClose('world', () => page.locator('[data-help-open="lives"]').click(), 'lives', 'back');
    await page.getByLabel('メニュー', { exact: true }).click();
    await openAndClose('world-menu', () => page.locator('[data-menu-help]').click(), 'index', 'back');
    if (!(await page.locator('[data-menu-help]').isVisible())) await ng('遊び方を閉じたらメニューに戻らない');
    await page.getByLabel('閉じる', { exact: true }).click();

    // 3) ダンジョン
    await enterDungeon();
    await page.getByLabel('メニュー', { exact: true }).click();
    await openAndClose('dungeon-menu', () => page.locator('[data-menu-help]').click(), 'index');
    await page.getByLabel('閉じる', { exact: true }).click();

    // 4) 最初の戦闘
    await openDoor();
    if ((await guideStep()) !== '1') await ng(`最初の戦闘で案内①が出ない（${await guideStep()}）`);
    await shot('guide-1');
    await check('案内①');
    await openAndClose('battle', () => page.locator('[data-help-open="corruption"]').click(), 'corruption');
    await openAndClose('battle', () => page.locator('[data-help-open="lives"]').click(), 'lives', 'back');
    await page.getByLabel('メニュー', { exact: true }).click();
    await openAndClose('battle-menu', () => page.locator('[data-menu-help]').click(), 'index');
    await page.getByLabel('閉じる', { exact: true }).click();
    await page.waitForTimeout(500); // メニューが閉じる動きの間は、下の画面を押せない
    if ((await guideStep()) !== '1') await ng('説明を閉じたら案内が消えた');

    // カードを選ぶ（敵を狙うカードは敵をタップ。案内は押すのを邪魔しない）
    const card = page.locator('[data-card-index][data-usable]').first();
    const box = await card.boundingBox();
    await page.mouse.click(box.x + Math.min(16, box.width / 2), box.y + Math.min(70, box.height / 2));
    await page.waitForTimeout(250);
    if ((await guideStep()) !== '2') await ng(`カードを選んでも案内②にならない（${await guideStep()}・発動ボタン${await page.locator('button:has-text("発動")').count()}・押した所 ${JSON.stringify(box)}・詳細 ${await page.locator('[data-detail-popup], [role="tooltip"]').count()}）`);
    if (await page.locator('[data-target-guide]').count()) {
      await page.locator('[data-enemy]:not([data-dead])').first().click();
      await page.waitForTimeout(150);
    }
    await shot('guide-2');
    await check('案内②');
    await page.locator('button:has-text("発動")').click();
    await waitForBattlePresentation(page);
    await page.waitForTimeout(300);
    if ((await guideStep()) !== '3') await ng(`カードを使っても案内③にならない（${await guideStep()}）`);
    await shot('guide-3');
    await check('案内③');
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/settings')));
    if (st.firstGuide !== false) await ng(`③まで見ても設定が済みにならない: ${JSON.stringify(st)}`);

    // 6) 2回目の戦闘（新しい冒険の最初の戦闘）では出ない
    await newAdventure();
    await enterDungeon();
    await openDoor();
    if (await page.locator('[data-first-guide]').count()) await ng('2回目の戦闘でも案内が出た');
    // 設定で ON にすると、次の戦闘で出る → × で閉じると OFF
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('card-rpg/settings'));
      localStorage.setItem('card-rpg/settings', JSON.stringify({ ...s, firstGuide: true }));
    });
    await page.reload();
    await page.getByText('つづきから').click();
    await page.locator('[data-card-index]').first().waitFor();
    if ((await guideStep()) !== '1') await ng('設定をONにしても案内が出ない');
    await page.locator('[data-first-guide-close]').click();
    await page.waitForTimeout(300);
    if (await page.locator('[data-first-guide]').count()) await ng('× で案内が消えない');
    const st2 = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/settings')));
    if (st2.firstGuide !== false) await ng(`× で閉じても設定が OFF にならない: ${JSON.stringify(st2)}`);
    await page.getByLabel('メニュー', { exact: true }).click();
    if ((await page.locator('[data-setting-first-guide]').textContent())?.includes('ON')) await ng('メニューの「はじめての案内」が ON のまま');
    await page.getByLabel('閉じる', { exact: true }).click();
  } catch (e) {
    await ng(`途中で止まった: ${e.message.split('\n')[0]}`);
  }
  if (errors.length) await ng(`画面のエラー: ${errors.join(' / ')}`);
  await ctx.close();
  if (!failed) console.log(`OK（${width}×${height}）`);
}
await browser.close();
if (failed) {
  console.error('help-guide: 失敗あり');
  process.exit(1);
}
console.log('help-guide: すべて成功');
