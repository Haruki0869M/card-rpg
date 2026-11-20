import { getClass } from '../../data/classes';
import type { ExploreAbility, Hero } from '../../types';
/** 複合した探索能力を共通の一覧にする。前職の探索能力は持ち越さない。 */
export function exploreEffects(hero: Pick<Hero, 'classId'>): Exclude<ExploreAbility, { kind: 'combined' }>[] {
  const flatten = (e: ExploreAbility): Exclude<ExploreAbility, { kind: 'combined' }>[] => e.kind === 'combined' ? e.effects.flatMap(flatten) : [e];
  return flatten(getClass(hero.classId).exploreAbility.effect);
}
