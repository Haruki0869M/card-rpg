// 鐘のこだま（シナリオ2の災厄「凍て鐘の亡霊」の段階。2026-11-14 区切り3b・docs/tasks/scenario2-theme-scourge-proposal.md §2-2 A案）:
// この効果を持つ行動を予告している味方の番に、亡霊が受けた「1回の当たりでいちばん大きいHPのダメージ」を覚え（EnemyState.echoMax。dealDamage で数える）、
// 敵の番に、その数（max まで）を味方全員に返す。数は「そのまま」（敵のレベルの攻撃力は掛けない。味方の状態異常・ブロック・属性の守りは、ふつうの攻撃と同じに効く）。
// BREAK されると半分（敵の行動の倍率 ctx.actionMul）。毒・火傷などの継続ダメージは「当たり」に数えない（dealDamage を通らない）。
// 数えるのは味方の番の間だけ（返した一撃への反撃などでは育たない = 連鎖しない）。乱数は使わない
import { dealDamage, resolveTargets, targetOf } from '..';
import { isEnemy, nameOf } from '../../units';
import type { EnemyState } from '../../../../types';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    /** max = 返す量の上限 */
    echoBlow: { max: number };
  }
}

/** 今返る予定の量（上限と、行動の倍率を当てた物。敵のレベルの攻撃力・味方の状態異常は掛ける前） */
export const echoAmount = (enemy: Pick<EnemyState, 'echoMax' | 'nextActionMultiplier'>, max: number, mul = enemy.nextActionMultiplier ?? 1) => Math.floor(Math.min(max, enemy.echoMax ?? 0) * mul);

export const effect: EffectHandler<'echoBlow'> = {
  kind: 'echoBlow',
  defaultTo: 'foes',
  apply(ctx, e) {
    const src = ctx.source;
    if (!isEnemy(src) || src.dead) return false;
    const base = echoAmount(src, e.max, ctx.actionMul ?? 1);
    if (base <= 0) {
      ctx.parts.push('こだまは返らなかった（このターン、大きな一撃を受けていない）');
      return false;
    }
    // 「そのまま」返す: dealDamage が掛ける敵の攻撃力（attackMul）を打ち消す
    const unLevel = 1 / Math.max(0.0001, src.attackMul);
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const loss = dealDamage(ctx, t, base, undefined, unLevel);
      ctx.parts.push(`${nameOf(t)}に${loss}`);
    }
    return true;
  },
  describe: (e, who) => `${who}、このターンに受けた「いちばん大きな一撃」と同じダメージを返す（最大${e.max}。ブロックで防げる。毒・火傷は数えない）`,
  short: (e) => `こだま≤${e.max}`,
};
