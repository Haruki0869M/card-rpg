// 区切りD-4 決め技の部品: asuraFists: amount×(hits＋この戦闘で使った物理カード per 枚ごとに1。最大+max) のダメージ（無想阿修羅拳）
import { dealDamage, resolveTargets, targetOf } from '..';
import { isEnemy } from '../../units';
import { upgradeAmount, type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    asuraFists: { amount: number; hits: number; per: number; max: number };
  }
}

export const effect: EffectHandler<'asuraFists'> = {
  kind: 'asuraFists',
  defaultTo: 'target',
  apply(ctx, e) {
    const used = isEnemy(ctx.source) ? 0 : (ctx.source.counters?.physBattle ?? 0);
    const hits = e.hits + Math.min(e.max, Math.floor(used / e.per));
    let any = false;
    for (let i = 0; i < hits; i++) for (const t of resolveTargets(ctx, targetOf(e))) { dealDamage(ctx, t, e.amount); any = true; }
    ctx.parts.push(`${hits}連打`);
    return any;
  },
  describe: (e, who) => `${who}${e.amount}のダメージ×${e.hits}回。この戦闘で使った物理カード${e.per}枚ごとに、回数+1（最大+${e.max}）`,
  short: (e) => `${e.amount}×${e.hits}`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
