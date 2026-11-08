// 敵の絵の確認（凍てつく王国・共通・侵食の魔王の新しい敵・機械仕掛けの帝国）: 戦闘に3体ずつ出して、描いた絵（webp）が出ているかを調べ、写真を撮る。
// 変身するボス（crystalLord・frozenBishop・frostGiant・whiteQueen）は、保存データで段階を進めて、変身後の絵（<ID>-<段階>）に変わるかも調べる。
// 使い方: URL=http://127.0.0.1:<番号>/card-rpg/ node scripts/enemy-art.mjs
import { mkdirSync } from 'node:fs';
import { chromium, layoutIssues, startBattle } from './lib.mjs';

const OUT = process.env.ENEMY_ART_OUTPUT ?? 'screenshots/enemy-art';
mkdirSync(OUT, { recursive: true });
const ENEMIES = ['snowHare', 'frostWolf', 'frostSprite', 'iceBat', 'frozenSoldier', 'snowOwl', 'icicleBug', 'snowWitch', 'crystalLord',
  'iceSlime', 'frozenGhoul', 'iceArcher', 'frostMage', 'frozenBishop', 'blizzardSnake', 'yeti', 'frostDrakeling', 'blizzardBeast',
  'frostGiant', 'iceKnight', 'iceSwordsman', 'frostGuardian', 'whiteQueen', 'goldenThief', 'guardDog',
  'banditThug', 'banditArcher', 'banditChief', 'wildBoar', 'giantSpider', 'caveBat', 'stoneTortoise', 'greatBear', 'shambler',
  'wanderingGhost', 'imp', 'hauntedKnight',
  // 侵食の魔王の新しい10体
  'thornBoar', 'mossCarapace', 'rootImp', 'reedStalker', 'fenGuardian', 'cinderHound', 'basaltCrawler', 'chainWraith', 'siegeImp', 'cursedHound',
  // 機械仕掛けの帝国
  'gearBug', 'steamRat', 'brokenAutomaton', 'conveyorBot', 'riveter', 'oilSlime', 'sparkTurret', 'foremanBot', 'foremanGolem', 'steamSprite',
  'boilerCrab', 'wrenchGolem', 'clockworkDog', 'steamTurretLord', 'runawayBoiler', 'pistonFist', 'furnaceImp', 'ironButler', 'chainSaw',
  'clockworkSage', 'copperKnight', 'furnaceGolem', 'greatMachine'];
const PHASES = { crystalLord: [1], frozenBishop: [1], frostGiant: [1], whiteQueen: [1, 2], foremanGolem: [1], runawayBoiler: [1], clockworkSage: [1], greatMachine: [1, 2] };
const problems = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

/** 戦闘の敵の絵の src（敵の順） */
const enemyImgs = () =>
  page.evaluate(() => [...document.querySelectorAll('[data-enemy-id] img, [data-enemy] img')].map((i) => ({ src: i.getAttribute('src') ?? '', ok: i.complete && i.naturalWidth > 0, h: i.getBoundingClientRect().height })));

async function check(tag, ids, phase = 0) {
  await page.waitForTimeout(500);
  const imgs = await enemyImgs();
  for (const id of ids) {
    const want = phase ? `${id}-${phase}-` : `${id}-`;
    const hit = imgs.find((i) => i.src.includes(`/${want}`));
    if (!hit) problems.push(`${tag}: ${id}${phase ? `（段階${phase}）` : ''} の描いた絵が出ていない`);
    else if (!hit.ok) problems.push(`${tag}: ${id} の絵が読み込めていない`);
  }
  const issues = await layoutIssues(page);
  if (issues.length) problems.push(`${tag}: ${issues.join(' / ')}`);
}

const groups = [];
for (let i = 0; i < ENEMIES.length; i += 3) groups.push(ENEMIES.slice(i, i + 3));
for (const [w, h] of [[360, 640], [480, 854], [390, 844]]) {
  await page.setViewportSize({ width: w, height: h });
  for (const g of w === 390 ? groups : [groups[2]]) {
    await startBattle(page, 1, g);
    await check(`${w} ${g.join('・')}`, g);
    await page.screenshot({ path: `${OUT}/${w}-${g.join('-')}.png` });
  }
}
// 変身後の絵
for (const [id, list] of Object.entries(PHASES)) {
  await startBattle(page, 1, [id]);
  for (const phase of list) {
    await page.evaluate(
      ({ phase }) => {
        const k = 'card-rpg/adventure';
        const d = JSON.parse(localStorage.getItem(k));
        const g = d.game;
        const b = g.expeditions?.[0]?.battle ?? g.battle;
        for (const e of b.enemies) e.phase = phase;
        localStorage.setItem(k, JSON.stringify(d));
      },
      { phase },
    );
    await page.reload();
    await page.getByText('つづきから').click();
    await check(`390 ${id} 段階${phase}`, [id], phase);
    await page.screenshot({ path: `${OUT}/390-${id}-${phase}.png` });
  }
}
await browser.close();
if (errors.length) problems.push(`画面の例外: ${errors.join(' / ')}`);
if (problems.length) {
  console.log('NG:\n' + problems.join('\n'));
  process.exit(1);
}
console.log(`OK: 敵の絵 ${ENEMIES.length}体・変身後${Object.values(PHASES).flat().length}枚（360/390/480）`);
