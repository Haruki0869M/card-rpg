// 敵が戦闘から逃げる（倒したことにならない。黄金のコソ泥など）
import { addLog, isEnemy, nameOf, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';
import { fallbackLoneIntents } from '../../intents';

declare module '../../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface EffectParams {
    /** all = 取り巻きも一緒に逃げる（戦闘が終わる。強欲の盗賊王の段階「宝を抱えて逃げる」。2026-11-14） */
    flee: { all?: boolean };
  }
}

export const effect: EffectHandler<'flee'> = {
  kind: 'flee',
  defaultTo: 'self',
  apply(ctx, e) {
    const u = ctx.source;
    if (!isEnemy(u) || u.dead) return false;
    u.dead = true;
    u.fled = true;
    u.intent = undefined;
    addLog(ctx.state, `${nameOf(u)}は逃げ出した！`);
    if (e.all) {
      for (const o of ctx.state.enemies) {
        if (o.dead) continue;
        o.dead = true;
        o.fled = true;
        o.intent = undefined;
      }
      addLog(ctx.state, '取り巻きも一緒に逃げていった');
    }
    ctx.events.push({ type: 'ability', unitId: unitIdOf(u), name: '逃走' });
    ctx.parts.push('逃げ出した');
    // かばう相手がいなくなった敵は、予告を代わりの行動に変える
    fallbackLoneIntents(ctx.state, ctx.rng, ctx.events);
    return true;
  },
  describe: (e) => (e.all ? '取り巻きと一緒に戦闘から逃げ出す（戦闘が終わる。倒したことにならない）' : '戦闘から逃げ出す（倒したことにならない）'),
};
