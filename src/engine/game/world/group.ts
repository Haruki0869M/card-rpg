import type { GameState } from '../../../types';
import { mapHeroes } from '../heroes';

/** 合意済みの同行関係を、同じマスのグループとして読む。旧保存の片方向の関係も利用できる。 */
export function followingGroup(game: GameState, heroId: string): string[] {
  const w = game.world;
  if (!w) return [heroId];
  const here = new Set(mapHeroes(game).filter(h => h.hp > 0 && !h.retired && w.pos[h.id] === w.pos[heroId]).map(h => h.id));
  const group = new Set([heroId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, b] of Object.entries(w.follow ?? {})) {
      if (!here.has(a) || !here.has(b) || (!group.has(a) && !group.has(b))) continue;
      if (!group.has(a) || !group.has(b)) changed = true;
      group.add(a); group.add(b);
    }
  }
  return [...group];
}

export function detachFollower(game: GameState, heroId: string) {
  const w = game.world;
  if (!w?.follow) return;
  // 残る人どうしの同行関係は維持する。
  const rest = followingGroup(game, heroId).filter(id => id !== heroId);
  for (const [a, b] of Object.entries(w.follow)) if (a === heroId || b === heroId) delete w.follow[a];
  for (const id of rest.slice(1)) w.follow[id] = rest[0];
}
