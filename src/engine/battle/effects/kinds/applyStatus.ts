// 状態異常を付ける（状態異常の種類は src/content の statuses）
import { resolveTargets, targetOf } from '..';
import { fireAbilities, statusBonusOf } from '../../../abilities';
import { getStatus } from '../../../../data/statuses';
import { addStatus } from '../../statuses';
import { isEnemy, nameOf, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    applyStatus: { status: string; amount: number; /** ボスの部屋の戦闘では、代わりにこの状態異常を付ける */ bossStatus?: string };
  }
}

export const effect: EffectHandler<'applyStatus'> = {
  kind: 'applyStatus',
  defaultTo: 'target',
  apply(ctx, e) {
    const ts = resolveTargets(ctx, targetOf(e));
    if (e.bossStatus && ctx.state.boss) e = { ...e, status: e.bossStatus };
    // 相手に付ける時は、自分の能力（呪詛など）で量が増える
    // （対象ごとに数える。「すでに毒なら+2」のように、相手の状態で変わる物があるため）
    let amount = e.amount;
    const inflicted: typeof ts = [];
    for (const t of ts) {
      const foe = isEnemy(ctx.source) !== isEnemy(t);
      const n = foe ? e.amount + statusBonusOf(ctx.source, e.status, ctx.card, t) : e.amount;
      if (foe) { amount = Math.max(amount, n); inflicted.push(t); }
      addStatus(t.statuses, e.status, n);
      if (isEnemy(ctx.source) !== isEnemy(t) && !ctx.hitIds.includes(unitIdOf(t))) ctx.hitIds.push(unitIdOf(t));
      ctx.events.push({ type: 'status', unitId: unitIdOf(t), status: e.status, amount: n });
    }
    // きっかけ: 相手に状態異常を与えた（全員に付け終わってから）
    if (ctx.depth < 3 && !ctx.source.dead) for (const t of inflicted) fireAbilities(ctx.state, ctx.rng, ctx.events, ctx.source, 'inflict', { target: t, statusId: e.status, depth: ctx.depth + 1 });
    if (ts.length) {
      const name = `${getStatus(e.status).name}${amount}`;
      if (isEnemy(ctx.source)) ctx.parts.push(`${ts.length > 1 ? '全員' : nameOf(ts[0])}に${name}`);
      else ctx.parts.push(name);
    }
    return ts.length > 0;
  },
  describe: (e, who) => `${who}「${getStatus(e.status).name}」${e.amount}${e.bossStatus ? `（ボスには代わりに「${getStatus(e.bossStatus).name}」${e.amount}）` : ''}`,
  short: (e) => `${e.amount}`,
};
