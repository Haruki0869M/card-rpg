// 翠の森の敵の組み合わせ（戦闘・強敵・ボス）
import type { DungeonDef } from '../../../../types';

export const FOREST_POOLS: DungeonDef['pools'] = {
  battle: [
    ['forestWolf', 'forestWolf'],
    ['toxicShroom', 'forestWolf'],
    ['goblinScout', 'toxicShroom', 'goblinScout'],
    ['chaosShaman', 'forestWolf'],
    ['toxicShroom', 'toxicShroom', 'forestWolf'],
    ["thornBoar", "mossCarapace"],
    ["emberForestWolf", "toxicShroom"],
  ],
  elite: [['treeWarden'], ['goblinBrute', 'chaosShaman']],
  boss: ['treantKing'],
};

// 嘆きの沼
export const SWAMP_POOLS: DungeonDef['pools'] = {
  battle: [
    ['bogGhoul', 'bogGhoul'],
    ['mireSlime', 'bogGhoul'],
    ['mireSlime', 'mireSlime', 'bogGhoul'],
    ['bogGhoul', 'bogGhoul', 'mireSlime'],
    ["reedStalker", "shadowBogGhoul"],
    ["reedStalker", "mireSlime", "bogGhoul"],
  ],
  elite: [['bogWraith', 'bogGhoul'], ['bogWraith'],
    ["fenGuardian", "bogGhoul"],
  ],
  boss: ['mordea'],
};

// 灼熱の火山
export const VOLCANO_POOLS: DungeonDef['pools'] = {
  battle: [
    ['fireSalamander', 'ashBat'],
    ['ashBat', 'ashBat', 'fireSalamander'],
    ['fireSalamander', 'fireSalamander'],
    ["cinderHound", "ironAshBat"],
    ["basaltCrawler", "ashBat"],
  ],
  elite: [['magmaGolem'], ['magmaGolem', 'ashBat']],
  boss: ['ignavarl'],
};

// 魔王城（中ボスは強敵の部屋に置く）
export const CASTLE_POOLS: DungeonDef['pools'] = {
  battle: [['darkKnight', 'ashBat'], ['darkKnight', 'darkKnight'], ['bogWraith', 'darkKnight'],
    ["cursedHound", "chainWraith"],
    ["siegeImp", "darkKnight"],
  ],
  elite: [['gatekeeper']],
  // 7行目の中ボス: 門番と黒騎士（提案）
  midboss: ['gatekeeper', 'darkKnight'],
  boss: ['valgrim'],
};

// ランダムの森向けの1体だけを追加する。固定の翠の森には混ぜない。
export const RANDOM_FOREST_POOLS: DungeonDef['pools'] = {
  ...FOREST_POOLS,
  battle: [...FOREST_POOLS.battle, ['rootImp', 'toxicShroom']],
};
