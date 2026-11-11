// 区切りE: 氷結の魔石。最後に狙った敵（いなければ先頭の敵）に、amount の氷ダメージと必ず「凍結」1（ボス・中ボスには凍結の代わりに「弱体」1）
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
  defaultTo: 'self',
  apply(ctx, e) {
    const foes = ctx.state.enemies.filter((x) => !x.dead);
    const last = isEnemy(ctx.source) ? undefined : ctx.source.lastTargetId;
    const t = foes.find((x) => x.uid === last) ?? foes[0];
    if (!t) return false;
    dealDamage(ctx, t, e.amount, 'ice');
    if (t.dead) return true;
    const st = ctx.state.boss || ctx.state.midboss ? 'weak' : 'freeze';
    addStatus(t.statuses, st, 1);
    ctx.events.push({ type: 'status', unitId: t.uid, status: st, amount: 1 });
    ctx.parts.push(`${nameOf(t)}に${st === 'freeze' ? '凍結' : '弱体'}1`);
    return true;
  },
  describe: (e) => `最後に狙った敵（いなければ先頭の敵）に${e.amount}の氷属性ダメージと、必ず「凍結」1（ボス・中ボスには「弱体」1）`,
};
