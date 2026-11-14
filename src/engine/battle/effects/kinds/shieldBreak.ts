// 盾砕き（敵の特殊な行動・玄武岩の虫）: 狙った相手のブロックを0にする。後ろに続くダメージの前に置く。
// BREAK された予告では壊さない（予告の文「BREAK するか、ブロックに頼らずに受ける」）。ダメージは今の大技の決まりどおり半分になる
import { resolveTargets, targetOf } from '..';
import { addLog, isEnemy, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    shieldBreak: { unused?: never };
  }
}

export const effect: EffectHandler<'shieldBreak'> = {
  kind: 'shieldBreak',
  defaultTo: 'target',
  apply(ctx, e) {
    const { source, state } = ctx;
    if (isEnemy(source) && source.broken) {
      ctx.parts.push('BREAK でブロックは無事');
      return false;
    }
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      if (t.block <= 0) continue;
      const lost = t.block;
      t.block = 0;
      any = true;
      ctx.parts.push(`${nameOf(t)}のブロック${lost}を壊した`);
      addLog(state, `${nameOf(source)}の盾砕き！ ${nameOf(t)}のブロック${lost}が壊れた`);
    }
    return any;
  },
  describe: (_e, who) => `${who.replace(/に$/, 'の')}ブロックを全部壊す（BREAK されると壊さない）`,
  short: () => '0',
};
