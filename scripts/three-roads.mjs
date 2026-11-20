// 3つの道（2026-11-14・docs/tasks/three-roads-plan.md）の画面の確認: シナリオ1の広い地図を、360×640・390×844 で見る。
// 1) 見取り図の上に3つの帯の札（🌲西の森・🛣中央の街道・⛰東の丘）があり、画面からはみ出さない・文字が切れない
// 2) 見えているマスを押すと、マスの説明に帯の1行が出る（西・中央・東）
// 3) 表示の問題（layoutIssues）が無い。画面の写真は scripts/screenshots/three-roads-<幅>-<番号>.png
// 使い方: URL=http://127.0.0.1:4188/card-rpg/ node scripts/three-roads.mjs
// シナリオを選ぶ: TR_SCENARIO=cursedArchipelago node scripts/three-roads.mjs（省略は1本目の corruptionKing。シナリオ3の作り直し 計画 §3-6）。
// 1本目以外は、伝承の書の記録に「ほかのシナリオをクリア済み」と入れて解放してから選ぶ（adventure.mjs・scourge-7b.mjs と同じ）。写真は three-roads-<シナリオ>-<幅>-<番号>.png
import { mkdirSync } from 'node:fs';
import { chromium, depart, layoutIssues, URL } from './lib.mjs';

const SCENARIO_NAMES = {
  corruptionKing: '侵食の魔王',
  frozenKingdom: '凍てつく王国',
  cursedArchipelago: '呪われた群島',
};
/** 帯の名前（西・中央・東）と、見取り図の札にあるはずの言葉（各シナリオの map.ts の lanes の name・tag） */
const LANE_WORDS = {
  corruptionKing: { lanes: ['西の森', '中央の街道', '東の丘'], tags: ['安全', '魔物多い', '宝'] },
  frozenKingdom: { lanes: ['凍った湖の近道', '薪の街道', '巨人の尾根'], tags: ['寒い', '魔物多い', '宝'] },
  cursedArchipelago: { lanes: ['外海の航路', '桟橋の街道', '呪いの島々'], tags: ['水道', '魔物多い', '干潟'] },
};
const FIRST_SCENARIO = 'corruptionKing';
const SCENARIO = process.env.TR_SCENARIO ?? FIRST_SCENARIO;
if (!SCENARIO_NAMES[SCENARIO]) throw new Error(`知らないシナリオ: ${SCENARIO}（${Object.keys(SCENARIO_NAMES).join(' / ')}）`);
const WORDS = LANE_WORDS[SCENARIO];
const SHOT = SCENARIO === FIRST_SCENARIO ? 'three-roads' : `three-roads-${SCENARIO}`;

const browser = await chromium.launch();
const problems = [];
mkdirSync('scripts/screenshots', { recursive: true });

for (const [width, height] of [[360, 640], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true });
  const page = await ctx.newPage();
  const ng = (m) => problems.push(`${width}px: ${m}`);
  const shot = (n) => page.screenshot({ path: `scripts/screenshots/${SHOT}-${width}-${n}.png` });
  const closeOverlays = async () => {
    for (let k = 0; k < 3; k++) {
      const cont = page.getByText('つづける', { exact: true });
      if (await cont.count()) await cont.first().click().catch(() => {});
      const handoff = page.getByText('スマホを渡して、タップで始める');
      if (await handoff.count()) await handoff.click().catch(() => {});
      await page.waitForTimeout(250);
    }
  };
  const issues = async (when) => {
    const list = await layoutIssues(page);
    if (list.length) ng(`${when}の表示の問題: ${list.join(' / ')}`);
  };

  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false, firstGuide: false })); });
  // 1本目以外: ほかのシナリオをクリア済みの記録を入れて解放する
  if (SCENARIO !== FIRST_SCENARIO) {
    const clears = Object.fromEntries(Object.keys(SCENARIO_NAMES).filter((id) => id !== SCENARIO).map((id) => [id, 1]));
    await page.evaluate((c) => localStorage.setItem('card-rpg/profile', JSON.stringify({ version: 1, clears: c })), clears);
  }
  await page.reload();
  await page.getByText('新しい冒険').click();
  if (SCENARIO !== FIRST_SCENARIO) {
    const card = page.locator('[data-scenarios] button', { hasText: SCENARIO_NAMES[SCENARIO] }).first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    if (await card.locator('[data-scenario-lock]').count()) ng(`シナリオ ${SCENARIO} が解放されていない`);
    await page.waitForTimeout(150);
  }
  await page.getByText('2人', { exact: true }).click();
  await page.getByText('キャラクター作成へ').click();
  await depart(page);
  await page.waitForTimeout(500);
  await closeOverlays();
  await page.waitForTimeout(1600);
  // 確かめ用: 霧を全部晴らして読み込み直す（西・東の帯のマスを押せるように。見た目の確認だけ）
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('card-rpg/adventure'));
    for (const t of d.game.world.tiles) t.seen = true;
    localStorage.setItem('card-rpg/adventure', JSON.stringify(d));
  });
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(800);
  await closeOverlays();
  await page.waitForTimeout(800);
  const w = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')).game.world);
  if (w.width !== 15) ng(`広い地図でない（${w.width}×${w.height}）`);

  // 1) 見取り図の帯の札
  await page.locator('[data-overview-open]').click();
  await page.waitForTimeout(400);
  const lanes = page.locator('[data-overview-lane]');
  const ids = await lanes.evaluateAll((els) => els.map((e) => e.getAttribute('data-overview-lane')));
  if (ids.join() !== 'west,center,east') ng(`見取り図の帯の札が西・中央・東の3つでない（${ids.join()}）`);
  for (let k = 0; k < (await lanes.count()); k++) {
    const el = lanes.nth(k);
    const b = await el.boundingBox();
    if (!b || b.x < 0 || b.x + b.width > width + 0.5) ng(`帯の札 ${ids[k]} が画面からはみ出す（${JSON.stringify(b)}）`);
    const cut = await el.evaluate((e) => [...e.querySelectorAll('div')].some((d) => d.scrollWidth > d.clientWidth + 1));
    if (cut) ng(`帯の札 ${ids[k]} の文字が切れる`);
  }
  const text = await page.locator('[data-overview-lanes]').innerText();
  for (const word of [...WORDS.lanes, ...WORDS.tags]) if (!text.includes(word)) ng(`帯の札に「${word}」が無い`);
  const svg = await page.locator('[data-overview-map]').boundingBox();
  if (!svg || svg.y + svg.height > height + 1 || svg.x + svg.width > width + 1) ng(`見取り図の地図が画面からはみ出す（${JSON.stringify(svg)}）`);
  console.log(`${width}×${height} 帯の札: ${text.replace(/\n/g, ' | ')}`);
  await issues('見取り図');
  if (process.env.DEBUG_SMALL) console.log(await page.evaluate(() => [...document.querySelectorAll('text')].filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => `${e.textContent} ${getComputedStyle(e).fontSize} ${e.closest('[data-overview]') ? 'overview' : 'map'} ${[...e.attributes].map((a) => a.name).join(',')}`).join(' ; ')));
  await shot('1-overview');
  await page.locator('[data-overview-close]').click();
  await page.waitForTimeout(500);
  if (await page.locator('[data-overview]').count()) ng('見取り図が閉じない');

  // 2) マスの説明（見えているマスを、西・中央・東から1つずつ）。横の15列が全部収まる倍率まで縮めてから押す
  for (let k = 0; k < 8 && !(await page.locator('[data-zoom-out]').isDisabled()); k++) {
    await page.locator('[data-zoom-out]').click();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(500);
  const seen = w.tiles.map((t, i) => ({ t, i })).filter(({ t }) => t.seen && !t.f);
  for (const [lane, word] of [['west', WORDS.lanes[0]], ['center', WORDS.lanes[1]], ['east', WORDS.lanes[2]]]) {
    const cols = lane === 'west' ? [0, 4] : lane === 'center' ? [5, 9] : [10, 14];
    const cands = seen.filter(({ i }) => i % w.width >= cols[0] && i % w.width <= cols[1])
      // 施設の絵と重ならないように、帯の真ん中の列・スタートの少し上の行の、陸のマス
      .filter(({ t }) => !['water', 'lava', 'crag', 'reef', 'tideChannel', 'tideFlat'].includes(t.t))
      .sort((a, b) => {
        const d = (x) => Math.abs(Math.floor(x.i / w.width) - 37) + Math.abs((x.i % w.width) - (cols[0] + cols[1]) / 2);
        return d(a) - d(b);
      });
    // 押せる所（ボタンや窓に隠れていない、地図の上）にあるマスを選ぶ
    let cand;
    let pt;
    for (const c of cands.slice(0, 40)) {
      pt = await page.evaluate((t) => {
        const hex = document.querySelector(`[data-hex="${t}"]`);
        if (!hex) return null;
        const r = hex.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        const el = document.elementFromPoint(x, y);
        const map = document.querySelector('[data-world-map]');
        return el && map.contains(el) && !el.closest('button') ? { x, y } : null;
      }, c.i);
      if (pt) { cand = c; break; }
    }
    if (!cand) { ng(`押せる${word}のマスが無い`); continue; }
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(400);
    const info = await page.locator('[data-tile-info]').innerText().catch(() => '');
    console.log(`${width} ${lane} マス${cand.i}: ${info}`);
    if (!info.includes(word)) ng(`${word}のマスの説明に帯の行が無い（${info}）`);
    await issues(`${word}のマスの説明`);
    await shot(`2-${lane}`);
  }
  await ctx.close();
}
await browser.close();
if (problems.length) {
  console.log('NG');
  for (const p of problems) console.log(' - ' + p);
  process.exit(1);
}
console.log('OK');
