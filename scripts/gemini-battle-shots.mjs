// Gemini に戦闘の見た目を相談するための写真と動画を撮る（確認ではなく素材づくり）
// 使い方: npx vite build && npx vite preview --port 4199 を起こしてから
//   URL=http://127.0.0.1:4199/card-rpg/ node scripts/gemini-battle-shots.mjs
import { mkdirSync, readdirSync, renameSync } from 'node:fs';
import { chromium, confirmEndTurn, startBattle } from './lib.mjs';

const dir = 'screenshots/gemini-battle';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();

async function run(tag, party, enemies) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
    recordVideo: { dir: `${dir}/video-tmp-${tag}`, size: { width: 390, height: 844 } },
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const shot = (n) => page.screenshot({ path: `${dir}/${tag}-${n}.png` });
  await startBattle(page, party, enemies, false);
  await page.locator('[data-card-index]').first().waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await shot('01-start');
  // カードを1枚選ぶ（狙う敵のチップが出るカードを探す）
  const n = await page.locator('[data-card-index]').count();
  let picked = false;
  for (let i = 0; i < n && !picked; i++) {
    const c = page.locator(`[data-card-index="${i}"]`);
    const box = await c.boundingBox();
    if (!box) continue;
    await page.mouse.click(box.x + 12, box.y + 80);
    await page.waitForTimeout(250);
    if (await page.locator('[data-target-chip]').count()) picked = true;
    else await page.getByLabel('キャンセル').click().catch(() => {});
  }
  await shot('02-card-selected');
  // 使う（決定のボタンを探す）
  // 狙う敵を選んでから「発動」
  await page.locator('[data-target-chip]').first().click().catch(() => {});
  await page.waitForTimeout(300);
  await shot('02b-target-chosen');
  await page.getByRole('button', { name: /発動/ }).first().click().catch(() => {});
  for (const [i, ms] of [[1, 150], [2, 250], [3, 350], [4, 500], [5, 700], [6, 900]]) { await page.waitForTimeout(ms); await shot(`03-attack-${i}`); }
  await page.waitForTimeout(1200);
  await shot('04-after-attack');
  // ターン終了 → 敵の番
  await page.getByRole('button', { name: /ターン終了/ }).first().click().catch(() => {});
  await confirmEndTurn(page);
  for (const [i, ms] of [[1, 400], [2, 700], [3, 900], [4, 1200]]) { await page.waitForTimeout(ms); await shot(`05-enemy-${i}`); }
  await page.waitForTimeout(2500);
  await shot('06-next-turn');
  await ctx.close();
  const vd = `${dir}/video-tmp-${tag}`;
  const f = readdirSync(vd)[0];
  if (f) renameSync(`${vd}/${f}`, `${dir}/${tag}-video.webm`);
}

await run('2p', 2, ['forestWolf', 'treeWarden', 'toxicShroom']);
await run('4p', 4, ['treeWarden', 'chaosShaman', 'forestWolf', 'toxicShroom']);
await browser.close();
console.log('撮影おわり:', dir);
