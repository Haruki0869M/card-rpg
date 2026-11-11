// 状態異常を爆発させる（区切りD: 猛毒爆破・爆炎触媒・氷砕き）。対象の status が1以上の時だけ働く
// per = 数×per のダメージ（max まで）／ flat = 固定のダメージ／ halve = 数を半分に／ spread = 半分を、ほかの敵全員に足す
// consume = 全部消す／ splashAll = 消した時、敵全員に固定のダメージ（splashElement の属性）
import { dealDamage, resolveTargets, targetOf } from '..';
import { getStatus } from '../../../../data/statuses';
import { addStatus } from '../../statuses';
import { isEnemy, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    statusBurst: { status: string; per?: number; flat?: number; max?: number; halve?: boolean; spread?: boolean; consume?: boolean; splashAll?: number; splashElement?: string };
  }
}

export const effect: EffectHandler<'statusBurst'> = {
  kind: 'statusBurst',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const n = t.statuses[e.status] ?? 0;
      if (n <= 0 || t.dead) continue;
      any = true;
      const dmg = Math.min(e.max ?? Infinity, (e.per ? n * e.per : 0) + (e.flat ?? 0));
      if (dmg > 0) dealDamage(ctx, t, dmg);
      if (e.consume) t.statuses[e.status] = 0;
      else if (e.halve) t.statuses[e.status] = Math.floor(n / 2);
      if (e.spread && isEnemy(t)) {
        const half = Math.floor(n / 2);
        if (half > 0) for (const o of ctx.state.enemies) if (o !== t && !o.dead) { addStatus(o.statuses, e.status, half); ctx.events.push({ type: 'status', unitId: unitIdOf(o), status: e.status, amount: half }); }
      }
      if (e.splashAll) for (const o of ctx.state.enemies) if (!o.dead) dealDamage(ctx, o, e.splashAll, e.splashElement);
      ctx.parts.push(`${getStatus(e.status).name}${n}を爆発`);
    }
    return any;
  },
  describe(e, who) {
    const name = `「${getStatus(e.status).name}」`;
    const w = who.replace(/に$/, '');
    const parts: string[] = [];
    if (e.per) parts.push(`${name}の数×${e.per}のダメージ${e.max ? `（最大${e.max}）` : ''}`);
    if (e.flat) parts.push(`${e.flat}のダメージ`);
    if (e.consume) parts.push(`${name}を消す`);
    else if (e.halve) parts.push(`${name}は半分になる`);
    if (e.spread) parts.push(`ほかの敵全員に、その${name}の半分をうつす`);
    if (e.splashAll) parts.push(`敵全員に${e.splashAll}の${e.splashElement === 'ice' ? '氷属性' : ''}ダメージ`);
    return `${w}が${name}なら：${parts.join('・')}`;
  },
};
