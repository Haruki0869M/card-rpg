import { getStatus } from '../../data/statuses';
import type { AllyState } from '../../types';

/** カードの直接効果で、仲間に実際の支援があったかを記録する。 */
export function supportSnapshot(allies: AllyState[], source: AllyState) {
  return allies.filter(a => a !== source && !a.dead).map(a => ({
    id: a.id, hp: a.hp, block: a.block, mana: a.mana, focus: a.focus, statuses: { ...a.statuses },
  }));
}

export function recordSupport(source: AllyState, allies: AllyState[], before: ReturnType<typeof supportSnapshot>) {
  const helped = before.some(old => {
    const a = allies.find(x => x.id === old.id);
    if (!a || a.dead) return false;
    if (a.hp > old.hp || a.block > old.block || a.mana > old.mana || a.focus > old.focus) return true;
    return [...new Set([...Object.keys(old.statuses), ...Object.keys(a.statuses)])].some(id =>
      getStatus(id).harmful ? (a.statuses[id] ?? 0) < (old.statuses[id] ?? 0) : (a.statuses[id] ?? 0) > (old.statuses[id] ?? 0));
  });
  if (helped) {
    const f = (source.feats ??= {});
    f['support:others'] = (f['support:others'] ?? 0) + 1;
  }
  return helped;
}
