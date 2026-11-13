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
  // 敵の特殊な行動の直し（docs/tasks/enemy-behaviors-fix-plan.md §3）: 世界マップの組と同じ考えで、特殊な行動の敵がいる組を 2 → 4（5組のうち）に。
  // 「火トカゲ＋灰コウモリ」→「火トカゲ＋炭火の猟犬」、「灰コウモリ×2＋火トカゲ」→「玄武岩の虫＋灰コウモリ＋火トカゲ」（敵の数は変えない）
  battle: [
    ['fireSalamander', 'cinderHound'],
    ['basaltCrawler', 'ashBat', 'fireSalamander'],
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
