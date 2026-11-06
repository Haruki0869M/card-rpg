// 順番: 行動の一覧を上から順にくり返す
import type { EnemyAiHandler } from './types';

export const ai: EnemyAiHandler = {
  id: 'sequence',
  choose(enemy, _state, _rng, set, resolve) {
    const a = set.actions[enemy.seqIndex % set.actions.length];
    enemy.seqIndex = (enemy.seqIndex + 1) % set.actions.length;
    return resolve(a);
  },
};
