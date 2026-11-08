// 敵の絵の確認（凍てつく王国・共通・侵食の魔王の新しい敵・機械仕掛けの帝国・呪われた群島・砂塵の王朝・星降る天空城・K3 D・夢幻の大迷宮・レアの敵と隠しボス）: 戦闘に3体ずつ出して、描いた絵（webp）が出ているかを調べ、写真を撮る。
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
  'clockworkSage', 'copperKnight', 'furnaceGolem', 'greatMachine',
  // 呪われた群島
  'seaCrab', 'jellyfish', 'seaSerpentFry', 'merfolkSpearman', 'pirateGrunt', 'drownedSailor', 'ghostDeckhand', 'pirateGunner', 'siren',
  'shark', 'conchKnight', 'stormPetrel', 'octopusLarva', 'barnacleBeast', 'pirateQuartermaster', 'coralGolem', 'drownedKnight', 'seaWitch',
  'krakenTentacle', 'seaSerpentQueen', 'pirateCaptainGuld', 'tideHighPriest', 'ghostAdmiral',
  // 砂塵の王朝
  'stoneCat', 'sphinxCub', 'sandScarab', 'desertViper', 'jackalWarrior', 'tombRobber', 'sandScorpion', 'vulture', 'mummy', 'sandSprite', 'dustDevil', 'sandWorm',
  'clayGolem', 'mummyArcher', 'cursedPriest', 'royalGuardMummy', 'scribeShade', 'sandSerpentLord', 'colossusStatue', 'sandScorpionKing',
  'shadowVizier', 'stoneGuardianBeast', 'sandPharaoh',
  // 星降る天空城
  'cloudSheep', 'skyGull', 'windSprite', 'clockworkSoldier', 'starJelly', 'gearBeetle', 'shootingStarBird', 'moonRabbit', 'angelStatue',
  'starFragment', 'windGuardianHawk', 'windKeeper', 'starDustScribe', 'starLibrarian', 'moonWolf', 'thornFairy', 'hourglassGolem',
  'clockworkKnight', 'moonGardener', 'moonMaiden', 'skyKnight', 'skyPaladin', 'starSeerQueen',
  // 各シナリオに足す敵（K3 D）
  'iceFisher', 'frostMoth', 'driftwoodSpirit', 'lanternAngler', 'desertFennec', 'obeliskSentinel', 'cometFox', 'harpGuardian',
  'smokeStackCrow', 'pressGolem',
  // 夢幻の大迷宮の新しい敵
  'nightmareMote', 'sleepwalker', 'pillowGolem', 'lullabyBird', 'shadowChild', 'lostMemory', 'mirrorKnight', 'dreamWeaver', 'memoryEater', 'dreamEater',
  // レアの敵と隠しボス
  'goldenWolf', 'crystalGhoul', 'whiteStag', 'frostBellKnight', 'pearlCrab', 'lanternGhostCaptain', 'goldenScarab', 'starlitSwan',
  'brassClockCat', 'crimsonSteamHound', 'hollowDemonLord', 'drownedBride', 'fallenStarSerpent', 'ancientEngineHeart'];
const PHASES = { crystalLord: [1], frozenBishop: [1], frostGiant: [1], whiteQueen: [1, 2], foremanGolem: [1], runawayBoiler: [1], clockworkSage: [1], greatMachine: [1, 2],
  seaSerpentQueen: [1], pirateCaptainGuld: [1], tideHighPriest: [1], ghostAdmiral: [1, 2],
  sandScorpionKing: [1], shadowVizier: [1], stoneGuardianBeast: [1], sandPharaoh: [1, 2],
  windKeeper: [1], starLibrarian: [1], moonMaiden: [1], starSeerQueen: [1, 2], dreamEater: [1, 2],
  hollowDemonLord: [1], drownedBride: [1], fallenStarSerpent: [1], ancientEngineHeart: [1] };
const problems = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

/** 戦闘の敵の絵の src（敵の順） */
const enemyImgs = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-enemy] img')].map((i) => {
      // 戦場（敵の要素の親。overflow で切れる）の上の端より、絵の上の端が上に出ていないか
      const field = i.closest('[data-enemy]')?.offsetParent?.getBoundingClientRect();
      const r = i.getBoundingClientRect();
      return { src: i.getAttribute('src') ?? '', ok: i.complete && i.naturalWidth > 0, h: r.height, over: field ? Math.round(field.top - r.top) : 0 };
    }),
  );

async function check(tag, ids, phase = 0) {
  await page.waitForTimeout(500);
  const imgs = await enemyImgs();
  for (const id of ids) {
    const want = phase ? `${id}-${phase}-` : `${id}-`;
    const hit = imgs.find((i) => i.src.includes(`/${want}`));
    if (!hit) problems.push(`${tag}: ${id}${phase ? `（段階${phase}）` : ''} の描いた絵が出ていない`);
    else if (!hit.ok) problems.push(`${tag}: ${id} の絵が読み込めていない`);
    // 大きな敵の体の上が、戦場の上の端（上の帯）で切れていないか（絵の上の余白の分、少しは許す）
    else if (hit.over > hit.h * 0.04) problems.push(`${tag}: ${id} の絵の上が ${hit.over}px 切れている`);
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
// 大きなボス＋3体（4人の味方）: 敵の絵の上が切れない・敵の情報（名前〜予告）と味方の立ち絵の箱が重ならないか
const MIXED = [['greatMachine', 'gearBug', 'steamRat', 'oilSlime'], ['starSeerQueen', 'cloudSheep', 'skyGull'], ['frostGiant', 'snowHare']];
for (const [w, h] of [[360, 640], [390, 844], [480, 854]]) {
  await page.setViewportSize({ width: w, height: h });
  for (const g of MIXED) {
    await startBattle(page, 4, g);
    await check(`${w} 4人 ${g.join('・')}`, g);
    const overlap = await page.evaluate(() => {
      const infos = [...document.querySelectorAll('[data-enemy]:not([data-dead]) [data-enemy-info]')].map((e) => e.getBoundingClientRect());
      const allies = [...document.querySelectorAll('[data-ally-sprite]')].map((e) => e.getBoundingClientRect());
      let worst = 0;
      for (const a of infos) for (const b of allies) {
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (x > 0 && y > 0) worst = Math.max(worst, Math.round(y));
      }
      return worst;
    });
    console.log(`${w}x${h} 4人 ${g.join('・')}: 敵の情報と味方の立ち絵の箱の重なり ${overlap}px`);
    await page.screenshot({ path: `${OUT}/mixed-${w}-${g[0]}.png` });
  }
}
await page.setViewportSize({ width: 390, height: 844 });
// 変身後の絵
for (const [id, list] of Object.entries(PHASES)) {
  await startBattle(page, 1, [id]);
  // 戦闘の始めに、変身後の絵を先に読み始めているか（変身した瞬間に絵が欠けないように）
  await page.waitForTimeout(300);
  const fetched = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name));
  for (const phase of list) if (!fetched.some((u) => u.includes(`/${id}-${phase}-`))) problems.push(`390 ${id}: 戦闘の始めに段階${phase}の絵を先に読んでいない`);
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
