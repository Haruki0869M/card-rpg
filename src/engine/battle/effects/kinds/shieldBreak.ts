// 盾砕き（敵の特殊な行動・玄武岩の虫）: 狙った相手のブロックを0にする。後ろに続くダメージの前に置く。
// BREAK された予告では壊さない（予告の文「BREAK するか、ブロックに頼らずに受ける」）。ダメージは今の大技の決まりどおり半分になる
// 2026-11-14（特殊な行動のばらし・docs/tasks/behavior-variety-plan.md §3-6）: 敵ごとに中身を変えられる
// - absorb: 壊したブロックを、自分のブロックにする（提灯鮟鱇）
// - bonusPct: 壊したブロックの pct% を、その相手にダメージとして足す（彗星の狐）
// - afterStatus: ブロックを壊した相手に付ける状態異常（ピストン拳）
// - force: BREAK されていても壊す（開幕の一手の残り香。霜の巨人）
// 乱数は使わない
import { dealDamage, resolveTargets, targetOf } from '..';
import { BALANCE } from '../../../../data/balance';
import { getStatus } from '../../../../data/statuses';
import { addStatus } from '../../statuses';
import { addLog, isEnemy, nameOf, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    shieldBreak: { absorb?: boolean; bonusPct?: number; afterStatus?: { status: string; amount: number }; force?: boolean };
  }
}

export const effect: EffectHandler<'shieldBreak'> = {
  kind: 'shieldBreak',
  defaultTo: 'target',
  apply(ctx, e) {
    const { source, state } = ctx;
    if (isEnemy(source) && source.broken && !e.force) {
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
      if (e.absorb && !source.dead) {
        source.block = Math.min(BALANCE.blockMax, source.block + lost);
        ctx.events.push({ type: 'block', unitId: unitIdOf(source), amount: lost });
        ctx.parts.push(`ブロック+${lost}`);
      }
      if (e.bonusPct && !t.dead) {
        const bonus = Math.floor((lost * e.bonusPct) / 100);
        if (bonus > 0) ctx.parts.push(`上乗せ${dealDamage(ctx, t, bonus)}`);
      }
      if (e.afterStatus && !t.dead) {
        addStatus(t.statuses, e.afterStatus.status, e.afterStatus.amount);
        ctx.events.push({ type: 'status', unitId: unitIdOf(t), status: e.afterStatus.status, amount: e.afterStatus.amount });
        ctx.parts.push(`${getStatus(e.afterStatus.status).name}${e.afterStatus.amount}`);
      }
    }
    return any;
  },
  describe: (e, who) => {
    const whose = who.replace(/に$/, 'の');
    const extra = [
      ...(e.absorb ? ['壊したブロックは自分のブロックになる'] : []),
      ...(e.bonusPct ? [`壊したブロックの${e.bonusPct === 50 ? '半分' : `${e.bonusPct}%`}のダメージを足す`] : []),
      ...(e.afterStatus ? [`ブロックを壊された相手に「${getStatus(e.afterStatus.status).name}」${e.afterStatus.amount}`] : []),
    ];
    return `${whose}ブロックを全部壊す${extra.length ? `。${extra.join('。')}` : ''}（${e.force ? 'BREAK されても壊す' : 'BREAK されると壊さない'}）`;
  },
  short: () => '0',
};
