// 状態異常を付ける（状態異常の種類は src/content の statuses）
import { resolveTargets, targetOf } from '..';
import { fireAbilities, guardStatus, statusBonusOf } from '../../../abilities';
import { getStatus } from '../../../../data/statuses';
import { addStatus } from '../../statuses';
import { isEnemy, nameOf, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';
import type { Unit } from '../../units';

declare module '../../../../types' {
  interface EffectParams {
    applyStatus: { status: string; amount: number; /** ボスの部屋の戦闘では、代わりにこの状態異常を付ける */ bossStatus?: string; /** bossStatus を中ボス（災厄の中ボスも）の戦闘でも使う（段階7b: 永久凍土の女皇衣） */ bossLike?: boolean };
  }
}

export const effect: EffectHandler<'applyStatus'> = {
  kind: 'applyStatus',
  defaultTo: 'target',
  apply(ctx, e) {
    const ts = resolveTargets(ctx, targetOf(e));
    if (e.bossStatus && (ctx.state.boss || (e.bossLike && ctx.state.midboss))) e = { ...e, status: e.bossStatus };
    // 相手に付ける時は、自分の能力（呪詛など）で量が増える
    // （対象ごとに数える。「すでに毒なら+2」のように、相手の状態で変わる物があるため）
    let amount = e.amount;
    const inflicted: typeof ts = [];
    const added = new Map<Unit, number>();
    let guarded = 0;
    for (const t of ts) {
      const foe = isEnemy(ctx.source) !== isEnemy(t);
      const n = foe ? e.amount + statusBonusOf(ctx.source, e.status, ctx.card, t, ctx.state) : e.amount;
      // 敵から受ける悪い状態異常を防ぐ能力（春を待つ・暖かい灯）
      if (foe && guardStatus(ctx.state, ctx.events, t, e.status)) {
        guarded++;
        continue;
      }
      if (foe) { amount = Math.max(amount, n); inflicted.push(t); added.set(t, n); }
      addStatus(t.statuses, e.status, n);
      // 輪唱: 味方が味方に付けた「応援」は、誰がくれたかを覚えておく
      if (e.status === 'inspired' && !isEnemy(ctx.source) && !isEnemy(t)) t.cheeredBy = ctx.source.id;
      if (isEnemy(ctx.source) !== isEnemy(t) && !ctx.hitIds.includes(unitIdOf(t))) ctx.hitIds.push(unitIdOf(t));
      ctx.events.push({ type: 'status', unitId: unitIdOf(t), status: e.status, amount: n });
    }
    // きっかけ: 相手に状態異常を与えた（全員に付け終わってから）
    if (ctx.depth < 3 && !ctx.source.dead) for (const t of inflicted) fireAbilities(ctx.state, ctx.rng, ctx.events, ctx.source, 'inflict', { target: t, statusId: e.status, dealt: added.get(t), depth: ctx.depth + 1 });
    // 段階7b: きっかけ「自分に悪い状態異常が付いた」（悪夢の毛皮。敵からでも、自分のカードの代償でも）
    if (ctx.depth < 3 && getStatus(e.status).harmful)
      for (const t of ts) if (!isEnemy(t) && !t.dead && (t.statuses[e.status] ?? 0) > 0 && (inflicted.includes(t) || !isEnemy(ctx.source))) fireAbilities(ctx.state, ctx.rng, ctx.events, t, 'statusTaken', { statusId: e.status, dealt: added.get(t) ?? e.amount, attacker: isEnemy(ctx.source) ? ctx.source : undefined, depth: ctx.depth + 1 });
    if (ts.length) {
      const name = `${getStatus(e.status).name}${amount}`;
      if (guarded >= ts.length) ctx.parts.push(`${name}は防がれた`);
      else if (isEnemy(ctx.source)) ctx.parts.push(`${ts.length > 1 ? '全員' : nameOf(ts[0])}に${name}`);
      else ctx.parts.push(name);
    }
    return ts.length > 0;
  },
  describe: (e, who) => `${who}「${getStatus(e.status).name}」${e.amount}${e.bossStatus ? `（${e.bossLike ? "ボス・中ボス" : "ボス"}には代わりに「${getStatus(e.bossStatus).name}」${e.amount}）` : ''}`,
  short: (e) => `${e.amount}`,
};
