// 災厄に気づかせる手がかり（2026-11-13）の画面確認。scourge-7c.mjs と同じ作りで、幅 360×640 と 390×844 で、2人（1台）の冒険を使って:
// ① 出た瞬間の知らせに、倒すと手に入る専用の装備の名前と効果が出る（本物の出現の流れ。瘴気を紡ぐ死霊術師）
// ② 上の札に「倒すと: 「装備」効果」の1行・押した時の説明の窓に「装備の効果」
// ③ 侵食度の数字の横に「💀+0.5%」（死霊術師が生きている間）
// ④ 夜に「💀敵Lv+1」（氷嵐の魔女が生きている間・夜だけ）
// を写真に撮り、はみ出し・12px未満の文字・小さすぎるボタンを調べる。
// 使い方: npx vite build && npx vite preview を起こしてから node scripts/scourge-hints.mjs（URL で変更可）
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, URL, depart } from './lib.mjs';

const OUT = process.env.SCH_OUTPUT ?? 'screenshots/scourge-hints';
const KEY = 'card-rpg/adventure';
mkdirSync(OUT, { recursive: true });
const SIZES = [
  [360, 640],
  [390, 844],
];
const browser = await chromium.launch();
const problems = [];

async function start(page, players) {
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false }));
  });
  await page.reload();
  await page.getByText('新しい冒険').click();
  await page.getByText(`${players}人`, { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(300);
}
async function edit(page, fn, arg) {
  await page.evaluate(({ src, arg, k }) => {
    const d = JSON.parse(localStorage.getItem(k));
    (0, eval)(src)(d.game, arg);
    localStorage.setItem(k, JSON.stringify(d));
  }, { src: fn.toString(), arg, k: KEY });
  await page.reload();
  await page.getByText('つづきから').click();
  await page.waitForTimeout(500);
}
const game = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)).game, KEY);
async function check(page, tag, where) {
  const list = (await layoutIssues(page)).filter((s) => !s.startsWith('small button: ""'));
  if (list.length) problems.push(`${tag} ${where}: ${list.join(' / ')}`);
}
async function handoff(page) {
  for (let k = 0; k < 3; k++) {
    const h = page.locator('[data-handoff]');
    if (!(await h.count())) return;
    await h.first().click();
    await page.waitForTimeout(300);
  }
}
/** 上の帯・札・目的の行が、ほかの物と重なっていないか（縦に並んでいて、上下が食い込まない） */
async function overlapCheck(page, tag, where) {
  const boxes = await page.evaluate(() => {
    const sel = ['[data-cutin-anchor]', '[data-scourge-strip]'];
    return sel.map((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { s, top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    });
  });
  const [bar, strip] = boxes;
  if (bar && strip && strip.top < bar.bottom - 1) problems.push(`${tag} ${where}: 災厄の札が上の帯に重なっている`);
  // 札の中の行が、札の外にはみ出していない
  const spill = await page.evaluate(() => {
    const strip = document.querySelector('[data-scourge-strip]');
    if (!strip) return [];
    const r = strip.getBoundingClientRect();
    return [...strip.querySelectorAll('span')].filter((s) => {
      const q = s.getBoundingClientRect();
      return q.width > 0 && (q.right > r.right + 1 || q.bottom > r.bottom + 1 || q.left < r.left - 1);
    }).map((s) => s.textContent.slice(0, 12));
  });
  if (spill.length) problems.push(`${tag} ${where}: 札の中の文がはみ出している ${spill.join(' / ')}`);
}

for (const [width, height] of SIZES) {
  const tag = `${width}x${height}`;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // ---- ① 出た瞬間の知らせ（死霊術師だけが選ばれるようにする） ----
  await start(page, 2);
  await edit(page, (g) => {
    const w = g.world;
    w.story = undefined;
    w.corruption = 15.5;
    w.scourgesMet = ['greedKing', 'nightmareBeast', 'stormWitch', 'infernoDemon'];
    w.acted = g.heroes.filter((h) => h.id !== w.turn).map((h) => h.id);
  });
  await handoff(page);
  await page.getByRole('button', { name: '待機' }).click();
  // 物語の窓は1行ずつ0.5秒おきに出る（4行目は1.75秒）
  await page.waitForTimeout(2600);
  const body = await page.locator('body').innerText();
  if (!/💀 瘴気を紡ぐ死霊術師が、.+に現れた！/.test(body)) problems.push(`${tag}: 死霊術師が現れた知らせが出ない`);
  if (!body.includes('専用の装備「魂喰らいの冥獄鎌」を落とす（《冥獄の門》')) problems.push(`${tag}: 知らせに装備の名前と効果が無い`);
  await page.screenshot({ path: `${OUT}/${tag}-1-announce.png` });
  await check(page, tag, '知らせ');
  const g1 = await game(page);
  if (!g1.world.wanderers.some((x) => x.scourge === 'miasmaNecro')) {
    problems.push(`${tag}: 死霊術師が地図に置かれていない`);
    await page.close();
    continue;
  }
  await page.getByRole('button', { name: 'つづける' }).click();
  await page.waitForTimeout(400);
  await handoff(page);

  // ---- ②③ 上の札・侵食度の印（2体: 死霊術師と、写した氷嵐の魔女） ----
  await edit(page, (g) => {
    const w = g.world;
    const wd = w.wanderers.find((x) => x.scourge === 'miasmaNecro');
    w.tiles[wd.tile].seen = true;
    w.wanderers.push({ ...JSON.parse(JSON.stringify(wd)), id: `w${w.nextWandererId++}`, scourge: 'stormWitch' });
    w.story = undefined;
    // 昼
    w.worldTurn = 3;
  });
  await handoff(page);
  const strip = page.locator('[data-scourge-strip]');
  if (!(await strip.count())) problems.push(`${tag}: 上の災厄の札が出ない`);
  const gear = page.locator('[data-scourge-gear]');
  if (!(await gear.count()) || !(await gear.innerText()).includes('倒すと: 「魂喰らいの冥獄鎌」')) problems.push(`${tag}: 札に装備の効果の行が無い`);
  const cor = page.locator('[data-corruption-scourge]');
  if (!(await cor.count()) || (await cor.innerText()) !== '💀+0.5%') problems.push(`${tag}: 侵食度の横に災厄の印が無い`);
  if (await page.locator('[data-night-scourge]').count()) problems.push(`${tag}: 昼なのに夜の印が出ている`);
  await page.screenshot({ path: `${OUT}/${tag}-2-world-day.png` });
  await check(page, tag, '世界マップ（昼）');
  await overlapCheck(page, tag, '世界マップ（昼）');
  await strip.click();
  await page.waitForTimeout(400);
  const dlg = page.locator('[data-scourge-dialog]');
  const rows = page.locator('[data-scourge-row-gear]');
  if (!(await dlg.count()) || (await rows.count()) !== 2) problems.push(`${tag}: 説明の窓に装備の効果が2つ出ない`);
  else if (!(await dlg.innerText()).includes('装備の効果: 《冥獄の門》')) problems.push(`${tag}: 説明の窓の装備の効果の文が違う`);
  await page.screenshot({ path: `${OUT}/${tag}-3-dialog.png` });
  await check(page, tag, '説明の窓');
  await page.getByRole('button', { name: '閉じる' }).click();
  await page.waitForTimeout(300);

  // ---- ④ 夜の印 ----
  await edit(page, (g) => {
    g.world.worldTurn = 7;
  });
  await handoff(page);
  const night = page.locator('[data-night-scourge]');
  if (!(await night.count()) || (await night.innerText()) !== '💀敵Lv+1') problems.push(`${tag}: 夜に「💀敵Lv+1」が出ない`);
  await page.screenshot({ path: `${OUT}/${tag}-4-world-night.png` });
  await check(page, tag, '世界マップ（夜）');
  await overlapCheck(page, tag, '世界マップ（夜）');
  // 2人目の番にしても、押せる・止まらない（待機で番が回る）
  await page.getByRole('button', { name: '待機' }).click();
  await page.waitForTimeout(800);
  await handoff(page);
  if (!(await page.getByRole('button', { name: '待機' }).count())) problems.push(`${tag}: 2人目の番で「待機」が押せない`);

  if (errors.length) problems.push(`${tag}: ページのエラー ${errors.join(' / ')}`);
  await page.close();
}
await browser.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else console.log(`scourge-hints: OK（${SIZES.length}つの大きさ。写真は ${OUT}）`);
