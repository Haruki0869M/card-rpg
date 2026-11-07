// 敵が戦闘から逃げる（倒したことにならない。黄金のコソ泥など）
import { addLog, isEnemy, nameOf, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface EffectParams {
    flee: {};
  }
}

export const effect: EffectHandler<'flee'> = {
  kind: 'flee',
  defaultTo: 'self',
  apply(ctx) {
    const u = ctx.source;
    if (!isEnemy(u) || u.dead) return false;
    u.dead = true;
    u.fled = true;
    u.intent = undefined;
    addLog(ctx.state, `${nameOf(u)}は逃げ出した！`);
    ctx.events.push({ type: 'ability', unitId: unitIdOf(u), name: '逃走' });
    ctx.parts.push('逃げ出した');
    return true;
  },
  describe: () => '戦闘から逃げ出す（倒したことにならない）',
};
