// 手数読み（敵の特殊な行動・葦陰の狩人）: このターンにカードを min 枚以上使った味方それぞれに、（使った枚数 × amount）のダメージ。
// 使った枚数は味方の played（次の味方の番の始めに0に戻る）。ブロックで防げる。BREAK された時は、今の大技の決まりどおり amount が半分になる
// 2026-11-14（特殊な行動のばらし・docs/tasks/behavior-variety-plan.md §3-1）: 敵ごとに中身を変えられる
// - count: 何を数えるか（省略 = 全部の札 / attack = 攻撃の札（敵を狙う札）/ skill = 攻撃でない札 / zero = コスト0の札）
// - scope: だれに（省略 = 数えた枚数が min 以上の味方それぞれ / most = 数えた枚数がいちばん多い1人だけ（同じなら並びの前）/
//          team = 味方みんなの合計が min 以上なら、生きている味方全員に「合計 × amount」）
// - ramp: 枚数の代わりに（枚数 − min + 1）を掛ける（min 枚目から1枚ごとに重くなる）
// - status: 当たった味方に付ける状態異常（per = 量を「数」にする。省略は amount のまま）
// - focus: 当たった味方のフォーカスを奪う量
// 乱数は使わない
import { dealDamage, resolveTargets, targetOf } from '..';
import { getStatus } from '../../../../data/statuses';
import { addStatus } from '../../statuses';
import { isEnemy, nameOf, unitIdOf } from '../../units';
import type { AllyState } from '../../../../types';
import type { EffectHandler } from '../types';

export type PunishCount = 'attack' | 'skill' | 'zero';

declare module '../../../../types' {
  interface EffectParams {
    punishPlays: {
      amount: number;
      min: number;
      count?: PunishCount;
      scope?: 'most' | 'team';
      ramp?: boolean;
      status?: { status: string; amount: number; per?: boolean };
      focus?: number;
    };
  }
}

/** その味方が、このターンに使った「数える札」の枚数 */
export function countedPlays(a: Pick<AllyState, 'played' | 'playedAttack' | 'playedZero'>, count?: PunishCount): number {
  const all = a.played ?? 0;
  if (count === 'attack') return a.playedAttack ?? 0;
  if (count === 'skill') return Math.max(0, all - (a.playedAttack ?? 0));
  if (count === 'zero') return a.playedZero ?? 0;
  return all;
}

/** 数える札の名前（説明の文） */
export const countName = (count?: PunishCount) => (count === 'attack' ? '攻撃の札' : count === 'skill' ? '攻撃でない札（守り・補助）' : count === 'zero' ? 'コスト0の札' : 'カード');

/** 手数読みが当たる味方と、その「掛ける数」（予告の説明でも使う。乱数は使わない） */
export function punishHits(allies: AllyState[], e: { min: number; count?: PunishCount; scope?: 'most' | 'team'; ramp?: boolean }): { ally: AllyState; n: number; mul: number }[] {
  const live = allies.filter((a) => !a.dead);
  const mulOf = (n: number) => (e.ramp ? n - e.min + 1 : n);
  if (e.scope === 'team') {
    const total = live.reduce((s, a) => s + countedPlays(a, e.count), 0);
    return total >= e.min ? live.map((ally) => ({ ally, n: total, mul: mulOf(total) })) : [];
  }
  const hits = live.map((ally) => ({ ally, n: countedPlays(ally, e.count) })).filter((h) => h.n >= e.min);
  if (e.scope === 'most' && hits.length > 1) {
    const top = hits.reduce((a, b) => (b.n > a.n ? b : a));
    return [{ ...top, mul: mulOf(top.n) }];
  }
  return hits.map((h) => ({ ...h, mul: mulOf(h.n) }));
}

export const effect: EffectHandler<'punishPlays'> = {
  kind: 'punishPlays',
  defaultTo: 'foes',
  apply(ctx, e) {
    const targets = resolveTargets(ctx, targetOf(e)).filter((t): t is AllyState => !isEnemy(t));
    const hits = punishHits(targets, e);
    for (const { ally: t, n, mul } of hits) {
      const bits: string[] = [];
      if (e.amount > 0) bits.push(`${dealDamage(ctx, t, mul * e.amount)}`);
      if (e.status && !t.dead) {
        // BREAK された時は、状態異常の量も半分（ダメージと同じ決まり）
        const full = e.status.per ? mul * e.status.amount : e.status.amount;
        const k = isEnemy(ctx.source) && ctx.source.broken ? Math.floor(full / 2) : full;
        if (k > 0) {
          addStatus(t.statuses, e.status.status, k);
          ctx.events.push({ type: 'status', unitId: unitIdOf(t), status: e.status.status, amount: k });
          bits.push(`${getStatus(e.status.status).name}${k}`);
        }
      }
      if (e.focus && !t.dead && t.focus > 0) {
        const lost = Math.min(t.focus, e.focus);
        t.focus -= lost;
        bits.push(`フォーカス-${lost}`);
      }
      ctx.parts.push(`${nameOf(t)}（${e.scope === 'team' ? `みんなで${n}` : n}枚）に${bits.join('・')}`);
    }
    if (!hits.length) ctx.parts.push(`${e.scope === 'team' ? `みんなで${e.min}枚以上` : `${e.min}枚以上`}使った味方はいない`);
    return hits.length > 0;
  },
  describe: (e) => {
    const what = countName(e.count);
    const cond = e.scope === 'team' ? `味方みんなで${what}を合わせて${e.min}枚以上使っていたら、味方全員に` : `このターンに${what}を${e.min}枚以上使った${e.scope === 'most' ? '味方のうち、いちばん多く使った1人に' : '味方それぞれに'}`;
    const n = e.scope === 'team' ? '合計' : '枚数';
    const base = e.ramp ? `（${n}−${e.min - 1}）` : n;
    const res = [
      ...(e.amount > 0 ? [`${base}×${e.amount}のダメージ`] : []),
      ...(e.status ? [`「${getStatus(e.status.status).name}」${e.status.per ? `${base}${e.status.amount > 1 ? `×${e.status.amount}` : ''}` : e.status.amount}`] : []),
      ...(e.focus ? [`フォーカス-${e.focus}`] : []),
    ];
    return `${cond}${res.join('と')}（${e.min - 1}枚以下なら何もしない）`;
  },
  short: (e) => `${e.min}枚+`,
};
