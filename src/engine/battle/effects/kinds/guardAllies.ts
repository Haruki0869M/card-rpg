// かばう（敵の特殊な行動・魔王軍の騎士）: 行動した後、次の味方の番が終わるまで「かばう」状態になる。
// その間、ほかの敵を狙った「敵1体が対象のカード」のダメージは、この敵が受ける（effects/index.ts の dealDamage）。
// 全体攻撃・お供と召喚の攻撃は、そのまま通る。敵の番の始め（battle.ts の endTurn）・倒れた時（units.ts）に消える
// 2026-11-14（特殊な行動のばらし・docs/tasks/behavior-variety-plan.md §3-2）: かばう形を敵ごとに変えられる（GuardStyle。省略 = 基本の形）
import { getElement } from '../../../../data/elements';
import { getStatus } from '../../../../data/statuses';
import { isEnemy, nameOf } from '../../units';
import type { GuardStyle } from '../../../../types';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    guardAllies: GuardStyle;
  }
}

/** かばう形の説明（予告の長押し） */
export function guardStyleText(e: GuardStyle): string {
  const who = e.cover === 'weakest' ? 'HPの割合がいちばん低い仲間を狙った' : 'ほかの敵を狙った';
  const bits: string[] = [];
  if (e.untilBlockGone) bits.push('自分のブロックが0になると、かばうのをやめる');
  if (e.half) bits.push('代わりに受けるダメージは半分');
  if (e.retaliate) bits.push(`代わりに受けるたび、攻撃した味方に${e.retaliate}の${e.element ? `${getElement(e.element).name}属性` : ''}ダメージを返す`);
  if (e.status) bits.push(`代わりに受けるたび、攻撃した味方に「${getStatus(e.status.status).name}」${e.status.amount}`);
  return `次の味方の番の間、${who}単体攻撃のカードを代わりに受ける（全体攻撃・お供と召喚の攻撃は通る）${bits.length ? `。${bits.join('。')}` : ''}`;
}

export const effect: EffectHandler<'guardAllies'> = {
  kind: 'guardAllies',
  defaultTo: 'self',
  apply(ctx, e) {
    const { source } = ctx;
    if (!isEnemy(source) || source.dead) return false;
    source.guarding = true;
    const style: GuardStyle = {};
    for (const k of ['cover', 'untilBlockGone', 'half', 'retaliate', 'element', 'status'] as const) if (e[k] !== undefined) (style as Record<string, unknown>)[k] = e[k];
    if (Object.keys(style).length) source.guardStyle = style;
    else delete source.guardStyle;
    ctx.parts.push(`${nameOf(source)}が仲間の前に立った`);
    return true;
  },
  describe: (e) => guardStyleText(e),
  short: () => '',
};
