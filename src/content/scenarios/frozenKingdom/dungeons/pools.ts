// 凍てつく王国の敵の組み合わせ（戦闘・強敵・ボス）。
// 今は仮（共通の敵）。手順2で、このシナリオの敵28体に置き換える
import type { DungeonDef } from '../../../../types';

export const CRYSTAL_POOLS: DungeonDef['pools'] = {
  battle: [['guardDog', 'guardDog'], ['goblinScout', 'guardDog'], ['chaosShaman', 'goblinScout'], ['goblinScout', 'goblinScout', 'chaosShaman']],
  elite: [['goblinBrute'], ['goblinBrute', 'chaosShaman']],
  boss: ['goblinBrute'],
};

export const CATHEDRAL_POOLS: DungeonDef['pools'] = {
  battle: [['chaosShaman', 'guardDog'], ['chaosShaman', 'chaosShaman'], ['goblinScout', 'chaosShaman', 'guardDog']],
  elite: [['goblinBrute', 'chaosShaman'], ['goblinBrute']],
  boss: ['goblinBrute'],
};

export const MINE_POOLS: DungeonDef['pools'] = {
  battle: [['goblinBrute', 'goblinScout'], ['guardDog', 'guardDog', 'goblinScout'], ['goblinBrute', 'guardDog']],
  elite: [['goblinBrute', 'goblinBrute'], ['goblinBrute', 'chaosShaman']],
  boss: ['goblinBrute'],
};

export const CASTLE_POOLS: DungeonDef['pools'] = {
  battle: [['goblinBrute', 'chaosShaman'], ['goblinBrute', 'goblinBrute'], ['chaosShaman', 'chaosShaman', 'guardDog']],
  elite: [['goblinBrute', 'goblinBrute']],
  boss: ['goblinBrute'],
};
