// シナリオ2の世界マップ。下（雪解けの麓）から上（氷の城）へ進む。
// 麓の外は寒い地域。地域ぜんぶの寒さ（climate）と雪原・氷原・湖の氷のマスで、1ターンごとにHPが減る。
// 麓は指定3種を優先（全て氷耐性）。雪林以降は弱点の異なる敵・亜種を組み合わせる。
// シナリオ2の作り直し 区切り2（docs/tasks/scenario2-rework-plan.md §2-1・§8）: 15列×42行の広い地図。
// 地域は5つ・前の並びと id のまま、行だけ広げた（古い 8×35 の保存は地図を作り直さずに遊べる。§2-7）。
// 3つの道は「寒さ」が軸: 西「凍った湖の近道」（湖の氷で速いが寒い・回復無し）／中央「薪の街道」（暖かいが魔物が多い・町）／
// 東「巨人の尾根」（遅くて魔物が強いが、宝箱・温泉・祠・祭壇）。数（敵・宝箱・イベント・祠）は前の約1.7倍（シナリオ1と同じ割合）。
// 座標・地形の割合・帯の倍率は【提案】。帯の寒さ・敵の重み・Lv・宝箱の段は計画の表の数字のまま
import type { ScenarioMapDef } from '../../../types';

export const frozenKingdomMap: ScenarioMapDef = {
  width: 15,
  height: 42,
  start: [7, 40],
  roadTerrain: 'road',
  // 出る災厄（シナリオ2の作り直し §2-2・オーナーの返事 1-A）。氷嵐の魔女は手下がもともと雪の敵なので共通で出す。
  // このシナリオの3体（白狼王・凍て鐘の亡霊・灯を喰らう影）は次の区切りで足す。それまでは、出る災厄は魔女の1体だけ
  scourges: ['stormWitch'],
  // 回復のマス（地域の herbs の数だけ、prefer.herb の帯に置く）は温泉
  herbEvent: 'hotSpring',
  regions: [
    {
      id: 'iceCastleWaste',
      name: '氷の城の荒野',
      intro: '空が白く凍りついている。吹き荒れる雪の向こうに、氷の城が青白くそびえていた。',
      rows: [0, 2],
      terrain: { ice: 4, snow: 2, mountain: 1 },
      climate: { kind: 'cold', ratio: 0.08 },
      enemyLevel: 10,
      encounters: [["frostGuardian", "cursedFrozenSoldier"], ["iceKnight", "frozenGhoul"], ["frostDrakeling", "iceSwordsman"]],
      rareEncounters: [["frostBellKnight"], ["frostBellKnight", "iceSwordsman"]],
      wanderers: 3,
    },
    {
      id: 'blizzardRange',
      name: '吹雪の山脈',
      intro: '吹雪が視界をふさぐ。山の斜面に、巨人の足跡が凍りついていた。',
      rows: [3, 11],
      // 湖の氷（西）・丘と森（東）は区切り2で足した。帯の倍率で、その帯に多く出る
      terrain: { snow: 4, mountain: 3, ice: 1, lakeIce: 1, hills: 1, forest: 0.5 },
      climate: { kind: 'cold', ratio: 0.07 },
      enemyLevel: 8,
      encounters: [['stormSnowOwl', 'iceSwordsman'], ["yeti", "iceSwordsman"], ["blizzardSnake", "stormIceArcher"], ["venomIceSlime", "iceSwordsman"], ["yeti", "stormIceArcher"]],
      wanderers: 7,
      // 宝箱は東の盆地の1つを含めて5つ
      chests: 4,
      events: 5,
      shrines: 2,
    },
    {
      id: 'frozenLake',
      name: '凍てついた湖',
      intro: '見渡すかぎり、凍った湖が広がっている。氷の下に、沈んだ聖堂の尖塔がかすかに見えた。',
      rows: [12, 24],
      // 湖の氷がいちばん多い（西の帯の仕切りの切れ目 = 氷の橋になる）。丘・山・森（東）は区切り2で足した
      terrain: { lakeIce: 5, ice: 2, snow: 2, water: 1, hills: 1, mountain: 0.5, forest: 0.5 },
      climate: { kind: 'cold', ratio: 0.06 },
      enemyLevel: 6,
      encounters: [['iceFisher', 'iceArcher'], ["iceSlime", "frozenGhoul"], ["frostMage", "iceArcher"], ["cursedFrozenSoldier", "iceArcher"]],
      wanderers: 12,
      // 宝箱は西の半島の1つを含めて5つ。イベントは温泉（東）を含めて5つ
      chests: 4,
      events: 4,
      herbs: 1,
      shrines: 2,
      // ランダムダンジョンは西と東に1つずつ（同じ洞窟の敵で、テーマは別々。テーマは今の共通の物のまま）
      randomDungeons: ['frozenCave', 'frozenCave'],
    },
    {
      id: 'birchSnowForest',
      name: '白樺の雪林',
      intro: '雪をかぶった白樺の林が続く。木々の間で、何かが雪を踏む音がする。',
      rows: [25, 33],
      // 湖の氷（西）・山（東）は区切り2で足した
      terrain: { snow: 4, forest: 3, hills: 1, lakeIce: 1, mountain: 0.5 },
      climate: { kind: 'cold', ratio: 0.05 },
      enemyLevel: 4,
      encounters: [['frostMoth', 'snowOwl'], ["iceBat", "frozenSoldier"], ["snowOwl", "icicleBug"], ["emberFrostWolf", "frozenSoldier"], ["frostWolf", "snowOwl"]],
      rareEncounters: [["whiteStag"], ["whiteStag", "snowOwl"]],
      wanderers: 7,
      chests: 5,
      events: 5,
      shrines: 2,
    },
    {
      id: 'thawFoothills',
      name: '雪解けの麓',
      intro: '王国で最後に、わずかな温もりが残る麓。だが、冬は少しずつ迫っている。',
      rows: [34, 41],
      terrain: { plains: 5, hills: 2, forest: 1 },
      enemyLevel: 1,
      encounters: [["snowHare", "snowHare", "frostWolf"], ["frostWolf", "frostSprite"], ["snowHare", "frostSprite"]],
      wanderers: 7,
      chests: 3,
      events: 3,
      shrines: 2,
    },
  ],
  features: [
    // 町は全部、中央の帯の街道の上
    { kind: 'town', id: 'lampVillage', at: [7, 40] },
    { kind: 'town', id: 'firewoodPost', at: [6, 30] },
    { kind: 'town', id: 'lakeVillage', at: [8, 19] },
    { kind: 'town', id: 'fortressTown', at: [6, 9] },
    // 鍵のダンジョンは、街道から3〜5マス外れた東・西・東（脇道でつなぐ）。沈んだ聖堂は湖の下なので西の湖、霜の巨人の鉱山は巨人の尾根
    { kind: 'dungeon', id: 'crystalCave', at: [11, 27] },
    { kind: 'dungeon', id: 'sunkenCathedral', at: [3, 16] },
    { kind: 'dungeon', id: 'giantMine', at: [11, 4] },
    { kind: 'dungeon', id: 'iceCastle', at: [7, 0] },
    // 春の歌の石碑（依頼の名所）は、前と同じく麓の西
    { kind: 'landmark', id: 'songStone', at: [1, 37] },
  ],
  // ---- 広い地図（シナリオ2の作り直し 区切り2）----
  lanes: [
    // 西: 凍った湖の近道。湖の氷（移動 +2）で速いが、寒さ ×2・回復の場所が無い（祠を置かない）。敵は少ない。ランダムダンジョンの入口1つ
    { id: 'west', name: '凍った湖の近道', mark: '❄', hint: '湖の氷で速い（移動+2）が、寒さ2倍。回復の場所が無い', tag: '速い・寒い', spawnWeight: 0.5, climate: 2, noShrine: true,
      cols: [0, 4], terrain: { lakeIce: 4, ice: 0.6, snow: 0.5, water: 0.6, plains: 0.6, hills: 0.2, mountain: 0.2, forest: 0.2 } },
    // 中央: 薪の街道。街道 +1・寒さ ×0.5（番小屋の焚き火）。魔物が多い（町が襲われる道）。町
    { id: 'center', name: '薪の街道', mark: '🔥', hint: '寒さが半分だが、魔物が多い。町がある', tag: '暖かい・魔物多い', spawnWeight: 2.2, climate: 0.5,
      cols: [5, 9], terrain: { lakeIce: 0.08, ice: 0.8, snow: 1.5, plains: 3, forest: 0.6, hills: 0.5, mountain: 0.3, water: 0.2 } },
    // 東: 巨人の尾根。山・森・丘で遅い。寒さ ×1・魔物は Lv+1（雪男・巨人の足跡）。宝箱が多く良い（奥の重み2段）・温泉・祠・祭壇
    { id: 'east', name: '巨人の尾根', mark: '⛰', hint: '遅く魔物が強い（Lv+1）が、宝箱と温泉がある', tag: '危険・宝と温泉', enemyLevel: 1, chestDepth: 2,
      cols: [10, 14], terrain: { lakeIce: 0.05, mountain: 2.5, hills: 3, forest: 2, snow: 0.8, ice: 0.5, water: 0.3, plains: 0.6 } },
  ],
  highway: [[7, 40], [6, 30], [8, 19], [6, 9], [7, 0]],
  // 仕切り: 西と中央の間は開いた湖の水（切れ目 = 氷の橋）、中央と東の間は険しい山（切れ目 = 峠）。真ん中の3地域に、地域ごとに切れ目2つ
  barriers: [
    { even: 5, odd: 4, rows: [4, 10], terrain: 'water', gaps: 2 },
    { even: 10, odd: 9, rows: [4, 10], terrain: 'crag', gaps: 2 },
    { even: 5, odd: 4, rows: [13, 23], terrain: 'water', gaps: 2 },
    { even: 10, odd: 9, rows: [13, 23], terrain: 'crag', gaps: 2 },
    { even: 5, odd: 4, rows: [26, 32], terrain: 'water', gaps: 2 },
    { even: 10, odd: 9, rows: [26, 32], terrain: 'crag', gaps: 2 },
  ],
  // 寄り道: 山脈の東に宝箱の盆地（入口は街道と反対の東向き）・西の湖に宝箱の半島。東の尾根の温泉は prefer.herb で東に置く（計画 §2-1 の4）
  pockets: [
    { kind: 'basin', at: [12, 6], open: 0, wall: 'crag', content: 'chest' },
    { kind: 'peninsula', at: [1, 20], open: 0, wall: 'water', content: 'chest' },
  ],
  prefer: { shrine: 'east', herb: 'east', randomDungeon: ['west', 'east'], altar: 'east', tower: ['west', 'east', 'west', 'east'], chest: 'east' },
  corruptionStages: [
    { at: 25, text: '吹雪が強まり、魔物が増える。町が襲われはじめる', spawn: 3, raid: true },
    { at: 50, text: '魔物が凶暴になる（敵のレベル+1）。町への襲撃が続く', spawn: 2, enemyLevel: 1, raid: true },
    { at: 75, text: '魔物がさらに強くなる（敵のレベル+1）。国が氷に沈みかけている', spawn: 3, enemyLevel: 1, raid: true },
    { at: 100, text: '国が永遠の氷に沈む（ゲームオーバー）' },
  ],
};
