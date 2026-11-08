import type { GameState } from '../../../types';
import { findHero } from '../heroes';
import { ownedBy } from '../common';

export const facilityVisit = (game: GameState) => game.mode === 'town' ? game.town : game.mode === 'shrine' ? game.shrine : game.mode === 'sanctuary' ? game.sanctuary : undefined;
export const facilityMembers = (game: GameState): string[] => {
  const v = facilityVisit(game);
  return v ? v.members ?? [v.heroId] : [];
};
export const facilityHero = (game: GameState, playerId: string, heroId?: string) => {
  const v = facilityVisit(game);
  const id = heroId ?? (v && !v.finished?.includes(v.heroId) && ownedBy(findHero(game, v.heroId), playerId) ? v.heroId : facilityMembers(game).find(id => !v?.finished?.includes(id) && ownedBy(findHero(game, id), playerId)));
  const h = id ? findHero(game, id) : undefined;
  return h && h.hp > 0 && !h.retired && facilityMembers(game).includes(h.id) && ownedBy(h, playerId) && !v?.finished?.includes(h.id) ? h : undefined;
};

/** 各自が利用を終えてから退出する。1台で複数人を遊ぶ場合も、キャラごとに確認する。 */
export function finishFacility(game: GameState, playerId: string, heroId?: string): string | boolean {
  const v = facilityVisit(game), h = facilityHero(game, playerId, heroId);
  if (!v || !h) return '利用中の自分の担当キャラを選んでください';
  (v.finished ??= []).push(h.id);
  return facilityMembers(game).every(id => {
    const x = findHero(game, id);
    return !x || x.hp <= 0 || x.retired || v.finished!.includes(id);
  });
}
