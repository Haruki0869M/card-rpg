import { open, loadSave } from './common.mjs';
const { browser, page, shot, text, issues, errors } = await open();
const btns = async () => (await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0,22) + '|' + (b.getAttribute('aria-label')||'')).join(' ; ')));
await loadSave(page, 'scripts/playtest/shots/save-reward2.json');
await page.waitForTimeout(1500);
for (let step = 0; step < 8; step++) {
  await shot(`10e-step-${step}`);
  const t = await text(); console.log('STEP', step, t.slice(0, 700)); const b = await btns(); console.log('BTN', b); await issues('s' + step);
  if (/最大HP \+8/.test(t)) { await page.getByText('最大HP +8').first().click(); }
  else if (await page.locator('[data-reward-card], [data-card-pick]').count()) { await page.locator('[data-reward-card], [data-card-pick]').first().click(); await page.waitForTimeout(400); await shot(`10e-step-${step}-picked`); console.log('BTN2', await btns()); const ok = page.getByRole('button', { name: /受け取る|このカード|決定|加える/ }); if (await ok.count()) await ok.first().click(); }
  else { const nx = page.getByRole('button', { name: /次へ|進む|閉じる|スキップ|受け取らない|探索に戻る/ }); if (await nx.count()) { console.log('click', await nx.first().textContent()); await nx.first().click(); } else break; }
  await page.waitForTimeout(900);
}
await browser.close();
console.log('errors', errors);
