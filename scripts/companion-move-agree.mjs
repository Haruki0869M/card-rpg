// 1台を回して遊ぶ時、P2 の番に担当の違う仲間を誘って連れて動けるか（移動先の提案への「一緒に行く」）。
// 2人・3人・4人で、P2 が全員を誘う → 移動力の判定 → 行き先 → 移動する → 確認なしで全員が同じマスへ動く（フェーズ2-C。オンラインの同意は単体テストと online.mjs で見る）。
// 使い方: npx vite build && npx vite preview を起こしてから URL=... node scripts/companion-move-agree.mjs
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues, URL, waitForWorldMovement, depart } from './lib.mjs';
const dir = 'screenshots/companion-move-agree'; await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const check = (ok, text) => { if (!ok) throw new Error(text); };

async function run(n) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const toasts = [];
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game);
  const handoff = async () => { if (await page.getByRole('button', { name: '手番を始める' }).count()) { await page.getByRole('button', { name: '手番を始める' }).click(); await page.waitForTimeout(300); } };
  try {
    await page.goto(URL);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false })); });
    await page.reload();
    await page.getByText('新しい冒険').click();
    await page.getByText(`${n}人`, { exact: true }).click();
    await page.getByText('キャラクター作成へ').click();
    await depart(page);
    await page.waitForTimeout(300);
    // 保存を書き換え: 担当を P1〜Pn に分け、全員を同じマスに、P2（h1）の番にする
    await page.evaluate(() => {
      const k = 'card-rpg/adventure'; const d = JSON.parse(localStorage.getItem(k)); const g = d.game; const w = g.world;
      w.story = undefined; const start = w.pos.h0;
      g.heroes.forEach((h, i) => { h.playerId = `P${i + 1}`; w.pos[h.id] = start; h.lastRandomEvent = w.worldTurn; });
      w.turn = 'h1'; w.acted = ['h0'];
      localStorage.setItem(k, JSON.stringify(d));
    });
    await page.reload(); await page.getByText('つづきから').click(); await page.waitForTimeout(400);
    await handoff();
    const g0 = await read(); const start = g0.world.pos.h1;
    for (const h of g0.heroes.filter((h) => h.id !== 'h1')) {
      await page.getByRole('button', { name: `${h.name}を誘う` }).click(); await page.waitForTimeout(200);
      await handoff();
    }
    const g1 = await read();
    check(Object.keys(g1.world.follow ?? {}).length === n - 1, `${n}人: 誘った仲間が同行にならない ${JSON.stringify(g1.world.follow)}`);
    await page.getByText('移動力の判定').click(); await page.waitForTimeout(400);
    const t = page.locator('[data-reach]').filter({ hasText: /^[1-9]$/ }).first();
    await t.scrollIntoViewIfNeeded(); const b = await t.boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(200);
    await page.locator('button:has-text("移動する")').click();
    // フェーズ2-C: 1台で遊ぶ時は「一緒に行く」の確認を出さず、そのまま全員で動く（確認の窓が一瞬でも出ていないか、動き始めまで見張る）
    let shownProposal = false;
    for (let i = 0; i < 10; i++) { if (await page.locator('[data-move-proposal]').count()) shownProposal = true; await page.waitForTimeout(30); }
    check(!shownProposal, `${n}人: 1台なのに「一緒に行く」の確認が出た`);
    await page.screenshot({ path: `${dir}/${n}p-moving.png` });
    const issues = await layoutIssues(page);
    const toast = await page.evaluate(() => document.body.innerText.match(/この提案に答える人ではありません/)?.[0]);
    if (toast) toasts.push(toast);
    await waitForWorldMovement(page).catch(() => {});
    await page.waitForTimeout(500);
    const g2 = await read();
    await page.screenshot({ path: `${dir}/${n}p-after.png` });
    check(!toasts.length, `${n}人: ${toasts[0]}`);
    check(!g2.world.moveProposal, `${n}人: 提案が残っている ${JSON.stringify(g2.world.moveProposal)}`);
    check(g2.world.pos.h1 !== start, `${n}人: P2 が動いていない`);
    check(g2.heroes.every((h) => g2.world.pos[h.id] === g2.world.pos.h1), `${n}人: 全員が同じマスに着いていない ${JSON.stringify(g2.world.pos)}`);
    check(!errors.length, errors.join('\n'));
    console.log(`OK: ${n}人 P2 が ${n - 1}人を連れて ${start} → ${g2.world.pos.h1}（移動中の画面の表示の問題: ${issues.length ? issues.join(' / ') : 'なし'}）`);
  } catch (e) {
    await page.screenshot({ path: `${dir}/failure-${n}p.png` }).catch(() => {});
    throw e;
  } finally {
    await page.close();
  }
}
try {
  for (const n of [2, 3, 4]) await run(n);
} finally {
  await browser.close();
}
