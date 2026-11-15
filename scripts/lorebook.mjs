// 伝承の書（K5）の画面の確認:
//  1) 記録が空の時: タイトル →「伝承の書」→ 6つのタブが開き、見ていない物は「？？？」で押せない
//  2) 冒険を始めると、最初のジョブ・山札が記録される（冒険の状態は変えない）
//  3) 記録を入れた状態で、各タブの一覧と詳細が 360/390/480px で崩れない
//  4) 冒険の準備の画面（クリアの記録を渡しても、条件の無いシナリオは鍵のまま）
//  5) うちの子図鑑・マイペット: 登録 → スタートの町で30Gで呼ぶ → 全滅の画面に記録
// 使い方: npx vite preview を起こしてから node scripts/lorebook.mjs
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

const OUT = process.env.LOREBOOK_OUTPUT ?? 'scripts/screenshots';
const browser = await chromium.launch();
let failed = false;
const TABS = ['pets', 'jobs', 'cards', 'items', 'enemies', 'record'];

for (const width of [360, 390, 480]) {
  const page = await browser.newPage({ viewport: { width, height: 780 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (n) => page.screenshot({ path: `${OUT}/lore-${width}-${n}.png` });
  const ng = async (msg) => {
    failed = true;
    console.error(`NG（${width}px）:`, msg);
    await shot('fail');
  };
  const check = async (where) => {
    const list = await layoutIssues(page);
    if (list.length) await ng(`${where}の表示の問題: ${JSON.stringify(list)}`);
  };
  const openBook = async () => {
    await page.getByText('伝承の書', { exact: true }).click();
    await page.locator('[data-lorebook]').waitFor();
  };

  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false }));
  });
  await page.reload();

  // 1) 空の記録
  await openBook();
  if (await page.locator('[data-lore-cell="seen"], [data-lore-cell="got"]').count()) await ng('空の記録なのに見た物がある');
  if (!(await page.locator('[data-lore-cell="none"]').count())) await ng('「？？？」の枠が無い');
  await shot('empty');
  await check('空の伝承の書');
  await page.getByLabel('閉じる').click();

  // 2) 冒険を始めると記録される
  await page.getByText('新しい冒険').click();
  await page.getByText('1人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(800);
  const prof = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/profile') ?? 'null'));
  if (!prof || !prof.jobs.got.length || !prof.cards.got.length || prof.adventures !== 1) await ng(`冒険を始めても記録されない: ${JSON.stringify(prof && { jobs: prof.jobs, adventures: prof.adventures })}`);

  // 3) 記録を入れてから、各タブ
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('card-rpg/profile'));
    p.pets = { seen: ['cockatiel:normal', 'cockatiel:lutino', 'owl:brown'], got: ['cockatiel:normal'] };
    p.enemies.seen.push('goblinScout');
    p.enemies.kills = { goblinScout: 3 };
    p.clears = { corruptionKing: 1 };
    localStorage.setItem('card-rpg/profile', JSON.stringify(p));
  });
  await page.goto(URL);
  await openBook();
  for (const tab of TABS) {
    await page.locator(`[data-lore-tab="${tab}"]`).click();
    await page.waitForTimeout(150);
    await shot(`${tab}`);
    await check(`伝承の書「${tab}」`);
    const cell = page.locator('[data-lore-cell="got"], [data-lore-cell="seen"]').first();
    if (tab !== 'record') {
      if (!(await cell.count())) {
        await ng(`「${tab}」に記録した物が出ない`);
        continue;
      }
      await cell.click();
      await page.locator('[data-lore-detail]').waitFor();
      await shot(`${tab}-detail`);
      await check(`伝承の書「${tab}」の詳細`);
      await page.locator('[data-lore-detail]').getByText('閉じる', { exact: true }).click();
    }
  }
  // 4) 冒険の準備: 2026-11-16 オーナーの決定で、今は全シナリオを無条件で遊べる（OPEN_ALL_SCENARIOS）。鍵が1つも付いていない事を見る
  await page.getByLabel('閉じる').click();
  await page.getByText('新しい冒険').click();
  // 保存がある時はゲーム内の確認が出る（フェーズ3）
  if (await page.getByRole('dialog').count()) await page.getByRole('dialog').getByText('上書きして始める', { exact: true }).click();
  await page.locator('[data-scenarios]').waitFor();
  if (await page.locator('[data-scenario-lock]').count()) await ng('全シナリオが開いているはずなのに、鍵の付いたシナリオがある');
  await shot('setup');
  await check('冒険の準備');
  // 5) うちの子図鑑・マイペット: 登録できる子を入れて、登録 → スタートの町で呼ぶ → 全滅の画面に記録
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('card-rpg/profile'));
    p.uchinoko = [
      { uid: 'k5-pii', petId: 'cockatiel', color: 'lutino', name: 'ぴーちゃん', love: 130, scenarioId: 'corruptionKing', runs: { r1: { acts: 4, dc: 1, end: 'ending' } } },
      { uid: 'k5-hoo', petId: 'owl', color: 'brown', name: 'ほー', love: 20, scenarioId: 'corruptionKing', runs: { r1: { acts: 1, dc: 1 } } },
    ];
    p.myPets = [];
    localStorage.setItem('card-rpg/profile', JSON.stringify(p));
  });
  await page.goto(URL);
  await openBook();
  if ((await page.locator('[data-uchinoko-row]').count()) !== 2) await ng('うちの子図鑑に2匹出ない');
  await page.locator('[data-uchinoko-row="k5-pii"]').click();
  await page.locator('[data-uchinoko-detail]').waitFor();
  await shot('uchinoko-detail');
  await check('うちの子の詳細');
  await page.locator('[data-mypet-toggle="on"]').click();
  await page.locator('[data-lore-detail]').getByText('閉じる', { exact: true }).click();
  await page.locator('[data-uchinoko-row="k5-hoo"]').click();
  if (await page.locator('[data-mypet-toggle="on"]').count()) await ng('条件を満たさない子に登録ボタンが出る');
  await page.locator('[data-lore-detail]').getByText('閉じる', { exact: true }).click();
  if (!(await page.locator('[data-mypet="k5-pii"]').count())) await ng('マイペットの列に出ない');
  await shot('mypets');
  await check('マイペット');
  await page.getByLabel('閉じる').click();
  await page.getByText('新しい冒険').click();
  await page.getByText('1人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(500);
  // スタートの町（王都）に入った所から
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
  await edit((g) => {
    g.world.story = undefined;
    g.mode = 'town';
    g.town = { townId: 'royalCapital', heroId: g.heroes[0].id };
    g.heroes[0].gold = 100;
  });
  if (!(await page.locator('[data-mypet-call]').count())) await ng('スタートの町に「マイペットを呼ぶ」が出ない');
  else {
    await page.locator('[data-mypet-call] button').first().click();
    await shot('town-call');
    await check('町のマイペットを呼ぶ');
    await page.locator('[data-mypet-pick="k5-pii"]').click();
    await page.waitForTimeout(400);
    const pet = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.heroes[0]);
    if (pet.pet?.myPetUid !== 'k5-pii' || pet.gold !== 70) await ng(`マイペットが来ない: ${JSON.stringify({ pet: pet.pet, gold: pet.gold })}`);
    if (await page.locator('[data-mypet-call]').count()) await ng('呼んだ後も「マイペットを呼ぶ」が残る');
    await shot('town-after');
  }
  // 全滅の画面: うちの子図鑑に記録しました
  await edit((g) => {
    g.mode = 'gameover';
    g.town = undefined;
  });
  if (!(await page.locator('[data-end-pet-record]').count())) await ng('全滅の画面に、うちの子の記録が出ない');
  await shot('gameover');
  await check('全滅の画面');
  if (errors.length) await ng(`ページのエラー: ${errors.join(' / ')}`);
  await page.close();
}
await browser.close();
if (failed) process.exit(1);
console.log('OK: 伝承の書（360/390/480px）');
