// ボスの段階（2026-11-14 docs/tasks/boss-phase-plan.md §3）の画面の確認（360×640 と 390×844）:
// - HPバーの境目の線（まだ越えていない段階の数だけ。▼は文字ではなく形）
// - 🌀開幕の一手の札（「🌀第2段階」。敵が3体以上で狭い時は「🌀2段」）。紫の札・BREAK の印と重ならない
// - 数え読みの数（予告の枠の右上）・溜めの「次: 〇〇」
// - 段階が変わった知らせ（名前のポップアップ）と、ログの「🌀次は〇〇をしてくる」
// - 長押しの説明: 開幕の一手の説明・この先の境目（HP〇%を切ると…）
// 重なり・はみ出し・12px 未満の字が無いこと（lib.mjs の layoutIssues と、この確認の中の重なり）
// 使い方: URL=http://127.0.0.1:<番号>/card-rpg/ node scripts/boss-phase.mjs
import { mkdir } from 'node:fs/promises';
import { chromium, confirmEndTurn, layoutIssues, startBattle } from './lib.mjs';

const dir = 'screenshots/boss-phase';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const problems = [];

const SIZES = [
  [360, 640],
  [390, 844],
];

const save = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')));
const load = async (page, d) => {
  await page.evaluate((x) => localStorage.setItem('card-rpg/adventure', JSON.stringify(x)), d);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(300);
};

/**
 * 場面: 戦闘をボスの戦闘にして、敵を並べる。enemies の各項目: defId・phase・intent（行動のID）・opening（開幕の一手の印）・
 * queued（次: 〇〇）・countdown（数え読み）・hpPct（HPの割合）・target（狙う味方がいる行動か）
 */
const SCENES = {
  // 段階の前: 境目の線が2本（魔王ヴァルグリム 66%・33%）
  before: [{ defId: 'valgrim', phase: 0, intent: 'darkLance', target: true, hpPct: 80 }],
  // 2段目の開幕の一手（魔王軍招集。紫の札＋🌀）
  open2: [{ defId: 'valgrim', phase: 1, intent: 'callKnight', opening: 1, hpPct: 60 }],
  // 呼んだ騎士と一緒（2体）。3段目の開幕の一手（手数読み＋溜めの「次: 消滅の一撃」）
  open3: [
    { defId: 'valgrim', phase: 2, intent: 'doomWatch', opening: 2, queued: 'annihilate', hpPct: 30 },
    { defId: 'darkKnight', phase: 0, intent: 'guard', hpPct: 100 },
  ],
  // 数え読み（暴走ボイラー: 数えの途中の数）＋炎竜の溜め（2体）
  count: [
    { defId: 'runawayBoiler', phase: 1, intent: 'burst', countdown: { actionId: 'blast', turns: 3, left: 2 }, hpPct: 45 },
    { defId: 'ignavarl', phase: 1, intent: 'deepBreath', opening: 1, queued: 'flameBreath', hpPct: 45 },
  ],
  // 敵が4体で狭い時（大機械の2段目の開幕の一手＋歯車の虫2体＋数え読みが0のボイラー）
  narrow: [
    { defId: 'greatMachine', phase: 1, intent: 'callParts', opening: 1, hpPct: 55 },
    { defId: 'gearBug', phase: 0, intent: 'gnaw', target: true, hpPct: 100 },
    { defId: 'gearBug', phase: 0, intent: 'gnaw', target: true, hpPct: 100 },
    { defId: 'runawayBoiler', phase: 1, intent: 'blast', countdown: { actionId: 'blast', turns: 3, left: 0 }, fire: true, hpPct: 40 },
  ],
};

async function setup(page, list) {
  const d = await save(page);
  const b = d.game.expeditions[0].battle;
  const base = b.enemies[0];
  b.boss = true;
  b.elite = false;
  b.enemies = list.map((k, i) => {
    const maxHp = 400;
    const e = { ...base, uid: `e${i}`, defId: k.defId, nameSuffix: undefined, hp: Math.round((maxHp * k.hpPct) / 100), maxHp, block: 0, dead: false, history: [], seqIndex: 0, phase: k.phase, statuses: {} };
    delete e.nextActionMultiplier;
    delete e.broken;
    delete e.guarding;
    delete e.queuedActionId;
    delete e.countdown;
    e.phaseOpened = k.phase;
    e.intent = { actionId: k.intent, ...(k.target ? { targetId: b.allies[i % b.allies.length].id } : {}), ...(k.opening ? { opening: k.opening } : {}), ...(k.fire ? { countdownFire: true } : {}) };
    if (k.queued) e.queuedActionId = k.queued;
    if (k.countdown) e.countdown = k.countdown;
    return e;
  });
  b.phase = 'ally';
  await load(page, d);
  await page.getByText('ターン終了').waitFor();
  await page.waitForTimeout(300);
}

/** 重なり・はみ出し・小さな字（段階の札・数え読み・境目の線） */
async function overlapIssues(page) {
  return page.evaluate(() => {
    const out = [];
    const hit = (a, b) => a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2;
    const units = [...document.querySelectorAll('[data-enemy]:not([data-dead])')];
    const panel = document.querySelector('.glass-panel')?.getBoundingClientRect();
    units.forEach((u, i) => {
      const mine = { 開幕の札: u.querySelector('[data-opening-mark]'), 数え読み: u.querySelector('[data-countdown]') };
      for (const [what, el] of Object.entries(mine)) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 12) out.push(`敵${i}の${what}の字が ${fs}px`);
        if (r.left < 0 || r.right > innerWidth || r.top < 0) out.push(`敵${i}の${what}が画面の外`);
        if (panel && r.bottom > panel.top + 1) out.push(`敵${i}の${what}が操作パネルに重なる`);
        if (el.scrollWidth > el.clientWidth + 1) out.push(`敵${i}の${what}の文がはみ出す`);
        // 同じ敵の BREAK の印・紫の札の案内と重ならない（数え読みは、自分の予告の枠の角に乗せる物なので、枠は除く）
        for (const sel of ['[data-break-hint]', '[data-behavior-brief]', '[data-hp-ghost]']) {
          const x = u.querySelector(sel);
          if (x && hit(r, x.getBoundingClientRect())) out.push(`敵${i}の${what}が自分の ${sel} に重なる`);
        }
        if (what === '開幕の札') {
          const bm = u.querySelector('[data-behavior-mark]')?.getBoundingClientRect();
          if (bm && hit(r, bm)) out.push(`敵${i}の開幕の札が紫の札に重なる`);
        }
        units.forEach((v, j) => {
          if (j === i) return;
          const info = v.querySelector('[data-enemy-info]');
          const parts = { 名前: info?.children[0], HP: info?.children[1], 予告: v.querySelector('[data-intent]'), 'BREAK の印': v.querySelector('[data-break-hint]') };
          for (const [k, x] of Object.entries(parts)) if (x && hit(r, x.getBoundingClientRect())) out.push(`敵${i}の${what}が敵${j}の${k}に重なる`);
        });
      }
    });
    return out;
  });
}

async function check(w, h, scene) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const list = SCENES[scene];
  await startBattle(page, 2, Array(list.length).fill('treeWarden'), true);
  await page.getByText('ターン終了').waitFor();
  const tag = `${w}x${h}-${scene}`;
  const ng = (t) => problems.push(`ボスの段階 ${tag}: ${t}`);
  await setup(page, list);
  const narrow = list.length >= 3;
  // 開幕の札
  const marks = await page.locator('[data-opening-mark]').allInnerTexts();
  const want = list.filter((k) => k.opening).map((k) => `🌀${narrow ? `${k.opening + 1}段` : `第${k.opening + 1}段階`}`);
  if (JSON.stringify(marks.map((t) => t.replace(/\s/g, ''))) !== JSON.stringify(want)) ng(`開幕の札 ${JSON.stringify(marks)}（ほしい ${JSON.stringify(want)}）`);
  // HPバーの境目の線（敵ごと: まだ越えていない段階の数）
  for (let i = 0; i < list.length; i++) {
    const n = await page.locator(`[data-enemy="e${i}"] [data-phase-mark]`).count();
    const wantN = { valgrim: 2, runawayBoiler: 1, ignavarl: 1, greatMachine: 2 }[list[i].defId] ?? 0;
    if (n !== Math.max(0, wantN - list[i].phase)) ng(`敵${i}の境目の線 ${n}本（ほしい ${Math.max(0, wantN - list[i].phase)}本）`);
  }
  // 数え読み
  const counts = await page.locator('[data-countdown]').allInnerTexts();
  const wantC = list.filter((k) => k.countdown).map((k) => String(k.fire ? 0 : k.countdown.left));
  if (JSON.stringify(counts) !== JSON.stringify(wantC)) ng(`数え読み ${JSON.stringify(counts)}（ほしい ${JSON.stringify(wantC)}）`);
  // 溜めの「次: 〇〇」
  const next = await page.locator('[data-foresee]').allInnerTexts();
  if (next.length !== list.filter((k) => k.queued).length) ng(`「次:」の数 ${next.length}`);
  const o = await overlapIssues(page);
  if (o.length) ng(o.join(' / '));
  const issues = await layoutIssues(page);
  if (issues.length) ng(issues.join(' / '));
  await page.screenshot({ path: `${dir}/${tag}.png` });
  // 長押しの説明（1体目）
  await page.locator('[data-enemy="e0"] [data-intent]').click({ delay: 600 });
  await page.waitForTimeout(250);
  const openHint = await page.locator('[data-intent-opening-hint]').allInnerTexts();
  const ahead = await page.locator('[data-phase-ahead]').allInnerTexts();
  if (list[0].opening && !openHint.some((t) => t.includes('この段階の新しい決まり'))) ng(`長押しに開幕の一手の説明が無い ${JSON.stringify(openHint)}`);
  if (scene === 'before' && ahead.length !== 2) ng(`長押しの「HP〇%を切ると」が ${ahead.length}行（ほしい 2）`);
  const small = (await layoutIssues(page)).filter((x) => x.startsWith('small text'));
  if (small.length) ng(`長押しの説明に小さな字: ${small.join(' / ')}`);
  await page.screenshot({ path: `${dir}/${tag}-長押し.png` });
  console.log(`ボスの段階 ${tag}: 札 ${marks.join('・') || '-'} ／ 数え ${counts.join('・') || '-'} ／ 次 ${next.join('・') || '-'} ／ 長押し ${openHint[0] ?? ahead[0] ?? '-'}`);
  if (errors.length) problems.push(`${tag}: ページのエラー ${errors.join(' / ')}`);
  await page.close();
}

/** 段階が変わった知らせ: 境目のすぐ上のボスを毒で削って、敵の番の終わりに段階を変える（ポップアップ・ログ） */
async function phaseChange(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startBattle(page, 2, ['treeWarden'], false);
  await page.getByText('ターン終了').waitFor();
  const tag = `${w}x${h}-change`;
  const ng = (t) => problems.push(`ボスの段階 ${tag}: ${t}`);
  const d = await save(page);
  const b = d.game.expeditions[0].battle;
  const e = b.enemies[0];
  b.boss = true;
  Object.assign(e, { defId: 'ignavarl', phase: 0, hp: 201, maxHp: 400, block: 0, history: [], seqIndex: 0, statuses: { poison: 5 }, intent: { actionId: 'scales', targetId: b.allies[0].id } });
  delete e.phaseOpened;
  await load(page, d);
  const endBtn = page.getByRole('button', { name: 'ターン終了' });
  await endBtn.waitFor();
  await endBtn.click();
  // 確かめの窓（まだ行動できる仲間がいる時）
  await confirmEndTurn(page);
  // 名前のポップアップ（「怒れる炎竜」）を待って撮る
  let seen = false;
  for (let t = 0; t < 60 && !seen; t++) {
    seen = (await page.getByText('怒れる炎竜').count()) > 0;
    if (!seen) await page.waitForTimeout(150);
  }
  if (!seen) ng('段階が変わった知らせ（名前）が出ない');
  await page.screenshot({ path: `${dir}/${tag}.png` });
  await endBtn.waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  const after = await save(page);
  const ab = after.game.expeditions[0].battle;
  if (!ab.log.some((l) => l.text.includes('🌀次は「息を吸い込む」'))) ng('ログに「🌀次は〇〇をしてくる」が無い');
  if (ab.enemies[0].intent?.actionId !== 'deepBreath' || ab.enemies[0].intent?.opening !== 1) ng(`次の予告が開幕の一手でない: ${JSON.stringify(ab.enemies[0].intent)}`);
  const mark = await page.locator('[data-opening-mark]').allInnerTexts();
  if (!mark.length) ng('開幕の一手の札が出ない');
  const issues = await layoutIssues(page);
  if (issues.length) ng(issues.join(' / '));
  await page.screenshot({ path: `${dir}/${tag}-次の予告.png` });
  console.log(`ボスの段階 ${tag}: 知らせ ${seen ? 'あり' : 'なし'} ／ 次の予告 ${ab.enemies[0].intent?.actionId} ／ 札 ${mark.join('・')}`);
  if (errors.length) problems.push(`${tag}: ページのエラー ${errors.join(' / ')}`);
  await page.close();
}

for (const [w, h] of SIZES) {
  for (const s of Object.keys(SCENES)) await check(w, h, s);
  await phaseChange(w, h);
}

await browser.close();
if (problems.length) {
  console.error('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log(`OK: ボスの段階の画面（画像は ${dir}/）`);
