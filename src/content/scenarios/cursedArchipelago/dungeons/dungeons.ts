// シナリオ3のダンジョン。
// 制覇すると鍵（灯）が手に入り、3つそろうと最終ダンジョンに入れる。ボスの手前に「物語の部屋」（event）を置く
import type { DungeonDef } from '../../../../types';
// 2026-11-16 シナリオ3の作り直し（docs/tasks/scenario3-rework-plan.md §3-4・最後の「憲章の点検の後の直し」B1・B2）:
// 4か所とも型（src/content/common/dungeonLayouts.ts）の写しをやめ、このシナリオだけの形をファイルに直接書いた（シナリオ1・2と同じ）。
// 並びの決まりは src/engine/__tests__/dungeonShape.test.ts と cursedArchipelago.test.ts（ボスの1つ前は物語の部屋）。
// 海賊の隠れ島は、計画の形が「封魔の宝箱は4行目から」と両立しなかったので、オーナーの返事（案ア）で封魔の宝箱を4行目にずらした。
// 道中のイベントは、シナリオの中で1か所ずつ（前は「小舟の商人」を沈んだ神殿と王冠号の2か所で使っていた。「霧の中の歌声」を王冠号へ移した）。

// 敵の組（K4 手順2）。弱点が同じ敵だけの組にならないようにする（海の生き物は雷、幽霊は聖に弱い）
const WRECK_CAVE_POOLS: DungeonDef['pools'] = {
  battle: [['driftwoodSpirit', 'seaSerpentFry'], ['seaSerpentFry', 'pirateGrunt'], ['merfolkSpearman', 'merfolkSpearman', 'emberSeaCrab'], ['emberSeaCrab', 'jellyfish'], ['seaCrab', 'seaSerpentFry', 'pirateGrunt']],
  elite: [['coralGolem'], ['coralGolem', 'pirateGrunt']],
  boss: ['seaSerpentQueen'],
};
const PIRATE_ISLAND_POOLS: DungeonDef['pools'] = {
  battle: [['pirateGrunt', 'pirateGunner'], ['drownedSailor', 'pirateGunner'], ['siren', 'pirateGrunt'], ['stormJellyfish', 'pirateGunner'], ['ghostDeckhand', 'siren', 'pirateGrunt']],
  elite: [['pirateQuartermaster'], ['pirateQuartermaster', 'pirateGrunt']],
  boss: ['pirateCaptainGuld'],
};
const SUNKEN_TEMPLE_POOLS: DungeonDef['pools'] = {
  battle: [['cursedPirateGrunt', 'shark'], ['shark', 'stormPetrel'], ['conchKnight', 'cursedDrownedSailor'], ['octopusLarva', 'stormPetrel'], ['cursedDrownedSailor', 'shark']],
  elite: [['seaWitch'], ['seaWitch', 'cursedDrownedSailor']],
  boss: ['tideHighPriest'],
};
const FLAGSHIP_POOLS: DungeonDef['pools'] = {
  battle: [['lanternAngler', 'ghostDeckhand'], ['barnacleBeast', 'venomShark'], ['venomShark', 'cursedDrownedSailor'], ['barnacleBeast', 'ghostDeckhand', 'stormPetrel'], ['barnacleBeast', 'cursedDrownedSailor']],
  elite: [['krakenTentacle'], ['stormSeaWitch', 'barnacleBeast']],
  // 7行目の中ボス（提案）
  midboss: ['krakenTentacle', 'ghostDeckhand'],
  boss: ['ghostAdmiral'],
};
const TIDE_CAVE_POOLS: DungeonDef['pools'] = {
  battle: [['shark', 'drownedSailor'], ['conchKnight', 'stormPetrel'], ['venomShark', 'pirateGrunt'], ['octopusLarva', 'ghostDeckhand']],
  elite: [['drownedKnight'], ['pirateQuartermaster', 'ghostDeckhand']],
  boss: ['krakenTentacle', 'drownedKnight'],
};

export const wreckCave: DungeonDef = {
  id: 'wreckCave',
  name: '難破船の洞窟',
  description: '珊瑚の浅瀬の岩場に口を開ける洞窟。海蛇の女王が、星の灯の鍵を守るという。',
  background: 'wreckCave',
  baseLevel: 4,
  pools: WRECK_CAVE_POOLS,
  bossChest: 'epic',
  rewardKey: 'lightStar',
  clearStory: ['海蛇の女王が、静かに海へ沈んでいった。', '洞窟に、星の灯がともった。', '星の灯を手に入れた！'],
  // 形「岩棚と潮だまり」: 2行目で左右に分かれる。左の岩棚 = 満ちてくる潮（イベント）→ 戦闘か強敵。右の潮だまり = 宝箱（コモン）→ 強敵か休憩。
  // 4行目は潮が引いた底: 岩棚の戦闘からは沈んだ宝箱（イベント）か鍵の宝箱へ、潮だまりの強敵からは鍵の宝箱か戦闘へ、休憩からは戦闘へ下りる。
  // 鍵の宝箱は潮だまりの底（右）。沈んだ宝箱の後は戦闘か強敵、鍵の宝箱の後は戦闘だけ（強敵の後の道で、ふつうの戦闘が1回にならないように）。
  // どの道でも、ふつうの戦闘は2〜3回（ボスの前が「休憩 → 物語の部屋」の8行の鍵）。強敵を通らない道 = 岩棚 → 戦闘 → 沈んだ宝箱 → 戦闘
  layout: [
    [{ type: 'battle', next: [0, 1] }],
    [
      { type: 'event', eventId: 'seaCaveTide', next: [0, 1] },
      { type: 'chest', chest: { rarity: 'common', locked: false }, next: [1, 2] },
    ],
    [
      { type: 'battle', next: [0, 2] },
      { type: 'elite', next: [1, 2] },
      { type: 'rest', next: [1] },
    ],
    [
      { type: 'event', eventId: 'sunkenChest', next: [0, 1] },
      { type: 'battle', next: [0] },
      { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [1] },
    ],
    [
      { type: 'elite', next: [0] },
      { type: 'battle', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'event', eventId: 'serpentNest', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

export const pirateIsland: DungeonDef = {
  id: 'pirateIsland',
  name: '海賊の隠れ島',
  description: '霧の海に浮かぶ、海賊たちの隠れ家。死んでなお略奪を続ける船長が、月の灯の鍵を持っている。',
  background: 'pirateIsland',
  baseLevel: 6,
  pools: PIRATE_ISLAND_POOLS,
  bossChest: 'epic',
  rewardKey: 'lightMoon',
  // 1つ目のダンジョンの鍵が要る（play-feedback-plan §4 C: 町や依頼を飛ばして、まっすぐ奥へ行けないように）
  requiresKeys: ['lightStar'],
  clearStory: ['海賊船長ガルドが、剣を落とした。', '「…灯台を、頼む」', '月の灯を手に入れた！'],
  // 形「隠し通路」（2026-11-16 オーナーの返事 2回目 1A = 案ア）: 右の扉（海賊の隠し財産）→ 見張りの強敵 → 奥の封魔の宝箱（財宝の番人）→ 出口の戦闘、の細い隠し通路。
  // 真ん中 = 宝箱（レア）から戦闘か休憩へ、左 = 見張りの強敵から戦闘か休憩へ。封魔の宝箱は「4行目から」の決まり（BALANCE.sealedChest.fromRow）に合わせて4行目に置いた。
  // どの道でも、ふつうの戦闘は3〜4回（1行目・7行目と、3行目か5行目）。強敵を通らない道 = 宝箱 → 休憩 → 封魔の宝箱 → 戦闘 → 休憩 → 戦闘
  layout: [
    [{ type: 'battle', next: [0, 1, 2] }],
    [
      { type: 'elite', next: [0, 1] },
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0, 1] },
      { type: 'event', eventId: 'pirateStash', next: [2] },
    ],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'rest', next: [2] },
      { type: 'elite', next: [2] },
    ],
    [
      { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0, 1] },
      { type: 'event', eventId: 'castawayCamp', next: [0, 1] },
      // 封魔の宝箱（決まった部屋。格はエンジンが奥の行で決める物と同じ: 10行目より前はエピック）
      { type: 'sealedChest', chest: { rarity: 'epic', locked: false, sealed: true }, next: [0] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'elite', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'battle', next: [0] }],
    [{ type: 'event', eventId: 'captainCabin', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

export const sunkenTemple: DungeonDef = {
  id: 'sunkenTemple',
  name: '沈んだ神殿',
  description: '潮の満ち引きで、半分だけ姿を現す古い神殿。潮の神官が、日の灯の鍵を抱いて祈っている。',
  background: 'sunkenTemple',
  baseLevel: 8,
  pools: SUNKEN_TEMPLE_POOLS,
  bossChest: 'legend',
  rewardKey: 'lightSun',
  // 2つ目の鍵と、町の依頼を1つ（報告まで）が要る（冒険を長くする。町に寄る理由を作る）
  requiresKeys: ['lightMoon'],
  requiresQuests: 1,
  clearStory: ['潮の神官が、祈りを止めて微笑んだ。', '「提督は、悲しんでおられる」', '日の灯を手に入れた！'],
  // 形「満ち潮の広間と引き潮の回廊」: 広間（3部屋）と回廊（1部屋の戦闘）が交互に来る。奥の広間（6行目）に封魔の宝箱。
  // どの道でも、ふつうの戦闘は1・3・5行目の3回（7行目の戦闘を選ぶと4回）。5〜7行目の戦う部屋は2回以上。
  // 強敵を通らない道 = 小舟の商人 → 戦闘 → 鍵の宝箱 → 戦闘 → 鍵の宝箱 → 戦闘
  layout: [
    [{ type: 'battle', next: [0, 1, 2] }],
    [
      { type: 'event', eventId: 'seaTrader', next: [0] },
      { type: 'elite', next: [0] },
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
    ],
    [{ type: 'battle', next: [0, 1, 2] }],
    [
      { type: 'elite', next: [0] },
      { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0] },
      { type: 'rest', next: [0] },
    ],
    [{ type: 'battle', next: [0, 1, 2] }],
    [
      { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0, 1] },
      // 封魔の宝箱（決まった部屋。格はエンジンが奥の行で決める物と同じ: 10行目より前はエピック）
      { type: 'sealedChest', chest: { rarity: 'epic', locked: false, sealed: true }, next: [0, 1] },
      { type: 'elite', next: [0] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'elite', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'event', eventId: 'tideAltar', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

export const ghostFlagship: DungeonDef = {
  id: 'ghostFlagship',
  name: '嘆きの王冠号',
  description: '幽霊船団の旗艦。三つの灯がそろわなければ、霧に隠れて姿を現さない。',
  background: 'ghostFlagship',
  baseLevel: 10,
  pools: FLAGSHIP_POOLS,
  bossChest: 'legend',
  requiresKeys: ['lightStar', 'lightMoon', 'lightSun'],
  finale: true,
  // 形「昇降口と左右の舷」: 甲板の広間（3部屋）→ 昇降口（1部屋の戦闘）を下りるたびに左舷・右舷に分かれ、
  // 5→6行目と9→10行目で舷が入れ替わる（はしご）。7行目が中ボス・8行目が休憩。
  // どの道でも、ふつうの戦闘は4回（1・3行目、5か6行目のどちらか、9か10行目のどちらか）。
  // 強敵を通らない道 = 霧の中の歌声 → 戦闘 → 休憩 → 鍵の宝箱 → 戦闘 → 中ボス → 休憩 → 戦闘 → 封魔の宝箱
  layout: [
    [{ type: 'battle', next: [0, 1, 2] }],
    [
      { type: 'elite', next: [0] },
      { type: 'event', eventId: 'ghostSong', next: [0] },
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
    ],
    [{ type: 'battle', next: [0, 1, 2] }],
    [
      { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0] },
      { type: 'rest', next: [0, 1] },
      { type: 'elite', next: [0, 1] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [1] },
    ],
    [
      { type: 'elite', next: [0] },
      { type: 'battle', next: [0] },
    ],
    [{ type: 'midboss', next: [0] }],
    [{ type: 'rest', next: [0, 1] }],
    [
      { type: 'battle', next: [0] },
      { type: 'elite', next: [1] },
    ],
    [
      // 封魔の宝箱（決まった部屋。格はエンジンが奥の行で決める物と同じ: 10行目から先はレジェンド）
      { type: 'sealedChest', chest: { rarity: 'legend', locked: false, sealed: true }, next: [0] },
      { type: 'battle', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'event', eventId: 'admiralBridge', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

// ランダムダンジョン: 潮騒の洞窟（部屋の並びを自動生成）
export const tideCave: DungeonDef = {
  id: 'tideCave',
  name: '潮騒の洞窟',
  description: '訪れるたびに姿を変える海の洞窟。危険だが、奥には豪華な財宝が眠る。',
  background: 'forestCave',
  baseLevel: 7,
  pools: TIDE_CAVE_POOLS,
  bossChest: 'legend',
  random: true,
  // 段階7a: 全5行（4行＋ボスの行）
  rows: 4,
};
