// 移動のサイコロの写真（世界マップ）: 振る前（目安）→ 転がっている所 → 目が出た所（＋素早さ）→ 振り直し
// 使い方: npx vite build && npx vite preview --port 4173 を起こしてから node scripts/dice-shots.mjs（URL・DICE_SHOTS_OUTPUT で変更可）
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

const OUT = process.env.DICE_SHOTS_OUTPUT ?? 'screenshots/dice';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const problems = [];
for (const [width, height] of [[390, 844], [360, 640]]) {
  const tag = `${width}x${height}`;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => problems.push(`${tag}: 画面の例外 ${e}`));
  const shot = (n) => page.screenshot({ path: `${OUT}/${tag}-${n}.png` });
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: false, vibration: false, firstGuide: false }));
  });
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText('キャラクター作成へ').click();
  // 素早さのボーナスが見えるように、素早さの高い職（盗賊）を選ぶ
  await page.getByText('盗賊', { exact: true }).first().click().catch(() => {});
  await depart(page);
  await page.waitForTimeout(400);
  for (let i = 0; i < 4 && (await page.getByText('タップで続ける').count()); i++) {
    await page.getByText('タップで続ける').first().click();
    await page.waitForTimeout(250);
  }
  // フォーカスを持たせて、振り直しを見せる
  await page.evaluate(() => {
    const k = 'card-rpg/adventure';
    const d = JSON.parse(localStorage.getItem(k));
    for (const h of d.game.heroes) h.focus = Math.max(h.focus, 2);
    localStorage.setItem(k, JSON.stringify(d));
  });
  await page.reload();
  await page.getByText('つづきから').click();
  await page.waitForTimeout(600);
  for (let i = 0; i < 4 && (await page.getByText('タップで続ける').count()); i++) {
    await page.getByText('タップで続ける').first().click();
    await page.waitForTimeout(250);
  }
  const roll = page.locator('[data-roll-move]');
  await roll.waitFor({ timeout: 5000 }).catch(() => problems.push(`${tag}: 「サイコロを振る」が無い`));
  if (!(await page.locator('[data-dice-preview]').count())) problems.push(`${tag}: 振る前の目安が無い`);
  // 物語・手番の帯などが重なっていたら、タップで閉じる
  for (let i = 0; i < 8; i++) {
    if (await roll.click({ trial: true, timeout: 800 }).then(() => true, () => false)) break;
    const next = page.getByRole('button', { name: 'つづける', exact: true });
    if (await next.count()) await next.first().click().catch(() => {});
    else await page.mouse.click(width / 2, height / 3);
    await page.waitForTimeout(400);
  }
  await shot('1-before');
  await roll.click();
  const overlay = page.locator('[data-dice-overlay]');
  if ((await overlay.getAttribute('data-dice-overlay', { timeout: 800 }).catch(() => null)) !== 'rolling') problems.push(`${tag}: サイコロが転がらない`);
  await page.waitForTimeout(450);
  await shot('2-rolling');
  await page.locator('[data-dice-overlay="done"]').waitFor({ timeout: 3000 }).catch(() => problems.push(`${tag}: 目が出ない`));
  await page.waitForTimeout(300);
  const bonus = await page.locator('[data-dice-bonus]').allInnerTexts();
  console.log(`${tag}: ボーナス ${bonus.join(' ') || 'なし'}・合計 ${await page.locator('[data-dice-total]').innerText()}`);
  await shot('3-result');
  const list = await layoutIssues(page);
  if (list.length) problems.push(`${tag} 目が出た所: ${list.join(' / ')}`);
  await overlay.waitFor({ state: 'detached', timeout: 4000 }).catch(() => problems.push(`${tag}: サイコロの表示が消えない`));
  await shot('4-panel');
  const reroll = page.locator('[data-reroll]');
  if (!(await reroll.count())) problems.push(`${tag}: 振り直しのボタンが無い`);
  else {
    await reroll.click();
    await page.locator('[data-dice-overlay="done"]').waitFor({ timeout: 3000 }).catch(() => problems.push(`${tag}: 振り直しの目が出ない`));
    await page.waitForTimeout(300);
    await shot('5-reroll');
    await overlay.waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
    if (await page.locator('[data-reroll]').count()) problems.push(`${tag}: 2回目の振り直しができてしまう`);
  }
  await page.close();
}
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: 移動のサイコロ（振る前・転がる・目・振り直し）');
