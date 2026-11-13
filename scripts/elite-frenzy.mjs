// 強敵の本気（2026-11-13 docs/tasks/elite-plan.md 柱1）の画面の確認（360×640 と 390×844）:
// 強敵の本体が本気の予告をしている時の、🔥本気の橙の札・「威力×1.5」の案内・BREAK の印・長押しの説明。敵1体・2体・3体・4体で撮る。確かめる事:
// - 札が予告の枠に出る（「🔥本気」。紫の札・赤い大技の札と違う色）。大技の本気は、BREAK の印も下に出る
// - 案内（威力×1.5）: 敵が2体までは敵ごと（橙）、3体以上は敵の列の下に1つだけ（本気の敵は橙。2体目の札を押すと替わる）
// - 札・案内が、ほかの敵の名前・HP・予告・BREAK の印・案内、操作パネル、画面の外に重ならない。字が 12px より小さくない
// - 長押しの説明に「HPが半分を切って本気になった…」が出る。BREAK した後は札と案内が消えて「⚡BREAK」の札に替わる
// 使い方: URL=http://127.0.0.1:<番号>/card-rpg/ node scripts/elite-frenzy.mjs
import { mkdir } from 'node:fs/promises';
import { briefBarIssues, chromium, layoutIssues, startBattle } from './lib.mjs';

const dir = 'screenshots/elite-frenzy';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const problems = [];

const SIZES = [
  [360, 640],
  [390, 844],
];
/** 並べる敵: frenzy = 本気の予告にする。A = 大技の本気＋紫の札の敵、B = 手負い狙い（紫）の本気＋全体の大技の本気 */
const SETS = {
  A: [
    { enemy: 'gatekeeper', action: 'crush', target: true, frenzy: true },
    { enemy: 'darkKnight', action: 'guard', target: false },
    { enemy: 'treeWarden', action: 'barkGuard', target: false },
    { enemy: 'treeWarden', action: 'rootBind', target: true },
  ],
  B: [
    { enemy: 'cinderHound', action: 'bite', target: true, frenzy: true },
    { enemy: 'gatekeeper', action: 'whirl', target: false, frenzy: true },
    { enemy: 'treeWarden', action: 'barkGuard', target: false },
    { enemy: 'treeWarden', action: 'branchSweep', target: false },
  ],
};

const save = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')));
const load = async (page, d) => {
  await page.evaluate((x) => localStorage.setItem('card-rpg/adventure', JSON.stringify(x)), d);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(300);
};

/** 戦闘を強敵の戦闘にして、敵を入れ替え、本気の予告を出させる */
async function setup(page, kinds, broken) {
  const d = await save(page);
  const b = d.game.expeditions[0].battle;
  const base = b.enemies[0];
  b.elite = true;
  b.enemies = kinds.map((k, i) => {
    const e = { ...base, uid: `e${i}`, defId: k.enemy, nameSuffix: undefined, hp: 180, maxHp: 400, block: 0, dead: false, history: [], seqIndex: 0 };
    e.intent = { actionId: k.action, ...(k.target ? { targetId: b.allies[i % b.allies.length].id } : {}), ...(k.frenzy ? { frenzy: true } : {}) };
    if (k.frenzy) {
      e.eliteBody = true;
      e.frenzyUsed = true;
      e.nextActionMultiplier = 1.5 * (broken ? 0.5 : 1);
    } else delete e.nextActionMultiplier;
    if (broken) e.broken = true;
    else delete e.broken;
    delete e.guarding;
    return e;
  });
  b.phase = 'ally';
  await load(page, d);
  await page.getByText('ターン終了').waitFor();
  await page.waitForTimeout(300);
}

async function check(w, h, count, setName) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startBattle(page, 2, Array(count).fill('treeWarden'), true);
  await page.getByText('ターン終了').waitFor();
  const kinds = SETS[setName].slice(0, count);
  const tag = `${w}x${h}-${count}体-${setName}`;
  const ng = (t) => problems.push(`本気の札 ${tag}: ${t}`);
  await setup(page, kinds, false);
  const marks = await page.locator('[data-frenzy-mark]').allInnerTexts();
  const nF = kinds.filter((k) => k.frenzy).length;
  if (marks.length !== nF || marks.some((t) => t.replace(/\s/g, '') !== '🔥本気')) ng(`札 ${JSON.stringify(marks)}（ほしい 🔥本気 ×${nF}）`);
  // 色: 紫の札・赤い大技の札と違う（背景の色を比べる）
  const colors = await page.evaluate(() => {
    const bg = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).backgroundImage + getComputedStyle(el).backgroundColor : undefined; };
    return { frenzy: bg('[data-frenzy-mark]'), purple: bg('[data-behavior-mark]'), red: bg('[data-big-mark]') };
  });
  if (colors.frenzy && (colors.frenzy === colors.purple || colors.frenzy === colors.red)) ng('札の色が紫か赤の札と同じ');
  const briefs = await page.locator('[data-behavior-brief][data-brief-kind="frenzy"]').allInnerTexts();
  if (count < 3 && briefs.length !== nF) ng(`本気の案内の数が ${briefs.length}（ほしい ${nF}）`);
  if (count < 3 && briefs.some((t) => !t.includes('威力×1.5'))) ng(`本気の案内の文 ${JSON.stringify(briefs)}`);
  if (count >= 3 && (await page.locator('[data-behavior-brief]').count())) ng('敵が3体以上なのに、敵ごとの案内が出ている');
  // 大技の本気（門番ガルザの大斧の一撃）は、BREAK の印も出る
  if (setName === 'A' && !(await page.locator('[data-enemy="e0"] [data-break-hint]').count())) ng('大技の本気に BREAK の印が無い');
  const result = await page.evaluate(() => {
    const out = [];
    const notes = [];
    const units = [...document.querySelectorAll('[data-enemy]:not([data-dead])')];
    const hit = (a, b) => a.left < b.right - 3 && b.left < a.right - 3 && a.top < b.bottom - 3 && b.top < a.bottom - 3;
    const allies = [...document.querySelectorAll('[data-ally-sprite]')].map((e) => e.getBoundingClientRect());
    const face = (a) => ({ left: a.left + a.width * 0.25, right: a.right - a.width * 0.25, top: a.top, bottom: a.top + a.height * 0.3 });
    const panel = document.querySelector('.glass-panel')?.getBoundingClientRect();
    const small = [];
    units.forEach((u, i) => {
      const mine = [u.querySelector('[data-frenzy-mark]'), u.querySelector('[data-behavior-mark]'), u.querySelector('[data-behavior-brief]')].filter(Boolean);
      for (const el of [...mine, u.querySelector('[data-break-hint]')].filter(Boolean)) {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 12) small.push(`敵${i} ${fs}px`);
      }
      const myBubble = u.querySelector('[data-intent]')?.getBoundingClientRect();
      if (myBubble && (myBubble.left < 0 || myBubble.right > innerWidth)) out.push(`敵${i}の予告の枠が画面の外`);
      // 同じ敵の中: 本気の札と BREAK の印が重ならない
      const fm = u.querySelector('[data-frenzy-mark]')?.getBoundingClientRect();
      const bh = u.querySelector('[data-break-hint]')?.getBoundingClientRect();
      if (fm && bh && hit(fm, bh)) out.push(`敵${i}の本気の札が自分の BREAK の印に重なる`);
      const br = u.querySelector('[data-behavior-brief]')?.getBoundingClientRect();
      if (br && bh && hit(br, bh)) out.push(`敵${i}の案内が自分の BREAK の印に重なる`);
      for (const el of mine) {
        const r = el.getBoundingClientRect();
        const what = el.hasAttribute('data-frenzy-mark') ? '本気の札' : el.hasAttribute('data-behavior-mark') ? '紫の札' : '案内';
        if (r.left < 0 || r.right > innerWidth) out.push(`敵${i}の${what}が画面の外`);
        if (panel && r.bottom > panel.top + 1) out.push(`敵${i}の${what}が操作パネルに重なる`);
        units.forEach((v, j) => {
          if (j === i) return;
          const info = v.querySelector('[data-enemy-info]');
          const parts = { 名前: info?.children[0], HP: info?.children[1], 予告: v.querySelector('[data-intent]'), 'BREAK の印': v.querySelector('[data-break-hint]'), 案内: v.querySelector('[data-behavior-brief]') };
          for (const [k, x] of Object.entries(parts)) if (x && hit(r, x.getBoundingClientRect())) out.push(`敵${i}の${what}が敵${j}の${k}に重なる`);
        });
        const bubbleMine = u.querySelector('[data-intent]')?.getBoundingClientRect();
        allies.forEach((a, k) => {
          const f = face(a);
          const depth = Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top);
          if (hit(r, f) && depth > 8 && !(bubbleMine && hit(bubbleMine, f)) && innerHeight >= 700) out.push(`敵${i}の${what}が味方${k}の顔に ${depth.toFixed(0)}px 重なる`);
          else if (hit(r, f)) notes.push(`敵${i}の${what}と味方${k}の絵の箱の上の端が ${depth.toFixed(0)}px 触れる`);
        });
      }
    });
    const spill = [...document.querySelectorAll('[data-behavior-brief], [data-behavior-mark], [data-frenzy-mark]')].filter((e) => e.scrollWidth > e.clientWidth + 1).length;
    if (spill) out.push(`文が枠からはみ出す（${spill}個）`);
    if (small.length) out.push(`12pxより小さい字: ${small.join('・')}`);
    return { out, notes };
  });
  if (result.out.length) ng(result.out.join(' / '));
  if (result.notes.length) console.log(`  （メモ ${tag}: ${result.notes.join(' / ')}）`);
  const issues = await layoutIssues(page);
  if (issues.length) ng(issues.join(' / '));
  await page.screenshot({ path: `${dir}/${tag}.png` });
  let bar = '';
  if (count >= 3) {
    const kind = await page.locator('[data-behavior-brief-bar]').getAttribute('data-brief-kind');
    if (kind !== 'frenzy') ng(`敵の列の下の案内が本気（橙）でない: ${kind}`);
    const b = await briefBarIssues(page, count);
    if (b.out.length) ng(b.out.join(' / '));
    if (b.notes.length) console.log(`  （メモ ${tag}: ${b.notes.join(' / ')}）`);
    bar = ` ／ 列の下の案内: ${b.text}`;
    await page.screenshot({ path: `${dir}/${tag}-2体目を押した.png` });
  }
  // 長押しの説明
  await page.locator('[data-enemy="e0"] [data-intent]').click({ delay: 600 });
  await page.waitForTimeout(250);
  const hint = await page.locator('[data-intent-frenzy-hint]').allInnerTexts();
  if (!hint.some((t) => t.includes('HPが半分を切って本気になった'))) ng(`長押しの説明に本気の文が無い ${JSON.stringify(hint)}`);
  if (count === 1) await page.screenshot({ path: `${dir}/${tag}-長押し.png` });
  console.log(`本気の札 ${tag}: ${marks.join('・')}${briefs.length ? ` ／ 案内: ${briefs.join('・')}` : ''}${bar} ／ 長押し: ${hint[0] ?? '-'}`);
  // BREAK した後: 本気の札と案内は消え、⚡BREAK の札に替わる
  await setup(page, kinds, true);
  const after = { mark: await page.locator('[data-frenzy-mark]').count(), brief: await page.locator('[data-brief-kind="frenzy"]').count(), brk: await page.locator('[data-break-mark]').count() };
  if (after.mark || after.brief || after.brk !== count) ng(`BREAK の後: 本気の札${after.mark}・本気の案内${after.brief}・⚡BREAK ${after.brk}`);
  if (count === 2) await page.screenshot({ path: `${dir}/${tag}-broken.png` });
  if (errors.length) problems.push(`${tag}: ページのエラー ${errors.join(' / ')}`);
  await page.close();
}

for (const [w, h] of SIZES) for (const count of [1, 2, 3, 4]) for (const s of ['A', 'B']) await check(w, h, count, s);

await browser.close();
if (problems.length) {
  console.error('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log(`OK: 強敵の本気の札と案内（画像は ${dir}/）`);
