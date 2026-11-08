// 回復・支援のカードの最初の相手（フェーズ1）。見た目の選び方だけで、ゲームの結果・乱数には触れない
import { intentView } from '../components/format';
import { unitIdOf } from '../engine/battle/units';
import type { BattleState } from '../types';
import type { Unit } from '../engine/battle/units';

/** 敵の予告で、この味方が受けるダメージの合計（単体の狙い＋全体攻撃） */
export function incomingDamage(battle: BattleState, allyId: string): number {
  let total = 0;
  for (const e of battle.enemies) {
    if (e.dead) continue;
    const view = intentView(battle, e);
    for (const p of view?.parts ?? []) {
      if (p.kind === 'attack' && p.targetId === allyId) total += p.damage * p.hits;
      if (p.kind === 'attackAll') total += p.damage * p.hits;
    }
  }
  return total;
}

/**
 * 最初の相手: HPが減っている味方（割合が一番低い）。全員満タンなら、敵の予告のダメージの合計が一番大きい味方。
 * 同じなら候補の並び順（元の順）のまま
 */
export function pickAllyTarget(battle: BattleState, choices: readonly Unit[]): string | undefined {
  if (!choices.length) return undefined;
  const ratio = (u: Unit) => (u.maxHp > 0 ? u.hp / u.maxHp : 1);
  const hurt = choices.filter((u) => ratio(u) < 1);
  if (hurt.length) {
    const best = hurt.reduce((a, b) => (ratio(b) < ratio(a) ? b : a));
    return unitIdOf(best);
  }
  const scored = choices.map((u) => ({ u, d: incomingDamage(battle, unitIdOf(u)) }));
  const best = scored.reduce((a, b) => (b.d > a.d ? b : a));
  return unitIdOf(best.u);
}
