// 区切りF: 拳聖《後の先》。ブロックで防いだ量（ctx.dealt）と同じ物理ダメージで、攻撃してきた相手に反撃する。
// 1回最大 max・1ターン perTurn 回まで。明鏡止水（mirrorCounter）の間は2倍・上限なし。反撃で反撃は起きない（深さで止まる）
import { dealDamage } from '..';
import { abilitiesOf } from '../../../abilities';
import { isEnemy, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    /** key = 1ターンの回数を数える名前（省略は《後の先》の gonosen） */
    retaliateDealt: { max: number; perTurn: number; key?: string };
  }
}

export const effect: EffectHandler<'retaliateDealt'> = {
  kind: 'retaliateDealt',
  defaultTo: 'self',
  apply(ctx, e) {
    const foe = ctx.attacker;
    const me = ctx.source;
    if (!foe || foe.dead || isEnemy(foe) === isEnemy(me) || ctx.dealt <= 0) return false;
    const mirror = abilitiesOf(me).some((a) => 'modifier' in a.effect && a.effect.modifier === 'mirrorCounter');
    const cs = ((me as { counters?: Record<string, number> }).counters ??= {});
    if (!mirror) {
      const k = e.key ?? 'gonosen';
      if (cs[`${k}Turn`] !== ctx.state.turn) { cs[`${k}Turn`] = ctx.state.turn; cs[`${k}Count`] = 0; }
      // 見切り: 回数の上限を足す
      const times = e.perTurn + abilitiesOf(me).reduce((n, a) => n + ('modifier' in a.effect && a.effect.modifier === 'counterCap' ? a.effect.times ?? 0 : 0), 0);
      if ((cs[`${k}Count`] ?? 0) >= times) return false;
      cs[`${k}Count`] = (cs[`${k}Count`] ?? 0) + 1;
    }
    // 受けの型: 1回の上限を足す
    const cap = e.max + abilitiesOf(me).reduce((n, a) => n + ('modifier' in a.effect && a.effect.modifier === 'counterCap' ? a.effect.add : 0), 0);
    const amount = mirror ? ctx.dealt * 2 : Math.min(cap, ctx.dealt);
    const loss = dealDamage(ctx, foe, amount);
    ctx.parts.push(`${nameOf(foe)}に後の先${loss}`);
    return true;
  },
  describe: (e) => `防いだ量と同じ物理ダメージで反撃（1回最大${e.max}・1ターン${e.perTurn}回まで）`,
};
