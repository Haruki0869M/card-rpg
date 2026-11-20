// 狙った敵が攻撃を予告していれば、その予告の値と同じダメージをすぐに与える（パリィ・カウンター《後の先》。区切りD）
import { dealDamage, resolveTargets, targetOf } from '..';
import { getEnemyAction } from '../../../../data/enemies';
import { isEnemy } from '../../units';
import type { EnemyState } from '../../../../types';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    intentDamage: { max: number };
  }
}

/** 敵の今の予告の、味方へのダメージの合計（攻撃の倍率・BREAK の半減を入れる） */
export function intentAttackValue(e: EnemyState): number {
  if (!e.intent || e.dead) return 0;
  let n = 0;
  for (const eff of getEnemyAction(e.defId, e.intent.actionId).effects) {
    if (eff.kind !== 'damage') continue;
    n += eff.amount * (eff.hits ?? 1);
  }
  return Math.floor(n * (e.attackMul ?? 1) * (e.nextActionMultiplier ?? 1));
}

export const effect: EffectHandler<'intentDamage'> = {
  kind: 'intentDamage',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      if (!isEnemy(t)) continue;
      const v = Math.min(e.max, intentAttackValue(t));
      if (v <= 0) continue;
      ctx.parts.push('後の先');
      dealDamage(ctx, t, v);
      any = true;
    }
    return any;
  },
  describe: (e, who) => `${who.replace(/に$/, '')}が攻撃を予告していれば、その予告の値と同じダメージ（最大${e.max}）`,
};
