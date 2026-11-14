// ラグナロク・ブレード（魔剣士の決め技）: 「この戦闘で自分が使った属性を全部宿す」
// = この戦闘で自分がカードで使った属性それぞれの状態異常（火 → 火傷、氷 → 凍結 など）を、対象に amount ずつ付ける（オーナーの決定 2026-11-12）。
// 使った属性は、カードを使うたびに counters の elTurn:<属性> に残る（battle.ts）。状態異常を持たない属性（聖など）は何も付けない。
import { getElement } from '../../../../data/elements';
import { getStatus } from '../../../../data/statuses';
import { addStatus } from '../../statuses';
import { isEnemy, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    usedElementStatuses: { amount: number };
  }
}

export const effect: EffectHandler<'usedElementStatuses'> = {
  kind: 'usedElementStatuses',
  defaultTo: 'target',
  apply(ctx, e) {
    const t = ctx.target;
    if (!t || !isEnemy(t) || t.dead || isEnemy(ctx.source)) return false;
    const used = Object.keys(ctx.source.counters ?? {}).filter((k) => k.startsWith('elTurn:')).map((k) => k.slice(7)).sort();
    const names: string[] = [];
    for (const el of used) {
      const st = getElement(el).status;
      if (!st) continue;
      addStatus(t.statuses, st, e.amount);
      ctx.events.push({ type: 'status', unitId: unitIdOf(t), status: st, amount: e.amount });
      names.push(getStatus(st).name);
    }
    if (names.length) ctx.parts.push(`${names.join('・')}${e.amount}`);
    return names.length > 0;
  },
  describe: (e) => `この戦闘で自分が使った属性それぞれの状態異常を、対象に${e.amount}ずつ付ける`,
};
