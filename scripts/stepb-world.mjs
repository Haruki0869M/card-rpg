// ステップB（世界マップ・全滅）の画面確認
// 1. 全滅の画面: 命の灯火が残っている時は「命の灯火を1つ灯し、〇〇へ退却します（残り灯火：🔥×3 → 🔥×2 ／ HP50%で復帰）」と
//    「町で態勢を立て直す」。押すと世界マップに戻り、灯火が1つ減る。灯火が無い時は今までどおり「全滅…」「冒険の結果へ」→ 結果の画面。
// 2. 1人で全員を操作する時（担当が全員 P1）の世界マップの手番の帯は、約0.5秒で消える。
// 360/390/480px で確かめる。使い方: npx vite build && npx vite preview を起こしてから node scripts/stepb-world.mjs（URL で変更可）
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL, depart, startBattle } from './lib.mjs';

const OUT = process.env.STEPB_OUTPUT ?? 'screenshots/stepb-world';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const problems = [];
const KEY = 'card-rpg/adventure';

async function edit(page, fn, arg) {
  await page.evaluate(({ src, arg, KEY }) => {
    const d = JSON.parse(localStorage.getItem(KEY));
    (0, eval)(src)(d.game, arg);
    localStorage.setItem(KEY, JSON.stringify(d));
  }, { src: fn.toString(), arg, KEY });
  await page.reload();
  await page.getByText('つづきから').click();
  await page.waitForTimeout(500);
}
const saved = (page) => page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY))?.game, KEY);

/** 戦闘を始めて、全員が倒れた形にする（lives を指定） */
async function wipe(page, lives) {
  await startBattle(page, 2, ['goblinScout']);
  await edit(page, (g, lives) => {
    g.lives = lives;
    const b = (g.expeditions?.[0]?.battle ?? g.battle);
    for (const a of b.allies) { a.dead = true; a.hp = 0; }
    b.phase = 'defeat';
  }, lives);
}

async function checkWipe(width) {
  const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const ng = (m) => problems.push(`${width}px 全滅: ${m}`);
  // --- 灯火が残っている ---
  await wipe(page, 3);
  const box = page.locator('[data-defeat-retreat]');
  await box.waitFor({ timeout: 5000 }).catch(() => ng('灯火が残っているのに退却の説明が出ない'));
  const text = (await box.innerText().catch(() => '')).replace(/\s+/g, '');
  if (!/^命の灯火を1つ灯し、.+へ退却します（残り灯火：🔥×3→🔥×2／HP50%で復帰）$/.test(text)) ng(`退却の説明の文言: ${text}`);
  if (await page.getByText('全滅…', { exact: true }).count()) ng('灯火が残っているのに「全滅…」と出た');
  if (await page.getByText('冒険の結果へ').count()) ng('灯火が残っているのに「冒険の結果へ」が出た');
  const btn = page.locator('[data-result-button]');
  if ((await btn.innerText().catch(() => '')).trim() !== '町で態勢を立て直す') ng(`ボタンの文言: ${await btn.innerText().catch(() => '')}`);
  const issues = await layoutIssues(page);
  if (issues.length) ng(`退却の画面の表示: ${issues.join(' / ')}`);
  await page.screenshot({ path: `${OUT}/${width}-wipe-lives.png` });
  // 町の名前が、実際に目を覚ます町と同じか（押した後の位置で確かめる）
  const town = text.match(/灯し、(.+)へ退却/)?.[1];
  await btn.click();
  await page.waitForTimeout(800);
  const g = await saved(page);
  if (g?.lives !== 2) ng(`押した後の灯火が2ではない: ${g?.lives}`);
  if (g?.mode === 'gameover') ng('押した後にゲームオーバーになった');
  const tile = g?.world?.tiles?.[g.world.pos.h0];
  if (tile?.f?.kind !== 'town') ng('押した後、町にいない');
  const hp = g?.heroes?.[0];
  if (hp && hp.hp <= 0) ng('押した後、HPが0');
  await page.screenshot({ path: `${OUT}/${width}-wipe-lives-after.png` });
  const shownName = await page.evaluate((id) => document.body.innerText.includes(id), town ?? '');
  if (town && !shownName) {
    // 町の中の画面か世界マップに町の名前が出ていれば同じ町。出ていなければ、保存データの町の id と照らす
    problems.push(`${width}px 全滅: 押した後の画面に「${town}」が見当たらない（町: ${tile?.f?.id}）`);
  }
  // --- 灯火が無い（本当のゲームオーバー） ---
  await wipe(page, 0);
  await page.getByText('全滅…', { exact: true }).waitFor({ timeout: 5000 }).catch(() => ng('灯火が無いのに「全滅…」が出ない'));
  if (await page.locator('[data-defeat-retreat]').count()) ng('灯火が無いのに退却の説明が出た');
  if ((await page.locator('[data-result-button]').innerText().catch(() => '')).trim() !== '冒険の結果へ') ng('灯火が無いのに「冒険の結果へ」ではない');
  const issues2 = await layoutIssues(page);
  if (issues2.length) ng(`全滅の画面の表示: ${issues2.join(' / ')}`);
  await page.screenshot({ path: `${OUT}/${width}-wipe-gameover.png` });
  await page.locator('[data-result-button]').click();
  await page.getByText('タイトルへ').waitFor({ timeout: 5000 }).catch(() => ng('「冒険の結果へ」の後に結果の画面が出ない'));
  await page.screenshot({ path: `${OUT}/${width}-gameover-screen.png` });
  if (errors.length) ng(`ページのエラー: ${errors.join(' / ')}`);
  await page.close();
}

async function checkSoloCutin(width) {
  const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
  const ng = (m) => problems.push(`${width}px 手番の帯: ${m}`);
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
  await edit(page, (g) => { g.world.story = undefined; g.world.turn = 'h0'; g.world.acted = []; });
  const cutin = page.locator('[data-turn-cutin]');
  await page.getByText('待機', { exact: true }).click();
  const t0 = Date.now();
  await cutin.waitFor({ timeout: 2000 }).catch(() => ng('1人操作で手番が移っても帯が出ない'));
  await page.screenshot({ path: `${OUT}/${width}-solo-cutin.png` });
  await cutin.waitFor({ state: 'detached', timeout: 3000 }).catch(() => ng('帯が消えない'));
  const ms = Date.now() - t0;
  // 0.5秒 ＋ 消える演出・確認の遅れ。1台を回す時の 1.2秒 より明らかに短いこと
  if (ms > 1000) ng(`帯が消えるまで ${ms}ms（約0.5秒のはず）`);
  console.log(`${width}px 1人操作の帯: ${ms}ms`);
  await page.close();
}

for (const w of [360, 390, 480]) {
  await checkWipe(w);
  await checkSoloCutin(w);
}
await browser.close();
if (problems.length) {
  console.log('問題あり:\n' + problems.join('\n'));
  process.exit(1);
}
console.log(`ステップB（世界マップ・全滅）の画面確認: 問題なし（${OUT}）`);
