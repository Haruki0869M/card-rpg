// 世界マップの駒の絵（J4・44職×男女）の確認。
//   - 360/390/480 の幅で、4人が同じマスに並んだ時・1人ずつの時の写真を撮る
//   - 駒の絵が読み込まれていること（仮の金のメダルになっていないこと）
//   - 絵の下端（足の裏）が、金の台座の上面の中に来ていること
//   - 390 の幅で、88枚すべてを4人ずつ並べて撮る（目で確かめる用）
// 使い方: URL=http://localhost:<port>/card-rpg/ node scripts/piece-art.mjs
import { mkdir } from 'node:fs/promises';
import { chromium, URL, layoutIssues } from './lib.mjs';

const JOBS = ['warrior', 'guardian', 'hunter', 'mage', 'monk', 'thief', 'priest', 'summoner',
  'swordmaster', 'berserker', 'brawler', 'archmage', 'hexer', 'phantomTamer', 'paladin', 'lancer',
  'bishop', 'archer', 'tamer', 'shadow', 'phantomThief',
  'swordSaint', 'overlord', 'fistKing', 'greatSage', 'hadesLord', 'phantomKing', 'holyKing', 'dragoon',
  'pope', 'bowSaint', 'beastMaster', 'ninja', 'grandThief',
  'samurai', 'magicKnight', 'timeMage', 'necromancer', 'darkKnight', 'shrineMaiden', 'astrologer',
  'machinist', 'bard', 'gambler'];
const ALL = JOBS.flatMap((j) => [[j, 'male'], [j, 'female']]);

const dir = 'screenshots/piece-art';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
// スマホと同じ3倍の細かさで撮る（小さな駒を目で確かめるため）
const page = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 3 });
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const fail = [];
const check = (ok, text) => { if (!ok) fail.push(text); };

// 4人で新しい冒険を始めて、保存データを取っておく
await page.goto(URL);
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('card-rpg/settings', JSON.stringify({ fastMode: true, vibration: false }));
});
await page.reload();
await page.getByText('新しい冒険').click();
await page.getByText('4人', { exact: true }).click();
await page.getByText('キャラクター作成へ').click();
await page.getByText('冒険に出発').click();
await page.waitForTimeout(400);
const base = await page.evaluate(() => JSON.parse(localStorage.getItem('card-rpg/adventure')));

/** 駒の職・性別と、並び方（同じマス / 1人ずつ）を決めて再開する */
async function show(set, together) {
  const d = structuredClone(base);
  const g = d.game, w = g.world;
  w.story = undefined;
  const t0 = w.pos[g.heroes[0].id];
  // 1人ずつの時は、最初のキャラのマスの近くの、見えているマスへ散らす
  const near = w.tiles.map((t, i) => i).filter((i) => i !== t0).sort((a, b) => Math.abs(a - t0) - Math.abs(b - t0));
  g.heroes.forEach((h, k) => {
    h.classId = set[k][0];
    h.gender = set[k][1];
    w.pos[h.id] = together || k === 0 ? t0 : near[k * 2];
  });
  w.tiles.forEach((t) => { t.seen = true; });
  await page.evaluate((d) => localStorage.setItem('card-rpg/adventure', JSON.stringify(d)), d);
  await page.reload();
  await page.getByText('つづきから', { exact: true }).click();
  await page.waitForTimeout(500);
  await page.locator('[data-hero]').first().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('[data-hero] img')].every((i) => i.complete && i.naturalWidth > 0));
  return page.evaluate(() => [...document.querySelectorAll('[data-hero]')].map((e) => {
    const img = e.querySelector('img'), svg = e.querySelector('svg');
    const ib = img?.getBoundingClientRect(), sb = svg?.getBoundingClientRect(), hb = e.getBoundingClientRect();
    return {
      id: e.getAttribute('data-hero'), src: img?.getAttribute('src') ?? '', nat: img ? `${img.naturalWidth}x${img.naturalHeight}` : '', size: hb.width,
      // 台座の上面（だ円）の上下: svg の 2〜26 / 40
      feet: ib ? ib.bottom : 0, topLo: sb ? sb.top + sb.height * 2 / 40 : 0, topHi: sb ? sb.top + sb.height * 26 / 40 : 0,
      box: [Math.min(ib?.left ?? hb.left, hb.left), Math.min(ib?.top ?? hb.top, hb.top), Math.max(ib?.right ?? hb.right, hb.right), Math.max(ib?.bottom ?? hb.bottom, hb.bottom)],
    };
  }));
}

async function clip(name, info, pad = 10) {
  const x0 = Math.min(...info.map((i) => i.box[0])) - pad, y0 = Math.min(...info.map((i) => i.box[1])) - pad;
  const x1 = Math.max(...info.map((i) => i.box[2])) + pad, y1 = Math.max(...info.map((i) => i.box[3])) + pad;
  const vw = page.viewportSize().width;
  await page.screenshot({ path: `${dir}/${name}.png`, clip: { x: Math.max(0, x0), y: Math.max(0, y0), width: Math.min(vw, x1) - Math.max(0, x0), height: y1 - Math.max(0, y0) } });
}

function verify(name, info, set) {
  info.forEach((i, k) => {
    // 駒の絵は 180×180（全身の絵 480×660 や顔とは大きさで見分ける。ビルド後のファイル名にはフォルダ名が残らない）
    check(i.nat === '180x180' && i.src.includes(`${set[k][0]}-${set[k][1]}`), `${name}: ${i.id} の駒の絵が出ていない (${i.src || '絵なし'} ${i.nat})`);
    check(i.feet >= i.topLo && i.feet <= i.topHi, `${name}: ${i.id} の足 ${i.feet.toFixed(1)} が台座の上面 ${i.topLo.toFixed(1)}〜${i.topHi.toFixed(1)} の外`);
  });
  check(info.length === set.length, `${name}: 駒の数 ${info.length}`);
}

const sample = [['swordSaint', 'male'], ['shrineMaiden', 'female'], ['beastMaster', 'male'], ['pope', 'female']];
for (const width of [360, 390, 480]) {
  await page.setViewportSize({ width, height: 780 });
  for (const together of [true, false]) {
    const name = `${width}-${together ? 'together' : 'apart'}`;
    const info = await show(sample, together);
    verify(name, info, sample);
    const issues = await layoutIssues(page);
    check(!issues.length, `${name}: ${issues}`);
    if (together) await clip(name, info);
    else await page.screenshot({ path: `${dir}/${name}.png` });
    console.log(name, '駒の大きさ', info.map((i) => i.size.toFixed(0)).join('/'));
  }
}
// 88枚すべて（390 の幅で4人ずつ）
await page.setViewportSize({ width: 390, height: 780 });
for (let k = 0; k < ALL.length; k += 4) {
  const set = ALL.slice(k, k + 4);
  const name = `all-${String(k / 4 + 1).padStart(2, '0')}`;
  const info = await show(set, true);
  verify(name, info, set);
  await clip(name, info, 6);
}
await browser.close();
check(!errors.length, `ページのエラー: ${errors.join(' / ')}`);
if (fail.length) { console.error(fail.join('\n')); process.exit(1); }
console.log('piece-art: 成功（写真は', dir, '）');
