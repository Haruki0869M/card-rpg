// ===== 霧（spec §8.1）: キャラの視界に入ったマスが見えるようになる。一度見えたら見えたまま =====
import { BALANCE } from '../../../data/balance';
import type { GameState, WorldState } from '../../../types';
import { petExplore } from '../pets';
import { equippedItems } from '../hero';
import { hexDistance } from './hex';
import { timeOfDay } from './time';
import { exploreEffects } from '../exploreAbilities';

/** キャラの視界（夜は狭くなる。狩人の追跡で広がる） */
export function visionOf(game: GameState, w: WorldState, heroId: string): number {
  const h = game.heroes.find((x) => x.id === heroId);
  const es = h ? exploreEffects(h) : [];
  const pe = petExplore(h);
  const bonus = es.reduce((n, e) => n + (e.kind === 'tracking' ? e.vision : 0), 0) + (pe.vision ?? 0) + (h ? equippedItems(h).reduce((n, i) => n + (i.explore?.vision ?? 0), 0) : 0);
  const night = timeOfDay(w.worldTurn) === 'night' && !pe.nightVision && !es.some(e => e.kind === 'travel' && e.nightVision);
  return Math.max(1, BALANCE.visionRange + bonus - (night ? BALANCE.nightVisionPenalty : 0));
}

export function revealAround(game: GameState, w: WorldState) {
  for (const [heroId, at] of Object.entries(w.pos)) {
    const v = visionOf(game, w, heroId);
    for (let i = 0; i < w.tiles.length; i++) if (!w.tiles[i].seen && hexDistance(w, i, at) <= v) w.tiles[i].seen = true;
  }
}
