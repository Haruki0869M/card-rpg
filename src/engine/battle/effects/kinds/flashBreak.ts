// 区切りE: 閃光の破砕玉。選んだ敵が大技を予告していれば、その場で BREAK して「脆弱」を付ける。ボス・中ボスには1戦闘1回
import { breakEnemy, canBreak } from '..';
import { addStatus } from '../../statuses';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    flashBreak: { vulnerable: number };
  }
}

const bossLike = (s: { boss?: boolean; midboss?: boolean }) => !!s.boss || !!s.midboss;

export const effect: EffectHandler<'flashBreak'> = {
  kind: 'flashBreak',
  defaultTo: 'target',
  apply(ctx, e) {
    const t = ctx.target;
    if (!t || !isEnemy(t) || !canBreak(t)) return false;
    if (bossLike(ctx.state)) ctx.state.flashBreakUsed = true;
    breakEnemy(ctx, t, 'perfect');
    addStatus(t.statuses, 'vulnerable', e.vulnerable);
    ctx.events.push({ type: 'status', unitId: t.uid, status: 'vulnerable', amount: e.vulnerable });
    return true;
  },
  check: (ctx) => {
    if (!canBreak(ctx.target)) return ctx.state.enemies.some((x) => canBreak(x)) ? 'その敵は、大技を予告していません' : '大技を予告している敵がいません';
    if (bossLike(ctx.state) && ctx.state.flashBreakUsed) return 'この戦闘では、もう使えません（ボスには1戦闘1回）';
    return null;
  },
  describe: (e) => `選んだ敵が大技を予告していれば、その場で BREAK して「脆弱」${e.vulnerable}（ボス・中ボスとの戦闘では1戦闘1回）`,
};
