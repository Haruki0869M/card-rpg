import { getStatus } from '../../data/statuses';
import type { AllyState } from '../../types';

/** カードの直接効果で、仲間に実際の支援があったかを記録する。 */
export function supportSnapshot(allies: AllyState[], source: AllyState) {
  return allies.filter(a => a !== source && !a.dead).map(a => ({
    id: a.id, hp: a.hp, block: a.block, mana: a.mana, focus: a.focus, statuses: { ...a.statuses },
  }));
}

/** 自分の今の様子（1人パーティの時の「自分への支援」を見る。カードのコストを払った後に取る） */
export function selfSnapshot(source: AllyState): ReturnType<typeof supportSnapshot> {
  return [{ id: source.id, hp: source.hp, block: source.block, mana: source.mana, focus: source.focus, statuses: { ...source.statuses } }];
}

/** 前の様子と比べて、支援を受けた味方（HP・ブロック・マナ・フォーカスが増えた／悪い状態異常が減った／良い状態異常が増えた） */
export function helpedAllies(allies: AllyState[], before: ReturnType<typeof supportSnapshot>): AllyState[] {
  return before.flatMap(old => {
    const a = allies.find(x => x.id === old.id);
    if (!a || a.dead) return [];
    if (a.hp > old.hp || a.block > old.block || a.mana > old.mana || a.focus > old.focus) return [a];
    return [...new Set([...Object.keys(old.statuses), ...Object.keys(a.statuses)])].some(id =>
      getStatus(id).harmful ? (a.statuses[id] ?? 0) < (old.statuses[id] ?? 0) : (a.statuses[id] ?? 0) > (old.statuses[id] ?? 0)) ? [a] : [];
  });
}

export function recordSupport(source: AllyState, allies: AllyState[], before: ReturnType<typeof supportSnapshot>) {
  const helped = helpedAllies(allies, before).length > 0;
  if (helped) {
    const f = (source.feats ??= {});
    f['support:others'] = (f['support:others'] ?? 0) + 1;
  }
  return helped;
}
