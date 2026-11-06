// ランダム: 1ターン目は firstActionId があればそれ。同じ行動の連続は maxConsecutive 回まで
import type { EnemyAiHandler } from './types';

export const ai: EnemyAiHandler = {
  id: 'random',
  choose(enemy, _state, rng, set, resolve) {
    if (enemy.history.length === 0 && enemy.phase === 0 && set.firstActionId) {
      const first = set.actions.find((a) => a.id === set.firstActionId);
      if (first) return resolve(first);
    }
    const max = set.maxConsecutive ?? Infinity;
    const recent = enemy.history.slice(-max);
    const blocked = recent.length >= max && recent.every((id) => id === recent[0]) ? recent[0] : undefined;
    const resolved = set.actions.map(resolve);
    const unique = resolved.filter((a, i) => resolved.findIndex((b) => b.id === a.id) === i);
    let candidates = unique.filter((a) => a.id !== blocked);
    if (candidates.length === 0) candidates = unique;
    return candidates[rng.int(candidates.length)];
  },
};
