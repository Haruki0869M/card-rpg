// 案Y（2026-11-13）の画面の確認: ボス・中ボス・災厄の戦闘の BREAK の印と、カードを選んだ時の予測欄。
// - 予告の下の印: 大物は「⚡弱点（属性）で完全成功 → BREAK」（敵3体以上は短い形「⚡弱点（属性）+完全」）。ふつうの敵は前のまま
// - 予測欄: 弱点を突かないカード（氷の槍）→「完全成功だけでは崩れない（弱点の火で完全成功なら BREAK）」。嘘の「BREAK!」が出ない
//           弱点を突くカード（火球）→「完全で BREAK！」（完全成功の時だけ）
// - 360×640・390×844、敵1体と4体。重なり・はみ出し・画面の外を見る
// 使い方: URL=http://127.0.0.1:<番号>/card-rpg/ node scripts/plan-y.mjs
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues, startBattle } from './lib.mjs';

const dir = 'screenshots/plan-y';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const problems = [];
const notes = new Set();

async function run(width, height, enemies, boss) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const tag = `${width}x${height}・敵${enemies.length}体・${boss ? 'ボス' : 'ふつう'}`;
  const ng = (t) => problems.push(`${tag}: ${t}`);
  const shot = async (name) => {
    const issues = await layoutIssues(page);
    if (issues.length) ng(`${name}: ${issues.join(' / ')}`);
    const spill = await page.locator('[data-break-hint],[data-counter-hint]').evaluateAll((es) => es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
    // ふつうの敵の短い形「BREAK可（属性2つ）」は、案Y の前から 360px の4体ではみ出す（変えていない形なので、メモだけ出す）
    const old = spill.filter((t) => t.includes('BREAK可'));
    if (old.length) notes.add(`${tag}: 前からの短い形がはみ出す（${old.join('・')}）`);
    const fresh = spill.filter((t) => !t.includes('BREAK可'));
    if (fresh.length) ng(`${name}: 文が枠からはみ出す（${fresh.join('・')}）`);
    await page.screenshot({ path: `${dir}/${width}x${height}-${enemies.length}-${boss ? 'boss' : 'normal'}-${name}.png` });
  };
  await startBattle(page, 2, enemies, true);
  await page.getByText('ターン終了').waitFor();
  await page.waitForTimeout(400);
  // 保存の上で形を作る: 樹木の番人（弱点 = 火）が大技を予告。ボスの印を付ける。1人目の手札は火球（火）と氷の槍（氷）
  await page.evaluate((boss) => {
    const k = 'card-rpg/adventure';
    const d = JSON.parse(localStorage.getItem(k));
    const b = d.game.expeditions[0].battle;
    if (boss) b.boss = true;
    else delete b.boss;
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
      a.hand = i === 0 ? [{ uid: 'py-fire', cardId: 'fireball' }, { uid: 'py-ice', cardId: 'iceLance' }] : [];
    });
    localStorage.setItem(k, JSON.stringify(d));
  }, boss);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.getByText('ターン終了').waitFor();
  await page.waitForTimeout(300);

  // 1) 予告の下の印
  const hint = page.locator('[data-break-hint]').first();
  const text = (await hint.innerText().catch(() => '')).replace(/\s+/g, ' ');
  const rule = await hint.getAttribute('data-break-rule').catch(() => null);
  const narrow = enemies.length >= 3;
  if (boss) {
    if (rule !== 'weak-perfect') ng(`印の決まりが weak-perfect でない（${rule}）`);
    if (narrow ? !/^⚡\(.*\)\+完全$/.test(text) : !text.includes('で完全成功 → BREAK')) ng(`印の文: ${text}`);
  } else {
    if (rule !== 'any') ng(`印の決まりが any でない（${rule}）`);
    if (narrow ? !text.includes('BREAK可') : !text.includes('か完全成功で BREAK')) ng(`印の文: ${text}`);
  }
  // 印が画面の外・ほかの敵の予告に重ならない
  const overlap = await page.evaluate(() => {
    const out = [];
    const hit = (a, b) => a.left < b.right - 3 && b.left < a.right - 3 && a.top < b.bottom - 3 && b.top < a.bottom - 3;
    const units = [...document.querySelectorAll('[data-enemy]')];
    const panel = document.querySelector('.glass-panel')?.getBoundingClientRect();
    units.forEach((u, i) => {
      const r = u.querySelector('[data-break-hint]')?.getBoundingClientRect();
      if (!r) return;
      if (r.left < 0 || r.right > innerWidth) out.push(`印${i}が画面の外`);
      if (panel && r.bottom > panel.top + 1) out.push(`印${i}が操作パネルに重なる`);
      units.forEach((v, j) => {
        const b = j !== i && v.querySelector('[data-intent]')?.getBoundingClientRect();
        if (b && hit(r, b)) out.push(`印${i}が敵${j}の予告に重なる`);
      });
    });
    return out;
  });
  if (overlap.length) ng(overlap.join(' / '));
  await shot('hint');
  console.log(`${tag}: 印「${text}」`);

  const ids = await page.locator('[data-ally]').evaluateAll((es) => es.map((e) => e.getAttribute('data-ally')));
  const uids = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.expeditions[0].battle.enemies.map((e) => ({ uid: e.uid, defId: e.defId })));
  const warden = uids.find((e) => e.defId === 'treeWarden').uid;
  const pick = async (cardIndex) => {
    await page.locator(`[data-ally="${ids[0]}"]`).click();
    const box = await page.locator('[data-card-index][data-usable]').nth(cardIndex).boundingBox();
    await page.mouse.click(box.x + 14, box.y + 70);
    await page.waitForTimeout(150);
    await page.locator(`[data-target-chip="${warden}"]`).click();
    await page.waitForTimeout(250);
  };
  const breakLines = () => page.locator('[data-counter-hint="break"]').allInnerTexts();
  const chip = () => page.locator(`[data-target-chip="${warden}"]`).innerText();

  // 2) 氷の槍（弱点ではない）
  await pick(1);
  let lines = await breakLines();
  let c = await chip();
  if (boss) {
    if (!lines.some((l) => l.includes('完全成功だけでは崩れない') && l.includes('火'))) ng(`氷の槍: 「完全成功だけでは崩れない」が無い（${lines.join(' / ')}）`);
    if (lines.some((l) => l.includes('BREAK！'))) ng(`氷の槍: 崩れないのに「BREAK！」が出る（${lines.join(' / ')}）`);
    if (c.includes('BREAK')) ng(`氷の槍: 札に BREAK が出る（${c.replace(/\s+/g, ' ')}）`);
  } else if (!lines.some((l) => l.includes('BREAK！'))) ng(`氷の槍（ふつう）: 完全成功の BREAK が出ない（${lines.join(' / ')}）`);
  await shot('ice');
  console.log(`  氷の槍: ${lines.join(' / ')}`);
  await page.getByLabel('キャンセル').click();
  await page.waitForTimeout(150);

  // 3) 火球（弱点）
  await pick(0);
  lines = await breakLines();
  c = await chip();
  if (!lines.some((l) => l.includes('BREAK！'))) ng(`火球: BREAK の行が無い（${lines.join(' / ')}）`);
  if (boss && !lines.some((l) => l.includes('完全で BREAK！'))) ng(`火球: ボスで「完全で BREAK！」でない（${lines.join(' / ')}）`);
  if (lines.some((l) => l.includes('崩れない'))) ng(`火球: 崩せるのに「崩れない」が出る（${lines.join(' / ')}）`);
  await shot('fire');
  console.log(`  火球: ${lines.join(' / ')}・札: ${c.replace(/\s+/g, ' ')}`);
  if (errors.length) ng(`画面の例外 ${errors.join(' / ')}`);
  await page.close();
}

for (const [w, h] of [[360, 640], [390, 844]]) {
  for (const boss of [true, false]) {
    await run(w, h, ['treeWarden'], boss);
    await run(w, h, ['treeWarden', 'wildBoar', 'emberBoar', 'darkKnight'], boss);
  }
}
await browser.close();
if (notes.size) console.log('メモ:\n' + [...notes].join('\n'));
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: 案Y の BREAK の印と予測欄（ボス・ふつう、敵1体と4体、360×640・390×844）');
