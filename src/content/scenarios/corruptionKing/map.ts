// シナリオ1の世界マップ（spec §16.2）。下（はじまりの平原）から上（魔王城）へ進む。
// 骨格（地域・町・ダンジョン・名所の位置）はここで決め、宝箱・イベント・祠・徘徊する敵の位置はシードで決まる。
// 段階6a（overhaul-plan-v2 §2）: 15列×42行の広い地図。西の森・中央の街道・東の丘と山の3つの帯、帯の間の仕切り（切れ目つき）、
// 盆地と半島（寄り道の宝箱・祠）。数（敵・宝箱・イベント・祠）は前の8列×35行の約1.7倍。座標・数・倍率は【提案】
import type { ScenarioMapDef } from '../../../types';

export const corruptionKingMap: ScenarioMapDef = {
  width: 15,
  height: 42,
  start: [7, 40],
  roadTerrain: 'road',
  regions: [
    {
      id: 'castleRegion',
      name: '魔王城の荒野',
      intro: '空が赤黒く渦を巻いている。瘴気に覆われた大地の先に、魔王城がそびえていた。',
      rows: [0, 2],
      terrain: { blight: 4, mountain: 1 },
      enemyLevel: 9,
      encounters: [['darkKnight'], ['darkKnight', 'ashBat'], ['bogWraith', 'darkKnight'], ["cursedHound", "chainWraith"], ["siegeImp", "darkKnight"]],
      wanderers: 3,
    },
    {
      id: 'volcano',
      name: '灼熱の火山',
      intro: '足元の岩が熱を帯びている。溶岩の川の向こうから、炎竜の咆哮が響いてきた。',
      rows: [3, 11],
      // 丘は東の帯の地形（段階6a で足した。帯の倍率で東に多く出る）
      terrain: { ash: 4, mountain: 2, lava: 1, hills: 1 },
      enemyLevel: 7,
      // 敵の特殊な行動の直し（docs/tasks/enemy-behaviors-fix-plan.md §3）: 特殊な行動の敵がいる組を 2 → 4（5組のうち）に。敵の数は変えない
      encounters: [['fireSalamander', 'cinderHound'], ['magmaGolem'], ['basaltCrawler', 'ashBat', 'fireSalamander'], ["cinderHound", "ironAshBat"], ["basaltCrawler", "ashBat"]],
      wanderers: 7,
      // 宝箱は東の盆地の1つを含めて5つ
      chests: 4,
      events: 5,
      shrines: 2,
    },
    {
      id: 'swamp',
      name: '嘆きの沼',
      intro: '霧の中から、すすり泣くような声が聞こえる。沼の底には、数えきれない亡者が眠るという。',
      rows: [12, 24],
      // 平原（中央）と丘（東）は段階6a で足した。帯の倍率で、その帯に多く出る
      terrain: { swamp: 5, forest: 1, water: 1, plains: 1, hills: 1 },
      enemyLevel: 5,
      encounters: [['bogGhoul', 'bogGhoul'], ['mireSlime', 'bogGhoul'], ['bogWraith', 'mireSlime'], ["reedStalker", "shadowBogGhoul"], ["reedStalker", "mireSlime", "bogGhoul"], ["fenGuardian"]],
      rareEncounters: [['crystalGhoul'], ['crystalGhoul', 'mireSlime']],
      wanderers: 12,
      // 宝箱は東の盆地の1つを含めて5つ。イベントは薬草の群生地を含めて5つ
      chests: 4,
      events: 4,
      herbs: 1,
      shrines: 2,
      // ランダムダンジョンは西と東に1つずつ（段階7a。同じ洞窟の敵で、テーマは別々）
      randomDungeons: ['randomForest', 'randomForest'],
    },
    {
      id: 'forest',
      name: '翠の森',
      intro: '深い森は昼でも薄暗い。木々の間から、獣の目がこちらをうかがっている。',
      rows: [25, 33],
      terrain: { forest: 5, plains: 2, hills: 1 },
      enemyLevel: 3,
      encounters: [['forestWolf', 'forestWolf'], ['toxicShroom', 'forestWolf'], ['goblinScout', 'toxicShroom'], ["thornBoar", "mossCarapace"], ["emberForestWolf", "toxicShroom"]],
      rareEncounters: [['goldenWolf'], ['goldenWolf', 'toxicShroom']],
      wanderers: 7,
      chests: 5,
      // イベントは薬草の群生地を含めて5つ。祠は西の盆地の1つを含めて2つ
      events: 4,
      herbs: 1,
      shrines: 1,
    },
    {
      id: 'plains',
      name: 'はじまりの平原',
      intro: '王都を囲む穏やかな平原。だが、魔王の目覚めと共に魔物の姿が増えはじめている。',
      rows: [34, 41],
      terrain: { plains: 6, hills: 1, forest: 1, water: 1 },
      enemyLevel: 1,
      encounters: [['goblinScout'], ['goblinScout', 'goblinScout'], ['chaosShaman', 'goblinScout']],
      wanderers: 7,
      // 宝箱は東の半島の1つを含めて3つ。イベントは薬草の群生地を含めて3つ
      chests: 2,
      events: 2,
      herbs: 1,
      shrines: 2,
    },
  ],
  features: [
    // 町は全部、中央の街道の上
    { kind: 'town', id: 'royalCapital', at: [7, 40] },
    { kind: 'town', id: 'forestVillage', at: [8, 31] },
    { kind: 'town', id: 'swampHamlet', at: [6, 20] },
    { kind: 'town', id: 'foothillVillage', at: [8, 10] },
    // 鍵のダンジョンは、街道から3〜5マス外れた西・東・西に交互（脇道でつなぐ）
    { kind: 'dungeon', id: 'emeraldTemple', at: [3, 27] },
    { kind: 'dungeon', id: 'silentCatacomb', at: [11, 16] },
    { kind: 'dungeon', id: 'lavaCavern', at: [4, 4] },
    { kind: 'dungeon', id: 'demonCastle', at: [7, 0] },
    // 依頼「古い紋章」の文（平原の西の古い遺跡）に合わせて、平原の西
    { kind: 'landmark', id: 'oldRuins', at: [1, 36] },
  ],
  // ---- 広い地図（段階6a）----
  lanes: [
    // 3つの道（2026-11-14・docs/tasks/three-roads-plan.md）: 敵の出方・夜襲・宝箱の良さを帯ごとに変える。数は全部【提案】。
    // 敵の総数・宝箱の数は地域ごとに今のまま（どの帯に出るかだけ）
    // 西: 森が多い（森林ルート）。遅いが安全（敵が少ない・夜襲が半分）。祠・薬草・ランダムダンジョン
    { id: 'west', name: '西の森', mark: '🌲', hint: '遅いが安全。祠と薬草で回復', tag: '安全・回復', spawnWeight: 0.4, ambush: 0.5,
      cols: [0, 4], terrain: { forest: 3, swamp: 1.5, plains: 0.6, hills: 0.4, mountain: 0.6, lava: 0.5 } },
    // 中央: 平原と街道（街道ルート）。速いが魔物が多い。町
    { id: 'center', name: '中央の街道', mark: '🛣', hint: '速いが魔物が多い。町がある', tag: '速い・魔物多い', spawnWeight: 2.5,
      cols: [5, 9], terrain: { plains: 3, forest: 0.4, swamp: 0.5, hills: 0.5, mountain: 0.3, water: 0.2, lava: 0.2 } },
    // 東: 丘と山（険しいルート）。遅くて危ない（魔物が Lv+1・夜襲が1.5倍）が、宝箱が多くて良い。祭壇
    { id: 'east', name: '東の丘', mark: '⛰', hint: '危ない（魔物Lv+1）が宝箱が多い', tag: '危険・宝が多い', enemyLevel: 1, ambush: 1.5, chestDepth: 2,
      cols: [10, 14], terrain: { hills: 4, mountain: 2, forest: 0.5, plains: 0.6, swamp: 0.6, water: 0.6 } },
  ],
  highway: [[7, 40], [8, 31], [6, 20], [8, 10], [7, 0]],
  // 仕切り: 4〜5列目の間（偶数の行は5列・奇数の行は4列）と、9〜10列目の間（偶数10・奇数9）。真ん中の3地域に、地域ごとに切れ目2つ
  barriers: [
    { even: 5, odd: 4, rows: [4, 10], terrain: 'lava', gaps: 2 },
    { even: 10, odd: 9, rows: [4, 10], terrain: 'crag', gaps: 2 },
    { even: 5, odd: 4, rows: [13, 23], terrain: 'water', gaps: 2 },
    { even: 10, odd: 9, rows: [13, 23], terrain: 'water', gaps: 2 },
    { even: 5, odd: 4, rows: [26, 32], terrain: 'crag', gaps: 2 },
    { even: 10, odd: 9, rows: [26, 32], terrain: 'crag', gaps: 2 },
  ],
  // 盆地（真ん中の3地域に1つずつ。入口は街道と反対の向き）と半島（平原の東）
  pockets: [
    { kind: 'basin', at: [12, 7], open: 0, wall: 'crag', content: 'chest' },
    { kind: 'basin', at: [12, 20], open: 0, wall: 'crag', content: 'chest' },
    { kind: 'basin', at: [1, 29], open: 3, wall: 'crag', content: 'shrine' },
    { kind: 'peninsula', at: [12, 38], open: 0, wall: 'water', content: 'chest' },
  ],
  prefer: { shrine: 'west', herb: 'west', randomDungeon: ['west', 'east'], altar: 'east', tower: ['east', 'west', 'east', 'west'], chest: 'east' },
  corruptionStages: [
    { at: 25, text: '徘徊する魔物が増え、町が襲われはじめる', spawn: 3, raid: true },
    { at: 50, text: '魔物が凶暴になる（敵のレベル+1）。町への襲撃が続く', spawn: 2, enemyLevel: 1, raid: true },
    { at: 75, text: '魔物がさらに強くなる（敵のレベル+1）。世界の終わりが近い', spawn: 3, enemyLevel: 1, raid: true },
    { at: 100, text: '世界が侵食に呑まれる（ゲームオーバー）' },
  ],
};
