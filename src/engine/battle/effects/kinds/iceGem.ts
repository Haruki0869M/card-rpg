// 区切りE: 氷結の魔石。選んだ敵に、amount の氷ダメージと必ず「凍結」1（ボス・中ボスには凍結の代わりに「弱体」1）
import { dealDamage } from '..';
import { addStatus } from '../../statuses';
import { isEnemy, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    iceGem: { amount: number };
  }
}

export const effect: EffectHandler<'iceGem'> = {
  kind: 'iceGem',
  defaultTo: 'target',
  apply(ctx, e) {
    const t = ctx.target;
    if (!t || !isEnemy(t) || t.dead) return false;
    dealDamage(ctx, t, e.amount, 'ice');
    if (t.dead) return true;
    const st = ctx.state.boss || ctx.state.midboss ? 'weak' : 'freeze';
    addStatus(t.statuses, st, 1);
    ctx.events.push({ type: 'status', unitId: t.uid, status: st, amount: 1 });
    ctx.parts.push(`${nameOf(t)}に${st === 'freeze' ? '凍結' : '弱体'}1`);
    return true;
  },
  describe: (e) => `選んだ敵に${e.amount}の氷属性ダメージと、必ず「凍結」1（ボス・中ボスには「弱体」1）`,
};
