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
