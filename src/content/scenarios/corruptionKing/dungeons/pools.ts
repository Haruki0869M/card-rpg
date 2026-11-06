// 翠の森の敵の組み合わせ（戦闘・強敵・ボス）
import type { DungeonDef } from '../../../../types';

export const FOREST_POOLS: DungeonDef['pools'] = {
  battle: [
    ['forestWolf', 'forestWolf'],
    ['toxicShroom', 'forestWolf'],
    ['goblinScout', 'toxicShroom', 'goblinScout'],
    ['chaosShaman', 'forestWolf'],
    ['toxicShroom', 'toxicShroom', 'forestWolf'],
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
  ],
  elite: [['bogWraith', 'bogGhoul'], ['bogWraith']],
  boss: ['mordea'],
};

// 灼熱の火山
export const VOLCANO_POOLS: DungeonDef['pools'] = {
  battle: [
    ['fireSalamander', 'ashBat'],
    ['ashBat', 'ashBat', 'fireSalamander'],
    ['fireSalamander', 'fireSalamander'],
  ],
  elite: [['magmaGolem'], ['magmaGolem', 'ashBat']],
  boss: ['ignavarl'],
};

// 魔王城（中ボスは強敵の部屋に置く）
export const CASTLE_POOLS: DungeonDef['pools'] = {
  battle: [['darkKnight', 'ashBat'], ['darkKnight', 'darkKnight'], ['bogWraith', 'darkKnight']],
  elite: [['gatekeeper']],
  boss: ['valgrim'],
};
