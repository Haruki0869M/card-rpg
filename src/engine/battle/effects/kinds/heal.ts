// HP回復
import { dealDamage, resolveTargets, targetOf } from '..';
import type { EnemyState } from '../../../../types';
import type { EffectCtx } from '../types';

/** 反転の呪印が働く時（このターン・味方1人を回復するカード・呪印の敵が生きている）は、その敵と倍率 */
function reversalOf(ctx: EffectCtx): { foe: EnemyState; pct: number; max: number } | undefined {
  const src = ctx.source;
  if (isEnemy(src) || !src.reversal || src.reversal.turn !== ctx.state.turn) return undefined;
  if (!ctx.card || (ctx.card.target !== 'ally' && ctx.card.target !== 'otherAlly')) return undefined;
  const foe = ctx.state.enemies.find((x) => x.uid === src.reversal!.targetId && !x.dead);
  return foe ? { foe, pct: src.reversal.pct, max: src.reversal.max } : undefined;
}
import { fireAbilities } from '../../../abilities';
import { healUnit, isEnemy, nameOf, type Unit } from '../../units';
import { type EffectHandler, upgradeAmount } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    heal: { amount: number };
  }
}

export const effect: EffectHandler<'heal'> = {
  kind: 'heal',
  defaultTo: 'target',
  apply(ctx, e) {
    // 区切りD: 反転の呪印 — 味方1人を回復するカードは、回復の代わりに、呪印の敵へ聖ダメージ
    const rev = reversalOf(ctx);
    if (rev) {
      dealDamage(ctx, rev.foe, Math.min(rev.max, Math.floor((e.amount * rev.pct) / 100)), 'holy');
      ctx.parts.push('反転の呪印');
      return true;
    }
    const ts = resolveTargets(ctx, targetOf(e));
    let total = 0;
    // きっかけ: 回復がHPからあふれた（満タンの味方を回復した時も。朝の祈り）
    const over: { t: Unit; amount: number; wasFull: boolean }[] = [];
    for (const t of ts) {
      const wasFull = t.hp >= t.maxHp;
      const healed = healUnit(t, e.amount, ctx.events);
      total += healed;
      if (t.hp >= t.maxHp && healed < e.amount) over.push({ t, amount: e.amount - healed, wasFull });
    }
    if (ctx.depth < 3 && !isEnemy(ctx.source) && !ctx.source.dead)
      for (const o of over) if (!isEnemy(o.t)) fireAbilities(ctx.state, ctx.rng, ctx.events, ctx.source, 'overheal', { allyTarget: o.t, dealt: o.amount, wasFull: o.wasFull, depth: ctx.depth + 1 });
    if (ts.length > 1) ctx.parts.push(`全員のHP+${e.amount}`);
    else if (ts.length === 1 && total > 0) ctx.parts.push(`${nameOf(ts[0])}のHP+${total}`);
    return total > 0;
  },
  check(ctx, e) {
    if (reversalOf(ctx)) return null;
    const ts = resolveTargets(ctx, targetOf(e));
    return ts.every((t) => t.hp >= t.maxHp) ? 'HPは満タンです' : null;
  },
  describe: (e, who) => `${who === '自分に' ? '' : who.replace(/に$/, 'の')}HPを${e.amount}回復`,
  short: (e) => `${e.amount}`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
