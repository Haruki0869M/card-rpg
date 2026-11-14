// 見直しの段階3の戦闘の表示: 大技の印・BREAK の手がかりと演出・弱点の案内（弱点×1.5！）・連携の段階（連携／大連携／極連携）。
// 4人で樹の番人（弱点は火・大技 = 根の拘束）と戦う形を保存の上で作り、360・390・480 の幅で見る。
// 使い方: URL=http://127.0.0.1:<番号>/card-rpg/ node scripts/break-combo.mjs
import { mkdir } from 'node:fs/promises';
import { chromium, layoutIssues, startBattle } from './lib.mjs';

const dir = 'screenshots/break-combo';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const problems = [];

async function run(width) {
  const page = await browser.newPage({ viewport: { width, height: width === 360 ? 640 : 844 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ng = (t) => problems.push(`${width}px: ${t}`);
  const shot = async (name) => {
    const issues = await layoutIssues(page);
    if (issues.length) ng(`${name}: ${issues.join(' / ')}`);
    await page.screenshot({ path: `${dir}/${width}-${name}.png` });
  };
  await startBattle(page, 4, ['treeWarden'], true);
  await page.getByText('ターン終了').waitFor();
  await page.waitForTimeout(400);
  // 保存の上で形を作る: 敵は大技「根の拘束」を予告中・HPは多め。味方は全員マナとフォーカスがあり、手札は決まった物
  await page.evaluate(() => {
    const k = 'card-rpg/adventure';
    const d = JSON.parse(localStorage.getItem(k));
    const b = d.game.expeditions[0].battle;
    const e = b.enemies[0];
    e.hp = e.maxHp = 900;
    e.block = 12;
    e.intent = { actionId: 'rootBind', targetId: b.allies[0].id };
    delete e.broken;
    delete e.nextActionMultiplier;
    e.hitBy = [];
    b.phase = 'ally';
    b.allies.forEach((a, i) => {
      a.mana = 9;
      a.focus = 6;
      a.focusMax = Math.max(a.focusMax, 6);
      a.hp = a.maxHp;
      a.statuses = {};
      a.hand = [{ uid: `t${i}a`, cardId: i === 1 ? 'fireball' : 'heavySwing' }, { uid: `t${i}b`, cardId: 'heavySwing' }];
    });
    localStorage.setItem(k, JSON.stringify(d));
  });
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.getByText('ターン終了').waitFor();
  await page.waitForTimeout(300);

  // 大技の印
  const big = page.locator('[data-intent-big]');
  if (!(await big.count())) ng('大技の予告に印（data-intent-big）が無い');
  if (!(await page.locator('[data-big-mark]').innerText().catch(() => '')).includes('大技')) ng('予告の枠に「大技」の札が無い');
  await shot('1-big-intent');

  const ids = await page.locator('[data-ally]').evaluateAll((es) => es.map((e) => e.getAttribute('data-ally')));
  const pick = async (i, cardIndex = 0) => {
    await page.locator(`[data-ally="${ids[i]}"]`).click();
    const box = await page.locator('[data-card-index][data-usable]').nth(cardIndex).boundingBox();
    await page.mouse.click(box.x + 14, box.y + 70);
    await page.waitForTimeout(120);
    if (await page.getByText('敵をタップ').count()) {
      const eb = await page.locator('[data-enemy]:not([data-dead])').first().boundingBox();
      await page.mouse.click(eb.x + eb.width / 2, eb.y + 60);
      await page.waitForTimeout(120);
    }
  };
  const fire = async (focus) => {
    for (let i = 0; i < focus; i++) await page.getByLabel('フォーカスを増やす').click();
    await page.locator('button:has-text("発動")').click();
  };

  // 魔法使い（2人目）の火球: 弱点なので、どの成功数でも BREAK。完全成功で火傷が必ず付く、の手がかり
  await pick(1);
  const hints = page.locator('[data-counter-hints]');
  await hints.waitFor({ timeout: 3000 }).catch(() => ng('カードを選んでも、予告を潰す手がかりが出ない'));
  const hintText = await hints.innerText().catch(() => '');
  if (!hintText.includes('BREAK')) ng(`手がかりに BREAK が無い（${hintText}）`);
  if (!hintText.includes('この攻撃で')) ng(`弱点の火球なのに「この攻撃で BREAK」になっていない（${hintText}）`);
  // 弱点の案内（計画書 第2版 §5-1）: 的の札は短い「弱点×1.5」、長い文は札の下の行に BREAK の後で出す。状態異常の行と重ねない
  const weakText = await page.locator('[data-weak-chip="fire"] [data-weak-guide]').innerText().catch(() => '');
  if (weakText.trim() !== '弱点×1.5') ng(`的の札に短い「弱点×1.5」が出ない（${weakText}）`);
  const kinds = await hints.locator('[data-counter-hint]').evaluateAll((es) => es.map((e) => e.getAttribute('data-counter-hint')));
  const weakLine = await hints.locator('[data-counter-hint="weak"]').innerText().catch(() => '');
  if (weakLine !== '弱点×1.5！（完全成功で火傷確定）') ng(`札の下に「弱点×1.5！（完全成功で火傷確定）」が出ない（${weakLine}）`);
  if (kinds.indexOf('break') < 0 || kinds.indexOf('break') > kinds.indexOf('weak')) ng(`BREAK → 弱点 の順に並んでいない（${kinds.join(',')}）`);
  if (kinds.includes('status')) ng(`弱点の行と、状態異常の行が重なって出ている（${hintText}）`);
  if ((await page.locator('[data-break-chip]').getAttribute('data-break-chip').catch(() => null)) !== 'now') ng('狙う敵のチップに BREAK の印が無い');
  await shot('2-hints-weak');
  await page.getByLabel('キャンセル').click();

  // 戦士（1人目）のヘビースイング: 弱点でないので「完全で BREAK」。フォーカス3で完全成功にして崩す
  await pick(0);
  const t2 = await hints.innerText().catch(() => '');
  if (await page.locator('[data-weak-chip]').count()) ng('弱点でないカードなのに、的の札に弱点の案内が出ている');
  if (!t2.includes('完全で BREAK') && !t2.includes('完全')) ng(`ヘビースイングの手がかりが「完全で BREAK」でない（${t2}）`);
  await shot('3-hints-perfect');
  await fire(3);
  await page.locator('[data-intent-broken]').waitFor({ timeout: 6000 }).catch(() => ng('完全成功で攻撃したのに、予告が「BREAK」にならない'));
  if (!(await page.locator('[data-break-mark]').count())) ng('予告の枠に「BREAK」の札が無い');
  await page.waitForTimeout(700);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.expeditions[0].battle.enemies[0]);
  if (!(saved.broken && saved.nextActionMultiplier === 0.5 && saved.block === 0 && saved.statuses.weak >= 1)) ng(`BREAK の中身が違う（${JSON.stringify({ broken: saved.broken, mul: saved.nextActionMultiplier, block: saved.block, weak: saved.statuses.weak })}）`);
  await shot('4-broken');

  // 連携の段階: 1人目が攻撃済み → 2人目から見て「連携+20%」→ 2人目も攻撃 → 3人目から見て「大連携+35%」→ 4人目から見て「極連携+50%」
  const stage = async (i, want, name) => {
    await page.locator(`[data-ally="${ids[i]}"]`).click();
    await page.waitForTimeout(150);
    const el = page.locator('[data-combo-stage]');
    const got = await el.getAttribute('data-combo-stage').catch(() => null);
    const text = await el.innerText().catch(() => '');
    if (got !== String(want) || !text.includes(name)) ng(`${i + 1}人目から見た連携が「${text}」（${name} のはず）`);
  };
  await stage(1, 1, '連携+20%');
  await pick(1);
  await fire(0);
  await page.waitForTimeout(1500);
  await stage(2, 2, '大連携+35%');
  await shot('5-combo-2');
  await pick(2);
  await fire(0);
  await page.waitForTimeout(1500);
  await stage(3, 3, '極連携+50%');
  await shot('6-combo-3');
  if (errors.length) ng(`画面の例外 ${errors.join(' / ')}`);
  await page.close();
  console.log(`${width}px: 確認済み`);
}

for (const w of [360, 390, 480]) await run(w);
await browser.close();
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('OK: 大技の印・BREAK の手がかりと結果（威力半分・弱体1・ブロック0）・的の札の「弱点×1.5」と札の下の「弱点×1.5！（完全成功で火傷確定）」・連携の段階（360/390/480）');
