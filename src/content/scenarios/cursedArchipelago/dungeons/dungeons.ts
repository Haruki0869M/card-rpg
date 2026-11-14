// シナリオ3のダンジョン。
// 制覇すると鍵（灯）が手に入り、3つそろうと最終ダンジョンに入れる。ボスの手前に「物語の部屋」（event）を置く
import type { DungeonDef } from '../../../../types';
import { finaleLayout, keyLayout1, keyLayout2, keyLayout3 } from '../../../common/dungeonLayouts';

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

type Layout = NonNullable<DungeonDef['layout']>;

/** 難破船の洞窟（入門。潮と沈んだ宝箱） */
// 部屋の並びは4つの型（src/content/common/dungeonLayouts.ts）を、このダンジョンのイベントで埋めた物
const wreckCaveLayout: Layout = keyLayout1({ first: 'seaCaveTide', second: 'sunkenChest', story: 'serpentNest' });

/** 海賊の隠れ島（海賊の財宝と罠） */
const pirateIslandLayout: Layout = keyLayout2({ first: 'pirateStash', second: 'castawayCamp', story: 'captainCabin' });

/** 沈んだ神殿（霧の歌と潮の祭壇） */
const sunkenTempleLayout: Layout = keyLayout3({ first: 'ghostSong', second: 'seaTrader', story: 'tideAltar' });

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
  layout: wreckCaveLayout,
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
  layout: pirateIslandLayout,
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
  layout: sunkenTempleLayout,
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
  layout: finaleLayout({ first: 'seaTrader', story: 'admiralBridge' }),
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
