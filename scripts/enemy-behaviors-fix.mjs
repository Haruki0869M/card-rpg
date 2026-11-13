// 敵の特殊な行動の直し（2026-11-13）の画面の確認（360×640 と 390×844）:
// 敵が特殊な行動（7種類）を予告している時の、紫の札（⚠️手数読み など）と、いつも出す1行の案内。
// 敵1体・2体・3体・4体で、7種類とも撮る。確かめる事:
// - 札が予告の枠に出る（文字は種類ごと。敵が3体以上は短い形）。1行の案内は、敵が2体までは敵ごと、
//   3体以上は敵の列の下に1つだけ（左の敵の物。2体目の札を押すと替わる。2026-11-13 の直し）
// - 札・案内が、ほかの敵の名前・HP・予告・BREAK の印、味方の立ち絵の顔、操作パネル、画面の外に重ならない。文が枠からはみ出さない
// - 札・案内・BREAK の印の字が 12px より小さくない
// - BREAK した後は、札と案内が消えて「⚡BREAK」の札に替わる
// 使い方: URL=http://127.0.0.1:<番号>/card-rpg/ node scripts/enemy-behaviors-fix.mjs
import { mkdir } from 'node:fs/promises';
import { BEHAVIOR_SHORT, briefBarIssues, chromium, layoutIssues, startBattle } from './lib.mjs';

const dir = 'screenshots/enemy-behaviors-fix';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const problems = [];

const SIZES = [
  [360, 640],
  [390, 844],
];
/** 7種類: 敵・行動・狙いが要るか・札の文字 */
const KINDS = [
  { enemy: 'reedStalker', action: 'cover', target: false, mark: '⚠️手数読み' },
  { enemy: 'darkKnight', action: 'guard', target: false, mark: '🛡️かばう' },
  { enemy: 'cursedHound', action: 'brace', target: false, mark: '🚫癒し封じ' },
  { enemy: 'siegeImp', action: 'guard', target: false, mark: '📢増援' },
  { enemy: 'cinderHound', action: 'bite', target: true, mark: '🎯手負い狙い' },
  { enemy: 'basaltCrawler', action: 'horn', target: true, mark: '🔨盾砕き' },
  { enemy: 'mireSlime', action: 'harden', target: false, mark: '✨浄化' },
];

const save = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')));
const load = async (page, d) => {
  await page.evaluate((x) => localStorage.setItem('card-rpg/adventure', JSON.stringify(x)), d);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(300);
};

/** 戦闘の敵を、kinds の敵に入れ替えて、それぞれの特殊な行動を予告させる */
async function setup(page, kinds, broken) {
  const d = await save(page);
  const b = d.game.expeditions[0].battle;
  const base = b.enemies[0];
  b.enemies = kinds.map((k, i) => {
    const e = { ...base, uid: `e${i}`, defId: k.enemy, nameSuffix: undefined, hp: 400, maxHp: 400, block: 0, dead: false, history: [], seqIndex: 0 };
    e.intent = { actionId: k.action, ...(k.target ? { targetId: b.allies[i % b.allies.length].id } : {}) };
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

/** 1つの画面の大きさ・敵の数で、7種類を全部撮る */
async function check(w, h, count) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startBattle(page, 2, Array(count).fill('treeWarden'), true);
  await page.getByText('ターン終了').waitFor();
  for (let start = 0; start < KINDS.length; start += count) {
    const kinds = Array.from({ length: count }, (_, i) => KINDS[(start + i) % KINDS.length]);
    const tag = `${w}x${h}-${count}体-${kinds.map((k) => k.enemy).join('+')}`;
    const ng = (t) => problems.push(`特殊な行動の札 ${tag}: ${t}`);
    await setup(page, kinds, false);
    const marks = await page.locator('[data-behavior-mark]').allInnerTexts();
    // 敵が3体以上の時は、札は短い形（例「⚠️手数」）
    const want = kinds.map((k) => (count >= 3 ? BEHAVIOR_SHORT[k.mark] : k.mark));
    if (JSON.stringify(marks.map((t) => t.replace(/\s/g, ''))) !== JSON.stringify(want)) ng(`札の文字 ${JSON.stringify(marks)}（ほしい ${JSON.stringify(want)}）`);
    // 1行の案内: 敵が2体までは敵ごと。3体以上は、敵の列の下に1つだけ（下の briefBarIssues）
    const briefs = await page.locator('[data-behavior-brief]').allInnerTexts();
    if (briefs.length !== (count >= 3 ? 0 : count)) ng(`1行の案内の数が ${briefs.length}`);
    if (count < 3 && (await page.locator('[data-behavior-brief-bar]').count())) ng('敵が2体までなのに、敵の列の下の案内が出ている');
    const result = await page.evaluate(() => {
      const out = [];
      const notes = [];
      const units = [...document.querySelectorAll('[data-enemy]:not([data-dead])')];
      // 端が3px以内で触れるだけは数えない（敵が4体の時は、予告の枠どうしが前から少し重なっている）
      const hit = (a, b) => a.left < b.right - 3 && b.left < a.right - 3 && a.top < b.bottom - 3 && b.top < a.bottom - 3;
      const allies = [...document.querySelectorAll('[data-ally-sprite]')].map((e) => e.getBoundingClientRect());
      const face = (a) => ({ left: a.left + a.width * 0.25, right: a.right - a.width * 0.25, top: a.top, bottom: a.top + a.height * 0.3 });
      const panel = document.querySelector('.glass-panel')?.getBoundingClientRect();
      const small = [];
      units.forEach((u, i) => {
        const mine = [u.querySelector('[data-behavior-mark]'), u.querySelector('[data-behavior-brief]')].filter(Boolean);
        for (const el of [...mine, u.querySelector('[data-break-hint]')].filter(Boolean)) {
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < 12) small.push(`敵${i} ${fs}px`);
        }
        // 予告の枠そのものが画面の外に出ないか（2026-11-13 に第2弾の確認から足した）
        const myBubble = u.querySelector('[data-intent]')?.getBoundingClientRect();
        if (myBubble && (myBubble.left < 0 || myBubble.right > innerWidth)) out.push(`敵${i}の予告の枠が画面の外（${myBubble.left.toFixed(0)}〜${myBubble.right.toFixed(0)}）`);
        for (const el of mine) {
          const r = el.getBoundingClientRect();
          const what = el.hasAttribute('data-behavior-mark') ? '札' : '案内';
          if (r.left < 0 || r.right > innerWidth) out.push(`敵${i}の${what}が画面の外`);
          if (panel && r.bottom > panel.top + 1) out.push(`敵${i}の${what}が操作パネルに重なる`);
          units.forEach((v, j) => {
            if (j === i) return;
            const info = v.querySelector('[data-enemy-info]');
            const name = info?.children[0]?.getBoundingClientRect();
            const hp = info?.children[1]?.getBoundingClientRect();
            const bubble = v.querySelector('[data-intent]')?.getBoundingClientRect();
            const brk = v.querySelector('[data-break-hint]')?.getBoundingClientRect();
            const brief = v.querySelector('[data-behavior-brief]')?.getBoundingClientRect();
            if (name && hit(r, name)) out.push(`敵${i}の${what}が敵${j}の名前に重なる`);
            if (hp && hit(r, hp)) out.push(`敵${i}の${what}が敵${j}のHPに重なる`);
            if (bubble && hit(r, bubble)) out.push(`敵${i}の${what}が敵${j}の予告に重なる`);
            if (brk && hit(r, brk)) out.push(`敵${i}の${what}が敵${j}の BREAK の印に重なる`);
            if (brief && hit(r, brief)) out.push(`敵${i}の${what}が敵${j}の案内に重なる`);
          });
          // 低い画面（高さ700px未満）は、味方の立ち絵が最小の大きさで敵の予告の高さまで来る（前からの並び）。
          // 予告の枠そのものが同じ味方に重なっている時も、前からの並びなので数えない（ui-r2.mjs の BREAK の印と同じ見方）
          const bubbleMine = u.querySelector('[data-intent]')?.getBoundingClientRect();
          allies.forEach((a, k) => {
            const f = face(a);
            const depth = Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top);
            if (hit(r, f) && depth > 8 && !(bubbleMine && hit(bubbleMine, f)) && innerHeight >= 700) out.push(`敵${i}の${what}が味方${k}の顔に ${depth.toFixed(0)}px 重なる`);
            else if (hit(r, f)) notes.push(`敵${i}の${what}と味方${k}の絵の箱の上の端が ${depth.toFixed(0)}px 触れる`);
          });
        }
      });
      const spill = [...document.querySelectorAll('[data-behavior-brief], [data-behavior-mark]')].filter((e) => e.scrollWidth > e.clientWidth + 1).length;
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
      const b = await briefBarIssues(page, count);
      if (b.out.length) ng(b.out.join(' / '));
      if (b.notes.length) console.log(`  （メモ ${tag}: ${b.notes.join(' / ')}）`);
      bar = ` ／ 列の下の案内: ${b.text}`;
      await page.screenshot({ path: `${dir}/${tag}-2体目を押した.png` });
    }
    console.log(`特殊な行動の札 ${tag}: ${marks.join('・')}${briefs.length ? ` ／ 案内: ${briefs.join('・')}` : ''}${bar}`);
    // BREAK した後: 札と案内は消え、⚡BREAK の札に替わる
    await setup(page, kinds, true);
    const after = { mark: await page.locator('[data-behavior-mark]').count(), brief: await page.locator('[data-behavior-brief]').count() + (await page.locator('[data-behavior-brief-bar]').count()), brk: await page.locator('[data-break-mark]').count() };
    if (after.mark || after.brief || after.brk !== count) ng(`BREAK の後: 札${after.mark}・案内${after.brief}・⚡BREAK ${after.brk}`);
    if (start === 0) await page.screenshot({ path: `${dir}/${tag}-broken.png` });
  }
  if (errors.length) problems.push(`${w}x${h}-${count}体: ページのエラー ${errors.join(' / ')}`);
  await page.close();
}

for (const [w, h] of SIZES) for (const count of [1, 2, 3, 4]) await check(w, h, count);

await browser.close();
if (problems.length) {
  console.error('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log(`OK: 敵の特殊な行動の札と案内（画像は ${dir}/）`);
