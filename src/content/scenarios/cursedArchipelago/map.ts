// シナリオ3の世界マップ。下（港の島）から上（沈没船の海）へ進む。
// 海のマス（sea）は船があるパーティだけが渡れる。施設のまわり1マスは必ず陸（landAround）
// 陸の敵（encounters）は海賊・半魚人・蟹など。海の敵（seaEncounters）は船に乗っている間に出会う鮫・クラゲ・幽霊など
// シナリオ3の作り直し A組・区切り2（docs/tasks/scenario3-rework-plan.md §3-1・§3-7）: 15列×42行の広い地図。
// 地域は5つ・前の並びと id のまま、行だけ広げた（古い 8×35 の保存は地図を作り直さずに遊べる。scenario3OldSave.test.ts）。
// 3つの道は「潮（時間）」が軸: 西「外海の航路」（海が多い・満ち潮〔朝・昼〕だけ船で通れる潮の水道・幽霊船）／
// 中央「桟橋の街道」（海を置かない・いつでも通れる・魔物が多い・町）／東「呪いの島々」（森と沼で遅い・引き潮〔夕方・夜〕だけ歩いて渡れる干潟・宝箱・夜襲）。
// 敵の組は陸20＋海14＝34（海の敵も戦闘に入るので、シナリオ2の「約1.7倍」にしない。計画 §3-1）。宝箱17＋盆地1・イベント12・祠7＋入り江1。
// 座標・地形の割合・帯の倍率・帯の説明の文は【提案】。帯の敵の重み・夜襲・宝箱の段は計画の表の数字のまま
import type { ScenarioMapDef } from '../../../types';

export const cursedArchipelagoMap: ScenarioMapDef = {
  width: 15,
  height: 42,
  start: [7, 40],
  roadTerrain: 'road',
  landAround: 1,
  // 出る災厄（計画 §3-2・オーナーの返事 2-A）: 群島の3体＋共通の「瘴気を紡ぐ死霊術師」。
  // 群島の3体は次の区切り（区切り3）で足す。それまでは死霊術師だけ（一覧が無いと共通の5体が全部出てしまうため）
  scourges: ['miasmaNecro'],
  regions: [
    {
      id: 'wreckSea',
      name: '沈没船の海',
      intro: '霧の奥に、折れたマストの影が並ぶ。ここが、幽霊船団の巣だ。',
      rows: [0, 2],
      // 区切り2: 陸を足した（中央の帯は海を置かないので、最後の船まで陸で歩ける）。暗礁は西の帯だけ
      terrain: { sea: 3, swamp: 1.5, mountain: 0.5, hills: 0.5, forest: 0.5, reef: 0.4 },
      enemyLevel: 10,
      encounters: [['lanternAngler', 'ghostDeckhand'], ['barnacleBeast', 'cursedDrownedSailor'], ['barnacleBeast', 'conchKnight']],
      seaEncounters: [['venomShark', 'ghostDeckhand'], ['venomShark', 'stormPetrel', 'drownedSailor']],
      seaWanderers: 2,
      wanderers: 2,
    },
    {
      id: 'cursedIsles',
      name: '呪われた島々',
      intro: '黒い岩の島が点在している。島の奥で、何かが海を見つめている。',
      rows: [3, 11],
      // 森・沼・丘の島（東で多い）。海は西で多い
      terrain: { sea: 2, forest: 2, hills: 1.5, swamp: 1.5, plains: 0.8, mountain: 0.4, reef: 0.3 },
      enemyLevel: 8,
      encounters: [['cursedPirateGrunt', 'octopusLarva'], ['conchKnight', 'cursedDrownedSailor'], ['octopusLarva', 'stormPetrel'], ['drownedKnight', 'octopusLarva']],
      seaEncounters: [['shark', 'stormPetrel'], ['cursedDrownedSailor', 'siren']],
      seaWanderers: 3,
      wanderers: 5,
      chests: 4,
      events: 3,
      shrines: 2,
    },
    {
      id: 'mistSea',
      name: '霧の海域',
      intro: '濃い霧の中、波の音だけが聞こえる。時おり、遠くで鐘が鳴った。',
      rows: [12, 24],
      // 前は sea 7 に陸2（点検 B8）。帯の倍率だけでは東の「海は少し」にならないので、陸を足した
      terrain: { sea: 3, plains: 1.5, hills: 1, forest: 1, swamp: 0.6, reef: 0.3 },
      enemyLevel: 6,
      encounters: [['pirateGrunt', 'pirateGunner'], ['drownedSailor', 'pirateGunner'], ['ghostDeckhand', 'pirateGrunt', 'pirateGunner']],
      rareEncounters: [['lanternGhostCaptain'], ['lanternGhostCaptain', 'pirateGunner']],
      seaEncounters: [['ghostDeckhand', 'siren'], ['stormJellyfish', 'drownedSailor'], ['siren', 'jellyfish', 'stormJellyfish']],
      seaWanderers: 6,
      wanderers: 5,
      // 宝箱は東の盆地（干潟の宝の小島）の1つを除いて5つ。祠は西の入り江の1つを除いて2つ
      chests: 5,
      events: 4,
      shrines: 2,
      // ランダムダンジョンは西の小島と東に1つずつ（同じ潮騒の洞窟の敵で、テーマは別々。計画 §3-3）
      randomDungeons: ['tideCave', 'tideCave'],
    },
    {
      id: 'coralShallows',
      name: '珊瑚の浅瀬',
      intro: '透き通った浅い海に、色とりどりの珊瑚が揺れている。小さな島が、あちこちに浮かんでいる。',
      rows: [25, 33],
      terrain: { sea: 2, plains: 3, hills: 1, forest: 1, reef: 0.3 },
      enemyLevel: 4,
      encounters: [['driftwoodSpirit', 'merfolkSpearman'], ['merfolkSpearman', 'pirateGrunt'], ['seaCrab', 'emberSeaCrab'], ['merfolkSpearman', 'merfolkSpearman', 'emberSeaCrab']],
      seaEncounters: [['jellyfish', 'seaSerpentFry'], ['seaSerpentFry', 'emberSeaCrab']],
      seaWanderers: 3,
      wanderers: 4,
      chests: 5,
      events: 3,
      shrines: 2,
    },
    {
      id: 'harborIsle',
      name: '港の島',
      intro: '群島でいちばん大きな島。港には、霧を恐れて出航できない船が並んでいる。',
      rows: [34, 41],
      // 海は少し（西の浜だけ。船を借りる前でも、島の中を歩いて回れる）
      terrain: { plains: 5, forest: 1, hills: 1, sea: 0.4 },
      enemyLevel: 1,
      encounters: [['seaCrab', 'pirateGrunt'], ['pirateGrunt', 'seaCrab', 'pirateGrunt'], ['seaCrab', 'pirateGrunt', 'seaCrab']],
      rareEncounters: [['pearlCrab'], ['pearlCrab', 'pirateGrunt']],
      wanderers: 4,
      chests: 3,
      events: 2,
      shrines: 1,
    },
  ],
  features: [
    // 町は全部、中央の帯の街道の上
    { kind: 'town', id: 'harborTown', at: [7, 40] },
    { kind: 'town', id: 'coralVillage', at: [6, 29] },
    { kind: 'town', id: 'lighthouseHouse', at: [8, 18] },
    { kind: 'town', id: 'wreckTown', at: [6, 7] },
    // 鍵のダンジョン: 難破船の洞窟 = 珊瑚の浅瀬の東（陸から歩いて行ける。船を借りない自動プレイも向かう）／
    // 海賊の隠れ島 = 霧の海域の西の島（脇道が海で切れる = 船で行く）／沈んだ神殿 = 呪われた島々の東（いつも通れる脇道でつなぐ）
    { kind: 'dungeon', id: 'wreckCave', at: [11, 27] },
    { kind: 'dungeon', id: 'pirateIsland', at: [1, 16] },
    { kind: 'dungeon', id: 'sunkenTemple', at: [11, 4] },
    { kind: 'dungeon', id: 'ghostFlagship', at: [7, 0] },
    // 潮騒の石碑（依頼の名所）は、前と同じく港の島の西
    { kind: 'landmark', id: 'tideStone', at: [2, 37] },
  ],
  // ---- 広い地図（シナリオ3の作り直し 区切り2）----
  lanes: [
    // 西: 外海の航路。海が多い（小島・暗礁）。陸の敵は少ない（×0.5）が、海の敵（幽霊船など）が多い。潮の水道（満ち潮だけ船で通れる）・島の祠・海賊の隠れ島
    { id: 'west', name: '外海の航路', mark: '⛵', hint: '海が多く船で進む。昼（満ち潮）だけ潮の水道が開く。幽霊船が多い', tag: '船・昼の水道', spawnWeight: 0.5,
      cols: [0, 4], terrain: { sea: 3, reef: 1, plains: 0.5, forest: 0.4, hills: 0.4, swamp: 0.3, mountain: 0.3 } },
    // 中央: 桟橋の街道。海を置かない（陸の置き場が上の地域まで届くように。計画 §2-1）。街道 +1。魔物が多い（×2。町が襲われる道）。町
    { id: 'center', name: '桟橋の街道', mark: '⚓', hint: 'いつでも通れるが、魔物が多い。町がある', tag: 'いつでも・魔物多い', spawnWeight: 2,
      cols: [5, 9], terrain: { sea: 0, reef: 0, plains: 3, forest: 0.6, hills: 0.6, swamp: 0.4, mountain: 0.3 } },
    // 東: 呪いの島々。森・沼・丘で遅い。海は少し。夜襲 ×1.5。宝箱が多く良い（奥の重み2段）・祭壇・干潟（引き潮だけ歩いて渡れる）の先の宝の小島
    { id: 'east', name: '呪いの島々', mark: '🌫', hint: '森と沼で遅い。夜（引き潮）だけ干潟を渡れる。宝箱が多いが夜襲も多い', tag: '夜の干潟・宝', ambush: 1.5, chestDepth: 2,
      cols: [10, 14], terrain: { sea: 0.2, reef: 0, forest: 2.5, swamp: 2.5, hills: 2, plains: 0.5, mountain: 0.5 } },
  ],
  highway: [[7, 40], [6, 29], [8, 18], [6, 7], [7, 0]],
  // 仕切り: 西と中央の間は暗礁（切れ目 = 岩場〔いつも通れる〕1つ＋潮の水道1つ）、中央と東の間は険しい山（切れ目 = 峠1つ＋干潟1つ）。
  // 真ん中の3地域に、地域ごと。いつも通れる切れ目を必ず残す（東を陸でつなぐ・止まりを作らない）
  barriers: [
    { even: 5, odd: 4, rows: [4, 10], terrain: 'reef', gaps: 2, tideGaps: { terrain: 'tideChannel', count: 1 } },
    { even: 10, odd: 9, rows: [4, 10], terrain: 'crag', gaps: 2, tideGaps: { terrain: 'tideFlat', count: 1 } },
    { even: 5, odd: 4, rows: [13, 23], terrain: 'reef', gaps: 2, tideGaps: { terrain: 'tideChannel', count: 1 } },
    { even: 10, odd: 9, rows: [13, 23], terrain: 'crag', gaps: 2, tideGaps: { terrain: 'tideFlat', count: 1 } },
    { even: 5, odd: 4, rows: [26, 32], terrain: 'reef', gaps: 2, tideGaps: { terrain: 'tideChannel', count: 1 } },
    { even: 10, odd: 9, rows: [26, 32], terrain: 'crag', gaps: 2, tideGaps: { terrain: 'tideFlat', count: 1 } },
  ],
  // 寄り道: 東に「干潟の宝の小島」（盆地。壁 = 暗礁・首 = 干潟・中 = 宝箱）、西に「満ち潮の入り江」（半島。壁 = 暗礁・首 = 潮の水道・中 = 祠）。
  // 中のマスには「中から出られる」印が付く（オーナーの決定 6-A。generate.ts）
  pockets: [
    { kind: 'basin', at: [12, 15], open: 0, wall: 'reef', content: 'chest', neck: 'tideFlat' },
    { kind: 'peninsula', at: [1, 20], open: 0, wall: 'reef', content: 'shrine', neck: 'tideChannel' },
  ],
  // 塔を西に置かないのは、西の小島が陸でつながらず、塔の置き場の候補に入らないため（計画 §3-1）
  prefer: { shrine: 'west', altar: 'east', chest: 'east', randomDungeon: ['west', 'east'], tower: ['east', 'center', 'east', 'center'] },
  corruptionStages: [
    { at: 25, text: '霧が濃くなり、幽霊船が増える。港町が襲われはじめる', spawn: 3, raid: true },
    { at: 50, text: '魔物が凶暴になる（敵のレベル+1）。町への襲撃が続く', spawn: 2, enemyLevel: 1, raid: true },
    { at: 75, text: '魔物がさらに強くなる（敵のレベル+1）。群島が霧に沈みかけている', spawn: 3, enemyLevel: 1, raid: true },
    { at: 100, text: '群島が永遠の霧に沈む（ゲームオーバー）' },
  ],
};
