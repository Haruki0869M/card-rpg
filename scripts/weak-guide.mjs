// 弱点の案内（計画書 第2版 §5-1）の画面: 「狙う敵」の札の「弱点×1.5」「▼耐性」と、札の下の1行。
// 敵1体（炎の荒れ猪に氷の槍 = 凍結）と敵4体（樹木の番人・荒れ猪・炎の荒れ猪・魔王軍の騎士に火球）を、360・375・390 の幅で撮る。
// 使い方: URL=http://127.0.0.1:<番号>/card-rpg/ node scripts/weak-guide.mjs
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues, startBattle } from './lib.mjs';

const dir = 'screenshots/weak-guide';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const problems = [];

async function run(width, height, enemies) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const tag = `${width}px・敵${enemies.length}体`;
  const ng = (t) => problems.push(`${tag}: ${t}`);
  const shot = async (name) => {
    const issues = await layoutIssues(page);
    if (issues.length) ng(`${name}: ${issues.join(' / ')}`);
    await page.screenshot({ path: `${dir}/${width}-${enemies.length}-${name}.png` });
  };
  await startBattle(page, 2, enemies, true);
  await page.getByText('ターン終了').waitFor();
  await page.waitForTimeout(400);
  // 保存の上で形を作る: 敵はHPが多くブロック0（倒さない・防がれない）。樹木の番人は大技を予告。1人目の手札は火球と氷の槍
  await page.evaluate(() => {
    const k = 'card-rpg/adventure';
    const d = JSON.parse(localStorage.getItem(k));
    const b = d.game.expeditions[0].battle;
    for (const e of b.enemies) {
      e.hp = e.maxHp = 900;
      e.block = 0;
      delete e.guarding;
      delete e.broken;
      if (e.defId === 'treeWarden') e.intent = { actionId: 'rootBind', targetId: b.allies[0].id };
    }
    b.phase = 'ally';
    b.allies.forEach((a, i) => {
      a.mana = 9;
      a.focus = 6;
      a.focusMax = Math.max(a.focusMax, 6);
      a.statuses = {};
      a.hand = i === 0 ? [{ uid: 'wg-fire', cardId: 'fireball' }, { uid: 'wg-ice', cardId: 'iceLance' }] : [];
    });
    localStorage.setItem(k, JSON.stringify(d));
  });
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.getByText('ターン終了').waitFor();
  await page.waitForTimeout(300);
  const ids = await page.locator('[data-ally]').evaluateAll((es) => es.map((e) => e.getAttribute('data-ally')));
  const uids = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.expeditions[0].battle.enemies.map((e) => ({ uid: e.uid, defId: e.defId })));
  const uidOf = (defId) => uids.find((e) => e.defId === defId)?.uid;

  const pick = async (cardIndex, defId) => {
    await page.locator(`[data-ally="${ids[0]}"]`).click();
    const box = await page.locator('[data-card-index][data-usable]').nth(cardIndex).boundingBox();
    await page.mouse.click(box.x + 14, box.y + 70);
    await page.waitForTimeout(150);
    await page.locator(`[data-target-chip="${uidOf(defId)}"]`).click();
    await page.waitForTimeout(200);
  };
  // 札の中の短い文が、札の幅に収まっているか（切れていないか）
  const fits = async () => {
    const cut = await page.locator('[data-weak-guide],[data-resist-guide]').evaluateAll((es) => es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
    if (cut.length) ng(`札の中の文が切れている（${cut.join('・')}）`);
  };
  const line = async () => page.locator('[data-counter-hint="weak"]').innerText().catch(() => '');
  const kinds = async () => page.locator('[data-counter-hint]').evaluateAll((es) => es.map((e) => e.getAttribute('data-counter-hint')));

  if (enemies.length === 1) {
    // 氷の槍 → 炎の荒れ猪（氷が弱点）: 凍結＝敵の行動阻止
    await pick(1, 'emberBoar');
    if ((await page.locator('[data-weak-chip="ice"] [data-weak-guide]').innerText().catch(() => '')).trim() !== '弱点×1.5') ng('札に「弱点×1.5」が無い');
    const t = await line();
    if (t !== '弱点×1.5！（完全成功で凍結＝敵の行動阻止！）') ng(`札の下の1行が違う（${t}）`);
    await fits();
    await shot('ice-weak');
    await page.getByLabel('キャンセル').click();
    // 火球 → 炎の荒れ猪（火に耐性）: ▼耐性。下の1行は出ない
    await pick(0, 'emberBoar');
    if ((await page.locator('[data-resist-chip="fire"] [data-resist-guide]').innerText().catch(() => '')).trim() !== '▼耐性') ng('札に「▼耐性」が無い');
    if (await page.locator('[data-counter-hint="weak"]').count()) ng('耐性なのに、弱点の行が出ている');
    await fits();
    await shot('fire-resist');
  } else {
    // 火球 → 樹木の番人（火が弱点・大技の予告）: BREAK → 弱点 の順
    await pick(0, 'treeWarden');
    const weakChips = await page.locator('[data-weak-chip="fire"]').count();
    if (weakChips !== 2) ng(`火が弱点の札が2枚でない（${weakChips}）`);
    if ((await page.locator(`[data-target-chip="${uidOf('emberBoar')}"] [data-resist-guide]`).innerText().catch(() => '')).trim() !== '▼耐性') ng('炎の荒れ猪の札に「▼耐性」が無い');
    if (await page.locator(`[data-target-chip="${uidOf('darkKnight')}"] [data-weak-guide],[data-target-chip="${uidOf('darkKnight')}"] [data-resist-guide]`).count()) ng('どちらでもない魔王軍の騎士の札に、案内が出ている');
    const t = await line();
    if (t !== '弱点×1.5！（完全成功で火傷確定）') ng(`札の下の1行が違う（${t}）`);
    const k = await kinds();
    if (k.indexOf('break') < 0 || k.indexOf('break') > k.indexOf('weak')) ng(`BREAK → 弱点 の順でない（${k.join(',')}）`);
    await fits();
    await shot('fire-weak-break');
    // 荒れ猪に変える（大技なし）: 弱点の行だけ
    await page.locator(`[data-target-chip="${uidOf('wildBoar')}"]`).click();
    await page.waitForTimeout(200);
    if ((await line()) !== '弱点×1.5！（完全成功で火傷確定）') ng('荒れ猪を選んでも弱点の行が出ない');
    await shot('fire-weak');
    // 魔王軍の騎士に変える: 弱点の行は出ない
    await page.locator(`[data-target-chip="${uidOf('darkKnight')}"]`).click();
    await page.waitForTimeout(200);
    if (await page.locator('[data-counter-hint="weak"]').count()) ng('弱点でない敵を選んでいるのに、弱点の行が出ている');
    await shot('fire-neutral');
  }
  if (errors.length) ng(`画面の例外 ${errors.join(' / ')}`);
  await page.close();
  console.log(`${tag}: 確認済み`);
}

for (const [w, h] of [[360, 640], [375, 667], [390, 844]]) {
  await run(w, h, ['emberBoar']);
  await run(w, h, ['treeWarden', 'wildBoar', 'emberBoar', 'darkKnight']);
}
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: 弱点の案内（札の「弱点×1.5」「▼耐性」・札の下の1行・BREAK → 弱点 の順）を 360/375/390・敵1体と4体で確認');
