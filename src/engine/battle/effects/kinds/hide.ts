// 吹雪に隠れる（シナリオ2の災厄「白狼王」の段階。2026-11-14 区切り3b・docs/tasks/scenario2-theme-scourge-proposal.md §5 A案「外れる形」）:
// 行動した後、次の敵の番の始めまで「隠れている」（EnemyState.hidden）。その間、「敵1体が対象のカード」でこの敵に与えるダメージは0（外れる）。
// 線引きはかばうと同じ（effects/index.ts の dealDamage）: 全体攻撃・お供と召喚・分身・毒などの継続ダメージ・反撃・道具は当たる。
// カードは使える（狙えない、にはしない = 手札が詰まらない）。状態異常だけの効果は付く。BREAK はできる（ダメージは0のまま）。
// 敵の番の始め（battle.ts の endTurn）・倒れた時（units.ts）に消える。乱数は使わない
import { isEnemy, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    hide: { unused?: never };
  }
}

/** 隠れている間の決まり（予告・長押しの説明） */
export const HIDE_TEXT = '次の敵の番まで、単体のカードのダメージは外れる（0）。全体攻撃・お供と召喚・毒などの継続ダメージ・反撃・道具は当たる。状態異常だけの効果は付く。BREAK はできる';

export const effect: EffectHandler<'hide'> = {
  kind: 'hide',
  defaultTo: 'self',
  apply(ctx) {
    const { source } = ctx;
    if (!isEnemy(source) || source.dead) return false;
    source.hidden = true;
    ctx.parts.push(`${nameOf(source)}は吹雪に隠れた`);
    return true;
  },
  describe: () => HIDE_TEXT,
  short: () => '隠れる',
};
