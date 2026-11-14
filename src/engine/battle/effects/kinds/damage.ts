// ダメージ（hits 回。全体なら1回ごとに全員へ）
import { dealDamage, resolveTargets, targetOf } from '..';
import { getElement } from '../../../../data/elements';
import { getStatus } from '../../../../data/statuses';
import { isEnemy, nameOf, sideOf, type Unit } from '../../units';
import type { BattleState } from '../../../../types';
import { activeStatuses } from '../../statuses';
import { chargedMultiplier } from '../../cardState';
import { extraHitsOf } from '../../../abilities';
import { type EffectHandler, upgradeAmount, recordActivation } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    /** element: 属性（src/content の elements の ID。省略は無属性） */
    /** lowHpMul: 当たる時に相手のHPが最大の半分以下なら、この倍率（手負い狙い。敵の特殊な行動。予告の狙いは、HPの割合がいちばん低い味方になる） */
    /**
     * 2026-11-14（敵の特殊な行動のばらし・docs/tasks/behavior-variety-plan.md §3-5・3-6）:
     * huntBy = 手負い狙いの予告の狙い（省略 = HPの割合がいちばん低い / hp = HPの量がいちばん少ない / lastHit = 前のターンに自分を攻撃した味方（最後の人）/
     *          afflicted = 悪い状態異常の付いた味方。いなければ、割合がいちばん低い味方）
     * huntWhen = lowHpMul が掛かる時（省略 = HPが半分以下 / noBlock = 当たる時にブロックが無い / afflicted = 悪い状態異常がある）
     * lowOnly = 味方全員への攻撃のうち、HPが半分以下の味方にだけ当たる（だれもいなければ空振り）
     * pierce = ブロックを無視する（壊さない。BREAK されていると無視しない）
     * packHits = 回数を「今生きている、使う側の数」にする（敵なら生きている敵の数。自分も数える。hits の代わり。白狼王の群れの牙。2026-11-14 区切り3b）
     */
    damage: { amount: number; hits?: number; element?: string; outcomes?: { weight: number; multiplier: number }[]; lowHpMul?: number; huntBy?: 'hp' | 'lastHit' | 'afflicted'; huntWhen?: 'noBlock' | 'afflicted'; lowOnly?: boolean; pierce?: boolean; packHits?: boolean };
  }
}

/** 悪い状態異常が付いているか */
export const isAfflicted = (u: Unit) => activeStatuses(u.statuses).some(({ def }) => def.harmful);

/** 手負い狙いの倍率が掛かる時か（huntWhen） */
export function huntApplies(e: { huntWhen?: 'noBlock' | 'afflicted' }, t: Unit): boolean {
  if (e.huntWhen === 'noBlock') return t.block <= 0;
  if (e.huntWhen === 'afflicted') return isAfflicted(t);
  return t.hp * 2 <= t.maxHp;
}

/**
 * ダメージの回数（データの hits。packHits なら、今生きている、使う側の数 = 敵の行動なら生きている敵の数。自分も数える）。
 * 予告の数字・実際の攻撃・bot が同じ関数を読む（手下を倒すと、予告の回数がその場で減る）。乱数は使わない
 */
export function damageHits(e: { hits?: number; packHits?: boolean }, source: Unit | undefined, state: Pick<BattleState, 'allies' | 'enemies'> | undefined): number {
  if (e.packHits && source && state) return Math.max(1, sideOf(state as BattleState, source).filter((u) => !u.dead).length);
  return e.hits ?? 1;
}

/** 倍率が掛かる時の文（説明用） */
export const huntWhenText = (e: { huntWhen?: 'noBlock' | 'afflicted' }) => (e.huntWhen === 'noBlock' ? 'ブロックが無い' : e.huntWhen === 'afflicted' ? '悪い状態異常が付いている' : 'HPが半分以下の');

export const effect: EffectHandler<'damage'> = {
  kind: 'damage',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    let multiplier = 1;
    if (e.outcomes?.length) {
      let roll = ctx.rng.next() * e.outcomes.reduce((n, o) => n + o.weight, 0);
      for (const o of e.outcomes) { multiplier = o.multiplier; roll -= o.weight; if (roll < 0) break; }
      ctx.parts.push(`勝負×${multiplier}`);
    }
    const multi = damageHits(e, ctx.source, ctx.state) >= 2 && !isEnemy(ctx.source) ? (ctx.multi ??= { total: 0, landed: 0 }) : undefined;
    // 区切りD: 弾込め — 次の「×N回」のカードの回数+1（使ったら消える）
    // 区切り3b: 群れの牙 — 回数は、使う時に生きている仲間の数（自分も数える）
    let hits = damageHits(e, ctx.source, ctx.state);
    const src = ctx.source;
    if (hits >= 2 && !isEnemy(src) && src.extraHits && ctx.card) { hits += src.extraHits; delete src.extraHits; ctx.parts.push('弾込め'); }
    // 段階7a: 連装ガトリング銃 — 「×N回」のカードの攻撃は、いつも回数+1（カードの攻撃だけ。能力・お供の追撃には付かない）
    const gatling = hits >= 2 && ctx.card && !ctx.via ? extraHitsOf(src) : 0;
    if (gatling > 0) hits += gatling;
    // 鎧通し: ブロックを無視する（BREAK されていると、ふつうに当たる）
    const pierce = !!e.pierce && !(isEnemy(src) && src.broken);
    let missedAll = !!e.lowOnly;
    for (let h = 0; h < hits; h++) {
      for (const t of resolveTargets(ctx, targetOf(e))) {
        // 手負いだけに噛みつく（夢の鮫）: HPが半分より多い相手には当たらない
        if (e.lowOnly && t.hp * 2 > t.maxHp) continue;
        missedAll = false;
        const charge = chargedMultiplier(ctx.source, ctx.card);
        if (charge > 1) recordActivation(ctx, { name: '蓄えた力', source: { kind: 'other' } });
        // 手負い狙い: 当たる時に相手のHPが最大の半分以下なら、倍率を掛ける
        const low = e.lowHpMul && huntApplies(e, t) ? e.lowHpMul : 1;
        if (low !== 1) recordActivation(ctx, { name: '手負い狙い', source: { kind: 'other' } });
        if (pierce) ctx.pierce = true;
        const loss = dealDamage(ctx, t, e.amount, e.element, charge * multiplier * low);
        if (pierce) delete ctx.pierce;
        any = true;
        if (multi) {
          multi.total += 1;
          if (loss > 0) multi.landed += 1;
        }
        if (isEnemy(ctx.source)) ctx.parts.push(`${nameOf(t)}に${loss}`);
      }
    }
    if (missedAll) ctx.parts.push('HPが半分以下の味方はいない（空振り）');
    return any;
  },
  describe(e, who) {
    const el = e.element ? getElement(e.element) : undefined;
    const st = el?.status ? `（${el.chance}%で${getStatus(el.status).name}${el.amount ?? 1}・完全成功なら必ず）` : '';
    const gamble = e.outcomes?.length ? `（${e.outcomes.map(o => `${o.weight}%で×${o.multiplier}`).join('／')}。1枚につき1回抽選）` : '';
    const low = e.lowHpMul ? `（${huntWhenText(e)}相手には×${e.lowHpMul}）` : '';
    const only = e.lowOnly ? '（HPが半分以下の相手にだけ当たる。だれもいなければ空振り）' : '';
    const pierce = e.pierce ? '（ブロックを無視する。ブロックは壊れずに残る。BREAK されると無視しない）' : '';
    const pack = e.packHits ? '×「生きている仲間の数」回（自分も数える）' : '';
    return `${who}${e.amount}の${el ? `${el.name}属性` : ''}ダメージ${(e.hits ?? 1) > 1 ? `×${e.hits}回` : ''}${pack}${st}${gamble}${low}${only}${pierce}`;
  },
  short: (e) => `${e.outcomes?.length ? `${Math.floor(e.amount * Math.min(...e.outcomes.map(o => o.multiplier)))}〜${Math.floor(e.amount * Math.max(...e.outcomes.map(o => o.multiplier)))}` : e.amount}${(e.hits ?? 1) > 1 ? `×${e.hits}` : ''}`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
