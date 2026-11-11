// 区切りE: 不死鳥の羽根。選んだ味方が倒れていればHP pct% で復活、生きていればHPと悪い状態異常を全回復
import { getStatus } from '../../../../data/statuses';
import { isEnemy, nameOf, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    phoenix: { pct: number };
  }
}

export const effect: EffectHandler<'phoenix'> = {
  kind: 'phoenix',
  defaultTo: 'target',
  apply(ctx, e) {
    const t = ctx.target;
    if (!t || isEnemy(t) !== isEnemy(ctx.source)) return false;
    if (t.dead) {
      t.dead = false;
      t.hp = Math.max(1, Math.round((t.maxHp * e.pct) / 100));
      ctx.events.push({ type: 'heal', unitId: unitIdOf(t), amount: t.hp });
      ctx.parts.push(`${nameOf(t)}がHP${t.hp}で復活`);
      return true;
    }
    for (const id of Object.keys(t.statuses)) if (getStatus(id).harmful) t.statuses[id as keyof typeof t.statuses] = 0;
    const amount = t.maxHp - t.hp;
    t.hp = t.maxHp;
    ctx.events.push({ type: 'heal', unitId: unitIdOf(t), amount });
    ctx.parts.push(`${nameOf(t)}が全回復`);
    return true;
  },
  describe: (e) => `選んだ味方が倒れていればHP${e.pct}%で復活。生きていればHPと悪い状態異常を全回復`,
};
